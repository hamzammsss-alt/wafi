import { DocumentDefinition } from '../../../types/DocumentDefinition';

export const JournalDefinition: DocumentDefinition<any, any> = {
    docType: 'journal_entry',
    title: 'Journal Entry',
    listRoute: '/journals',
    docRoute: '/journals/:id',
    newDocRoute: '/journals/new',

    permissions: {
        post: 'JOURNAL_POST'
    },

    client: (window as any).electronAPI?.journals,

    listColumns: [
        { key: 'number', label: 'No.' },
        { key: 'date', label: 'Date' },
        { key: 'reference', label: 'Reference' },
        { key: 'status', label: 'Status' }
    ],

    headerFields: [
        { key: 'number', label: 'Journal No', type: 'readonly', span: 1 },
        { key: 'date', label: 'Date', type: 'date', span: 1 },
        { key: 'reference', label: 'Reference', type: 'text', span: 1 },
        { key: 'status', label: 'Status', type: 'readonly', span: 1 },
        { key: 'notes', label: 'Notes', type: 'textarea', span: 2 }
    ],

    lineColumns: [
        { key: 'accountId', label: 'Account', editable: true, inputType: 'text' },
        { key: 'debit', label: 'Debit', editable: true, inputType: 'number', align: 'right' },
        { key: 'credit', label: 'Credit', editable: true, inputType: 'number', align: 'right' },
        { key: 'memo', label: 'Memo', editable: true, inputType: 'text' }
    ],

    totals: {
        subtotalKey: 'total_debit',
        grandTotalKey: 'total_credit',
        subtotalLabel: 'Total Debit',
        grandTotalLabel: 'Total Credit'
    },

    emptyLine: {
        accountId: '',
        debit: 0,
        credit: 0,
        memo: ''
    },

    recalcLine: (line: any) => line,

    recalcTotals: (lines: any[]) => {
        const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
        const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
        const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
        return {
            subtotal: r2(totalDebit),
            tax_total: 0,
            grand_total: r2(totalCredit)
        };
    }
};
