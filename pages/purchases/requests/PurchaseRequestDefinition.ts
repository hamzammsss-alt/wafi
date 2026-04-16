import { DocumentDefinition } from '../../../src/types/DocumentDefinition';

const frameworkClient = {
    list: (params: any) => (window as any).electronAPI?.framework.list('purchaseRequests', params),
    get: (id: string) => (window as any).electronAPI?.framework.get('purchaseRequests', id),
    createDraft: (userId?: string) => (window as any).electronAPI?.framework.createDraft('purchaseRequests', userId),
    save: (params: any) => (window as any).electronAPI?.framework.save('purchaseRequests', params),
    validate: (id: string) => (window as any).electronAPI?.framework.validate('purchaseRequests', id),
    postOrSubmit: (params: any) => (window as any).electronAPI?.framework.postOrSubmit('purchaseRequests', params),
    reopenRejected: (params: any) => (window as any).electronAPI?.framework.reopenRejected('purchaseRequests', params)
};

export const PurchaseRequestDefinition: DocumentDefinition<any, any> = {
    docType: 'purchase_request',
    title: 'طلب احتياج مواد',
    listRoute: '/purchasing/requests',
    docRoute: '/purchasing/requests/:id',
    newDocRoute: '/purchasing/requests/new',

    permissions: {
        post: 'PURCHASE_REQUEST_POST',
        submit: 'PURCHASE_REQUEST_SUBMIT'
    },

    client: frameworkClient,

    listColumns: [
        { key: 'invoice_no', label: 'رقم الطلب', width: 120, align: 'right' },
        { key: 'doc_date', label: 'التاريخ', width: 120, align: 'right' },
        { key: 'customer_name', label: 'طالب الاعتماد', align: 'right' }, // Maps to Requester in Backend Factory
    ],

    headerFields: [
        { key: 'invoice_no', label: 'رقم الطلب', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'التاريخ', type: 'date', span: 1 },
        { key: 'customer_id', label: 'طالب الاعتماد (الموظف)', type: 'text', lookupKey: 'employees:search', span: 1 }, // Used by HR employees search if any
        { key: 'notes', label: 'مببرات الطلب / ملاحظات', type: 'textarea', span: 2 },
    ],

    lineColumns: [
        { key: 'item_code_lookup', label: 'رقم الصنف', width: '120px', editable: true, inputType: 'text' },
        { key: 'item_name', label: 'اسم الصنف', width: '300px', editable: false, inputType: 'text' },
        { key: 'qty', label: 'الكمية المطلوبة', width: '150px', editable: true, inputType: 'number', align: 'right' }
    ],

    totals: undefined,

    emptyLine: {
        item_id: '',
        item_code_lookup: '',
        item_name: '',
        qty: 1
    },

    recalcLine: (line: any) => line,
    recalcTotals: (lines: any[]) => ({ subtotal: 0, tax_total: 0, grand_total: 0 })
};
