"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalVoucherService = void 0;
const electron_1 = require("electron");
const uuid_1 = require("uuid");
const database_1 = require("../database");
const AuditDiffService_1 = require("../../src/main/application/services/AuditDiffService");
const AuditService_1 = require("../../src/main/application/services/AuditService");
const withGuards_1 = require("../../src/main/ipc/withGuards");
const ipcWrap_1 = require("../../src/main/core/ipcWrap");
const JOURNAL_VOUCHER_CAPABILITIES = {
    create: 'accounting.journal_voucher.create',
    read: 'accounting.journal_voucher.read',
    update: 'accounting.journal_voucher.update',
    post: 'accounting.journal_voucher.post',
    void: 'accounting.journal_voucher.void',
};
const JOURNAL_VOUCHER_LEGACY = {
    create: ['accounting.journal.create', 'gl.create', 'accounting.edit'],
    read: ['accounting.journal.read', 'gl.view', 'accounting.view'],
    update: ['accounting.journal.update', 'gl.edit', 'accounting.edit'],
    post: ['accounting.journal.post', 'gl.post', 'JOURNAL_POST', 'ti.gl.journal.post', 'DOC.POST'],
    void: ['accounting.journal.void', 'gl.void', 'DOC.VOID'],
};
function hasPostCapability(ctx) {
    const granted = new Set([
        ...(Array.isArray(ctx?.permissions) ? ctx.permissions : []),
        ...(Array.isArray(ctx?.capabilities) ? ctx.capabilities : []),
    ]);
    return (granted.has('ALL')
        || granted.has('*.*')
        || granted.has(JOURNAL_VOUCHER_CAPABILITIES.post)
        || JOURNAL_VOUCHER_LEGACY.post.some((key) => granted.has(key)));
}
function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function selfHeal() {
    try {
        const cols = database_1.db.prepare('PRAGMA table_info(journal_entries)').all();
        const add = (name, type) => {
            if (!cols.some((col) => col.name === name)) {
                database_1.db.prepare(`ALTER TABLE journal_entries ADD COLUMN ${name} ${type}`).run();
            }
        };
        add('doc_date', 'TEXT');
        add('company_id', "TEXT DEFAULT 'COMP_01'");
        add('branch_id', 'TEXT');
        add('version', 'INTEGER DEFAULT 1');
        add('voucher_type', "TEXT DEFAULT 'JV'");
        add('reference_no', 'TEXT');
        add('notes', 'TEXT');
        add('remarks', 'TEXT');
        add('submitted_by', 'TEXT');
        add('submitted_at', 'DATETIME');
        add('posted_by', 'TEXT');
        add('posted_at', 'DATETIME');
        add('rejected_by', 'TEXT');
        add('rejected_at', 'DATETIME');
        add('rejection_reason', 'TEXT');
        add('voided_by', 'TEXT');
        add('voided_at', 'DATETIME');
        add('posted_once', 'INTEGER DEFAULT 0');
        add('posted_token', 'TEXT');
        add('currency_id', 'TEXT');
        add('exchange_rate', 'REAL DEFAULT 1');
        add('updated_by', 'TEXT');
        add('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
    catch (error) {
        console.error('[JournalVoucherService] selfHeal header failed', error);
    }
    try {
        const lineCols = database_1.db.prepare('PRAGMA table_info(journal_entry_lines)').all();
        const addLine = (name, type) => {
            if (!lineCols.some((col) => col.name === name)) {
                database_1.db.prepare(`ALTER TABLE journal_entry_lines ADD COLUMN ${name} ${type}`).run();
            }
        };
        addLine('line_no', 'INTEGER DEFAULT 0');
        addLine('line_description', 'TEXT');
        addLine('cost_center_id', 'TEXT');
    }
    catch (error) {
        console.error('[JournalVoucherService] selfHeal lines failed', error);
    }
    try {
        database_1.db.exec('CREATE INDEX IF NOT EXISTS idx_jv_scope_status_date ON journal_entries(company_id, branch_id, status, date, id)');
        database_1.db.exec('CREATE INDEX IF NOT EXISTS idx_jv_scope_doc_no ON journal_entries(company_id, branch_id, voucher_no)');
        database_1.db.exec('CREATE INDEX IF NOT EXISTS idx_jv_lines_entry_line ON journal_entry_lines(journal_entry_id, line_no)');
        database_1.db.exec('CREATE INDEX IF NOT EXISTS idx_jv_lines_account ON journal_entry_lines(account_id)');
    }
    catch {
        // ignore existing indexes
    }
}
function nextVoucherNo() {
    database_1.db.prepare("INSERT OR IGNORE INTO doc_sequences(doc_type, next_no) VALUES('journal_voucher', 1)").run();
    const row = database_1.db.prepare("SELECT next_no FROM doc_sequences WHERE doc_type = 'journal_voucher'").get();
    const next = Math.max(row?.next_no || 1, 1);
    database_1.db.prepare("UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = 'journal_voucher'").run();
    return `JV-${String(next).padStart(4, '0')}`;
}
class JournalVoucherService {
    static ensureSchema() {
        selfHeal();
    }
    static getScope(ctx) {
        return {
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
        };
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
            console.warn('[JournalVoucherService] audit record failed:', error);
        }
    }
    static requireEditablePeriod(_docDate) {
        return true;
    }
    static resolveAccountId(marker) {
        const normalized = String(marker || '').trim();
        if (!normalized)
            return '';
        const row = database_1.db.prepare(`
            SELECT id
            FROM accounts
            WHERE id = ? OR code = ?
            LIMIT 1
        `).get(normalized, normalized);
        return String(row?.id || normalized);
    }
    static validatePayload(header, lines) {
        const docDate = String(header?.doc_date || header?.date || '').trim();
        if (!docDate) {
            throw Object.assign(new Error('Date is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.journal_voucher.date_required',
            });
        }
        if (!JournalVoucherService.requireEditablePeriod(docDate)) {
            throw Object.assign(new Error('Period is locked'), {
                code: 'POLICY_VIOLATION',
                messageKey: 'error.policy.period_locked',
            });
        }
        const workingLines = Array.isArray(lines) ? lines : [];
        const validLines = workingLines.filter((line) => {
            const marker = String(line?.account_id || line?.account_code_lookup || '').trim();
            const debit = toNumber(line?.debit, 0);
            const credit = toNumber(line?.credit, 0);
            return marker || debit > 0 || credit > 0;
        });
        if (validLines.length < 2) {
            throw Object.assign(new Error('At least two lines are required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.journal_voucher.lines_required',
            });
        }
        let totalDebit = 0;
        let totalCredit = 0;
        validLines.forEach((line, index) => {
            const marker = String(line?.account_id || line?.account_code_lookup || '').trim();
            const debit = toNumber(line?.debit, 0);
            const credit = toNumber(line?.credit, 0);
            if (!marker) {
                throw Object.assign(new Error(`Line ${index + 1}: account is required`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.journal_voucher.account_required',
                    details: { line: index + 1, field: 'account_id' },
                });
            }
            if (debit < 0 || credit < 0) {
                throw Object.assign(new Error(`Line ${index + 1}: amounts cannot be negative`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.journal_voucher.amount_non_negative',
                    details: { line: index + 1, field: 'debit_credit' },
                });
            }
            if (debit === 0 && credit === 0) {
                throw Object.assign(new Error(`Line ${index + 1}: debit or credit is required`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.journal_voucher.amount_required',
                    details: { line: index + 1, field: 'debit_credit' },
                });
            }
            totalDebit += debit;
            totalCredit += credit;
        });
        if (Math.abs(totalDebit - totalCredit) > 0.0001) {
            throw Object.assign(new Error('Journal voucher is not balanced'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.journal_voucher.unbalanced',
            });
        }
    }
    static listKeyset(params, scope) {
        const limit = params.limit ?? 50;
        const sort = params.sort ?? 'date_desc';
        const where = ['COALESCE(j.company_id, \'COMP_01\') = ?', 'COALESCE(j.branch_id, \'\') = ?'];
        const args = [scope.companyId, scope.branchId];
        if (params.status && params.status !== 'ALL') {
            where.push('j.status = ?');
            args.push(params.status);
        }
        if (params.search) {
            const pct = `%${String(params.search || '').trim()}%`;
            where.push('(j.voucher_no LIKE ? OR COALESCE(j.reference_no, \'\') LIKE ? OR COALESCE(j.description, \'\') LIKE ?)');
            args.push(pct, pct, pct);
        }
        if (params.dateFrom) {
            where.push('date(COALESCE(j.doc_date, j.date)) >= ?');
            args.push(params.dateFrom);
        }
        if (params.dateTo) {
            where.push('date(COALESCE(j.doc_date, j.date)) <= ?');
            args.push(params.dateTo);
        }
        if (params.cursor) {
            if (sort === 'date_desc') {
                where.push('(date(COALESCE(j.doc_date, j.date)) < ? OR (date(COALESCE(j.doc_date, j.date)) = ? AND j.id < ?))');
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            }
            else {
                where.push('(date(COALESCE(j.doc_date, j.date)) > ? OR (date(COALESCE(j.doc_date, j.date)) = ? AND j.id > ?))');
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            }
        }
        const orderDir = sort === 'date_asc' ? 'ASC' : 'DESC';
        const sql = `
            SELECT
                j.id,
                j.voucher_no,
                j.status,
                COALESCE(j.version, 1) AS version,
                date(COALESCE(j.doc_date, j.date)) AS doc_date,
                COALESCE(j.reference_no, '') AS reference_no,
                CAST(COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM journal_entry_lines l WHERE l.journal_entry_id = j.id), 0) AS REAL) AS total_debit,
                CAST(COALESCE((SELECT SUM(COALESCE(l.credit, 0)) FROM journal_entry_lines l WHERE l.journal_entry_id = j.id), 0) AS REAL) AS total_credit
            FROM journal_entries j
            WHERE ${where.join(' AND ')}
            ORDER BY date(COALESCE(j.doc_date, j.date)) ${orderDir}, j.id ${orderDir}
            LIMIT ?
        `;
        const rows = database_1.db.prepare(sql).all(...args, limit + 1);
        const hasMore = rows.length > limit;
        if (hasMore)
            rows.pop();
        const nextCursor = hasMore && rows.length > 0
            ? { date: rows[rows.length - 1].doc_date, id: rows[rows.length - 1].id }
            : null;
        return { rows, next_cursor: nextCursor };
    }
    static get(id, scope) {
        const header = database_1.db.prepare(`
            SELECT
                j.*,
                date(COALESCE(j.doc_date, j.date)) AS doc_date,
                COALESCE(j.reference_no, '') AS reference_no,
                COALESCE(j.description, '') AS description,
                COALESCE(j.notes, '') AS notes,
                COALESCE(j.remarks, '') AS remarks,
                CAST(COALESCE(j.exchange_rate, 1) AS REAL) AS exchange_rate
            FROM journal_entries j
            WHERE j.id = ?
              AND COALESCE(j.company_id, 'COMP_01') = ?
              AND COALESCE(j.branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!header) {
            throw Object.assign(new Error('Journal voucher not found'), { code: 'DOCUMENT_NOT_FOUND' });
        }
        const lines = database_1.db.prepare(`
            SELECT
                l.*,
                COALESCE(l.line_no, 0) AS line_no,
                COALESCE(a.code, '') AS account_code_lookup,
                COALESCE(a.name, '') AS account_name,
                COALESCE(l.line_description, '') AS description,
                CAST(COALESCE(l.debit, 0) AS REAL) AS debit,
                CAST(COALESCE(l.credit, 0) AS REAL) AS credit
            FROM journal_entry_lines l
            LEFT JOIN accounts a ON a.id = l.account_id
            WHERE l.journal_entry_id = ?
            ORDER BY COALESCE(l.line_no, l.rowid)
        `).all(id);
        return { header, lines };
    }
    static createDraft(userId = 'admin', scope, auditCtx) {
        const id = (0, uuid_1.v4)();
        const voucherNo = nextVoucherNo();
        const docDate = new Date().toISOString().slice(0, 10);
        const companyId = String(scope?.companyId || 'COMP_01');
        const branchId = String(scope?.branchId || 'BR_01');
        database_1.db.prepare(`
            INSERT INTO journal_entries (
                id, voucher_no, voucher_type, status, date, doc_date,
                company_id, branch_id, version, currency_id, exchange_rate,
                notes, remarks, created_by, posted_once, updated_at
            ) VALUES (
                ?, ?, 'JV', 'DRAFT', ?, ?,
                ?, ?, 1, 'ILS', 1,
                NULL, NULL, ?, 0, CURRENT_TIMESTAMP
            )
        `).run(id, voucherNo, docDate, docDate, companyId, branchId, userId);
        JournalVoucherService.recordAudit(auditCtx, {
            entityType: 'journal_voucher',
            entityId: id,
            docType: 'journal_voucher',
            docId: id,
            eventType: 'document.create',
            summaryI18nKey: 'audit.event.document.create',
            meta: { action: 'create', docNo: voucherNo, status: 'DRAFT' },
        }, [{ fieldPath: 'header.status', oldValue: null, newValue: 'DRAFT' }]);
        return { id, voucher_no: voucherNo, status: 'DRAFT' };
    }
    static save(params, scope, auditCtx) {
        const { id, header, lines, userId = 'admin' } = params;
        const existing = database_1.db.prepare(`
            SELECT status
            FROM journal_entries
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!existing)
            throw Object.assign(new Error('Journal voucher not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (String(existing.status || '') !== 'DRAFT') {
            throw Object.assign(new Error('Only DRAFT journal vouchers can be edited'), { code: 'INVALID_TRANSITION' });
        }
        JournalVoucherService.validatePayload(header, lines);
        const beforeDoc = JournalVoucherService.get(id, scope);
        const docDate = String(header?.doc_date || header?.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
        const referenceNo = String(header?.reference_no || '').trim() || null;
        const description = String(header?.description || '').trim() || null;
        const notes = String(header?.notes || header?.remarks || '').trim() || null;
        const remarks = String(header?.remarks || header?.notes || '').trim() || null;
        const currencyId = String(header?.currency_id || 'ILS').trim() || 'ILS';
        const exchangeRate = toNumber(header?.exchange_rate, 1) || 1;
        const voucherType = String(header?.voucher_type || 'JV').trim() || 'JV';
        database_1.db.transaction(() => {
            database_1.db.prepare(`
                UPDATE journal_entries
                SET voucher_type = ?,
                    date = ?,
                    doc_date = ?,
                    reference_no = ?,
                    description = ?,
                    notes = ?,
                    remarks = ?,
                    currency_id = ?,
                    exchange_rate = ?,
                    updated_by = ?,
                    version = COALESCE(version, 1) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND status = 'DRAFT'
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
            `).run(voucherType, docDate, docDate, referenceNo, description, notes, remarks, currencyId, exchangeRate, userId, id, scope.companyId, scope.branchId);
            database_1.db.prepare('DELETE FROM journal_entry_lines WHERE journal_entry_id = ?').run(id);
            const insertLine = database_1.db.prepare(`
                INSERT INTO journal_entry_lines(
                    id, journal_entry_id, line_no, account_id, debit, credit, line_description, cost_center_id
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)
            `);
            (Array.isArray(lines) ? lines : []).forEach((line, index) => {
                const marker = String(line?.account_id || line?.account_code_lookup || '').trim();
                if (!marker)
                    return;
                const debit = toNumber(line?.debit, 0);
                const credit = toNumber(line?.credit, 0);
                if (debit === 0 && credit === 0)
                    return;
                const accountId = JournalVoucherService.resolveAccountId(marker);
                insertLine.run((0, uuid_1.v4)(), id, index + 1, accountId, debit, credit, String(line?.line_description || line?.description || '').trim() || null, line?.cost_center_id || null);
            });
        })();
        const afterDoc = JournalVoucherService.get(id, scope);
        JournalVoucherService.recordAudit(auditCtx, {
            entityType: 'journal_voucher',
            entityId: id,
            docType: 'journal_voucher',
            docId: id,
            eventType: 'document.update',
            summaryI18nKey: 'audit.event.document.update',
            meta: {
                action: 'save',
                docNo: afterDoc?.header?.voucher_no || '',
                status: afterDoc?.header?.status || 'DRAFT',
            },
        }, (0, AuditDiffService_1.diffDocumentPayload)(beforeDoc?.header || {}, afterDoc?.header || {}, beforeDoc?.lines || [], afterDoc?.lines || []));
        return afterDoc;
    }
    static postOrSubmit(id, userId = 'admin', hasPostPermission = false, scope, auditCtx) {
        const doc = database_1.db.prepare(`
            SELECT status, posted_once, doc_date, date
            FROM journal_entries
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Journal voucher not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (String(doc.status || '') === 'POSTED') {
            return { status: 'POSTED', action: 'already_posted' };
        }
        if (String(doc.status || '') !== 'DRAFT') {
            throw Object.assign(new Error(`Cannot submit from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });
        }
        const docDate = String(doc.doc_date || doc.date || '').slice(0, 10);
        if (!JournalVoucherService.requireEditablePeriod(docDate)) {
            throw Object.assign(new Error('Period is locked'), {
                code: 'POLICY_VIOLATION',
                messageKey: 'error.policy.period_locked',
            });
        }
        const beforeDoc = JournalVoucherService.get(id, scope);
        if (hasPostPermission) {
            const posted = database_1.db.prepare(`
                UPDATE journal_entries
                SET status = 'POSTED',
                    posted_by = ?,
                    posted_at = CURRENT_TIMESTAMP,
                    posted_once = 1,
                    posted_token = COALESCE(NULLIF(posted_token, ''), ?),
                    version = COALESCE(version, 1) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND status = 'DRAFT'
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
                  AND COALESCE(posted_once, 0) = 0
            `).run(userId, `${id}:POSTED`, id, scope.companyId, scope.branchId);
            if (Number(posted?.changes || 0) === 0) {
                const current = database_1.db.prepare(`
                    SELECT status
                    FROM journal_entries
                    WHERE id = ?
                      AND COALESCE(company_id, 'COMP_01') = ?
                      AND COALESCE(branch_id, '') = ?
                `).get(id, scope.companyId, scope.branchId);
                if (String(current?.status || '') === 'POSTED') {
                    return { status: 'POSTED', action: 'already_posted' };
                }
                throw Object.assign(new Error('Journal voucher posting conflict'), { code: 'CONFLICT' });
            }
            JournalVoucherService._writeAudit(id, userId, 'DRAFT', 'POSTED', 'Post');
            const afterDoc = JournalVoucherService.get(id, scope);
            JournalVoucherService.recordAudit(auditCtx, {
                entityType: 'journal_voucher',
                entityId: id,
                docType: 'journal_voucher',
                docId: id,
                eventType: 'document.post',
                summaryI18nKey: 'audit.event.document.post',
                meta: {
                    action: 'post',
                    fromStatus: 'DRAFT',
                    targetStatus: 'POSTED',
                    docNo: afterDoc?.header?.voucher_no || '',
                },
            }, (0, AuditDiffService_1.diffDocumentPayload)(beforeDoc?.header || {}, afterDoc?.header || {}, beforeDoc?.lines || [], afterDoc?.lines || []));
            return { status: 'POSTED', action: 'posted' };
        }
        let targetStatus = 'PENDING_APPROVAL_L1';
        try {
            const rule = database_1.db.prepare(`
                SELECT level
                FROM approval_rules
                WHERE doc_type = 'journal_voucher'
                ORDER BY min_amount ASC
                LIMIT 1
            `).get();
            if (Number(rule?.level || 1) === 2)
                targetStatus = 'PENDING_APPROVAL_L2';
        }
        catch {
            // approval rules may not exist yet
        }
        database_1.db.prepare(`
            UPDATE journal_entries
            SET status = ?,
                submitted_by = ?,
                submitted_at = CURRENT_TIMESTAMP,
                version = COALESCE(version, 1) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(targetStatus, userId, id, scope.companyId, scope.branchId);
        JournalVoucherService._writeAudit(id, userId, 'DRAFT', targetStatus, 'Submit for Approval');
        JournalVoucherService.recordAudit(auditCtx, {
            entityType: 'journal_voucher',
            entityId: id,
            docType: 'journal_voucher',
            docId: id,
            eventType: 'document.update',
            summaryI18nKey: 'audit.event.document.update',
            meta: { action: 'submit', fromStatus: 'DRAFT', targetStatus },
        }, [{ fieldPath: 'header.status', oldValue: 'DRAFT', newValue: targetStatus }]);
        return { status: targetStatus, action: 'submitted' };
    }
    static reopenRejected(id, userId = 'admin', scope, auditCtx) {
        const doc = database_1.db.prepare(`
            SELECT status
            FROM journal_entries
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Journal voucher not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (String(doc.status || '') !== 'REJECTED') {
            throw Object.assign(new Error('Only REJECTED journal vouchers can be reopened'), { code: 'INVALID_TRANSITION' });
        }
        database_1.db.prepare(`
            UPDATE journal_entries
            SET status = 'DRAFT',
                rejection_reason = NULL,
                version = COALESCE(version, 1) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(id, scope.companyId, scope.branchId);
        JournalVoucherService._writeAudit(id, userId, 'REJECTED', 'DRAFT', 'Reopen');
        JournalVoucherService.recordAudit(auditCtx, {
            entityType: 'journal_voucher',
            entityId: id,
            docType: 'journal_voucher',
            docId: id,
            eventType: 'document.update',
            summaryI18nKey: 'audit.event.document.update',
            meta: { action: 'reopen', fromStatus: 'REJECTED', targetStatus: 'DRAFT' },
        }, [{ fieldPath: 'header.status', oldValue: 'REJECTED', newValue: 'DRAFT' }]);
        return { status: 'DRAFT' };
    }
    static voidVoucher(id, userId = 'admin', scope, auditCtx) {
        const doc = database_1.db.prepare(`
            SELECT status
            FROM journal_entries
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId);
        if (!doc)
            throw Object.assign(new Error('Journal voucher not found'), { code: 'DOCUMENT_NOT_FOUND' });
        const currentStatus = String(doc.status || '');
        if (currentStatus === 'VOID')
            return { status: 'VOID' };
        if (currentStatus !== 'DRAFT' && currentStatus !== 'POSTED') {
            throw Object.assign(new Error(`Cannot void from status: ${currentStatus}`), { code: 'INVALID_TRANSITION' });
        }
        database_1.db.prepare(`
            UPDATE journal_entries
            SET status = 'VOID',
                voided_by = ?,
                voided_at = CURRENT_TIMESTAMP,
                version = COALESCE(version, 1) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(userId, id, scope.companyId, scope.branchId);
        JournalVoucherService._writeAudit(id, userId, currentStatus, 'VOID', 'Void');
        JournalVoucherService.recordAudit(auditCtx, {
            entityType: 'journal_voucher',
            entityId: id,
            docType: 'journal_voucher',
            docId: id,
            eventType: 'document.void',
            summaryI18nKey: 'audit.event.document.void',
            meta: { action: 'void', fromStatus: currentStatus, targetStatus: 'VOID' },
        }, [{ fieldPath: 'header.status', oldValue: currentStatus, newValue: 'VOID' }]);
        return { status: 'VOID' };
    }
    static validate(id, scope) {
        const { header, lines } = JournalVoucherService.get(id, scope);
        const errors = [];
        if (!String(header?.doc_date || header?.date || '').trim()) {
            errors.push({ field: 'doc_date', message: 'Date is required' });
        }
        const list = Array.isArray(lines) ? lines : [];
        if (list.length < 2) {
            errors.push({ field: 'lines', message: 'At least two lines are required' });
        }
        else {
            let totalDebit = 0;
            let totalCredit = 0;
            list.forEach((line, index) => {
                const marker = String(line?.account_id || line?.account_code_lookup || '').trim();
                const debit = toNumber(line?.debit, 0);
                const credit = toNumber(line?.credit, 0);
                if (!marker) {
                    errors.push({ field: `lines[${index}].account_id`, message: 'Account is required' });
                }
                if (debit < 0 || credit < 0) {
                    errors.push({ field: `lines[${index}]`, message: 'Amounts cannot be negative' });
                }
                if (debit === 0 && credit === 0) {
                    errors.push({ field: `lines[${index}]`, message: 'Debit or credit is required' });
                }
                totalDebit += debit;
                totalCredit += credit;
            });
            if (Math.abs(totalDebit - totalCredit) > 0.0001) {
                errors.push({ field: 'lines', message: 'Journal voucher is not balanced' });
            }
        }
        return { errors };
    }
    static _writeAudit(docId, userId, fromStatus, toStatus, action) {
        try {
            database_1.db.prepare(`
                INSERT INTO document_audit(id, document_id, doc_type, action, from_status, to_status, acted_by, acted_at)
                VALUES(?, ?, 'journal_voucher', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run((0, uuid_1.v4)(), docId, action, fromStatus, toStatus, userId);
        }
        catch {
            // document_audit table may not exist on old databases.
        }
    }
    static toLegacyDTO(doc) {
        return {
            header: {
                id: doc?.header?.id,
                companyId: doc?.header?.company_id,
                branchId: doc?.header?.branch_id,
                number: doc?.header?.voucher_no,
                date: doc?.header?.doc_date || doc?.header?.date,
                reference: doc?.header?.reference_no,
                notes: doc?.header?.notes || doc?.header?.remarks,
                status: doc?.header?.status,
                createdAt: doc?.header?.created_at,
                updatedAt: doc?.header?.updated_at,
                postedAt: doc?.header?.posted_at,
            },
            lines: (doc?.lines || []).map((line) => ({
                id: line.id,
                accountId: line.account_id,
                debit: line.debit,
                credit: line.credit,
                memo: line.line_description || line.description || '',
            })),
        };
    }
    static register() {
        JournalVoucherService.ensureSchema();
        electron_1.ipcMain.handle('journalVouchers:list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.list',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.read],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.read,
        }, async (ctx, _event, params) => {
            return JournalVoucherService.listKeyset(params || {}, JournalVoucherService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('journalVouchers:get', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.get',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.read],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.read,
        }, async (ctx, _event, id) => {
            return JournalVoucherService.get(id, JournalVoucherService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('journalVouchers:createDraft', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.createDraft',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.create],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.create,
        }, async (ctx, event, userId) => {
            const scope = JournalVoucherService.getScope(ctx);
            const auditCtx = JournalVoucherService.createAuditContext(ctx, event, userId || undefined, ctx?.correlationId);
            return JournalVoucherService.createDraft(userId || String(ctx?.userId || 'admin'), scope, auditCtx);
        })));
        electron_1.ipcMain.handle('journalVouchers:save', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.save',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.update],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.update,
        }, async (ctx, event, params) => {
            const scope = JournalVoucherService.getScope(ctx);
            const saveUserId = params?.userId || ctx?.userId || undefined;
            const auditCtx = JournalVoucherService.createAuditContext(ctx, event, saveUserId, params?.correlationId || ctx?.correlationId);
            return JournalVoucherService.save({
                ...(params || {}),
                userId: saveUserId,
            }, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('journalVouchers:postOrSubmit', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.postOrSubmit',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.post, JOURNAL_VOUCHER_CAPABILITIES.update],
            legacyPermissions: [...JOURNAL_VOUCHER_LEGACY.post, ...JOURNAL_VOUCHER_LEGACY.update],
            policyGuard: () => true,
        }, async (ctx, event, payload) => {
            const scope = JournalVoucherService.getScope(ctx);
            const id = String(payload?.id || '');
            const userId = String(payload?.userId || ctx?.userId || 'admin');
            const auditCtx = JournalVoucherService.createAuditContext(ctx, event, userId, payload?.correlationId || ctx?.correlationId);
            return JournalVoucherService.postOrSubmit(id, userId, hasPostCapability(ctx), scope, auditCtx);
        })));
        electron_1.ipcMain.handle('journalVouchers:validate', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.validate',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.read],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.read,
        }, async (ctx, _event, id) => {
            return JournalVoucherService.validate(id, JournalVoucherService.getScope(ctx));
        })));
        electron_1.ipcMain.handle('journalVouchers:reopenRejected', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.reopenRejected',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.update],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.update,
        }, async (ctx, event, payload) => {
            const scope = JournalVoucherService.getScope(ctx);
            const userId = String(payload?.userId || ctx?.userId || 'admin');
            const auditCtx = JournalVoucherService.createAuditContext(ctx, event, userId, ctx?.correlationId);
            return JournalVoucherService.reopenRejected(String(payload?.id || ''), userId, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('journalVouchers:void', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.void',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.void],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.void,
        }, async (ctx, event, payload) => {
            const scope = JournalVoucherService.getScope(ctx);
            const userId = String(payload?.userId || ctx?.userId || 'admin');
            const auditCtx = JournalVoucherService.createAuditContext(ctx, event, userId, ctx?.correlationId);
            return JournalVoucherService.voidVoucher(String(payload?.id || ''), userId, scope, auditCtx);
        })));
        electron_1.ipcMain.handle('journalVouchers:searchAccounts', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journalVouchers.searchAccounts',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.read],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.read,
        }, async (_ctx, _event, search) => {
            const q = `%${String(search || '').trim()}%`;
            return database_1.db.prepare(`
                            SELECT
                                id,
                                COALESCE(code, '') AS code,
                                COALESCE(name, code, '') AS name
                            FROM accounts
                            WHERE
                                COALESCE(code, '') LIKE ?
                                OR COALESCE(name, '') LIKE ?
                            ORDER BY COALESCE(code, '')
                            LIMIT 50
                        `).all(q, q);
        })));
        // Legacy aliases for old GL pages.
        electron_1.ipcMain.handle('journals:createDraft', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journals.createDraft',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.create],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.create,
        }, async (ctx, event) => {
            const scope = JournalVoucherService.getScope(ctx);
            const userId = String(ctx?.userId || 'admin');
            const auditCtx = JournalVoucherService.createAuditContext(ctx, event, userId, ctx?.correlationId);
            const created = JournalVoucherService.createDraft(userId, scope, auditCtx);
            const doc = JournalVoucherService.get(created.id, scope);
            return JournalVoucherService.toLegacyDTO(doc);
        })));
        electron_1.ipcMain.handle('journals:save', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journals.save',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.update],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.update,
        }, async (ctx, event, payload) => {
            const scope = JournalVoucherService.getScope(ctx);
            const userId = String(payload?.userId || ctx?.userId || 'admin');
            const auditCtx = JournalVoucherService.createAuditContext(ctx, event, userId, payload?.correlationId || ctx?.correlationId);
            const saved = JournalVoucherService.save({
                id: String(payload?.id || payload?.header?.id || ''),
                header: payload?.header || {},
                lines: Array.isArray(payload?.lines) ? payload.lines : [],
                userId,
            }, scope, auditCtx);
            return JournalVoucherService.toLegacyDTO(saved);
        })));
        electron_1.ipcMain.handle('journals:get', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journals.get',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.read],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.read,
        }, async (ctx, _event, id) => {
            const doc = JournalVoucherService.get(id, JournalVoucherService.getScope(ctx));
            return JournalVoucherService.toLegacyDTO(doc);
        })));
        electron_1.ipcMain.handle('journals:list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journals.list',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.read],
            legacyPermissions: JOURNAL_VOUCHER_LEGACY.read,
        }, async (ctx, _event, cursor) => {
            const scope = JournalVoucherService.getScope(ctx);
            const params = {
                cursor: cursor?.cursor || cursor?.nextCursor || null,
                limit: Number(cursor?.limit || 50),
                search: String(cursor?.search || ''),
                status: String(cursor?.status || 'ALL'),
                dateFrom: cursor?.dateFrom,
                dateTo: cursor?.dateTo,
                sort: String(cursor?.sort || 'date_desc'),
            };
            const result = JournalVoucherService.listKeyset(params, scope);
            return {
                rows: (result.rows || []).map((row) => ({
                    id: row.id,
                    companyId: scope.companyId,
                    branchId: scope.branchId,
                    number: row.voucher_no,
                    date: row.doc_date,
                    reference: row.reference_no,
                    notes: '',
                    status: row.status,
                    createdAt: null,
                    updatedAt: null,
                    postedAt: null,
                })),
                nextCursor: result.next_cursor,
            };
        })));
        electron_1.ipcMain.handle('journals:post', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
            eventName: 'journals.post',
            requiredCapabilities: [JOURNAL_VOUCHER_CAPABILITIES.post, JOURNAL_VOUCHER_CAPABILITIES.update],
            legacyPermissions: [...JOURNAL_VOUCHER_LEGACY.post, ...JOURNAL_VOUCHER_LEGACY.update],
            policyGuard: () => true,
        }, async (ctx, event, id) => {
            const scope = JournalVoucherService.getScope(ctx);
            const userId = String(ctx?.userId || 'admin');
            const auditCtx = JournalVoucherService.createAuditContext(ctx, event, userId, ctx?.correlationId);
            JournalVoucherService.postOrSubmit(String(id || ''), userId, hasPostCapability(ctx), scope, auditCtx);
            const doc = JournalVoucherService.get(String(id || ''), scope);
            return JournalVoucherService.toLegacyDTO(doc);
        })));
        console.log('[JournalVoucherService] IPC handlers registered');
    }
}
exports.JournalVoucherService = JournalVoucherService;
