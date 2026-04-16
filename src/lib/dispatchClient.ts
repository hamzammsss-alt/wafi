import { asResult, Result } from '../types/errors';
import { salesInvoiceClient } from './salesInvoiceClient';

type DispatchStatusUi = 'DRAFT' | 'PENDING_APPROVAL_L1' | 'POSTED';

export interface DispatchListRow {
    id: string;
    code: string;
    doc_date: string;
    customer_name?: string;
    warehouse_name?: string;
    total_qty: number;
    status: DispatchStatusUi;
    version: number;
}

export interface DispatchHeader {
    id: string;
    code: string;
    doc_date: string;
    customer_id?: string;
    customer_name?: string;
    from_warehouse_id?: string;
    truck_id?: string;
    sales_rep_id?: string;
    tracking_no?: string;
    receiver_name?: string;
    delivery_address?: string;
    status: DispatchStatusUi;
    remarks?: string;
    notes?: string;
    version: number;
}

export interface DispatchLine {
    id?: string;
    line_no?: number;
    item_id?: string;
    item_name?: string;
    item_code?: string;
    item_code_lookup?: string;
    qty: number;
    notes?: string;
    line_total?: number;
}

const api = () => (window as any).electronAPI.dispatch;

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

function toUiStatus(raw: unknown): DispatchStatusUi {
    const value = String(raw || '').trim();
    if (value === 'مرحل') return 'POSTED';
    if (value === 'عالق') return 'PENDING_APPROVAL_L1';
    return 'DRAFT';
}

function toServiceStatus(raw: unknown): string {
    const value = String(raw || '').trim();
    if (value === 'POSTED') return 'مرحل';
    if (value.startsWith('PENDING_APPROVAL')) return 'عالق';
    if (value === 'DRAFT') return 'محفوظ';
    return value || 'محفوظ';
}

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function withDispatchHeaderDefaults(header: any, fallbackDate?: string, fallbackTime?: string) {
    return {
        id: String(header?.id || '').trim() || null,
        serial_no: String(header?.serial_no || header?.code || 'جديد').trim(),
        status: String(header?.status || 'محفوظ').trim() || 'محفوظ',
        dispatch_type: String(header?.dispatch_type || 'تحويل داخلي').trim() || 'تحويل داخلي',
        dispatch_date: String(header?.dispatch_date || header?.doc_date || fallbackDate || new Date().toISOString().slice(0, 10)).slice(0, 10),
        dispatch_time: String(header?.dispatch_time || fallbackTime || new Date().toTimeString().slice(0, 8)).slice(0, 8),
        from_warehouse_id: String(header?.from_warehouse_id || '').trim() || null,
        to_type: String(header?.to_type || 'Warehouse').trim() || 'Warehouse',
        to_id: String(header?.to_id || '').trim() || null,
        ledger_id: String(header?.ledger_id || header?.customer_id || '').trim() || null,
        sales_rep_id: String(header?.sales_rep_id || '').trim() || null,
        truck_id: String(header?.truck_id || '').trim() || null,
        carrier_id: String(header?.carrier_id || '').trim() || null,
        tracking_no: String(header?.tracking_no || '').trim() || null,
        is_sent: Number(header?.is_sent ? 1 : 0),
        is_maintenance: Number(header?.is_maintenance ? 1 : 0),
        customer_ref: String(header?.customer_ref || '').trim() || null,
        send_to: String(header?.send_to || header?.customer_name || '').trim() || null,
        shipment_no: String(header?.shipment_no || '').trim() || null,
        receiver_name: String(header?.receiver_name || '').trim() || null,
        receiver_phone: String(header?.receiver_phone || '').trim() || null,
        delivery_date: String(header?.delivery_date || '').trim() || null,
        delivery_address: String(header?.delivery_address || '').trim() || null,
        delivery_instructions: String(header?.delivery_instructions || '').trim() || null,
        source_type: String(header?.source_type || '').trim() || null,
        source_id: String(header?.source_id || '').trim() || null,
        notes: String(header?.notes || header?.remarks || '').trim() || null,
    };
}

function matchesSearch(row: any, search?: string): boolean {
    const term = String(search || '').trim().toLowerCase();
    if (!term) return true;
    return [row.serial_no, row.ledger_name, row.notes, row.receiver_name, row.delivery_address]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(term));
}

function matchesDate(row: any, dateFrom?: string, dateTo?: string): boolean {
    const date = String(row.dispatch_date || '').slice(0, 10);
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
}

function mapListRow(row: any): DispatchListRow {
    return {
        id: String(row.id || ''),
        code: String(row.serial_no || ''),
        doc_date: String(row.dispatch_date || '').slice(0, 10),
        customer_name: String(row.ledger_name || ''),
        warehouse_name: String(row.from_warehouse_name || ''),
        total_qty: toNumber(row.total_qty, 0),
        status: toUiStatus(row.status),
        version: 1,
    };
}

function mapHeader(header: any): DispatchHeader {
    return {
        id: String(header?.id || ''),
        code: String(header?.serial_no || ''),
        doc_date: String(header?.dispatch_date || '').slice(0, 10),
        customer_id: String(header?.ledger_id || '').trim(),
        customer_name: String(header?.ledger_name || '').trim(),
        from_warehouse_id: String(header?.from_warehouse_id || '').trim(),
        truck_id: String(header?.truck_id || '').trim(),
        sales_rep_id: String(header?.sales_rep_id || '').trim(),
        tracking_no: String(header?.tracking_no || '').trim(),
        receiver_name: String(header?.receiver_name || '').trim(),
        delivery_address: String(header?.delivery_address || '').trim(),
        status: toUiStatus(header?.status),
        remarks: String(header?.notes || '').trim(),
        notes: String(header?.notes || '').trim(),
        version: 1,
    };
}

function mapLines(lines: any[]): DispatchLine[] {
    return (Array.isArray(lines) ? lines : []).map((line: any) => ({
        id: String(line?.id || ''),
        line_no: toNumber(line?.line_no, 0),
        item_id: String(line?.item_id || '').trim(),
        item_name: String(line?.item_name || '').trim(),
        item_code: String(line?.item_code || '').trim(),
        item_code_lookup: String(line?.item_code || '').trim(),
        qty: toNumber(line?.qty, 0),
        notes: String(line?.line_note || '').trim(),
        line_total: toNumber(line?.qty, 0),
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

export const dispatchClient = {
    list: async (params: {
        search?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        sort?: string;
        cursor?: { date: string; id: string } | null;
        limit?: number;
    }): Promise<Result<{ rows: DispatchListRow[]; next_cursor: null }>> => {
        const result = await normalizeResult<any[]>(api().getAll());
        if (!result.ok) {
            return { ok: false, error: result.error };
        }

        const rows = (result.data || [])
            .filter((row) => matchesSearch(row, params.search))
            .filter((row) => matchesDate(row, params.dateFrom, params.dateTo))
            .map(mapListRow)
            .filter((row) => params.status && params.status !== 'ALL' ? row.status === params.status : true);

        return { ok: true, data: { rows, next_cursor: null } };
    },

    get: async (id: string): Promise<Result<{ header: DispatchHeader; lines: DispatchLine[] }>> => {
        const result = await normalizeResult<any>(api().getById(id));
        if (!result.ok || !result.data) return result as Result<{ header: DispatchHeader; lines: DispatchLine[] }>;
        return {
            ok: true,
            data: {
                header: mapHeader(result.data.header),
                lines: mapLines(result.data.lines),
            },
        };
    },

    createDraft: async (): Promise<Result<{ id: string; code: string; status: DispatchStatusUi }>> => {
        const warehouses = await fetchWarehouses();
        const warehouseId = String(warehouses?.[0]?.id || '').trim();
        if (!warehouseId) {
            return asResult(Promise.reject(new Error('No warehouse available for dispatch draft')));
        }

        const now = new Date();
        const payloadHeader = withDispatchHeaderDefaults({
            serial_no: 'جديد',
            dispatch_date: now.toISOString().slice(0, 10),
            dispatch_time: now.toTimeString().slice(0, 8),
            from_warehouse_id: warehouseId,
            to_type: 'Warehouse',
            to_id: warehouseId,
            dispatch_type: 'تحويل داخلي',
            status: 'محفوظ',
            notes: '',
        }, now.toISOString().slice(0, 10), now.toTimeString().slice(0, 8));

        const response = await normalizeResult<string>(api().update(null, {
            header: payloadHeader,
            lines: [],
        }));
        if (!response.ok || !response.data) {
            return { ok: false, error: response.error };
        }

        const loaded = await dispatchClient.get(String(response.data));
        if (!loaded.ok || !loaded.data) {
            return { ok: false, error: loaded.error };
        }

        return {
            ok: true,
            data: {
                id: loaded.data.header.id,
                code: loaded.data.header.code,
                status: loaded.data.header.status,
            },
        };
    },

    save: async (params: {
        id: string;
        header: Partial<DispatchHeader>;
        lines: DispatchLine[];
        userId?: string;
    }): Promise<Result<{ header: DispatchHeader; lines: DispatchLine[] }>> => {
        const currentHeader = params.header || {};
        const now = new Date();
        const warehouseId = String(currentHeader.from_warehouse_id || '').trim();
        const customerId = String(currentHeader.customer_id || '').trim();
        const payloadHeader = withDispatchHeaderDefaults({
            id: params.id,
            serial_no: currentHeader.code || 'جديد',
            status: toServiceStatus(currentHeader.status),
            dispatch_type: 'تحويل داخلي',
            dispatch_date: String(currentHeader.doc_date || now.toISOString().slice(0, 10)).slice(0, 10),
            dispatch_time: now.toTimeString().slice(0, 8),
            from_warehouse_id: warehouseId,
            to_type: customerId ? 'Customer' : 'Warehouse',
            to_id: customerId || warehouseId,
            ledger_id: customerId || null,
            sales_rep_id: String(currentHeader.sales_rep_id || '').trim() || null,
            truck_id: String(currentHeader.truck_id || '').trim() || null,
            tracking_no: String(currentHeader.tracking_no || '').trim() || null,
            receiver_name: String(currentHeader.receiver_name || '').trim() || null,
            delivery_address: String(currentHeader.delivery_address || '').trim() || null,
            send_to: String(currentHeader.customer_name || '').trim() || null,
            notes: String(currentHeader.remarks || currentHeader.notes || '').trim() || null,
        }, now.toISOString().slice(0, 10), now.toTimeString().slice(0, 8));

        const payload = {
            header: payloadHeader,
            lines: (Array.isArray(params.lines) ? params.lines : []).map((line, index) => ({
                item_id: String(line?.item_id || '').trim(),
                qty: toNumber(line?.qty, 0),
                uom: 'PCS',
                ref: null,
                line_note: String(line?.notes || '').trim() || null,
                source_line_id: null,
                line_no: index + 1,
            })),
        };

        const response = await normalizeResult<string>(api().update(params.id || null, payload));
        if (!response.ok) {
            return { ok: false, error: response.error };
        }
        return dispatchClient.get(String(response.data || params.id));
    },

    postOrSubmit: async (params: { id: string }): Promise<Result<{ status: DispatchStatusUi; action: string }>> => {
        const response = await normalizeResult<any>(api().postToPending(params.id));
        if (!response.ok) {
            return { ok: false, error: response.error };
        }
        const loaded = await dispatchClient.get(params.id);
        if (!loaded.ok || !loaded.data) {
            return { ok: false, error: loaded.error };
        }
        return {
            ok: true,
            data: {
                status: loaded.data.header.status,
                action: 'posted',
            },
        };
    },

    reopenRejected: async (): Promise<Result<{ status: string }>> =>
        asResult(Promise.reject(new Error('Reopen is not supported for dispatch documents'))),

    searchCustomers: (search: string) => salesInvoiceClient.searchCustomers(search),
    searchItems: (search: string) => salesInvoiceClient.searchItems(search),
};