import { DocumentDefinition } from '../../../src/types/DocumentDefinition';

const frameworkClient = {
    list: (params: any) => (window as any).electronAPI?.framework.list('purchaseQuotations', params),
    get: (id: string) => (window as any).electronAPI?.framework.get('purchaseQuotations', id),
    createDraft: (userId?: string) => (window as any).electronAPI?.framework.createDraft('purchaseQuotations', userId),
    save: (params: any) => (window as any).electronAPI?.framework.save('purchaseQuotations', params),
    validate: (id: string) => (window as any).electronAPI?.framework.validate('purchaseQuotations', id),
    postOrSubmit: (params: any) => (window as any).electronAPI?.framework.postOrSubmit('purchaseQuotations', params),
    reopenRejected: (params: any) => (window as any).electronAPI?.framework.reopenRejected('purchaseQuotations', params)
};

export const RFQDefinition: DocumentDefinition<any, any> = {
    docType: 'purchase_quotation',
    title: 'طلب تسعير (RFQ)',
    listRoute: '/purchasing/rfq',
    docRoute: '/purchasing/rfq/:id',
    newDocRoute: '/purchasing/rfq/new',

    permissions: {
        post: 'RFQ_POST',
        submit: 'RFQ_SUBMIT'
    },

    client: frameworkClient,

    listColumns: [
        { key: 'invoice_no', label: 'رقم الطلب', width: 120, align: 'right' },
        { key: 'doc_date', label: 'التاريخ', width: 120, align: 'right' },
        { key: 'customer_name', label: 'المورد', align: 'right' },
    ],

    headerFields: [
        { key: 'invoice_no', label: 'رقم الفاتورة', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'التاريخ', type: 'date', span: 1 },
        { key: 'customer_id', label: 'المورد', type: 'text', lookupKey: 'salesInvoices:searchCustomers', span: 1 },
        { key: 'notes', label: 'شروط التسعير / ملاحظات', type: 'textarea', span: 2 },
    ],

    lineColumns: [
        { key: 'item_code_lookup', label: 'رقم الصنف', width: '120px', editable: true, inputType: 'text' },
        { key: 'item_name', label: 'اسم الصنف', width: '300px', editable: false, inputType: 'text' },
        { key: 'qty', label: 'الكمية المطلوبة', width: '150px', editable: true, inputType: 'number', align: 'right' },
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
