/**
 * DocumentDefinition — Generic document type metadata interface
 * 
 * Create one definition per document type. The generic `DocumentListPage` and 
 * `DocumentPage` components consume these definitions to avoid boilerplate.
 * 
 * Usage example:
 *   const MyDef = new SalesInvoiceDefinition();
 *   <DocumentListPage definition={MyDef} />
 *   <DocumentPage definition={MyDef} id={id} />
 */

import { Result } from './errors';

/* ─── Column config (for list + grid) ─── */
export interface ColumnConfig {
    key: string;
    label: string;
    width?: string | number;
    align?: 'left' | 'right' | 'center';
    /** Custom cell renderer */
    render?: (value: any, row: any) => React.ReactNode;
    /** Is this column editable in the document grid? */
    editable?: boolean;
    /** Input type for the document grid */
    inputType?: 'text' | 'number' | 'date' | 'select' | 'readonly';
    /** Optional static options used when inputType is select */
    options?: Array<{ id?: string | number; value?: string | number; label?: string; name?: string }>;
    /** Whether cell is readonly (computed) */
    computed?: boolean;
}

/* ─── Header field config ─── */
export interface HeaderFieldConfig {
    key: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'select' | 'lookup' | 'textarea' | 'readonly';
    /** F2 lookup IPC channel or client method name */
    lookupKey?: string;
    /** Grid span (1 or 2 columns) */
    span?: 1 | 2;
    /** Disabled when document is not a DRAFT */
    draftOnly?: boolean;
    /** Optional i18n key for the field label */
    labelI18nKey?: string;
    /** Optional static options for select fields */
    options?: Array<{ value: string; label: string; labelI18nKey?: string }>;
}

/* ─── Totals config ─── */
export interface TotalsConfig {
    subtotalKey: string;
    discountKey?: string;
    taxKey?: string;
    grandTotalKey: string;
    subtotalLabel?: string;
    discountLabel?: string;
    taxLabel?: string;
    grandTotalLabel?: string;
    subtotalLabelI18nKey?: string;
    discountLabelI18nKey?: string;
    taxLabelI18nKey?: string;
    grandTotalLabelI18nKey?: string;
}

export interface ValidationIssue {
    field: string;
    message: string;
    messageKey?: string;
}

export interface ValidationResult {
    ok: boolean;
    errors: ValidationIssue[];
}

export interface DocumentCapabilities {
    create: string;
    read: string;
    update: string;
    post: string;
    print: string;
    void: string;
    approve?: string;
}

export interface DocumentLineLookupConfig {
    fieldKey: string;
    type: 'item' | 'account';
}

export interface DocumentSelectOption {
    id: string;
    label: string;
}

export interface DocumentNumberingConfig {
    sequenceKey: string;
    fieldKey: string;
    prefix?: string;
    readonly?: boolean;
}

export interface DocumentWorkflowConfig {
    submitOnMissingPostPermission?: boolean;
}

export interface DocumentPolicyConfig {
    lockedPeriodGuardKey?: string;
}

export interface DocumentStatusRules {
    editable: string[];
    postable: string[];
    voidable?: string[];
    reopenable?: string[];
    transitions?: Record<string, string[]>;
}

export interface DocumentPostingPolicy {
    idempotent: boolean;
    submitOnMissingPostPermission?: boolean;
    postedTokenField?: string;
    postedOnceField?: string;
    alreadyPostedAction?: string;
    conflictErrorCode?: string;
}

export interface DocumentAddonContext<H = any, L = any> {
    docId?: string;
    header: H;
    setHeader: React.Dispatch<React.SetStateAction<H>>;
    rows: L[];
    setRows: React.Dispatch<React.SetStateAction<L[]>>;
    isReadOnly: boolean;
    markDirty: () => void;
}

/* ─── Client API shape ─── */
export interface DocumentClient<H = any, L = any> {
    list: (params: any) => Promise<Result<{ rows: any[]; next_cursor: any }>>;
    get: (id: string) => Promise<Result<{ header: H; lines: L[] }>>;
    createDraft: (userId?: string) => Promise<Result<{ id: string; status: string }>>;
    save: (params: { id: string; header: Partial<H>; lines: L[]; userId?: string }) => Promise<Result<any>>;
    validate?: (id: string) => Promise<Result<any>>;
    postOrSubmit: (params: { id: string; userId?: string; hasPostPermission?: boolean }) => Promise<Result<{ status: string; action: string }>>;
    reopenRejected: (params: { id: string; userId?: string }) => Promise<Result<{ status: string }>>;
    void?: (params: { id: string; userId?: string }) => Promise<Result<{ status: string }>>;
    searchItems?: (search: string, context?: any) => Promise<Result<any[]>>;
    resolveItemPrice?: (input: any) => Promise<Result<any>>;
    searchCustomers?: (search: string) => Promise<Result<any[]>>;
    searchSuppliers?: (search: string) => Promise<Result<any[]>>;
    searchAccounts?: (search: string) => Promise<Result<any[]>>;
}

/* ─── Calculation functions ─── */
export type RecalcLineFn<L = any> = (line: L) => L;
export type RecalcTotalsFn<L = any> = (lines: L[]) => { subtotal: number; tax_total: number; grand_total: number };

/* ─── Main DocumentDefinition interface ─── */
export interface DocumentDefinition<H = any, L = any> {
    /** Internal doc type key (e.g. 'sales_invoice') */
    docType: string;

    /** Arabic display label */
    title: string;

    /** Route paths */
    listRoute: string;
    docRoute: string;       // e.g. '/sales/invoices'
    newDocRoute: string;    // e.g. '/sales/invoices/new'
    /** Screen definition key for Dynamic Filters + Saved Views */
    screenKey?: string;

    /** API permission keys */
    permissions?: {
        post: string;       // e.g. 'DOC.POST'
        submit?: string;    // e.g. 'DOC.SUBMIT_APPROVAL'
        reopen?: string;    // e.g. 'DOC.REOPEN_REJECTED'
    };
    /** Canonical action capability keys */
    capabilities?: DocumentCapabilities;
    capabilityKeys?: string[];
    statusRules?: DocumentStatusRules;
    postingPolicy?: DocumentPostingPolicy;

    /** Column configuration for the list view */
    listColumns: ColumnConfig[];

    /** Field configuration for the document header form */
    headerFields: HeaderFieldConfig[];
    headerSchema?: HeaderFieldConfig[];

    /** Column configuration for the document lines grid */
    lineColumns: ColumnConfig[];
    linesSchema?: ColumnConfig[];

    /** Totals bar configuration */
    totals?: TotalsConfig;

    /** Line recalculation (called on each cell change) */
    recalcLine?: RecalcLineFn<L>;

    /** Grand total recalculation (called after any line change) */
    recalcTotals?: RecalcTotalsFn<L>;
    computeTotals?: RecalcTotalsFn<L>;

    /** Typed API client */
    client: DocumentClient<H, L>;

    /** Default empty line */
    emptyLine: Partial<L>;
    defaultValues?: {
        header?: Partial<H>;
        line?: Partial<L>;
    };

    /** Normalization + validation hooks for the Standard Document Contract */
    normalize?: (header: Partial<H>, lines: L[]) => { header: Partial<H>; lines: L[] };
    validate?: (header: Partial<H>, lines: L[]) => ValidationResult;

    numbering?: DocumentNumberingConfig;
    workflow?: DocumentWorkflowConfig;
    policy?: DocumentPolicyConfig;
    lineLookup?: DocumentLineLookupConfig;
    loadSelectOptions?: () => Promise<Record<string, DocumentSelectOption[]>>;
    renderBeforeLines?: (context: DocumentAddonContext<H, L>) => React.ReactNode;
    skipPermissionChecks?: boolean;
    saveOnHeaderCommit?: boolean;
    createDraftOnOpen?: boolean;
    closeOnEsc?: boolean;
}
