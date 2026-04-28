import React, { useState } from 'react';
import { DocumentDefinition } from '../../../src/types/DocumentDefinition';

const PENDING_STATUS = 'PENDING_APPROVAL_L1';

async function workflowResult<T>(call: () => Promise<T>) {
    try {
        return { ok: true, data: await call() };
    } catch (error: any) {
        return { ok: false, error: { message: String(error?.message || error || 'Workflow failed') } };
    }
}

function QuotationWorkflowPanel(context: any) {
    const { docId, header } = context;
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const status = String(header?.status || 'DRAFT').toUpperCase();
    const isPending = status === PENDING_STATUS;
    const isConverted = status === 'CONVERTED';

    if (!docId || (!isPending && !isConverted)) return null;

    const convert = async () => {
        if (!docId || busy || !isPending) return;
        setBusy(true);
        setMessage('');
        try {
            const result = await (window as any).electronAPI?.salesWorkflow?.convertQuotationToOrder?.({
                quotationId: docId,
                userId: 'admin',
            });
            const targetId = String(result?.targetDocumentId || '');
            setMessage('تم تحويل عرض السعر إلى طلبية مبيعات');
            if (targetId) {
                window.location.hash = `/sales/orders/${targetId}`;
            }
        } catch (error: any) {
            setMessage(String(error?.message || 'تعذر تحويل عرض السعر'));
        } finally {
            setBusy(false);
        }
    };

    return React.createElement(
        'div',
        { className: 'mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3' },
        React.createElement('div', { className: 'text-sm font-semibold text-sky-800' }, isConverted ? 'تم تحويل عرض السعر' : 'عرض السعر عالق'),
        React.createElement(
            'div',
            { className: 'flex flex-wrap items-center gap-2' },
            message ? React.createElement('span', { className: 'text-xs font-medium text-slate-600' }, message) : null,
            isPending ? React.createElement(
                'button',
                {
                    type: 'button',
                    disabled: busy,
                    onClick: convert,
                    className: 'rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60',
                },
                busy ? 'جاري التحويل...' : 'تحويل إلى طلبية',
            ) : null,
        ),
    );
}

const frameworkClient = {
    list: (params: any) => (window as any).electronAPI?.framework.list('salesQuotations', params),
    get: (id: string) => (window as any).electronAPI?.framework.get('salesQuotations', id),
    createDraft: (userId?: string) => (window as any).electronAPI?.framework.createDraft('salesQuotations', userId),
    save: (params: any) => (window as any).electronAPI?.framework.save('salesQuotations', params),
    validate: (id: string) => (window as any).electronAPI?.framework.validate('salesQuotations', id),
    postOrSubmit: (params: any) => workflowResult(() =>
        (window as any).electronAPI?.salesWorkflow?.postQuotationToPending?.(params.id, params.userId || 'admin')
    ),
    reopenRejected: (params: any) => (window as any).electronAPI?.framework.reopenRejected('salesQuotations', params)
};

export const QuotationDefinition: DocumentDefinition<any, any> = {
    docType: 'sales_quotation',
    title: 'عرض سعر المبيعات',
    listRoute: '/sales/quotations',
    docRoute: '/sales/quotations/:id',
    newDocRoute: '/sales/quotations/new',

    permissions: {
        post: 'SALES_QUOTATION_POST',
        submit: 'SALES_QUOTATION_SUBMIT'
    },

    client: frameworkClient,

    statusRules: {
        editable: ['DRAFT', 'REJECTED'],
        postable: ['DRAFT', 'REJECTED', 'SENT'],
        voidable: [],
        transitions: {
            DRAFT: [PENDING_STATUS],
            REJECTED: [PENDING_STATUS],
            SENT: [PENDING_STATUS],
            PENDING_APPROVAL_L1: ['CONVERTED'],
            CONVERTED: [],
        },
    },

    listColumns: [
        { key: 'invoice_no', label: 'رقم العرض', width: 120, align: 'right' },
        { key: 'doc_date', label: 'التاريخ', width: 120, align: 'right' },
        { key: 'customer_name', label: 'العميل', align: 'right' },
        { key: 'grand_total', label: 'الصافي', width: 120, align: 'right', render: (val) => Number(val || 0).toFixed(2) }
    ],

    headerFields: [
        { key: 'invoice_no', label: 'رقم العرض', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'التاريخ', type: 'date', span: 1 },
        { key: 'customer_id', label: 'العميل', type: 'text', lookupKey: 'salesInvoices:searchCustomers', span: 1 },
        { key: 'notes', label: 'الصلاحية والشروط / ملاحظات', type: 'textarea', span: 2 },
    ],

    lineColumns: [
        { key: 'item_code_lookup', label: 'رقم الصنف', width: '120px', editable: true, inputType: 'text' },
        { key: 'item_name', label: 'اسم الصنف', width: '250px', editable: false, inputType: 'text' },
        { key: 'qty', label: 'الكمية', width: '100px', editable: true, inputType: 'number', align: 'right' },
        { key: 'price', label: 'السعر', width: '120px', editable: true, inputType: 'number', align: 'right' },
        { key: 'discount', label: 'خصم %', width: '80px', editable: true, inputType: 'number', align: 'right' },
        { key: 'tax_rate', label: 'ضريبة %', width: '80px', editable: true, inputType: 'number', align: 'right' },
        {
            key: 'line_total',
            label: 'الإجمالي',
            width: '120px',
            editable: false,
            inputType: 'number',
            align: 'right',
            render: (val: any) => Number(val || 0).toFixed(2)
        }
    ],

    totals: {
        subtotalKey: 'subtotal',
        taxKey: 'tax_total',
        grandTotalKey: 'grand_total',
        subtotalLabel: 'المجموع الإجمالي',
        taxLabel: 'إجمالي الضريبة',
        grandTotalLabel: 'الصافي'
    },

    emptyLine: {
        item_id: '',
        item_code_lookup: '',
        item_name: '',
        qty: 1,
        price: 0,
        discount: 0,
        tax_rate: 0,
        line_total: 0
    },

    recalcLine: (line: any) => {
        const qty = Number(line.qty || line.quantity || 0);
        const price = Number(line.price || line.unit_price || 0);
        const discount = Number(line.discount || 0);
        const taxRate = Number(line.tax_rate || 0);

        const gross = qty * price;
        const netAfterDisc = gross * (1 - (discount / 100));
        const taxVal = netAfterDisc * (taxRate / 100);
        const total = netAfterDisc + taxVal;

        return {
            ...line,
            line_total: total.toFixed(2),
            tax_amount: taxVal.toFixed(2)
        };
    },

    recalcTotals: (lines: any[]) => {
        let subtotal = 0;
        let tax_total = 0;

        lines.forEach(l => {
            const qty = Number(l.qty || l.quantity || 0);
            const price = Number(l.price || l.unit_price || 0);
            const discount = Number(l.discount || 0);
            const taxRate = Number(l.tax_rate || 0);

            const netAfterDisc = (qty * price) * (1 - (discount / 100));
            const taxVal = netAfterDisc * (taxRate / 100);

            subtotal += netAfterDisc;
            tax_total += taxVal;
        });

        return {
            subtotal,
            tax_total,
            grand_total: subtotal + tax_total
        };
    },

    renderBeforeLines: (context) => React.createElement(QuotationWorkflowPanel, context),
};
