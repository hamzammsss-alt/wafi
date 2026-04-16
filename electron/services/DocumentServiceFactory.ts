import { ipcMain } from 'electron';
import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentServiceConfig {
    docType: string;
    tableName: string;
    lineTableName: string;
    foreignKey: string;
    headerPrefix: string; // e.g. 'INV', 'PO', 'PR'
    partnerField: 'customer_id' | 'vendor_id' | 'supplier_id' | 'requester_id';
    hasTotals: boolean;
}

export function wrapResult<T>(fn: () => T) {
    try {
        return { ok: true, data: fn() };
    } catch (e: any) {
        console.error('[DocumentServiceFactory]', e.message);
        return { ok: false, error: { code: e.code || 'UNKNOWN_ERROR', message: e.message } };
    }
}

export class DocumentServiceFactory {

    static createService(config: DocumentServiceConfig) {
        const { docType, tableName, lineTableName, foreignKey, headerPrefix, partnerField, hasTotals } = config;

        function nextDocNo(): string {
            const sequence = db.prepare(`SELECT next_no FROM doc_sequences WHERE doc_type = ?`).get(docType) as { next_no: number } | undefined;
            if (!sequence) {
                db.prepare(`INSERT INTO doc_sequences(doc_type, next_no) VALUES(?, 2)`).run(docType);
                return `${headerPrefix}-0001`;
            }
            const next = Math.max(sequence.next_no, 1);
            db.prepare(`UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = ?`).run(docType);
            return `${headerPrefix}-${String(next).padStart(4, '0')}`;
        }

        function writeAudit(docId: string, userId: string, fromStatus: string, toStatus: string, action: string) {
            try {
                db.prepare(`
                    INSERT INTO document_audit(id, document_id, doc_type, action, from_status, to_status, acted_by, acted_at)
                    VALUES(?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `).run(uuidv4(), docId, docType, action, fromStatus, toStatus, userId);
            } catch (e) {
                // Ignore if table doesn't exist
            }
        }

        return class GeneratedDocumentService {
            static listKeyset(params: any = {}) {
                const limit = params.limit ?? 50;
                const sort = params.sort ?? 'date_desc';

                let where = ['1=1'];
                const args: any[] = [];

                if (params.status && params.status !== 'ALL') {
                    where.push('i.status = ?');
                    args.push(params.status);
                }

                // Generic Search using the partnerField and doc_no
                if (params.search) {
                    const docNoField = docType === 'sales_invoice' || docType === 'purchase_invoice' ? 'invoice_no' :
                        docType.includes('order') ? 'order_no' :
                            docType.includes('request') ? 'request_no' : 'doc_no';

                    where.push(`(i.${docNoField} LIKE ? OR bp.name_ar LIKE ? OR bp.name_en LIKE ?)`);
                    const pct = `%${params.search}%`;
                    args.push(pct, pct, pct);
                }

                if (params.dateFrom) { where.push('COALESCE(i.doc_date, i.date) >= ?'); args.push(params.dateFrom); }
                if (params.dateTo) { where.push('COALESCE(i.doc_date, i.date) <= ?'); args.push(params.dateTo); }

                if (params.cursor) {
                    if (sort === 'date_desc') {
                        where.push(`(COALESCE(i.doc_date, i.date) < ? OR (COALESCE(i.doc_date, i.date) = ? AND i.id < ?))`);
                        args.push(params.cursor.date, params.cursor.date, params.cursor.id);
                    } else {
                        where.push(`(COALESCE(i.doc_date, i.date) > ? OR (COALESCE(i.doc_date, i.date) = ? AND i.id > ?))`);
                        args.push(params.cursor.date, params.cursor.date, params.cursor.id);
                    }
                }

                const orderDir = sort === 'date_asc' ? 'ASC' : 'DESC';

                const docNoSelect = docType === 'sales_invoice' || docType === 'purchase_invoice' ? 'i.invoice_no' :
                    docType.includes('order') ? 'i.order_no as invoice_no' : 'i.request_no as invoice_no'; // Alias to invoice_no for generic UI compatibility

                const partnerNameSelect = partnerField === 'requester_id' ? 'bp.name' : 'bp.name_ar'; // Employees use name, Partners use name_ar
                const joinTable = partnerField === 'requester_id' ? 'employees' : 'business_partners';

                const sql = `
                    SELECT
                        i.id, ${docNoSelect}, i.status, i.version,
                        COALESCE(i.doc_date, i.date) AS doc_date,
                        COALESCE(${partnerNameSelect}, '') AS customer_name,
                        i.${partnerField} as customer_id,
                        ${hasTotals ? 'COALESCE(i.grand_total, i.total_value, 0) AS grand_total,' : '0 AS grand_total,'}
                        i.rejection_reason
                    FROM ${tableName} i
                    LEFT JOIN ${joinTable} bp ON i.${partnerField} = bp.id
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

            static get(id: string) {
                const joinTable = partnerField === 'requester_id' ? 'employees' : 'business_partners';
                const partnerNameSelect = partnerField === 'requester_id' ? 'bp.name' : 'bp.name_ar';

                const header: any = db.prepare(`
                    SELECT
                        i.*,
                        COALESCE(i.doc_date, i.date) AS doc_date,
                        COALESCE(${partnerNameSelect}, '') AS customer_name,
                        i.${partnerField} as customer_id
                    FROM ${tableName} i
                    LEFT JOIN ${joinTable} bp ON i.${partnerField} = bp.id
                    WHERE i.id = ?
                `).get(id);

                if (!header) throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });

                const lines: any[] = db.prepare(`
                    SELECT
                        l.*,
                        COALESCE(it.name_ar, l.description, '') AS item_name,
                        COALESCE(it.code, '')    AS item_code_lookup,
                        COALESCE(l.quantity, l.qty, 0) AS qty,
                        COALESCE(l.unit_price, l.price, 0) AS price,
                        COALESCE(l.discount, 0)   AS discount,
                        COALESCE(l.tax_rate, 0)   AS tax_rate,
                        COALESCE(l.net_total, l.total_price, l.line_total, 0) AS line_total
                    FROM ${lineTableName} l
                    LEFT JOIN items it ON l.item_id = it.id
                    WHERE l.${foreignKey} = ?
                    ORDER BY COALESCE(l.line_no, l.rowid)
                `).all(id);

                return { header, lines };
            }

            static createDraft(userId = 'admin') {
                const id = uuidv4();
                const no = nextDocNo();
                const today = new Date().toISOString().split('T')[0];

                const docNoField = docType === 'sales_invoice' || docType === 'purchase_invoice' ? 'invoice_no' :
                    docType.includes('order') ? 'order_no' : 'request_no';

                let cols = `id, ${docNoField}, status, version, date, doc_date, created_by, created_at`;
                let vals = `?, ?, 'DRAFT', 1, ?, ?, ?, CURRENT_TIMESTAMP`;
                let args = [id, no, today, today, userId];

                if (hasTotals) {
                    cols += `, subtotal, tax_total, grand_total`;
                    vals += `, 0, 0, 0`;
                }

                db.prepare(`INSERT INTO ${tableName}(${cols}) VALUES(${vals})`).run(...args);

                return { id, invoice_no: no, status: 'DRAFT' };
            }

            static save(params: { id: string; header: Record<string, any>; lines: any[]; userId?: string }) {
                const { id, header, lines, userId = 'admin' } = params;

                const existing: any = db.prepare(`SELECT status, version FROM ${tableName} WHERE id = ?`).get(id);
                if (!existing) throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });
                if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
                    throw Object.assign(new Error('Only DRAFT/REJECTED documents can be edited'), { code: 'INVALID_TRANSITION' });
                }

                let subtotal = 0, taxTotal = 0, grandTotal = 0;

                if (hasTotals) {
                    subtotal = lines.reduce((s, l) => s + (Number(l.qty || l.quantity || 0) * Number(l.price || l.unit_price || 0) * (1 - (Number(l.discount || 0) / 100))), 0);
                    taxTotal = lines.reduce((s, l) => {
                        const lineNet = Number(l.qty || l.quantity || 0) * Number(l.price || l.unit_price || 0) * (1 - (Number(l.discount || 0) / 100));
                        return s + lineNet * (Number(l.tax_rate || 0) / 100);
                    }, 0);
                    grandTotal = subtotal + taxTotal;
                }

                db.transaction(() => {
                    let updateSql = `UPDATE ${tableName} SET ${partnerField} = ?, date = ?, doc_date = ?, version = version + 1`;
                    let updateArgs: any[] = [
                        header.customer_id ?? null,
                        header.doc_date ?? header.date ?? new Date().toISOString().split('T')[0],
                        header.doc_date ?? header.date ?? new Date().toISOString().split('T')[0]
                    ];

                    if (hasTotals) {
                        updateSql += `, subtotal = ?, tax_total = ?, grand_total = ?, currency_id = ?, exchange_rate = ?`;
                        updateArgs.push(subtotal, taxTotal, grandTotal, header.currency_id ?? null, header.exchange_rate ?? 1);
                    }

                    if (header.notes !== undefined) {
                        updateSql += `, notes = ?`;
                        updateArgs.push(header.notes);
                    }

                    updateSql += ` WHERE id = ? AND version = ?`;
                    updateArgs.push(id, existing.version || 1);

                    db.prepare(updateSql).run(...updateArgs);

                    db.prepare(`DELETE FROM ${lineTableName} WHERE ${foreignKey} = ?`).run(id);

                    const insertCols = `id, ${foreignKey}, line_no, item_id, description, quantity, unit_price, discount, tax_rate, total_price, tax_amount, net_total`;
                    const insertLine = db.prepare(`INSERT INTO ${lineTableName}(${insertCols}) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

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
                            l.item_id || null, l.item_name || l.description || '',
                            qty, price, discPct, taxRate,
                            lineNet, taxAmt, lineTotal
                        );
                    });
                })();

                return this.get(id);
            }

            static postOrSubmit(id: string, userId = 'admin', hasPostPermission = false) {
                const doc: any = db.prepare(`SELECT status FROM ${tableName} WHERE id = ?`).get(id);
                if (!doc) throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });
                if (String(doc.status || '') === 'POSTED') {
                    return { status: 'POSTED', action: 'already_posted' };
                }
                if (doc.status !== 'DRAFT') throw Object.assign(new Error(`Cannot submit from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });

                if (hasPostPermission) {
                    const posted = db.prepare(`
                        UPDATE ${tableName}
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
                        const current: any = db.prepare(`SELECT status FROM ${tableName} WHERE id = ?`).get(id);
                        if (String(current?.status || '') === 'POSTED') {
                            return { status: 'POSTED', action: 'already_posted' };
                        }
                        throw Object.assign(new Error('Document posting conflict'), { code: 'CONFLICT' });
                    }
                    writeAudit(id, userId, 'DRAFT', 'POSTED', 'Post');
                    return { status: 'POSTED', action: 'posted' };
                }

                const submitted = db.prepare(`
                    UPDATE ${tableName}
                    SET status = 'PENDING_APPROVAL_L1',
                        submitted_by = ?,
                        submitted_at = CURRENT_TIMESTAMP,
                        version = version + 1
                    WHERE id = ?
                      AND status = 'DRAFT'
                `).run(userId, id);
                if (Number(submitted.changes || 0) === 0) {
                    const current: any = db.prepare(`SELECT status FROM ${tableName} WHERE id = ?`).get(id);
                    if (String(current?.status || '') === 'POSTED') {
                        return { status: 'POSTED', action: 'already_posted' };
                    }
                    throw Object.assign(new Error('Document submit conflict'), { code: 'CONFLICT' });
                }
                writeAudit(id, userId, 'DRAFT', 'PENDING_APPROVAL_L1', 'Submit for Approval');
                return { status: 'PENDING_APPROVAL_L1', action: 'submitted' };
            }

            static reopenRejected(id: string, userId = 'admin') {
                const doc: any = db.prepare(`SELECT status FROM ${tableName} WHERE id = ?`).get(id);
                if (!doc) throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });
                if (doc.status !== 'REJECTED') throw Object.assign(new Error('Only REJECTED docs can be reopened'), { code: 'INVALID_TRANSITION' });

                db.prepare(`UPDATE ${tableName} SET status = 'DRAFT', rejection_reason = NULL, version = version + 1 WHERE id = ?`).run(id);
                writeAudit(id, userId, 'REJECTED', 'DRAFT', 'Reopen');
                return { status: 'DRAFT' };
            }

            static validate(id: string) {
                const { header, lines } = this.get(id);
                const errors: { field: string; message: string }[] = [];

                if (!header.customer_id) {
                    errors.push({ field: 'customer_id', message: 'Partner is required' });
                }

                if (!lines || lines.length === 0) {
                    errors.push({ field: 'lines', message: 'At least one line item is required' });
                }

                return { errors };
            }

            static register(channelPrefix: string) {
                // Ensure base schema exists for dynamic tables
                try {
                    db.exec(`
                        ALTER TABLE ${tableName} ADD COLUMN version INTEGER DEFAULT 1;
                        ALTER TABLE ${tableName} ADD COLUMN submitted_at DATETIME;
                        ALTER TABLE ${tableName} ADD COLUMN submitted_by TEXT;
                        ALTER TABLE ${tableName} ADD COLUMN posted_at DATETIME;
                        ALTER TABLE ${tableName} ADD COLUMN posted_by TEXT;
                        ALTER TABLE ${tableName} ADD COLUMN rejected_at DATETIME;
                        ALTER TABLE ${tableName} ADD COLUMN rejected_by TEXT;
                        ALTER TABLE ${tableName} ADD COLUMN rejection_reason TEXT;
                        ALTER TABLE ${lineTableName} ADD COLUMN line_no INTEGER DEFAULT 0;
                    `);
                } catch (e) { } // Ignore if columns exist

                ipcMain.handle(`${channelPrefix}:list`, (_, params) => wrapResult(() => this.listKeyset(params || {})));
                ipcMain.handle(`${channelPrefix}:get`, (_, id: string) => wrapResult(() => this.get(id)));
                ipcMain.handle(`${channelPrefix}:createDraft`, (_, userId?: string) => wrapResult(() => this.createDraft(userId || 'admin')));
                ipcMain.handle(`${channelPrefix}:save`, (_, params) => wrapResult(() => this.save(params)));
                ipcMain.handle(`${channelPrefix}:validate`, (_, id: string) => wrapResult(() => this.validate(id)));
                ipcMain.handle(`${channelPrefix}:postOrSubmit`, (_, { id, userId, hasPostPermission }) => wrapResult(() => this.postOrSubmit(id, userId, hasPostPermission || false)));
                ipcMain.handle(`${channelPrefix}:reopenRejected`, (_, { id, userId }) => wrapResult(() => this.reopenRejected(id, userId)));
            }
        }
    }
}
