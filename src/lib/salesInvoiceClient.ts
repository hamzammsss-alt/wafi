/**
 * salesInvoiceClient.ts
 * Typed IPC proxy for Sales Invoice operations.
 * All methods return Result<T> — never throw.
 */

import { Result, asResult } from '../types/errors';

export interface InvoiceListRow {
    id: string;
    invoice_no: string;
    doc_date: string;
    customer_name: string;
    customer_id: string;
    grand_total: number;
    status: string;
    version: number;
    rejection_reason?: string;
}

export interface InvoiceListResult {
    rows: InvoiceListRow[];
    next_cursor: { date: string; id: string } | null;
}

export interface InvoiceHeader {
    id: string;
    invoice_no: string;
    company_id?: string;
    branch_id?: string;
    status: string;
    version: number;
    doc_date: string;
    customer_id?: string;
    customer_name?: string;
    due_date?: string;
    warehouse_id?: string;
    currency_id?: string;
    tax_group_id?: string;
    exchange_rate?: number;
    price_list_id?: string;
    customer_discount_percent?: number;
    payment_method_id?: string;
    sales_rep_id?: string;
    cost_center_id?: string;
    manual_ref?: string;
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

export interface InvoiceLine {
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

const api = () => (window as any).electronAPI.salesInvoices;

function normalizeResult<T>(promise: Promise<any>): Promise<Result<T>> {
    return promise
        .then((raw) => {
            // Some IPC handlers already return Result<T>.
            if (raw && typeof raw === 'object' && typeof raw.ok === 'boolean') {
                return raw as Result<T>;
            }
            // Fallback: convert plain payload/throws into Result<T>.
            return asResult(Promise.resolve(raw as T));
        })
        .catch((e) => asResult(Promise.reject(e)));
}

export const salesInvoiceClient = {

    list: (params: {
        search?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        sort?: string;
        cursor?: { date: string; id: string } | null;
        limit?: number;
    }): Promise<Result<InvoiceListResult>> =>
        normalizeResult<InvoiceListResult>(api().list(params)),

    get: (id: string): Promise<Result<{ header: InvoiceHeader; lines: InvoiceLine[] }>> =>
        normalizeResult<{ header: InvoiceHeader; lines: InvoiceLine[] }>(api().get(id)),

    createDraft: (userId?: string): Promise<Result<{ id: string; invoice_no: string; status: string }>> =>
        normalizeResult<{ id: string; invoice_no: string; status: string }>(api().createDraft(userId)),

    save: (params: {
        id: string;
        header: Partial<InvoiceHeader>;
        lines: InvoiceLine[];
        userId?: string;
    }): Promise<Result<{ header: InvoiceHeader; lines: InvoiceLine[] }>> =>
        normalizeResult<{ header: InvoiceHeader; lines: InvoiceLine[] }>(api().save(params)),

    postOrSubmit: (params: {
        id: string;
        userId?: string;
        hasPostPermission?: boolean;
    }): Promise<Result<{ status: string; action: string }>> =>
        normalizeResult<{ status: string; action: string }>(api().postOrSubmit(params)),

    void: (params: {
        id: string;
        userId?: string;
    }): Promise<Result<{ status: string }>> =>
        normalizeResult<{ status: string }>(api().void(params)),

    reopenRejected: (params: {
        id: string;
        userId?: string;
    }): Promise<Result<{ status: string }>> =>
        normalizeResult<{ status: string }>(api().reopenRejected(params)),

    searchCustomers: (search: string): Promise<Result<{ id: string; name: string; code: string; phone: string }[]>> =>
        normalizeResult<{ id: string; name: string; code: string; phone: string }[]>(api().searchCustomers(search)),

    searchItems: (search: string, pricingContext?: any): Promise<Result<{ id: string; code: string; name: string; price: number; tax_rate?: number; discount_percent?: number }[]>> =>
        normalizeResult<{ id: string; code: string; name: string; price: number; tax_rate?: number; discount_percent?: number }[]>(api().searchItems(search, pricingContext)),

    resolveItemPrice: (input: any): Promise<Result<{ price: number; price_list_id?: string | null; discount_percent?: number; tax_rate?: number; source?: string }>> =>
        normalizeResult<{ price: number; price_list_id?: string | null; discount_percent?: number; tax_rate?: number; source?: string }>(api().resolveItemPrice(input)),
};
