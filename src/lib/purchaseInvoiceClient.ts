import { Result, asResult } from '../types/errors';

export interface PurchaseInvoiceListRow {
    id: string;
    invoice_no: string;
    doc_date: string;
    supplier_name?: string;
    customer_name?: string;
    supplier_id?: string;
    customer_id?: string;
    grand_total: number;
    status: string;
    version: number;
    rejection_reason?: string;
}

export interface PurchaseInvoiceListResult {
    rows: PurchaseInvoiceListRow[];
    next_cursor: { date: string; id: string } | null;
}

export interface PurchaseInvoiceHeader {
    id: string;
    invoice_no: string;
    company_id?: string;
    branch_id?: string;
    status: string;
    version: number;
    doc_date: string;
    supplier_id?: string;
    supplier_name?: string;
    customer_id?: string;
    customer_name?: string;
    vendor_invoice_no?: string;
    warehouse_id?: string;
    currency_id?: string;
    tax_group_id?: string;
    exchange_rate?: number;
    subtotal: number;
    discount_total?: number;
    tax_total: number;
    grand_total: number;
    rejection_reason?: string;
    notes?: string;
    remarks?: string;
    posted_at?: string;
    posted_by?: string;
    voided_at?: string;
    voided_by?: string;
}

export interface PurchaseInvoiceLine {
    id?: string;
    line_no?: number;
    item_id?: string;
    item_name?: string;
    item_code?: string;
    item_code_lookup?: string;
    qty: number;
    price: number;
    discount: number;
    tax_rate: number;
    tax_amount?: number;
    total_price?: number;
    net_total?: number;
    line_total?: number;
}

const api = () => (window as any).electronAPI.purchaseInvoices;
const accountingApi = () => (window as any).electronAPI.purchaseInvoice;

export interface PurchaseInvoiceAccountingPostResult {
    invoiceId: string;
    sourceModule: string;
    sourceType: string;
    sourceId: string;
    documentNo: string;
    status: 'POSTED' | 'ALREADY_POSTED';
    journalId: string;
    journalNo: string;
    sourceVersion: number;
}

export interface PurchaseInvoiceAccountingReverseResult {
    invoiceId: string;
    sourceModule: string;
    sourceType: string;
    sourceId: string;
    documentNo: string;
    status: 'REVERSED' | 'ALREADY_REVERSED';
    originalJournalId: string;
    reversalJournalId: string;
    reversalJournalNo: string;
}

export interface PurchaseInvoiceAccountingStatusResult {
    invoiceId: string;
    sourceModule: string;
    sourceType: string;
    sourceId: string;
    documentNo: string | null;
    invoiceStatus: string;
    sourceVersion: number;
    isPosted: boolean;
    isReversed: boolean;
    journalId: string | null;
    journalNo: string | null;
    journalStatus: string | null;
    reversalJournalId: string | null;
    reversalJournalNo: string | null;
}

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

export const purchaseInvoiceClient = {
    list: (params: {
        search?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        sort?: string;
        cursor?: { date: string; id: string } | null;
        limit?: number;
    }): Promise<Result<PurchaseInvoiceListResult>> =>
        normalizeResult<PurchaseInvoiceListResult>(api().list(params)),

    get: (id: string): Promise<Result<{ header: PurchaseInvoiceHeader; lines: PurchaseInvoiceLine[] }>> =>
        normalizeResult<{ header: PurchaseInvoiceHeader; lines: PurchaseInvoiceLine[] }>(api().get(id)),

    createDraft: (userId?: string): Promise<Result<{ id: string; invoice_no: string; status: string }>> =>
        normalizeResult<{ id: string; invoice_no: string; status: string }>(api().createDraft(userId)),

    save: (params: {
        id: string;
        header: Partial<PurchaseInvoiceHeader>;
        lines: PurchaseInvoiceLine[];
        userId?: string;
    }): Promise<Result<{ header: PurchaseInvoiceHeader; lines: PurchaseInvoiceLine[] }>> =>
        normalizeResult<{ header: PurchaseInvoiceHeader; lines: PurchaseInvoiceLine[] }>(api().save(params)),

    validate: (id: string): Promise<Result<{ errors: Array<{ field: string; message: string }> }>> =>
        normalizeResult<{ errors: Array<{ field: string; message: string }> }>(api().validate(id)),

    postOrSubmit: (params: {
        id: string;
        userId?: string;
        hasPostPermission?: boolean;
    }): Promise<Result<{ status: string; action: string }>> =>
        normalizeResult<{ status: string; action: string }>(api().postOrSubmit(params)),

    postAccounting: (invoiceId: string): Promise<Result<PurchaseInvoiceAccountingPostResult>> =>
        normalizeResult<PurchaseInvoiceAccountingPostResult>(accountingApi().postAccounting(invoiceId)),

    reverseAccounting: (payload: {
        invoiceId: string;
        reverseDate: string;
        reason?: string | null;
    }): Promise<Result<PurchaseInvoiceAccountingReverseResult>> =>
        normalizeResult<PurchaseInvoiceAccountingReverseResult>(accountingApi().reverseAccounting(payload)),

    getPostingStatus: (invoiceId: string): Promise<Result<PurchaseInvoiceAccountingStatusResult>> =>
        normalizeResult<PurchaseInvoiceAccountingStatusResult>(accountingApi().getPostingStatus(invoiceId)),

    void: (params: { id: string; userId?: string }): Promise<Result<{ status: string }>> =>
        normalizeResult<{ status: string }>(api().void(params)),

    reopenRejected: (params: { id: string; userId?: string }): Promise<Result<{ status: string }>> =>
        normalizeResult<{ status: string }>(api().reopenRejected(params)),

    searchSuppliers: (search: string): Promise<Result<Array<{ id: string; name: string; code: string; phone: string }>>> =>
        normalizeResult<Array<{ id: string; name: string; code: string; phone: string }>>(api().searchSuppliers(search)),

    searchCustomers: (search: string): Promise<Result<Array<{ id: string; name: string; code: string; phone: string }>>> =>
        normalizeResult<Array<{ id: string; name: string; code: string; phone: string }>>(api().searchCustomers(search)),

    searchItems: (search: string): Promise<Result<Array<{ id: string; code: string; name: string; price: number }>>> =>
        normalizeResult<Array<{ id: string; code: string; name: string; price: number }>>(api().searchItems(search)),
};
