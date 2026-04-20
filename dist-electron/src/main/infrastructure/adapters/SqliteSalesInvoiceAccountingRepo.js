"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteSalesInvoiceAccountingRepo = void 0;
const PERPETUAL_INVENTORY_TRUE_VALUES = new Set(['1', 'TRUE', 'YES', 'Y', 'ON', 'PERPETUAL']);
class SqliteSalesInvoiceAccountingRepo {
    constructor(db) {
        this.db = db;
    }
    ensureSchema() {
        this.ensureSalesInvoiceColumns();
        this.ensureSalesInvoiceLineColumns();
    }
    getInvoiceHeaderById(companyId, branchId, invoiceId) {
        const row = this.db
            .prepare(`
                SELECT
                    i.id AS id,
                    COALESCE(i.company_id, 'COMP_01') AS company_id,
                    COALESCE(i.branch_id, '') AS branch_id,
                    COALESCE(i.invoice_no, '') AS invoice_no,
                    COALESCE(i.doc_date, i.date, '') AS invoice_date,
                    COALESCE(i.customer_id, '') AS customer_id,
                    COALESCE(i.currency_id, 'ILS') AS currency_code,
                    COALESCE(i.exchange_rate, 1) AS currency_rate,
                    COALESCE(i.subtotal, 0) AS subtotal,
                    COALESCE(i.discount_total, 0) AS discount_amount,
                    COALESCE(i.subtotal, 0) AS taxable_amount,
                    COALESCE(i.tax_total, 0) AS vat_amount,
                    COALESCE(i.grand_total, 0) AS total_amount,
                    COALESCE(i.status, 'DRAFT') AS status,
                    COALESCE(i.version, 1) AS version,
                    NULLIF(TRIM(COALESCE(i.journal_id, '')), '') AS journal_id,
                    NULLIF(TRIM(COALESCE(i.reversal_journal_id, '')), '') AS reversal_journal_id,
                    NULLIF(TRIM(COALESCE(i.cost_center_id, '')), '') AS cost_center_id,
                    NULLIF(TRIM(COALESCE(i.expense_type_id, '')), '') AS expense_type_id,
                    NULLIF(TRIM(COALESCE(i.vehicle_id, '')), '') AS vehicle_id,
                    NULLIF(TRIM(COALESCE(i.project_id, '')), '') AS project_id,
                    NULLIF(TRIM(COALESCE(i.warehouse_id, '')), '') AS warehouse_id
                FROM sales_invoices i
                WHERE i.id = ?
                  AND COALESCE(i.company_id, 'COMP_01') = ?
                  AND COALESCE(i.branch_id, '') = ?
                LIMIT 1
                `)
            .get(invoiceId, companyId, branchId);
        if (!row)
            return null;
        return {
            id: row.id,
            companyId: String(row.company_id || 'COMP_01'),
            branchId: String(row.branch_id || ''),
            invoiceNo: String(row.invoice_no || ''),
            invoiceDate: String(row.invoice_date || ''),
            customerId: String(row.customer_id || ''),
            currencyCode: String(row.currency_code || 'ILS'),
            currencyRate: Number(row.currency_rate || 1),
            subtotal: Number(row.subtotal || 0),
            discountAmount: Number(row.discount_amount || 0),
            taxableAmount: Number(row.taxable_amount || 0),
            vatAmount: Number(row.vat_amount || 0),
            totalAmount: Number(row.total_amount || 0),
            status: String(row.status || 'DRAFT'),
            version: Number(row.version || 1),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            costCenterId: row.cost_center_id || null,
            expenseTypeId: row.expense_type_id || null,
            vehicleId: row.vehicle_id || null,
            projectId: row.project_id || null,
            warehouseId: row.warehouse_id || null,
        };
    }
    getInvoiceLinesByInvoiceId(invoiceId) {
        const rows = this.db
            .prepare(`
                SELECT
                    l.id AS id,
                    l.invoice_id AS invoice_id,
                    NULLIF(TRIM(COALESCE(l.item_id, '')), '') AS item_id,
                    NULLIF(TRIM(COALESCE(l.warehouse_id, '')), '') AS warehouse_id,
                    COALESCE(l.quantity, 0) AS qty,
                    COALESCE(l.unit_price, 0) AS unit_price,
                    COALESCE(
                        l.discount_amount,
                        (COALESCE(l.quantity, 0) * COALESCE(l.unit_price, 0) * COALESCE(l.discount, 0) / 100.0),
                        0
                    ) AS discount_amount,
                    COALESCE(l.total_price, 0) AS line_subtotal,
                    COALESCE(l.net_total, l.total_price, 0) AS taxable_amount,
                    COALESCE(l.tax_amount, 0) AS vat_amount,
                    COALESCE(l.net_total + l.tax_amount, l.total_price + l.tax_amount, l.net_total, l.total_price, 0) AS line_total,
                    COALESCE(l.cost_amount, 0) AS cost_amount,
                    NULLIF(TRIM(COALESCE(l.project_id, '')), '') AS project_id,
                    NULLIF(TRIM(COALESCE(l.cost_center_id, '')), '') AS cost_center_id,
                    NULLIF(TRIM(COALESCE(l.expense_type_id, '')), '') AS expense_type_id,
                    NULLIF(TRIM(COALESCE(l.vehicle_id, '')), '') AS vehicle_id
                FROM sales_invoice_lines l
                WHERE l.invoice_id = ?
                ORDER BY COALESCE(l.line_no, l.rowid)
                `)
            .all(invoiceId);
        return rows.map((row) => ({
            id: String(row.id || ''),
            invoiceId: String(row.invoice_id || ''),
            itemId: row.item_id || null,
            warehouseId: row.warehouse_id || null,
            qty: Number(row.qty || 0),
            unitPrice: Number(row.unit_price || 0),
            discountAmount: Number(row.discount_amount || 0),
            lineSubtotal: Number(row.line_subtotal || 0),
            taxableAmount: Number(row.taxable_amount || 0),
            vatAmount: Number(row.vat_amount || 0),
            lineTotal: Number(row.line_total || 0),
            costAmount: Number(row.cost_amount || 0),
            projectId: row.project_id || null,
            costCenterId: row.cost_center_id || null,
            expenseTypeId: row.expense_type_id || null,
            vehicleId: row.vehicle_id || null,
        }));
    }
    getCustomerById(customerId) {
        const row = this.db
            .prepare(`
                SELECT id
                FROM business_partners
                WHERE id = ?
                LIMIT 1
                `)
            .get(customerId);
        if (!row)
            return null;
        return {
            id: String(row.id || ''),
            isActive: true,
        };
    }
    getItemMeta(itemId, warehouseId) {
        let itemRow;
        try {
            itemRow = this.db
                .prepare(`
                    SELECT
                        NULLIF(TRIM(COALESCE(item_group_id, '')), '') AS item_group_id,
                        UPPER(COALESCE(type, '')) AS item_type,
                        COALESCE(cost_price, 0) AS cost_price
                    FROM items
                    WHERE id = ?
                    LIMIT 1
                    `)
                .get(itemId);
        }
        catch {
            itemRow = undefined;
        }
        const isService = String(itemRow?.item_type || '').trim().toUpperCase() === 'SERVICE'
            || String(itemRow?.item_type || '').trim().toUpperCase() === 'SERVICES';
        const warehouseCost = this.getWarehouseItemCost(itemId, warehouseId);
        const fallbackCost = Number(itemRow?.cost_price || 0);
        const costAmount = warehouseCost > 0 ? warehouseCost : fallbackCost;
        return {
            itemGroupId: itemRow?.item_group_id ? String(itemRow.item_group_id) : null,
            isService,
            costAmount: costAmount > 0 ? costAmount : 0,
        };
    }
    isPerpetualInventoryEnabled(companyId) {
        try {
            const row = this.db
                .prepare(`
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
                    `)
                .get();
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
            const row = this.db
                .prepare(`
                    SELECT code
                    FROM currencies
                    WHERE id = ?
                       OR UPPER(code) = UPPER(?)
                    LIMIT 1
                    `)
                .get(normalized, normalized);
            return String(row?.code || 'ILS').trim().toUpperCase() || 'ILS';
        }
        catch {
            return 'ILS';
        }
    }
    savePostingState(companyId, branchId, invoiceId, journalId, postedBy) {
        this.db
            .prepare(`
                UPDATE sales_invoices
                SET journal_id = ?,
                    accounting_posted_at = COALESCE(accounting_posted_at, CURRENT_TIMESTAMP),
                    accounting_posted_by = COALESCE(NULLIF(accounting_posted_by, ''), ?),
                    status = CASE
                        WHEN UPPER(COALESCE(status, '')) IN ('DRAFT', 'REJECTED', 'APPROVED', 'READY_TO_POST') THEN 'POSTED'
                        ELSE status
                    END,
                    version = COALESCE(version, 1) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
                `)
            .run(journalId, postedBy, invoiceId, companyId, branchId);
    }
    saveReversalState(companyId, branchId, invoiceId, reversalJournalId, reversedBy) {
        this.db
            .prepare(`
                UPDATE sales_invoices
                SET reversal_journal_id = ?,
                    accounting_reversed_at = COALESCE(accounting_reversed_at, CURRENT_TIMESTAMP),
                    accounting_reversed_by = COALESCE(NULLIF(accounting_reversed_by, ''), ?),
                    status = CASE
                        WHEN UPPER(COALESCE(status, '')) IN ('POSTED') THEN 'CANCELLED'
                        ELSE status
                    END,
                    version = COALESCE(version, 1) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
                `)
            .run(reversalJournalId, reversedBy, invoiceId, companyId, branchId);
    }
    getPostingState(companyId, branchId, invoiceId) {
        const row = this.db
            .prepare(`
                SELECT
                    id,
                    COALESCE(status, 'DRAFT') AS status,
                    NULLIF(TRIM(COALESCE(journal_id, '')), '') AS journal_id,
                    NULLIF(TRIM(COALESCE(reversal_journal_id, '')), '') AS reversal_journal_id,
                    COALESCE(version, 1) AS version
                FROM sales_invoices
                WHERE id = ?
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
                LIMIT 1
                `)
            .get(invoiceId, companyId, branchId);
        if (!row)
            return null;
        return {
            invoiceId: String(row.id || ''),
            status: String(row.status || 'DRAFT'),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            version: Number(row.version || 1),
        };
    }
    getWarehouseItemCost(itemId, warehouseId) {
        if (!warehouseId)
            return 0;
        try {
            const row = this.db
                .prepare(`
                    SELECT COALESCE(avg_cost, 0) AS avg_cost
                    FROM item_warehouse_stock
                    WHERE item_id = ?
                      AND warehouse_id = ?
                    LIMIT 1
                    `)
                .get(itemId, warehouseId);
            return Number(row?.avg_cost || 0);
        }
        catch {
            return 0;
        }
    }
    ensureSalesInvoiceColumns() {
        const columns = this.db.prepare('PRAGMA table_info(sales_invoices)').all();
        const has = (name) => columns.some((column) => column.name === name);
        const addColumn = (name, type) => {
            if (!has(name)) {
                this.db.prepare(`ALTER TABLE sales_invoices ADD COLUMN ${name} ${type}`).run();
            }
        };
        addColumn('journal_id', 'TEXT');
        addColumn('reversal_journal_id', 'TEXT');
        addColumn('accounting_posted_at', 'DATETIME');
        addColumn('accounting_posted_by', 'TEXT');
        addColumn('accounting_reversed_at', 'DATETIME');
        addColumn('accounting_reversed_by', 'TEXT');
        addColumn('cost_center_id', 'TEXT');
        addColumn('expense_type_id', 'TEXT');
        addColumn('vehicle_id', 'TEXT');
        addColumn('project_id', 'TEXT');
    }
    ensureSalesInvoiceLineColumns() {
        const columns = this.db.prepare('PRAGMA table_info(sales_invoice_lines)').all();
        const has = (name) => columns.some((column) => column.name === name);
        const addColumn = (name, type) => {
            if (!has(name)) {
                this.db.prepare(`ALTER TABLE sales_invoice_lines ADD COLUMN ${name} ${type}`).run();
            }
        };
        addColumn('line_no', 'INTEGER DEFAULT 0');
        addColumn('discount', 'REAL DEFAULT 0');
        addColumn('tax_rate', 'REAL DEFAULT 0');
        addColumn('discount_amount', 'REAL DEFAULT 0');
        addColumn('taxable_amount', 'REAL DEFAULT 0');
        addColumn('line_total', 'REAL DEFAULT 0');
        addColumn('cost_amount', 'REAL DEFAULT 0');
        addColumn('warehouse_id', 'TEXT');
        addColumn('project_id', 'TEXT');
        addColumn('cost_center_id', 'TEXT');
        addColumn('expense_type_id', 'TEXT');
        addColumn('vehicle_id', 'TEXT');
    }
}
exports.SqliteSalesInvoiceAccountingRepo = SqliteSalesInvoiceAccountingRepo;
