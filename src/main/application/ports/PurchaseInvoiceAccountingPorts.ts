export interface PurchaseInvoiceHeaderRecord {
    id: string;
    companyId: string;
    branchId: string;
    invoiceNo: string;
    invoiceDate: string;
    vendorId: string;
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

export type PurchaseInvoiceLineType = 'INVENTORY' | 'EXPENSE' | 'SERVICE';

export interface PurchaseInvoiceLineRecord {
    id: string;
    invoiceId: string;
    itemId: string | null;
    warehouseId: string | null;
    lineType: PurchaseInvoiceLineType;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    lineSubtotal: number;
    taxableAmount: number;
    vatAmount: number;
    lineTotal: number;
    expenseTypeId: string | null;
    vehicleId: string | null;
    projectId: string | null;
    costCenterId: string | null;
}

export interface PurchaseInvoiceVendorRecord {
    id: string;
    isActive: boolean;
}

export interface PurchaseInvoiceItemMeta {
    itemGroupId: string | null;
    isService: boolean;
}

export interface PurchaseInvoicePostingStateRecord {
    invoiceId: string;
    status: string;
    journalId: string | null;
    reversalJournalId: string | null;
    version: number;
}

export interface PurchaseInvoiceAccountingRepositoryPort {
    ensureSchema(): void;
    getInvoiceHeaderById(companyId: string, branchId: string, invoiceId: string): PurchaseInvoiceHeaderRecord | null;
    getInvoiceLinesByInvoiceId(invoiceId: string): PurchaseInvoiceLineRecord[];
    getVendorById(vendorId: string): PurchaseInvoiceVendorRecord | null;
    getItemMeta(itemId: string): PurchaseInvoiceItemMeta;
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
    getPostingState(companyId: string, branchId: string, invoiceId: string): PurchaseInvoicePostingStateRecord | null;
}
