import { grnClient } from '../../lib/grnClient';
import { DocumentDefinition } from '../../types/DocumentDefinition';

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const ReceiptDefinition: DocumentDefinition<any, any> = {
    docType: 'goods_receipt',
    screenKey: 'inventory.receipt.list',
    title: 'سند استلام',
    listRoute: '/inventory/receipt',
    docRoute: '/inventory/receipt/:id',
    newDocRoute: '/inventory/receipt/new',

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

    client: grnClient,

    numbering: {
        sequenceKey: 'goods_receipt',
        fieldKey: 'ref_no',
        prefix: 'GRN-',
        readonly: true,
    },

    statusRules: {
        editable: ['DRAFT'],
        postable: ['DRAFT'],
        voidable: [],
        transitions: {
            DRAFT: ['PENDING_APPROVAL_L1'],
            PENDING_APPROVAL_L1: ['POSTED'],
            POSTED: [],
        },
    },

    listColumns: [
        { key: 'code', label: 'رقم السند', width: 150, align: 'right' },
        { key: 'doc_date', label: 'التاريخ', width: 120, align: 'right' },
        { key: 'supplier_name', label: 'المورد', align: 'right' },
        { key: 'status', label: 'الحالة', width: 130, align: 'right' },
    ],

    headerFields: [
        { key: 'ref_no', label: 'رقم السند', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'التاريخ', type: 'date', span: 1 },
        { key: 'supplier_id', label: 'المورد', type: 'lookup', span: 1 },
        { key: 'warehouse_id', label: 'المستودع', type: 'select', span: 1 },
        { key: 'status', label: 'الحالة', type: 'readonly', span: 1 },
        { key: 'remarks', label: 'ملاحظات', type: 'textarea', span: 2 },
    ],

    lineColumns: [
        { key: 'item_code_lookup', label: 'كود الصنف', width: '150px', editable: true, inputType: 'text' },
        { key: 'item_name', label: 'الصنف', width: '320px', editable: false, inputType: 'readonly' },
        { key: 'qty', label: 'الكمية', width: '120px', editable: true, inputType: 'number', align: 'right' },
        { key: 'notes', label: 'ملاحظات', width: '220px', editable: true, inputType: 'text' },
    ],

    totals: {
        subtotalKey: 'subtotal',
        grandTotalKey: 'grand_total',
        subtotalLabel: 'إجمالي الكمية',
        grandTotalLabel: 'إجمالي الكمية',
    },

    defaultValues: {
        header: {
            status: 'DRAFT',
            doc_date: new Date().toISOString().slice(0, 10),
        },
    },

    emptyLine: {
        id: '',
        item_id: '',
        item_code_lookup: '',
        item_name: '',
        qty: 1,
        notes: '',
        line_total: 1,
    },

    normalize: (header: any, lines: any[]) => ({
        header: {
            ...header,
            ref_no: String(header?.ref_no || '').trim(),
            doc_date: String(header?.doc_date || new Date().toISOString().slice(0, 10)).slice(0, 10),
            supplier_id: String(header?.supplier_id || '').trim(),
            warehouse_id: String(header?.warehouse_id || '').trim(),
            remarks: String(header?.remarks || header?.notes || '').trim(),
            notes: String(header?.notes || header?.remarks || '').trim(),
        },
        lines: (Array.isArray(lines) ? lines : []).map((line: any) => ({
            ...line,
            item_id: String(line?.item_id || '').trim(),
            item_code_lookup: String(line?.item_code_lookup || line?.item_code || '').trim(),
            item_name: String(line?.item_name || '').trim(),
            qty: toNumber(line?.qty, 0),
            notes: String(line?.notes || '').trim(),
        })),
    }),

    validate: (header: any, lines: any[]) => {
        const errors: Array<{ field: string; message: string }> = [];
        if (!String(header?.warehouse_id || '').trim()) {
            errors.push({ field: 'warehouse_id', message: 'المستودع مطلوب' });
        }
        const validLines = (Array.isArray(lines) ? lines : []).filter((line: any) =>
            String(line?.item_id || line?.item_code_lookup || '').trim() !== '' || toNumber(line?.qty, 0) > 0,
        );
        if (validLines.length === 0) {
            errors.push({ field: 'lines', message: 'يجب إدخال صنف واحد على الأقل' });
        }
        validLines.forEach((line: any, index: number) => {
            if (!String(line?.item_id || line?.item_code_lookup || '').trim()) {
                errors.push({ field: `lines[${index}].item_id`, message: 'الصنف مطلوب' });
            }
            if (toNumber(line?.qty, 0) <= 0) {
                errors.push({ field: `lines[${index}].qty`, message: 'الكمية يجب أن تكون أكبر من صفر' });
            }
        });
        return { ok: errors.length === 0, errors };
    },

    recalcLine: (line: any) => ({
        ...line,
        qty: toNumber(line?.qty, 0),
        line_total: toNumber(line?.qty, 0),
    }),

    recalcTotals: (lines: any[]) => {
        const totalQty = (Array.isArray(lines) ? lines : []).reduce((sum: number, line: any) => sum + toNumber(line?.qty, 0), 0);
        return { subtotal: totalQty, tax_total: 0, grand_total: totalQty };
    },

    computeTotals: (lines: any[]) => {
        const totalQty = (Array.isArray(lines) ? lines : []).reduce((sum: number, line: any) => sum + toNumber(line?.qty, 0), 0);
        return { subtotal: totalQty, tax_total: 0, grand_total: totalQty };
    },

    lineLookup: {
        fieldKey: 'item_code_lookup',
        type: 'item',
    },

    skipPermissionChecks: true,
};