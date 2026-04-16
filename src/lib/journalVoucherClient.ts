import { Result, asResult } from '../types/errors';

export interface JournalVoucherListRow {
    id: string;
    voucher_no: string;
    doc_date: string;
    reference_no?: string;
    total_debit: number;
    status: string;
    version: number;
}

export interface JournalVoucherListResult {
    rows: JournalVoucherListRow[];
    next_cursor: { date: string; id: string } | null;
}

export interface JournalVoucherHeader {
    id: string;
    voucher_no: string;
    company_id?: string;
    branch_id?: string;
    status: string;
    version: number;
    doc_date: string;
    voucher_type?: string;
    reference_no?: string;
    description?: string;
    notes?: string;
    remarks?: string;
    currency_id?: string;
    exchange_rate?: number;
    posted_at?: string;
    posted_by?: string;
    voided_at?: string;
    voided_by?: string;
}

export interface JournalVoucherLine {
    id?: string;
    line_no?: number;
    account_id?: string;
    account_code_lookup?: string;
    account_name?: string;
    description?: string;
    line_description?: string;
    debit: number;
    credit: number;
    cost_center_id?: string;
    invoice_ref?: string;
    tax_ref?: string;
    sub_account_id?: string;
    due_date?: string;
    customer_id?: string;
    is_returned?: boolean;
    bank_account_id?: string;
}

const api = () => (window as any).electronAPI.journalVouchers;

function normalizeResult<T>(promise: Promise<any>): Promise<Result<T>> {
    return promise
        .then((raw) => {
            if (raw && typeof raw === 'object' && typeof raw.ok === 'boolean') {
                return raw as Result<T>;
            }
            return asResult(Promise.resolve(raw as T));
        })
        .catch((error) => asResult(Promise.reject(error)));
}

export const journalVoucherClient = {
    list: (params: {
        search?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        sort?: string;
        cursor?: { date: string; id: string } | null;
        limit?: number;
    }): Promise<Result<JournalVoucherListResult>> =>
        normalizeResult<JournalVoucherListResult>(api().list(params)),

    get: (id: string): Promise<Result<{ header: JournalVoucherHeader; lines: JournalVoucherLine[] }>> =>
        normalizeResult<{ header: JournalVoucherHeader; lines: JournalVoucherLine[] }>(api().get(id)),

    createDraft: (userId?: string): Promise<Result<{ id: string; voucher_no: string; status: string }>> =>
        normalizeResult<{ id: string; voucher_no: string; status: string }>(api().createDraft(userId)),

    save: (params: {
        id: string;
        header: Partial<JournalVoucherHeader>;
        lines: JournalVoucherLine[];
        userId?: string;
    }): Promise<Result<{ header: JournalVoucherHeader; lines: JournalVoucherLine[] }>> =>
        normalizeResult<{ header: JournalVoucherHeader; lines: JournalVoucherLine[] }>(api().save(params)),

    validate: (id: string): Promise<Result<{ errors: Array<{ field: string; message: string }> }>> =>
        normalizeResult<{ errors: Array<{ field: string; message: string }> }>(api().validate(id)),

    postOrSubmit: (params: {
        id: string;
        userId?: string;
        hasPostPermission?: boolean;
    }): Promise<Result<{ status: string; action: string }>> =>
        normalizeResult<{ status: string; action: string }>(api().postOrSubmit(params)),

    void: (params: { id: string; userId?: string }): Promise<Result<{ status: string }>> =>
        normalizeResult<{ status: string }>(api().void(params)),

    reopenRejected: (params: { id: string; userId?: string }): Promise<Result<{ status: string }>> =>
        normalizeResult<{ status: string }>(api().reopenRejected(params)),

    searchAccounts: (search: string): Promise<Result<Array<{ id: string; code: string; name: string }>>> =>
        normalizeResult<Array<{ id: string; code: string; name: string }>>(api().searchAccounts(search)),
};

