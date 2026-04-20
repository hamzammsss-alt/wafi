"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoiceRepo = void 0;
const electron_1 = require("electron");
const database_1 = require("../database");
const uuid_1 = require("uuid");
const ipcWrapper_1 = require("../ipc/ipcWrapper");
const documentTotals_1 = require("../utils/documentTotals");
const documentValidation_1 = require("../utils/documentValidation");
const AuthContext_1 = require("../../src/main/ipc/AuthContext");
const AuditDiffService_1 = require("../../src/main/application/services/AuditDiffService");
const AuditService_1 = require("../../src/main/application/services/AuditService");
const SALES_INVOICE_STATUS_RULES = {
    editable: ['DRAFT', 'REJECTED'],
    postable: ['DRAFT'],
    voidable: ['DRAFT', 'POSTED'],
    reopenable: ['REJECTED'],
};
const SALES_INVOICE_POSTING_POLICY = {
    alreadyPostedAction: 'already_posted',
    conflictErrorCode: 'CONFLICT',
};
const SALES_INVOICE_POST_PERMISSION_KEYS = ['sales.invoice.post', 'DOC.POST'];
const SALES_INVOICE_REOPEN_PERMISSION_KEYS = ['sales.invoice.update', 'DOC.REOPEN_REJECTED'];
function hasAnyPermission(perms, keys) {
    const granted = new Set(Array.isArray(perms) ? perms : []);
    if (granted.has('ALL') || granted.has('*.*'))
        return true;
    return keys.some((key) => granted.has(key));
}
function nextInvoiceNo() {
    const sequence = database_1.db.prepare(`SELECT next_no FROM doc_sequences WHERE doc_type = 'sales_invoice'`).get();
    const next = Math.max(sequence ? sequence.next_no : 1, 1);
    database_1.db.prepare(`UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = 'sales_invoice'`).run();
    return `INV-${String(next).padStart(4, '0')}`;
}
function writeAudit(docId, userId, fromStatus, toStatus, action) {
    try {
        database_1.db.prepare(`
            INSERT INTO document_audit(id, document_id, doc_type, action, from_status, to_status, acted_by, acted_at)
            VALUES(?, ?, 'sales_invoice', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run((0, uuid_1.v4)(), docId, action, fromStatus, toStatus, userId);
    }
    catch (e) {
        // Table might not exist, ignore
    }
}
function createAuditContext(event, userId, correlationId) {
    const ctx = (0, AuthContext_1.getContext)(event);
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
function recordAudit(auditCtx, event, fieldChanges = []) {
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
        console.warn('[SalesInvoiceRepo] audit record failed:', error);
    }
}
class SalesInvoiceRepo {
    static listKeyset(params = {}) {
        const limit = params.limit ?? 50;
        const sort = params.sort ?? 'date_desc';
        let where = ['1=1'];
        const args = [];
        if (params.status && params.status !== 'ALL') {
            where.push('i.status = ?');
            args.push(params.status);
        }
        if (params.search) {
            where.push(`(i.invoice_no LIKE ? OR bp.name_ar LIKE ? OR bp.name_en LIKE ?)`);
            const pct = `%${params.search}%`;
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
        if (params.cursor) {
            if (sort === 'date_desc') {
                where.push(`(COALESCE(i.doc_date, i.date) < ? OR (COALESCE(i.doc_date, i.date) = ? AND i.id < ?))`);
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            }
            else {
                where.push(`(COALESCE(i.doc_date, i.date) > ? OR (COALESCE(i.doc_date, i.date) = ? AND i.id > ?))`);
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            }
        }
        const orderDir = sort === 'date_asc' ? 'ASC' : 'DESC';
        const rows = database_1.db.prepare(`
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
        `).all(...args, limit + 1);
        const hasMore = rows.length > limit;
        if (hasMore)
            rows.pop();
        const next_cursor = hasMore && rows.length > 0
            ? { date: rows[rows.length - 1].doc_date, id: rows[rows.length - 1].id }
            : null;
        return { rows, next_cursor };
    }
    static get(id) {
        const header = database_1.db.prepare(`
            SELECT
                i.*,
                COALESCE(i.doc_date, i.date) AS doc_date,
                COALESCE(bp.name_ar, i.customer_name, '') AS customer_name
            FROM sales_invoices i
            LEFT JOIN business_partners bp ON i.customer_id = bp.id
            WHERE i.id = ?
        `).get(id);
        if (!header)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        const lines = database_1.db.prepare(`
            SELECT
                l.*,
                COALESCE(it.name_ar, l.description, '') AS item_name,
                COALESCE(it.code, '') AS item_code_lookup,
                COALESCE(l.quantity, 0) AS qty,
                COALESCE(l.unit_price, 0) AS price,
                COALESCE(l.discount, 0) AS discount,
                COALESCE(l.tax_rate, 0) AS tax_rate,
                COALESCE(l.net_total, l.total_price, 0) AS line_total
            FROM sales_invoice_lines l
            LEFT JOIN items it ON l.item_id = it.id
            WHERE l.invoice_id = ?
            ORDER BY COALESCE(l.line_no, l.rowid)
        `).all(id);
        return { header, lines };
    }
    static createDraft(userId = 'admin', auditCtx) {
        const id = (0, uuid_1.v4)();
        let no = '';
        const today = new Date().toISOString().split('T')[0];
        database_1.db.transaction(() => {
            no = nextInvoiceNo();
            database_1.db.prepare(`
                INSERT INTO sales_invoices(
                    id, invoice_no, status, version, date, doc_date,
                    subtotal, tax_total, grand_total,
                    created_by, created_at
                ) VALUES(
                    ?, ?, 'DRAFT', 1, ?, ?,
                    0, 0, 0,
                    ?, CURRENT_TIMESTAMP
                )
            `).run(id, no, today, today, userId);
            // Optional: Insert one empty line
            database_1.db.prepare(`
                INSERT INTO sales_invoice_lines(id, invoice_id, line_no)
                VALUES(?, ?, 1)
            `).run((0, uuid_1.v4)(), id);
        })();
        recordAudit(auditCtx, {
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
    static save(params, auditCtx) {
        const { id, header, lines } = params;
        const existing = database_1.db.prepare('SELECT status, version FROM sales_invoices WHERE id = ?').get(id);
        if (!existing)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (!SALES_INVOICE_STATUS_RULES.editable.includes(String(existing.status || ''))) {
            throw Object.assign(new Error('Only editable invoices can be edited'), { code: 'INVALID_TRANSITION' });
        }
        if (header.version && header.version !== existing.version) {
            throw Object.assign(new Error('Document has been modified by another user'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
        }
        const beforeDoc = SalesInvoiceRepo.get(id);
        const computed = (0, documentTotals_1.computeSalesInvoiceTotals)(lines);
        database_1.db.transaction(() => {
            const updated = database_1.db.prepare(`
                UPDATE sales_invoices SET
                    customer_id = ?, customer_name = ?, date = ?, doc_date = ?,
                    currency_id = ?, exchange_rate = ?, subtotal = ?, tax_total = ?, grand_total = ?,
                    version = version + 1, notes = ?
                WHERE id = ? AND status IN ('DRAFT', 'REJECTED') AND version = ?
            `).run(header.customer_id ?? null, header.customer_name ?? null, header.doc_date ?? header.date ?? new Date().toISOString().split('T')[0], header.doc_date ?? header.date ?? new Date().toISOString().split('T')[0], header.currency_id ?? null, header.exchange_rate ?? 1, computed.totals.subtotal, computed.totals.tax_total, computed.totals.grand_total, header.notes ?? null, id, existing.version);
            if (Number(updated.changes || 0) === 0) {
                throw Object.assign(new Error('Invoice save conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
            }
            database_1.db.prepare('DELETE FROM sales_invoice_lines WHERE invoice_id = ?').run(id);
            const insertLine = database_1.db.prepare(`
                INSERT INTO sales_invoice_lines(
                    id, invoice_id, line_no, item_id, description,
                    quantity, unit_price, discount, tax_rate, total_price, tax_amount, net_total
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            computed.lines.forEach((l, idx) => {
                insertLine.run((0, uuid_1.v4)(), id, idx + 1, l.item_id || null, l.item_name || l.description || '', l.qty || 0, l.price || 0, l.discount || 0, l.tax_rate || 0, l.total_price, l.tax_amount, l.net_total);
            });
        })();
        const afterDoc = SalesInvoiceRepo.get(id);
        recordAudit(auditCtx, {
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
        }, (0, AuditDiffService_1.diffDocumentPayload)(beforeDoc?.header || {}, afterDoc?.header || {}, beforeDoc?.lines || [], afterDoc?.lines || []));
        return afterDoc;
    }
    static validate(id) {
        const doc = SalesInvoiceRepo.get(id);
        const errors = (0, documentValidation_1.validateSalesInvoice)(doc.header, doc.lines);
        return { errors };
    }
    static postOrSubmit(params, auditCtx) {
        const { id, userId = 'admin', perms = [] } = params;
        const doc = database_1.db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (String(doc.status || '') === 'POSTED') {
            return { status: 'POSTED', action: SALES_INVOICE_POSTING_POLICY.alreadyPostedAction };
        }
        if (!SALES_INVOICE_STATUS_RULES.postable.includes(String(doc.status || ''))) {
            throw Object.assign(new Error(`Cannot submit from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });
        }
        const valRes = SalesInvoiceRepo.validate(id);
        if (valRes.errors.length > 0) {
            throw Object.assign(new Error('Validation failed'), { code: 'VALIDATION_ERROR', details: valRes.errors });
        }
        const hasPost = hasAnyPermission(perms, SALES_INVOICE_POST_PERMISSION_KEYS);
        const beforeDoc = SalesInvoiceRepo.get(id);
        if (hasPost) {
            const posted = database_1.db.prepare(`
                UPDATE sales_invoices
                SET status = 'POSTED',
                    posted_by = ?,
                    posted_at = CURRENT_TIMESTAMP,
                    posted_once = 1,
                    posted_token = COALESCE(NULLIF(posted_token, ''), ?),
                    version = version + 1
                WHERE id = ?
                  AND status = 'DRAFT'
                  AND COALESCE(posted_once, 0) = 0
            `).run(userId, `${id}:POSTED`, id);
            if (Number(posted.changes || 0) === 0) {
                const current = database_1.db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id);
                if (String(current?.status || '') === 'POSTED') {
                    return { status: 'POSTED', action: SALES_INVOICE_POSTING_POLICY.alreadyPostedAction };
                }
                throw Object.assign(new Error('Invoice posting conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
            }
            writeAudit(id, userId, 'DRAFT', 'POSTED', 'Post');
            const afterDoc = SalesInvoiceRepo.get(id);
            recordAudit(auditCtx, {
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
            return { status: 'POSTED', action: 'posted' };
        }
        else {
            const submitted = database_1.db.prepare(`
                UPDATE sales_invoices
                SET status = 'PENDING_APPROVAL_L1', submitted_by = ?, submitted_at = CURRENT_TIMESTAMP, version = version + 1
                WHERE id = ? AND status = 'DRAFT'
            `).run(userId, id);
            if (Number(submitted.changes || 0) === 0) {
                const current = database_1.db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id);
                if (String(current?.status || '') === 'POSTED') {
                    return { status: 'POSTED', action: SALES_INVOICE_POSTING_POLICY.alreadyPostedAction };
                }
                throw Object.assign(new Error('Invoice submit conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
            }
            writeAudit(id, userId, 'DRAFT', 'PENDING_APPROVAL_L1', 'Submit for Approval');
            recordAudit(auditCtx, {
                entityType: 'sales_invoice',
                entityId: id,
                docType: 'sales_invoice',
                docId: id,
                eventType: 'document.update',
                summaryI18nKey: 'audit.event.document.update',
                meta: {
                    action: 'submit',
                    fromStatus: 'DRAFT',
                    targetStatus: 'PENDING_APPROVAL_L1',
                },
            }, [
                {
                    fieldPath: 'header.status',
                    oldValue: 'DRAFT',
                    newValue: 'PENDING_APPROVAL_L1',
                },
            ]);
            return { status: 'PENDING_APPROVAL_L1', action: 'submitted' };
        }
    }
    static reopenRejected(params, auditCtx) {
        const { id, userId = 'admin', perms = [] } = params;
        if (!hasAnyPermission(perms, SALES_INVOICE_REOPEN_PERMISSION_KEYS)) {
            throw Object.assign(new Error('Permission denied'), { code: 'PERMISSION_DENIED' });
        }
        const doc = database_1.db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (!SALES_INVOICE_STATUS_RULES.reopenable.includes(String(doc.status || ''))) {
            throw Object.assign(new Error('Only REJECTED invoices can be reopened'), { code: 'INVALID_TRANSITION' });
        }
        const reopened = database_1.db.prepare(`
            UPDATE sales_invoices
            SET status = 'DRAFT', rejection_reason = NULL, version = version + 1
            WHERE id = ? AND status = 'REJECTED'
        `).run(id);
        if (Number(reopened.changes || 0) === 0) {
            throw Object.assign(new Error('Invoice reopen conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
        }
        writeAudit(id, userId, 'REJECTED', 'DRAFT', 'Reopen');
        recordAudit(auditCtx, {
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
    static voidInvoice(params, auditCtx) {
        const { id, userId = 'admin' } = params;
        const doc = database_1.db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id);
        if (!doc)
            throw Object.assign(new Error('Invoice not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (doc.status === 'VOID')
            return { status: 'VOID' };
        if (!SALES_INVOICE_STATUS_RULES.voidable.includes(String(doc.status || ''))) {
            throw Object.assign(new Error(`Cannot void from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });
        }
        const beforeStatus = String(doc.status || '');
        const voided = database_1.db.prepare(`
            UPDATE sales_invoices
            SET status = 'VOID',
                voided_by = ?,
                voided_at = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE id = ? AND status = ?
        `).run(userId, id, beforeStatus);
        if (Number(voided.changes || 0) === 0) {
            const current = database_1.db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id);
            if (String(current?.status || '') === 'VOID') {
                return { status: 'VOID' };
            }
            throw Object.assign(new Error('Invoice void conflict'), { code: SALES_INVOICE_POSTING_POLICY.conflictErrorCode });
        }
        writeAudit(id, userId, beforeStatus, 'VOID', 'Void');
        recordAudit(auditCtx, {
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
    static registerHandlers() {
        electron_1.ipcMain.handle('salesInvoices:listKeyset', (0, ipcWrapper_1.ipcWrap)((_, params) => SalesInvoiceRepo.listKeyset(params)));
        electron_1.ipcMain.handle('salesInvoices:get', (0, ipcWrapper_1.ipcWrap)((_, id) => SalesInvoiceRepo.get(id)));
        electron_1.ipcMain.handle('salesInvoices:createDraft', (0, ipcWrapper_1.ipcWrap)((event, userId) => {
            const auditCtx = createAuditContext(event, userId || undefined);
            return SalesInvoiceRepo.createDraft(userId, auditCtx);
        }));
        electron_1.ipcMain.handle('salesInvoices:save', (0, ipcWrapper_1.ipcWrap)((event, params) => {
            const auditCtx = createAuditContext(event, params?.userId || undefined, params?.correlationId);
            return SalesInvoiceRepo.save(params, auditCtx);
        }));
        electron_1.ipcMain.handle('salesInvoices:validate', (0, ipcWrapper_1.ipcWrap)((_, id) => SalesInvoiceRepo.validate(id)));
        electron_1.ipcMain.handle('salesInvoices:postOrSubmit', (0, ipcWrapper_1.ipcWrap)((event, params) => {
            const auditCtx = createAuditContext(event, params?.userId || undefined, params?.correlationId);
            return SalesInvoiceRepo.postOrSubmit(params, auditCtx);
        }));
        electron_1.ipcMain.handle('salesInvoices:reopenRejected', (0, ipcWrapper_1.ipcWrap)((event, params) => {
            const auditCtx = createAuditContext(event, params?.userId || undefined);
            return SalesInvoiceRepo.reopenRejected(params, auditCtx);
        }));
        electron_1.ipcMain.handle('salesInvoices:void', (0, ipcWrapper_1.ipcWrap)((event, params) => {
            const auditCtx = createAuditContext(event, params?.userId || undefined);
            return SalesInvoiceRepo.voidInvoice(params, auditCtx);
        }));
    }
}
exports.SalesInvoiceRepo = SalesInvoiceRepo;
