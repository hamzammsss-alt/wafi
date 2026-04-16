import { Result, asResult } from '../types/errors';

export interface StockTransferListRow {
    id: string;
    code: string;
    doc_date: string;
    from_warehouse_id?: string;
    to_warehouse_id?: string;
    from_warehouse_name?: string;
    to_warehouse_name?: string;
    request_type?: string;
    total_qty: number;
    status: string;
    version: number;
}

export interface StockTransferListResult {
    rows: StockTransferListRow[];
    next_cursor: { date: string; id: string } | null;
}

export interface StockTransferHeader {
    id: string;
    code: string;
    company_id?: string;
    branch_id?: string;
    status: string;
    version: number;
    doc_date: string;
    from_warehouse_id?: string;
    to_warehouse_id?: string;
    from_warehouse_name?: string;
    to_warehouse_name?: string;
    request_type?: string;
    notes?: string;
    remarks?: string;
    posted_at?: string;
    posted_by?: string;
    voided_at?: string;
    voided_by?: string;
}

export interface StockTransferLine {
    id?: string;
    line_no?: number;
    item_id?: string;
    item_name?: string;
    item_code_lookup?: string;
    qty: number;
    quantity?: number;
    received_quantity?: number;
    line_total?: number;
}

const api = () => (window as any).electronAPI.stockTransfers;

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

export const stockTransferClient = {
    list: (params: {
        search?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        sort?: string;
        cursor?: { date: string; id: string } | null;
        limit?: number;
    }): Promise<Result<StockTransferListResult>> =>
        normalizeResult<StockTransferListResult>(api().list(params)),

    get: (id: string): Promise<Result<{ header: StockTransferHeader; lines: StockTransferLine[] }>> =>
        normalizeResult<{ header: StockTransferHeader; lines: StockTransferLine[] }>(api().get(id)),

    createDraft: (userId?: string): Promise<Result<{ id: string; code: string; status: string }>> =>
        normalizeResult<{ id: string; code: string; status: string }>(api().createDraft(userId)),

    save: (params: {
        id: string;
        header: Partial<StockTransferHeader>;
        lines: StockTransferLine[];
        userId?: string;
    }): Promise<Result<{ header: StockTransferHeader; lines: StockTransferLine[] }>> =>
        normalizeResult<{ header: StockTransferHeader; lines: StockTransferLine[] }>(api().save(params)),

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

    searchItems: (search: string): Promise<Result<Array<{ id: string; code: string; name: string; price: number }>>> =>
        normalizeResult<Array<{ id: string; code: string; name: string; price: number }>>(api().searchItems(search)),
};

