export interface SalesInvoiceHeaderRecord {
    id: string;
    companyId: string;
    branchId: string;
    invoiceNo: string;
    invoiceDate: string;
    customerId: string;
    currencyCode: string;
    currencyRate: number;
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    vatAmount: number;
    totalAmount: number;
    status: string;
    version: number;
    journalId: string | null;
    reversalJournalId: string | null;
    costCenterId: string | null;
    expenseTypeId: string | null;
    vehicleId: string | null;
    projectId: string | null;
    warehouseId: string | null;
}

export interface SalesInvoiceLineRecord {
    id: string;
    invoiceId: string;
    itemId: string | null;
    warehouseId: string | null;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    lineSubtotal: number;
    taxableAmount: number;
    vatAmount: number;
    lineTotal: number;
    costAmount: number;
    projectId: string | null;
    costCenterId: string | null;
    expenseTypeId: string | null;
    vehicleId: string | null;
}

export interface SalesInvoiceCustomerRecord {
    id: string;
    isActive: boolean;
}

export interface SalesInvoiceItemMeta {
    itemGroupId: string | null;
    isService: boolean;
    costAmount: number;
}

export interface SalesInvoicePostingStateRecord {
    invoiceId: string;
    status: string;
    journalId: string | null;
    reversalJournalId: string | null;
    version: number;
}

export interface SalesInvoiceAccountingRepositoryPort {
    ensureSchema(): void;
    getInvoiceHeaderById(companyId: string, branchId: string, invoiceId: string): SalesInvoiceHeaderRecord | null;
    getInvoiceLinesByInvoiceId(invoiceId: string): SalesInvoiceLineRecord[];
    getCustomerById(customerId: string): SalesInvoiceCustomerRecord | null;
    getItemMeta(itemId: string, warehouseId: string | null): SalesInvoiceItemMeta;
    isPerpetualInventoryEnabled(companyId: string): boolean;
    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string;
    savePostingState(
        companyId: string,
        branchId: string,
        invoiceId: string,
        journalId: string,
        postedBy: string,
    ): void;
    saveReversalState(
        companyId: string,
        branchId: string,
        invoiceId: string,
        reversalJournalId: string,
        reversedBy: string,
    ): void;
    getPostingState(companyId: string, branchId: string, invoiceId: string): SalesInvoicePostingStateRecord | null;
}
