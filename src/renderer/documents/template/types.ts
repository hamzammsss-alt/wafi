export interface ColumnConfig {
    key: string;
    label: string;
    width?: string | number;
    align?: 'left' | 'right' | 'center';
    render?: (value: any, row: any) => React.ReactNode;
    editable?: boolean;
    inputType?: 'text' | 'number' | 'date' | 'select';
    options?: Array<{ id?: string | number; value?: string | number; label?: string; name?: string }>;
    computed?: boolean;
}

export interface HeaderFieldConfig {
    key: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'select' | 'lookup' | 'textarea' | 'readonly';
    lookupKey?: string;
    span?: 1 | 2;
    draftOnly?: boolean;
}

export interface TotalsConfig {
    subtotalKey: string;
    taxKey?: string;
    grandTotalKey: string;
    subtotalLabel?: string;
    taxLabel?: string;
    grandTotalLabel?: string;
}

export type IpcResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string; details?: any } };

export interface DocumentClient<H = any, L = any> {
    listKeyset: (params: any) => Promise<IpcResult<{ rows: any[]; next_cursor: any }>>;
    get: (id: string) => Promise<IpcResult<{ header: H; lines: L[] }>>;
    createDraft: (userId?: string) => Promise<IpcResult<{ id: string; status: string; invoice_no: string }>>;
    save: (params: { id: string; header: Partial<H>; lines: L[]; userId?: string }) => Promise<IpcResult<any>>;
    validate: (id: string) => Promise<IpcResult<{ errors: { field: string; message: string }[] }>>;
    postOrSubmit: (params: { id: string; userId?: string; perms?: string[] }) => Promise<IpcResult<{ status: string; action: string }>>;
    reopenRejected: (params: { id: string; userId?: string; perms?: string[] }) => Promise<IpcResult<{ status: string }>>;
}

export type RecalcLineFn<L = any> = (line: L) => L;
export type RecalcTotalsFn<L = any> = (lines: L[]) => { subtotal: number; tax_total: number; grand_total: number };

export interface DocumentDefinition<H = any, L = any> {
    docType: string;
    title: string;
    listRoute: string;
    docRoute: string;
    newDocRoute: string;

    listColumns: ColumnConfig[];

    adapter: DocumentClient<H, L>;

    headerFields: HeaderFieldConfig[];
    lineColumns: ColumnConfig[];
    totals: TotalsConfig;

    recalcLine: RecalcLineFn<L>;
    recalcTotals: RecalcTotalsFn<L>;

    emptyLine: Partial<L>;
}
