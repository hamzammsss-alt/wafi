import Database from 'better-sqlite3';
import {
    PurchaseInvoiceAccountingRepositoryPort,
    PurchaseInvoiceHeaderRecord,
    PurchaseInvoiceItemMeta,
    PurchaseInvoiceLineRecord,
    PurchaseInvoiceLineType,
    PurchaseInvoicePostingStateRecord,
    PurchaseInvoiceVendorRecord,
} from '../../application/ports/PurchaseInvoiceAccountingPorts';

type PurchaseInvoiceHeaderRow = {
    id: string;
    company_id: string | null;
    branch_id: string | null;
    invoice_no: string | null;
    invoice_date: string | null;
    vendor_id: string | null;
    currency_code: string | null;
    currency_rate: number | null;
    subtotal: number | null;
    discount_amount: number | null;
    taxable_amount: number | null;
    vat_amount: number | null;
    total_amount: number | null;
    status: string | null;
    version: number | null;
    journal_id: string | null;
    reversal_journal_id: string | null;
    cost_center_id: string | null;
    expense_type_id: string | null;
    vehicle_id: string | null;
    project_id: string | null;
    warehouse_id: string | null;
};

type PurchaseInvoiceLineRow = {
    id: string;
    invoice_id: string;
    item_id: string | null;
    warehouse_id: string | null;
    line_type: string | null;
    qty: number | null;
    unit_price: number | null;
    discount_amount: number | null;
    line_subtotal: number | null;
    taxable_amount: number | null;
    vat_amount: number | null;
    line_total: number | null;
    expense_type_id: string | null;
    vehicle_id: string | null;
    project_id: string | null;
    cost_center_id: string | null;
};

type PurchaseInvoiceStateRow = {
    id: string;
    status: string | null;
    journal_id: string | null;
    reversal_journal_id: string | null;
    version: number | null;
};

const PERPETUAL_INVENTORY_TRUE_VALUES = new Set(['1', 'TRUE', 'YES', 'Y', 'ON', 'PERPETUAL']);

export class SqlitePurchaseInvoiceAccountingRepo implements PurchaseInvoiceAccountingRepositoryPort {
    constructor(private readonly db: Database.Database) {}

    ensureSchema(): void {
        this.ensurePurchaseInvoiceColumns();
        this.ensurePurchaseInvoiceLineColumns();
    }

    getInvoiceHeaderById(companyId: string, branchId: string, invoiceId: string): PurchaseInvoiceHeaderRecord | null {
        const row = this.db
            .prepare(
                `
                SELECT
                    i.id AS id,
                    COALESCE(i.company_id, 'COMP_01') AS company_id,
                    COALESCE(i.branch_id, '') AS branch_id,
                    COALESCE(i.invoice_no, '') AS invoice_no,
                    COALESCE(i.doc_date, i.date, '') AS invoice_date,
                    COALESCE(i.vendor_id, i.supplier_id, '') AS vendor_id,
                    COALESCE(i.currency_code, i.currency_id, 'ILS') AS currency_code,
                    COALESCE(i.currency_rate, i.exchange_rate, 1) AS currency_rate,
                    COALESCE(i.subtotal, 0) AS subtotal,
                    COALESCE(i.discount_amount, i.discount_total, 0) AS discount_amount,
                    COALESCE(i.taxable_amount, i.subtotal, 0) AS taxable_amount,
                    COALESCE(i.vat_amount, i.tax_total, 0) AS vat_amount,
                    COALESCE(i.total_amount, i.grand_total, 0) AS total_amount,
                    COALESCE(i.status, 'DRAFT') AS status,
                    COALESCE(i.version, 1) AS version,
                    NULLIF(TRIM(COALESCE(i.journal_id, '')), '') AS journal_id,
                    NULLIF(TRIM(COALESCE(i.reversal_journal_id, '')), '') AS reversal_journal_id,
                    NULLIF(TRIM(COALESCE(i.cost_center_id, '')), '') AS cost_center_id,
                    NULLIF(TRIM(COALESCE(i.expense_type_id, '')), '') AS expense_type_id,
                    NULLIF(TRIM(COALESCE(i.vehicle_id, '')), '') AS vehicle_id,
                    NULLIF(TRIM(COALESCE(i.project_id, '')), '') AS project_id,
                    NULLIF(TRIM(COALESCE(i.warehouse_id, '')), '') AS warehouse_id
                FROM purchase_invoices i
                WHERE i.id = ?
                  AND COALESCE(i.company_id, 'COMP_01') = ?
                  AND COALESCE(i.branch_id, '') = ?
                LIMIT 1
                `,
            )
            .get(invoiceId, companyId, branchId) as PurchaseInvoiceHeaderRow | undefined;

        if (!row) return null;

        return {
            id: row.id,
            companyId: String(row.company_id || 'COMP_01'),
            branchId: String(row.branch_id || ''),
            invoiceNo: String(row.invoice_no || ''),
            invoiceDate: String(row.invoice_date || ''),
            vendorId: String(row.vendor_id || ''),
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

    getInvoiceLinesByInvoiceId(invoiceId: string): PurchaseInvoiceLineRecord[] {
        const rows = this.db
            .prepare(
                `
                SELECT
                    l.id AS id,
                    l.invoice_id AS invoice_id,
                    NULLIF(TRIM(COALESCE(l.item_id, '')), '') AS item_id,
                    NULLIF(TRIM(COALESCE(l.warehouse_id, '')), '') AS warehouse_id,
                    UPPER(COALESCE(l.line_type, CASE WHEN NULLIF(TRIM(COALESCE(l.item_id, '')), '') IS NOT NULL THEN 'INVENTORY' ELSE 'EXPENSE' END)) AS line_type,
                    COALESCE(l.quantity, 0) AS qty,
                    COALESCE(l.unit_price, 0) AS unit_price,
                    COALESCE(
                        l.discount_amount,
                        (COALESCE(l.quantity, 0) * COALESCE(l.unit_price, 0) * COALESCE(l.discount, 0) / 100.0),
                        0
                    ) AS discount_amount,
                    COALESCE(l.line_subtotal, l.total_price, 0) AS line_subtotal,
                    COALESCE(l.taxable_amount, l.net_total, l.total_price, 0) AS taxable_amount,
                    COALESCE(l.vat_amount, l.tax_amount, 0) AS vat_amount,
                    COALESCE(l.line_total, l.net_total + l.tax_amount, l.net_total, l.total_price, 0) AS line_total,
                    NULLIF(TRIM(COALESCE(l.expense_type_id, '')), '') AS expense_type_id,
                    NULLIF(TRIM(COALESCE(l.vehicle_id, '')), '') AS vehicle_id,
                    NULLIF(TRIM(COALESCE(l.project_id, '')), '') AS project_id,
                    NULLIF(TRIM(COALESCE(l.cost_center_id, '')), '') AS cost_center_id
                FROM purchase_invoice_lines l
                WHERE l.invoice_id = ?
                ORDER BY COALESCE(l.line_no, l.rowid)
                `,
            )
            .all(invoiceId) as PurchaseInvoiceLineRow[];

        return rows.map((row) => ({
            id: String(row.id || ''),
            invoiceId: String(row.invoice_id || ''),
            itemId: row.item_id || null,
            warehouseId: row.warehouse_id || null,
            lineType: this.normalizeLineType(row.line_type),
            qty: Number(row.qty || 0),
            unitPrice: Number(row.unit_price || 0),
            discountAmount: Number(row.discount_amount || 0),
            lineSubtotal: Number(row.line_subtotal || 0),
            taxableAmount: Number(row.taxable_amount || 0),
            vatAmount: Number(row.vat_amount || 0),
            lineTotal: Number(row.line_total || 0),
            expenseTypeId: row.expense_type_id || null,
            vehicleId: row.vehicle_id || null,
            projectId: row.project_id || null,
            costCenterId: row.cost_center_id || null,
        }));
    }

    getVendorById(vendorId: string): PurchaseInvoiceVendorRecord | null {
        const row = this.db
            .prepare(
                `
                SELECT id
                FROM business_partners
                WHERE id = ?
                LIMIT 1
                `,
            )
            .get(vendorId) as { id: string } | undefined;

        if (!row) return null;
        return {
            id: String(row.id || ''),
            isActive: true,
        };
    }

    getItemMeta(itemId: string): PurchaseInvoiceItemMeta {
        let itemRow:
            | { item_group_id?: string | null; item_type?: string | null }
            | undefined;
        try {
            itemRow = this.db
                .prepare(
                    `
                    SELECT
                        NULLIF(TRIM(COALESCE(item_group_id, '')), '') AS item_group_id,
                        UPPER(COALESCE(type, '')) AS item_type
                    FROM items
                    WHERE id = ?
                    LIMIT 1
                    `,
                )
                .get(itemId) as { item_group_id?: string | null; item_type?: string | null } | undefined;
        } catch {
            itemRow = undefined;
        }

        const itemType = String(itemRow?.item_type || '').trim().toUpperCase();
        return {
            itemGroupId: itemRow?.item_group_id ? String(itemRow.item_group_id) : null,
            isService: itemType === 'SERVICE' || itemType === 'SERVICES',
        };
    }

    isPerpetualInventoryEnabled(companyId: string): boolean {
        try {
            const row = this.db
                .prepare(
                    `
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
                    `,
                )
                .get() as { value?: string | null } | undefined;

            const normalized = String(row?.value || '').trim().toUpperCase();
            if (!normalized) return true;
            if (normalized === 'PERIODIC') return false;
            return PERPETUAL_INVENTORY_TRUE_VALUES.has(normalized);
        } catch {
            return true;
        }
    }

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string {
        const normalized = String(rawCurrencyCode || '').trim();
        if (!normalized) return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized)) return normalized.toUpperCase();

        try {
            const row = this.db
                .prepare(
                    `
                    SELECT code
                    FROM currencies
                    WHERE id = ?
                       OR UPPER(code) = UPPER(?)
                    LIMIT 1
                    `,
                )
                .get(normalized, normalized) as { code?: string | null } | undefined;

            return String(row?.code || 'ILS').trim().toUpperCase() || 'ILS';
        } catch {
            return 'ILS';
        }
    }

    savePostingState(
        companyId: string,
        branchId: string,
        invoiceId: string,
        journalId: string,
        postedBy: string,
    ): void {
        this.db
            .prepare(
                `
                UPDATE purchase_invoices
                SET journal_id = ?,
                    accounting_posted_at = COALESCE(accounting_posted_at, CURRENT_TIMESTAMP),
                    accounting_posted_by = COALESCE(NULLIF(accounting_posted_by, ''), ?),
                    version = COALESCE(version, 1) + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
                `,
            )
            .run(journalId, postedBy, invoiceId, companyId, branchId);
    }

    saveReversalState(
        companyId: string,
        branchId: string,
        invoiceId: string,
        reversalJournalId: string,
        reversedBy: string,
    ): void {
        this.db
            .prepare(
                `
                UPDATE purchase_invoices
                SET reversal_journal_id = ?,
                    accounting_reversed_at = COALESCE(accounting_reversed_at, CURRENT_TIMESTAMP),
                    accounting_reversed_by = COALESCE(NULLIF(accounting_reversed_by, ''), ?),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
                `,
            )
            .run(reversalJournalId, reversedBy, invoiceId, companyId, branchId);
    }

    getPostingState(companyId: string, branchId: string, invoiceId: string): PurchaseInvoicePostingStateRecord | null {
        const row = this.db
            .prepare(
                `
                SELECT
                    id,
                    COALESCE(status, 'DRAFT') AS status,
                    NULLIF(TRIM(COALESCE(journal_id, '')), '') AS journal_id,
                    NULLIF(TRIM(COALESCE(reversal_journal_id, '')), '') AS reversal_journal_id,
                    COALESCE(version, 1) AS version
                FROM purchase_invoices
                WHERE id = ?
                  AND COALESCE(company_id, 'COMP_01') = ?
                  AND COALESCE(branch_id, '') = ?
                LIMIT 1
                `,
            )
            .get(invoiceId, companyId, branchId) as PurchaseInvoiceStateRow | undefined;

        if (!row) return null;
        return {
            invoiceId: String(row.id || ''),
            status: String(row.status || 'DRAFT'),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            version: Number(row.version || 1),
        };
    }

    private ensurePurchaseInvoiceColumns(): void {
        const columns = this.db.prepare('PRAGMA table_info(purchase_invoices)').all() as Array<{ name: string }>;
        const has = (name: string) => columns.some((column) => column.name === name);
        const addColumn = (name: string, type: string) => {
            if (!has(name)) {
                this.db.prepare(`ALTER TABLE purchase_invoices ADD COLUMN ${name} ${type}`).run();
            }
        };

        addColumn('journal_id', 'TEXT');
        addColumn('reversal_journal_id', 'TEXT');
        addColumn('vendor_id', 'TEXT');
        addColumn('currency_code', 'TEXT');
        addColumn('currency_rate', 'REAL DEFAULT 1');
        addColumn('invoice_date', 'TEXT');
        addColumn('discount_amount', 'REAL DEFAULT 0');
        addColumn('taxable_amount', 'REAL DEFAULT 0');
        addColumn('vat_amount', 'REAL DEFAULT 0');
        addColumn('total_amount', 'REAL DEFAULT 0');
        addColumn('accounting_posted_at', 'DATETIME');
        addColumn('accounting_posted_by', 'TEXT');
        addColumn('accounting_reversed_at', 'DATETIME');
        addColumn('accounting_reversed_by', 'TEXT');
        addColumn('cost_center_id', 'TEXT');
        addColumn('expense_type_id', 'TEXT');
        addColumn('vehicle_id', 'TEXT');
        addColumn('project_id', 'TEXT');
        addColumn('warehouse_id', 'TEXT');
    }

    private ensurePurchaseInvoiceLineColumns(): void {
        const columns = this.db.prepare('PRAGMA table_info(purchase_invoice_lines)').all() as Array<{ name: string }>;
        const has = (name: string) => columns.some((column) => column.name === name);
        const addColumn = (name: string, type: string) => {
            if (!has(name)) {
                this.db.prepare(`ALTER TABLE purchase_invoice_lines ADD COLUMN ${name} ${type}`).run();
            }
        };

        addColumn('line_no', 'INTEGER DEFAULT 0');
        addColumn('line_type', 'TEXT');
        addColumn('warehouse_id', 'TEXT');
        addColumn('discount', 'REAL DEFAULT 0');
        addColumn('discount_amount', 'REAL DEFAULT 0');
        addColumn('tax_rate', 'REAL DEFAULT 0');
        addColumn('taxable_amount', 'REAL DEFAULT 0');
        addColumn('vat_amount', 'REAL DEFAULT 0');
        addColumn('line_subtotal', 'REAL DEFAULT 0');
        addColumn('line_total', 'REAL DEFAULT 0');
        addColumn('expense_type_id', 'TEXT');
        addColumn('vehicle_id', 'TEXT');
        addColumn('project_id', 'TEXT');
        addColumn('cost_center_id', 'TEXT');
    }

    private normalizeLineType(rawType: string | null): PurchaseInvoiceLineType {
        const normalized = String(rawType || '').trim().toUpperCase();
        if (normalized === 'SERVICE') return 'SERVICE';
        if (normalized === 'EXPENSE') return 'EXPENSE';
        return 'INVENTORY';
    }
}
