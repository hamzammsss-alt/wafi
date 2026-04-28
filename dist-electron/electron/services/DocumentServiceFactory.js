"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentServiceFactory = void 0;
exports.wrapResult = wrapResult;
const electron_1 = require("electron");
const database_1 = require("../database");
const uuid_1 = require("uuid");
function wrapResult(fn) {
    try {
        return { ok: true, data: fn() };
    }
    catch (e) {
        console.error('[DocumentServiceFactory]', e.message);
        return { ok: false, error: { code: e.code || 'UNKNOWN_ERROR', message: e.message } };
    }
}
class DocumentServiceFactory {
    static createService(config) {
        const { docType, tableName, lineTableName, foreignKey, headerPrefix, partnerField, hasTotals } = config;
        const docNoField = config.docNoField || (docType === 'sales_invoice' || docType === 'purchase_invoice' ? 'invoice_no' :
            docType.includes('order') ? 'order_no' :
                docType.includes('quotation') ? 'quotation_no' :
                    docType.includes('request') ? 'request_no' : 'doc_no');
        function getColumns(table) {
            try {
                const rows = database_1.db.prepare(`PRAGMA table_info(${table})`).all();
                return new Set(rows.map((row) => String(row.name || '').trim()).filter(Boolean));
            }
            catch {
                return new Set();
            }
        }
        function hasColumn(table, column) {
            return getColumns(table).has(column);
        }
        function addColumn(table, column, ddl) {
            try {
                if (!hasColumn(table, column)) {
                    database_1.db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`).run();
                }
            }
            catch (error) {
                if (!String(error?.message || '').includes('duplicate column name')) {
                    console.warn(`[DocumentServiceFactory] Could not add ${table}.${column}: ${error?.message || error}`);
                }
            }
        }
        function firstId(table, extraWhere = '1=1') {
            try {
                const row = database_1.db.prepare(`SELECT id FROM ${table} WHERE ${extraWhere} LIMIT 1`).get();
                return String(row?.id || '').trim();
            }
            catch {
                return '';
            }
        }
        function defaultPartnerId() {
            return partnerField === 'requester_id'
                ? firstId('employees')
                : firstId('business_partners');
        }
        function defaultBranchId() {
            try {
                const main = database_1.db.prepare(`SELECT id FROM branches WHERE COALESCE(is_main, 0) = 1 LIMIT 1`).get();
                if (main?.id)
                    return String(main.id);
            }
            catch { }
            return firstId('branches') || 'MAIN';
        }
        function defaultCurrencyId() {
            try {
                const row = database_1.db.prepare(`
                    SELECT COALESCE(NULLIF(TRIM(id), ''), code) AS id
                    FROM currencies
                    WHERE UPPER(COALESCE(code, id, '')) = 'ILS'
                    LIMIT 1
                `).get();
                if (row?.id)
                    return String(row.id);
            }
            catch { }
            return 'ILS';
        }
        function insertRow(table, values) {
            const columns = getColumns(table);
            const entries = Object.entries(values).filter(([key]) => columns.has(key));
            if (!entries.length)
                return;
            const names = entries.map(([key]) => key);
            const placeholders = names.map((key) => `@${key}`);
            const payload = Object.fromEntries(entries);
            database_1.db.prepare(`INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders.join(', ')})`).run(payload);
        }
        function nextDocNo() {
            const sequence = database_1.db.prepare(`SELECT next_no FROM doc_sequences WHERE doc_type = ?`).get(docType);
            if (!sequence) {
                database_1.db.prepare(`INSERT INTO doc_sequences(doc_type, next_no) VALUES(?, 2)`).run(docType);
                return `${headerPrefix}-0001`;
            }
            const next = Math.max(sequence.next_no, 1);
            database_1.db.prepare(`UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = ?`).run(docType);
            return `${headerPrefix}-${String(next).padStart(4, '0')}`;
        }
        function writeAudit(docId, userId, fromStatus, toStatus, action) {
            try {
                database_1.db.prepare(`
                    INSERT INTO document_audit(id, document_id, doc_type, action, from_status, to_status, acted_by, acted_at)
                    VALUES(?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `).run((0, uuid_1.v4)(), docId, docType, action, fromStatus, toStatus, userId);
            }
            catch (e) {
                // Ignore if table doesn't exist
            }
        }
        return class GeneratedDocumentService {
            static listKeyset(params = {}) {
                const limit = params.limit ?? 50;
                const sort = params.sort ?? 'date_desc';
                let where = ['1=1'];
                const args = [];
                if (params.status && params.status !== 'ALL') {
                    where.push('i.status = ?');
                    args.push(params.status);
                }
                // Generic Search using the partnerField and doc_no
                if (params.search) {
                    where.push(`(i.${docNoField} LIKE ? OR bp.name_ar LIKE ? OR bp.name_en LIKE ?)`);
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
                const docNoSelect = `i.${docNoField} as invoice_no`; // Alias to invoice_no for generic UI compatibility
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
                const rows = database_1.db.prepare(sql).all(...args, limit + 1);
                const hasMore = rows.length > limit;
                if (hasMore)
                    rows.pop();
                const next_cursor = hasMore && rows.length > 0
                    ? { date: rows[rows.length - 1].doc_date, id: rows[rows.length - 1].id }
                    : null;
                return { rows, next_cursor };
            }
            static get(id) {
                const joinTable = partnerField === 'requester_id' ? 'employees' : 'business_partners';
                const partnerNameSelect = partnerField === 'requester_id' ? 'bp.name' : 'bp.name_ar';
                const lineColumns = getColumns(lineTableName);
                const lineExpr = (preferred, fallback, literal = '0') => lineColumns.has(preferred) ? `l.${preferred}` : lineColumns.has(fallback) ? `l.${fallback}` : literal;
                const itemLookupExpr = lineColumns.has('item_id') ? 'l.item_id' : "''";
                const descriptionExpr = lineColumns.has('description') ? 'l.description' : "''";
                const qtyExpr = lineExpr('quantity', 'qty');
                const priceExpr = lineExpr('unit_price', 'price');
                const discountExpr = lineExpr('discount', 'discount_amount');
                const taxRateExpr = lineColumns.has('tax_rate') ? 'l.tax_rate' : '0';
                const lineTotalExpr = lineColumns.has('net_total')
                    ? 'l.net_total'
                    : lineColumns.has('total_price')
                        ? 'l.total_price'
                        : lineColumns.has('line_total')
                            ? 'l.line_total'
                            : '0';
                const header = database_1.db.prepare(`
                    SELECT
                        i.*,
                        i.${docNoField} AS invoice_no,
                        COALESCE(i.doc_date, i.date) AS doc_date,
                        COALESCE(${partnerNameSelect}, '') AS customer_name,
                        i.${partnerField} as customer_id
                    FROM ${tableName} i
                    LEFT JOIN ${joinTable} bp ON i.${partnerField} = bp.id
                    WHERE i.id = ?
                `).get(id);
                if (!header)
                    throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });
                const lines = database_1.db.prepare(`
                    SELECT
                        l.*,
                        COALESCE(it.name_ar, ${descriptionExpr}, '') AS item_name,
                        COALESCE(it.code, '')    AS item_code_lookup,
                        COALESCE(${qtyExpr}, 0) AS qty,
                        COALESCE(${priceExpr}, 0) AS price,
                        COALESCE(${discountExpr}, 0) AS discount,
                        COALESCE(${taxRateExpr}, 0) AS tax_rate,
                        COALESCE(${lineTotalExpr}, 0) AS line_total
                    FROM ${lineTableName} l
                    LEFT JOIN items it ON ${itemLookupExpr} = it.id
                    WHERE l.${foreignKey} = ?
                    ORDER BY COALESCE(l.line_no, l.rowid)
                `).all(id);
                return { header, lines };
            }
            static createDraft(userId = 'admin') {
                const id = (0, uuid_1.v4)();
                const no = nextDocNo();
                const today = new Date().toISOString().split('T')[0];
                const values = {
                    id,
                    [docNoField]: no,
                    status: 'DRAFT',
                    version: 1,
                    date: today,
                    doc_date: today,
                    created_by: userId,
                    created_at: new Date().toISOString(),
                    [partnerField]: defaultPartnerId(),
                    branch_id: defaultBranchId(),
                    currency_id: defaultCurrencyId(),
                    exchange_rate: 1,
                    subtotal: 0,
                    tax_total: 0,
                    discount_total: 0,
                    grand_total: 0,
                    total_value: 0,
                    posted_once: 0,
                };
                insertRow(tableName, values);
                return { id, invoice_no: no, status: 'DRAFT' };
            }
            static save(params) {
                const { id, header, lines, userId = 'admin' } = params;
                const existing = database_1.db.prepare(`SELECT status, version FROM ${tableName} WHERE id = ?`).get(id);
                if (!existing)
                    throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });
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
                database_1.db.transaction(() => {
                    const headerColumns = getColumns(tableName);
                    const docDate = header.doc_date ?? header.date ?? new Date().toISOString().split('T')[0];
                    const assignments = [];
                    const updateArgs = [];
                    const assignHeaderField = (field, value) => {
                        if (!headerColumns.has(field) || value === undefined)
                            return;
                        assignments.push(`${field} = ?`);
                        updateArgs.push(value);
                    };
                    if (headerColumns.has(partnerField)) {
                        assignments.push(`${partnerField} = ?`);
                        updateArgs.push(header.customer_id ?? header[partnerField] ?? null);
                    }
                    if (headerColumns.has('date')) {
                        assignments.push('date = ?');
                        updateArgs.push(docDate);
                    }
                    if (headerColumns.has('doc_date')) {
                        assignments.push('doc_date = ?');
                        updateArgs.push(docDate);
                    }
                    if (headerColumns.has('version')) {
                        assignments.push('version = COALESCE(version, 1) + 1');
                    }
                    if (hasTotals) {
                        if (headerColumns.has('subtotal')) {
                            assignments.push('subtotal = ?');
                            updateArgs.push(subtotal);
                        }
                        if (headerColumns.has('tax_total')) {
                            assignments.push('tax_total = ?');
                            updateArgs.push(taxTotal);
                        }
                        if (headerColumns.has('grand_total')) {
                            assignments.push('grand_total = ?');
                            updateArgs.push(grandTotal);
                        }
                        if (headerColumns.has('currency_id')) {
                            assignments.push('currency_id = ?');
                            updateArgs.push(header.currency_id ?? defaultCurrencyId());
                        }
                        if (headerColumns.has('exchange_rate')) {
                            assignments.push('exchange_rate = ?');
                            updateArgs.push(header.exchange_rate ?? 1);
                        }
                    }
                    if (header.notes !== undefined && headerColumns.has('notes')) {
                        assignments.push('notes = ?');
                        updateArgs.push(header.notes);
                    }
                    assignHeaderField('branch_id', header.branch_id);
                    assignHeaderField('warehouse_id', header.warehouse_id);
                    assignHeaderField('delivery_date', header.delivery_date);
                    assignHeaderField('expiry_date', header.expiry_date);
                    assignHeaderField('due_date', header.due_date);
                    assignHeaderField('price_list_id', header.price_list_id);
                    assignHeaderField('sales_rep_id', header.sales_rep_id);
                    const versionGuard = headerColumns.has('version') ? ' AND COALESCE(version, 1) = ?' : '';
                    const updateSql = `UPDATE ${tableName} SET ${assignments.join(', ')} WHERE id = ?${versionGuard}`;
                    updateArgs.push(id);
                    if (versionGuard) {
                        updateArgs.push(existing.version || 1);
                    }
                    database_1.db.prepare(updateSql).run(...updateArgs);
                    database_1.db.prepare(`DELETE FROM ${lineTableName} WHERE ${foreignKey} = ?`).run(id);
                    const lineColumns = getColumns(lineTableName);
                    lines.forEach((l, idx) => {
                        const qty = Number(l.qty || l.quantity || 0);
                        const price = Number(l.price || l.unit_price || 0);
                        const discPct = Number(l.discount || 0);
                        const taxRate = Number(l.tax_rate || 0);
                        const discountAmount = qty * price * (discPct / 100);
                        const lineNet = qty * price - discountAmount;
                        const taxAmt = lineNet * taxRate / 100;
                        const lineTotal = lineNet + taxAmt;
                        const row = {
                            id: (0, uuid_1.v4)(),
                            [foreignKey]: id,
                            line_no: idx + 1,
                            item_id: l.item_id || null,
                            description: l.item_name || l.description || '',
                            quantity: qty,
                            qty,
                            unit_id: l.unit_id || l.base_unit_id || 'PCS',
                            unit_price: price,
                            price,
                            discount: discPct,
                            discount_amount: discountAmount,
                            tax_rate: taxRate,
                            total_price: lineNet,
                            line_total: lineTotal,
                            tax_amount: taxAmt,
                            net_total: lineTotal,
                        };
                        const entries = Object.entries(row).filter(([key]) => lineColumns.has(key));
                        if (!entries.length)
                            return;
                        const names = entries.map(([key]) => key);
                        const placeholders = names.map((key) => `@${key}`);
                        database_1.db.prepare(`INSERT INTO ${lineTableName} (${names.join(', ')}) VALUES (${placeholders.join(', ')})`)
                            .run(Object.fromEntries(entries));
                    });
                })();
                return this.get(id);
            }
            static postOrSubmit(id, userId = 'admin', hasPostPermission = false) {
                const doc = database_1.db.prepare(`SELECT status FROM ${tableName} WHERE id = ?`).get(id);
                if (!doc)
                    throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });
                if (String(doc.status || '') === 'POSTED') {
                    return { status: 'POSTED', action: 'already_posted' };
                }
                if (doc.status !== 'DRAFT')
                    throw Object.assign(new Error(`Cannot submit from status: ${doc.status}`), { code: 'INVALID_TRANSITION' });
                if (hasPostPermission) {
                    const posted = database_1.db.prepare(`
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
                        const current = database_1.db.prepare(`SELECT status FROM ${tableName} WHERE id = ?`).get(id);
                        if (String(current?.status || '') === 'POSTED') {
                            return { status: 'POSTED', action: 'already_posted' };
                        }
                        throw Object.assign(new Error('Document posting conflict'), { code: 'CONFLICT' });
                    }
                    writeAudit(id, userId, 'DRAFT', 'POSTED', 'Post');
                    return { status: 'POSTED', action: 'posted' };
                }
                const submitted = database_1.db.prepare(`
                    UPDATE ${tableName}
                    SET status = 'PENDING_APPROVAL_L1',
                        submitted_by = ?,
                        submitted_at = CURRENT_TIMESTAMP,
                        version = version + 1
                    WHERE id = ?
                      AND status = 'DRAFT'
                `).run(userId, id);
                if (Number(submitted.changes || 0) === 0) {
                    const current = database_1.db.prepare(`SELECT status FROM ${tableName} WHERE id = ?`).get(id);
                    if (String(current?.status || '') === 'POSTED') {
                        return { status: 'POSTED', action: 'already_posted' };
                    }
                    throw Object.assign(new Error('Document submit conflict'), { code: 'CONFLICT' });
                }
                writeAudit(id, userId, 'DRAFT', 'PENDING_APPROVAL_L1', 'Submit for Approval');
                return { status: 'PENDING_APPROVAL_L1', action: 'submitted' };
            }
            static reopenRejected(id, userId = 'admin') {
                const doc = database_1.db.prepare(`SELECT status FROM ${tableName} WHERE id = ?`).get(id);
                if (!doc)
                    throw Object.assign(new Error('Document not found'), { code: 'DOCUMENT_NOT_FOUND' });
                if (doc.status !== 'REJECTED')
                    throw Object.assign(new Error('Only REJECTED docs can be reopened'), { code: 'INVALID_TRANSITION' });
                database_1.db.prepare(`UPDATE ${tableName} SET status = 'DRAFT', rejection_reason = NULL, version = version + 1 WHERE id = ?`).run(id);
                writeAudit(id, userId, 'REJECTED', 'DRAFT', 'Reopen');
                return { status: 'DRAFT' };
            }
            static validate(id) {
                const { header, lines } = this.get(id);
                const errors = [];
                if (!header.customer_id) {
                    errors.push({ field: 'customer_id', message: 'Partner is required' });
                }
                if (!lines || lines.length === 0) {
                    errors.push({ field: 'lines', message: 'At least one line item is required' });
                }
                return { errors };
            }
            static register(channelPrefix) {
                // Ensure base schema exists for dynamic tables
                addColumn(tableName, 'version', 'INTEGER DEFAULT 1');
                addColumn(tableName, 'doc_date', 'TEXT');
                addColumn(tableName, 'created_by', 'TEXT');
                addColumn(tableName, 'submitted_at', 'DATETIME');
                addColumn(tableName, 'submitted_by', 'TEXT');
                addColumn(tableName, 'posted_at', 'DATETIME');
                addColumn(tableName, 'posted_by', 'TEXT');
                addColumn(tableName, 'posted_once', 'INTEGER DEFAULT 0');
                addColumn(tableName, 'posted_token', 'TEXT');
                addColumn(tableName, 'rejected_at', 'DATETIME');
                addColumn(tableName, 'rejected_by', 'TEXT');
                addColumn(tableName, 'rejection_reason', 'TEXT');
                addColumn(lineTableName, 'line_no', 'INTEGER DEFAULT 0');
                addColumn(lineTableName, 'discount', 'REAL DEFAULT 0');
                addColumn(lineTableName, 'tax_rate', 'REAL DEFAULT 0');
                addColumn(lineTableName, 'line_total', 'REAL DEFAULT 0');
                electron_1.ipcMain.handle(`${channelPrefix}:list`, (_, params) => wrapResult(() => this.listKeyset(params || {})));
                electron_1.ipcMain.handle(`${channelPrefix}:get`, (_, id) => wrapResult(() => this.get(id)));
                electron_1.ipcMain.handle(`${channelPrefix}:createDraft`, (_, userId) => wrapResult(() => this.createDraft(userId || 'admin')));
                electron_1.ipcMain.handle(`${channelPrefix}:save`, (_, params) => wrapResult(() => this.save(params)));
                electron_1.ipcMain.handle(`${channelPrefix}:validate`, (_, id) => wrapResult(() => this.validate(id)));
                electron_1.ipcMain.handle(`${channelPrefix}:postOrSubmit`, (_, { id, userId, hasPostPermission }) => wrapResult(() => this.postOrSubmit(id, userId, hasPostPermission || false)));
                electron_1.ipcMain.handle(`${channelPrefix}:reopenRejected`, (_, { id, userId }) => wrapResult(() => this.reopenRejected(id, userId)));
            }
        };
    }
}
exports.DocumentServiceFactory = DocumentServiceFactory;
