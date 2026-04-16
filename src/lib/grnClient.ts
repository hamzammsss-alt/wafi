import { asResult, Result } from '../types/errors';
import { purchaseInvoiceClient } from './purchaseInvoiceClient';

type ReceiptStatusUi = 'DRAFT' | 'PENDING_APPROVAL_L1' | 'POSTED';

export interface ReceiptListRow {
    id: string;
    code: string;
    doc_date: string;
    supplier_name?: string;
    grand_total: number;
    status: ReceiptStatusUi;
    version: number;
}

export interface ReceiptHeader {
    id: string;
    ref_no: string;
    doc_date: string;
    warehouse_id?: string;
    supplier_id?: string;
    status: ReceiptStatusUi;
    remarks?: string;
    notes?: string;
    version: number;
}

export interface ReceiptLine {
    id?: string;
    item_id?: string;
    item_name?: string;
    item_code?: string;
    item_code_lookup?: string;
    qty: number;
    notes?: string;
    line_total?: number;
}

const api = () => (window as any).electronAPI.grn;

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

function toUiStatus(raw: unknown): ReceiptStatusUi {
    const value = String(raw || '').trim().toUpperCase();
    if (value === 'POSTED') return 'POSTED';
    if (value === 'PENDING') return 'PENDING_APPROVAL_L1';
    return 'DRAFT';
}

function toServiceStatus(raw: unknown): string {
    const value = String(raw || '').trim();
    if (value === 'POSTED') return 'POSTED';
    if (value.startsWith('PENDING_APPROVAL')) return 'PENDING';
    if (value === 'DRAFT') return 'SAVED';
    return value || 'SAVED';
}

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function mapHeader(header: any): ReceiptHeader {
    return {
        id: String(header?.id || ''),
        ref_no: String(header?.ref_no || ''),
        doc_date: String(header?.date || '').slice(0, 10),
        warehouse_id: String(header?.warehouse_id || '').trim(),
        supplier_id: String(header?.supplier_id || '').trim(),
        status: toUiStatus(header?.status),
        remarks: String(header?.notes || '').trim(),
        notes: String(header?.notes || '').trim(),
        version: 1,
    };
}

function mapLines(lines: any[]): ReceiptLine[] {
    return (Array.isArray(lines) ? lines : []).map((line: any) => ({
        id: String(line?.id || ''),
        item_id: String(line?.item_id || '').trim(),
        item_name: String(line?.item_name || line?.item_name_ar || '').trim(),
        item_code: String(line?.item_code || line?.item_code_db || '').trim(),
        item_code_lookup: String(line?.item_code || line?.item_code_db || '').trim(),
        qty: toNumber(line?.quantity, 0),
        notes: String(line?.notes || '').trim(),
        line_total: toNumber(line?.quantity, 0),
    }));
}

function coerceWarehouseArray(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.rows)) return raw.rows;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
}

async function fetchWarehouses() {
    const api = (window as any).electronAPI;
    const candidates = await Promise.all([
        api?.inventory?.getWarehouses?.() || Promise.resolve([]),
        api?.warehouse?.getWarehouses?.('COMP_01') || Promise.resolve([]),
        api?.getWarehouses?.() || Promise.resolve([]),
    ]);

    for (const candidate of candidates) {
        const list = coerceWarehouseArray(candidate);
        if (list.length > 0) return list;
    }

    return [];
}

export const grnClient = {
    list: async (params: {
        search?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        sort?: string;
        cursor?: { date: string; id: string } | null;
        limit?: number;
    }): Promise<Result<{ rows: ReceiptListRow[]; next_cursor: null }>> => {
        const result = await normalizeResult<any[]>(api().list());
        if (!result.ok) return result as Result<{ rows: ReceiptListRow[]; next_cursor: null }>;

        const term = String(params.search || '').trim().toLowerCase();
        const rows = (result.data || [])
            .filter((row) => {
                if (!term) return true;
                return [row.ref_no, row.supplier_name, row.notes]
                    .map((value) => String(value || '').toLowerCase())
                    .some((value) => value.includes(term));
            })
            .filter((row) => {
                const date = String(row.date || '').slice(0, 10);
                if (params.dateFrom && date < params.dateFrom) return false;
                if (params.dateTo && date > params.dateTo) return false;
                return true;
            })
            .map((row) => ({
                id: String(row.id || ''),
                code: String(row.ref_no || ''),
                doc_date: String(row.date || '').slice(0, 10),
                supplier_name: String(row.supplier_name || ''),
                grand_total: 0,
                status: toUiStatus(row.status),
                version: 1,
            }))
            .filter((row) => params.status && params.status !== 'ALL' ? row.status === params.status : true);

        return { ok: true, data: { rows, next_cursor: null } };
    },

    get: async (id: string): Promise<Result<{ header: ReceiptHeader; lines: ReceiptLine[] }>> => {
        const result = await normalizeResult<any>(api().get(id));
        if (!result.ok || !result.data) return result as Result<{ header: ReceiptHeader; lines: ReceiptLine[] }>;
        return {
            ok: true,
            data: {
                header: mapHeader(result.data.header),
                lines: mapLines(result.data.lines),
            },
        };
    },

    createDraft: async (): Promise<Result<{ id: string; ref_no: string; status: ReceiptStatusUi }>> => {
        const warehouses = await fetchWarehouses();
        const warehouseId = String(warehouses?.[0]?.id || '').trim() || null;

        const response = await normalizeResult<any>(api().save({
            header: {
                date: new Date().toISOString().slice(0, 10),
                warehouseId,
                notes: '',
                ref_no: 'RCP-NEW',
                status: 'SAVED',
            },
            lines: [],
        }));
        if (!response.ok || !response.data?.id) return response as Result<{ id: string; ref_no: string; status: ReceiptStatusUi }>;

        const loaded = await grnClient.get(String(response.data.id));
        if (!loaded.ok || !loaded.data) return loaded as Result<{ id: string; ref_no: string; status: ReceiptStatusUi }>;

        return {
            ok: true,
            data: {
                id: loaded.data.header.id,
                ref_no: loaded.data.header.ref_no,
                status: loaded.data.header.status,
            },
        };
    },

    save: async (params: {
        id: string;
        header: Partial<ReceiptHeader>;
        lines: ReceiptLine[];
        userId?: string;
    }): Promise<Result<{ header: ReceiptHeader; lines: ReceiptLine[] }>> => {
        const payload = {
            header: {
                id: params.id,
                ref_no: params.header.ref_no || 'RCP-NEW',
                date: String(params.header.doc_date || new Date().toISOString().slice(0, 10)).slice(0, 10),
                warehouseId: String(params.header.warehouse_id || '').trim() || null,
                supplier_id: String(params.header.supplier_id || '').trim() || null,
                notes: String(params.header.remarks || params.header.notes || '').trim() || null,
                status: toServiceStatus(params.header.status),
            },
            lines: (Array.isArray(params.lines) ? params.lines : []).map((line) => ({
                itemId: String(line?.item_id || '').trim(),
                item_code: String(line?.item_code_lookup || line?.item_code || '').trim(),
                name: String(line?.item_name || '').trim(),
                quantity: toNumber(line?.qty, 0),
                notes: String(line?.notes || '').trim() || null,
            })),
        };

        const response = await normalizeResult<any>(api().save(payload));
        if (!response.ok) return response as Result<{ header: ReceiptHeader; lines: ReceiptLine[] }>;
        return grnClient.get(String(response.data?.id || params.id));
    },

    postOrSubmit: async (params: { id: string }): Promise<Result<{ status: ReceiptStatusUi; action: string }>> => {
        const response = await normalizeResult<any>(api().postToPending(params.id));
        if (!response.ok) return response as Result<{ status: ReceiptStatusUi; action: string }>;
        const loaded = await grnClient.get(params.id);
        if (!loaded.ok || !loaded.data) return loaded as Result<{ status: ReceiptStatusUi; action: string }>;
        return {
            ok: true,
            data: {
                status: loaded.data.header.status,
                action: 'posted',
            },
        };
    },

    reopenRejected: async (): Promise<Result<{ status: string }>> =>
        asResult(Promise.reject(new Error('Reopen is not supported for receipt documents'))),

    searchSuppliers: (search: string) => purchaseInvoiceClient.searchSuppliers(search),
    searchItems: (search: string) => purchaseInvoiceClient.searchItems(search),
};