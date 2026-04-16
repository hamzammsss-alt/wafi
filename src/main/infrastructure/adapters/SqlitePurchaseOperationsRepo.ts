import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../domain/errors';
import {
    PurchaseOperationDocumentEntity,
    PurchaseOperationDocumentType,
    PurchaseOperationHeaderEntity,
    PurchaseOperationLineEntity,
    PurchaseOperationLineLinkEntity,
    PurchaseOperationPolicy,
    PurchaseOperationStatus,
} from '../../domain/purchaseOperations/types/PurchaseOperationsTypes';
import {
    PurchaseCreateDocumentDbInput,
    PurchaseCreateLinkInput,
    PurchaseVendorRecord,
    PurchaseItemRecord,
    PurchaseOperationsRepositoryPort,
    PurchasePostingStateRecord,
    PurchaseCommitmentRecord,
    PurchaseSavePostingStateInput,
    PurchaseSaveReversalStateInput,
    PurchaseStockLedgerEntryRecord,
    PurchaseUpdateDocumentDbInput,
    PurchaseWarehouseRecord,
} from '../../application/ports/PurchaseOperationsPorts';

type HeaderRow = {
    id: string;
    company_id: string | null;
    branch_id: string | null;
    doc_type: string | null;
    doc_no: string | null;
    doc_date: string | null;
    status: string | null;
    vendor_id: string | null;
    warehouse_id: string | null;
    currency_code: string | null;
    currency_rate: number | null;
    subtotal: number | null;
    discount_amount: number | null;
    taxable_amount: number | null;
    vat_amount: number | null;
    total_amount: number | null;
    reference_no: string | null;
    remarks: string | null;
    source_doc_type: string | null;
    source_doc_id: string | null;
    created_by: string | null;
    approved_by: string | null;
    version: number | null;
    journal_id: string | null;
    reversal_journal_id: string | null;
    posted_at: string | null;
    posted_by: string | null;
    reversed_at: string | null;
    reversed_by: string | null;
    stock_posted_at: string | null;
    stock_reversed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type LineRow = {
    id: string;
    document_id: string;
    line_no: number | null;
    item_id: string | null;
    line_type: string | null;
    warehouse_id: string | null;
    qty: number | null;
    received_qty: number | null;
    returned_qty: number | null;
    billed_qty: number | null;
    reserved_qty: number | null;
    unit_price: number | null;
    discount_amount: number | null;
    line_subtotal: number | null;
    taxable_amount: number | null;
    vat_amount: number | null;
    line_total: number | null;
    unit_cost: number | null;
    expense_type_id: string | null;
    vehicle_id: string | null;
    project_id: string | null;
    cost_center_id: string | null;
    partner_id: string | null;
    remarks: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type LinkRow = {
    id: string;
    company_id: string;
    branch_id: string;
    source_doc_type: string;
    source_doc_id: string;
    source_line_id: string;
    target_doc_type: string;
    target_doc_id: string;
    target_line_id: string;
    qty: number | null;
    created_at: string;
};

type PostingStateRow = {
    id: string;
    status: string | null;
    version: number | null;
    journal_id: string | null;
    reversal_journal_id: string | null;
    posted_at: string | null;
    reversed_at: string | null;
    stock_posted_at: string | null;
    stock_reversed_at: string | null;
};

type StockLedgerRow = {
    id: string;
    company_id: string;
    branch_id: string;
    doc_type: string;
    doc_id: string;
    doc_line_id: string;
    item_id: string;
    warehouse_id: string;
    qty_in: number | null;
    qty_out: number | null;
    unit_cost: number | null;
    total_cost: number | null;
    movement_side: string | null;
    is_reversal: number | null;
    reversed_entry_id: string | null;
    movement_date: string;
    created_at: string;
};

const TRUE_VALUES = new Set(['1', 'TRUE', 'YES', 'Y', 'ON', 'DELIVERY', 'RECEIPT']);

export class SqlitePurchaseOperationsRepo implements PurchaseOperationsRepositoryPort {
    constructor(private readonly db: Database.Database) {}

    ensureSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS purchase_operation_documents (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                doc_no TEXT NOT NULL,
                doc_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                vendor_id TEXT,
                warehouse_id TEXT,
                currency_code TEXT NOT NULL DEFAULT 'ILS',
                currency_rate REAL NOT NULL DEFAULT 1,
                subtotal REAL NOT NULL DEFAULT 0,
                discount_amount REAL NOT NULL DEFAULT 0,
                taxable_amount REAL NOT NULL DEFAULT 0,
                vat_amount REAL NOT NULL DEFAULT 0,
                total_amount REAL NOT NULL DEFAULT 0,
                reference_no TEXT,
                remarks TEXT,
                source_doc_type TEXT,
                source_doc_id TEXT,
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
            CREATE TABLE IF NOT EXISTS purchase_operation_document_lines (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                line_no INTEGER NOT NULL,
                item_id TEXT,
                line_type TEXT NOT NULL DEFAULT 'INVENTORY',
                warehouse_id TEXT,
                qty REAL NOT NULL DEFAULT 0,
                received_qty REAL NOT NULL DEFAULT 0,
                returned_qty REAL NOT NULL DEFAULT 0,
                billed_qty REAL NOT NULL DEFAULT 0,
                reserved_qty REAL NOT NULL DEFAULT 0,
                unit_price REAL NOT NULL DEFAULT 0,
                discount_amount REAL NOT NULL DEFAULT 0,
                line_subtotal REAL NOT NULL DEFAULT 0,
                taxable_amount REAL NOT NULL DEFAULT 0,
                vat_amount REAL NOT NULL DEFAULT 0,
                line_total REAL NOT NULL DEFAULT 0,
                unit_cost REAL,
                expense_type_id TEXT,
                vehicle_id TEXT,
                project_id TEXT,
                cost_center_id TEXT,
                partner_id TEXT,
                remarks TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES purchase_operation_documents(id) ON DELETE CASCADE
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS purchase_operation_line_links (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                source_doc_type TEXT NOT NULL,
                source_doc_id TEXT NOT NULL,
                source_line_id TEXT NOT NULL,
                target_doc_type TEXT NOT NULL,
                target_doc_id TEXT NOT NULL,
                target_line_id TEXT NOT NULL,
                qty REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS purchase_commitments (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                purchase_order_id TEXT NOT NULL,
                purchase_order_line_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                warehouse_id TEXT NOT NULL,
                expected_qty REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

        this.ensureColumn('stock_ledger_entries', 'movement_side', "TEXT DEFAULT 'IN'");
        this.ensureColumn('stock_ledger_entries', 'is_reversal', 'INTEGER DEFAULT 0');
        this.ensureColumn('stock_ledger_entries', 'reversed_entry_id', 'TEXT');
        this.ensureColumn('purchase_operation_document_lines', 'line_type', "TEXT DEFAULT 'INVENTORY'");
        this.ensureColumn('purchase_operation_document_lines', 'expense_type_id', 'TEXT');
        this.ensureColumn('purchase_operation_document_lines', 'vehicle_id', 'TEXT');
        this.ensureColumn('purchase_commitments', 'expected_qty', 'REAL DEFAULT 0');
        try {
            this.db.prepare(`
                UPDATE purchase_commitments
                SET expected_qty = COALESCE(expected_qty, COALESCE(reserved_qty, 0))
                WHERE COALESCE(expected_qty, 0) = 0
            `).run();
        } catch {
            // ignore when legacy reserved_qty column does not exist
        }

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_purchase_ops_documents_scope
                ON purchase_operation_documents(company_id, branch_id, doc_type, status, doc_date)
        `);
        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_ops_documents_doc_no
                ON purchase_operation_documents(company_id, COALESCE(branch_id, ''), doc_type, doc_no)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_purchase_ops_lines_document
                ON purchase_operation_document_lines(document_id, line_no)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_purchase_ops_lines_item
                ON purchase_operation_document_lines(item_id)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_purchase_ops_links_source
                ON purchase_operation_line_links(company_id, source_doc_id, source_line_id)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_purchase_ops_links_target
                ON purchase_operation_line_links(company_id, target_doc_id, target_line_id)
        `);
        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_ops_links_pair
                ON purchase_operation_line_links(company_id, source_line_id, target_line_id)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_purchase_commitments_order
                ON purchase_commitments(company_id, purchase_order_id, purchase_order_line_id)
        `);
        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_commitments_line
                ON purchase_commitments(company_id, purchase_order_line_id, item_id, warehouse_id)
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_purchase_stock_ledger_doc
                ON stock_ledger_entries(company_id, doc_type, doc_id, is_reversal)
        `);
        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_stock_ledger_line
                ON stock_ledger_entries(company_id, doc_type, doc_id, doc_line_id, warehouse_id, movement_side, is_reversal)
        `);
    }

    nextIdentity(): string {
        return uuidv4();
    }

    nextDocumentNo(companyId: string, branchId: string, docType: PurchaseOperationDocumentType): string {
        const normalizedType = this.normalizeDocType(docType);
        const sequenceKey = `purchase_ops_${normalizedType.toLowerCase()}`;

        this.db.prepare(`
            INSERT OR IGNORE INTO doc_sequences(doc_type, next_no)
            VALUES(?, 1)
        `).run(sequenceKey);

        const row = this.db.prepare(`
            SELECT next_no
            FROM doc_sequences
            WHERE doc_type = ?
            LIMIT 1
        `).get(sequenceKey) as { next_no?: number } | undefined;

        const nextNo = Math.max(Number(row?.next_no || 1), 1);
        this.db.prepare(`
            UPDATE doc_sequences
            SET next_no = next_no + 1
            WHERE doc_type = ?
        `).run(sequenceKey);

        return `${this.getDocTypePrefix(normalizedType)}-${String(nextNo).padStart(5, '0')}`;
    }

    runInTransaction<T>(work: () => T): T {
        const tx = this.db.transaction(() => work());
        return tx();
    }
    createDocument(input: PurchaseCreateDocumentDbInput): PurchaseOperationDocumentEntity {
        this.db.prepare(`
            INSERT INTO purchase_operation_documents (
                id, company_id, branch_id, doc_type, doc_no, doc_date, status,
                vendor_id, warehouse_id, currency_code, currency_rate,
                subtotal, discount_amount, taxable_amount, vat_amount, total_amount,
                reference_no, remarks, source_doc_type, source_doc_id,
                created_by, approved_by, version, created_at, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @docType, @docNo, @docDate, @status,
                @vendorId, @warehouseId, @currencyCode, @currencyRate,
                @subtotal, @discountAmount, @taxableAmount, @vatAmount, @totalAmount,
                @referenceNo, @remarks, @sourceDocType, @sourceDocId,
                @createdBy, @approvedBy, @version, @createdAt, @updatedAt
            )
        `).run(input);

        const insertLine = this.db.prepare(`
            INSERT INTO purchase_operation_document_lines (
                id, document_id, line_no, item_id, line_type, warehouse_id,
                qty, received_qty, returned_qty, billed_qty, reserved_qty,
                unit_price, discount_amount, line_subtotal, taxable_amount, vat_amount, line_total,
                unit_cost, expense_type_id, vehicle_id, project_id, cost_center_id, partner_id, remarks,
                created_at, updated_at
            ) VALUES (
                @id, @documentId, @lineNo, @itemId, @lineType, @warehouseId,
                @qty, @receivedQty, @returnedQty, @billedQty, @reservedQty,
                @unitPrice, @discountAmount, @lineSubtotal, @taxableAmount, @vatAmount, @lineTotal,
                @unitCost, @expenseTypeId, @vehicleId, @projectId, @costCenterId, @partnerId, @remarks,
                @createdAt, @updatedAt
            )
        `);

        for (const line of input.lines) {
            insertLine.run(line);
        }

        const created = this.getDocumentById(input.companyId, input.branchId, input.id);
        if (!created) {
            throw new DomainError('INTERNAL_ERROR', 'Purchase operation document was not found after create', {
                details: { documentId: input.id },
            });
        }

        return created;
    }

    updateDocument(input: PurchaseUpdateDocumentDbInput): PurchaseOperationDocumentEntity {
        const info = this.db.prepare(`
            UPDATE purchase_operation_documents
            SET doc_date = @docDate,
                vendor_id = @vendorId,
                warehouse_id = @warehouseId,
                currency_code = @currencyCode,
                currency_rate = @currencyRate,
                subtotal = @subtotal,
                discount_amount = @discountAmount,
                taxable_amount = @taxableAmount,
                vat_amount = @vatAmount,
                total_amount = @totalAmount,
                reference_no = @referenceNo,
                remarks = @remarks,
                approved_by = @approvedBy,
                version = COALESCE(version, 1) + 1,
                updated_at = @updatedAt
            WHERE id = @id
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
              AND UPPER(COALESCE(status, 'DRAFT')) = 'DRAFT'
        `).run(input);

        if (Number(info.changes || 0) === 0) {
            throw new DomainError('INVALID_TRANSITION', 'Only draft purchase documents can be updated', {
                messageKey: 'error.purchase_operations.update.not_draft',
                details: { documentId: input.id },
            });
        }

        this.db.prepare('DELETE FROM purchase_operation_document_lines WHERE document_id = ?').run(input.id);

        const insertLine = this.db.prepare(`
            INSERT INTO purchase_operation_document_lines (
                id, document_id, line_no, item_id, line_type, warehouse_id,
                qty, received_qty, returned_qty, billed_qty, reserved_qty,
                unit_price, discount_amount, line_subtotal, taxable_amount, vat_amount, line_total,
                unit_cost, expense_type_id, vehicle_id, project_id, cost_center_id, partner_id, remarks,
                created_at, updated_at
            ) VALUES (
                @id, @documentId, @lineNo, @itemId, @lineType, @warehouseId,
                @qty, @receivedQty, @returnedQty, @billedQty, @reservedQty,
                @unitPrice, @discountAmount, @lineSubtotal, @taxableAmount, @vatAmount, @lineTotal,
                @unitCost, @expenseTypeId, @vehicleId, @projectId, @costCenterId, @partnerId, @remarks,
                @createdAt, @updatedAt
            )
        `);

        for (const line of input.lines) {
            insertLine.run(line);
        }

        const updated = this.getDocumentById(input.companyId, input.branchId, input.id);
        if (!updated) {
            throw new DomainError('INTERNAL_ERROR', 'Purchase operation document was not found after update', {
                details: { documentId: input.id },
            });
        }

        return updated;
    }

    getDocumentById(companyId: string, branchId: string, documentId: string): PurchaseOperationDocumentEntity | null {
        const header = this.getDocumentHeaderById(companyId, branchId, documentId);
        if (!header) return null;
        return {
            header,
            lines: this.getDocumentLinesByDocumentId(documentId),
        };
    }

    getDocumentHeaderById(companyId: string, branchId: string, documentId: string): PurchaseOperationHeaderEntity | null {
        const row = this.db.prepare(`
            SELECT
                id,
                COALESCE(company_id, 'COMP_01') AS company_id,
                COALESCE(branch_id, '') AS branch_id,
                COALESCE(doc_type, 'PURCHASE_REQUEST') AS doc_type,
                COALESCE(doc_no, '') AS doc_no,
                COALESCE(doc_date, '') AS doc_date,
                COALESCE(status, 'DRAFT') AS status,
                NULLIF(TRIM(COALESCE(vendor_id, '')), '') AS vendor_id,
                NULLIF(TRIM(COALESCE(warehouse_id, '')), '') AS warehouse_id,
                COALESCE(currency_code, 'ILS') AS currency_code,
                COALESCE(currency_rate, 1) AS currency_rate,
                COALESCE(subtotal, 0) AS subtotal,
                COALESCE(discount_amount, 0) AS discount_amount,
                COALESCE(taxable_amount, 0) AS taxable_amount,
                COALESCE(vat_amount, 0) AS vat_amount,
                COALESCE(total_amount, 0) AS total_amount,
                NULLIF(TRIM(COALESCE(reference_no, '')), '') AS reference_no,
                NULLIF(TRIM(COALESCE(remarks, '')), '') AS remarks,
                NULLIF(TRIM(COALESCE(source_doc_type, '')), '') AS source_doc_type,
                NULLIF(TRIM(COALESCE(source_doc_id, '')), '') AS source_doc_id,
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
            FROM purchase_operation_documents
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
            LIMIT 1
        `).get(documentId, companyId, branchId) as HeaderRow | undefined;

        if (!row) return null;

        return {
            id: row.id,
            companyId: String(row.company_id || 'COMP_01'),
            branchId: String(row.branch_id || ''),
            docType: this.normalizeDocType(row.doc_type),
            docNo: String(row.doc_no || ''),
            docDate: String(row.doc_date || ''),
            status: this.normalizeStatus(row.status),
            vendorId: row.vendor_id || null,
            warehouseId: row.warehouse_id || null,
            currencyCode: String(row.currency_code || 'ILS').trim().toUpperCase(),
            currencyRate: Number(row.currency_rate || 1),
            subtotal: Number(row.subtotal || 0),
            discountAmount: Number(row.discount_amount || 0),
            taxableAmount: Number(row.taxable_amount || 0),
            vatAmount: Number(row.vat_amount || 0),
            totalAmount: Number(row.total_amount || 0),
            referenceNo: row.reference_no || null,
            remarks: row.remarks || null,
            sourceDocType: row.source_doc_type ? this.normalizeDocType(row.source_doc_type) : null,
            sourceDocId: row.source_doc_id || null,
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

    getDocumentLinesByDocumentId(documentId: string): PurchaseOperationLineEntity[] {
        const rows = this.db.prepare(`
            SELECT
                id,
                document_id,
                COALESCE(line_no, rowid) AS line_no,
                NULLIF(TRIM(COALESCE(item_id, '')), '') AS item_id,
                UPPER(COALESCE(line_type, 'INVENTORY')) AS line_type,
                NULLIF(TRIM(COALESCE(warehouse_id, '')), '') AS warehouse_id,
                COALESCE(qty, 0) AS qty,
                COALESCE(received_qty, 0) AS received_qty,
                COALESCE(returned_qty, 0) AS returned_qty,
                COALESCE(billed_qty, 0) AS billed_qty,
                COALESCE(reserved_qty, 0) AS reserved_qty,
                COALESCE(unit_price, 0) AS unit_price,
                COALESCE(discount_amount, 0) AS discount_amount,
                COALESCE(line_subtotal, 0) AS line_subtotal,
                COALESCE(taxable_amount, 0) AS taxable_amount,
                COALESCE(vat_amount, 0) AS vat_amount,
                COALESCE(line_total, 0) AS line_total,
                unit_cost,
                NULLIF(TRIM(COALESCE(expense_type_id, '')), '') AS expense_type_id,
                NULLIF(TRIM(COALESCE(vehicle_id, '')), '') AS vehicle_id,
                NULLIF(TRIM(COALESCE(project_id, '')), '') AS project_id,
                NULLIF(TRIM(COALESCE(cost_center_id, '')), '') AS cost_center_id,
                NULLIF(TRIM(COALESCE(partner_id, '')), '') AS partner_id,
                NULLIF(TRIM(COALESCE(remarks, '')), '') AS remarks,
                COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at,
                COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS updated_at
            FROM purchase_operation_document_lines
            WHERE document_id = ?
            ORDER BY COALESCE(line_no, rowid)
        `).all(documentId) as LineRow[];

        return rows.map((row) => this.mapLineRow(row));
    }

    getLineById(lineId: string): PurchaseOperationLineEntity | null {
        const row = this.db.prepare(`
            SELECT
                id,
                document_id,
                COALESCE(line_no, rowid) AS line_no,
                NULLIF(TRIM(COALESCE(item_id, '')), '') AS item_id,
                UPPER(COALESCE(line_type, 'INVENTORY')) AS line_type,
                NULLIF(TRIM(COALESCE(warehouse_id, '')), '') AS warehouse_id,
                COALESCE(qty, 0) AS qty,
                COALESCE(received_qty, 0) AS received_qty,
                COALESCE(returned_qty, 0) AS returned_qty,
                COALESCE(billed_qty, 0) AS billed_qty,
                COALESCE(reserved_qty, 0) AS reserved_qty,
                COALESCE(unit_price, 0) AS unit_price,
                COALESCE(discount_amount, 0) AS discount_amount,
                COALESCE(line_subtotal, 0) AS line_subtotal,
                COALESCE(taxable_amount, 0) AS taxable_amount,
                COALESCE(vat_amount, 0) AS vat_amount,
                COALESCE(line_total, 0) AS line_total,
                unit_cost,
                NULLIF(TRIM(COALESCE(expense_type_id, '')), '') AS expense_type_id,
                NULLIF(TRIM(COALESCE(vehicle_id, '')), '') AS vehicle_id,
                NULLIF(TRIM(COALESCE(project_id, '')), '') AS project_id,
                NULLIF(TRIM(COALESCE(cost_center_id, '')), '') AS cost_center_id,
                NULLIF(TRIM(COALESCE(partner_id, '')), '') AS partner_id,
                NULLIF(TRIM(COALESCE(remarks, '')), '') AS remarks,
                COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at,
                COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS updated_at
            FROM purchase_operation_document_lines
            WHERE id = ?
            LIMIT 1
        `).get(lineId) as LineRow | undefined;

        return row ? this.mapLineRow(row) : null;
    }
    getVendorById(vendorId: string): PurchaseVendorRecord | null {
        const row = this.db.prepare(`
            SELECT id, COALESCE(is_active, 1) AS is_active
            FROM business_partners
            WHERE id = ?
            LIMIT 1
        `).get(vendorId) as { id: string; is_active: number | null } | undefined;

        if (!row) return null;
        return { id: row.id, isActive: Number(row.is_active ?? 1) === 1 };
    }

    getItemById(itemId: string): PurchaseItemRecord | null {
        const row = this.db.prepare(`
            SELECT
                id,
                NULLIF(TRIM(COALESCE(item_group_id, '')), '') AS item_group_id,
                COALESCE(is_active, 1) AS is_active,
                COALESCE(is_stock_item, CASE
                    WHEN UPPER(COALESCE(type, item_type, 'ITEM')) IN ('SERVICE', 'SERVICES') THEN 0
                    ELSE 1
                END) AS is_stock_item,
                COALESCE(cost_price, 0) AS cost_price
            FROM items
            WHERE id = ?
            LIMIT 1
        `).get(itemId) as {
            id: string;
            item_group_id: string | null;
            is_active: number | null;
            is_stock_item: number | null;
            cost_price: number | null;
        } | undefined;

        if (!row) return null;
        return {
            id: row.id,
            itemGroupId: row.item_group_id || null,
            isActive: Number(row.is_active ?? 1) === 1,
            isStockItem: Number(row.is_stock_item ?? 1) === 1,
            defaultUnitCost: Number(row.cost_price || 0),
        };
    }

    getWarehouseById(warehouseId: string): PurchaseWarehouseRecord | null {
        const row = this.db.prepare(`
            SELECT id, COALESCE(is_active, 1) AS is_active
            FROM warehouses
            WHERE id = ?
            LIMIT 1
        `).get(warehouseId) as { id: string; is_active: number | null } | undefined;

        if (!row) return null;
        return {
            id: row.id,
            isActive: Number(row.is_active ?? 1) === 1,
        };
    }

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string {
        const normalized = String(rawCurrencyCode || '').trim();
        if (!normalized) return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized)) return normalized.toUpperCase();

        const row = this.db.prepare(`
            SELECT code
            FROM currencies
            WHERE id = ? OR UPPER(code) = UPPER(?)
            LIMIT 1
        `).get(normalized, normalized) as { code?: string | null } | undefined;

        return String(row?.code || 'ILS').trim().toUpperCase() || 'ILS';
    }

    getPolicy(_companyId: string): PurchaseOperationPolicy {
        const getSetting = (keys: string[]): string => {
            for (const key of keys) {
                const row = this.db.prepare('SELECT value FROM settings WHERE key = ? LIMIT 1').get(key) as { value?: string | null } | undefined;
                const value = String(row?.value || '').trim();
                if (value) return value;
            }
            return '';
        };

        const receiptAccountingModeRaw = getSetting([
            'purchase.grn.accounting_mode',
            'purchase_grn_accounting_mode',
            'purchase.receipt.accounting_mode',
            'purchase_receipt_accounting_mode',
        ]).toUpperCase();

        const overReceiptRaw = getSetting([
            'purchase.allow_over_receipt',
            'purchase_allow_over_receipt',
            'purchase.allow_over_receive',
            'purchase_allow_over_receive',
        ]).toUpperCase();
        const overReturnRaw = getSetting(['purchase.allow_over_return', 'purchase_allow_over_return']).toUpperCase();
        const returnFinancialRaw = getSetting([
            'purchase.return.financial_impact',
            'purchase_return_financial_impact',
            'purchase.return_cost_reversal',
            'purchase_return_cost_reversal',
        ]).toUpperCase();

        return {
            receiptAccountingMode: receiptAccountingModeRaw === 'RECEIPT' ? 'RECEIPT' : 'INVOICE',
            returnFinancialImpactEnabled: returnFinancialRaw ? TRUE_VALUES.has(returnFinancialRaw) : true,
            allowOverReceipt: TRUE_VALUES.has(overReceiptRaw),
            allowOverReturn: TRUE_VALUES.has(overReturnRaw),
        };
    }

    listLinksBySource(companyId: string, sourceDocId: string): PurchaseOperationLineLinkEntity[] {
        const rows = this.db.prepare(`
            SELECT *
            FROM purchase_operation_line_links
            WHERE company_id = ?
              AND source_doc_id = ?
            ORDER BY created_at, id
        `).all(companyId, sourceDocId) as LinkRow[];

        return rows.map((row) => this.mapLinkRow(row));
    }

    listLinksByTarget(companyId: string, targetDocId: string): PurchaseOperationLineLinkEntity[] {
        const rows = this.db.prepare(`
            SELECT *
            FROM purchase_operation_line_links
            WHERE company_id = ?
              AND target_doc_id = ?
            ORDER BY created_at, id
        `).all(companyId, targetDocId) as LinkRow[];

        return rows.map((row) => this.mapLinkRow(row));
    }

    createLinks(links: PurchaseCreateLinkInput[]): void {
        if (!links.length) return;
        const insert = this.db.prepare(`
            INSERT OR IGNORE INTO purchase_operation_line_links (
                id, company_id, branch_id,
                source_doc_type, source_doc_id, source_line_id,
                target_doc_type, target_doc_id, target_line_id,
                qty, created_at
            ) VALUES (
                @id, @companyId, @branchId,
                @sourceDocType, @sourceDocId, @sourceLineId,
                @targetDocType, @targetDocId, @targetLineId,
                @qty, @createdAt
            )
        `);

        for (const link of links) {
            insert.run(link);
        }
    }

    listCommitmentsByOrder(companyId: string, orderId: string): PurchaseCommitmentRecord[] {
        const rows = this.db.prepare(`
            SELECT
                id,
                company_id,
                branch_id,
                purchase_order_id,
                purchase_order_line_id,
                item_id,
                warehouse_id,
                COALESCE(expected_qty, 0) AS expected_qty,
                created_at
            FROM purchase_commitments
            WHERE company_id = ?
              AND purchase_order_id = ?
            ORDER BY created_at, id
        `).all(companyId, orderId) as Array<{
            id: string;
            company_id: string;
            branch_id: string;
            purchase_order_id: string;
            purchase_order_line_id: string;
            item_id: string;
            warehouse_id: string;
            expected_qty: number;
            created_at: string;
        }>;

        return rows.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            purchaseOrderId: row.purchase_order_id,
            purchaseOrderLineId: row.purchase_order_line_id,
            itemId: row.item_id,
            warehouseId: row.warehouse_id,
            expectedQty: Number(row.expected_qty || 0),
            createdAt: row.created_at,
        }));
    }

    replaceCommitmentsForOrder(companyId: string, branchId: string, orderId: string, entries: PurchaseCommitmentRecord[]): void {
        this.db.prepare(`
            DELETE FROM purchase_commitments
            WHERE company_id = ?
              AND purchase_order_id = ?
        `).run(companyId, orderId);

        if (!entries.length) return;

        const insert = this.db.prepare(`
            INSERT INTO purchase_commitments (
                id, company_id, branch_id, purchase_order_id, purchase_order_line_id,
                item_id, warehouse_id, expected_qty, created_at
            ) VALUES (
                @id, @companyId, @branchId, @purchaseOrderId, @purchaseOrderLineId,
                @itemId, @warehouseId, @expectedQty, @createdAt
            )
        `);

        for (const entry of entries) {
            insert.run({
                ...entry,
                companyId,
                branchId,
                purchaseOrderId: orderId,
            });
        }
    }
    updateLineProgress(
        documentId: string,
        lineId: string,
        delta: {
            receivedQty?: number;
            returnedQty?: number;
            billedQty?: number;
            reservedQty?: number;
        },
    ): void {
        this.db.prepare(`
            UPDATE purchase_operation_document_lines
            SET received_qty = MAX(0, COALESCE(received_qty, 0) + @receivedQty),
                returned_qty = MAX(0, COALESCE(returned_qty, 0) + @returnedQty),
                billed_qty = MAX(0, COALESCE(billed_qty, 0) + @billedQty),
                reserved_qty = MAX(0, COALESCE(reserved_qty, 0) + @reservedQty),
                updated_at = CURRENT_TIMESTAMP
            WHERE document_id = @documentId
              AND id = @lineId
        `).run({
            documentId,
            lineId,
            receivedQty: Number(delta.receivedQty || 0),
            returnedQty: Number(delta.returnedQty || 0),
            billedQty: Number(delta.billedQty || 0),
            reservedQty: Number(delta.reservedQty || 0),
        });
    }

    saveDocumentStatus(
        companyId: string,
        branchId: string,
        documentId: string,
        status: PurchaseOperationStatus,
        updatedBy: string,
        updatedAt: string,
    ): void {
        this.db.prepare(`
            UPDATE purchase_operation_documents
            SET status = @status,
                approved_by = COALESCE(NULLIF(approved_by, ''), @updatedBy),
                updated_at = @updatedAt,
                version = COALESCE(version, 1) + 1
            WHERE id = @documentId
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
        `).run({
            companyId,
            branchId,
            documentId,
            status,
            updatedBy,
            updatedAt,
        });
    }

    getPostingState(companyId: string, branchId: string, documentId: string): PurchasePostingStateRecord | null {
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
            FROM purchase_operation_documents
            WHERE id = ?
              AND COALESCE(company_id, 'COMP_01') = ?
              AND COALESCE(branch_id, '') = ?
            LIMIT 1
        `).get(documentId, companyId, branchId) as PostingStateRow | undefined;

        if (!row) return null;

        return {
            documentId: row.id,
            status: String(row.status || 'DRAFT'),
            version: Number(row.version || 1),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            postedAt: row.posted_at || null,
            reversedAt: row.reversed_at || null,
            stockPostedAt: row.stock_posted_at || null,
            stockReversedAt: row.stock_reversed_at || null,
        };
    }

    savePostingState(input: PurchaseSavePostingStateInput): void {
        this.db.prepare(`
            UPDATE purchase_operation_documents
            SET status = @nextStatus,
                journal_id = COALESCE(@journalId, journal_id),
                posted_by = @postedBy,
                posted_at = @postedAt,
                stock_posted_at = @stockPostedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @postedAt
            WHERE id = @documentId
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
        `).run(input);
    }

    saveReversalState(input: PurchaseSaveReversalStateInput): void {
        this.db.prepare(`
            UPDATE purchase_operation_documents
            SET status = @nextStatus,
                reversal_journal_id = COALESCE(@reversalJournalId, reversal_journal_id),
                reversed_by = @reversedBy,
                reversed_at = @reversedAt,
                stock_reversed_at = @stockReversedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @reversedAt
            WHERE id = @documentId
              AND COALESCE(company_id, 'COMP_01') = @companyId
              AND COALESCE(branch_id, '') = @branchId
        `).run(input);
    }

    hasStockLedgerPosting(companyId: string, docType: PurchaseOperationDocumentType, docId: string, isReversal: boolean): boolean {
        const row = this.db.prepare(`
            SELECT 1 AS ok
            FROM stock_ledger_entries
            WHERE company_id = ?
              AND doc_type = ?
              AND doc_id = ?
              AND COALESCE(is_reversal, 0) = ?
            LIMIT 1
        `).get(companyId, docType, docId, isReversal ? 1 : 0) as { ok?: number } | undefined;

        return Boolean(row?.ok);
    }

    listStockLedgerEntries(companyId: string, docType: PurchaseOperationDocumentType, docId: string, isReversal: boolean): PurchaseStockLedgerEntryRecord[] {
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
        `).all(companyId, docType, docId, isReversal ? 1 : 0) as StockLedgerRow[];

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

    insertStockLedgerEntries(entries: PurchaseStockLedgerEntryRecord[]): void {
        if (!entries.length) return;
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

        for (const entry of entries) {
            insert.run({
                ...entry,
                isReversal: entry.isReversal ? 1 : 0,
            });
        }
    }

    private mapLineRow(row: LineRow): PurchaseOperationLineEntity {
        return {
            id: row.id,
            documentId: row.document_id,
            lineNo: Number(row.line_no || 0),
            itemId: row.item_id || null,
            lineType: this.normalizeLineType(row.line_type),
            warehouseId: row.warehouse_id || null,
            qty: Number(row.qty || 0),
            receivedQty: Number(row.received_qty || 0),
            returnedQty: Number(row.returned_qty || 0),
            billedQty: Number(row.billed_qty || 0),
            reservedQty: Number(row.reserved_qty || 0),
            unitPrice: Number(row.unit_price || 0),
            discountAmount: Number(row.discount_amount || 0),
            lineSubtotal: Number(row.line_subtotal || 0),
            taxableAmount: Number(row.taxable_amount || 0),
            vatAmount: Number(row.vat_amount || 0),
            lineTotal: Number(row.line_total || 0),
            unitCost: row.unit_cost !== null && row.unit_cost !== undefined ? Number(row.unit_cost) : null,
            expenseTypeId: row.expense_type_id || null,
            vehicleId: row.vehicle_id || null,
            projectId: row.project_id || null,
            costCenterId: row.cost_center_id || null,
            partnerId: row.partner_id || null,
            remarks: row.remarks || null,
            createdAt: String(row.created_at || ''),
            updatedAt: String(row.updated_at || ''),
        };
    }

    private mapLinkRow(row: LinkRow): PurchaseOperationLineLinkEntity {
        return {
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            sourceDocType: this.normalizeDocType(row.source_doc_type),
            sourceDocId: row.source_doc_id,
            sourceLineId: row.source_line_id,
            targetDocType: this.normalizeDocType(row.target_doc_type),
            targetDocId: row.target_doc_id,
            targetLineId: row.target_line_id,
            qty: Number(row.qty || 0),
            createdAt: row.created_at,
        };
    }

    private normalizeDocType(raw: string | null | undefined): PurchaseOperationDocumentType {
        const normalized = String(raw || '').trim().toUpperCase();
        if (normalized === 'PURCHASE_RFQ') return 'PURCHASE_RFQ';
        if (normalized === 'PURCHASE_ORDER') return 'PURCHASE_ORDER';
        if (normalized === 'GOODS_RECEIPT_NOTE') return 'GOODS_RECEIPT_NOTE';
        if (normalized === 'PURCHASE_RETURN') return 'PURCHASE_RETURN';
        return 'PURCHASE_REQUEST';
    }

    private normalizeLineType(raw: string | null | undefined): 'INVENTORY' | 'EXPENSE' | 'SERVICE' {
        const normalized = String(raw || '').trim().toUpperCase();
        if (normalized === 'EXPENSE') return 'EXPENSE';
        if (normalized === 'SERVICE') return 'SERVICE';
        return 'INVENTORY';
    }

    private normalizeStatus(raw: string | null | undefined): PurchaseOperationStatus {
        const normalized = String(raw || '').trim().toUpperCase();
        if (normalized === 'CONFIRMED') return 'CONFIRMED';
        if (normalized === 'POSTED') return 'POSTED';
        if (normalized === 'PARTIAL') return 'PARTIAL';
        if (normalized === 'COMPLETED') return 'COMPLETED';
        if (normalized === 'CANCELLED') return 'CANCELLED';
        return 'DRAFT';
    }

    private getDocTypePrefix(docType: PurchaseOperationDocumentType): string {
        switch (docType) {
            case 'PURCHASE_REQUEST':
                return 'PRQ';
            case 'PURCHASE_RFQ':
                return 'RFQ';
            case 'PURCHASE_ORDER':
                return 'POR';
            case 'GOODS_RECEIPT_NOTE':
                return 'GRN';
            case 'PURCHASE_RETURN':
                return 'PRN';
            default:
                return 'PUR';
        }
    }

    private ensureColumn(table: string, column: string, ddl: string): void {
        const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
        if (!columns.some((col) => col.name === column)) {
            this.db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`).run();
        }
    }
}


