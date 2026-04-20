"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const electron_1 = require("electron");
const database_1 = require("../database");
const uuid_1 = require("uuid");
const AuthService_1 = require("./AuthService");
class WorkflowService {
    static register() {
        // --- V1 Backwards Compatibility (or unused now) ---
        electron_1.ipcMain.handle('workflow:postDocument', async (_, docType, docId, userId) => {
            return WorkflowService.executeStatusUpdate(docType, docId, userId, 'POSTED', 'DOC.POST');
        });
        electron_1.ipcMain.handle('workflow:submitDocumentForApproval', async (_, docType, docId, userId) => {
            return WorkflowService.executeStatusUpdate(docType, docId, userId, 'PENDING_APPROVAL_L1', 'DOC.SUBMIT_APPROVAL');
        });
        electron_1.ipcMain.handle('workflow:reopenRejected', async (_, docType, docId, userId) => {
            return WorkflowService.executeStatusUpdate(docType, docId, userId, 'DRAFT', 'DOC.REOPEN_REJECTED');
        });
        electron_1.ipcMain.handle('workflow:getPendingApprovals', async () => {
            return database_1.db.prepare('SELECT * FROM view_approval_inbox ORDER BY submitted_at DESC').all();
        });
        // --- Document Readers ---
        electron_1.ipcMain.handle('documents:getHeader', async (_, docType, docId) => {
            return WorkflowService.getDocumentHeader(docType, docId);
        });
        electron_1.ipcMain.handle('documents:getAuditTrail', async (_, docId) => {
            return database_1.db.prepare(`
                SELECT 
                    a.action, 
                    a.acted_by as actor_user_id, 
                    u.full_name as display_name,
                    u.username as username,
                    a.acted_at as at, 
                    a.reason as note,
                    a.from_status,
                    a.to_status,
                    a.metadata_json
                FROM document_audit a
                LEFT JOIN users u ON a.acted_by = u.id
                WHERE a.document_id = ? 
                ORDER BY a.acted_at DESC 
                LIMIT 200
            `).all(docId);
        });
        // --- V4 Advanced Approval Endpoints (Wrapped properly on frontend) ---
        electron_1.ipcMain.handle('approval:listPendingKeyset', async (_, { level, filters, limit = 50, sort = 'submitted_at_desc', cursor }) => {
            try {
                const statusTarget = level === 1 ? 'PENDING_APPROVAL_L1' : 'PENDING_APPROVAL_L2';
                const docs = [];
                const tables = [
                    { type: 'sales_invoice', table: 'sales_invoices', idField: 'invoice_no', joinFields: 'customer_id as partner_id' },
                    { type: 'purchase_order', table: 'purchase_orders', idField: 'order_no', joinFields: 'supplier_id as partner_id' },
                    { type: 'purchase_request', table: 'purchase_requests', idField: 'request_no', joinFields: 'branch_id as partner_id' },
                ];
                let params = [statusTarget];
                let whereClauses = [`status = ?`];
                if (filters) {
                    if (filters.doc_no) {
                        whereClauses.push(`doc_no LIKE ?`);
                        params.push(`%${filters.doc_no}%`);
                    }
                    if (filters.doc_date_from) {
                        whereClauses.push(`date >= ?`);
                        params.push(filters.doc_date_from);
                    }
                    if (filters.doc_date_to) {
                        whereClauses.push(`date <= ?`);
                        params.push(filters.doc_date_to);
                    }
                }
                // Append Keyset Conditions
                // Assuming sorting relies on (created_at DESC, id DESC) primarily, or an analogous approach
                if (cursor) {
                    // For simply 'submitted_at_desc' sorting
                    whereClauses.push(`(created_at < ? OR (created_at = ? AND id < ?))`);
                    params.push(cursor.submitted_at, cursor.submitted_at, cursor.id.split('-')[1]);
                }
                // Fetch SLA Rules to compute overdue dynamically
                const slaRulesArray = database_1.db.prepare('SELECT * FROM approval_sla_rules WHERE enabled = 1').all();
                const slaMap = new Map();
                slaRulesArray.forEach(r => slaMap.set(`${r.doc_type}_${r.level}`, r));
                for (const t of tables) {
                    if (filters?.doc_type && filters.doc_type !== 'ALL' && filters.doc_type !== t.type)
                        continue;
                    let tWhereClauses = [...whereClauses];
                    let tParams = [...params];
                    const tableWhere = tWhereClauses.map(clause => clause.replace('doc_no', t.idField)).join(' AND ');
                    const query = `
                        SELECT 
                            id as doc_id, 
                            '${t.type}' as doc_type, 
                            ${t.idField} as doc_no, 
                            date as doc_date, 
                            status, 
                            created_at as submitted_at,
                            ${t.type === 'purchase_request' ? '0 as total_amount' : 'IFNULL((SELECT SUM(quantity * unit_price) FROM ' + t.table + '_lines WHERE header_id = t.id), 0) as total_amount'}
                        FROM ${t.table} t
                        WHERE ${tableWhere}
                        ORDER BY created_at DESC, id DESC
                        LIMIT ?
                    `;
                    const rows = database_1.db.prepare(query).all(...tParams, limit + 1); // Fetch limit + 1
                    docs.push(...rows);
                }
                const now = new Date().getTime();
                docs.forEach(d => {
                    const sla = slaMap.get(`${d.doc_type}_${level}`);
                    d.pending_level = level;
                    if (sla) {
                        const submitted = new Date(d.submitted_at).getTime();
                        const diffMins = Math.floor((now - submitted) / 1000 / 60);
                        d.overdue_minutes = diffMins - sla.sla_minutes;
                        d.is_overdue = d.overdue_minutes > 0;
                    }
                    else {
                        d.is_overdue = false;
                        d.overdue_minutes = 0;
                    }
                });
                // Sorting cross-tables
                if (sort === 'overdue_desc') {
                    docs.sort((a, b) => b.overdue_minutes - a.overdue_minutes);
                }
                else {
                    // Default logic (fallback if logic isn't exclusively DB keyset yet due to cross table unions)
                    docs.sort((a, b) => {
                        const timeDiff = new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
                        if (timeDiff !== 0)
                            return timeDiff;
                        return String(b.doc_id).localeCompare(String(a.doc_id));
                    });
                }
                const returnDocs = docs.slice(0, limit);
                let next_cursor = undefined;
                if (docs.length > limit) {
                    const lastDoc = returnDocs[returnDocs.length - 1];
                    next_cursor = {
                        submitted_at: lastDoc.submitted_at,
                        id: `${lastDoc.doc_type}-${lastDoc.doc_id}`
                    };
                }
                return { rows: returnDocs, next_cursor };
            }
            catch (e) {
                throw new Error(e.message);
            }
        });
        electron_1.ipcMain.handle('approvalV4:approve', async (_, { docType, docId, level, userId }) => {
            try {
                await WorkflowService.executeApproveV2(docType, docId, level, userId);
                return { success: true };
            }
            catch (e) {
                throw e; // Intercepted by frontend wrapper into AppError
            }
        });
        electron_1.ipcMain.handle('approvalV4:reject', async (_, { docType, docId, level, userId, reason }) => {
            try {
                const currentStatus = level === 1 ? 'PENDING_APPROVAL_L1' : 'PENDING_APPROVAL_L2';
                await WorkflowService.executeStatusUpdate(docType, docId, userId, 'REJECTED', 'DOC.REJECT', reason, currentStatus);
                return { success: true };
            }
            catch (e) {
                throw e;
            }
        });
        // Bulk Actions
        electron_1.ipcMain.handle('approvalV4:bulkApprove', async (_, { level, docIds, userId }) => {
            const results = [];
            for (const item of docIds) {
                try {
                    await WorkflowService.executeApproveV2(item.docType, item.docId, level, userId);
                    results.push({ docId: item.docId, success: true });
                }
                catch (e) {
                    results.push({ docId: item.docId, success: false, error: e.message });
                }
            }
            return results; // It's fine to return array of successes/failures, the bulk wrapper handles it
        });
        electron_1.ipcMain.handle('approvalV4:bulkReject', async (_, { level, docIds, userId, reason }) => {
            const results = [];
            const currentStatus = level === 1 ? 'PENDING_APPROVAL_L1' : 'PENDING_APPROVAL_L2';
            for (const item of docIds) {
                try {
                    await WorkflowService.executeStatusUpdate(item.docType, item.docId, userId, 'REJECTED', 'DOC.REJECT', reason, currentStatus);
                    results.push({ docId: item.docId, success: true });
                }
                catch (e) {
                    results.push({ docId: item.docId, success: false, error: e.message });
                }
            }
            return results;
        });
        // Rules CRUD
        electron_1.ipcMain.handle('approvalV4:rules:list', async (_, docType) => {
            if (docType) {
                return database_1.db.prepare('SELECT * FROM approval_rules WHERE doc_type = ? ORDER BY min_amount ASC').all(docType);
            }
            return database_1.db.prepare('SELECT * FROM approval_rules ORDER BY doc_type, min_amount ASC').all();
        });
        electron_1.ipcMain.handle('approvalV4:rules:upsert', async (_, rule) => {
            if (!rule.id)
                rule.id = (0, uuid_1.v4)();
            const stmt = database_1.db.prepare(`
                INSERT INTO approval_rules(id, doc_type, min_amount, requires_level)
                VALUES(@id, @docType, @minAmount, @requiresLevel)
                ON CONFLICT(id) DO UPDATE SET
                    doc_type = excluded.doc_type,
                min_amount = excluded.min_amount,
                requires_level = excluded.requires_level
            `);
            stmt.run({
                id: rule.id, docType: rule.doc_type,
                minAmount: rule.min_amount, requiresLevel: rule.requires_level
            });
            return { id: rule.id };
        });
        electron_1.ipcMain.handle('approvalV4:rules:delete', async (_, id) => {
            database_1.db.prepare('DELETE FROM approval_rules WHERE id = ?').run(id);
            return {};
        });
        // SLA Rules CRUD & Trigger
        electron_1.ipcMain.handle('approvalV4:slaRules:list', async () => {
            return database_1.db.prepare('SELECT * FROM approval_sla_rules').all();
        });
        electron_1.ipcMain.handle('approvalV4:slaRules:upsert', async (_, rule) => {
            if (!rule.id)
                rule.id = (0, uuid_1.v4)();
            database_1.db.prepare(`
                INSERT INTO approval_sla_rules(id, doc_type, level, sla_minutes, escalate_to_level, enabled)
                VALUES(@id, @docType, @level, @slaMinutes, @escalateTo, @enabled)
                ON CONFLICT(id) DO UPDATE SET
                    doc_type = excluded.doc_type, level = excluded.level,
                    sla_minutes = excluded.sla_minutes, escalate_to_level = excluded.escalate_to_level,
                    enabled = excluded.enabled, updated_at = CURRENT_TIMESTAMP
            `).run({
                id: rule.id, docType: rule.doc_type, level: rule.level,
                slaMinutes: rule.sla_minutes, escalateTo: rule.escalate_to_level || null,
                enabled: rule.enabled ? 1 : 0
            });
            return { id: rule.id };
        });
        electron_1.ipcMain.handle('approvalV4:slaRules:delete', async (_, id) => {
            database_1.db.prepare('DELETE FROM approval_sla_rules WHERE id = ?').run(id);
            return {};
        });
        electron_1.ipcMain.handle('approvalV4:runSlaSweepNow', async () => {
            return WorkflowService.runSlaSweep();
        });
        electron_1.ipcMain.handle('approvalV4:schedulerLogs:list', async (_, limit = 50) => {
            return database_1.db.prepare('SELECT * FROM approval_scheduler_log ORDER BY ran_at DESC LIMIT ?').all(limit);
        });
        // Background SLA Sweep
        setInterval(() => {
            WorkflowService.runSlaSweep().catch(e => console.error('SLA Sweep Error:', e));
        }, 5 * 60 * 1000); // 5 minutes
    }
    static async runSlaSweep() {
        if (WorkflowService.isSlaSweepRunning) {
            console.log('Skipping SLA Sweep: Previous run still executing');
            return;
        }
        WorkflowService.isSlaSweepRunning = true;
        const logId = (0, uuid_1.v4)();
        const startTime = Date.now();
        let scannedCount = 0;
        let escalatedCount = 0;
        let lastError = null;
        try {
            const rules = database_1.db.prepare('SELECT * FROM approval_sla_rules WHERE enabled = 1').all();
            const tables = [
                { type: 'sales_invoice', table: 'sales_invoices' },
                { type: 'purchase_order', table: 'purchase_orders' },
                { type: 'purchase_request', table: 'purchase_requests' }
            ];
            for (const rule of rules) {
                if (!rule.escalate_to_level)
                    continue; // Only process escalating rules
                const tableMap = tables.find(t => t.type === rule.doc_type);
                if (!tableMap)
                    continue;
                const pendingStatus = rule.level === 1 ? 'PENDING_APPROVAL_L1' : 'PENDING_APPROVAL_L2';
                const docs = database_1.db.prepare(`SELECT id, version, created_at FROM ${tableMap.table} WHERE status = ?`).all(pendingStatus);
                const now = new Date().getTime();
                for (const doc of docs) {
                    scannedCount++;
                    const diffMins = Math.floor((now - new Date(doc.created_at).getTime()) / 60000);
                    if (diffMins > rule.sla_minutes) {
                        try {
                            const newStatus = rule.escalate_to_level === 2 ? 'PENDING_APPROVAL_L2' : 'POSTED';
                            database_1.db.transaction(() => {
                                const res = database_1.db.prepare(`UPDATE ${tableMap.table} SET status = ?, version = version + 1 WHERE id = ? AND version = ?`)
                                    .run(newStatus, doc.id, doc.version);
                                if (res.changes === 0)
                                    throw new Error('CONFLICT'); // Optimistic lock failed during sweep, skip over
                                database_1.db.prepare(`
                                    INSERT INTO document_audit
                                    (id, document_type, document_id, action, from_status, to_status, acted_by, reason, acted_at, metadata_json)
                                    VALUES(@id, @docType, @docId, @action, @fromStatus, @toStatus, @userId, @note, CURRENT_TIMESTAMP, @metadata)
                                `).run({
                                    id: (0, uuid_1.v4)(), docType: rule.doc_type, docId: doc.id.toString(),
                                    action: newStatus === 'PENDING_APPROVAL_L2' ? 'AUTO_ESCALATE_TO_L2' : 'AUTO_POSTED',
                                    fromStatus: pendingStatus, toStatus: newStatus,
                                    userId: 'SYSTEM', note: `SLA escalated after ${diffMins} minutes`,
                                    metadata: JSON.stringify({ overdue_minutes: diffMins - rule.sla_minutes })
                                });
                            })();
                            escalatedCount++;
                        }
                        catch (e) {
                            console.warn('SLA escalation skipped due to conflict or error:', e.message);
                        }
                    }
                }
            }
        }
        catch (e) {
            lastError = e.message;
        }
        finally {
            const durationMs = Date.now() - startTime;
            WorkflowService.isSlaSweepRunning = false;
            // Log output to table
            try {
                database_1.db.prepare(`
                    INSERT INTO approval_scheduler_log(id, ran_at, scanned_count, escalated_count, duration_ms, error)
                    VALUES(@id, CURRENT_TIMESTAMP, @scanned, @escalated, @duration, @error)
                `).run({
                    id: logId, scanned: scannedCount, escalated: escalatedCount, duration: durationMs, error: lastError
                });
            }
            catch (logErr) {
                console.error("Failed to insert scheduler log", logErr);
            }
        }
        return { success: true, escalatedCount };
    }
    static getDocumentHeader(docType, docId) {
        const tableName = WorkflowService.getTableName(docType);
        try {
            return database_1.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(docId) || null;
        }
        catch (e) {
            // Re-thrown implicitly by error wrapper
            throw e;
        }
    }
    static getTableName(docType) {
        switch (docType) {
            case 'sales_invoice': return 'sales_invoices';
            case 'purchase_order': return 'purchase_orders';
            case 'purchase_request': return 'purchase_requests';
            default: throw new Error(`Unknown document type: ${docType}`);
        }
    }
    static executeApproveV2(docType, docId, level, userId) {
        const action = level === 1 ? 'DOC.APPROVE_L1' : 'DOC.APPROVE_L2';
        const expectedCurrentStatus = level === 1 ? 'PENDING_APPROVAL_L1' : 'PENDING_APPROVAL_L2';
        const perms = AuthService_1.AuthService.getUserPermissions(userId);
        if (!perms.includes(action)) {
            const err = new Error(`Unauthorized: Missing permission ${action}`);
            err.code = 'PERMISSION_DENIED';
            throw err;
        }
        const transaction = database_1.db.transaction(() => {
            const tableName = WorkflowService.getTableName(docType);
            // Fetch current doc
            const currentDoc = database_1.db.prepare(`SELECT status, version FROM ${tableName} WHERE id = ?`).get(docId);
            if (!currentDoc) {
                const err = new Error(`Document not found: ${docId}`);
                err.code = 'DOCUMENT_NOT_FOUND';
                throw err;
            }
            const currentStatus = currentDoc.status;
            if (currentStatus !== expectedCurrentStatus) {
                const err = new Error(`Document status (${currentStatus}) does not match expected pending level ${level}`);
                err.code = 'INVALID_TRANSITION';
                throw err;
            }
            let newStatus = 'POSTED';
            let ruleMsg = '';
            if (level === 1) {
                let totalAmount = 0;
                if (docType !== 'purchase_request') {
                    const linesTotal = database_1.db.prepare(`SELECT SUM(quantity * unit_price) as sum FROM ${tableName}_lines WHERE header_id = ?`).get(docId);
                    totalAmount = linesTotal?.sum || 0;
                }
                const rules = database_1.db.prepare('SELECT * FROM approval_rules WHERE doc_type = ? ORDER BY min_amount DESC').all(docType);
                let requiredLevel = 1;
                for (const r of rules) {
                    if (totalAmount >= r.min_amount) {
                        requiredLevel = Math.max(requiredLevel, r.requires_level);
                        break;
                    }
                }
                if (requiredLevel === 2) {
                    newStatus = 'PENDING_APPROVAL_L2';
                    ruleMsg = `System escalated to L2 (Amount: ${totalAmount})`;
                }
            }
            // Update document with Optimistic Concurrency
            let updateQuery = `UPDATE ${tableName} SET status = @status, version = version + 1, updated_at = CURRENT_TIMESTAMP`;
            if (newStatus === 'POSTED') {
                updateQuery += `, posted_at = CURRENT_TIMESTAMP, posted_by = @userId`;
            }
            updateQuery += ` WHERE id = @id AND version = @version`;
            const res = database_1.db.prepare(updateQuery).run({ status: newStatus, id: docId, version: currentDoc.version || 1, userId: userId });
            if (res.changes === 0) {
                const err = new Error('CONFLICT: Document was modified by another user. Please refresh and try again.');
                err.code = 'CONFLICT';
                throw err;
            }
            // Audit Trail
            const auditAction = newStatus === 'PENDING_APPROVAL_L2' ? 'ROUTE_TO_L2' : (level === 1 ? 'APPROVE_L1' : 'APPROVE_L2');
            database_1.db.prepare(`
                INSERT INTO document_audit
                (id, document_type, document_id, action, from_status, to_status, acted_by, reason, acted_at)
                VALUES(@id, @docType, @docId, @action, @fromStatus, @toStatus, @userId, @note, CURRENT_TIMESTAMP)
            `).run({
                id: (0, uuid_1.v4)(), docType, docId: docId.toString(),
                action: auditAction,
                fromStatus: currentStatus, toStatus: newStatus,
                userId: userId, note: ruleMsg || null
            });
        });
        transaction();
        return { success: true };
    }
    static executeStatusUpdate(docType, docId, userId, newStatus, action, note, enforceCurrentStatus) {
        const perms = AuthService_1.AuthService.getUserPermissions(userId);
        if (!perms.includes(action)) {
            const err = new Error(`Unauthorized: Missing permission ${action}`);
            err.code = 'PERMISSION_DENIED';
            throw err;
        }
        const transaction = database_1.db.transaction(() => {
            const tableName = WorkflowService.getTableName(docType);
            const currentDoc = database_1.db.prepare(`SELECT status, version FROM ${tableName} WHERE id = ?`).get(docId);
            if (!currentDoc) {
                const err = new Error(`Document not found: ${docId}`);
                err.code = 'DOCUMENT_NOT_FOUND';
                throw err;
            }
            const currentStatus = currentDoc.status || 'DRAFT';
            if (enforceCurrentStatus && currentStatus !== enforceCurrentStatus) {
                const err = new Error(`Expected status ${enforceCurrentStatus} but got ${currentStatus}`);
                err.code = 'INVALID_TRANSITION';
                throw err;
            }
            if (action === 'DOC.POST' && currentStatus === 'POSTED') {
                const err = new Error('Document is already posted');
                err.code = 'INVALID_TRANSITION';
                throw err;
            }
            if (action === 'DOC.SUBMIT_APPROVAL' && currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED') {
                const err = new Error('Can only submit DRAFT or REJECTED documents');
                err.code = 'INVALID_TRANSITION';
                throw err;
            }
            if (action === 'DOC.REOPEN_REJECTED' && currentStatus !== 'REJECTED') {
                const err = new Error('Can only reopen REJECTED documents');
                err.code = 'INVALID_TRANSITION';
                throw err;
            }
            let updateQuery = `UPDATE ${tableName} SET status = @status, version = version + 1, updated_at = CURRENT_TIMESTAMP`;
            if (newStatus === 'POSTED') {
                updateQuery += `, posted_at = CURRENT_TIMESTAMP, posted_by = @userId`;
            }
            updateQuery += ` WHERE id = @id AND version = @version`;
            const res = database_1.db.prepare(updateQuery).run({ status: newStatus, id: docId, version: currentDoc.version || 1, userId });
            if (res.changes === 0) {
                const err = new Error('CONFLICT: Document was modified by another user. Please refresh and try again.');
                err.code = 'CONFLICT';
                throw err;
            }
            let auditAction = action;
            if (action === 'DOC.REJECT') {
                auditAction = currentStatus === 'PENDING_APPROVAL_L1' ? 'REJECT_L1' : 'REJECT_L2';
            }
            else if (action === 'DOC.SUBMIT_APPROVAL') {
                auditAction = 'SUBMIT_APPROVAL';
            }
            else if (action === 'DOC.REOPEN_REJECTED') {
                auditAction = 'REOPEN_REJECTED';
            }
            database_1.db.prepare(`
                INSERT INTO document_audit
                (id, document_type, document_id, action, from_status, to_status, acted_by, reason, acted_at)
                VALUES(@id, @docType, @docId, @action, @fromStatus, @toStatus, @userId, @note, CURRENT_TIMESTAMP)
            `).run({
                id: (0, uuid_1.v4)(), docType, docId: docId.toString(),
                action: auditAction,
                fromStatus: currentStatus, toStatus: newStatus,
                userId, note: note || null
            });
        });
        transaction();
        return { success: true };
    }
}
exports.WorkflowService = WorkflowService;
WorkflowService.isSlaSweepRunning = false;
