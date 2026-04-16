"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteInventoryDocumentRepo = void 0;
const uuid_1 = require("uuid");
const errors_1 = require("../../domain/errors");
const PERPETUAL_INVENTORY_TRUE_VALUES = new Set(['1', 'TRUE', 'YES', 'Y', 'ON', 'PERPETUAL']);
class SqliteInventoryDocumentRepo {
    constructor(db) {
        this.db = db;
    }
    ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS inventory_documents (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                doc_no TEXT NOT NULL,
                doc_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                warehouse_id TEXT,
                to_warehouse_id TEXT,
                reference_no TEXT,
                remarks TEXT,
                currency_code TEXT NOT NULL DEFAULT 'ILS',
                currency_rate REAL NOT NULL DEFAULT 1,
                created_by TEXT NOT NULL,
                approved_by TEXT,
                version INTEGER NOT NULL DEFAULT 1,
                journal_id TEXT,
                reversal_journal_id TEXT,
                posted_at TEXT,
                posted_by TEXT,
                reversed_at TEXT,
                reversed_by TEXT,
                stock_posted_at TEXT,
                stock_reversed_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS inventory_document_lines (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                line_no INTEGER NOT NULL,
                item_id TEXT NOT NULL,
                from_warehouse_id TEXT,
                to_warehouse_id TEXT,
                qty REAL NOT NULL DEFAULT 0,
                unit_cost REAL NOT NULL DEFAULT 0,
                total_cost REAL NOT NULL DEFAULT 0,
                project_id TEXT,
                cost_center_id TEXT,
                partner_id TEXT,
                expense_type_id TEXT,
                vehicle_id TEXT,
                remarks TEXT,
                adjustment_direction TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES inventory_documents(id) ON DELETE CASCADE
            )
        `);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS stock_ledger_entries (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                doc_id TEXT NOT NULL,
                doc_line_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                warehouse_id TEXT NOT NULL,
                qty_in REAL NOT NULL DEFAULT 0,
                qty_out REAL NOT NULL DEFAULT 0,
                unit_cost REAL NOT NULL DEFAULT 0,
                total_cost REAL NOT NULL DEFAULT 0,
                movement_side TEXT NOT NULL DEFAULT 'IN',
                is_reversal INTEGER NOT NULL DEFAULT 0,
                reversed_entry_id TEXT,
                movement_date TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reversed_entry_id) REFERENCES stock_ledger_entries(id)
            )
        `);
        this.ensureColumn('inventory_documents', 'journal_id', 'TEXT');
        this.ensureColumn('inventory_documents', 'reversal_journal_id', 'TEXT');
        this.ensureColumn('inventory_documents', 'posted_at', 'TEXT');
        this.ensureColumn('inventory_documents', 'posted_by', 'TEXT');
        this.ensureColumn('inventory_documents', 'reversed_at', 'TEXT');
        this.ensureColumn('inventory_documents', 'reversed_by', 'TEXT');
        this.ensureColumn('inventory_documents', 'stock_posted_at', 'TEXT');
        this.ensureColumn('inventory_documents', 'stock_reversed_at', 'TEXT');
        this.ensureColumn('inventory_document_lines', 'expense_type_id', 'TEXT');
        this.ensureColumn('inventory_document_lines', 'vehicle_id', 'TEXT');
        this.ensureColumn('inventory_document_lines', 'adjustment_direction', 'TEXT');
        this.ensureColumn('stock_ledger_entries', 'movement_side', "TEXT DEFAULT 'IN'");
        this.ensureColumn('stock_ledger_entries', 'is_reversal', 'INTEGER DEFAULT 0');
        this.ensureColumn('stock_ledger_entries', 'reversed_entry_id', 'TEXT');
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_inventory_documents_scope_status_date
                ON inventory_documents(company_id, branch_id, status, doc_date, id)
        `);
        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_documents_doc_no_scope
                ON inventory_documents(company_id, COALESCE(branch_id, ''), doc_type, doc_no)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_inventory_document_lines_doc_line
                ON inventory_document_lines(document_id, line_no)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_inventory_document_lines_item
                ON inventory_document_lines(item_id)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_stock_ledger_doc
                ON stock_ledger_entries(company_id, doc_type, doc_id, is_reversal)
        `);
        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_ledger_doc_line_side
                ON stock_ledger_entries(company_id, doc_type, doc_id, doc_line_id, warehouse_id, movement_side, is_reversal)
        `);
    }
    nextIdentity() {
        return (0, uuid_1.v4)();
    }
    nextDocumentNo(companyId, branchId, docType) {
        const normalizedDocType = String(docType || '').trim().toUpperCase();
        const sequenceKey = `inventory_${normalizedDocType.toLowerCase()}`;
        try {
            this.db.prepare(`
                INSERT OR IGNORE INTO doc_sequences(doc_type, next_no)
                VALUES(?, 1)
            `).run(sequenceKey);
            const row = this.db.prepare(`
                SELECT next_no
                FROM doc_sequences
                WHERE doc_type = ?
                LIMIT 1
            `).get(sequenceKey);
            const nextNo = Math.max(Number(row?.next_no || 1), 1);
            this.db.prepare(`
                UPDATE doc_sequences
                SET next_no = next_no + 1
                WHERE doc_type = ?
            `).run(sequenceKey);
            const prefix = this.getDocTypePrefix(normalizedDocType);
            return `${prefix}-${String(nextNo).padStart(5, '0')}`;
        }
        catch {
            const fallback = Date.now().toString().slice(-6);
            return `${this.getDocTypePrefix(normalizedDocType)}-${fallback}`;
        }
    }
    runInTransaction(work) {
        const tx = this.db.transaction(() => work());
        return tx();
    }
    createDocument(input) {
        this.db.prepare(`
            INSERT INTO inventory_documents (
                id,
                company_id,
                branch_id,
                doc_type,
                doc_no,
                doc_date,
                status,
                warehouse_id,
                to_warehouse_id,
                reference_no,
                remarks,
                currency_code,
                currency_rate,
                created_by,
                approved_by,
                version,
                created_at,
                updated_at
            ) VALUES (
                @id,
                @companyId,
                @branchId,
                @docType,
                @docNo,
                @docDate,
                @status,
                @warehouseId,
                @toWarehouseId,
                @referenceNo,
                @remarks,
                @currencyCode,
                @currencyRate,
                @createdBy,
                @approvedBy,
                @version,
                @createdAt,
                @updatedAt
            )
        `).run(input);
        const insertLine = this.db.prepare(`
            INSERT INTO inventory_document_lines (
                id,
                document_id,
                line_no,
                item_id,
                from_warehouse_id,
                to_warehouse_id,
                qty,
                unit_cost,
                total_cost,
                project_id,
                cost_center_id,
                partner_id,
                expense_type_id,
                vehicle_id,
                remarks,
                adjustment_direction,
                created_at,
                updated_at
            ) VALUES (
                @id,
                @documentId,
                @lineNo,
                @itemId,
                @fromWarehouseId,
                @toWarehouseId,
                @qty,
                @unitCost,
                @totalCost,
                @projectId,
                @costCenterId,
                @partnerId,
                @expenseTypeId,
                @vehicleId,
                @remarks,
                @adjustmentDirection,
                @createdAt,
                @updatedAt
            )
        `);
        for (const line of input.lines) {
            insertLine.run(line);
        }
        const document = this.getDocumentById(input.companyId, input.branchId, input.id);
        if (!document) {
            throw new errors_1.DomainError('INTERNAL_ERROR', `Inventory document ${input.id} was not found after create`);
        }
        return document;
    }
    updateDocument(input) {
        const updated = this.db.prepare(`
            UPDATE inventory_documents
            SET doc_date = @docDate,
                warehouse_id = @warehouseId,
                to_warehouse_id = @toWarehouseId,
                reference_no = @referenceNo,
                remarks = @remarks,
                currency_code = @currencyCode,
                currency_rate = @currencyRate,
                approved_by = @approvedBy,
                version = COALESCE(version, 1) + 1,
                updated_at = @updatedAt
            WHERE id = @id
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
              AND UPPER(COALESCE(status, 'DRAFT')) = 'DRAFT'
        `).run(input);
        if (Number(updated.changes || 0) === 0) {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Only draft inventory documents can be updated', {
                messageKey: 'error.inventory_document.update.not_draft',
                details: { documentId: input.id },
            });
        }
        this.db.prepare(`
            DELETE FROM inventory_document_lines
            WHERE document_id = ?
        `).run(input.id);
        const insertLine = this.db.prepare(`
            INSERT INTO inventory_document_lines (
                id,
                document_id,
                line_no,
                item_id,
                from_warehouse_id,
                to_warehouse_id,
                qty,
                unit_cost,
                total_cost,
                project_id,
                cost_center_id,
                partner_id,
                expense_type_id,
                vehicle_id,
                remarks,
                adjustment_direction,
                created_at,
                updated_at
            ) VALUES (
                @id,
                @documentId,
                @lineNo,
                @itemId,
                @fromWarehouseId,
                @toWarehouseId,
                @qty,
                @unitCost,
                @totalCost,
                @projectId,
                @costCenterId,
                @partnerId,
                @expenseTypeId,
                @vehicleId,
                @remarks,
                @adjustmentDirection,
                @createdAt,
                @updatedAt
            )
        `);
        for (const line of input.lines) {
            insertLine.run(line);
        }
        const document = this.getDocumentById(input.companyId, input.branchId, input.id);
        if (!document) {
            throw new errors_1.DomainError('INTERNAL_ERROR', `Inventory document ${input.id} was not found after update`);
        }
        return document;
    }
    getDocumentById(companyId, branchId, documentId) {
        const header = this.getDocumentHeaderById(companyId, branchId, documentId);
        if (!header)
            return null;
        return {
            header,
            lines: this.getDocumentLinesByDocumentId(documentId),
        };
    }
    getDocumentHeaderById(companyId, branchId, documentId) {
        const row = this.db.prepare(`
            SELECT
                id,
                COALESCE(company_id, 'COMP_01') AS company_id,
                COALESCE(branch_id, '') AS branch_id,
                COALESCE(doc_type, 'GOODS_RECEIPT') AS doc_type,
                COALESCE(doc_no, '') AS doc_no,
                COALESCE(doc_date, '') AS doc_date,
                COALESCE(status, 'DRAFT') AS status,
                NULLIF(TRIM(COALESCE(warehouse_id, '')), '') AS warehouse_id,
                NULLIF(TRIM(COALESCE(to_warehouse_id, '')), '') AS to_warehouse_id,
                NULLIF(TRIM(COALESCE(reference_no, '')), '') AS reference_no,
                NULLIF(TRIM(COALESCE(remarks, '')), '') AS remarks,
                COALESCE(currency_code, 'ILS') AS currency_code,
                COALESCE(currency_rate, 1) AS currency_rate,
                COALESCE(created_by, 'SYSTEM') AS created_by,
                NULLIF(TRIM(COALESCE(approved_by, '')), '') AS approved_by,
                COALESCE(version, 1) AS version,
                NULLIF(TRIM(COALESCE(journal_id, '')), '') AS journal_id,
                NULLIF(TRIM(COALESCE(reversal_journal_id, '')), '') AS reversal_journal_id,
                NULLIF(TRIM(COALESCE(posted_at, '')), '') AS posted_at,
                NULLIF(TRIM(COALESCE(posted_by, '')), '') AS posted_by,
                NULLIF(TRIM(COALESCE(reversed_at, '')), '') AS reversed_at,
                NULLIF(TRIM(COALESCE(reversed_by, '')), '') AS reversed_by,
                NULLIF(TRIM(COALESCE(stock_posted_at, '')), '') AS stock_posted_at,
                NULLIF(TRIM(COALESCE(stock_reversed_at, '')), '') AS stock_reversed_at,
                COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at,
                COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS updated_at
            FROM inventory_documents
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
            LIMIT 1
        `).get(documentId, companyId, branchId);
        if (!row)
            return null;
        return {
            id: row.id,
            companyId: String(row.company_id || 'COMP_01'),
            branchId: String(row.branch_id || ''),
            docType: this.normalizeDocType(row.doc_type),
            docNo: String(row.doc_no || ''),
            docDate: String(row.doc_date || ''),
            status: this.normalizeStatus(row.status),
            warehouseId: row.warehouse_id || null,
            toWarehouseId: row.to_warehouse_id || null,
            referenceNo: row.reference_no || null,
            remarks: row.remarks || null,
            currencyCode: String(row.currency_code || 'ILS').trim().toUpperCase(),
            currencyRate: Number(row.currency_rate || 1),
            createdBy: String(row.created_by || 'SYSTEM'),
            approvedBy: row.approved_by || null,
            version: Number(row.version || 1),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            postedAt: row.posted_at || null,
            postedBy: row.posted_by || null,
            reversedAt: row.reversed_at || null,
            reversedBy: row.reversed_by || null,
            stockPostedAt: row.stock_posted_at || null,
            stockReversedAt: row.stock_reversed_at || null,
            createdAt: String(row.created_at || ''),
            updatedAt: String(row.updated_at || ''),
        };
    }
    getDocumentLinesByDocumentId(documentId) {
        const rows = this.db.prepare(`
            SELECT
                id,
                document_id,
                COALESCE(line_no, rowid) AS line_no,
                COALESCE(item_id, '') AS item_id,
                NULLIF(TRIM(COALESCE(from_warehouse_id, '')), '') AS from_warehouse_id,
                NULLIF(TRIM(COALESCE(to_warehouse_id, '')), '') AS to_warehouse_id,
                COALESCE(qty, 0) AS qty,
                COALESCE(unit_cost, 0) AS unit_cost,
                COALESCE(total_cost, 0) AS total_cost,
                NULLIF(TRIM(COALESCE(project_id, '')), '') AS project_id,
                NULLIF(TRIM(COALESCE(cost_center_id, '')), '') AS cost_center_id,
                NULLIF(TRIM(COALESCE(partner_id, '')), '') AS partner_id,
                NULLIF(TRIM(COALESCE(expense_type_id, '')), '') AS expense_type_id,
                NULLIF(TRIM(COALESCE(vehicle_id, '')), '') AS vehicle_id,
                NULLIF(TRIM(COALESCE(remarks, '')), '') AS remarks,
                NULLIF(TRIM(COALESCE(adjustment_direction, '')), '') AS adjustment_direction,
                COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at,
                COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS updated_at
            FROM inventory_document_lines
            WHERE document_id = ?
            ORDER BY COALESCE(line_no, rowid)
        `).all(documentId);
        return rows.map((row) => ({
            id: row.id,
            documentId: row.document_id,
            lineNo: Number(row.line_no || 0),
            itemId: String(row.item_id || ''),
            fromWarehouseId: row.from_warehouse_id || null,
            toWarehouseId: row.to_warehouse_id || null,
            qty: Number(row.qty || 0),
            unitCost: Number(row.unit_cost || 0),
            totalCost: Number(row.total_cost || 0),
            projectId: row.project_id || null,
            costCenterId: row.cost_center_id || null,
            partnerId: row.partner_id || null,
            expenseTypeId: row.expense_type_id || null,
            vehicleId: row.vehicle_id || null,
            remarks: row.remarks || null,
            adjustmentDirection: this.normalizeAdjustmentDirection(row.adjustment_direction),
            createdAt: String(row.created_at || ''),
            updatedAt: String(row.updated_at || ''),
        }));
    }
    getItemById(itemId) {
        try {
            const row = this.db.prepare(`
                SELECT
                    id,
                    NULLIF(TRIM(COALESCE(item_group_id, '')), '') AS item_group_id,
                    COALESCE(is_active, 1) AS is_active,
                    COALESCE(is_stock_item, CASE
                        WHEN UPPER(COALESCE(type, item_type, 'ITEM')) IN ('SERVICE', 'SERVICES') THEN 0
                        ELSE 1
                    END) AS is_stock_item
                FROM items
                WHERE id = ?
                LIMIT 1
            `).get(itemId);
            if (!row)
                return null;
            return {
                id: row.id,
                itemGroupId: row.item_group_id || null,
                isActive: Number(row.is_active ?? 1) === 1,
                isStockItem: Number(row.is_stock_item ?? 1) === 1,
            };
        }
        catch {
            const fallback = this.db.prepare(`
                SELECT
                    id,
                    NULLIF(TRIM(COALESCE(item_group_id, '')), '') AS item_group_id
                FROM items
                WHERE id = ?
                LIMIT 1
            `).get(itemId);
            if (!fallback)
                return null;
            return {
                id: fallback.id,
                itemGroupId: fallback.item_group_id || null,
                isActive: true,
                isStockItem: true,
            };
        }
    }
    getWarehouseById(warehouseId) {
        const row = this.db.prepare(`
            SELECT
                id,
                COALESCE(is_active, 1) AS is_active
            FROM warehouses
            WHERE id = ?
            LIMIT 1
        `).get(warehouseId);
        if (!row)
            return null;
        return {
            id: row.id,
            isActive: Number(row.is_active ?? 1) === 1,
        };
    }
    isPerpetualInventoryEnabled(companyId) {
        try {
            const row = this.db.prepare(`
                SELECT value
                FROM settings
                WHERE key IN (
                    'inventory.perpetual',
                    'inventory_perpetual',
                    'inventory_mode',
                    'inventory_valuation_mode'
                )
                ORDER BY
                    CASE key
                        WHEN 'inventory.perpetual' THEN 1
                        WHEN 'inventory_perpetual' THEN 2
                        WHEN 'inventory_mode' THEN 3
                        WHEN 'inventory_valuation_mode' THEN 4
                        ELSE 100
                    END
                LIMIT 1
            `).get(companyId);
            const normalized = String(row?.value || '').trim().toUpperCase();
            if (!normalized)
                return true;
            if (normalized === 'PERIODIC')
                return false;
            return PERPETUAL_INVENTORY_TRUE_VALUES.has(normalized);
        }
        catch {
            return true;
        }
    }
    resolveCurrencyCode(rawCurrencyCode) {
        const normalized = String(rawCurrencyCode || '').trim();
        if (!normalized)
            return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized))
            return normalized.toUpperCase();
        try {
            const row = this.db.prepare(`
                SELECT code
                FROM currencies
                WHERE id = ? OR UPPER(code) = UPPER(?)
                LIMIT 1
            `).get(normalized, normalized);
            return String(row?.code || 'ILS').trim().toUpperCase() || 'ILS';
        }
        catch {
            return 'ILS';
        }
    }
    getPostingState(companyId, branchId, documentId) {
        const row = this.db.prepare(`
            SELECT
                id,
                COALESCE(status, 'DRAFT') AS status,
                COALESCE(version, 1) AS version,
                NULLIF(TRIM(COALESCE(journal_id, '')), '') AS journal_id,
                NULLIF(TRIM(COALESCE(reversal_journal_id, '')), '') AS reversal_journal_id,
                NULLIF(TRIM(COALESCE(posted_at, '')), '') AS posted_at,
                NULLIF(TRIM(COALESCE(reversed_at, '')), '') AS reversed_at,
                NULLIF(TRIM(COALESCE(stock_posted_at, '')), '') AS stock_posted_at,
                NULLIF(TRIM(COALESCE(stock_reversed_at, '')), '') AS stock_reversed_at
            FROM inventory_documents
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
            LIMIT 1
        `).get(documentId, companyId, branchId);
        if (!row)
            return null;
        return {
            documentId: row.id,
            status: row.status,
            version: Number(row.version || 1),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            postedAt: row.posted_at || null,
            reversedAt: row.reversed_at || null,
            stockPostedAt: row.stock_posted_at || null,
            stockReversedAt: row.stock_reversed_at || null,
        };
    }
    savePostingState(input) {
        this.db.prepare(`
            UPDATE inventory_documents
            SET status = @nextStatus,
                journal_id = COALESCE(@journalId, journal_id),
                posted_by = COALESCE(@postedBy, posted_by),
                posted_at = @postedAt,
                stock_posted_at = @stockPostedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @postedAt
            WHERE id = @documentId
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
        `).run(input);
    }
    saveReversalState(input) {
        this.db.prepare(`
            UPDATE inventory_documents
            SET status = @nextStatus,
                reversal_journal_id = COALESCE(@reversalJournalId, reversal_journal_id),
                reversed_by = COALESCE(@reversedBy, reversed_by),
                reversed_at = @reversedAt,
                stock_reversed_at = @stockReversedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @reversedAt
            WHERE id = @documentId
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
        `).run(input);
    }
    hasStockLedgerPosting(companyId, docType, docId) {
        const row = this.db.prepare(`
            SELECT 1 AS ok
            FROM stock_ledger_entries
            WHERE company_id = ?
              AND doc_type = ?
              AND doc_id = ?
              AND COALESCE(is_reversal, 0) = 0
            LIMIT 1
        `).get(companyId, docType, docId);
        return Boolean(row?.ok);
    }
    hasStockLedgerReversal(companyId, docType, docId) {
        const row = this.db.prepare(`
            SELECT 1 AS ok
            FROM stock_ledger_entries
            WHERE company_id = ?
              AND doc_type = ?
              AND doc_id = ?
              AND COALESCE(is_reversal, 0) = 1
            LIMIT 1
        `).get(companyId, docType, docId);
        return Boolean(row?.ok);
    }
    listStockLedgerEntries(companyId, docType, docId, isReversal) {
        const rows = this.db.prepare(`
            SELECT
                id,
                company_id,
                branch_id,
                doc_type,
                doc_id,
                doc_line_id,
                item_id,
                warehouse_id,
                COALESCE(qty_in, 0) AS qty_in,
                COALESCE(qty_out, 0) AS qty_out,
                COALESCE(unit_cost, 0) AS unit_cost,
                COALESCE(total_cost, 0) AS total_cost,
                COALESCE(movement_side, CASE WHEN COALESCE(qty_out, 0) > 0 THEN 'OUT' ELSE 'IN' END) AS movement_side,
                COALESCE(is_reversal, 0) AS is_reversal,
                NULLIF(TRIM(COALESCE(reversed_entry_id, '')), '') AS reversed_entry_id,
                movement_date,
                created_at
            FROM stock_ledger_entries
            WHERE company_id = ?
              AND doc_type = ?
              AND doc_id = ?
              AND COALESCE(is_reversal, 0) = ?
            ORDER BY created_at, id
        `).all(companyId, docType, docId, isReversal ? 1 : 0);
        return rows.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            docType: this.normalizeDocType(row.doc_type),
            docId: row.doc_id,
            docLineId: row.doc_line_id,
            itemId: row.item_id,
            warehouseId: row.warehouse_id,
            qtyIn: Number(row.qty_in || 0),
            qtyOut: Number(row.qty_out || 0),
            unitCost: Number(row.unit_cost || 0),
            totalCost: Number(row.total_cost || 0),
            movementSide: String(row.movement_side || 'IN').trim().toUpperCase() === 'OUT' ? 'OUT' : 'IN',
            isReversal: Number(row.is_reversal || 0) === 1,
            reversedEntryId: row.reversed_entry_id || null,
            movementDate: row.movement_date,
            createdAt: row.created_at,
        }));
    }
    insertStockLedgerEntries(entries) {
        if (!entries.length)
            return;
        const insert = this.db.prepare(`
            INSERT INTO stock_ledger_entries (
                id,
                company_id,
                branch_id,
                doc_type,
                doc_id,
                doc_line_id,
                item_id,
                warehouse_id,
                qty_in,
                qty_out,
                unit_cost,
                total_cost,
                movement_side,
                is_reversal,
                reversed_entry_id,
                movement_date,
                created_at
            ) VALUES (
                @id,
                @companyId,
                @branchId,
                @docType,
                @docId,
                @docLineId,
                @itemId,
                @warehouseId,
                @qtyIn,
                @qtyOut,
                @unitCost,
                @totalCost,
                @movementSide,
                @isReversal,
                @reversedEntryId,
                @movementDate,
                @createdAt
            )
        `);
        const tx = this.db.transaction((rows) => {
            for (const row of rows) {
                insert.run(row);
            }
        });
        tx(entries);
    }
    ensureColumn(tableName, columnName, typeDefinition) {
        const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        if (columns.some((column) => column.name === columnName)) {
            return;
        }
        this.db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${typeDefinition}`).run();
    }
    normalizeDocType(rawType) {
        const normalized = String(rawType || '').trim().toUpperCase();
        if (normalized === 'GOODS_ISSUE')
            return 'GOODS_ISSUE';
        if (normalized === 'STOCK_TRANSFER')
            return 'STOCK_TRANSFER';
        if (normalized === 'STOCK_ADJUSTMENT')
            return 'STOCK_ADJUSTMENT';
        return 'GOODS_RECEIPT';
    }
    normalizeStatus(rawStatus) {
        const normalized = String(rawStatus || '').trim().toUpperCase();
        if (normalized === 'POSTED')
            return 'POSTED';
        if (normalized === 'CANCELLED')
            return 'CANCELLED';
        return 'DRAFT';
    }
    normalizeAdjustmentDirection(rawDirection) {
        const normalized = String(rawDirection || '').trim().toUpperCase();
        if (normalized === 'OUT')
            return 'OUT';
        if (normalized === 'IN')
            return 'IN';
        return null;
    }
    getDocTypePrefix(docType) {
        switch (docType) {
            case 'GOODS_RECEIPT':
                return 'GRN';
            case 'GOODS_ISSUE':
                return 'GIS';
            case 'STOCK_TRANSFER':
                return 'STR';
            case 'STOCK_ADJUSTMENT':
                return 'SAD';
            default:
                return 'INV';
        }
    }
}
exports.SqliteInventoryDocumentRepo = SqliteInventoryDocumentRepo;
