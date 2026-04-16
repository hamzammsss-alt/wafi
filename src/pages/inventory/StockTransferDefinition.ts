import { stockTransferClient } from '../../lib/stockTransferClient';
import { DocumentDefinition } from '../../types/DocumentDefinition';

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const StockTransferDefinition: DocumentDefinition<any, any> = {
    docType: 'stock_transfer',
    screenKey: 'inventory.stock_transfer.list',
    title: 'Stock Transfer',
    listRoute: '/inventory/stock-transfers',
    docRoute: '/inventory/stock-transfers/:id',
    newDocRoute: '/inventory/stock-transfers/new',

    permissions: {
        post: 'inventory.stock_transfer.post',
        submit: 'inventory.stock_transfer.update',
        reopen: 'inventory.stock_transfer.update',
    },

    capabilities: {
        create: 'inventory.stock_transfer.create',
        read: 'inventory.stock_transfer.read',
        update: 'inventory.stock_transfer.update',
        post: 'inventory.stock_transfer.post',
        print: 'inventory.stock_transfer.print',
        void: 'inventory.stock_transfer.void',
    },

    numbering: {
        sequenceKey: 'stock_transfer',
        fieldKey: 'code',
        prefix: 'STF-',
        readonly: true,
    },

    workflow: {
        submitOnMissingPostPermission: true,
    },

    policy: {
        lockedPeriodGuardKey: 'control_date_guard',
    },

    client: stockTransferClient,

    listColumns: [
        { key: 'code', label: 'Transfer No', width: 150, align: 'right' },
        { key: 'doc_date', label: 'Date', width: 120, align: 'right' },
        { key: 'from_warehouse_name', label: 'From Warehouse', align: 'right' },
        { key: 'to_warehouse_name', label: 'To Warehouse', align: 'right' },
        { key: 'total_qty', label: 'Total Qty', width: 110, align: 'right' },
    ],

    headerFields: [
        { key: 'code', label: 'Transfer No', labelI18nKey: 'doc.stock_transfer.header.code', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'Date', labelI18nKey: 'doc.stock_transfer.header.doc_date', type: 'date', span: 1 },
        {
            key: 'request_type',
            label: 'Type',
            labelI18nKey: 'doc.stock_transfer.header.request_type',
            type: 'select',
            span: 1,
            options: [
                { value: 'TRANSFER', label: 'Transfer', labelI18nKey: 'doc.stock_transfer.type.transfer' },
                { value: 'DIRECT', label: 'Direct', labelI18nKey: 'doc.stock_transfer.type.direct' },
            ],
        },
        { key: 'from_warehouse_id', label: 'From Warehouse', labelI18nKey: 'doc.stock_transfer.header.from_warehouse', type: 'select', span: 1 },
        { key: 'to_warehouse_id', label: 'To Warehouse', labelI18nKey: 'doc.stock_transfer.header.to_warehouse', type: 'select', span: 1 },
        { key: 'status', label: 'Status', labelI18nKey: 'doc.stock_transfer.header.status', type: 'readonly', span: 1 },
        { key: 'remarks', label: 'Remarks', labelI18nKey: 'doc.stock_transfer.header.remarks', type: 'textarea', span: 2 },
    ],
    headerSchema: [
        { key: 'code', label: 'Transfer No', labelI18nKey: 'doc.stock_transfer.header.code', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'Date', labelI18nKey: 'doc.stock_transfer.header.doc_date', type: 'date', span: 1 },
        {
            key: 'request_type',
            label: 'Type',
            labelI18nKey: 'doc.stock_transfer.header.request_type',
            type: 'select',
            span: 1,
            options: [
                { value: 'TRANSFER', label: 'Transfer', labelI18nKey: 'doc.stock_transfer.type.transfer' },
                { value: 'DIRECT', label: 'Direct', labelI18nKey: 'doc.stock_transfer.type.direct' },
            ],
        },
        { key: 'from_warehouse_id', label: 'From Warehouse', labelI18nKey: 'doc.stock_transfer.header.from_warehouse', type: 'select', span: 1 },
        { key: 'to_warehouse_id', label: 'To Warehouse', labelI18nKey: 'doc.stock_transfer.header.to_warehouse', type: 'select', span: 1 },
        { key: 'status', label: 'Status', labelI18nKey: 'doc.stock_transfer.header.status', type: 'readonly', span: 1 },
        { key: 'remarks', label: 'Remarks', labelI18nKey: 'doc.stock_transfer.header.remarks', type: 'textarea', span: 2 },
    ],

    lineColumns: [
        { key: 'item_code_lookup', label: 'Item Code', width: '150px', editable: true, inputType: 'text' },
        { key: 'item_name', label: 'Item', width: '320px', editable: false, inputType: 'readonly' },
        { key: 'qty', label: 'Qty', width: '120px', editable: true, inputType: 'number', align: 'right' },
        { key: 'received_quantity', label: 'Received Qty', width: '140px', editable: false, inputType: 'readonly', align: 'right' },
    ],
    linesSchema: [
        { key: 'item_code_lookup', label: 'Item Code', width: '150px', editable: true, inputType: 'text' },
        { key: 'item_name', label: 'Item', width: '320px', editable: false, inputType: 'readonly' },
        { key: 'qty', label: 'Qty', width: '120px', editable: true, inputType: 'number', align: 'right' },
        { key: 'received_quantity', label: 'Received Qty', width: '140px', editable: false, inputType: 'readonly', align: 'right' },
    ],

    totals: {
        subtotalKey: 'subtotal',
        grandTotalKey: 'grand_total',
        subtotalLabel: 'Total Qty',
        grandTotalLabel: 'Total Qty',
        subtotalLabelI18nKey: 'doc.stock_transfer.totals.total_qty',
        grandTotalLabelI18nKey: 'doc.stock_transfer.totals.total_qty',
    },

    defaultValues: {
        header: {
            status: 'DRAFT',
            doc_date: new Date().toISOString().slice(0, 10),
            request_type: 'TRANSFER',
        },
    },

    emptyLine: {
        id: '',
        item_id: '',
        item_code_lookup: '',
        item_name: '',
        qty: 1,
        received_quantity: 0,
        line_total: 0,
    },

    normalize: (header: any, lines: any[]) => ({
        header: {
            ...header,
            doc_date: String(header?.doc_date || header?.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
            from_warehouse_id: String(header?.from_warehouse_id || '').trim(),
            to_warehouse_id: String(header?.to_warehouse_id || '').trim(),
            request_type: String(header?.request_type || 'TRANSFER').toUpperCase(),
            remarks: String(header?.remarks || header?.notes || '').trim(),
            notes: String(header?.notes || header?.remarks || '').trim(),
        },
        lines: (Array.isArray(lines) ? lines : []).map((line: any) => ({
            ...line,
            item_id: String(line?.item_id || '').trim(),
            item_code_lookup: String(line?.item_code_lookup || line?.item_code || '').trim(),
            item_name: String(line?.item_name || line?.description || '').trim(),
            qty: toNumber(line?.qty ?? line?.quantity, 0),
            received_quantity: toNumber(line?.received_quantity, 0),
        })),
    }),

    validate: (header: any, lines: any[]) => {
        const errors: Array<{ field: string; message: string; messageKey?: string }> = [];
        if (!String(header?.from_warehouse_id || '').trim()) {
            errors.push({ field: 'from_warehouse_id', message: 'Source warehouse is required', messageKey: 'validation.stock_transfer.from_warehouse_required' });
        }
        if (!String(header?.to_warehouse_id || '').trim()) {
            errors.push({ field: 'to_warehouse_id', message: 'Target warehouse is required', messageKey: 'validation.stock_transfer.to_warehouse_required' });
        }
        if (String(header?.from_warehouse_id || '').trim() && String(header?.from_warehouse_id || '').trim() === String(header?.to_warehouse_id || '').trim()) {
            errors.push({ field: 'to_warehouse_id', message: 'Source and target warehouse must differ', messageKey: 'validation.stock_transfer.warehouse_mismatch' });
        }

        const validLines = (Array.isArray(lines) ? lines : []).filter((line: any) =>
            String(line?.item_id || line?.item_code_lookup || '').trim() !== '' || toNumber(line?.qty, 0) > 0,
        );
        if (validLines.length === 0) {
            errors.push({ field: 'lines', message: 'At least one transfer line is required', messageKey: 'validation.stock_transfer.lines_required' });
        }
        validLines.forEach((line: any, index: number) => {
            if (!String(line?.item_id || line?.item_code_lookup || '').trim()) {
                errors.push({ field: `lines[${index}].item_id`, message: 'Item is required', messageKey: 'validation.stock_transfer.line_item_required' });
            }
            if (toNumber(line?.qty, 0) <= 0) {
                errors.push({ field: `lines[${index}].qty`, message: 'Quantity must be greater than zero', messageKey: 'validation.stock_transfer.qty_positive' });
            }
        });

        return { ok: errors.length === 0, errors };
    },

    recalcLine: (line: any) => ({
        ...line,
        qty: toNumber(line?.qty ?? line?.quantity, 0),
        received_quantity: toNumber(line?.received_quantity, 0),
        line_total: toNumber(line?.qty ?? line?.quantity, 0),
    }),

    recalcTotals: (lines: any[]) => {
        const totalQty = (Array.isArray(lines) ? lines : []).reduce((sum: number, line: any) => sum + toNumber(line?.qty ?? line?.quantity, 0), 0);
        return {
            subtotal: totalQty,
            tax_total: 0,
            grand_total: totalQty,
        } as any;
    },

    computeTotals: (lines: any[]) => (StockTransferDefinition.recalcTotals as any)(lines),

    lineLookup: {
        fieldKey: 'item_code_lookup',
        type: 'item',
    },
};

