export type ScreenKey = string;

export type FilterValueType = 'text' | 'number' | 'date' | 'enum' | 'boolean' | 'lookup';

export type FilterOperator =
    | 'eq'
    | 'neq'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'between'
    | 'in'
    | 'is_null'
    | 'not_null';

export type SortDirection = 'asc' | 'desc';

export type LookupOption = {
    value: string;
    label: string;
    labelI18nKey?: string;
};

export interface FilterSchema {
    key: string;
    labelI18nKey: string;
    field: string;
    type: FilterValueType;
    operatorSet: FilterOperator[];
    lookupSource?: string;
    options?: LookupOption[];
    defaultOperator?: FilterOperator;
}

export interface ColumnSchema {
    key: string;
    labelI18nKey: string;
    field: string;
    type: 'text' | 'number' | 'date' | 'enum' | 'boolean';
    defaultVisible: boolean;
    width: number;
    sortable: boolean;
}

export interface ScreenDefinition {
    screenKey: ScreenKey;
    labelI18nKey: string;
    capabilityKey: string;
    source: {
        fromSql: string;
        baseWhereSql?: string;
        primaryKey: string;
        selectMap: Record<string, string>;
        sortMap: Record<string, string>;
    };
    filterSchema: FilterSchema[];
    columnSchema: ColumnSchema[];
    defaultSort: Array<{ key: string; direction: SortDirection }>;
}

const SCREEN_DEFINITION_LIST: ScreenDefinition[] = [
    {
        screenKey: 'sales.invoice.list',
        labelI18nKey: 'screen.sales.invoice.list',
        capabilityKey: 'sales.invoice.read',
        source: {
            fromSql: `
                FROM sales_invoices si
                LEFT JOIN business_partners bp ON bp.id = si.customer_id
                LEFT JOIN accounts ac ON ac.id = si.customer_id
            `,
            primaryKey: 'id',
            selectMap: {
                id: 'si.id',
                doc_no: "COALESCE(si.invoice_no, '')",
                doc_date: "date(si.date)",
                due_date: "date(COALESCE(si.due_date, si.date))",
                partner_id: "COALESCE(si.customer_id, '')",
                partner_name: "COALESCE(bp.name_ar, bp.name_en, bp.name, ac.name, '')",
                status: "COALESCE(si.status, 'DRAFT')",
                total: 'CAST(COALESCE(si.grand_total, 0) AS REAL)',
                branch_id: "COALESCE(si.branch_id, '')"
            },
            sortMap: {
                doc_no: 'si.invoice_no',
                doc_date: 'si.date',
                due_date: 'COALESCE(si.due_date, si.date)',
                partner_name: 'COALESCE(bp.name_ar, bp.name_en, bp.name, ac.name)',
                status: 'si.status',
                total: 'si.grand_total',
                branch_id: 'si.branch_id'
            }
        },
        filterSchema: [
            {
                key: 'doc_no',
                labelI18nKey: 'filter.sales.invoice.doc_no',
                field: 'si.invoice_no',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with', 'ends_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'doc_date',
                labelI18nKey: 'filter.sales.invoice.doc_date',
                field: 'date(si.date)',
                type: 'date',
                operatorSet: ['eq', 'gte', 'lte', 'between'],
                defaultOperator: 'between'
            },
            {
                key: 'partner_name',
                labelI18nKey: 'filter.sales.invoice.partner_name',
                field: 'COALESCE(bp.name_ar, bp.name_en, bp.name, ac.name)',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'status',
                labelI18nKey: 'filter.sales.invoice.status',
                field: 'si.status',
                type: 'enum',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                options: [
                    { value: 'DRAFT', label: 'DRAFT', labelI18nKey: 'status.draft' },
                    { value: 'POSTED', label: 'POSTED', labelI18nKey: 'status.posted' },
                    { value: 'VOID', label: 'VOID', labelI18nKey: 'status.void' }
                ]
            },
            {
                key: 'total',
                labelI18nKey: 'filter.sales.invoice.total',
                field: 'CAST(COALESCE(si.grand_total, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'between'
            },
            {
                key: 'branch_id',
                labelI18nKey: 'filter.sales.invoice.branch_id',
                field: 'si.branch_id',
                type: 'lookup',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                lookupSource: 'branches'
            }
        ],
        columnSchema: [
            { key: 'id', labelI18nKey: 'column.common.id', field: 'id', type: 'text', defaultVisible: false, width: 120, sortable: false },
            { key: 'doc_no', labelI18nKey: 'column.sales.invoice.doc_no', field: 'doc_no', type: 'text', defaultVisible: true, width: 160, sortable: true },
            { key: 'doc_date', labelI18nKey: 'column.sales.invoice.doc_date', field: 'doc_date', type: 'date', defaultVisible: true, width: 130, sortable: true },
            { key: 'due_date', labelI18nKey: 'column.sales.invoice.due_date', field: 'due_date', type: 'date', defaultVisible: true, width: 130, sortable: true },
            { key: 'partner_name', labelI18nKey: 'column.sales.invoice.partner_name', field: 'partner_name', type: 'text', defaultVisible: true, width: 220, sortable: true },
            { key: 'status', labelI18nKey: 'column.sales.invoice.status', field: 'status', type: 'enum', defaultVisible: true, width: 120, sortable: true },
            { key: 'total', labelI18nKey: 'column.sales.invoice.total', field: 'total', type: 'number', defaultVisible: true, width: 150, sortable: true },
            { key: 'branch_id', labelI18nKey: 'column.sales.invoice.branch_id', field: 'branch_id', type: 'text', defaultVisible: true, width: 140, sortable: true }
        ],
        defaultSort: [
            { key: 'doc_date', direction: 'desc' },
            { key: 'doc_no', direction: 'desc' }
        ]
    },
    {
        screenKey: 'purchases.invoice.list',
        labelI18nKey: 'screen.purchases.invoice.list',
        capabilityKey: 'purchase.invoice.read',
        source: {
            fromSql: `
                FROM purchase_invoices pi
                LEFT JOIN business_partners bp ON bp.id = pi.supplier_id
            `,
            primaryKey: 'id',
            selectMap: {
                id: 'pi.id',
                doc_no: "COALESCE(pi.invoice_no, '')",
                doc_date: "date(COALESCE(pi.doc_date, pi.date))",
                partner_name: "COALESCE(bp.name_ar, bp.name_en, bp.name, '')",
                status: "COALESCE(pi.status, 'DRAFT')",
                total: 'CAST(COALESCE(pi.grand_total, 0) AS REAL)',
                branch_id: "COALESCE(pi.branch_id, '')",
            },
            sortMap: {
                doc_no: 'pi.invoice_no',
                doc_date: 'COALESCE(pi.doc_date, pi.date)',
                partner_name: 'COALESCE(bp.name_ar, bp.name_en, bp.name)',
                status: 'pi.status',
                total: 'pi.grand_total',
                branch_id: 'pi.branch_id',
            },
        },
        filterSchema: [
            {
                key: 'doc_no',
                labelI18nKey: 'filter.purchases.invoice.doc_no',
                field: 'pi.invoice_no',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with', 'ends_with'],
                defaultOperator: 'contains',
            },
            {
                key: 'doc_date',
                labelI18nKey: 'filter.purchases.invoice.doc_date',
                field: 'date(COALESCE(pi.doc_date, pi.date))',
                type: 'date',
                operatorSet: ['eq', 'gte', 'lte', 'between'],
                defaultOperator: 'between',
            },
            {
                key: 'partner_name',
                labelI18nKey: 'filter.purchases.invoice.partner_name',
                field: 'COALESCE(bp.name_ar, bp.name_en, bp.name)',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains',
            },
            {
                key: 'status',
                labelI18nKey: 'filter.purchases.invoice.status',
                field: 'pi.status',
                type: 'enum',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                options: [
                    { value: 'DRAFT', label: 'DRAFT', labelI18nKey: 'status.draft' },
                    { value: 'POSTED', label: 'POSTED', labelI18nKey: 'status.posted' },
                    { value: 'VOID', label: 'VOID', labelI18nKey: 'status.void' },
                ],
            },
            {
                key: 'total',
                labelI18nKey: 'filter.purchases.invoice.total',
                field: 'CAST(COALESCE(pi.grand_total, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'between',
            },
            {
                key: 'branch_id',
                labelI18nKey: 'filter.purchases.invoice.branch_id',
                field: 'pi.branch_id',
                type: 'lookup',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                lookupSource: 'branches',
            },
        ],
        columnSchema: [
            { key: 'id', labelI18nKey: 'column.common.id', field: 'id', type: 'text', defaultVisible: false, width: 120, sortable: false },
            { key: 'doc_no', labelI18nKey: 'column.purchases.invoice.doc_no', field: 'doc_no', type: 'text', defaultVisible: true, width: 160, sortable: true },
            { key: 'doc_date', labelI18nKey: 'column.purchases.invoice.doc_date', field: 'doc_date', type: 'date', defaultVisible: true, width: 130, sortable: true },
            { key: 'partner_name', labelI18nKey: 'column.purchases.invoice.partner_name', field: 'partner_name', type: 'text', defaultVisible: true, width: 220, sortable: true },
            { key: 'status', labelI18nKey: 'column.purchases.invoice.status', field: 'status', type: 'enum', defaultVisible: true, width: 120, sortable: true },
            { key: 'total', labelI18nKey: 'column.purchases.invoice.total', field: 'total', type: 'number', defaultVisible: true, width: 140, sortable: true },
            { key: 'branch_id', labelI18nKey: 'column.purchases.invoice.branch_id', field: 'branch_id', type: 'text', defaultVisible: true, width: 140, sortable: true },
        ],
        defaultSort: [
            { key: 'doc_date', direction: 'desc' },
            { key: 'doc_no', direction: 'desc' },
        ],
    },
    {
        screenKey: 'inventory.stock_transfer.list',
        labelI18nKey: 'screen.inventory.stock_transfer.list',
        capabilityKey: 'inventory.stock_transfer.read',
        source: {
            fromSql: `
                FROM stock_transfers st
                LEFT JOIN warehouses fw ON fw.id = st.from_warehouse_id
                LEFT JOIN warehouses tw ON tw.id = st.to_warehouse_id
            `,
            primaryKey: 'id',
            selectMap: {
                id: 'st.id',
                doc_no: "COALESCE(st.code, '')",
                doc_date: "date(COALESCE(st.doc_date, st.date))",
                from_warehouse_name: "COALESCE(fw.name_ar, fw.name_en, fw.name, fw.code, '')",
                to_warehouse_name: "COALESCE(tw.name_ar, tw.name_en, tw.name, tw.code, '')",
                status: "COALESCE(st.status, 'DRAFT')",
                total_qty: 'CAST(COALESCE((SELECT SUM(COALESCE(si.quantity, 0)) FROM stock_transfer_items si WHERE si.transfer_id = st.id), 0) AS REAL)',
                branch_id: "COALESCE(st.branch_id, '')",
            },
            sortMap: {
                doc_no: 'st.code',
                doc_date: 'COALESCE(st.doc_date, st.date)',
                from_warehouse_name: 'COALESCE(fw.name_ar, fw.name_en, fw.name, fw.code)',
                to_warehouse_name: 'COALESCE(tw.name_ar, tw.name_en, tw.name, tw.code)',
                status: 'st.status',
                total_qty: '(SELECT SUM(COALESCE(si.quantity, 0)) FROM stock_transfer_items si WHERE si.transfer_id = st.id)',
                branch_id: 'st.branch_id',
            },
        },
        filterSchema: [
            {
                key: 'doc_no',
                labelI18nKey: 'filter.inventory.stock_transfer.doc_no',
                field: 'st.code',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with', 'ends_with'],
                defaultOperator: 'contains',
            },
            {
                key: 'doc_date',
                labelI18nKey: 'filter.inventory.stock_transfer.doc_date',
                field: 'date(COALESCE(st.doc_date, st.date))',
                type: 'date',
                operatorSet: ['eq', 'gte', 'lte', 'between'],
                defaultOperator: 'between',
            },
            {
                key: 'from_warehouse_name',
                labelI18nKey: 'filter.inventory.stock_transfer.from_warehouse_name',
                field: 'COALESCE(fw.name_ar, fw.name_en, fw.name, fw.code)',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains',
            },
            {
                key: 'to_warehouse_name',
                labelI18nKey: 'filter.inventory.stock_transfer.to_warehouse_name',
                field: 'COALESCE(tw.name_ar, tw.name_en, tw.name, tw.code)',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains',
            },
            {
                key: 'status',
                labelI18nKey: 'filter.inventory.stock_transfer.status',
                field: 'st.status',
                type: 'enum',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                options: [
                    { value: 'DRAFT', label: 'DRAFT', labelI18nKey: 'status.draft' },
                    { value: 'POSTED', label: 'POSTED', labelI18nKey: 'status.posted' },
                    { value: 'VOID', label: 'VOID', labelI18nKey: 'status.void' },
                ],
            },
            {
                key: 'total_qty',
                labelI18nKey: 'filter.inventory.stock_transfer.total_qty',
                field: 'CAST(COALESCE((SELECT SUM(COALESCE(si.quantity, 0)) FROM stock_transfer_items si WHERE si.transfer_id = st.id), 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'between',
            },
            {
                key: 'branch_id',
                labelI18nKey: 'filter.inventory.stock_transfer.branch_id',
                field: 'st.branch_id',
                type: 'lookup',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                lookupSource: 'branches',
            },
        ],
        columnSchema: [
            { key: 'id', labelI18nKey: 'column.common.id', field: 'id', type: 'text', defaultVisible: false, width: 120, sortable: false },
            { key: 'doc_no', labelI18nKey: 'column.inventory.stock_transfer.doc_no', field: 'doc_no', type: 'text', defaultVisible: true, width: 160, sortable: true },
            { key: 'doc_date', labelI18nKey: 'column.inventory.stock_transfer.doc_date', field: 'doc_date', type: 'date', defaultVisible: true, width: 130, sortable: true },
            { key: 'from_warehouse_name', labelI18nKey: 'column.inventory.stock_transfer.from_warehouse_name', field: 'from_warehouse_name', type: 'text', defaultVisible: true, width: 200, sortable: true },
            { key: 'to_warehouse_name', labelI18nKey: 'column.inventory.stock_transfer.to_warehouse_name', field: 'to_warehouse_name', type: 'text', defaultVisible: true, width: 200, sortable: true },
            { key: 'status', labelI18nKey: 'column.inventory.stock_transfer.status', field: 'status', type: 'enum', defaultVisible: true, width: 120, sortable: true },
            { key: 'total_qty', labelI18nKey: 'column.inventory.stock_transfer.total_qty', field: 'total_qty', type: 'number', defaultVisible: true, width: 120, sortable: true },
            { key: 'branch_id', labelI18nKey: 'column.inventory.stock_transfer.branch_id', field: 'branch_id', type: 'text', defaultVisible: true, width: 140, sortable: true },
        ],
        defaultSort: [
            { key: 'doc_date', direction: 'desc' },
            { key: 'doc_no', direction: 'desc' },
        ],
    },
    {
        screenKey: 'accounting.journal_voucher.list',
        labelI18nKey: 'screen.accounting.journal_voucher.list',
        capabilityKey: 'accounting.journal_voucher.read',
        source: {
            fromSql: `
                FROM journal_entries j
            `,
            primaryKey: 'id',
            selectMap: {
                id: 'j.id',
                doc_no: "COALESCE(j.voucher_no, '')",
                doc_date: "date(COALESCE(j.doc_date, j.date))",
                reference_no: "COALESCE(j.reference_no, '')",
                status: "COALESCE(j.status, 'DRAFT')",
                total_debit: 'CAST(COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM journal_entry_lines l WHERE l.journal_entry_id = j.id), 0) AS REAL)',
                branch_id: "COALESCE(j.branch_id, '')",
            },
            sortMap: {
                doc_no: 'j.voucher_no',
                doc_date: 'COALESCE(j.doc_date, j.date)',
                reference_no: 'j.reference_no',
                status: 'j.status',
                total_debit: '(SELECT SUM(COALESCE(l.debit, 0)) FROM journal_entry_lines l WHERE l.journal_entry_id = j.id)',
                branch_id: 'j.branch_id',
            },
        },
        filterSchema: [
            {
                key: 'doc_no',
                labelI18nKey: 'filter.accounting.journal_voucher.doc_no',
                field: 'j.voucher_no',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with', 'ends_with'],
                defaultOperator: 'contains',
            },
            {
                key: 'doc_date',
                labelI18nKey: 'filter.accounting.journal_voucher.doc_date',
                field: 'date(COALESCE(j.doc_date, j.date))',
                type: 'date',
                operatorSet: ['eq', 'gte', 'lte', 'between'],
                defaultOperator: 'between',
            },
            {
                key: 'reference_no',
                labelI18nKey: 'filter.accounting.journal_voucher.reference_no',
                field: 'COALESCE(j.reference_no, \'\')',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains',
            },
            {
                key: 'status',
                labelI18nKey: 'filter.accounting.journal_voucher.status',
                field: 'j.status',
                type: 'enum',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                options: [
                    { value: 'DRAFT', label: 'DRAFT', labelI18nKey: 'status.draft' },
                    { value: 'POSTED', label: 'POSTED', labelI18nKey: 'status.posted' },
                    { value: 'VOID', label: 'VOID', labelI18nKey: 'status.void' },
                ],
            },
            {
                key: 'total_debit',
                labelI18nKey: 'filter.accounting.journal_voucher.total_debit',
                field: 'CAST(COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM journal_entry_lines l WHERE l.journal_entry_id = j.id), 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'between',
            },
            {
                key: 'branch_id',
                labelI18nKey: 'filter.accounting.journal_voucher.branch_id',
                field: 'j.branch_id',
                type: 'lookup',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                lookupSource: 'branches',
            },
        ],
        columnSchema: [
            { key: 'id', labelI18nKey: 'column.common.id', field: 'id', type: 'text', defaultVisible: false, width: 120, sortable: false },
            { key: 'doc_no', labelI18nKey: 'column.accounting.journal_voucher.doc_no', field: 'doc_no', type: 'text', defaultVisible: true, width: 160, sortable: true },
            { key: 'doc_date', labelI18nKey: 'column.accounting.journal_voucher.doc_date', field: 'doc_date', type: 'date', defaultVisible: true, width: 130, sortable: true },
            { key: 'reference_no', labelI18nKey: 'column.accounting.journal_voucher.reference_no', field: 'reference_no', type: 'text', defaultVisible: true, width: 200, sortable: true },
            { key: 'status', labelI18nKey: 'column.accounting.journal_voucher.status', field: 'status', type: 'enum', defaultVisible: true, width: 120, sortable: true },
            { key: 'total_debit', labelI18nKey: 'column.accounting.journal_voucher.total_debit', field: 'total_debit', type: 'number', defaultVisible: true, width: 140, sortable: true },
            { key: 'branch_id', labelI18nKey: 'column.accounting.journal_voucher.branch_id', field: 'branch_id', type: 'text', defaultVisible: true, width: 140, sortable: true },
        ],
        defaultSort: [
            { key: 'doc_date', direction: 'desc' },
            { key: 'doc_no', direction: 'desc' },
        ],
    },
    {
        screenKey: 'definitions.items.list',
        labelI18nKey: 'screen.definitions.items.list',
        capabilityKey: 'ti.master.item.manage',
        source: {
            fromSql: `
                FROM items i
                LEFT JOIN units u ON u.id = i.base_unit_id
                LEFT JOIN item_categories c ON c.id = i.category_id
                LEFT JOIN brands b ON b.id = i.brand_id
                LEFT JOIN business_partners sp ON sp.id = i.default_supplier_id
                LEFT JOIN warehouses w ON w.id = i.default_warehouse_id
                LEFT JOIN accounts sales_acc ON sales_acc.id = i.sales_account_id
                LEFT JOIN accounts cogs_acc ON cogs_acc.id = i.cogs_account_id
                LEFT JOIN accounts inv_acc ON inv_acc.id = i.inventory_account_id
                LEFT JOIN (
                    SELECT item_id, SUM(quantity) AS current_stock
                    FROM stock_balances
                    GROUP BY item_id
                ) sb ON sb.item_id = i.id
            `,
            primaryKey: 'id',
            selectMap: {
                id: 'i.id',
                code: "COALESCE(i.code, '')",
                barcode: "COALESCE(i.barcode, '')",
                name_ar: "COALESCE(i.name_ar, '')",
                name_en: "COALESCE(i.name_en, '')",
                name_he: "COALESCE(i.name_he, '')",
                trade_name: "COALESCE(i.trade_name, '')",
                category_name: "COALESCE(c.name_ar, '')",
                brand_name: "COALESCE(b.name_ar, '')",
                type: "COALESCE(i.type, '')",
                base_unit_name: "COALESCE(u.name_ar, u.name_en, u.code, '')",
                default_supplier_name: "COALESCE(sp.name_ar, sp.name_en, sp.code, '')",
                default_warehouse_name: "COALESCE(w.name_ar, w.name_en, w.name, w.code, '')",
                production_line: "COALESCE(i.production_line, '')",
                grade: "COALESCE(i.grade, '')",
                warranty_info: "COALESCE(i.warranty_info, '')",
                costing_method: "COALESCE(i.costing_method, '')",
                current_stock: 'CAST(COALESCE(sb.current_stock, 0) AS REAL)',
                cost_price: 'CAST(COALESCE(i.cost_price, 0) AS REAL)',
                standard_cost: 'CAST(COALESCE(i.standard_cost, 0) AS REAL)',
                min_stock_level: 'CAST(COALESCE(i.min_stock_level, 0) AS REAL)',
                max_stock: 'CAST(COALESCE(i.max_stock, 0) AS REAL)',
                reorder_point: 'CAST(COALESCE(i.reorder_point, 0) AS REAL)',
                sale_price: 'CAST(COALESCE(i.sale_price, 0) AS REAL)',
                min_price: 'CAST(COALESCE(i.min_price, 0) AS REAL)',
                floor_price: 'CAST(COALESCE(i.floor_price, 0) AS REAL)',
                wholesale_price: 'CAST(COALESCE(i.wholesale_price, 0) AS REAL)',
                tax_type: "COALESCE(i.tax_type, '')",
                tax_included: 'CAST(COALESCE(i.tax_included, 0) AS INTEGER)',
                has_expiry: 'CAST(COALESCE(i.has_expiry, 0) AS INTEGER)',
                has_serial: 'CAST(COALESCE(i.has_serial, 0) AS INTEGER)',
                shelf_life_days: 'CAST(COALESCE(i.shelf_life_days, 0) AS INTEGER)',
                sales_account_name: "COALESCE(sales_acc.name, sales_acc.code, '')",
                cogs_account_name: "COALESCE(cogs_acc.name, cogs_acc.code, '')",
                inventory_account_name: "COALESCE(inv_acc.name, inv_acc.code, '')",
                is_active: 'CAST(COALESCE(i.is_active, 1) AS INTEGER)',
                description: "COALESCE(i.description, '')"
            },
            sortMap: {
                code: 'i.code',
                barcode: 'i.barcode',
                name_ar: 'i.name_ar',
                name_en: 'i.name_en',
                name_he: 'i.name_he',
                trade_name: 'i.trade_name',
                category_name: 'c.name_ar',
                brand_name: 'b.name_ar',
                type: 'i.type',
                base_unit_name: 'COALESCE(u.name_ar, u.name_en, u.code)',
                default_supplier_name: 'COALESCE(sp.name_ar, sp.name_en, sp.code)',
                default_warehouse_name: 'COALESCE(w.name_ar, w.name_en, w.name, w.code)',
                production_line: 'i.production_line',
                grade: 'i.grade',
                warranty_info: 'i.warranty_info',
                costing_method: 'i.costing_method',
                current_stock: 'COALESCE(sb.current_stock, 0)',
                cost_price: 'COALESCE(i.cost_price, 0)',
                standard_cost: 'COALESCE(i.standard_cost, 0)',
                min_stock_level: 'COALESCE(i.min_stock_level, 0)',
                max_stock: 'COALESCE(i.max_stock, 0)',
                reorder_point: 'COALESCE(i.reorder_point, 0)',
                sale_price: 'i.sale_price',
                min_price: 'COALESCE(i.min_price, 0)',
                floor_price: 'COALESCE(i.floor_price, 0)',
                wholesale_price: 'COALESCE(i.wholesale_price, 0)',
                tax_type: 'i.tax_type',
                tax_included: 'COALESCE(i.tax_included, 0)',
                has_expiry: 'COALESCE(i.has_expiry, 0)',
                has_serial: 'COALESCE(i.has_serial, 0)',
                shelf_life_days: 'COALESCE(i.shelf_life_days, 0)',
                sales_account_name: 'COALESCE(sales_acc.name, sales_acc.code)',
                cogs_account_name: 'COALESCE(cogs_acc.name, cogs_acc.code)',
                inventory_account_name: 'COALESCE(inv_acc.name, inv_acc.code)',
                is_active: 'i.is_active'
            }
        },
        filterSchema: [
            {
                key: 'code',
                labelI18nKey: 'filter.items.code',
                field: 'i.code',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'barcode',
                labelI18nKey: 'filter.items.barcode',
                field: 'i.barcode',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'name_ar',
                labelI18nKey: 'filter.items.name_ar',
                field: 'i.name_ar',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'name_en',
                labelI18nKey: 'filter.items.name_en',
                field: 'i.name_en',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'name_he',
                labelI18nKey: 'filter.items.name_he',
                field: 'i.name_he',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'trade_name',
                labelI18nKey: 'filter.items.trade_name',
                field: 'i.trade_name',
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'category_name',
                labelI18nKey: 'filter.items.category_name',
                field: "COALESCE(c.name_ar, '')",
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'brand_name',
                labelI18nKey: 'filter.items.brand_name',
                field: "COALESCE(b.name_ar, '')",
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'type',
                labelI18nKey: 'filter.items.type',
                field: 'i.type',
                type: 'enum',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq'
            },
            {
                key: 'default_supplier_name',
                labelI18nKey: 'filter.items.default_supplier_name',
                field: "COALESCE(sp.name_ar, sp.name_en, sp.code, '')",
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'default_warehouse_name',
                labelI18nKey: 'filter.items.default_warehouse_name',
                field: "COALESCE(w.name_ar, w.name_en, w.name, w.code, '')",
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'tax_type',
                labelI18nKey: 'filter.items.tax_type',
                field: 'i.tax_type',
                type: 'text',
                operatorSet: ['contains', 'eq'],
                defaultOperator: 'eq'
            },
            {
                key: 'is_active',
                labelI18nKey: 'filter.items.is_active',
                field: 'i.is_active',
                type: 'boolean',
                operatorSet: ['eq'],
                defaultOperator: 'eq'
            },
            {
                key: 'cost_price',
                labelI18nKey: 'filter.items.cost_price',
                field: 'CAST(COALESCE(i.cost_price, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'between'
            },
            {
                key: 'sale_price',
                labelI18nKey: 'filter.items.sale_price',
                field: 'CAST(COALESCE(i.sale_price, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'between'
            },
            {
                key: 'current_stock',
                labelI18nKey: 'filter.items.current_stock',
                field: 'CAST(COALESCE(sb.current_stock, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'gte'
            },
            {
                key: 'min_stock_level',
                labelI18nKey: 'filter.items.min_stock_level',
                field: 'CAST(COALESCE(i.min_stock_level, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'lte'
            },
            {
                key: 'max_stock',
                labelI18nKey: 'filter.items.max_stock',
                field: 'CAST(COALESCE(i.max_stock, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'gte'
            },
            {
                key: 'reorder_point',
                labelI18nKey: 'filter.items.reorder_point',
                field: 'CAST(COALESCE(i.reorder_point, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'gte'
            },
            {
                key: 'has_expiry',
                labelI18nKey: 'filter.items.has_expiry',
                field: 'CAST(COALESCE(i.has_expiry, 0) AS INTEGER)',
                type: 'boolean',
                operatorSet: ['eq'],
                defaultOperator: 'eq'
            },
            {
                key: 'has_serial',
                labelI18nKey: 'filter.items.has_serial',
                field: 'CAST(COALESCE(i.has_serial, 0) AS INTEGER)',
                type: 'boolean',
                operatorSet: ['eq'],
                defaultOperator: 'eq'
            }
        ],
        columnSchema: [
            { key: 'id', labelI18nKey: 'column.common.id', field: 'id', type: 'text', defaultVisible: false, width: 120, sortable: false },
            { key: 'code', labelI18nKey: 'column.items.code', field: 'code', type: 'text', defaultVisible: true, width: 130, sortable: true },
            { key: 'barcode', labelI18nKey: 'column.items.barcode', field: 'barcode', type: 'text', defaultVisible: false, width: 140, sortable: true },
            { key: 'name_ar', labelI18nKey: 'column.items.name_ar', field: 'name_ar', type: 'text', defaultVisible: true, width: 220, sortable: true },
            { key: 'name_en', labelI18nKey: 'column.items.name_en', field: 'name_en', type: 'text', defaultVisible: true, width: 220, sortable: true },
            { key: 'name_he', labelI18nKey: 'column.items.name_he', field: 'name_he', type: 'text', defaultVisible: false, width: 180, sortable: true },
            { key: 'trade_name', labelI18nKey: 'column.items.trade_name', field: 'trade_name', type: 'text', defaultVisible: false, width: 180, sortable: true },
            { key: 'category_name', labelI18nKey: 'column.items.category_name', field: 'category_name', type: 'text', defaultVisible: false, width: 180, sortable: true },
            { key: 'brand_name', labelI18nKey: 'column.items.brand_name', field: 'brand_name', type: 'text', defaultVisible: false, width: 180, sortable: true },
            { key: 'type', labelI18nKey: 'column.items.type', field: 'type', type: 'enum', defaultVisible: true, width: 140, sortable: true },
            { key: 'base_unit_name', labelI18nKey: 'column.items.base_unit_name', field: 'base_unit_name', type: 'text', defaultVisible: true, width: 160, sortable: true },
            { key: 'default_supplier_name', labelI18nKey: 'column.items.default_supplier_name', field: 'default_supplier_name', type: 'text', defaultVisible: false, width: 180, sortable: true },
            { key: 'default_warehouse_name', labelI18nKey: 'column.items.default_warehouse_name', field: 'default_warehouse_name', type: 'text', defaultVisible: false, width: 180, sortable: true },
            { key: 'production_line', labelI18nKey: 'column.items.production_line', field: 'production_line', type: 'text', defaultVisible: false, width: 160, sortable: true },
            { key: 'grade', labelI18nKey: 'column.items.grade', field: 'grade', type: 'text', defaultVisible: false, width: 120, sortable: true },
            { key: 'warranty_info', labelI18nKey: 'column.items.warranty_info', field: 'warranty_info', type: 'text', defaultVisible: false, width: 160, sortable: true },
            { key: 'costing_method', labelI18nKey: 'column.items.costing_method', field: 'costing_method', type: 'text', defaultVisible: false, width: 140, sortable: true },
            { key: 'current_stock', labelI18nKey: 'column.items.current_stock', field: 'current_stock', type: 'number', defaultVisible: true, width: 140, sortable: true },
            { key: 'cost_price', labelI18nKey: 'column.items.cost_price', field: 'cost_price', type: 'number', defaultVisible: false, width: 130, sortable: true },
            { key: 'standard_cost', labelI18nKey: 'column.items.standard_cost', field: 'standard_cost', type: 'number', defaultVisible: false, width: 130, sortable: true },
            { key: 'min_stock_level', labelI18nKey: 'column.items.min_stock_level', field: 'min_stock_level', type: 'number', defaultVisible: false, width: 140, sortable: true },
            { key: 'max_stock', labelI18nKey: 'column.items.max_stock', field: 'max_stock', type: 'number', defaultVisible: false, width: 140, sortable: true },
            { key: 'reorder_point', labelI18nKey: 'column.items.reorder_point', field: 'reorder_point', type: 'number', defaultVisible: false, width: 140, sortable: true },
            { key: 'sale_price', labelI18nKey: 'column.items.sale_price', field: 'sale_price', type: 'number', defaultVisible: true, width: 140, sortable: true },
            { key: 'min_price', labelI18nKey: 'column.items.min_price', field: 'min_price', type: 'number', defaultVisible: false, width: 130, sortable: true },
            { key: 'floor_price', labelI18nKey: 'column.items.floor_price', field: 'floor_price', type: 'number', defaultVisible: false, width: 130, sortable: true },
            { key: 'wholesale_price', labelI18nKey: 'column.items.wholesale_price', field: 'wholesale_price', type: 'number', defaultVisible: false, width: 140, sortable: true },
            { key: 'tax_type', labelI18nKey: 'column.items.tax_type', field: 'tax_type', type: 'text', defaultVisible: false, width: 140, sortable: true },
            { key: 'tax_included', labelI18nKey: 'column.items.tax_included', field: 'tax_included', type: 'boolean', defaultVisible: false, width: 130, sortable: true },
            { key: 'has_expiry', labelI18nKey: 'column.items.has_expiry', field: 'has_expiry', type: 'boolean', defaultVisible: false, width: 120, sortable: true },
            { key: 'has_serial', labelI18nKey: 'column.items.has_serial', field: 'has_serial', type: 'boolean', defaultVisible: false, width: 120, sortable: true },
            { key: 'shelf_life_days', labelI18nKey: 'column.items.shelf_life_days', field: 'shelf_life_days', type: 'number', defaultVisible: false, width: 130, sortable: true },
            { key: 'inventory_account_name', labelI18nKey: 'column.items.inventory_account_name', field: 'inventory_account_name', type: 'text', defaultVisible: false, width: 200, sortable: true },
            { key: 'sales_account_name', labelI18nKey: 'column.items.sales_account_name', field: 'sales_account_name', type: 'text', defaultVisible: false, width: 200, sortable: true },
            { key: 'cogs_account_name', labelI18nKey: 'column.items.cogs_account_name', field: 'cogs_account_name', type: 'text', defaultVisible: false, width: 200, sortable: true },
            { key: 'description', labelI18nKey: 'column.items.description', field: 'description', type: 'text', defaultVisible: false, width: 260, sortable: false },
            { key: 'is_active', labelI18nKey: 'column.items.is_active', field: 'is_active', type: 'boolean', defaultVisible: true, width: 120, sortable: true }
        ],
        defaultSort: [
            { key: 'name_ar', direction: 'asc' },
            { key: 'code', direction: 'asc' }
        ]
    },
    {
        screenKey: 'reports.account_statement',
        labelI18nKey: 'screen.reports.account_statement',
        capabilityKey: 'core.reporting.view',
        source: {
            fromSql: `
                FROM transaction_lines tl
                INNER JOIN transactions t ON t.id = tl.transaction_id
                LEFT JOIN accounts a ON a.id = tl.account_id
            `,
            primaryKey: 'id',
            selectMap: {
                id: 'tl.id',
                account_id: "COALESCE(tl.account_id, '')",
                account_code: "COALESCE(a.code, '')",
                account_name: "COALESCE(a.name, '')",
                date: 'date(t.date)',
                type: "COALESCE(t.type, '')",
                ref_no: "COALESCE(t.voucher_no, '')",
                description: "COALESCE(tl.description, t.description, '')",
                debit: 'CAST(COALESCE(tl.debit, 0) AS REAL)',
                credit: 'CAST(COALESCE(tl.credit, 0) AS REAL)'
            },
            sortMap: {
                account_code: 'a.code',
                account_name: 'a.name',
                date: 't.date',
                type: 't.type',
                ref_no: 'COALESCE(t.voucher_no, \'\')',
                description: 'COALESCE(tl.description, t.description)',
                debit: 'tl.debit',
                credit: 'tl.credit'
            }
        },
        filterSchema: [
            {
                key: 'account_id',
                labelI18nKey: 'filter.account_statement.account_id',
                field: 'tl.account_id',
                type: 'lookup',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq',
                lookupSource: 'accounts'
            },
            {
                key: 'date',
                labelI18nKey: 'filter.account_statement.date',
                field: 'date(t.date)',
                type: 'date',
                operatorSet: ['eq', 'between', 'gte', 'lte'],
                defaultOperator: 'between'
            },
            {
                key: 'type',
                labelI18nKey: 'filter.account_statement.type',
                field: 't.type',
                type: 'enum',
                operatorSet: ['eq', 'in'],
                defaultOperator: 'eq'
            },
            {
                key: 'ref_no',
                labelI18nKey: 'filter.account_statement.ref_no',
                field: "COALESCE(t.voucher_no, '')",
                type: 'text',
                operatorSet: ['contains', 'eq', 'starts_with'],
                defaultOperator: 'contains'
            },
            {
                key: 'description',
                labelI18nKey: 'filter.account_statement.description',
                field: 'COALESCE(tl.description, t.description)',
                type: 'text',
                operatorSet: ['contains', 'eq'],
                defaultOperator: 'contains'
            },
            {
                key: 'debit',
                labelI18nKey: 'filter.account_statement.debit',
                field: 'CAST(COALESCE(tl.debit, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'between'
            },
            {
                key: 'credit',
                labelI18nKey: 'filter.account_statement.credit',
                field: 'CAST(COALESCE(tl.credit, 0) AS REAL)',
                type: 'number',
                operatorSet: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
                defaultOperator: 'between'
            }
        ],
        columnSchema: [
            { key: 'id', labelI18nKey: 'column.common.id', field: 'id', type: 'text', defaultVisible: false, width: 120, sortable: false },
            { key: 'date', labelI18nKey: 'column.account_statement.date', field: 'date', type: 'date', defaultVisible: true, width: 120, sortable: true },
            { key: 'type', labelI18nKey: 'column.account_statement.type', field: 'type', type: 'enum', defaultVisible: true, width: 100, sortable: true },
            { key: 'ref_no', labelI18nKey: 'column.account_statement.ref_no', field: 'ref_no', type: 'text', defaultVisible: true, width: 150, sortable: true },
            { key: 'description', labelI18nKey: 'column.account_statement.description', field: 'description', type: 'text', defaultVisible: true, width: 300, sortable: true },
            { key: 'debit', labelI18nKey: 'column.account_statement.debit', field: 'debit', type: 'number', defaultVisible: true, width: 140, sortable: true },
            { key: 'credit', labelI18nKey: 'column.account_statement.credit', field: 'credit', type: 'number', defaultVisible: true, width: 140, sortable: true },
            { key: 'account_code', labelI18nKey: 'column.account_statement.account_code', field: 'account_code', type: 'text', defaultVisible: true, width: 140, sortable: true },
            { key: 'account_name', labelI18nKey: 'column.account_statement.account_name', field: 'account_name', type: 'text', defaultVisible: true, width: 220, sortable: true }
        ],
        defaultSort: [
            { key: 'date', direction: 'desc' },
            { key: 'ref_no', direction: 'desc' }
        ]
    }
];

export const SCREEN_DEFINITIONS: Record<ScreenKey, ScreenDefinition> = SCREEN_DEFINITION_LIST.reduce((acc, item) => {
    acc[item.screenKey] = item;
    return acc;
}, {} as Record<ScreenKey, ScreenDefinition>);

export function getScreenDefinition(screenKey: ScreenKey): ScreenDefinition | null {
    return SCREEN_DEFINITIONS[screenKey] || null;
}

export function listScreenDefinitions(): ScreenDefinition[] {
    return SCREEN_DEFINITION_LIST.slice();
}
