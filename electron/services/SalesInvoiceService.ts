/**
 * SalesInvoiceService — DRAFT-first approval-aware ERP invoice service
 * 
 * Provides:
 *   - listKeyset(params)        → keyset paginated list
 *   - get(id)                   → header + lines
 *   - createDraft(userId)       → empty DRAFT invoice
 *   - save({id, header, lines}) → upsert with version++
 *   - postOrSubmit(id, userId, hasPostPermission)
 *   - reopenRejected(id, userId)
 */

import { ipcMain } from 'electron';
import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { diffDocumentPayload } from '../../src/main/application/services/AuditDiffService';
import { getGlobalAuditService } from '../../src/main/application/services/AuditService';
import { AuditContext, AuditFieldChangeInput } from '../../src/main/domain/audit/AuditTypes';
import { withGuards } from '../../src/main/ipc/withGuards';
import { ipcWrap } from '../../src/main/core/ipcWrap';
import { AccountingResolutionUseCases } from '../../src/main/application/useCases/AccountingResolutionUseCases';
import { JournalEngineUseCases, PostJournalInput } from '../../src/main/application/useCases/JournalEngineUseCases';
import { FinancialAccountRole } from '../../src/main/domain/accountingResolution/enums/FinancialAccountRole';
import { ResolutionDirection } from '../../src/main/domain/accountingResolution/enums/ResolutionDirection';
import { ItemService } from './ItemService';

/* ─── helpers ─── */

type TenantScope = {
    companyId: string;
    branchId: string;
};

const SALES_INVOICE_CAPABILITIES = {
    create: 'sales.invoice.create',
    read: 'sales.invoice.read',
    update: 'sales.invoice.update',
    post: 'sales.invoice.post',
    void: 'sales.invoice.void',
};

const SALES_INVOICE_LEGACY = {
    create: ['ti.sales.invoice.create', 'sales.invoice.create', 'sales.create'],
    read: ['sales.invoice.read', 'sales.view', 'sales.create', 'ti.sales.invoice.create'],
    update: ['sales.invoice.update', 'sales.edit', 'sales.invoice.create', 'ti.sales.invoice.create'],
    post: ['ti.sales.invoice.post', 'sales.invoice.post', 'sales.post', 'DOC.POST'],
    void: ['sales.invoice.void', 'sales.void', 'DOC.VOID'],
};

const SALES_INVOICE_STATUS_RULES = {
    editable: ['DRAFT', 'REJECTED'],
    postable: ['DRAFT'],
    voidable: ['DRAFT', 'POSTED'],
    reopenable: ['REJECTED'],
} as const;

const SALES_INVOICE_POSTING_POLICY = {
    idempotent: true,
    alreadyPostedAction: 'already_posted',
    conflictErrorCode: 'CONFLICT',
} as const;

function hasPostCapability(ctx: any): boolean {
    const granted = new Set<string>([
        ...(Array.isArray(ctx?.permissions) ? ctx.permissions : []),
        ...(Array.isArray(ctx?.capabilities) ? ctx.capabilities : []),
    ]);

    return (
        granted.has('ALL') ||
        granted.has('*.*') ||
        granted.has(SALES_INVOICE_CAPABILITIES.post) ||
        SALES_INVOICE_LEGACY.post.some((key) => granted.has(key))
    );
}

function selfHeal() {
    try {
        const cols: any[] = db.prepare('PRAGMA table_info(sales_invoices)').all();
        const add = (col: string, type: string) => {
            if (!cols.some((c: any) => c.name === col)) {
                db.prepare(`ALTER TABLE sales_invoices ADD COLUMN ${col} ${type}`).run();
                console.log(`[SalesInvoice] Added column: ${col}`);
            }
        };
        add('version', 'INTEGER DEFAULT 1');
        add('submitted_at', 'DATETIME');
        add('submitted_by', 'TEXT');
        add('posted_at', 'DATETIME');
        add('posted_by', 'TEXT');
        add('rejected_at', 'DATETIME');
        add('rejected_by', 'TEXT');
        add('rejection_reason', 'TEXT');
        add('voided_at', 'DATETIME');
        add('voided_by', 'TEXT');
        add('created_by', 'TEXT');
        add('doc_date', 'TEXT'); // alias for date
        add('due_date', 'TEXT');
        add('warehouse_id', 'TEXT');
        add('currency_id', 'TEXT');
        add('customer_id', 'TEXT');
        add('company_id', "TEXT DEFAULT 'COMP_01'");
        add('tax_group_id', 'TEXT');
        add('manual_ref', 'TEXT');
        add('cost_center_id', 'TEXT');
        add('price_list_id', 'TEXT');
        add('payment_method_id', 'TEXT');
        add('sales_rep_id', 'TEXT');
        add('remarks', 'TEXT');
        add('discount_total', 'REAL DEFAULT 0');
        add('posted_token', 'TEXT');
        add('posted_once', 'INTEGER DEFAULT 0');
        add('journal_id', 'TEXT');
        add('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    } catch (e) {
        console.error('[SalesInvoice] selfHeal error', e);
    }

    try {
        const lineCols: any[] = db.prepare('PRAGMA table_info(sales_invoice_lines)').all();
        const addL = (col: string, type: string) => {
            if (!lineCols.some((c: any) => c.name === col)) {
                db.prepare(`ALTER TABLE sales_invoice_lines ADD COLUMN ${col} ${type}`).run();
            }
        };
        addL('line_no', 'INTEGER DEFAULT 0');
        addL('discount', 'REAL DEFAULT 0');
        addL('tax_rate', 'REAL DEFAULT 0');
    } catch (e) {
        console.error('[SalesInvoice] selfHeal lines error', e);
    }

    // Keyset indexes
    try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_si_status_date_id ON sales_invoices(status, date, id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_si_customer       ON sales_invoices(customer_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_si_invoice_no     ON sales_invoices(invoice_no)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_si_scope_status_date ON sales_invoices(company_id, branch_id, status, date, id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_si_scope_doc_no      ON sales_invoices(company_id, branch_id, invoice_no)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_si_lines_invoice_no   ON sales_invoice_lines(invoice_id, line_no)`);
    } catch (e) { /* ignore if already exists */ }
}

function nextInvoiceNo(): string {
    db.prepare(`INSERT OR IGNORE INTO doc_sequences(doc_type, next_no) VALUES('sales_invoice', 1)`).run();
    const sequence = db.prepare(`SELECT next_no FROM doc_sequences WHERE doc_type = 'sales_invoice'`).get() as { next_no: number } | undefined;
    const next = Math.max(sequence ? sequence.next_no : 1, 1);
    db.prepare(`UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = 'sales_invoice'`).run();
    return `INV-${String(next).padStart(4, '0')}`;
}

/* ─── Service ─── */

export class SalesInvoiceService {
    private static accountResolutionUseCases: AccountingResolutionUseCases | null = null;
    private static journalEngineUseCases: JournalEngineUseCases | null = null;

    static ensureSchema() {
        selfHeal();
    }

    static configurePostingPipeline(params: {
        accountResolutionUseCases: AccountingResolutionUseCases;
        journalEngineUseCases: JournalEngineUseCases;
    }): void {
        this.accountResolutionUseCases = params.accountResolutionUseCases;
        this.journalEngineUseCases = params.journalEngineUseCases;
    }

    private static recordAudit(
        auditCtx: AuditContext | null | undefined,
        event: {
            entityType: string;
            entityId: string;
            docType?: string | null;
            docId?: string | null;
            eventType: string;
            summaryI18nKey?: string | null;
            meta?: Record<string, unknown> | null;
        },
        fieldChanges: AuditFieldChangeInput[] = [],
    ) {
        if (!auditCtx) return;
        const auditService = getGlobalAuditService();
        if (!auditService) return;

        try {
            auditService.recordEvent(
                auditCtx,
                {
                    entityType: event.entityType,
                    entityId: event.entityId,
                    docType: event.docType || null,
                    docId: event.docId || null,
                    eventType: event.eventType,
                    summaryI18nKey: event.summaryI18nKey || null,
                    meta: event.meta || null,
                    correlationId: auditCtx.correlationId || null,
                    ipcid: auditCtx.ipcid || null,
                },
                fieldChanges,
            );
        } catch (error) {
            console.warn('[SalesInvoiceService] audit record failed:', error);
        }
    }

    private static createAuditContext(
        ctx: any,
        event: Electron.IpcMainInvokeEvent,
        userId?: string,
        correlationId?: string,
    ): AuditContext {
        const ipcid = String(event?.sender?.id || '');
        return {
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
            userId: String(userId || ctx?.userId || 'SYSTEM'),
            sessionId: String((ctx as any)?.sessionId || ipcid || ''),
            correlationId: String(correlationId || (ctx as any)?.correlationId || uuidv4()),
            ipcid,
        };
    }

    private static getScope(ctx: any): TenantScope {
        return {
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
        };
    }

    private static requireEditablePeriod(_docDate: string): boolean {
        // Phase-1 placeholder for period lock policy.
        return true;
    }

    private static validatePayload(header: Record<string, any>, lines: any[]) {
        if (!String(header?.customer_id || '').trim()) {
            throw Object.assign(new Error('Customer is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.sales_invoice.customer_required',
            });
        }

        const docDate = String(header?.doc_date || header?.date || '').trim();
        if (!docDate) {
            throw Object.assign(new Error('Date is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.sales_invoice.date_required',
            });
        }

        if (!SalesInvoiceService.requireEditablePeriod(docDate)) {
            throw Object.assign(new Error('Period is locked'), {
                code: 'POLICY_VIOLATION',
                messageKey: 'error.policy.period_locked',
            });
        }

        const workingLines = Array.isArray(lines) ? lines : [];
        const validLines = workingLines.filter((line) => {
            const marker = String(line?.item_id || line?.item_code_lookup || line?.item_code || '').trim();
            const qty = Number(line?.qty || line?.quantity || 0);
            const price = Number(line?.price || line?.unit_price || 0);
            return marker || qty !== 0 || price !== 0;
        });

        if (!validLines.length) {
            throw Object.assign(new Error('At least one valid line is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.sales_invoice.lines_required',
            });
        }

        validLines.forEach((line, index) => {
            const qty = Number(line?.qty || line?.quantity || 0);
            const price = Number(line?.price || line?.unit_price || 0);
            if (!String(line?.item_id || line?.item_code_lookup || line?.item_code || '').trim()) {
                throw Object.assign(new Error(`Line ${index + 1}: item is required`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.sales_invoice.line_item_required',
                    details: { line: index + 1, field: 'item_id' },
                });
            }
            if (qty <= 0) {
                throw Object.assign(new Error(`Line ${index + 1}: qty must be greater than zero`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.sales_invoice.qty_positive',
                    details: { line: index + 1, field: 'qty' },
                });
            }
            if (price < 0) {
                throw Object.assign(new Error(`Line ${index + 1}: price cannot be negative`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.sales_invoice.price_non_negative',
                    details: { line: index + 1, field: 'price' },
                });
            }
        });
    }

    /** Keyset paginated list */
    static listKeyset(params: {
        search?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        sort?: string;
        cursor?: { date: string; id: string } | null;
        limit?: number;
    }, scope: TenantScope) {
        const limit = params.limit ?? 50;
        const sort = params.sort ?? 'date_desc';

        let where = ['COALESCE(i.company_id, \'COMP_01\') = ?', 'COALESCE(i.branch_id, \'\') = ?'];
        const args: any[] = [];
        args.push(scope.companyId, scope.branchId);

        if (params.status && params.status !== 'ALL') {
            where.push('i.status = ?');
            args.push(params.status);
        }
        if (params.search) {
            where.push(`(i.invoice_no LIKE ? OR bp.name_ar LIKE ? OR bp.name_en LIKE ?)`);
            const pct = `%${String(params.search || '').trim()}%`;
            args.push(pct, pct, pct);
        }
        if (params.dateFrom) { where.push('COALESCE(i.doc_date, i.date) >= ?'); args.push(params.dateFrom); }
        if (params.dateTo) { where.push('COALESCE(i.doc_date, i.date) <= ?'); args.push(params.dateTo); }

        // Keyset
        if (params.cursor) {
            if (sort === 'date_desc') {
                where.push(`(COALESCE(i.doc_date, i.date) < ? OR(COALESCE(i.doc_date, i.date) = ? AND i.id < ?))`);
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            } else {
                where.push(`(COALESCE(i.doc_date, i.date) > ? OR(COALESCE(i.doc_date, i.date) = ? AND i.id > ?))`);
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            }
        }

        const orderDir = sort === 'date_asc' ? 'ASC' : 'DESC';
        const sql = `
            SELECT
                i.id, i.invoice_no, i.status, i.version,
        COALESCE(i.doc_date, i.date) AS doc_date,
        COALESCE(bp.name_ar, i.customer_name, '') AS customer_name,
        i.customer_id,
        COALESCE(i.grand_total, 0) AS grand_total,
        i.rejection_reason
            FROM sales_invoices i
            LEFT JOIN business_partners bp ON i.customer_id = bp.id
            WHERE ${where.join(' AND ')}
            ORDER BY COALESCE(i.doc_date, i.date) ${orderDir}, i.id ${orderDir}
            LIMIT ?
            `;
        const rows: any[] = db.prepare(sql).all(...args, limit + 1);

        const hasMore = rows.length > limit;
        if (hasMore) rows.pop();

        const next_cursor = hasMore && rows.length > 0
            ? { date: rows[rows.length - 1].doc_date, id: rows[rows.length - 1].id }
            : null;

        return { rows, next_cursor };
    }

    /** Get header + lines */
    static get(id: string, scope: TenantScope) {
        const header: any = db.prepare(`
            SELECT
                i.*,
        COALESCE(i.doc_date, i.date) AS doc_date,
        COALESCE(bp.name_ar, i.customer_name, '') AS customer_name,
        i.customer_id
            FROM sales_invoices i
            LEFT JOIN business_partners bp ON i.customer_id = bp.id
            WHERE i.id = ?
              AND COALESCE(i.company_id, 'COMP_01') = ?
              AND COALESCE(i.branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);

        if (!header) throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });

        const lines: any[] = db.prepare(`
            SELECT
                l.*,
        COALESCE(it.name_ar, l.description, '') AS item_name,
        COALESCE(it.code, '')    AS item_code_lookup,
        COALESCE(l.quantity, 0) AS qty,
        COALESCE(l.unit_price, 0) AS price,
        COALESCE(l.discount, 0)   AS discount,
        COALESCE(l.tax_rate, 0)   AS tax_rate,
        COALESCE(l.net_total, l.total_price, 0) AS line_total
            FROM sales_invoice_lines l
            LEFT JOIN items it ON l.item_id = it.id
            WHERE l.invoice_id = ?
        ORDER BY COALESCE(l.line_no, l.rowid)
        `).all(id);

        return { header, lines };
    }

    /** Create a DRAFT invoice and return its id */
    static createDraft(userId = 'admin', scope?: TenantScope, auditCtx?: AuditContext | null) {
        selfHeal();
        const id = uuidv4();
        const no = nextInvoiceNo();
        const today = new Date().toISOString().split('T')[0];

        const companyId = String(scope?.companyId || 'COMP_01');
        let branchId: string | null = String(scope?.branchId || '').trim() || null;

        if (!branchId) {
            try {
                const branch: any = db.prepare('SELECT id FROM branches WHERE is_main = 1 LIMIT 1').get()
                    || db.prepare('SELECT id FROM branches LIMIT 1').get();
                if (branch) branchId = branch.id;
            } catch (e) { /* no branch table yet */ }
        }

        db.prepare(`
            INSERT INTO sales_invoices(
            id, invoice_no, status, version, date, doc_date,
            subtotal, tax_total, grand_total,
            created_by, created_at,
            company_id, branch_id,
            discount_total, posted_once
        ) VALUES(
                ?, ?, 'DRAFT', 1, ?, ?,
                0, 0, 0,
                ?, CURRENT_TIMESTAMP,
                ?, ?,
                0, 0
            )
    `).run(id, no, today, today, userId, companyId, branchId);

        SalesInvoiceService.recordAudit(
            auditCtx,
            {
                entityType: 'sales_invoice',
                entityId: id,
                docType: 'sales_invoice',
                docId: id,
                eventType: 'document.create',
                summaryI18nKey: 'audit.event.document.create',
                meta: {
                    action: 'create',
                    docNo: no,
                    status: 'DRAFT',
                },
            },
            [
                {
                    fieldPath: 'header.status',
                    oldValue: null,
                    newValue: 'DRAFT',
                },
            ],
        );

        return { id, invoice_no: no, status: 'DRAFT' };
    }

    /** Save (upsert) header + lines. Requires editable status. */
    static save(params: {
        id: string;
        header: Record<string, any>;
        lines: any[];
        userId?: string;
    }, scope: TenantScope, auditCtx?: AuditContext | null) {
        const { id, header, lines, userId = 'admin' } = params;

        const existing: any = db.prepare(`
            SELECT status, version
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!existing) throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (!SALES_INVOICE_STATUS_RULES.editable.includes(String(existing.status || '') as any)) {
            throw Object.assign(new Error('Only editable invoices can be edited'), { code: 'INVALID_TRANSITION' });
        }
        if (header?.version && Number(header.version) !== Number(existing.version)) {
            throw Object.assign(new Error('Document has been modified by another user'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
        }

        SalesInvoiceService.validatePayload(header, lines);

        const beforeDoc = SalesInvoiceService.get(id, scope);

        // Recalc totals
        const subtotal = lines.reduce((s, l) => s + (Number(l.qty || l.quantity || 0) * Number(l.price || l.unit_price || 0) * (1 - (Number(l.discount || 0) / 100))), 0);
        const discountTotal = lines.reduce((s, l) => {
            const gross = Number(l.qty || l.quantity || 0) * Number(l.price || l.unit_price || 0);
            return s + (gross * (Number(l.discount || 0) / 100));
        }, 0);
        const taxTotal = lines.reduce((s, l) => {
            const lineNet = Number(l.qty || l.quantity || 0) * Number(l.price || l.unit_price || 0) * (1 - (Number(l.discount || 0) / 100));
            return s + lineNet * (Number(l.tax_rate || 0) / 100);
        }, 0);
        const grandTotal = subtotal + taxTotal;
        const docDate = String(header.doc_date ?? header.date ?? new Date().toISOString().split('T')[0]).slice(0, 10);
        const dueDate = String(header.due_date ?? docDate).slice(0, 10);

        db.transaction(() => {
            // Update header
            const headerUpdate = db.prepare(`
                UPDATE sales_invoices SET
    customer_id = ?,
        customer_name = ?,
        date = ?,
        doc_date = ?,
        due_date = ?,
        currency_id = ?,
        warehouse_id = ?,
        tax_group_id = ?,
        exchange_rate = ?,
        price_list_id = ?,
        payment_method_id = ?,
        sales_rep_id = ?,
        cost_center_id = ?,
        manual_ref = ?,
        subtotal = ?,
        discount_total = ?,
        tax_total = ?,
        grand_total = ?,
        version = version + 1,
        notes = ?,
        remarks = ?,
        updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status IN ('DRAFT', 'REJECTED')
              AND version = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
                `).run(
                header.customer_id ?? null,
                header.customer_name ?? null,
                docDate,
                docDate,
                dueDate,
                header.currency_id ?? null,
                header.warehouse_id ?? null,
                header.tax_group_id ?? null,
                header.exchange_rate ?? 1,
                header.price_list_id ?? null,
                header.payment_method_id ?? null,
                header.sales_rep_id ?? null,
                header.cost_center_id ?? null,
                header.manual_ref ?? null,
                subtotal, discountTotal, taxTotal, grandTotal,
                header.notes ?? null,
                header.remarks ?? header.notes ?? null,
                id,
                Number(existing.version || 0),
                scope.companyId,
                scope.branchId
            );

            if (Number(headerUpdate.changes || 0) === 0) {
                throw Object.assign(new Error('Invoice save conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
            }

            // Replace lines
            db.prepare('DELETE FROM sales_invoice_lines WHERE invoice_id = ?').run(id);

            const insertLine = db.prepare(`
                INSERT INTO sales_invoice_lines(
                    id, invoice_id, line_no,
                    item_id, description,
                    quantity, unit_price, discount, tax_rate,
                    total_price, tax_amount, net_total
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            lines.forEach((l, idx) => {
                const qty = Number(l.qty || l.quantity || 0);
                const price = Number(l.price || l.unit_price || 0);
                const discPct = Number(l.discount || 0);
                const taxRate = Number(l.tax_rate || 0);
                const lineNet = qty * price * (1 - discPct / 100);
                const taxAmt = lineNet * taxRate / 100;
                const lineTotal = lineNet + taxAmt;

                insertLine.run(
                    uuidv4(), id, idx + 1,
                    l.item_id || null,
                    l.item_name || l.description || '',
                    qty, price, discPct, taxRate,
                    lineNet, taxAmt, lineTotal
                );
            });
        })();
        const afterDoc = SalesInvoiceService.get(id, scope);
        const fieldChanges = diffDocumentPayload(
            beforeDoc?.header || {},
            afterDoc?.header || {},
            beforeDoc?.lines || [],
            afterDoc?.lines || [],
        );

        SalesInvoiceService.recordAudit(
            auditCtx,
            {
                entityType: 'sales_invoice',
                entityId: id,
                docType: 'sales_invoice',
                docId: id,
                eventType: 'document.update',
                summaryI18nKey: 'audit.event.document.update',
                meta: {
                    action: 'save',
                    docNo: afterDoc?.header?.invoice_no || '',
                    status: afterDoc?.header?.status || 'DRAFT',
                },
            },
            fieldChanges,
        );

        return afterDoc;
    }

    private static getAccountResolutionUseCases(): AccountingResolutionUseCases {
        if (!this.accountResolutionUseCases) {
            throw Object.assign(new Error('Account Resolution Engine is not configured for SalesInvoiceService'), {
                code: 'INTERNAL_ERROR',
                messageKey: 'error.account_resolution.not_configured',
            });
        }
        return this.accountResolutionUseCases;
    }

    private static getJournalEngineUseCases(): JournalEngineUseCases {
        if (!this.journalEngineUseCases) {
            throw Object.assign(new Error('Journal Engine is not configured for SalesInvoiceService'), {
                code: 'INTERNAL_ERROR',
                messageKey: 'error.journal_engine.not_configured',
            });
        }
        return this.journalEngineUseCases;
    }

    private static normalizeNullableId(value: unknown): string | null {
        const normalized = String(value || '').trim();
        return normalized || null;
    }

    private static toNumber(value: unknown): number {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric)) return 0;
        return numeric;
    }

    private static roundAmount(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }

    private static isServiceLine(line: any): boolean {
        const explicit = String(line?.line_type || line?.lineType || '').trim().toUpperCase();
        if (explicit === 'SERVICE') return true;
        if (explicit === 'ITEM') return false;
        return Boolean(line?.is_service || line?.isService);
    }

    private static resolveItemGroupId(itemId: string | null): string | null {
        if (!itemId) return null;
        try {
            const row = db.prepare(`
                SELECT item_group_id
                FROM items
                WHERE id = ?
                LIMIT 1
            `).get(itemId) as { item_group_id?: string | null } | undefined;
            return this.normalizeNullableId(row?.item_group_id);
        } catch {
            return null;
        }
    }

    private static resolveCurrencyCode(rawCurrency: unknown): string {
        const normalized = String(rawCurrency || '').trim();
        if (!normalized) return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized)) return normalized.toUpperCase();

        try {
            const row = db.prepare(`
                SELECT code
                FROM currencies
                WHERE id = ?
                   OR UPPER(code) = UPPER(?)
                LIMIT 1
            `).get(normalized, normalized) as { code?: string | null } | undefined;
            const code = String(row?.code || '').trim().toUpperCase();
            return code || 'ILS';
        } catch {
            return 'ILS';
        }
    }

    private static async buildPostingCommandForInvoice(
        id: string,
        scope: TenantScope,
        userId: string,
        sourceVersion: number,
    ): Promise<PostJournalInput> {
        const { header, lines } = SalesInvoiceService.get(id, scope);
        const accountResolutionUseCases = this.getAccountResolutionUseCases();

        const docDate = String(header?.doc_date || header?.date || '').slice(0, 10);
        if (!docDate) {
            throw Object.assign(new Error('Invoice posting date is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.sales_invoice.date_required',
            });
        }

        const invoiceNo = String(header?.invoice_no || '').trim();
        if (!invoiceNo) {
            throw Object.assign(new Error('Invoice number is required for posting'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.sales_invoice.invoice_no_required',
            });
        }

        const exchangeRate = this.toNumber(header?.exchange_rate || 1) || 1;
        const currencyCode = this.resolveCurrencyCode(header?.currency_id);
        const partnerId = this.normalizeNullableId(header?.customer_id);
        const warehouseId = this.normalizeNullableId(header?.warehouse_id);
        const costCenterId = this.normalizeNullableId(header?.cost_center_id);
        const taxProfileId = this.normalizeNullableId(header?.tax_group_id);

        const postingLines: PostJournalInput['lines'] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        const workingLines = Array.isArray(lines) ? lines : [];
        for (let index = 0; index < workingLines.length; index += 1) {
            const line = workingLines[index];
            const itemId = this.normalizeNullableId(line?.item_id);
            const itemGroupId = this.resolveItemGroupId(itemId);
            const isService = this.isServiceLine(line);

            const quantity = this.roundAmount(this.toNumber(line?.qty ?? line?.quantity));
            const unitPrice = this.roundAmount(this.toNumber(line?.price ?? line?.unit_price));
            const discountPct = this.toNumber(line?.discount);
            const lineNet = this.roundAmount(quantity * unitPrice * (1 - discountPct / 100));
            const explicitTax = this.toNumber(line?.tax_amount);
            const taxRate = this.toNumber(line?.tax_rate);
            const lineTax = this.roundAmount(explicitTax !== 0 ? explicitTax : lineNet * (taxRate / 100));
            const lineTotal = this.roundAmount(lineNet + lineTax);

            if (lineTotal === 0 && lineNet === 0 && lineTax === 0) continue;

            const resolution = await accountResolutionUseCases.resolveRequiredAccounts(scope.companyId, {
                companyId: scope.companyId,
                branchId: scope.branchId,
                documentType: 'SALES_INVOICE',
                documentId: id,
                lineType: isService ? 'SERVICE' : 'ITEM',
                itemId,
                itemGroupId,
                warehouseId,
                partnerId,
                taxProfileId,
                isService,
                requiresInventory: false,
                requiresTax: lineTax > 0,
                currencyCode,
                direction: ResolutionDirection.SALE,
                requiredRoles: [
                    FinancialAccountRole.RECEIVABLE_ACCOUNT,
                    ...(lineTax > 0 ? [FinancialAccountRole.VAT_OUTPUT_ACCOUNT] : []),
                ],
                optionalRoles: [
                    FinancialAccountRole.REVENUE_ACCOUNT,
                    FinancialAccountRole.SERVICE_REVENUE_ACCOUNT,
                ],
            });

            if (!resolution.success) {
                throw Object.assign(new Error(`Account resolution failed for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }

            const receivable = resolution.resolvedAccounts[FinancialAccountRole.RECEIVABLE_ACCOUNT];
            const revenue =
                resolution.resolvedAccounts[FinancialAccountRole.SERVICE_REVENUE_ACCOUNT] ||
                resolution.resolvedAccounts[FinancialAccountRole.REVENUE_ACCOUNT];
            const vatOutput =
                lineTax > 0
                    ? resolution.resolvedAccounts[FinancialAccountRole.VAT_OUTPUT_ACCOUNT] || null
                    : null;

            if (!receivable) {
                throw Object.assign(new Error(`Receivable account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: FinancialAccountRole.RECEIVABLE_ACCOUNT,
                    },
                });
            }
            if (!revenue) {
                throw Object.assign(new Error(`Revenue account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: FinancialAccountRole.REVENUE_ACCOUNT,
                    },
                });
            }
            if (lineTax > 0 && !vatOutput) {
                throw Object.assign(new Error(`VAT output account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: FinancialAccountRole.VAT_OUTPUT_ACCOUNT,
                    },
                });
            }

            const commonLine = {
                currencyCode,
                exchangeRate,
                branchId: scope.branchId,
                costCenterId,
                partnerId,
                warehouseId,
                itemId,
            };

            postingLines.push({
                accountId: receivable.accountId,
                description: `Sales invoice ${invoiceNo} line ${index + 1}`,
                debit: lineTotal,
                credit: 0,
                ...commonLine,
            });
            totalDebit = this.roundAmount(totalDebit + lineTotal);

            postingLines.push({
                accountId: revenue.accountId,
                description: `Sales revenue ${invoiceNo} line ${index + 1}`,
                debit: 0,
                credit: lineNet,
                ...commonLine,
            });
            totalCredit = this.roundAmount(totalCredit + lineNet);

            if (lineTax > 0 && vatOutput) {
                postingLines.push({
                    accountId: vatOutput.accountId,
                    description: `Sales VAT ${invoiceNo} line ${index + 1}`,
                    debit: 0,
                    credit: lineTax,
                    ...commonLine,
                });
                totalCredit = this.roundAmount(totalCredit + lineTax);
            }
        }

        if (!postingLines.length) {
            throw Object.assign(new Error('No posting lines generated for invoice'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.sales_invoice.lines_required',
            });
        }

        return {
            companyId: scope.companyId,
            branchId: scope.branchId,
            journalDate: docDate,
            sourceType: 'SALES_INVOICE',
            sourceId: id,
            sourceNo: invoiceNo,
            sourceVersion: Number(sourceVersion || 1),
            referenceNo: String(header?.manual_ref || invoiceNo || '').trim() || null,
            description: `Sales invoice ${invoiceNo}`,
            currencyCode,
            exchangeRate,
            totalDebit,
            totalCredit,
            postedBy: userId,
            lines: postingLines,
        };
    }

    /** F9: Post immediately or submit for approval */
    static async postOrSubmit(
        id: string,
        userId = 'admin',
        hasPostPermission = false,
        scope: TenantScope,
        auditCtx?: AuditContext | null
    ) {
        const doc: any = db.prepare(`
            SELECT status, posted_once, doc_date, date, version, journal_id
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc) throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (doc.status === 'POSTED') {
            return { status: 'POSTED', action: SALES_INVOICE_POSTING_POLICY.alreadyPostedAction };
        }
        if (!SALES_INVOICE_STATUS_RULES.postable.includes(String(doc.status || '') as any)) {
            throw Object.assign(new Error(`Cannot submit from status: ${doc.status} `), { code: 'INVALID_TRANSITION' });
        }

        const docDate = String(doc.doc_date || doc.date || '').slice(0, 10);
        if (!SalesInvoiceService.requireEditablePeriod(docDate)) {
            throw Object.assign(new Error('Period is locked'), {
                code: 'POLICY_VIOLATION',
                messageKey: 'error.policy.period_locked',
            });
        }

        const beforeDoc = SalesInvoiceService.get(id, scope);

        if (hasPostPermission) {
            const sourceVersion = Number(doc?.version || 0) + 1;
            const postingCommand = await SalesInvoiceService.buildPostingCommandForInvoice(
                id,
                scope,
                userId,
                sourceVersion,
            );
            const journalEngineUseCases = SalesInvoiceService.getJournalEngineUseCases();

            let journalPostResult: {
                journalId: string;
                journalNo: string;
            } | null = null;

            try {
                db.transaction(() => {
                    const prePostUpdate = db.prepare(`
                        UPDATE sales_invoices
                        SET status = 'POSTED',
                            posted_by = ?,
                            posted_at = CURRENT_TIMESTAMP,
                            posted_once = 1,
                            posted_token = COALESCE(NULLIF(posted_token, ''), ?),
                            version = version + 1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                          AND status = 'DRAFT'
                          AND COALESCE(company_id, 'COMP_01') = ?
                          AND COALESCE(branch_id, '') = ?
                          AND version = ?
                          AND COALESCE(posted_once, 0) = 0
                    `).run(
                        userId,
                        `${id}:POSTED`,
                        id,
                        scope.companyId,
                        scope.branchId,
                        Number(doc?.version || 0),
                    );

                    if (Number(prePostUpdate.changes || 0) === 0) {
                        const current: any = db.prepare(`
                            SELECT status
                            FROM sales_invoices
                            WHERE id = ?
                              AND COALESCE(company_id, 'COMP_01') = ?
                              AND COALESCE(branch_id, '') = ?
                        `).get(id, scope.companyId, scope.branchId);
                        if (String(current?.status || '') === 'POSTED') {
                            throw Object.assign(new Error('Invoice already posted'), { code: 'ALREADY_POSTED' });
                        }
                        throw Object.assign(new Error('Invoice posting conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
                    }

                    journalPostResult = journalEngineUseCases.postJournal(
                        scope.companyId,
                        scope.branchId,
                        userId,
                        postingCommand,
                    );

                    db.prepare(`
                        UPDATE sales_invoices
                        SET journal_id = ?
                        WHERE id = ?
                          AND COALESCE(company_id, 'COMP_01') = ?
                          AND COALESCE(branch_id, '') = ?
                    `).run(
                        journalPostResult?.journalId || null,
                        id,
                        scope.companyId,
                        scope.branchId,
                    );
                })();
            } catch (error: any) {
                const errorCode = String(error?.code || '');
                if (errorCode === 'ALREADY_POSTED') {
                    const existingJournal =
                        journalEngineUseCases.getBySource(scope.companyId, {
                            sourceType: 'SALES_INVOICE',
                            sourceId: id,
                            sourceVersion,
                        }) ||
                        journalEngineUseCases.getBySource(scope.companyId, {
                            sourceType: 'SALES_INVOICE',
                            sourceId: id,
                        });
                    return {
                        status: 'POSTED',
                        action: SALES_INVOICE_POSTING_POLICY.alreadyPostedAction,
                        journalId: doc?.journal_id || existingJournal?.id || null,
                        journalNo: existingJournal?.journalNo || null,
                    };
                }

                if (errorCode === 'ERR_SOURCE_ALREADY_POSTED') {
                    const existingJournal =
                        journalEngineUseCases.getBySource(scope.companyId, {
                            sourceType: 'SALES_INVOICE',
                            sourceId: id,
                            sourceVersion,
                        }) ||
                        journalEngineUseCases.getBySource(scope.companyId, {
                            sourceType: 'SALES_INVOICE',
                            sourceId: id,
                        });

                    if (existingJournal) {
                        db.prepare(`
                            UPDATE sales_invoices
                            SET status = 'POSTED',
                                posted_by = COALESCE(NULLIF(posted_by, ''), ?),
                                posted_at = COALESCE(posted_at, CURRENT_TIMESTAMP),
                                posted_once = 1,
                                posted_token = COALESCE(NULLIF(posted_token, ''), ?),
                                journal_id = COALESCE(NULLIF(journal_id, ''), ?),
                                version = CASE WHEN status = 'DRAFT' THEN version + 1 ELSE version END,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                              AND COALESCE(company_id, 'COMP_01') = ?
                              AND COALESCE(branch_id, '') = ?
                              AND status IN ('DRAFT', 'POSTED')
                        `).run(
                            userId,
                            `${id}:POSTED`,
                            existingJournal.id,
                            id,
                            scope.companyId,
                            scope.branchId,
                        );

                        return {
                            status: 'POSTED',
                            action: SALES_INVOICE_POSTING_POLICY.alreadyPostedAction,
                            journalId: existingJournal.id,
                            journalNo: existingJournal.journalNo,
                        };
                    }
                }

                throw error;
            }

            if (!journalPostResult) {
                throw Object.assign(new Error('Journal posting did not return a result'), {
                    code: 'INTERNAL_ERROR',
                    messageKey: 'error.journal.post.no_result',
                });
            }

            SalesInvoiceService._writeAudit(id, userId, 'DRAFT', 'POSTED', 'Post');

            const afterDoc = SalesInvoiceService.get(id, scope);
            SalesInvoiceService.recordAudit(
                auditCtx,
                {
                    entityType: 'sales_invoice',
                    entityId: id,
                    docType: 'sales_invoice',
                    docId: id,
                    eventType: 'document.post',
                    summaryI18nKey: 'audit.event.document.post',
                    meta: {
                        action: 'post',
                        fromStatus: 'DRAFT',
                        targetStatus: 'POSTED',
                        docNo: afterDoc?.header?.invoice_no || '',
                    },
                },
                diffDocumentPayload(
                    beforeDoc?.header || {},
                    afterDoc?.header || {},
                    beforeDoc?.lines || [],
                    afterDoc?.lines || [],
                ),
            );
            return {
                status: 'POSTED',
                action: 'posted',
                journalId: journalPostResult.journalId,
                journalNo: journalPostResult.journalNo,
            };
        }

        // Determine approval level by reading approval_rules
        let targetStatus = 'PENDING_APPROVAL_L1';
        try {
            const rule: any = db.prepare(
                `SELECT level FROM approval_rules WHERE doc_type = 'sales_invoice' ORDER BY min_amount ASC LIMIT 1`
            ).get();
            if (rule && rule.level === 2) targetStatus = 'PENDING_APPROVAL_L2';
        } catch (e) { /* table may not exist */ }

        db.prepare(`
            UPDATE sales_invoices
            SET status = ?, submitted_by = ?, submitted_at = CURRENT_TIMESTAMP, version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND status = 'DRAFT'
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(targetStatus, userId, id, scope.companyId, scope.branchId);

        const current: any = db.prepare(`
            SELECT status
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (String(current?.status || '') !== targetStatus) {
            if (String(current?.status || '') === 'POSTED') {
                return { status: 'POSTED', action: SALES_INVOICE_POSTING_POLICY.alreadyPostedAction };
            }
            throw Object.assign(new Error('Invoice submit conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
        }

        SalesInvoiceService._writeAudit(id, userId, 'DRAFT', targetStatus, 'Submit for Approval');
        const afterDoc = SalesInvoiceService.get(id, scope);
        SalesInvoiceService.recordAudit(
            auditCtx,
            {
                entityType: 'sales_invoice',
                entityId: id,
                docType: 'sales_invoice',
                docId: id,
                eventType: 'document.update',
                summaryI18nKey: 'audit.event.document.update',
                meta: {
                    action: 'submit',
                    fromStatus: 'DRAFT',
                    targetStatus,
                    docNo: afterDoc?.header?.invoice_no || '',
                },
            },
            [
                {
                    fieldPath: 'header.status',
                    oldValue: 'DRAFT',
                    newValue: targetStatus,
                },
            ],
        );
        return { status: targetStatus, action: 'submitted' };
    }

    /** Reopen a REJECTED invoice back to DRAFT */
    static reopenRejected(id: string, userId = 'admin', scope: TenantScope, auditCtx?: AuditContext | null) {
        const doc: any = db.prepare(`
            SELECT status
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc) throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (!SALES_INVOICE_STATUS_RULES.reopenable.includes(String(doc.status || '') as any)) {
            throw Object.assign(new Error('Only REJECTED invoices can be reopened'), { code: 'INVALID_TRANSITION' });
        }

        db.prepare(`
            UPDATE sales_invoices
            SET status = 'DRAFT', rejection_reason = NULL, version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(id, scope.companyId, scope.branchId);

        SalesInvoiceService._writeAudit(id, userId, 'REJECTED', 'DRAFT', 'Reopen');
        SalesInvoiceService.recordAudit(
            auditCtx,
            {
                entityType: 'sales_invoice',
                entityId: id,
                docType: 'sales_invoice',
                docId: id,
                eventType: 'document.update',
                summaryI18nKey: 'audit.event.document.update',
                meta: {
                    action: 'reopen',
                    fromStatus: 'REJECTED',
                    targetStatus: 'DRAFT',
                },
            },
            [
                {
                    fieldPath: 'header.status',
                    oldValue: 'REJECTED',
                    newValue: 'DRAFT',
                },
            ],
        );
        return { status: 'DRAFT' };
    }

    static voidInvoice(id: string, userId = 'admin', scope: TenantScope, auditCtx?: AuditContext | null) {
        const doc: any = db.prepare(`
            SELECT status
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc) throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (doc.status === 'VOID') {
            return { status: 'VOID' };
        }
        if (!SALES_INVOICE_STATUS_RULES.voidable.includes(String(doc.status || '') as any)) {
            throw Object.assign(new Error(`Cannot void from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });
        }

        const beforeStatus = String(doc.status || '');
        const voided = db.prepare(`
            UPDATE sales_invoices
            SET status = 'VOID',
                voided_by = ?,
                voided_at = CURRENT_TIMESTAMP,
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND status = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(userId, id, beforeStatus, scope.companyId, scope.branchId);

        if (Number(voided.changes || 0) === 0) {
            const current: any = db.prepare(`
                SELECT status
                FROM sales_invoices
                WHERE id = ?
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
            `).get(id, scope.companyId, scope.branchId);
            if (String(current?.status || '') === 'VOID') {
                return { status: 'VOID' };
            }
            throw Object.assign(new Error('Invoice void conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
        }

        SalesInvoiceService._writeAudit(id, userId, beforeStatus, 'VOID', 'Void');
        SalesInvoiceService.recordAudit(
            auditCtx,
            {
                entityType: 'sales_invoice',
                entityId: id,
                docType: 'sales_invoice',
                docId: id,
                eventType: 'document.void',
                summaryI18nKey: 'audit.event.document.void',
                meta: {
                    action: 'void',
                    fromStatus: beforeStatus,
                    targetStatus: 'VOID',
                },
            },
            [
                {
                    fieldPath: 'header.status',
                    oldValue: beforeStatus,
                    newValue: 'VOID',
                },
            ],
        );

        return { status: 'VOID' };
    }

    /** Validate the invoice constraints */
    static validate(id: string, scope: TenantScope) {
        const { header, lines } = SalesInvoiceService.get(id, scope);
        const errors: { field: string; message: string }[] = [];

        if (!header.customer_id) {
            errors.push({ field: 'customer_id', message: 'Customer is required' });
        }

        if (!lines || lines.length === 0) {
            errors.push({ field: 'lines', message: 'At least one line item is required' });
        } else {
            const hasValidLine = lines.some(l =>
                String(l.item_code_lookup || l.item_code || l.item_id || '').trim() &&
                Number(l.qty) > 0
            );
            if (!hasValidLine) {
                errors.push({ field: 'lines', message: 'At least one line must have an item and quantity > 0' });
            }
            lines.forEach((line: any, index: number) => {
                if (Number(line.qty) <= 0) {
                    errors.push({ field: `lines[${index}].qty`, message: 'Quantity must be greater than zero' });
                }
                if (Number(line.price) < 0) {
                    errors.push({ field: `lines[${index}].price`, message: 'Price cannot be negative' });
                }
            });
        }

        if (header.grand_total < 0) {
            errors.push({ field: 'grand_total', message: 'Total cannot be negative' });
        }

        return { errors };
    }

    private static _writeAudit(docId: string, userId: string, fromStatus: string, toStatus: string, action: string) {
        try {
            db.prepare(`
                INSERT INTO document_audit(id, document_id, doc_type, action, from_status, to_status, acted_by, acted_at)
    VALUES(?, ?, 'sales_invoice', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(uuidv4(), docId, action, fromStatus, toStatus, userId);
        } catch (e) {
            // document_audit may not exist yet, skip silently
        }
    }

    /** Register all IPC handlers */
    static register() {
        SalesInvoiceService.ensureSchema();

        ipcMain.handle(
            'salesInvoices:list',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.list',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
                        legacyPermissions: SALES_INVOICE_LEGACY.read,
                    },
                    async (ctx, _event, params: any) => {
                        return SalesInvoiceService.listKeyset(params || {}, SalesInvoiceService.getScope(ctx));
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:get',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.get',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
                        legacyPermissions: SALES_INVOICE_LEGACY.read,
                    },
                    async (ctx, _event, id: string) => {
                        return SalesInvoiceService.get(id, SalesInvoiceService.getScope(ctx));
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:createDraft',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.createDraft',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.create],
                        legacyPermissions: SALES_INVOICE_LEGACY.create,
                    },
                    async (ctx, event, userId?: string) => {
                        const scope = SalesInvoiceService.getScope(ctx);
                        const auditCtx = SalesInvoiceService.createAuditContext(
                            ctx,
                            event,
                            userId || undefined,
                            ctx?.correlationId,
                        );
                        return SalesInvoiceService.createDraft(userId || String(ctx?.userId || 'admin'), scope, auditCtx);
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:save',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.save',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.update],
                        legacyPermissions: SALES_INVOICE_LEGACY.update,
                    },
                    async (ctx, event, params: any) => {
                        const scope = SalesInvoiceService.getScope(ctx);
                        const saveUserId = params?.userId || ctx?.userId || undefined;
                        const auditCtx = SalesInvoiceService.createAuditContext(
                            ctx,
                            event,
                            saveUserId,
                            params?.correlationId || ctx?.correlationId,
                        );
                        return SalesInvoiceService.save(
                            {
                                ...(params || {}),
                                userId: saveUserId,
                            },
                            scope,
                            auditCtx,
                        );
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:postOrSubmit',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.postOrSubmit',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.post, SALES_INVOICE_CAPABILITIES.update],
                        legacyPermissions: [...SALES_INVOICE_LEGACY.post, ...SALES_INVOICE_LEGACY.update],
                        policyGuard: () => true,
                    },
                    async (ctx, event, payload: any) => {
                        const scope = SalesInvoiceService.getScope(ctx);
                        const id = String(payload?.id || '');
                        const userId = String(payload?.userId || ctx?.userId || 'admin');
                        const hasPostPermission = hasPostCapability(ctx);
                        const auditCtx = SalesInvoiceService.createAuditContext(
                            ctx,
                            event,
                            userId,
                            payload?.correlationId || ctx?.correlationId,
                        );
                        return SalesInvoiceService.postOrSubmit(
                            id,
                            userId,
                            hasPostPermission,
                            scope,
                            auditCtx,
                        );
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:validate',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.validate',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
                        legacyPermissions: SALES_INVOICE_LEGACY.read,
                    },
                    async (ctx, _event, id: string) => {
                        return SalesInvoiceService.validate(id, SalesInvoiceService.getScope(ctx));
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:reopenRejected',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.reopenRejected',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.update],
                        legacyPermissions: SALES_INVOICE_LEGACY.update,
                    },
                    async (ctx, event, payload: { id: string; userId?: string }) => {
                        const scope = SalesInvoiceService.getScope(ctx);
                        const userId = payload?.userId || ctx?.userId || 'admin';
                        const auditCtx = SalesInvoiceService.createAuditContext(ctx, event, userId, ctx?.correlationId);
                        return SalesInvoiceService.reopenRejected(payload?.id, userId, scope, auditCtx);
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:void',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.void',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.void],
                        legacyPermissions: SALES_INVOICE_LEGACY.void,
                    },
                    async (ctx, event, payload: { id: string; userId?: string }) => {
                        const scope = SalesInvoiceService.getScope(ctx);
                        const userId = payload?.userId || ctx?.userId || 'admin';
                        const auditCtx = SalesInvoiceService.createAuditContext(ctx, event, userId, ctx?.correlationId);
                        return SalesInvoiceService.voidInvoice(payload?.id, userId, scope, auditCtx);
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:searchCustomers',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.searchCustomers',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
                        legacyPermissions: SALES_INVOICE_LEGACY.read,
                    },
                    async (_ctx, _event, search: string) => {
                        const q = `%${String(search || '').trim()}%`;
                        return db.prepare(`
                            SELECT
                                id,
                                COALESCE(name_ar, name_en, name, code, '') AS name,
                                phone,
                                code
                            FROM business_partners
                            WHERE (
                                type = 'Customer' OR
                                type = 'CUSTOMER' OR
                                type = 'BOTH' OR
                                type IS NULL
                            )
                              AND (
                                name_ar LIKE ? OR
                                name_en LIKE ? OR
                                name LIKE ? OR
                                code LIKE ?
                              )
                            ORDER BY name_ar
                            LIMIT 50
                        `).all(q, q, q, q);
                    }
                )
            )
        );

        ipcMain.handle(
            'salesInvoices:searchItems',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'salesInvoices.searchItems',
                        requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
                        legacyPermissions: SALES_INVOICE_LEGACY.read,
                    },
                    async (_ctx, _event, search: string) => {
                        return ItemService.searchItemProfiles(search, 50);
                    }
                )
            )
        );

        console.log('[SalesInvoiceService] IPC handlers registered');
    }
}
