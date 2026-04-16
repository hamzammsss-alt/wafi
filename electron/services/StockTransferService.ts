import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { diffDocumentPayload } from '../../src/main/application/services/AuditDiffService';
import { getGlobalAuditService } from '../../src/main/application/services/AuditService';
import { AuditContext, AuditFieldChangeInput } from '../../src/main/domain/audit/AuditTypes';
import { withGuards } from '../../src/main/ipc/withGuards';
import { ipcWrap } from '../../src/main/core/ipcWrap';
import { ItemService } from './ItemService';

type TenantScope = {
    companyId: string;
    branchId: string;
};

const STOCK_TRANSFER_CAPABILITIES = {
    create: 'inventory.stock_transfer.create',
    read: 'inventory.stock_transfer.read',
    update: 'inventory.stock_transfer.update',
    post: 'inventory.stock_transfer.post',
    void: 'inventory.stock_transfer.void',
};

const STOCK_TRANSFER_LEGACY = {
    create: ['inventory.transfer.create', 'inventory.transfer', 'inventory.edit'],
    read: ['inventory.transfer.read', 'inventory.transfer.view', 'inventory.view'],
    update: ['inventory.transfer.update', 'inventory.transfer.edit', 'inventory.edit'],
    post: ['inventory.transfer.post', 'inventory.post', 'DOC.POST'],
    void: ['inventory.transfer.void', 'inventory.void', 'DOC.VOID'],
};

function hasPostCapability(ctx: any): boolean {
    const granted = new Set<string>([
        ...(Array.isArray(ctx?.permissions) ? ctx.permissions : []),
        ...(Array.isArray(ctx?.capabilities) ? ctx.capabilities : []),
    ]);
    return (
        granted.has('ALL')
        || granted.has('*.*')
        || granted.has(STOCK_TRANSFER_CAPABILITIES.post)
        || STOCK_TRANSFER_LEGACY.post.some((key) => granted.has(key))
    );
}

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function selfHeal() {
    try {
        const cols: any[] = db.prepare('PRAGMA table_info(stock_transfers)').all();
        const add = (name: string, type: string) => {
            if (!cols.some((col: any) => col.name === name)) {
                db.prepare(`ALTER TABLE stock_transfers ADD COLUMN ${name} ${type}`).run();
            }
        };
        add('doc_date', 'TEXT');
        add('company_id', "TEXT DEFAULT 'COMP_01'");
        add('branch_id', 'TEXT');
        add('version', 'INTEGER DEFAULT 1');
        add('request_type', "TEXT DEFAULT 'TRANSFER'");
        add('remarks', 'TEXT');
        add('submitted_by', 'TEXT');
        add('submitted_at', 'DATETIME');
        add('rejected_by', 'TEXT');
        add('rejected_at', 'DATETIME');
        add('rejection_reason', 'TEXT');
        add('posted_by', 'TEXT');
        add('posted_at', 'DATETIME');
        add('voided_by', 'TEXT');
        add('voided_at', 'DATETIME');
        add('posted_once', 'INTEGER DEFAULT 0');
        add('posted_token', 'TEXT');
        add('updated_by', 'TEXT');
        add('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    } catch (error) {
        console.error('[StockTransferService] selfHeal header failed', error);
    }

    try {
        const lineCols: any[] = db.prepare('PRAGMA table_info(stock_transfer_items)').all();
        const addLine = (name: string, type: string) => {
            if (!lineCols.some((col: any) => col.name === name)) {
                db.prepare(`ALTER TABLE stock_transfer_items ADD COLUMN ${name} ${type}`).run();
            }
        };
        addLine('line_no', 'INTEGER DEFAULT 0');
        addLine('received_quantity', 'REAL DEFAULT 0');
        addLine('unit_id', 'TEXT');
    } catch (error) {
        console.error('[StockTransferService] selfHeal lines failed', error);
    }

    try {
        db.exec('CREATE INDEX IF NOT EXISTS idx_st_scope_status_date ON stock_transfers(company_id, branch_id, status, date, id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_st_scope_doc_no ON stock_transfers(company_id, branch_id, code)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_st_lines_transfer_line ON stock_transfer_items(transfer_id, line_no)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_st_lines_item ON stock_transfer_items(item_id)');
    } catch {
        // ignore
    }
}

function nextTransferNo(): string {
    db.prepare(`INSERT OR IGNORE INTO doc_sequences(doc_type, next_no) VALUES('stock_transfer', 1)`).run();
    const row = db.prepare(`SELECT next_no FROM doc_sequences WHERE doc_type = 'stock_transfer'`).get() as { next_no: number } | undefined;
    const next = Math.max(row?.next_no || 1, 1);
    db.prepare(`UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = 'stock_transfer'`).run();
    return `STF-${String(next).padStart(4, '0')}`;
}

export class StockTransferService {
    static ensureSchema() {
        selfHeal();
    }

    private static getScope(ctx: any): TenantScope {
        return {
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
        };
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
            console.warn('[StockTransferService] audit record failed:', error);
        }
    }

    private static requireEditablePeriod(_docDate: string): boolean {
        return true;
    }

    private static validatePayload(header: Record<string, any>, lines: any[]) {
        if (!String(header?.from_warehouse_id || '').trim()) {
            throw Object.assign(new Error('Source warehouse is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.stock_transfer.from_warehouse_required',
            });
        }
        if (!String(header?.to_warehouse_id || '').trim()) {
            throw Object.assign(new Error('Target warehouse is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.stock_transfer.to_warehouse_required',
            });
        }
        if (String(header?.from_warehouse_id || '').trim() === String(header?.to_warehouse_id || '').trim()) {
            throw Object.assign(new Error('Source and target warehouse must differ'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.stock_transfer.warehouse_mismatch',
            });
        }
        const docDate = String(header?.doc_date || header?.date || '').trim();
        if (!docDate) {
            throw Object.assign(new Error('Date is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.stock_transfer.date_required',
            });
        }
        if (!StockTransferService.requireEditablePeriod(docDate)) {
            throw Object.assign(new Error('Period is locked'), {
                code: 'POLICY_VIOLATION',
                messageKey: 'error.policy.period_locked',
            });
        }
        const workingLines = Array.isArray(lines) ? lines : [];
        const validLines = workingLines.filter((line) => {
            const marker = String(line?.item_id || line?.item_code_lookup || '').trim();
            const qty = toNumber(line?.qty ?? line?.quantity, 0);
            return marker || qty > 0;
        });
        if (validLines.length === 0) {
            throw Object.assign(new Error('At least one line is required'), {
                code: 'VALIDATION_ERROR',
                messageKey: 'validation.stock_transfer.lines_required',
            });
        }
        validLines.forEach((line, index) => {
            const itemMarker = String(line?.item_id || line?.item_code_lookup || '').trim();
            const qty = toNumber(line?.qty ?? line?.quantity, 0);
            if (!itemMarker) {
                throw Object.assign(new Error(`Line ${index + 1}: item is required`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.stock_transfer.line_item_required',
                    details: { line: index + 1, field: 'item_id' },
                });
            }
            if (qty <= 0) {
                throw Object.assign(new Error(`Line ${index + 1}: quantity must be greater than zero`), {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'validation.stock_transfer.qty_positive',
                    details: { line: index + 1, field: 'qty' },
                });
            }
        });
    }

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
        const where = ['COALESCE(t.company_id, \'COMP_01\') = ?', 'COALESCE(t.branch_id, \'\') = ?'];
        const args: any[] = [scope.companyId, scope.branchId];

        if (params.status && params.status !== 'ALL') {
            where.push('t.status = ?');
            args.push(params.status);
        }
        if (params.search) {
            const pct = `%${String(params.search || '').trim()}%`;
            where.push('(t.code LIKE ? OR COALESCE(t.notes, \'\') LIKE ? OR COALESCE(fw.name_ar, fw.name_en, fw.name, \'\') LIKE ? OR COALESCE(tw.name_ar, tw.name_en, tw.name, \'\') LIKE ?)');
            args.push(pct, pct, pct, pct);
        }
        if (params.dateFrom) {
            where.push('date(COALESCE(t.doc_date, t.date)) >= ?');
            args.push(params.dateFrom);
        }
        if (params.dateTo) {
            where.push('date(COALESCE(t.doc_date, t.date)) <= ?');
            args.push(params.dateTo);
        }
        if (params.cursor) {
            if (sort === 'date_desc') {
                where.push('(date(COALESCE(t.doc_date, t.date)) < ? OR (date(COALESCE(t.doc_date, t.date)) = ? AND t.id < ?))');
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            } else {
                where.push('(date(COALESCE(t.doc_date, t.date)) > ? OR (date(COALESCE(t.doc_date, t.date)) = ? AND t.id > ?))');
                args.push(params.cursor.date, params.cursor.date, params.cursor.id);
            }
        }

        const orderDir = sort === 'date_asc' ? 'ASC' : 'DESC';
        const sql = `
            SELECT
                t.id,
                t.code,
                t.status,
                COALESCE(t.version, 1) AS version,
                date(COALESCE(t.doc_date, t.date)) AS doc_date,
                COALESCE(fw.name_ar, fw.name_en, fw.name, fw.code, t.from_warehouse_id, '') AS from_warehouse_name,
                COALESCE(tw.name_ar, tw.name_en, tw.name, tw.code, t.to_warehouse_id, '') AS to_warehouse_name,
                CAST(COALESCE((SELECT SUM(COALESCE(sti.quantity, 0)) FROM stock_transfer_items sti WHERE sti.transfer_id = t.id), 0) AS REAL) AS total_qty
            FROM stock_transfers t
            LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
            LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
            WHERE ${where.join(' AND ')}
            ORDER BY date(COALESCE(t.doc_date, t.date)) ${orderDir}, t.id ${orderDir}
            LIMIT ?
        `;
        const rows = db.prepare(sql).all(...args, limit + 1);
        const hasMore = rows.length > limit;
        if (hasMore) rows.pop();
        const nextCursor = hasMore && rows.length > 0
            ? { date: rows[rows.length - 1].doc_date, id: rows[rows.length - 1].id }
            : null;
        return { rows, next_cursor: nextCursor };
    }

    static get(id: string, scope: TenantScope) {
        const header = db.prepare(`
            SELECT
                t.*,
                date(COALESCE(t.doc_date, t.date)) AS doc_date,
                COALESCE(fw.name_ar, fw.name_en, fw.name, fw.code, t.from_warehouse_id, '') AS from_warehouse_name,
                COALESCE(tw.name_ar, tw.name_en, tw.name, tw.code, t.to_warehouse_id, '') AS to_warehouse_name
            FROM stock_transfers t
            LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
            LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
            WHERE t.id = ?
              AND COALESCE(t.company_id, 'COMP_01') = ?
              AND COALESCE(t.branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId) as any;
        if (!header) throw Object.assign(new Error('Stock transfer not found'), { code: 'DOCUMENT_NOT_FOUND' });

        const lines = db.prepare(`
            SELECT
                l.*,
                COALESCE(l.line_no, 0) AS line_no,
                COALESCE(i.code, '') AS item_code_lookup,
                COALESCE(i.name_ar, i.name_en, i.name, l.item_id, '') AS item_name,
                CAST(COALESCE(l.quantity, 0) AS REAL) AS qty,
                CAST(COALESCE(l.received_quantity, 0) AS REAL) AS received_quantity
            FROM stock_transfer_items l
            LEFT JOIN items i ON i.id = l.item_id
            WHERE l.transfer_id = ?
            ORDER BY COALESCE(l.line_no, l.rowid)
        `).all(id);
        return { header, lines };
    }

    static createDraft(userId = 'admin', scope?: TenantScope, auditCtx?: AuditContext | null) {
        const id = uuidv4();
        const code = nextTransferNo();
        const docDate = new Date().toISOString().slice(0, 10);
        const companyId = String(scope?.companyId || 'COMP_01');
        const branchId = String(scope?.branchId || 'BR_01');

        db.prepare(`
            INSERT INTO stock_transfers (
                id, code, status, date, doc_date, company_id, branch_id, version,
                request_type, notes, remarks, created_by, posted_once, updated_at
            ) VALUES (
                ?, ?, 'DRAFT', ?, ?, ?, ?, 1,
                'TRANSFER', NULL, NULL, ?, 0, CURRENT_TIMESTAMP
            )
        `).run(id, code, docDate, docDate, companyId, branchId, userId);

        StockTransferService.recordAudit(
            auditCtx,
            {
                entityType: 'stock_transfer',
                entityId: id,
                docType: 'stock_transfer',
                docId: id,
                eventType: 'document.create',
                summaryI18nKey: 'audit.event.document.create',
                meta: { action: 'create', docNo: code, status: 'DRAFT' },
            },
            [{ fieldPath: 'header.status', oldValue: null, newValue: 'DRAFT' }],
        );
        return { id, code, status: 'DRAFT' };
    }

    static save(params: {
        id: string;
        header: Record<string, any>;
        lines: any[];
        userId?: string;
    }, scope: TenantScope, auditCtx?: AuditContext | null) {
        const { id, header, lines, userId = 'admin' } = params;

        const existing = db.prepare(`
            SELECT status
            FROM stock_transfers
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId) as any;

        if (!existing) throw Object.assign(new Error('Stock transfer not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (String(existing.status || '') !== 'DRAFT') {
            throw Object.assign(new Error('Only DRAFT stock transfers can be edited'), { code: 'INVALID_TRANSITION' });
        }

        StockTransferService.validatePayload(header, lines);
        const beforeDoc = StockTransferService.get(id, scope);

        const docDate = String(header?.doc_date || header?.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
        const fromWarehouseId = String(header?.from_warehouse_id || '').trim();
        const toWarehouseId = String(header?.to_warehouse_id || '').trim();
        const requestType = String(header?.request_type || 'TRANSFER').trim().toUpperCase() || 'TRANSFER';
        const notes = String(header?.notes || header?.remarks || '').trim() || null;
        const remarks = String(header?.remarks || header?.notes || '').trim() || null;

        db.transaction(() => {
            db.prepare(`
                UPDATE stock_transfers SET
                    from_warehouse_id = ?,
                    to_warehouse_id = ?,
                    date = ?,
                    doc_date = ?,
                    request_type = ?,
                    notes = ?,
                    remarks = ?,
                    updated_by = ?,
                    version = COALESCE(version, 1) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND status = 'DRAFT'
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
            `).run(
                fromWarehouseId,
                toWarehouseId,
                docDate,
                docDate,
                requestType,
                notes,
                remarks,
                userId,
                id,
                scope.companyId,
                scope.branchId,
            );

            db.prepare('DELETE FROM stock_transfer_items WHERE transfer_id = ?').run(id);
            const insertLine = db.prepare(`
                INSERT INTO stock_transfer_items(
                    id, transfer_id, line_no, item_id, unit_id, quantity, received_quantity
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            (Array.isArray(lines) ? lines : []).forEach((line, index) => {
                const marker = String(line?.item_id || line?.item_code_lookup || '').trim();
                if (!marker) return;
                const qty = toNumber(line?.qty ?? line?.quantity, 0);
                if (qty <= 0) return;

                let itemId = String(line?.item_id || '').trim();
                if (!itemId && marker) {
                    const match = db.prepare(`
                        SELECT id
                        FROM items
                        WHERE id = ? OR code = ?
                        LIMIT 1
                    `).get(marker, marker) as any;
                    itemId = String(match?.id || marker);
                }

                const receivedQty = toNumber(line?.received_quantity, 0);
                insertLine.run(
                    uuidv4(),
                    id,
                    index + 1,
                    itemId || marker,
                    line?.unit_id || null,
                    qty,
                    receivedQty,
                );
            });
        })();

        const afterDoc = StockTransferService.get(id, scope);
        StockTransferService.recordAudit(
            auditCtx,
            {
                entityType: 'stock_transfer',
                entityId: id,
                docType: 'stock_transfer',
                docId: id,
                eventType: 'document.update',
                summaryI18nKey: 'audit.event.document.update',
                meta: {
                    action: 'save',
                    docNo: afterDoc?.header?.code || '',
                    status: afterDoc?.header?.status || 'DRAFT',
                },
            },
            diffDocumentPayload(
                beforeDoc?.header || {},
                afterDoc?.header || {},
                beforeDoc?.lines || [],
                afterDoc?.lines || [],
            ),
        );

        return afterDoc;
    }

    static postOrSubmit(
        id: string,
        userId = 'admin',
        hasPostPermission = false,
        scope: TenantScope,
        auditCtx?: AuditContext | null,
    ) {
        const doc = db.prepare(`
            SELECT status, posted_once, doc_date, date
            FROM stock_transfers
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId) as any;

        if (!doc) throw Object.assign(new Error('Stock transfer not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (String(doc.status || '') === 'POSTED') {
            return { status: 'POSTED', action: 'already_posted' };
        }
        if (String(doc.status || '') !== 'DRAFT') {
            throw Object.assign(new Error(`Cannot submit from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });
        }

        const docDate = String(doc.doc_date || doc.date || '').slice(0, 10);
        if (!StockTransferService.requireEditablePeriod(docDate)) {
            throw Object.assign(new Error('Period is locked'), {
                code: 'POLICY_VIOLATION',
                messageKey: 'error.policy.period_locked',
            });
        }

        const beforeDoc = StockTransferService.get(id, scope);
        if (hasPostPermission) {
            const posted = db.prepare(`
                UPDATE stock_transfers
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
                const current = db.prepare(`
                    SELECT status
                    FROM stock_transfers
                    WHERE id = ?
                      AND COALESCE(company_id, 'COMP_01') = ?
                      AND COALESCE(branch_id, '') = ?
                `).get(id, scope.companyId, scope.branchId) as any;
                if (String(current?.status || '') === 'POSTED') {
                    return { status: 'POSTED', action: 'already_posted' };
                }
                throw Object.assign(new Error('Stock transfer posting conflict'), { code: 'CONFLICT' });
            }

            StockTransferService._writeAudit(id, userId, 'DRAFT', 'POSTED', 'Post');
            const afterDoc = StockTransferService.get(id, scope);
            StockTransferService.recordAudit(
                auditCtx,
                {
                    entityType: 'stock_transfer',
                    entityId: id,
                    docType: 'stock_transfer',
                    docId: id,
                    eventType: 'document.post',
                    summaryI18nKey: 'audit.event.document.post',
                    meta: {
                        action: 'post',
                        fromStatus: 'DRAFT',
                        targetStatus: 'POSTED',
                        docNo: afterDoc?.header?.code || '',
                    },
                },
                diffDocumentPayload(
                    beforeDoc?.header || {},
                    afterDoc?.header || {},
                    beforeDoc?.lines || [],
                    afterDoc?.lines || [],
                ),
            );
            return { status: 'POSTED', action: 'posted' };
        }

        let targetStatus = 'PENDING_APPROVAL_L1';
        try {
            const rule = db.prepare(`
                SELECT level
                FROM approval_rules
                WHERE doc_type = 'stock_transfer'
                ORDER BY min_amount ASC
                LIMIT 1
            `).get() as any;
            if (Number(rule?.level || 1) === 2) targetStatus = 'PENDING_APPROVAL_L2';
        } catch {
            // approval rules may not exist yet
        }

        db.prepare(`
            UPDATE stock_transfers
            SET status = ?,
                submitted_by = ?,
                submitted_at = CURRENT_TIMESTAMP,
                version = COALESCE(version, 1) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(targetStatus, userId, id, scope.companyId, scope.branchId);

        StockTransferService._writeAudit(id, userId, 'DRAFT', targetStatus, 'Submit for Approval');
        StockTransferService.recordAudit(
            auditCtx,
            {
                entityType: 'stock_transfer',
                entityId: id,
                docType: 'stock_transfer',
                docId: id,
                eventType: 'document.update',
                summaryI18nKey: 'audit.event.document.update',
                meta: {
                    action: 'submit',
                    fromStatus: 'DRAFT',
                    targetStatus,
                },
            },
            [{ fieldPath: 'header.status', oldValue: 'DRAFT', newValue: targetStatus }],
        );
        return { status: targetStatus, action: 'submitted' };
    }

    static reopenRejected(id: string, userId = 'admin', scope: TenantScope, auditCtx?: AuditContext | null) {
        const doc = db.prepare(`
            SELECT status
            FROM stock_transfers
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId) as any;
        if (!doc) throw Object.assign(new Error('Stock transfer not found'), { code: 'DOCUMENT_NOT_FOUND' });
        if (String(doc.status || '') !== 'REJECTED') {
            throw Object.assign(new Error('Only REJECTED stock transfers can be reopened'), { code: 'INVALID_TRANSITION' });
        }

        db.prepare(`
            UPDATE stock_transfers
            SET status = 'DRAFT',
                rejection_reason = NULL,
                version = COALESCE(version, 1) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(id, scope.companyId, scope.branchId);

        StockTransferService._writeAudit(id, userId, 'REJECTED', 'DRAFT', 'Reopen');
        StockTransferService.recordAudit(
            auditCtx,
            {
                entityType: 'stock_transfer',
                entityId: id,
                docType: 'stock_transfer',
                docId: id,
                eventType: 'document.update',
                summaryI18nKey: 'audit.event.document.update',
                meta: { action: 'reopen', fromStatus: 'REJECTED', targetStatus: 'DRAFT' },
            },
            [{ fieldPath: 'header.status', oldValue: 'REJECTED', newValue: 'DRAFT' }],
        );
        return { status: 'DRAFT' };
    }

    static voidTransfer(id: string, userId = 'admin', scope: TenantScope, auditCtx?: AuditContext | null) {
        const doc = db.prepare(`
            SELECT status
            FROM stock_transfers
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).get(id, scope.companyId, scope.branchId) as any;
        if (!doc) throw Object.assign(new Error('Stock transfer not found'), { code: 'DOCUMENT_NOT_FOUND' });

        const currentStatus = String(doc.status || '');
        if (currentStatus === 'VOID') return { status: 'VOID' };
        if (currentStatus !== 'DRAFT' && currentStatus !== 'POSTED') {
            throw Object.assign(new Error(`Cannot void from status: ${currentStatus}`), { code: 'INVALID_TRANSITION' });
        }

        db.prepare(`
            UPDATE stock_transfers
            SET status = 'VOID',
                voided_by = ?,
                voided_at = CURRENT_TIMESTAMP,
                version = COALESCE(version, 1) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
        `).run(userId, id, scope.companyId, scope.branchId);

        StockTransferService._writeAudit(id, userId, currentStatus, 'VOID', 'Void');
        StockTransferService.recordAudit(
            auditCtx,
            {
                entityType: 'stock_transfer',
                entityId: id,
                docType: 'stock_transfer',
                docId: id,
                eventType: 'document.void',
                summaryI18nKey: 'audit.event.document.void',
                meta: { action: 'void', fromStatus: currentStatus, targetStatus: 'VOID' },
            },
            [{ fieldPath: 'header.status', oldValue: currentStatus, newValue: 'VOID' }],
        );

        return { status: 'VOID' };
    }

    static validate(id: string, scope: TenantScope) {
        const { header, lines } = StockTransferService.get(id, scope);
        const errors: Array<{ field: string; message: string }> = [];

        if (!String(header?.from_warehouse_id || '').trim()) {
            errors.push({ field: 'from_warehouse_id', message: 'Source warehouse is required' });
        }
        if (!String(header?.to_warehouse_id || '').trim()) {
            errors.push({ field: 'to_warehouse_id', message: 'Target warehouse is required' });
        }
        if (
            String(header?.from_warehouse_id || '').trim()
            && String(header?.from_warehouse_id || '').trim() === String(header?.to_warehouse_id || '').trim()
        ) {
            errors.push({ field: 'to_warehouse_id', message: 'Source and target warehouse must differ' });
        }

        const list = Array.isArray(lines) ? lines : [];
        if (list.length === 0) {
            errors.push({ field: 'lines', message: 'At least one transfer line is required' });
        } else {
            const hasValidLine = list.some((line: any) => String(line?.item_id || line?.item_code_lookup || '').trim() && toNumber(line?.qty, 0) > 0);
            if (!hasValidLine) {
                errors.push({ field: 'lines', message: 'At least one line must have an item and quantity > 0' });
            }
            list.forEach((line: any, index: number) => {
                if (!String(line?.item_id || line?.item_code_lookup || '').trim()) {
                    errors.push({ field: `lines[${index}].item_id`, message: 'Item is required' });
                }
                if (toNumber(line?.qty, 0) <= 0) {
                    errors.push({ field: `lines[${index}].qty`, message: 'Quantity must be greater than zero' });
                }
            });
        }

        return { errors };
    }

    private static _writeAudit(docId: string, userId: string, fromStatus: string, toStatus: string, action: string) {
        try {
            db.prepare(`
                INSERT INTO document_audit(id, document_id, doc_type, action, from_status, to_status, acted_by, acted_at)
                VALUES(?, ?, 'stock_transfer', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(uuidv4(), docId, action, fromStatus, toStatus, userId);
        } catch {
            // document_audit table may not exist on old databases.
        }
    }

    static register() {
        StockTransferService.ensureSchema();

        ipcMain.handle(
            'stockTransfers:list',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.list',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.read],
                        legacyPermissions: STOCK_TRANSFER_LEGACY.read,
                    },
                    async (ctx, _event, params: any) => {
                        return StockTransferService.listKeyset(params || {}, StockTransferService.getScope(ctx));
                    },
                ),
            ),
        );

        ipcMain.handle(
            'stockTransfers:get',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.get',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.read],
                        legacyPermissions: STOCK_TRANSFER_LEGACY.read,
                    },
                    async (ctx, _event, id: string) => {
                        return StockTransferService.get(id, StockTransferService.getScope(ctx));
                    },
                ),
            ),
        );

        ipcMain.handle(
            'stockTransfers:createDraft',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.createDraft',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.create],
                        legacyPermissions: STOCK_TRANSFER_LEGACY.create,
                    },
                    async (ctx, event, userId?: string) => {
                        const scope = StockTransferService.getScope(ctx);
                        const auditCtx = StockTransferService.createAuditContext(
                            ctx,
                            event,
                            userId || undefined,
                            ctx?.correlationId,
                        );
                        return StockTransferService.createDraft(userId || String(ctx?.userId || 'admin'), scope, auditCtx);
                    },
                ),
            ),
        );

        ipcMain.handle(
            'stockTransfers:save',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.save',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.update],
                        legacyPermissions: STOCK_TRANSFER_LEGACY.update,
                    },
                    async (ctx, event, params: any) => {
                        const scope = StockTransferService.getScope(ctx);
                        const saveUserId = params?.userId || ctx?.userId || undefined;
                        const auditCtx = StockTransferService.createAuditContext(
                            ctx,
                            event,
                            saveUserId,
                            params?.correlationId || ctx?.correlationId,
                        );
                        return StockTransferService.save(
                            {
                                ...(params || {}),
                                userId: saveUserId,
                            },
                            scope,
                            auditCtx,
                        );
                    },
                ),
            ),
        );

        ipcMain.handle(
            'stockTransfers:postOrSubmit',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.postOrSubmit',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.post, STOCK_TRANSFER_CAPABILITIES.update],
                        legacyPermissions: [...STOCK_TRANSFER_LEGACY.post, ...STOCK_TRANSFER_LEGACY.update],
                        policyGuard: () => true,
                    },
                    async (ctx, event, payload: any) => {
                        const scope = StockTransferService.getScope(ctx);
                        const id = String(payload?.id || '');
                        const userId = String(payload?.userId || ctx?.userId || 'admin');
                        const auditCtx = StockTransferService.createAuditContext(
                            ctx,
                            event,
                            userId,
                            payload?.correlationId || ctx?.correlationId,
                        );
                        return StockTransferService.postOrSubmit(
                            id,
                            userId,
                            hasPostCapability(ctx),
                            scope,
                            auditCtx,
                        );
                    },
                ),
            ),
        );

        ipcMain.handle(
            'stockTransfers:validate',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.validate',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.read],
                        legacyPermissions: STOCK_TRANSFER_LEGACY.read,
                    },
                    async (ctx, _event, id: string) => {
                        return StockTransferService.validate(id, StockTransferService.getScope(ctx));
                    },
                ),
            ),
        );

        ipcMain.handle(
            'stockTransfers:reopenRejected',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.reopenRejected',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.update],
                        legacyPermissions: STOCK_TRANSFER_LEGACY.update,
                    },
                    async (ctx, event, payload: { id: string; userId?: string }) => {
                        const scope = StockTransferService.getScope(ctx);
                        const userId = String(payload?.userId || ctx?.userId || 'admin');
                        const auditCtx = StockTransferService.createAuditContext(ctx, event, userId, ctx?.correlationId);
                        return StockTransferService.reopenRejected(String(payload?.id || ''), userId, scope, auditCtx);
                    },
                ),
            ),
        );

        ipcMain.handle(
            'stockTransfers:void',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.void',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.void],
                        legacyPermissions: STOCK_TRANSFER_LEGACY.void,
                    },
                    async (ctx, event, payload: { id: string; userId?: string }) => {
                        const scope = StockTransferService.getScope(ctx);
                        const userId = String(payload?.userId || ctx?.userId || 'admin');
                        const auditCtx = StockTransferService.createAuditContext(ctx, event, userId, ctx?.correlationId);
                        return StockTransferService.voidTransfer(String(payload?.id || ''), userId, scope, auditCtx);
                    },
                ),
            ),
        );

        ipcMain.handle(
            'stockTransfers:searchItems',
            ipcWrap(
                withGuards(
                    {
                        eventName: 'stockTransfers.searchItems',
                        requiredCapabilities: [STOCK_TRANSFER_CAPABILITIES.read],
                        legacyPermissions: STOCK_TRANSFER_LEGACY.read,
                    },
                    async (_ctx, _event, search: string) => {
                        return ItemService.searchItemProfiles(search, 50);
                    },
                ),
            ),
        );

        console.log('[StockTransferService] IPC handlers registered');
    }
}
