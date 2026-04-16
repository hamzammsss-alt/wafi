import { dispatchClient } from '../../lib/dispatchClient';
import { DocumentDefinition } from '../../types/DocumentDefinition';

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const DispatchDefinition: DocumentDefinition<any, any> = {
    docType: 'dispatch_note',
    screenKey: 'inventory.dispatch.list',
    title: 'سند إرسال',
    listRoute: '/inventory/dispatch',
    docRoute: '/inventory/dispatch/:id',
    newDocRoute: '/inventory/dispatch/new',

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

    client: dispatchClient,

    numbering: {
        sequenceKey: 'dispatch_note',
        fieldKey: 'code',
        prefix: 'DSP-',
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
        { key: 'customer_name', label: 'العميل', align: 'right' },
        { key: 'warehouse_name', label: 'المستودع', align: 'right' },
        { key: 'total_qty', label: 'إجمالي الكمية', width: 120, align: 'right' },
    ],

    headerFields: [
        { key: 'code', label: 'رقم السند', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'التاريخ', type: 'date', span: 1 },
        { key: 'customer_id', label: 'العميل', type: 'lookup', span: 1 },
        { key: 'from_warehouse_id', label: 'المستودع', type: 'select', span: 1 },
        { key: 'truck_id', label: 'الشاحنة', type: 'select', span: 1 },
        { key: 'sales_rep_id', label: 'مندوب المبيعات', type: 'select', span: 1 },
        { key: 'tracking_no', label: 'رقم التتبع', type: 'text', span: 1 },
        { key: 'status', label: 'الحالة', type: 'readonly', span: 1 },
        { key: 'receiver_name', label: 'اسم المستلم', type: 'text', span: 1 },
        { key: 'delivery_address', label: 'عنوان التسليم', type: 'text', span: 1 },
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
            doc_date: String(header?.doc_date || new Date().toISOString().slice(0, 10)).slice(0, 10),
            customer_id: String(header?.customer_id || '').trim(),
            from_warehouse_id: String(header?.from_warehouse_id || '').trim(),
            truck_id: String(header?.truck_id || '').trim(),
            sales_rep_id: String(header?.sales_rep_id || '').trim(),
            tracking_no: String(header?.tracking_no || '').trim(),
            receiver_name: String(header?.receiver_name || '').trim(),
            delivery_address: String(header?.delivery_address || '').trim(),
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
        if (!String(header?.from_warehouse_id || '').trim()) {
            errors.push({ field: 'from_warehouse_id', message: 'المستودع مطلوب' });
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
    saveOnHeaderCommit: false,
    createDraftOnOpen: false,

    loadSelectOptions: async () => {
        const api = (window as any).electronAPI;
        const [vehicles, salesReps] = await Promise.all([
            api?.logistics?.getVehicles?.() || Promise.resolve([]),
            api?.partner?.getSalesReps?.() || Promise.resolve([]),
        ]);
        return {
            truck_id: (Array.isArray(vehicles) ? vehicles : []).map((vehicle: any) => ({
                id: String(vehicle?.id || ''),
                label: String(vehicle?.plate_no || vehicle?.name_ar || vehicle?.name || ''),
            })).filter((option: any) => option.id),
            sales_rep_id: (Array.isArray(salesReps) ? salesReps : []).map((partner: any) => ({
                id: String(partner?.id || ''),
                label: String(partner?.name_ar || partner?.name || partner?.code || ''),
            })).filter((option: any) => option.id),
        };
    },
};