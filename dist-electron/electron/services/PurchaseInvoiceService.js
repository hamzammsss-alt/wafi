"use strict";
/**
 * PurchaseInvoiceService — DRAFT-first approval-aware ERP invoice service
 *
 * Provides:
 *   - listKeyset(params)        → keyset paginated list
 *   - get(id)                   → header + lines
 *   - createDraft(userId)       → empty DRAFT invoice
 *   - save({id, header, lines}) → upsert with version++
 *   - postOrSubmit(id, userId, hasPostPermission)
 *   - reopenRejected(id, userId)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseInvoiceService = void 0;
const electron_1 = require("electron");
const database_1 = require("../database");
const uuid_1 = require("uuid");
const AuditDiffService_1 = require("../../src/main/application/services/AuditDiffService");
const AuditService_1 = require("../../src/main/application/services/AuditService");
const withGuards_1 = require("../../src/main/ipc/withGuards");
const ipcWrap_1 = require("../../src/main/core/ipcWrap");
const FinancialAccountRole_1 = require("../../src/main/domain/accountingResolution/enums/FinancialAccountRole");
const ResolutionDirection_1 = require("../../src/main/domain/accountingResolution/enums/ResolutionDirection");
const ItemService_1 = require("./ItemService");
const PURCHASE_INVOICE_CAPABILITIES = {
    create: 'purchase.invoice.create',
    read: 'purchase.invoice.read',
    update: 'purchase.invoice.update',
    post: 'purchase.invoice.post',
    void: 'purchase.invoice.void',
};
const PURCHASE_INVOICE_LEGACY = {
    create: ['ti.purchase.invoice.create', 'purchase.invoice.create', 'purchases.create'],
    read: ['purchase.invoice.read', 'purchases.view', 'ti.purchase.invoice.create'],
    update: ['purchase.invoice.update', 'purchases.edit', 'purchase.invoice.create', 'ti.purchase.invoice.create'],
    post: ['ti.purchase.invoice.post', 'purchase.invoice.post', 'purchases.post', 'DOC.POST'],
    void: ['purchase.invoice.void', 'purchases.void', 'DOC.VOID'],
};
const PURCHASE_INVOICE_STATUS_RULES = {
    editable: ['DRAFT', 'REJECTED'],
    postable: ['DRAFT'],
    voidable: ['DRAFT', 'POSTED'],
    reopenable: ['REJECTED'],
};
const PURCHASE_INVOICE_POSTING_POLICY = {
    idempotent: true,
    alreadyPostedAction: 'already_posted',
    conflictErrorCode: 'CONFLICT',
};
function hasPostCapability(ctx) {
    const granted = new Set([
        ...(Array.isArray(ctx?.permissions) ? ctx.permissions : []),
        ...(Array.isArray(ctx?.capabilities) ? ctx.capabilities : []),
    ]);
    return (granted.has('ALL') ||
        granted.has('*.*') ||
        granted.has(PURCHASE_INVOICE_CAPABILITIES.post) ||
        PURCHASE_INVOICE_LEGACY.post.some((key) => granted.has(key)));
}
function selfHeal() {
    try {
        const cols = database_1.db.prepare('PRAGMA table_info(purchase_invoices)').all();
        const add = (col, type) => {
            if (!cols.some((c) => c.name === col)) {
                database_1.db.prepare(`ALTER TABLE purchase_invoices ADD COLUMN ${col} ${type}`).run();
                console.log(`[PurchaseInvoice] Added column: ${col}`);
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
        add('warehouse_id', 'TEXT');
        add('currency_id', 'TEXT');
        add('supplier_id', 'TEXT');
        add('company_id', "TEXT DEFAULT 'COMP_01'");
        add('tax_group_id', 'TEXT');
        add('remarks', 'TEXT');
        add('discount_total', 'REAL DEFAULT 0');
        add('posted_token', 'TEXT');
        add('posted_once', 'INTEGER DEFAULT 0');
        add('journal_id', 'TEXT');
        add('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
    catch (e) {
        console.error('[PurchaseInvoice] selfHeal error', e);
    }
    try {
        const lineCols = database_1.db.prepare('PRAGMA table_info(purchase_invoice_lines)').all();
        const addL = (col, type) => {
            if (!lineCols.some((c) => c.name === col)) {
                database_1.db.prepare(`ALTER TABLE purchase_invoice_lines ADD COLUMN ${col} ${type}`).run();
            }
        };
        addL('line_no', 'INTEGER DEFAULT 0');
        addL('discount', 'REAL DEFAULT 0');
        addL('tax_rate', 'REAL DEFAULT 0');
    }
    catch (e) {
        console.error('[PurchaseInvoice] selfHeal lines error', e);
    }
    // Keyset indexes
    try {
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_pi_status_date_id ON purchase_invoices(status, date, id)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_pi_supplier ON purchase_invoices(supplier_id)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_pi_invoice_no ON purchase_invoices(invoice_no)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_pi_scope_status_date ON purchase_invoices(company_id, branch_id, status, date, id)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_pi_scope_doc_no ON purchase_invoices(company_id, branch_id, invoice_no)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_pi_lines_invoice_no ON purchase_invoice_lines(invoice_id, line_no)`);
    }
    catch (e) { /* ignore if already exists */ }
}
function nextInvoiceNo() {
    database_1.db.prepare(`INSERT OR IGNORE INTO doc_sequences(doc_type, next_no) VALUES('purchase_invoice', 1)`).run();
    const sequence = database_1.db.prepare(`SELECT next_no FROM doc_sequences WHERE doc_type = 'purchase_invoice'`).get();
    const next = Math.max(sequence ? sequence.next_no : 1, 1);
    database_1.db.prepare(`UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = 'purchase_invoice'`).run();
    return `PINV-${String(next).padStart(4, '0')}`;
}
/* ─── Service ─── */
class PurchaseInvoiceService {
    static ensureSchema() {
        selfHeal();
    }
    static configurePostingPipeline(params) {
        this.accountResolutionUseCases = params.accountResolutionUseCases;
        this.journalEngineUseCases = params.journalEngineUseCases;
    }
    static configureAccountingUseCases(useCases) {
        this.purchaseInvoiceAccountingUseCases = useCases;
    }
    static recordAudit(auditCtx, event, fieldChanges = []) {
        if (!auditCtx)
            return;
        const auditService = (0, AuditService_1.getGlobalAuditService)();
        if (!auditService)
            return;
        try {
            auditService.recordEvent(auditCtx, {
                entityType: event.entityType,
                entityId: event.entityId,
                docType: event.docType || null,
                docId: event.docId || null,
                eventType: event.eventType,
                summaryI18nKey: event.summaryI18nKey || null,
                meta: event.meta || null,
                correlationId: auditCtx.correlationId || null,
                ipcid: auditCtx.ipcid || null,
            }, fieldChanges);
        }
        catch (error) {
            console.warn('[PurchaseInvoiceService] audit record failed:', error);
        }
    }
    static createAuditContext(ctx, event, userId, correlationId) {
        const ipcid = String(event?.sender?.id || '');
        return {
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
            userId: String(userId || ctx?.userId || 'SYSTEM'),
            sessionId: String(ctx?.sessionId || ipcid || ''),
            correlationId: String(correlationId || ctx?.correlationId || (0, uuid_1.v4)()),
            ipcid,
        };
    }
    static getScope(ctx) {
        return {
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
        };
    }
    static requireEditablePeriod(_docDate) {
        // Phase-1 placeholder for period lock policy.
        return true;
    }
    static validatePayload(header, lines) {
        if (!String(header?.customer_id || header?.supplier_id || '').trim()) {
            throw Object.assign(new Error('Supplier is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.purchase_invoice.supplier_required',
            });
        }
        const docDate = String(header?.doc_date || header?.date || '').trim();
        if (!docDate) {
            throw Object.assign(new Error('Date is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.purchase_invoice.date_required',
            });
        }
        if (!PurchaseInvoiceService.requireEditablePeriod(docDate)) {
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
                messageKey: 'validation.purchase_invoice.lines_required',
            });
        }
        validLines.forEach((line, index) => {
            const qty = Number(line?.qty || line?.quantity || 0);
            const price = Number(line?.price || line?.unit_price || 0);
            if (!String(line?.item_id || line?.item_code_lookup || line?.item_code || '').trim()) {
                throw Object.assign(new Error(`Line ${index + 1}: item is required`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.purchase_invoice.line_item_required',
                    details: { line: index + 1, field: 'item_id' },
                });
            }
            if (qty <= 0) {
                throw Object.assign(new Error(`Line ${index + 1}: qty must be greater than zero`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.purchase_invoice.qty_positive',
                    details: { line: index + 1, field: 'qty' },
                });
            }
            if (price < 0) {
                throw Object.assign(new Error(`Line ${index + 1}: price cannot be negative`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.purchase_invoice.price_non_negative',
                    details: { line: index + 1, field: 'price' },
                });
            }
        });
    }
    /** Keyset paginated list */
    static listKeyset(params, scope) {
        const limit = params.limit ?? 50;
        const sort = params.sort ?? 'date_desc';
        let where = ['COALESCE(i.company_id, \'COMP_01\') = ?', 'COALESCE(i.branch_id, \'\') = ?'];
        const args = [];
        args.push(scope.companyId, scope.branchId);
        if (params.status && params.status !== 'ALL') {
            where.push('i.status = ?');
            args.push(params.status);
        }
        if (params.search) {
            where.push(`(i.invoice_no LIKE ? OR bp.name_ar LIKE ? OR bp.name_en LIKE ? OR bp.name LIKE ?)`);
            const pct = `%${String(params.search || '').trim()}%`;
            args.push(pct, pct, pct, pct);
        }
        if (params.dateFrom) {
            where.push('COALESCE(i.doc_date, i.date) >= ?');
            args.push(params.dateFrom);
        }
        if (params.dateTo) {
            where.push('COALESCE(i.doc_date, i.date) <= ?');
            args.push(params.dateTo);
        }
        // Keyset
        if (params.cursor) {
            if (sort === 'date_desc') {
                where.push(`(COALESCE(i.doc_date, i.date) < ? OR(COALESCE(i.doc_date, i.date) = ? AND i.id < ?))`);
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            }
            else {
                where.push(`(COALESCE(i.doc_date, i.date) > ? OR(COALESCE(i.doc_date, i.date) = ? AND i.id > ?))`);
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            }
        }
        const orderDir = sort === 'date_asc' ? 'ASC' : 'DESC';
        const sql = `
            SELECT
                i.id, i.invoice_no, i.status, i.version,
        COALESCE(i.doc_date, i.date) AS doc_date,
        COALESCE(bp.name_ar, bp.name_en, bp.name, '') AS customer_name,
        i.supplier_id AS customer_id,
        i.supplier_id,
        COALESCE(i.grand_total, 0) AS grand_total,
        i.rejection_reason
            FROM purchase_invoices i
            LEFT JOIN business_partners bp ON i.supplier_id = bp.id
            WHERE ${where.join(' AND ')}
            ORDER BY COALESCE(i.doc_date, i.date) ${orderDir}, i.id ${orderDir}
            LIMIT ?
            `;
        const rows = database_1.db.prepare(sql).all(...args, limit + 1);
        const hasMore = rows.length > limit;
        if (hasMore)
            rows.pop();
        const next_cursor = hasMore && rows.length > 0
            ? { date: rows[rows.length - 1].doc_date, id: rows[rows.length - 1].id }
            : null;
        return { rows, next_cursor };
    }
    /** Get header + lines */
    static get(id, scope) {
        const header = database_1.db.prepare(`
            SELECT
                i.*,
        COALESCE(i.doc_date, i.date) AS doc_date,
        COALESCE(bp.name_ar, bp.name_en, bp.name, '') AS customer_name,
        i.supplier_id AS customer_id,
        i.supplier_id
            FROM purchase_invoices i
            LEFT JOIN business_partners bp ON i.supplier_id = bp.id
            WHERE i.id = ?
              AND COALESCE(i.company_id, 'COMP_01') = ?
              AND COALESCE(i.branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!header)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        const lines = database_1.db.prepare(`
            SELECT
                l.*,
        COALESCE(it.name_ar, l.description, '') AS item_name,
        COALESCE(it.code, '')    AS item_code_lookup,
        COALESCE(l.quantity, 0) AS qty,
        COALESCE(l.unit_price, 0) AS price,
        COALESCE(l.discount, 0)   AS discount,
        COALESCE(l.tax_rate, 0)   AS tax_rate,
        COALESCE(l.net_total, l.total_price, 0) AS line_total
            FROM purchase_invoice_lines l
            LEFT JOIN items it ON l.item_id = it.id
            WHERE l.invoice_id = ?
        ORDER BY COALESCE(l.line_no, l.rowid)
        `).all(id);
        return { header, lines };
    }
    /** Create a DRAFT invoice and return its id */
    static createDraft(userId = 'admin', scope, auditCtx) {
        selfHeal();
        const id = (0, uuid_1.v4)();
        const no = nextInvoiceNo();
        const today = new Date().toISOString().split('T')[0];
        const companyId = String(scope?.companyId || 'COMP_01');
        let branchId = String(scope?.branchId || '').trim() || null;
        if (!branchId) {
            try {
                const branch = database_1.db.prepare('SELECT id FROM branches WHERE is_main = 1 LIMIT 1').get()
                    || database_1.db.prepare('SELECT id FROM branches LIMIT 1').get();
                if (branch)
                    branchId = branch.id;
            }
            catch (e) { /* no branch table yet */ }
        }
        database_1.db.prepare(`
            INSERT INTO purchase_invoices(
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
        PurchaseInvoiceService.recordAudit(auditCtx, {
            entityType: 'purchase_invoice',
            entityId: id,
            docType: 'purchase_invoice',
            docId: id,
            eventType: 'document.create',
            summaryI18nKey: 'audit.event.document.create',
            meta: {
                action: 'create',
                docNo: no,
                status: 'DRAFT',
            },
        }, [
            {
                fieldPath: 'header.status',
                oldValue: null,
                newValue: 'DRAFT',
            },
        ]);
        return { id, invoice_no: no, status: 'DRAFT' };
    }
    /** Save (upsert) header + lines. Requires DRAFT status. */
    static save(params, scope, auditCtx) {
        const { id, header, lines, userId = 'admin' } = params;
        const existing = database_1.db.prepare(`
            SELECT status, version
            FROM purchase_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!existing)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (existing.status !== 'DRAFT') {
            throw Object.assign(new Error('Only DRAFT invoices can be edited'), { code: 'INVALID_TRANSITION' });
        }
        PurchaseInvoiceService.validatePayload(header, lines);
        const beforeDoc = PurchaseInvoiceService.get(id, scope);
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
        database_1.db.transaction(() => {
            // Update header
            database_1.db.prepare(`
                UPDATE purchase_invoices SET
    supplier_id = ?,
        vendor_invoice_no = ?,
        date = ?,
        doc_date = ?,
        due_date = ?,
        currency_id = ?,
        warehouse_id = ?,
        tax_group_id = ?,
        exchange_rate = ?,
        subtotal = ?,
        discount_total = ?,
        tax_total = ?,
        grand_total = ?,
        version = version + 1,
        notes = ?,
        remarks = ?,
        updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'DRAFT'
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
                `).run(header.customer_id ?? header.supplier_id ?? null, header.vendor_invoice_no ?? header.vendorInvoiceNo ?? null, docDate, docDate, header.due_date ?? header.dueDate ?? docDate, header.currency_id ?? null, header.warehouse_id ?? null, header.tax_group_id ?? null, header.exchange_rate ?? 1, subtotal, discountTotal, taxTotal, grandTotal, header.notes ?? null, header.remarks ?? header.notes ?? null, id, scope.companyId, scope.branchId);
            // Replace lines
            database_1.db.prepare('DELETE FROM purchase_invoice_lines WHERE invoice_id = ?').run(id);
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_invoice_lines(
                    id, invoice_id, line_no,
                    item_id, description, unit_id,
                    quantity, unit_price, discount, tax_rate,
                    total_price, tax_amount, net_total
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            lines.forEach((l, idx) => {
                const qty = Number(l.qty || l.quantity || 0);
                const price = Number(l.price || l.unit_price || 0);
                const discPct = Number(l.discount || 0);
                const taxRate = Number(l.tax_rate || 0);
                const lineNet = qty * price * (1 - discPct / 100);
                const taxAmt = lineNet * taxRate / 100;
                const lineTotal = lineNet + taxAmt;
                insertLine.run((0, uuid_1.v4)(), id, idx + 1, l.item_id || null, l.item_name || l.description || '', l.unit_id || null, qty, price, discPct, taxRate, lineNet, taxAmt, lineTotal);
            });
        })();
        const afterDoc = PurchaseInvoiceService.get(id, scope);
        const fieldChanges = (0, AuditDiffService_1.diffDocumentPayload)(beforeDoc?.header || {}, afterDoc?.header || {}, beforeDoc?.lines || [], afterDoc?.lines || []);
        PurchaseInvoiceService.recordAudit(auditCtx, {
            entityType: 'purchase_invoice',
            entityId: id,
            docType: 'purchase_invoice',
            docId: id,
            eventType: 'document.update',
            summaryI18nKey: 'audit.event.document.update',
            meta: {
                action: 'save',
                docNo: afterDoc?.header?.invoice_no || '',
                status: afterDoc?.header?.status || 'DRAFT',
            },
        }, fieldChanges);
        return afterDoc;
    }
    static getAccountResolutionUseCases() {
        if (!this.accountResolutionUseCases) {
            throw Object.assign(new Error('Account Resolution Engine is not configured for PurchaseInvoiceService'), {
                code: 'INTERNAL_ERROR',
                messageKey: 'error.account_resolution.not_configured',
            });
        }
        return this.accountResolutionUseCases;
    }
    static getJournalEngineUseCases() {
        if (!this.journalEngineUseCases) {
            throw Object.assign(new Error('Journal Engine is not configured for PurchaseInvoiceService'), {
                code: 'INTERNAL_ERROR',
                messageKey: 'error.journal_engine.not_configured',
            });
        }
        return this.journalEngineUseCases;
    }
    static getPurchaseInvoiceAccountingUseCases() {
        return this.purchaseInvoiceAccountingUseCases;
    }
    static normalizeNullableId(value) {
        const normalized = String(value || '').trim();
        return normalized || null;
    }
    static toNumber(value) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric))
            return 0;
        return numeric;
    }
    static roundAmount(value) {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
    static isServiceLine(line) {
        const explicit = String(line?.line_type || line?.lineType || '').trim().toUpperCase();
        if (explicit === 'SERVICE')
            return true;
        if (explicit === 'ITEM')
            return false;
        return Boolean(line?.is_service || line?.isService);
    }
    static resolveItemGroupId(itemId) {
        if (!itemId)
            return null;
        try {
            const row = database_1.db.prepare(`
                SELECT item_group_id
                FROM items
                WHERE id = ?
                LIMIT 1
            `).get(itemId);
            return this.normalizeNullableId(row?.item_group_id);
        }
        catch {
            return null;
        }
    }
    static resolveCurrencyCode(rawCurrency) {
        const normalized = String(rawCurrency || '').trim();
        if (!normalized)
            return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized))
            return normalized.toUpperCase();
        try {
            const row = database_1.db.prepare(`
                SELECT code
                FROM currencies
                WHERE id = ?
                   OR UPPER(code) = UPPER(?)
                LIMIT 1
            `).get(normalized, normalized);
            const code = String(row?.code || '').trim().toUpperCase();
            return code || 'ILS';
        }
        catch {
            return 'ILS';
        }
    }
    static async buildPostingCommandForInvoice(id, scope, userId, sourceVersion) {
        const { header, lines } = PurchaseInvoiceService.get(id, scope);
        const accountResolutionUseCases = this.getAccountResolutionUseCases();
        const docDate = String(header?.doc_date || header?.date || '').slice(0, 10);
        if (!docDate) {
            throw Object.assign(new Error('Invoice posting date is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.purchase_invoice.date_required',
            });
        }
        const invoiceNo = String(header?.invoice_no || '').trim();
        if (!invoiceNo) {
            throw Object.assign(new Error('Invoice number is required for posting'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.purchase_invoice.invoice_no_required',
            });
        }
        const exchangeRate = this.toNumber(header?.exchange_rate || 1) || 1;
        const currencyCode = this.resolveCurrencyCode(header?.currency_id);
        const partnerId = this.normalizeNullableId(header?.supplier_id || header?.customer_id);
        const warehouseId = this.normalizeNullableId(header?.warehouse_id);
        const costCenterId = this.normalizeNullableId(header?.cost_center_id);
        const taxProfileId = this.normalizeNullableId(header?.tax_group_id);
        const postingLines = [];
        let totalDebit = 0;
        let totalCredit = 0;
        const workingLines = Array.isArray(lines) ? lines : [];
        for (let index = 0; index < workingLines.length; index += 1) {
            const line = workingLines[index];
            const itemId = this.normalizeNullableId(line?.item_id);
            const itemGroupId = this.resolveItemGroupId(itemId);
            const isService = this.isServiceLine(line);
            const requiresInventory = !isService;
            const quantity = this.roundAmount(this.toNumber(line?.qty ?? line?.quantity));
            const unitPrice = this.roundAmount(this.toNumber(line?.price ?? line?.unit_price));
            const discountPct = this.toNumber(line?.discount);
            const lineNet = this.roundAmount(quantity * unitPrice * (1 - discountPct / 100));
            const explicitTax = this.toNumber(line?.tax_amount);
            const taxRate = this.toNumber(line?.tax_rate);
            const lineTax = this.roundAmount(explicitTax !== 0 ? explicitTax : lineNet * (taxRate / 100));
            const lineTotal = this.roundAmount(lineNet + lineTax);
            if (lineTotal === 0 && lineNet === 0 && lineTax === 0)
                continue;
            const requiredRoles = [
                FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT,
                ...(requiresInventory ? [FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT] : [FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT]),
                ...(lineTax > 0 ? [FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT] : []),
            ];
            const optionalRoles = [
                FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT,
                FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT,
                FinancialAccountRole_1.FinancialAccountRole.PURCHASE_DISCOUNT_ACCOUNT,
                FinancialAccountRole_1.FinancialAccountRole.FREIGHT_IN_ACCOUNT,
                FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT,
            ];
            const resolution = await accountResolutionUseCases.resolveRequiredAccounts(scope.companyId, {
                companyId: scope.companyId,
                branchId: scope.branchId,
                documentType: 'PURCHASE_INVOICE',
                documentId: id,
                lineType: isService ? 'SERVICE' : 'ITEM',
                itemId,
                itemGroupId,
                warehouseId,
                partnerId,
                taxProfileId,
                isService,
                requiresInventory,
                requiresTax: lineTax > 0,
                currencyCode,
                direction: ResolutionDirection_1.ResolutionDirection.PURCHASE,
                requiredRoles,
                optionalRoles,
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
            const payable = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT];
            const inventory = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT];
            const expense = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT];
            const vatInput = lineTax > 0
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT] || null
                : null;
            if (!payable) {
                throw Object.assign(new Error(`Payable account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT,
                    },
                });
            }
            const expectedCostRole = requiresInventory
                ? FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT
                : FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT;
            const costAccount = requiresInventory ? inventory : expense;
            if (!costAccount) {
                throw Object.assign(new Error(`Cost account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: expectedCostRole,
                    },
                });
            }
            if (lineTax > 0 && !vatInput) {
                throw Object.assign(new Error(`VAT input account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT,
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
                accountId: costAccount.accountId,
                description: `Purchase cost ${invoiceNo} line ${index + 1}`,
                debit: lineNet,
                credit: 0,
                ...commonLine,
            });
            totalDebit = this.roundAmount(totalDebit + lineNet);
            if (lineTax > 0 && vatInput) {
                postingLines.push({
                    accountId: vatInput.accountId,
                    description: `Purchase VAT ${invoiceNo} line ${index + 1}`,
                    debit: lineTax,
                    credit: 0,
                    ...commonLine,
                });
                totalDebit = this.roundAmount(totalDebit + lineTax);
            }
            postingLines.push({
                accountId: payable.accountId,
                description: `Purchase payable ${invoiceNo} line ${index + 1}`,
                debit: 0,
                credit: lineTotal,
                ...commonLine,
            });
            totalCredit = this.roundAmount(totalCredit + lineTotal);
        }
        if (!postingLines.length) {
            throw Object.assign(new Error('No posting lines generated for invoice'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.purchase_invoice.lines_required',
            });
        }
        const vendorInvoiceNo = String(header?.vendor_invoice_no || '').trim();
        return {
            companyId: scope.companyId,
            branchId: scope.branchId,
            journalDate: docDate,
            sourceType: 'PURCHASE_INVOICE',
            sourceId: id,
            sourceNo: invoiceNo,
            sourceVersion: Number(sourceVersion || 1),
            referenceNo: vendorInvoiceNo || invoiceNo || null,
            description: `Purchase invoice ${invoiceNo}`,
            currencyCode,
            exchangeRate,
            totalDebit,
            totalCredit,
            postedBy: userId,
            lines: postingLines,
        };
    }
    /** F9: Post immediately or submit for approval */
    static async postOrSubmit(id, userId = 'admin', hasPostPermission = false, scope, auditCtx) {
        const doc = database_1.db.prepare(`
            SELECT status, posted_once, doc_date, date, version, journal_id
            FROM purchase_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (doc.status === 'POSTED') {
            return { status: 'POSTED', action: PURCHASE_INVOICE_POSTING_POLICY.alreadyPostedAction };
        }
        if (!PURCHASE_INVOICE_STATUS_RULES.postable.includes(String(doc.status || ''))) {
            throw Object.assign(new Error(`Cannot submit from status: ${doc.status} `), { code: 'INVALID_TRANSITION' });
        }
        const docDate = String(doc.doc_date || doc.date || '').slice(0, 10);
        if (!PurchaseInvoiceService.requireEditablePeriod(docDate)) {
            throw Object.assign(new Error('Period is locked'), {
                code: 'POLICY_VIOLATION',
                messageKey: 'error.policy.period_locked',
            });
        }
        const beforeDoc = PurchaseInvoiceService.get(id, scope);
        if (hasPostPermission) {
            const accountingUseCases = PurchaseInvoiceService.getPurchaseInvoiceAccountingUseCases();
            if (accountingUseCases) {
                const prePostUpdate = database_1.db.prepare(`
                    UPDATE purchase_invoices
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
                `).run(userId, `${id}:POSTED`, id, scope.companyId, scope.branchId, Number(doc?.version || 0));
                if (Number(prePostUpdate.changes || 0) === 0) {
                    const current = database_1.db.prepare(`
                        SELECT status
                        FROM purchase_invoices
                        WHERE id = ?
                          AND COALESCE(company_id, 'COMP_01') = ?
                          AND COALESCE(branch_id, '') = ?
                    `).get(id, scope.companyId, scope.branchId);
                    if (String(current?.status || '') === 'POSTED') {
                        return { status: 'POSTED', action: PURCHASE_INVOICE_POSTING_POLICY.alreadyPostedAction };
                    }
                    throw Object.assign(new Error('Invoice posting conflict'), {
                        code: PURCHASE_INVOICE_POSTING_POLICY.conflictErrorCode,
                    });
                }
                let accountingResult;
                try {
                    accountingResult = await accountingUseCases.postAccounting(scope.companyId, scope.branchId, userId, id);
                }
                catch (error) {
                    database_1.db.prepare(`
                        UPDATE purchase_invoices
                        SET status = 'DRAFT',
                            posted_by = NULL,
                            posted_at = NULL,
                            posted_once = 0,
                            posted_token = NULL,
                            version = CASE WHEN version > 1 THEN version - 1 ELSE version END,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                          AND COALESCE(company_id, 'COMP_01') = ?
                          AND COALESCE(branch_id, '') = ?
                          AND status = 'POSTED'
                          AND NULLIF(TRIM(COALESCE(journal_id, '')), '') IS NULL
                    `).run(id, scope.companyId, scope.branchId);
                    throw error;
                }
                database_1.db.prepare(`
                    UPDATE purchase_invoices
                    SET journal_id = COALESCE(NULLIF(journal_id, ''), ?),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                      AND COALESCE(company_id, 'COMP_01') = ?
                      AND COALESCE(branch_id, '') = ?
                `).run(accountingResult.journalId, id, scope.companyId, scope.branchId);
                PurchaseInvoiceService._writeAudit(id, userId, 'DRAFT', 'POSTED', 'Post');
                const afterDoc = PurchaseInvoiceService.get(id, scope);
                PurchaseInvoiceService.recordAudit(auditCtx, {
                    entityType: 'purchase_invoice',
                    entityId: id,
                    docType: 'purchase_invoice',
                    docId: id,
                    eventType: 'document.post',
                    summaryI18nKey: 'audit.event.document.post',
                    meta: {
                        action: 'post',
                        fromStatus: 'DRAFT',
                        targetStatus: 'POSTED',
                        docNo: afterDoc?.header?.invoice_no || '',
                    },
                }, (0, AuditDiffService_1.diffDocumentPayload)(beforeDoc?.header || {}, afterDoc?.header || {}, beforeDoc?.lines || [], afterDoc?.lines || []));
                return {
                    status: 'POSTED',
                    action: accountingResult.status === 'ALREADY_POSTED'
                        ? PURCHASE_INVOICE_POSTING_POLICY.alreadyPostedAction
                        : 'posted',
                    journalId: accountingResult.journalId,
                    journalNo: accountingResult.journalNo,
                };
            }
            const sourceVersion = Number(doc?.version || 0) + 1;
            const postingCommand = await PurchaseInvoiceService.buildPostingCommandForInvoice(id, scope, userId, sourceVersion);
            const journalEngineUseCases = PurchaseInvoiceService.getJournalEngineUseCases();
            let journalPostResult = null;
            try {
                database_1.db.transaction(() => {
                    const prePostUpdate = database_1.db.prepare(`
                        UPDATE purchase_invoices
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
                    `).run(userId, `${id}:POSTED`, id, scope.companyId, scope.branchId, Number(doc?.version || 0));
                    if (Number(prePostUpdate.changes || 0) === 0) {
                        const current = database_1.db.prepare(`
                            SELECT status
                            FROM purchase_invoices
                            WHERE id = ?
                              AND COALESCE(company_id, 'COMP_01') = ?
                              AND COALESCE(branch_id, '') = ?
                        `).get(id, scope.companyId, scope.branchId);
                        if (String(current?.status || '') === 'POSTED') {
                            throw Object.assign(new Error('Invoice already posted'), { code: 'ALREADY_POSTED' });
                        }
                        throw Object.assign(new Error('Invoice posting conflict'), {
                            code: PURCHASE_INVOICE_POSTING_POLICY.conflictErrorCode,
                        });
                    }
                    journalPostResult = journalEngineUseCases.postJournal(scope.companyId, scope.branchId, userId, postingCommand);
                    database_1.db.prepare(`
                        UPDATE purchase_invoices
                        SET journal_id = ?
                        WHERE id = ?
                          AND COALESCE(company_id, 'COMP_01') = ?
                          AND COALESCE(branch_id, '') = ?
                    `).run(journalPostResult?.journalId || null, id, scope.companyId, scope.branchId);
                })();
            }
            catch (error) {
                const errorCode = String(error?.code || '');
                if (errorCode === 'ALREADY_POSTED') {
                    const existingJournal = journalEngineUseCases.getBySource(scope.companyId, {
                        sourceType: 'PURCHASE_INVOICE',
                        sourceId: id,
                        sourceVersion,
                    }) ||
                        journalEngineUseCases.getBySource(scope.companyId, {
                            sourceType: 'PURCHASE_INVOICE',
                            sourceId: id,
                        });
                    return {
                        status: 'POSTED',
                        action: PURCHASE_INVOICE_POSTING_POLICY.alreadyPostedAction,
                        journalId: doc?.journal_id || existingJournal?.id || null,
                        journalNo: existingJournal?.journalNo || null,
                    };
                }
                if (errorCode === 'ERR_SOURCE_ALREADY_POSTED') {
                    const existingJournal = journalEngineUseCases.getBySource(scope.companyId, {
                        sourceType: 'PURCHASE_INVOICE',
                        sourceId: id,
                        sourceVersion,
                    }) ||
                        journalEngineUseCases.getBySource(scope.companyId, {
                            sourceType: 'PURCHASE_INVOICE',
                            sourceId: id,
                        });
                    if (existingJournal) {
                        database_1.db.prepare(`
                            UPDATE purchase_invoices
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
                        `).run(userId, `${id}:POSTED`, existingJournal.id, id, scope.companyId, scope.branchId);
                        return {
                            status: 'POSTED',
                            action: PURCHASE_INVOICE_POSTING_POLICY.alreadyPostedAction,
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
            PurchaseInvoiceService._writeAudit(id, userId, 'DRAFT', 'POSTED', 'Post');
            const afterDoc = PurchaseInvoiceService.get(id, scope);
            PurchaseInvoiceService.recordAudit(auditCtx, {
                entityType: 'purchase_invoice',
                entityId: id,
                docType: 'purchase_invoice',
                docId: id,
                eventType: 'document.post',
                summaryI18nKey: 'audit.event.document.post',
                meta: {
                    action: 'post',
                    fromStatus: 'DRAFT',
                    targetStatus: 'POSTED',
                    docNo: afterDoc?.header?.invoice_no || '',
                },
            }, (0, AuditDiffService_1.diffDocumentPayload)(beforeDoc?.header || {}, afterDoc?.header || {}, beforeDoc?.lines || [], afterDoc?.lines || []));
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
            const rule = database_1.db.prepare(`SELECT level FROM approval_rules WHERE doc_type = 'purchase_invoice' ORDER BY min_amount ASC LIMIT 1`).get();
            if (rule && rule.level === 2)
                targetStatus = 'PENDING_APPROVAL_L2';
        }
        catch (e) { /* table may not exist */ }
        database_1.db.prepare(`
            UPDATE purchase_invoices
            SET status = ?, submitted_by = ?, submitted_at = CURRENT_TIMESTAMP, version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND status = 'DRAFT'
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(targetStatus, userId, id, scope.companyId, scope.branchId);
        const current = database_1.db.prepare(`
            SELECT status
            FROM purchase_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (String(current?.status || '') !== targetStatus) {
            if (String(current?.status || '') === 'POSTED') {
                return { status: 'POSTED', action: PURCHASE_INVOICE_POSTING_POLICY.alreadyPostedAction };
            }
            throw Object.assign(new Error('Invoice submit conflict'), { code: PURCHASE_INVOICE_POSTING_POLICY.conflictErrorCode });
        }
        PurchaseInvoiceService._writeAudit(id, userId, 'DRAFT', targetStatus, 'Submit for Approval');
        const afterDoc = PurchaseInvoiceService.get(id, scope);
        PurchaseInvoiceService.recordAudit(auditCtx, {
            entityType: 'purchase_invoice',
            entityId: id,
            docType: 'purchase_invoice',
            docId: id,
            eventType: 'document.update',
            summaryI18nKey: 'audit.event.document.update',
            meta: {
                action: 'submit',
                fromStatus: 'DRAFT',
                targetStatus,
                docNo: afterDoc?.header?.invoice_no || '',
            },
        }, [
            {
                fieldPath: 'header.status',
                oldValue: 'DRAFT',
                newValue: targetStatus,
            },
        ]);
        return { status: targetStatus, action: 'submitted' };
    }
    /** Reopen a REJECTED invoice back to DRAFT */
    static reopenRejected(id, userId = 'admin', scope, auditCtx) {
        const doc = database_1.db.prepare(`
            SELECT status
            FROM purchase_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (doc.status !== 'REJECTED') {
            throw Object.assign(new Error('Only REJECTED invoices can be reopened'), { code: 'INVALID_TRANSITION' });
        }
        database_1.db.prepare(`
            UPDATE purchase_invoices
            SET status = 'DRAFT', rejection_reason = NULL, version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(id, scope.companyId, scope.branchId);
        PurchaseInvoiceService._writeAudit(id, userId, 'REJECTED', 'DRAFT', 'Reopen');
        PurchaseInvoiceService.recordAudit(auditCtx, {
            entityType: 'purchase_invoice',
            entityId: id,
            docType: 'purchase_invoice',
            docId: id,
            eventType: 'document.update',
            summaryI18nKey: 'audit.event.document.update',
            meta: {
                action: 'reopen',
                fromStatus: 'REJECTED',
                targetStatus: 'DRAFT',
            },
        }, [
            {
                fieldPath: 'header.status',
                oldValue: 'REJECTED',
                newValue: 'DRAFT',
            },
        ]);
        return { status: 'DRAFT' };
    }
    static voidInvoice(id, userId = 'admin', scope, auditCtx) {
        const doc = database_1.db.prepare(`
            SELECT status
            FROM purchase_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (doc.status === 'VOID') {
            return { status: 'VOID' };
        }
        if (doc.status !== 'DRAFT' && doc.status !== 'POSTED') {
            throw Object.assign(new Error(`Cannot void from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });
        }
        const beforeStatus = String(doc.status || '');
        const accountingUseCases = PurchaseInvoiceService.getPurchaseInvoiceAccountingUseCases();
        let reversalResult = null;
        database_1.db.transaction(() => {
            database_1.db.prepare(`
                UPDATE purchase_invoices
                SET status = 'VOID',
                    voided_by = ?,
                    voided_at = CURRENT_TIMESTAMP,
                    version = version + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
            `).run(userId, id, scope.companyId, scope.branchId);
            if (beforeStatus === 'POSTED' && accountingUseCases) {
                const header = database_1.db.prepare(`
                    SELECT invoice_no
                    FROM purchase_invoices
                    WHERE id = ?
                      AND COALESCE(company_id, 'COMP_01') = ?
                      AND COALESCE(branch_id, '') = ?
                    LIMIT 1
                `).get(id, scope.companyId, scope.branchId);
                const reverseDate = new Date().toISOString().slice(0, 10);
                reversalResult = accountingUseCases.reverseAccounting(scope.companyId, scope.branchId, userId, {
                    invoiceId: id,
                    reverseDate,
                    reason: `Void purchase invoice ${String(header?.invoice_no || id)}`,
                });
            }
        })();
        PurchaseInvoiceService._writeAudit(id, userId, beforeStatus, 'VOID', 'Void');
        PurchaseInvoiceService.recordAudit(auditCtx, {
            entityType: 'purchase_invoice',
            entityId: id,
            docType: 'purchase_invoice',
            docId: id,
            eventType: 'document.void',
            summaryI18nKey: 'audit.event.document.void',
            meta: {
                action: 'void',
                fromStatus: beforeStatus,
                targetStatus: 'VOID',
            },
        }, [
            {
                fieldPath: 'header.status',
                oldValue: beforeStatus,
                newValue: 'VOID',
            },
        ]);
        return reversalResult
            ? {
                status: 'VOID',
                reversalStatus: reversalResult.status,
                reversalJournalId: reversalResult.reversalJournalId,
                reversalJournalNo: reversalResult.reversalJournalNo,
            }
            : { status: 'VOID' };
    }
    /** Validate the invoice constraints */
    static validate(id, scope) {
        const { header, lines } = PurchaseInvoiceService.get(id, scope);
        const errors = [];
        if (!header.customer_id && !header.supplier_id) {
            errors.push({ field: 'customer_id', message: 'Supplier is required' });
        }
        if (!lines || lines.length === 0) {
            errors.push({ field: 'lines', message: 'At least one line item is required' });
        }
        else {
            const hasValidLine = lines.some(l => String(l.item_code_lookup || l.item_code || l.item_id || '').trim() &&
                Number(l.qty) > 0);
            if (!hasValidLine) {
                errors.push({ field: 'lines', message: 'At least one line must have an item and quantity > 0' });
            }
            lines.forEach((line, index) => {
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
    static _writeAudit(docId, userId, fromStatus, toStatus, action) {
        try {
            database_1.db.prepare(`
                INSERT INTO document_audit(id, document_id, doc_type, action, from_status, to_status, acted_by, acted_at)
    VALUES(?, ?, 'purchase_invoice', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run((0, uuid_1.v4)(), docId, action, fromStatus, toStatus, userId);
        }
        catch (e) {
            // document_audit may not exist yet, skip silently
        }
    }
    /** Register all IPC handlers */
    static register() {
        PurchaseInvoiceService.ensureSchema();
        electron_1.ipcMain.handle('purchaseInvoices:list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.list',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.read],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.read,
        }, async (ctx, _event, params) => {
            return PurchaseInvoiceService.listKeyset(params || {}, PurchaseInvoiceService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('purchaseInvoices:get', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.get',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.read],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.read,
        }, async (ctx, _event, id) => {
            return PurchaseInvoiceService.get(id, PurchaseInvoiceService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('purchaseInvoices:createDraft', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.createDraft',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.create],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.create,
        }, async (ctx, event, userId) => {
            const scope = PurchaseInvoiceService.getScope(ctx);
            const auditCtx = PurchaseInvoiceService.createAuditContext(ctx, event, userId || undefined, ctx?.correlationId);
            return PurchaseInvoiceService.createDraft(userId || String(ctx?.userId || 'admin'), scope, auditCtx);
        })));
        electron_1.ipcMain.handle('purchaseInvoices:save', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.save',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.update],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.update,
        }, async (ctx, event, params) => {
            const scope = PurchaseInvoiceService.getScope(ctx);
            const saveUserId = params?.userId || ctx?.userId || undefined;
            const auditCtx = PurchaseInvoiceService.createAuditContext(ctx, event, saveUserId, params?.correlationId || ctx?.correlationId);
            return PurchaseInvoiceService.save({
                ...(params || {}),
                userId: saveUserId,
            }, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('purchaseInvoices:postOrSubmit', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.postOrSubmit',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.post, PURCHASE_INVOICE_CAPABILITIES.update],
            legacyPermissions: [...PURCHASE_INVOICE_LEGACY.post, ...PURCHASE_INVOICE_LEGACY.update],
            policyGuard: () => true,
        }, async (ctx, event, payload) => {
            const scope = PurchaseInvoiceService.getScope(ctx);
            const id = String(payload?.id || '');
            const userId = String(payload?.userId || ctx?.userId || 'admin');
            const hasPostPermission = hasPostCapability(ctx);
            const auditCtx = PurchaseInvoiceService.createAuditContext(ctx, event, userId, payload?.correlationId || ctx?.correlationId);
            return PurchaseInvoiceService.postOrSubmit(id, userId, hasPostPermission, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('purchaseInvoices:validate', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.validate',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.read],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.read,
        }, async (ctx, _event, id) => {
            return PurchaseInvoiceService.validate(id, PurchaseInvoiceService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('purchaseInvoices:reopenRejected', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.reopenRejected',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.update],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.update,
        }, async (ctx, event, payload) => {
            const scope = PurchaseInvoiceService.getScope(ctx);
            const userId = payload?.userId || ctx?.userId || 'admin';
            const auditCtx = PurchaseInvoiceService.createAuditContext(ctx, event, userId, ctx?.correlationId);
            return PurchaseInvoiceService.reopenRejected(payload?.id, userId, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('purchaseInvoices:void', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.void',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.void],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.void,
        }, async (ctx, event, payload) => {
            const scope = PurchaseInvoiceService.getScope(ctx);
            const userId = payload?.userId || ctx?.userId || 'admin';
            const auditCtx = PurchaseInvoiceService.createAuditContext(ctx, event, userId, ctx?.correlationId);
            return PurchaseInvoiceService.voidInvoice(payload?.id, userId, scope, auditCtx);
        })));
        const searchSuppliers = (search) => {
            const q = `%${String(search || '').trim()}%`;
            return database_1.db.prepare(`
                SELECT id,
                       COALESCE(name_ar, name_en, name, code, '') AS name,
                       COALESCE(phone, mobile, '') AS phone,
                       COALESCE(code, '') AS code
                FROM business_partners
                WHERE (UPPER(COALESCE(type, 'SUPPLIER')) IN ('SUPPLIER', 'VENDOR') OR type IS NULL)
                  AND (COALESCE(name_ar, '') LIKE ? OR COALESCE(name_en, '') LIKE ? OR COALESCE(name, '') LIKE ? OR COALESCE(code, '') LIKE ?)
                ORDER BY COALESCE(name_ar, name_en, name, code)
                LIMIT 50
            `).all(q, q, q, q);
        };
        electron_1.ipcMain.handle('purchaseInvoices:searchSuppliers', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.searchSuppliers',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.read],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.read,
        }, async (_ctx, _event, search) => searchSuppliers(search))));
        // Alias for generic document page lookup key.
        electron_1.ipcMain.handle('purchaseInvoices:searchCustomers', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.searchCustomers',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.read],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.read,
        }, async (_ctx, _event, search) => searchSuppliers(search))));
        electron_1.ipcMain.handle('purchaseInvoices:searchItems', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'purchaseInvoices.searchItems',
            requiredCapabilities: [PURCHASE_INVOICE_CAPABILITIES.read],
            legacyPermissions: PURCHASE_INVOICE_LEGACY.read,
        }, async (_ctx, _event, search) => {
            return ItemService_1.ItemService.searchItemProfiles(search, 50);
        })));
        console.log('[PurchaseInvoiceService] IPC handlers registered');
    }
}
exports.PurchaseInvoiceService = PurchaseInvoiceService;
PurchaseInvoiceService.accountResolutionUseCases = null;
PurchaseInvoiceService.journalEngineUseCases = null;
PurchaseInvoiceService.purchaseInvoiceAccountingUseCases = null;
