import { InvoiceHeader, InvoiceLine, salesInvoiceClient } from '../../lib/salesInvoiceClient';
import { DocumentDefinition, ValidationIssue } from '../../types/DocumentDefinition';

const CURRENCY_PRECISION = 2;
const TODAY = new Date().toISOString().slice(0, 10);

export const SALES_INVOICE_DOC_TYPE = 'sales_invoice' as const;
export const SALES_INVOICE_SCREEN_KEY = 'sales.invoice.list' as const;
export const SALES_INVOICE_CAPABILITY_KEYS = [
    'sales.invoice.create',
    'sales.invoice.read',
    'sales.invoice.update',
    'sales.invoice.post',
    'sales.invoice.print',
    'sales.invoice.void',
] as const;

function roundAmount(value: number, precision = CURRENCY_PRECISION): number {
    const factor = 10 ** precision;
    return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
}

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeHeader(header: Partial<InvoiceHeader>): Partial<InvoiceHeader> {
    return {
        ...header,
        doc_date: String(header.doc_date || TODAY).slice(0, 10),
        due_date: String(header.due_date || header.doc_date || TODAY).slice(0, 10),
        customer_id: String(header.customer_id || '').trim(),
        customer_name: String(header.customer_name || '').trim(),
        branch_id: String(header.branch_id || '').trim(),
        warehouse_id: String(header.warehouse_id || '').trim(),
        currency_id: String(header.currency_id || 'ILS').trim() || 'ILS',
        exchange_rate: toNumber(header.exchange_rate, 1) || 1,
        tax_group_id: String(header.tax_group_id || '').trim(),
        price_list_id: String(header.price_list_id || '').trim(),
        payment_method_id: String(header.payment_method_id || '').trim(),
        sales_rep_id: String(header.sales_rep_id || '').trim(),
        cost_center_id: String(header.cost_center_id || '').trim(),
        manual_ref: String(header.manual_ref || '').trim(),
        remarks: String(header.remarks || header.notes || '').trim(),
        notes: String(header.notes || header.remarks || '').trim(),
    };
}

function normalizeLine(line: Partial<InvoiceLine>): InvoiceLine {
    return {
        id: String(line.id || ''),
        line_no: Number(line.line_no || 0),
        item_id: String(line.item_id || '').trim(),
        item_name: String(line.item_name || '').trim(),
        item_code: String(line.item_code || '').trim(),
        item_code_lookup: String(line.item_code_lookup || line.item_code || '').trim(),
        qty: toNumber(line.qty, 0),
        price: toNumber(line.price, 0),
        discount: toNumber(line.discount, 0),
        tax_rate: toNumber(line.tax_rate, 0),
        tax_amount: toNumber(line.tax_amount, 0),
        total_price: toNumber(line.total_price, 0),
        net_total: toNumber(line.net_total, 0),
        line_total: toNumber(line.line_total, 0),
    };
}

function recalcLine(line: Partial<InvoiceLine>): InvoiceLine {
    const normalized = normalizeLine(line);
    const qty = toNumber(normalized.qty, 0);
    const price = toNumber(normalized.price, 0);
    const discountRate = Math.min(Math.max(toNumber(normalized.discount, 0), 0), 100);
    const taxRate = Math.min(Math.max(toNumber(normalized.tax_rate, 0), 0), 100);

    const gross = qty * price;
    const discountValue = gross * (discountRate / 100);
    const netBeforeTax = gross - discountValue;
    const taxValue = netBeforeTax * (taxRate / 100);
    const lineTotal = netBeforeTax + taxValue;

    return {
        ...normalized,
        qty,
        price,
        discount: discountRate,
        tax_rate: taxRate,
        total_price: roundAmount(netBeforeTax),
        tax_amount: roundAmount(taxValue),
        net_total: roundAmount(lineTotal),
        line_total: roundAmount(lineTotal),
    };
}

function computeTotals(lines: InvoiceLine[]) {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    for (const rawLine of Array.isArray(lines) ? lines : []) {
        const line = recalcLine(rawLine);
        const gross = toNumber(line.qty, 0) * toNumber(line.price, 0);
        const discountValue = gross * (toNumber(line.discount, 0) / 100);
        const netBeforeTax = gross - discountValue;
        const taxValue = netBeforeTax * (toNumber(line.tax_rate, 0) / 100);
        const lineTotal = netBeforeTax + taxValue;

        subtotal += netBeforeTax;
        discountTotal += discountValue;
        taxTotal += taxValue;
        grandTotal += lineTotal;
    }

    return {
        subtotal: roundAmount(subtotal),
        discount_total: roundAmount(discountTotal),
        tax_total: roundAmount(taxTotal),
        grand_total: roundAmount(grandTotal),
    };
}

function validate(header: Partial<InvoiceHeader>, lines: InvoiceLine[]) {
    const errors: ValidationIssue[] = [];

    if (!String(header.customer_id || '').trim()) {
        errors.push({
            field: 'customer_id',
            message: 'Customer is required',
            messageKey: 'validation.sales_invoice.customer_required',
        });
    }

    if (!String(header.doc_date || '').trim()) {
        errors.push({
            field: 'doc_date',
            message: 'Date is required',
            messageKey: 'validation.sales_invoice.date_required',
        });
    }

    const validLines = (Array.isArray(lines) ? lines : []).filter((line) => {
        const marker = String(line.item_id || line.item_code_lookup || line.item_code || '').trim();
        return marker !== '' || toNumber(line.qty, 0) > 0 || toNumber(line.price, 0) > 0;
    });

    if (validLines.length === 0) {
        errors.push({
            field: 'lines',
            message: 'At least one valid line is required',
            messageKey: 'validation.sales_invoice.lines_required',
        });
    }

    validLines.forEach((line, index) => {
        if (!String(line.item_id || line.item_code_lookup || line.item_code || '').trim()) {
            errors.push({
                field: `lines[${index}].item_id`,
                message: 'Item is required',
                messageKey: 'validation.sales_invoice.line_item_required',
            });
        }

        if (toNumber(line.qty, 0) <= 0) {
            errors.push({
                field: `lines[${index}].qty`,
                message: 'Quantity must be greater than zero',
                messageKey: 'validation.sales_invoice.qty_positive',
            });
        }

        if (toNumber(line.price, 0) < 0) {
            errors.push({
                field: `lines[${index}].price`,
                message: 'Price cannot be negative',
                messageKey: 'validation.sales_invoice.price_non_negative',
            });
        }
    });

    return { ok: errors.length === 0, errors };
}

const SALES_INVOICE_HEADER_SCHEMA: DocumentDefinition<InvoiceHeader, InvoiceLine>['headerFields'] = [
    { key: 'invoice_no', label: 'Invoice No', labelI18nKey: 'doc.sales_invoice.header.invoice_no', type: 'readonly', span: 1 },
    { key: 'doc_date', label: 'Date', labelI18nKey: 'doc.sales_invoice.header.doc_date', type: 'date', span: 1 },
    { key: 'due_date', label: 'Due Date', type: 'date', span: 1 },
    { key: 'customer_id', label: 'Customer', labelI18nKey: 'doc.sales_invoice.header.customer', type: 'lookup', lookupKey: 'salesInvoices:searchCustomers', span: 1 },
    { key: 'branch_id', label: 'Branch', type: 'readonly', span: 1 },
    { key: 'warehouse_id', label: 'Warehouse', labelI18nKey: 'doc.sales_invoice.header.warehouse', type: 'select', span: 1 },
    { key: 'currency_id', label: 'Currency', labelI18nKey: 'doc.sales_invoice.header.currency', type: 'select', span: 1 },
    { key: 'exchange_rate', label: 'Exchange Rate', type: 'number', span: 1 },
    { key: 'price_list_id', label: 'Price List', type: 'select', span: 1 },
    { key: 'payment_method_id', label: 'Payment Method', type: 'select', span: 1 },
    { key: 'sales_rep_id', label: 'Sales Rep', type: 'select', span: 1 },
    { key: 'tax_group_id', label: 'Tax Group', labelI18nKey: 'doc.sales_invoice.header.tax_group', type: 'select', span: 1 },
    { key: 'cost_center_id', label: 'Cost Center', type: 'select', span: 1 },
    { key: 'manual_ref', label: 'Reference No', type: 'text', span: 1 },
    { key: 'status', label: 'Status', labelI18nKey: 'doc.sales_invoice.header.status', type: 'readonly', span: 1 },
    { key: 'remarks', label: 'Remarks', labelI18nKey: 'doc.sales_invoice.header.remarks', type: 'textarea', span: 2 },
];

const SALES_INVOICE_LINES_SCHEMA: DocumentDefinition<InvoiceHeader, InvoiceLine>['lineColumns'] = [
    { key: 'item_code_lookup', label: 'Item Code', width: '140px', editable: true, inputType: 'text' },
    { key: 'item_name', label: 'Item', width: '260px', editable: false, inputType: 'readonly' },
    { key: 'qty', label: 'Qty', width: '90px', editable: true, inputType: 'number', align: 'right' },
    { key: 'price', label: 'Price', width: '120px', editable: true, inputType: 'number', align: 'right' },
    { key: 'discount', label: 'Discount %', width: '110px', editable: true, inputType: 'number', align: 'right' },
    { key: 'tax_rate', label: 'Tax %', width: '90px', editable: true, inputType: 'number', align: 'right' },
    {
        key: 'tax_amount',
        label: 'Tax',
        width: '110px',
        editable: false,
        inputType: 'readonly',
        align: 'right',
        computed: true,
        render: (value: unknown) => roundAmount(toNumber(value)).toFixed(CURRENCY_PRECISION),
    },
    {
        key: 'line_total',
        label: 'Line Total',
        width: '130px',
        editable: false,
        inputType: 'readonly',
        align: 'right',
        computed: true,
        render: (value: unknown) => roundAmount(toNumber(value)).toFixed(CURRENCY_PRECISION),
    },
];

export const SalesInvoiceDefinition: DocumentDefinition<InvoiceHeader, InvoiceLine> = {
    docType: SALES_INVOICE_DOC_TYPE,
    screenKey: SALES_INVOICE_SCREEN_KEY,
    title: 'Sales Invoice',
    listRoute: '/sales/invoices',
    docRoute: '/sales/invoices/:id',
    newDocRoute: '/sales/invoices/new',

    permissions: {
        post: 'sales.invoice.post',
        submit: 'sales.invoice.update',
        reopen: 'sales.invoice.update',
    },

    capabilities: {
        create: 'sales.invoice.create',
        read: 'sales.invoice.read',
        update: 'sales.invoice.update',
        post: 'sales.invoice.post',
        print: 'sales.invoice.print',
        void: 'sales.invoice.void',
    },
    capabilityKeys: [...SALES_INVOICE_CAPABILITY_KEYS],

    statusRules: {
        editable: ['DRAFT', 'REJECTED'],
        postable: ['DRAFT'],
        voidable: ['DRAFT', 'POSTED'],
        reopenable: ['REJECTED'],
        transitions: {
            DRAFT: ['PENDING_APPROVAL_L1', 'PENDING_APPROVAL_L2', 'POSTED', 'VOID'],
            PENDING_APPROVAL_L1: ['POSTED', 'REJECTED', 'DRAFT', 'VOID'],
            PENDING_APPROVAL_L2: ['POSTED', 'REJECTED', 'DRAFT', 'VOID'],
            REJECTED: ['DRAFT'],
            POSTED: ['VOID'],
            VOID: [],
        },
    },

    postingPolicy: {
        idempotent: true,
        submitOnMissingPostPermission: true,
        postedTokenField: 'posted_token',
        postedOnceField: 'posted_once',
        alreadyPostedAction: 'already_posted',
        conflictErrorCode: 'CONFLICT',
    },

    numbering: {
        sequenceKey: SALES_INVOICE_DOC_TYPE,
        fieldKey: 'invoice_no',
        prefix: 'INV-',
        readonly: true,
    },

    workflow: {
        submitOnMissingPostPermission: true,
    },

    policy: {
        lockedPeriodGuardKey: 'control_date_guard',
    },

    client: salesInvoiceClient,

    listColumns: [
        { key: 'invoice_no', label: 'Invoice No', width: 130, align: 'right' },
        { key: 'doc_date', label: 'Date', width: 120, align: 'right' },
        { key: 'customer_name', label: 'Customer', align: 'right' },
        {
            key: 'grand_total',
            label: 'Grand Total',
            width: 130,
            align: 'right',
            render: (value) => roundAmount(toNumber(value)).toFixed(CURRENCY_PRECISION),
        },
    ],

    headerFields: SALES_INVOICE_HEADER_SCHEMA,
    headerSchema: SALES_INVOICE_HEADER_SCHEMA,

    lineColumns: SALES_INVOICE_LINES_SCHEMA,
    linesSchema: SALES_INVOICE_LINES_SCHEMA,

    totals: {
        subtotalKey: 'subtotal',
        discountKey: 'discount_total',
        taxKey: 'tax_total',
        grandTotalKey: 'grand_total',
        subtotalLabel: 'Subtotal',
        discountLabel: 'Discount',
        taxLabel: 'Tax',
        grandTotalLabel: 'Grand Total',
        subtotalLabelI18nKey: 'doc.sales_invoice.totals.subtotal',
        discountLabelI18nKey: 'doc.sales_invoice.totals.discount',
        taxLabelI18nKey: 'doc.sales_invoice.totals.tax',
        grandTotalLabelI18nKey: 'doc.sales_invoice.totals.grand_total',
    },

    defaultValues: {
        header: {
            status: 'DRAFT',
            doc_date: TODAY,
            due_date: TODAY,
            currency_id: 'ILS',
            exchange_rate: 1,
        },
    },

    emptyLine: {
        id: '',
        item_id: '',
        item_code: '',
        item_code_lookup: '',
        item_name: '',
        qty: 1,
        price: 0,
        discount: 0,
        tax_rate: 0,
        tax_amount: 0,
        total_price: 0,
        line_total: 0,
        net_total: 0,
    },

    normalize: (header, lines) => ({
        header: normalizeHeader(header),
        lines: (Array.isArray(lines) ? lines : []).map((line) => normalizeLine(line)),
    }),

    validate,

    recalcLine: (line) => recalcLine(line),

    recalcTotals: (lines) => computeTotals(Array.isArray(lines) ? lines : []),

    computeTotals: (lines) => computeTotals(Array.isArray(lines) ? lines : []),

    lineLookup: {
        fieldKey: 'item_code_lookup',
        type: 'item',
    },

    loadSelectOptions: async () => {
        const api = (window as any)?.electronAPI;
        const [priceLists, paymentMethods, salesReps] = await Promise.all([
            api?.partner?.getPriceLists?.() || Promise.resolve([]),
            api?.masterData?.getPaymentMethods?.() || Promise.resolve([]),
            api?.partner?.getSalesReps?.() || Promise.resolve([]),
        ]);

        return {
            price_list_id: Array.isArray(priceLists)
                ? priceLists.map((row: any) => ({
                    id: String(row?.id || ''),
                    label: String(row?.name_ar || row?.name_en || row?.name || row?.code || ''),
                })).filter((row: any) => row.id)
                : [],
            payment_method_id: Array.isArray(paymentMethods)
                ? paymentMethods.map((row: any) => ({
                    id: String(row?.id || ''),
                    label: String(row?.name_ar || row?.name_en || row?.name || ''),
                })).filter((row: any) => row.id)
                : [],
            sales_rep_id: Array.isArray(salesReps)
                ? salesReps.map((row: any) => ({
                    id: String(row?.id || ''),
                    label: String(row?.name_ar || row?.name_en || row?.name || row?.code || ''),
                })).filter((row: any) => row.id)
                : [],
        };
    },
};
