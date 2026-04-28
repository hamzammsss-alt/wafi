import React from 'react';
import { journalVoucherClient } from '../../lib/journalVoucherClient';
import { DocumentDefinition } from '../../types/DocumentDefinition';
import { FixedAssetPurchasePanel } from './components/FixedAssetPurchasePanel';

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const JournalVoucherDefinition: DocumentDefinition<any, any> = {
    docType: 'journal_voucher',
    screenKey: 'accounting.journal_voucher.list',
    title: 'سند قيد',
    listRoute: '/gl/journal-vouchers',
    docRoute: '/gl/journal-vouchers/:id',
    newDocRoute: '/gl/journal-vouchers/new',

    permissions: {
        post: 'accounting.journal_voucher.post',
        submit: 'accounting.journal_voucher.update',
        reopen: 'accounting.journal_voucher.update',
    },

    capabilities: {
        create: 'accounting.journal_voucher.create',
        read: 'accounting.journal_voucher.read',
        update: 'accounting.journal_voucher.update',
        post: 'accounting.journal_voucher.post',
        print: 'accounting.journal_voucher.print',
        void: 'accounting.journal_voucher.void',
    },

    numbering: {
        sequenceKey: 'journal_voucher',
        fieldKey: 'voucher_no',
        prefix: 'JV-',
        readonly: true,
    },

    workflow: {
        submitOnMissingPostPermission: true,
    },

    policy: {
        lockedPeriodGuardKey: 'control_date_guard',
    },

    client: journalVoucherClient,

    listColumns: [
        { key: 'voucher_no', label: 'رقم القيد', width: 160, align: 'right' },
        { key: 'doc_date', label: 'التاريخ', width: 120, align: 'right' },
        { key: 'reference_no', label: 'المرجع', align: 'right' },
        { key: 'total_debit', label: 'إجمالي المدين', width: 130, align: 'right' },
    ],

    headerFields: [
        { key: 'voucher_no', label: 'رقم القيد', labelI18nKey: 'doc.journal_voucher.header.voucher_no', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'التاريخ', labelI18nKey: 'doc.journal_voucher.header.doc_date', type: 'date', span: 1 },
        { key: 'reference_no', label: 'المرجع', labelI18nKey: 'doc.journal_voucher.header.reference_no', type: 'text', span: 1 },
        { key: 'currency_id', label: 'العملة', labelI18nKey: 'doc.journal_voucher.header.currency', type: 'select', span: 1 },
        { key: 'exchange_rate', label: 'سعر الصرف', labelI18nKey: 'doc.journal_voucher.header.exchange_rate', type: 'number', span: 1 },
        { key: 'status', label: 'الحالة', labelI18nKey: 'doc.journal_voucher.header.status', type: 'readonly', span: 1 },
        { key: 'remarks', label: 'البيان', labelI18nKey: 'doc.journal_voucher.header.remarks', type: 'textarea', span: 2 },
    ],
    headerSchema: [
        { key: 'voucher_no', label: 'رقم القيد', labelI18nKey: 'doc.journal_voucher.header.voucher_no', type: 'readonly', span: 1 },
        { key: 'doc_date', label: 'التاريخ', labelI18nKey: 'doc.journal_voucher.header.doc_date', type: 'date', span: 1 },
        { key: 'reference_no', label: 'المرجع', labelI18nKey: 'doc.journal_voucher.header.reference_no', type: 'text', span: 1 },
        { key: 'currency_id', label: 'العملة', labelI18nKey: 'doc.journal_voucher.header.currency', type: 'select', span: 1 },
        { key: 'exchange_rate', label: 'سعر الصرف', labelI18nKey: 'doc.journal_voucher.header.exchange_rate', type: 'number', span: 1 },
        { key: 'status', label: 'الحالة', labelI18nKey: 'doc.journal_voucher.header.status', type: 'readonly', span: 1 },
        { key: 'remarks', label: 'البيان', labelI18nKey: 'doc.journal_voucher.header.remarks', type: 'textarea', span: 2 },
    ],

    lineColumns: [
        { key: 'account_code_lookup', label: 'كود الحساب', width: '160px', editable: true, inputType: 'text' },
        { key: 'account_name', label: 'اسم الحساب', width: '260px', editable: false, inputType: 'readonly' },
        { key: 'invoice_ref', label: 'المرجع', width: '160px', editable: true, inputType: 'text' },
        { key: 'sub_account_id', label: 'الحساب الفرعي', width: '160px', editable: true, inputType: 'text' },
        { key: 'description', label: 'البيان', width: '260px', editable: true, inputType: 'text' },
        { key: 'cost_center_id', label: 'مركز التكلفة', width: '180px', editable: true, inputType: 'select' },
        { key: 'debit', label: 'مدين', width: '130px', editable: true, inputType: 'number', align: 'right' },
        { key: 'credit', label: 'دائن', width: '130px', editable: true, inputType: 'number', align: 'right' },
    ],
    linesSchema: [
        { key: 'account_code_lookup', label: 'كود الحساب', width: '160px', editable: true, inputType: 'text' },
        { key: 'account_name', label: 'اسم الحساب', width: '260px', editable: false, inputType: 'readonly' },
        { key: 'invoice_ref', label: 'المرجع', width: '160px', editable: true, inputType: 'text' },
        { key: 'sub_account_id', label: 'الحساب الفرعي', width: '160px', editable: true, inputType: 'text' },
        { key: 'description', label: 'البيان', width: '260px', editable: true, inputType: 'text' },
        { key: 'cost_center_id', label: 'مركز التكلفة', width: '180px', editable: true, inputType: 'select' },
        { key: 'debit', label: 'مدين', width: '130px', editable: true, inputType: 'number', align: 'right' },
        { key: 'credit', label: 'دائن', width: '130px', editable: true, inputType: 'number', align: 'right' },
    ],

    totals: {
        subtotalKey: 'total_debit',
        taxKey: 'total_credit',
        grandTotalKey: 'balance_difference',
        subtotalLabel: 'إجمالي المدين',
        taxLabel: 'إجمالي الدائن',
        grandTotalLabel: 'الفرق',
        subtotalLabelI18nKey: 'doc.journal_voucher.totals.total_debit',
        taxLabelI18nKey: 'doc.journal_voucher.totals.total_credit',
        grandTotalLabelI18nKey: 'doc.journal_voucher.totals.difference',
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
        account_id: '',
        account_code_lookup: '',
        account_name: '',
        invoice_ref: '',
        sub_account_id: '',
        description: '',
        cost_center_id: '',
        debit: 0,
        credit: 0,
    },

    normalize: (header: any, lines: any[]) => ({
        header: {
            ...header,
            doc_date: String(header?.doc_date || header?.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
            reference_no: String(header?.reference_no || '').trim(),
            currency_id: String(header?.currency_id || 'ILS').trim() || 'ILS',
            exchange_rate: toNumber(header?.exchange_rate, 1) || 1,
            remarks: String(header?.remarks || header?.notes || '').trim(),
            notes: String(header?.notes || header?.remarks || '').trim(),
        },
        lines: (Array.isArray(lines) ? lines : []).map((line: any) => ({
            ...line,
            account_id: String(line?.account_id || '').trim(),
            account_code_lookup: String(line?.account_code_lookup || line?.account_code || '').trim(),
            account_name: String(line?.account_name || '').trim(),
            invoice_ref: String(line?.invoice_ref || '').trim(),
            sub_account_id: String(line?.sub_account_id || '').trim(),
            description: String(line?.description || line?.line_description || '').trim(),
            line_description: String(line?.line_description || line?.description || '').trim(),
            cost_center_id: String(line?.cost_center_id || '').trim(),
            debit: toNumber(line?.debit, 0),
            credit: toNumber(line?.credit, 0),
        })),
    }),

    validate: (header: any, lines: any[]) => {
        const errors: Array<{ field: string; message: string; messageKey?: string }> = [];
        if (!String(header?.doc_date || '').trim()) {
            errors.push({ field: 'doc_date', message: 'Date is required', messageKey: 'validation.journal_voucher.date_required' });
        }

        const validLines = (Array.isArray(lines) ? lines : []).filter((line: any) => {
            const marker = String(line?.account_id || line?.account_code_lookup || '').trim();
            const debit = toNumber(line?.debit, 0);
            const credit = toNumber(line?.credit, 0);
            return marker || debit > 0 || credit > 0;
        });

        if (validLines.length < 2) {
            errors.push({ field: 'lines', message: 'At least two lines are required', messageKey: 'validation.journal_voucher.lines_required' });
        }

        let totalDebit = 0;
        let totalCredit = 0;
        validLines.forEach((line: any, index: number) => {
            const accountMarker = String(line?.account_id || line?.account_code_lookup || '').trim();
            const debit = toNumber(line?.debit, 0);
            const credit = toNumber(line?.credit, 0);
            if (!accountMarker) {
                errors.push({ field: `lines[${index}].account_id`, message: 'Account is required', messageKey: 'validation.journal_voucher.account_required' });
            }
            if (debit < 0 || credit < 0) {
                errors.push({ field: `lines[${index}]`, message: 'Amounts cannot be negative', messageKey: 'validation.journal_voucher.amount_non_negative' });
            }
            if (debit === 0 && credit === 0) {
                errors.push({ field: `lines[${index}]`, message: 'Either debit or credit is required', messageKey: 'validation.journal_voucher.amount_required' });
            }
            totalDebit += debit;
            totalCredit += credit;
        });

        if (Math.abs(totalDebit - totalCredit) > 0.0001) {
            errors.push({ field: 'lines', message: 'Journal voucher is not balanced', messageKey: 'validation.journal_voucher.unbalanced' });
        }

        return { ok: errors.length === 0, errors };
    },

    recalcLine: (line: any) => ({
        ...line,
        debit: toNumber(line?.debit, 0),
        credit: toNumber(line?.credit, 0),
    }),

    recalcTotals: (lines: any[]) => {
        const source = Array.isArray(lines) ? lines : [];
        const totalDebit = source.reduce((sum: number, line: any) => sum + toNumber(line?.debit, 0), 0);
        const totalCredit = source.reduce((sum: number, line: any) => sum + toNumber(line?.credit, 0), 0);
        return {
            total_debit: totalDebit,
            total_credit: totalCredit,
            balance_difference: totalDebit - totalCredit,
        } as any;
    },

    computeTotals: (lines: any[]) => (JournalVoucherDefinition.recalcTotals as any)(lines),

    lineLookup: {
        fieldKey: 'account_code_lookup',
        type: 'account',
    },

    renderBeforeLines: (context) => React.createElement(FixedAssetPurchasePanel, context),
};
