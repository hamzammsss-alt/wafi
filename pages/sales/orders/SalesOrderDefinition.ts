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

function SalesOrderWorkflowPanel(context: any) {
    const { docId, header } = context;
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const status = String(header?.status || 'DRAFT').toUpperCase();
    const canDispatch = ['CONFIRMED', 'PARTIAL', PENDING_STATUS].includes(status);

    if (!docId || !canDispatch) return null;

    const convert = async () => {
        if (!docId || busy) return;
        setBusy(true);
        setMessage('');
        try {
            const result = await (window as any).electronAPI?.salesWorkflow?.convertOrderToDispatch?.({
                orderId: docId,
                warehouseId: header?.warehouse_id || header?.from_warehouse_id || null,
                userId: 'admin',
            });
            const targetId = String(result?.targetDocumentId || '');
            setMessage('تم إنشاء سند إرسال للطلبية');
            if (targetId) {
                window.location.hash = `/inventory/dispatch/${targetId}`;
            }
        } catch (error: any) {
            setMessage(String(error?.message || 'تعذر إنشاء سند الإرسال'));
        } finally {
            setBusy(false);
        }
    };

    return React.createElement(
        'div',
        { className: 'mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3' },
        React.createElement('div', { className: 'text-sm font-semibold text-emerald-800' }, 'الطلبية عالقة للتجهيز'),
        React.createElement(
            'div',
            { className: 'flex flex-wrap items-center gap-2' },
            message ? React.createElement('span', { className: 'text-xs font-medium text-slate-600' }, message) : null,
            React.createElement(
                'button',
                {
                    type: 'button',
                    disabled: busy,
                    onClick: convert,
                    className: 'rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60',
                },
                busy ? 'جاري الإنشاء...' : 'إنشاء سند إرسال',
            ),
        ),
    );
}

const frameworkClient = {
    list: (params: any) => (window as any).electronAPI?.framework.list('salesOrders', params),
    get: (id: string) => (window as any).electronAPI?.framework.get('salesOrders', id),
    createDraft: (userId?: string) => (window as any).electronAPI?.framework.createDraft('salesOrders', userId),
    save: (params: any) => (window as any).electronAPI?.framework.save('salesOrders', params),
    validate: (id: string) => (window as any).electronAPI?.framework.validate('salesOrders', id),
    postOrSubmit: (params: any) => workflowResult(() =>
        (window as any).electronAPI?.salesWorkflow?.postOrderToPending?.(params.id, params.userId || 'admin')
    ),
    reopenRejected: (params: any) => (window as any).electronAPI?.framework.reopenRejected('salesOrders', params)
};

export const SalesOrderDefinition: DocumentDefinition<any, any> = {
    docType: 'sales_order',
    title: 'طلبية مبيعات',
    listRoute: '/sales/orders',
    docRoute: '/sales/orders/:id',
    newDocRoute: '/sales/orders/new',

    permissions: {
        post: 'SALES_ORDER_POST',
        submit: 'SALES_ORDER_SUBMIT'
    },

    client: frameworkClient,

    statusRules: {
        editable: ['DRAFT', 'REJECTED'],
        postable: ['DRAFT', 'REJECTED'],
        voidable: [],
        transitions: {
            DRAFT: ['CONFIRMED'],
            REJECTED: ['CONFIRMED'],
            CONFIRMED: ['PARTIAL', 'COMPLETED'],
            PARTIAL: ['COMPLETED'],
            COMPLETED: [],
        },
    },

    listColumns: [
        { key: 'invoice_no', label: 'رقم الطلبية', width: 120, align: 'right' },
        { key: 'doc_date', label: 'التاريخ', width: 120, align: 'right' },
        { key: 'customer_name', label: 'العميل', align: 'right' },
        { key: 'grand_total', label: 'الصافي', width: 120, align: 'right', render: (val) => Number(val || 0).toFixed(2) }
    ],

    headerFields: [
        { key: 'invoice_no', label: 'رقم الطلبية', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'التاريخ', type: 'date', span: 1 },
        { key: 'customer_id', label: 'العميل', type: 'text', lookupKey: 'salesInvoices:searchCustomers', span: 1 },
        { key: 'warehouse_id', label: 'المستودع', type: 'select', span: 1 },
        { key: 'delivery_date', label: 'تاريخ التسليم', type: 'date', span: 1 },
        { key: 'notes', label: 'شروط التسليم / ملاحظات', type: 'textarea', span: 2 },
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

    renderBeforeLines: (context) => React.createElement(SalesOrderWorkflowPanel, context),
};
