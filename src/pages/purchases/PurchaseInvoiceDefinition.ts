import { purchaseInvoiceClient } from '../../lib/purchaseInvoiceClient';
import { DocumentDefinition } from '../../types/DocumentDefinition';

const CURRENCY_PRECISION = 2;

function roundAmount(value: number, precision = CURRENCY_PRECISION): number {
    const factor = 10 ** precision;
    return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
}

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const PurchaseInvoiceDefinition: DocumentDefinition<any, any> = {
    docType: 'purchase_invoice',
    screenKey: 'purchases.invoice.list',
    title: 'Purchase Invoice',
    listRoute: '/purchases/invoices',
    docRoute: '/purchases/invoices/:id',
    newDocRoute: '/purchases/invoices/new',

    permissions: {
        post: 'purchase.invoice.post',
        submit: 'purchase.invoice.update',
        reopen: 'purchase.invoice.update',
    },

    capabilities: {
        create: 'purchase.invoice.create',
        read: 'purchase.invoice.read',
        update: 'purchase.invoice.update',
        post: 'purchase.invoice.post',
        print: 'purchase.invoice.print',
        void: 'purchase.invoice.void',
    },

    numbering: {
        sequenceKey: 'purchase_invoice',
        fieldKey: 'invoice_no',
        prefix: 'PINV-',
        readonly: true,
    },

    workflow: {
        submitOnMissingPostPermission: true,
    },

    policy: {
        lockedPeriodGuardKey: 'control_date_guard',
    },

    client: purchaseInvoiceClient,

    listColumns: [
        { key: 'invoice_no', label: 'Invoice No', width: 130, align: 'right' },
        { key: 'doc_date', label: 'Date', width: 120, align: 'right' },
        { key: 'supplier_name', label: 'Supplier', align: 'right' },
        {
            key: 'grand_total',
            label: 'Grand Total',
            width: 130,
            align: 'right',
            render: (value) => roundAmount(toNumber(value)).toFixed(CURRENCY_PRECISION),
        },
    ],

    headerFields: [
        { key: 'invoice_no', label: 'Invoice No', labelI18nKey: 'doc.purchase_invoice.header.invoice_no', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'Date', labelI18nKey: 'doc.purchase_invoice.header.doc_date', type: 'date', span: 1 },
        { key: 'supplier_id', label: 'Supplier', labelI18nKey: 'doc.purchase_invoice.header.supplier', type: 'lookup', span: 1 },
        { key: 'vendor_invoice_no', label: 'Vendor Invoice No', labelI18nKey: 'doc.purchase_invoice.header.vendor_invoice_no', type: 'text', span: 1 },
        { key: 'warehouse_id', label: 'Warehouse', labelI18nKey: 'doc.purchase_invoice.header.warehouse', type: 'select', span: 1 },
        { key: 'currency_id', label: 'Currency', labelI18nKey: 'doc.purchase_invoice.header.currency', type: 'select', span: 1 },
        { key: 'tax_group_id', label: 'Tax Group', labelI18nKey: 'doc.purchase_invoice.header.tax_group', type: 'select', span: 1 },
        { key: 'status', label: 'Status', labelI18nKey: 'doc.purchase_invoice.header.status', type: 'readonly', span: 1 },
        { key: 'remarks', label: 'Remarks', labelI18nKey: 'doc.purchase_invoice.header.remarks', type: 'textarea', span: 2 },
    ],
    headerSchema: [
        { key: 'invoice_no', label: 'Invoice No', labelI18nKey: 'doc.purchase_invoice.header.invoice_no', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'Date', labelI18nKey: 'doc.purchase_invoice.header.doc_date', type: 'date', span: 1 },
        { key: 'supplier_id', label: 'Supplier', labelI18nKey: 'doc.purchase_invoice.header.supplier', type: 'lookup', span: 1 },
        { key: 'vendor_invoice_no', label: 'Vendor Invoice No', labelI18nKey: 'doc.purchase_invoice.header.vendor_invoice_no', type: 'text', span: 1 },
        { key: 'warehouse_id', label: 'Warehouse', labelI18nKey: 'doc.purchase_invoice.header.warehouse', type: 'select', span: 1 },
        { key: 'currency_id', label: 'Currency', labelI18nKey: 'doc.purchase_invoice.header.currency', type: 'select', span: 1 },
        { key: 'tax_group_id', label: 'Tax Group', labelI18nKey: 'doc.purchase_invoice.header.tax_group', type: 'select', span: 1 },
        { key: 'status', label: 'Status', labelI18nKey: 'doc.purchase_invoice.header.status', type: 'readonly', span: 1 },
        { key: 'remarks', label: 'Remarks', labelI18nKey: 'doc.purchase_invoice.header.remarks', type: 'textarea', span: 2 },
    ],

    lineColumns: [
        { key: 'item_code_lookup', label: 'Item Code', width: '140px', editable: true, inputType: 'text' },
        { key: 'item_name', label: 'Item', width: '260px', editable: false, inputType: 'readonly' },
        { key: 'qty', label: 'Qty', width: '90px', editable: true, inputType: 'number', align: 'right' },
        { key: 'price', label: 'Price', width: '120px', editable: true, inputType: 'number', align: 'right' },
        { key: 'discount', label: 'Discount %', width: '110px', editable: true, inputType: 'number', align: 'right' },
        { key: 'tax_rate', label: 'Tax %', width: '90px', editable: true, inputType: 'number', align: 'right' },
        {
            key: 'line_total',
            label: 'Line Total',
            width: '130px',
            editable: false,
            inputType: 'readonly',
            align: 'right',
            computed: true,
            render: (value: any) => roundAmount(toNumber(value)).toFixed(CURRENCY_PRECISION),
        },
    ],
    linesSchema: [
        { key: 'item_code_lookup', label: 'Item Code', width: '140px', editable: true, inputType: 'text' },
        { key: 'item_name', label: 'Item', width: '260px', editable: false, inputType: 'readonly' },
        { key: 'qty', label: 'Qty', width: '90px', editable: true, inputType: 'number', align: 'right' },
        { key: 'price', label: 'Price', width: '120px', editable: true, inputType: 'number', align: 'right' },
        { key: 'discount', label: 'Discount %', width: '110px', editable: true, inputType: 'number', align: 'right' },
        { key: 'tax_rate', label: 'Tax %', width: '90px', editable: true, inputType: 'number', align: 'right' },
        {
            key: 'line_total',
            label: 'Line Total',
            width: '130px',
            editable: false,
            inputType: 'readonly',
            align: 'right',
            computed: true,
            render: (value: any) => roundAmount(toNumber(value)).toFixed(CURRENCY_PRECISION),
        },
    ],

    totals: {
        subtotalKey: 'subtotal',
        discountKey: 'discount_total',
        taxKey: 'tax_total',
        grandTotalKey: 'grand_total',
        subtotalLabel: 'Subtotal',
        discountLabel: 'Discount',
        taxLabel: 'Tax',
        grandTotalLabel: 'Grand Total',
        subtotalLabelI18nKey: 'doc.purchase_invoice.totals.subtotal',
        discountLabelI18nKey: 'doc.purchase_invoice.totals.discount',
        taxLabelI18nKey: 'doc.purchase_invoice.totals.tax',
        grandTotalLabelI18nKey: 'doc.purchase_invoice.totals.grand_total',
    },

    defaultValues: {
        header: {
            status: 'DRAFT',
            doc_date: new Date().toISOString().slice(0, 10),
            currency_id: 'ILS',
            exchange_rate: 1,
        },
    },

    emptyLine: {
        id: '',
        item_id: '',
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

    normalize: (header: any, lines: any[]) => {
        const normalizedHeader = {
            ...header,
            doc_date: String(header?.doc_date || header?.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
            supplier_id: String(header?.supplier_id || header?.customer_id || '').trim(),
            warehouse_id: String(header?.warehouse_id || '').trim(),
            currency_id: String(header?.currency_id || 'ILS').trim() || 'ILS',
            tax_group_id: String(header?.tax_group_id || '').trim(),
            vendor_invoice_no: String(header?.vendor_invoice_no || '').trim(),
            remarks: String(header?.remarks || header?.notes || '').trim(),
            notes: String(header?.notes || header?.remarks || '').trim(),
        };

        const normalizedLines = (Array.isArray(lines) ? lines : []).map((line: any) => ({
            ...line,
            item_id: String(line?.item_id || '').trim(),
            item_code_lookup: String(line?.item_code_lookup || line?.item_code || '').trim(),
            item_name: String(line?.item_name || line?.description || '').trim(),
            qty: toNumber(line?.qty ?? line?.quantity, 0),
            price: toNumber(line?.price ?? line?.unit_price, 0),
            discount: toNumber(line?.discount, 0),
            tax_rate: toNumber(line?.tax_rate, 0),
        }));

        return {
            header: normalizedHeader,
            lines: normalizedLines,
        };
    },

    validate: (header: any, lines: any[]) => {
        const errors: Array<{ field: string; message: string; messageKey?: string }> = [];
        if (!String(header?.supplier_id || header?.customer_id || '').trim()) {
            errors.push({
                field: 'supplier_id',
                message: 'Supplier is required',
                messageKey: 'validation.purchase_invoice.supplier_required',
            });
        }
        if (!String(header?.doc_date || '').trim()) {
            errors.push({
                field: 'doc_date',
                message: 'Date is required',
                messageKey: 'validation.purchase_invoice.date_required',
            });
        }

        const validLines = (Array.isArray(lines) ? lines : []).filter(
            (line: any) =>
                String(line?.item_id || line?.item_code_lookup || line?.item_code || '').trim() !== '' ||
                toNumber(line?.qty ?? line?.quantity, 0) > 0 ||
                toNumber(line?.price ?? line?.unit_price, 0) > 0,
        );

        if (validLines.length === 0) {
            errors.push({
                field: 'lines',
                message: 'At least one valid line is required',
                messageKey: 'validation.purchase_invoice.lines_required',
            });
        }

        validLines.forEach((line: any, index: number) => {
            const qty = toNumber(line?.qty ?? line?.quantity, 0);
            const price = toNumber(line?.price ?? line?.unit_price, 0);
            if (!String(line?.item_id || line?.item_code_lookup || line?.item_code || '').trim()) {
                errors.push({
                    field: `lines[${index}].item_id`,
                    message: 'Item is required',
                    messageKey: 'validation.purchase_invoice.line_item_required',
                });
            }
            if (qty <= 0) {
                errors.push({
                    field: `lines[${index}].qty`,
                    message: 'Quantity must be greater than zero',
                    messageKey: 'validation.purchase_invoice.qty_positive',
                });
            }
            if (price < 0) {
                errors.push({
                    field: `lines[${index}].price`,
                    message: 'Price cannot be negative',
                    messageKey: 'validation.purchase_invoice.price_non_negative',
                });
            }
        });

        return { ok: errors.length === 0, errors };
    },

    recalcLine: (line: any) => {
        const qty = toNumber(line?.qty ?? line?.quantity, 0);
        const price = toNumber(line?.price ?? line?.unit_price, 0);
        const discountRate = Math.min(Math.max(toNumber(line?.discount, 0), 0), 100);
        const taxRate = Math.min(Math.max(toNumber(line?.tax_rate, 0), 0), 100);

        const gross = qty * price;
        const discountValue = gross * (discountRate / 100);
        const netBeforeTax = gross - discountValue;
        const taxValue = netBeforeTax * (taxRate / 100);
        const lineTotal = netBeforeTax + taxValue;

        return {
            ...line,
            qty,
            price,
            discount: discountRate,
            tax_rate: taxRate,
            total_price: roundAmount(netBeforeTax),
            tax_amount: roundAmount(taxValue),
            net_total: roundAmount(lineTotal),
            line_total: roundAmount(lineTotal),
        };
    },

    recalcTotals: (lines: any[]) => {
        const source = Array.isArray(lines) ? lines : [];
        let subtotal = 0;
        let discountTotal = 0;
        let taxTotal = 0;
        let grandTotal = 0;

        source.forEach((line: any) => {
            const qty = toNumber(line?.qty ?? line?.quantity, 0);
            const price = toNumber(line?.price ?? line?.unit_price, 0);
            const discountRate = Math.min(Math.max(toNumber(line?.discount, 0), 0), 100);
            const taxRate = Math.min(Math.max(toNumber(line?.tax_rate, 0), 0), 100);

            const gross = qty * price;
            const discountValue = gross * (discountRate / 100);
            const netBeforeTax = gross - discountValue;
            const taxValue = netBeforeTax * (taxRate / 100);
            const lineTotal = netBeforeTax + taxValue;

            subtotal += netBeforeTax;
            discountTotal += discountValue;
            taxTotal += taxValue;
            grandTotal += lineTotal;
        });

        return {
            subtotal: roundAmount(subtotal),
            discount_total: roundAmount(discountTotal),
            tax_total: roundAmount(taxTotal),
            grand_total: roundAmount(grandTotal),
        } as any;
    },

    computeTotals: (lines: any[]) => {
        return (PurchaseInvoiceDefinition.recalcTotals as any)(lines);
    },

    lineLookup: {
        fieldKey: 'item_code_lookup',
        type: 'item',
    },
};

