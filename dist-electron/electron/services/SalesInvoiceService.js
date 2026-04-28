"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoiceService = void 0;
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
};
const SALES_INVOICE_POSTING_POLICY = {
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
        granted.has(SALES_INVOICE_CAPABILITIES.post) ||
        SALES_INVOICE_LEGACY.post.some((key) => granted.has(key)));
}
function selfHeal() {
    try {
        const cols = database_1.db.prepare('PRAGMA table_info(sales_invoices)').all();
        const add = (col, type) => {
            if (!cols.some((c) => c.name === col)) {
                database_1.db.prepare(`ALTER TABLE sales_invoices ADD COLUMN ${col} ${type}`).run();
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
    }
    catch (e) {
        console.error('[SalesInvoice] selfHeal error', e);
    }
    try {
        const lineCols = database_1.db.prepare('PRAGMA table_info(sales_invoice_lines)').all();
        const addL = (col, type) => {
            if (!lineCols.some((c) => c.name === col)) {
                database_1.db.prepare(`ALTER TABLE sales_invoice_lines ADD COLUMN ${col} ${type}`).run();
            }
        };
        addL('line_no', 'INTEGER DEFAULT 0');
        addL('discount', 'REAL DEFAULT 0');
        addL('tax_rate', 'REAL DEFAULT 0');
    }
    catch (e) {
        console.error('[SalesInvoice] selfHeal lines error', e);
    }
    // Keyset indexes
    try {
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_si_status_date_id ON sales_invoices(status, date, id)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_si_customer       ON sales_invoices(customer_id)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_si_invoice_no     ON sales_invoices(invoice_no)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_si_scope_status_date ON sales_invoices(company_id, branch_id, status, date, id)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_si_scope_doc_no      ON sales_invoices(company_id, branch_id, invoice_no)`);
        database_1.db.exec(`CREATE INDEX IF NOT EXISTS idx_si_lines_invoice_no   ON sales_invoice_lines(invoice_id, line_no)`);
    }
    catch (e) { /* ignore if already exists */ }
}
function nextInvoiceNo() {
    database_1.db.prepare(`INSERT OR IGNORE INTO doc_sequences(doc_type, next_no) VALUES('sales_invoice', 1)`).run();
    const sequence = database_1.db.prepare(`SELECT next_no FROM doc_sequences WHERE doc_type = 'sales_invoice'`).get();
    const next = Math.max(sequence ? sequence.next_no : 1, 1);
    database_1.db.prepare(`UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = 'sales_invoice'`).run();
    return `INV-${String(next).padStart(4, '0')}`;
}
/* ─── Service ─── */
class SalesInvoiceService {
    static ensureSchema() {
        selfHeal();
    }
    static configurePostingPipeline(params) {
        this.accountResolutionUseCases = params.accountResolutionUseCases;
        this.journalEngineUseCases = params.journalEngineUseCases;
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
            console.warn('[SalesInvoiceService] audit record failed:', error);
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
            where.push(`(i.invoice_no LIKE ? OR bp.name_ar LIKE ? OR bp.name_en LIKE ?)`);
            const pct = `%${String(params.search || '').trim()}%`;
            args.push(pct, pct, pct);
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
        COALESCE(bp.name_ar, i.customer_name, '') AS customer_name,
        i.customer_id
            FROM sales_invoices i
            LEFT JOIN business_partners bp ON i.customer_id = bp.id
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
            FROM sales_invoice_lines l
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
        SalesInvoiceService.recordAudit(auditCtx, {
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
        }, [
            {
                fieldPath: 'header.status',
                oldValue: null,
                newValue: 'DRAFT',
            },
        ]);
        return { id, invoice_no: no, status: 'DRAFT' };
    }
    /** Save (upsert) header + lines. Requires editable status. */
    static save(params, scope, auditCtx) {
        const { id, header, lines, userId = 'admin' } = params;
        const existing = database_1.db.prepare(`
            SELECT status, version
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!existing)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (!SALES_INVOICE_STATUS_RULES.editable.includes(String(existing.status || ''))) {
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
        database_1.db.transaction(() => {
            // Update header
            const headerUpdate = database_1.db.prepare(`
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
                `).run(header.customer_id ?? null, header.customer_name ?? null, docDate, docDate, dueDate, header.currency_id ?? null, header.warehouse_id ?? null, header.tax_group_id ?? null, header.exchange_rate ?? 1, header.price_list_id ?? null, header.payment_method_id ?? null, header.sales_rep_id ?? null, header.cost_center_id ?? null, header.manual_ref ?? null, subtotal, discountTotal, taxTotal, grandTotal, header.notes ?? null, header.remarks ?? header.notes ?? null, id, Number(existing.version || 0), scope.companyId, scope.branchId);
            if (Number(headerUpdate.changes || 0) === 0) {
                throw Object.assign(new Error('Invoice save conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
            }
            // Replace lines
            database_1.db.prepare('DELETE FROM sales_invoice_lines WHERE invoice_id = ?').run(id);
            const insertLine = database_1.db.prepare(`
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
                insertLine.run((0, uuid_1.v4)(), id, idx + 1, l.item_id || null, l.item_name || l.description || '', qty, price, discPct, taxRate, lineNet, taxAmt, lineTotal);
            });
        })();
        const afterDoc = SalesInvoiceService.get(id, scope);
        const fieldChanges = (0, AuditDiffService_1.diffDocumentPayload)(beforeDoc?.header || {}, afterDoc?.header || {}, beforeDoc?.lines || [], afterDoc?.lines || []);
        SalesInvoiceService.recordAudit(auditCtx, {
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
        }, fieldChanges);
        return afterDoc;
    }
    static getAccountResolutionUseCases() {
        if (!this.accountResolutionUseCases) {
            throw Object.assign(new Error('Account Resolution Engine is not configured for SalesInvoiceService'), {
                code: 'INTERNAL_ERROR',
                messageKey: 'error.account_resolution.not_configured',
            });
        }
        return this.accountResolutionUseCases;
    }
    static getJournalEngineUseCases() {
        if (!this.journalEngineUseCases) {
            throw Object.assign(new Error('Journal Engine is not configured for SalesInvoiceService'), {
                code: 'INTERNAL_ERROR',
                messageKey: 'error.journal_engine.not_configured',
            });
        }
        return this.journalEngineUseCases;
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
    static ensurePartnerPricingColumns() {
        const cols = database_1.db.prepare("PRAGMA table_info('business_partners')").all();
        const names = new Set((cols || []).map((col) => String(col.name)));
        const add = (column, definition) => {
            if (names.has(column))
                return;
            try {
                database_1.db.prepare(`ALTER TABLE business_partners ADD COLUMN ${column} ${definition}`).run();
                names.add(column);
            }
            catch (error) {
                console.warn(`[SalesInvoiceService] Unable to add business_partners.${column}`, error);
            }
        };
        add('price_list_id', 'TEXT');
        add('customer_discount_percent', 'REAL DEFAULT 0');
    }
    static ensurePriceListSchema() {
        database_1.db.exec(`
            CREATE TABLE IF NOT EXISTS price_lists (
                id TEXT PRIMARY KEY,
                name_ar TEXT NOT NULL,
                name_en TEXT,
                currency_id TEXT,
                is_active INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS price_list_items (
                id TEXT PRIMARY KEY,
                price_list_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                unit_id TEXT NOT NULL,
                price REAL NOT NULL DEFAULT 0,
                min_quantity REAL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS item_prices (
                id TEXT PRIMARY KEY,
                price_list_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                unit_id TEXT NOT NULL,
                price REAL DEFAULT 0
            );
        `);
        const insertList = database_1.db.prepare(`
            INSERT OR IGNORE INTO price_lists (id, name_ar, name_en, currency_id, is_active)
            VALUES (@id, @name_ar, @name_en, @currency_id, 1)
        `);
        [
            { id: 'PL_PURCHASE', name_ar: 'سعر الشراء', name_en: 'Purchase Price', currency_id: 'ILS' },
            { id: 'PL_WHOLESALE', name_ar: 'سعر البيع جملة', name_en: 'Wholesale Sale Price', currency_id: 'ILS' },
            { id: 'PL_RETAIL', name_ar: 'سعر البيع مفرق', name_en: 'Retail Sale Price', currency_id: 'ILS' },
        ].forEach((list) => insertList.run(list));
        const itemCols = database_1.db.prepare("PRAGMA table_info('items')").all();
        const itemColNames = new Set((itemCols || []).map((col) => String(col.name)));
        if (!itemColNames.has('wholesale_price')) {
            try {
                database_1.db.prepare(`ALTER TABLE items ADD COLUMN wholesale_price REAL DEFAULT 0`).run();
            }
            catch (error) {
                console.warn('[SalesInvoiceService] Unable to add items.wholesale_price', error);
            }
        }
    }
    static getCustomerPricing(customerId) {
        if (!customerId)
            return { priceListId: null, discountPercent: 0 };
        SalesInvoiceService.ensurePartnerPricingColumns();
        const row = database_1.db.prepare(`
            SELECT price_list_id, customer_discount_percent
            FROM business_partners
            WHERE id = ?
            LIMIT 1
        `).get(customerId);
        return {
            priceListId: SalesInvoiceService.normalizeNullableId(row?.price_list_id),
            discountPercent: SalesInvoiceService.toNumber(row?.customer_discount_percent),
        };
    }
    static inferFallbackItemPrice(item, priceList) {
        const listBucket = [
            priceList?.id,
            priceList?.name_ar,
            priceList?.name_en,
        ].filter(Boolean).join(' ').toLowerCase();
        if (listBucket.includes('purchase') || listBucket.includes('شراء')) {
            return { price: SalesInvoiceService.toNumber(item?.cost_price), source: 'item.cost_price' };
        }
        if (listBucket.includes('wholesale') || listBucket.includes('جملة')) {
            const wholesale = SalesInvoiceService.toNumber(item?.wholesale_price);
            return {
                price: wholesale || SalesInvoiceService.toNumber(item?.sale_price),
                source: wholesale ? 'item.wholesale_price' : 'item.sale_price',
            };
        }
        return { price: SalesInvoiceService.toNumber(item?.sale_price), source: 'item.sale_price' };
    }
    static resolveItemPrice(input) {
        SalesInvoiceService.ensurePriceListSchema();
        const itemId = SalesInvoiceService.normalizeNullableId(input?.itemId || input?.item_id);
        if (!itemId) {
            return { price: 0, price_list_id: null, discount_percent: 0, source: 'missing_item' };
        }
        const item = database_1.db.prepare(`
            SELECT
                id,
                base_unit_id,
                cost_price,
                sale_price,
                wholesale_price,
                tax_rate
            FROM items
            WHERE id = ?
            LIMIT 1
        `).get(itemId);
        if (!item) {
            return { price: 0, price_list_id: null, discount_percent: 0, source: 'item_not_found' };
        }
        const customerId = SalesInvoiceService.normalizeNullableId(input?.customerId || input?.customer_id);
        const customerPricing = SalesInvoiceService.getCustomerPricing(customerId);
        const priceListId = SalesInvoiceService.normalizeNullableId(input?.priceListId || input?.price_list_id) ||
            customerPricing.priceListId;
        const unitId = SalesInvoiceService.normalizeNullableId(input?.unitId || input?.unit_id) || SalesInvoiceService.normalizeNullableId(item?.base_unit_id);
        const qty = Math.max(SalesInvoiceService.toNumber(input?.qty ?? input?.quantity ?? 1), 1);
        let priceList = null;
        if (priceListId) {
            priceList = database_1.db.prepare('SELECT * FROM price_lists WHERE id = ? LIMIT 1').get(priceListId) || null;
            const itemPrice = database_1.db.prepare(`
                SELECT price
                FROM price_list_items
                WHERE price_list_id = ?
                  AND item_id = ?
                  AND (? IS NULL OR unit_id = ?)
                  AND COALESCE(min_quantity, 1) <= ?
                ORDER BY
                  CASE WHEN unit_id = ? THEN 0 ELSE 1 END,
                  COALESCE(min_quantity, 1) DESC
                LIMIT 1
            `).get(priceListId, itemId, unitId, unitId, qty, unitId);
            if (itemPrice) {
                return {
                    price: SalesInvoiceService.toNumber(itemPrice.price),
                    price_list_id: priceListId,
                    discount_percent: customerPricing.discountPercent,
                    source: 'price_list_items',
                    tax_rate: SalesInvoiceService.toNumber(item?.tax_rate),
                };
            }
            const legacyPrice = database_1.db.prepare(`
                SELECT price
                FROM item_prices
                WHERE price_list_id = ?
                  AND item_id = ?
                  AND (? IS NULL OR unit_id = ?)
                ORDER BY CASE WHEN unit_id = ? THEN 0 ELSE 1 END
                LIMIT 1
            `).get(priceListId, itemId, unitId, unitId, unitId);
            if (legacyPrice) {
                return {
                    price: SalesInvoiceService.toNumber(legacyPrice.price),
                    price_list_id: priceListId,
                    discount_percent: customerPricing.discountPercent,
                    source: 'item_prices',
                    tax_rate: SalesInvoiceService.toNumber(item?.tax_rate),
                };
            }
        }
        const fallback = SalesInvoiceService.inferFallbackItemPrice(item, priceList);
        return {
            price: fallback.price,
            price_list_id: priceListId,
            discount_percent: customerPricing.discountPercent,
            source: fallback.source,
            tax_rate: SalesInvoiceService.toNumber(item?.tax_rate),
        };
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
        const postingLines = [];
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
            if (lineTotal === 0 && lineNet === 0 && lineTax === 0)
                continue;
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
                direction: ResolutionDirection_1.ResolutionDirection.SALE,
                requiredRoles: [
                    FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT,
                    ...(lineTax > 0 ? [FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT] : []),
                ],
                optionalRoles: [
                    FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT,
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
            const receivable = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT];
            const revenue = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT] ||
                resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT];
            const vatOutput = lineTax > 0
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT] || null
                : null;
            if (!receivable) {
                throw Object.assign(new Error(`Receivable account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT,
                    },
                });
            }
            if (!revenue) {
                throw Object.assign(new Error(`Revenue account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT,
                    },
                });
            }
            if (lineTax > 0 && !vatOutput) {
                throw Object.assign(new Error(`VAT output account is missing for line ${index + 1}`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        line: index + 1,
                        role: FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT,
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
    static async postOrSubmit(id, userId = 'admin', hasPostPermission = false, scope, auditCtx) {
        const doc = database_1.db.prepare(`
            SELECT status, posted_once, doc_date, date, version, journal_id
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (doc.status === 'POSTED') {
            return { status: 'POSTED', action: SALES_INVOICE_POSTING_POLICY.alreadyPostedAction };
        }
        if (!SALES_INVOICE_STATUS_RULES.postable.includes(String(doc.status || ''))) {
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
            const postingCommand = await SalesInvoiceService.buildPostingCommandForInvoice(id, scope, userId, sourceVersion);
            const journalEngineUseCases = SalesInvoiceService.getJournalEngineUseCases();
            let journalPostResult = null;
            try {
                database_1.db.transaction(() => {
                    const prePostUpdate = database_1.db.prepare(`
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
                    `).run(userId, `${id}:POSTED`, id, scope.companyId, scope.branchId, Number(doc?.version || 0));
                    if (Number(prePostUpdate.changes || 0) === 0) {
                        const current = database_1.db.prepare(`
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
                    journalPostResult = journalEngineUseCases.postJournal(scope.companyId, scope.branchId, userId, postingCommand);
                    database_1.db.prepare(`
                        UPDATE sales_invoices
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
                    const existingJournal = journalEngineUseCases.getBySource(scope.companyId, {
                        sourceType: 'SALES_INVOICE',
                        sourceId: id,
                        sourceVersion,
                    }) ||
                        journalEngineUseCases.getBySource(scope.companyId, {
                            sourceType: 'SALES_INVOICE',
                            sourceId: id,
                        });
                    if (existingJournal) {
                        database_1.db.prepare(`
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
                        `).run(userId, `${id}:POSTED`, existingJournal.id, id, scope.companyId, scope.branchId);
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
            SalesInvoiceService.recordAudit(auditCtx, {
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
            const rule = database_1.db.prepare(`SELECT level FROM approval_rules WHERE doc_type = 'sales_invoice' ORDER BY min_amount ASC LIMIT 1`).get();
            if (rule && rule.level === 2)
                targetStatus = 'PENDING_APPROVAL_L2';
        }
        catch (e) { /* table may not exist */ }
        database_1.db.prepare(`
            UPDATE sales_invoices
            SET status = ?, submitted_by = ?, submitted_at = CURRENT_TIMESTAMP, version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND status = 'DRAFT'
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(targetStatus, userId, id, scope.companyId, scope.branchId);
        const current = database_1.db.prepare(`
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
        SalesInvoiceService.recordAudit(auditCtx, {
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
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (!SALES_INVOICE_STATUS_RULES.reopenable.includes(String(doc.status || ''))) {
            throw Object.assign(new Error('Only REJECTED invoices can be reopened'), { code: 'INVALID_TRANSITION' });
        }
        database_1.db.prepare(`
            UPDATE sales_invoices
            SET status = 'DRAFT', rejection_reason = NULL, version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(id, scope.companyId, scope.branchId);
        SalesInvoiceService._writeAudit(id, userId, 'REJECTED', 'DRAFT', 'Reopen');
        SalesInvoiceService.recordAudit(auditCtx, {
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
            FROM sales_invoices
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (doc.status === 'VOID') {
            return { status: 'VOID' };
        }
        if (!SALES_INVOICE_STATUS_RULES.voidable.includes(String(doc.status || ''))) {
            throw Object.assign(new Error(`Cannot void from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });
        }
        const beforeStatus = String(doc.status || '');
        const voided = database_1.db.prepare(`
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
            const current = database_1.db.prepare(`
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
        SalesInvoiceService.recordAudit(auditCtx, {
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
        }, [
            {
                fieldPath: 'header.status',
                oldValue: beforeStatus,
                newValue: 'VOID',
            },
        ]);
        return { status: 'VOID' };
    }
    /** Validate the invoice constraints */
    static validate(id, scope) {
        const { header, lines } = SalesInvoiceService.get(id, scope);
        const errors = [];
        if (!header.customer_id) {
            errors.push({ field: 'customer_id', message: 'Customer is required' });
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
    VALUES(?, ?, 'sales_invoice', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run((0, uuid_1.v4)(), docId, action, fromStatus, toStatus, userId);
        }
        catch (e) {
            // document_audit may not exist yet, skip silently
        }
    }
    /** Register all IPC handlers */
    static register() {
        SalesInvoiceService.ensureSchema();
        electron_1.ipcMain.handle('salesInvoices:list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.list',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
            legacyPermissions: SALES_INVOICE_LEGACY.read,
        }, async (ctx, _event, params) => {
            return SalesInvoiceService.listKeyset(params || {}, SalesInvoiceService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('salesInvoices:get', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.get',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
            legacyPermissions: SALES_INVOICE_LEGACY.read,
        }, async (ctx, _event, id) => {
            return SalesInvoiceService.get(id, SalesInvoiceService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('salesInvoices:createDraft', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.createDraft',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.create],
            legacyPermissions: SALES_INVOICE_LEGACY.create,
        }, async (ctx, event, userId) => {
            const scope = SalesInvoiceService.getScope(ctx);
            const auditCtx = SalesInvoiceService.createAuditContext(ctx, event, userId || undefined, ctx?.correlationId);
            return SalesInvoiceService.createDraft(userId || String(ctx?.userId || 'admin'), scope, auditCtx);
        })));
        electron_1.ipcMain.handle('salesInvoices:save', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.save',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.update],
            legacyPermissions: SALES_INVOICE_LEGACY.update,
        }, async (ctx, event, params) => {
            const scope = SalesInvoiceService.getScope(ctx);
            const saveUserId = params?.userId || ctx?.userId || undefined;
            const auditCtx = SalesInvoiceService.createAuditContext(ctx, event, saveUserId, params?.correlationId || ctx?.correlationId);
            return SalesInvoiceService.save({
                ...(params || {}),
                userId: saveUserId,
            }, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('salesInvoices:postOrSubmit', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.postOrSubmit',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.post, SALES_INVOICE_CAPABILITIES.update],
            legacyPermissions: [...SALES_INVOICE_LEGACY.post, ...SALES_INVOICE_LEGACY.update],
            policyGuard: () => true,
        }, async (ctx, event, payload) => {
            const scope = SalesInvoiceService.getScope(ctx);
            const id = String(payload?.id || '');
            const userId = String(payload?.userId || ctx?.userId || 'admin');
            const hasPostPermission = hasPostCapability(ctx);
            const auditCtx = SalesInvoiceService.createAuditContext(ctx, event, userId, payload?.correlationId || ctx?.correlationId);
            return SalesInvoiceService.postOrSubmit(id, userId, hasPostPermission, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('salesInvoices:validate', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.validate',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
            legacyPermissions: SALES_INVOICE_LEGACY.read,
        }, async (ctx, _event, id) => {
            return SalesInvoiceService.validate(id, SalesInvoiceService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('salesInvoices:reopenRejected', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.reopenRejected',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.update],
            legacyPermissions: SALES_INVOICE_LEGACY.update,
        }, async (ctx, event, payload) => {
            const scope = SalesInvoiceService.getScope(ctx);
            const userId = payload?.userId || ctx?.userId || 'admin';
            const auditCtx = SalesInvoiceService.createAuditContext(ctx, event, userId, ctx?.correlationId);
            return SalesInvoiceService.reopenRejected(payload?.id, userId, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('salesInvoices:void', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.void',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.void],
            legacyPermissions: SALES_INVOICE_LEGACY.void,
        }, async (ctx, event, payload) => {
            const scope = SalesInvoiceService.getScope(ctx);
            const userId = payload?.userId || ctx?.userId || 'admin';
            const auditCtx = SalesInvoiceService.createAuditContext(ctx, event, userId, ctx?.correlationId);
            return SalesInvoiceService.voidInvoice(payload?.id, userId, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('salesInvoices:searchCustomers', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.searchCustomers',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
            legacyPermissions: SALES_INVOICE_LEGACY.read,
        }, async (_ctx, _event, search) => {
            SalesInvoiceService.ensurePartnerPricingColumns();
            const q = `%${String(search || '').trim()}%`;
            return database_1.db.prepare(`
                            SELECT
                                id,
                                COALESCE(name_ar, name_en, name, code, '') AS name,
                                phone,
                                code,
                                price_list_id,
                                COALESCE(customer_discount_percent, 0) AS customer_discount_percent
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
        })));
        electron_1.ipcMain.handle('salesInvoices:searchItems', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.searchItems',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
            legacyPermissions: SALES_INVOICE_LEGACY.read,
        }, async (_ctx, _event, search, pricingContext) => {
            const contextHeader = pricingContext?.header || pricingContext || {};
            const customerId = contextHeader.customer_id || contextHeader.customerId || pricingContext?.customerId;
            const priceListId = contextHeader.price_list_id || contextHeader.priceListId || pricingContext?.priceListId;
            const rows = ItemService_1.ItemService.searchItemProfiles(search, 50);
            return rows.map((row) => {
                const pricing = SalesInvoiceService.resolveItemPrice({
                    itemId: row.id,
                    unitId: row.base_unit_id,
                    qty: 1,
                    customerId,
                    priceListId,
                });
                return {
                    ...row,
                    price: pricing.price,
                    default_price: pricing.price,
                    price_list_id: pricing.price_list_id,
                    discount_percent: pricing.discount_percent,
                    tax_rate: pricing.tax_rate ?? row.tax_rate,
                    price_source: pricing.source,
                };
            });
        })));
        electron_1.ipcMain.handle('salesInvoices:resolveItemPrice', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'salesInvoices.resolveItemPrice',
            requiredCapabilities: [SALES_INVOICE_CAPABILITIES.read],
            legacyPermissions: SALES_INVOICE_LEGACY.read,
        }, async (_ctx, _event, input) => {
            return SalesInvoiceService.resolveItemPrice(input || {});
        })));
        console.log('[SalesInvoiceService] IPC handlers registered');
    }
}
exports.SalesInvoiceService = SalesInvoiceService;
SalesInvoiceService.accountResolutionUseCases = null;
SalesInvoiceService.journalEngineUseCases = null;
