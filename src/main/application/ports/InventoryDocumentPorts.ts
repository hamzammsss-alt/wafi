import {
    InventoryAdjustmentDirection,
    InventoryDocumentEntity,
    InventoryDocumentHeaderEntity,
    InventoryDocumentLineEntity,
    InventoryDocumentType,
} from '../../domain/inventoryDocuments/types/InventoryDocumentTypes';

export interface InventoryItemRecord {
    id: string;
    itemGroupId: string | null;
    isActive: boolean;
    isStockItem: boolean;
}

export interface InventoryWarehouseRecord {
    id: string;
    isActive: boolean;
}

export interface InventoryPostingStateRecord {
    documentId: string;
    status: string;
    version: number;
    journalId: string | null;
    reversalJournalId: string | null;
    postedAt: string | null;
    reversedAt: string | null;
    stockPostedAt: string | null;
    stockReversedAt: string | null;
}

export interface StockLedgerEntryRecord {
    id: string;
    companyId: string;
    branchId: string;
    docType: InventoryDocumentType;
    docId: string;
    docLineId: string;
    itemId: string;
    warehouseId: string;
    qtyIn: number;
    qtyOut: number;
    unitCost: number;
    totalCost: number;
    movementSide: 'IN' | 'OUT';
    isReversal: boolean;
    reversedEntryId: string | null;
    movementDate: string;
    createdAt: string;
}

export interface InsertStockLedgerEntryInput {
    id: string;
    companyId: string;
    branchId: string;
    docType: InventoryDocumentType;
    docId: string;
    docLineId: string;
    itemId: string;
    warehouseId: string;
    qtyIn: number;
    qtyOut: number;
    unitCost: number;
    totalCost: number;
    movementSide: 'IN' | 'OUT';
    isReversal: boolean;
    reversedEntryId: string | null;
    movementDate: string;
    createdAt: string;
}

export interface CreateInventoryDocumentDbInput {
    id: string;
    companyId: string;
    branchId: string;
    docType: InventoryDocumentType;
    docNo: string;
    docDate: string;
    status: 'DRAFT' | 'POSTED' | 'CANCELLED';
    warehouseId: string | null;
    toWarehouseId: string | null;
    referenceNo: string | null;
    remarks: string | null;
    currencyCode: string;
    currencyRate: number;
    createdBy: string;
    approvedBy: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        itemId: string;
        fromWarehouseId: string | null;
        toWarehouseId: string | null;
        qty: number;
        unitCost: number;
        totalCost: number;
        projectId: string | null;
        costCenterId: string | null;
        partnerId: string | null;
        expenseTypeId: string | null;
        vehicleId: string | null;
        remarks: string | null;
        adjustmentDirection: InventoryAdjustmentDirection | null;
        createdAt: string;
        updatedAt: string;
    }>;
}

export interface UpdateInventoryDocumentDbInput {
    id: string;
    companyId: string;
    branchId: string;
    docDate: string;
    warehouseId: string | null;
    toWarehouseId: string | null;
    referenceNo: string | null;
    remarks: string | null;
    currencyCode: string;
    currencyRate: number;
    approvedBy: string | null;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        itemId: string;
        fromWarehouseId: string | null;
        toWarehouseId: string | null;
        qty: number;
        unitCost: number;
        totalCost: number;
        projectId: string | null;
        costCenterId: string | null;
        partnerId: string | null;
        expenseTypeId: string | null;
        vehicleId: string | null;
        remarks: string | null;
        adjustmentDirection: InventoryAdjustmentDirection | null;
        createdAt: string;
        updatedAt: string;
    }>;
}

export interface SaveInventoryPostingStateInput {
    companyId: string;
    branchId: string;
    documentId: string;
    journalId: string | null;
    postedBy: string;
    postedAt: string;
    stockPostedAt: string;
    nextStatus: 'POSTED';
}

export interface SaveInventoryReversalStateInput {
    companyId: string;
    branchId: string;
    documentId: string;
    reversalJournalId: string | null;
    reversedBy: string;
    reversedAt: string;
    stockReversedAt: string;
    nextStatus: 'CANCELLED';
}

export interface InventoryDocumentRepositoryPort {
    ensureSchema(): void;
    nextIdentity(): string;
    nextDocumentNo(companyId: string, branchId: string, docType: InventoryDocumentType): string;
    runInTransaction<T>(work: () => T): T;

    createDocument(input: CreateInventoryDocumentDbInput): InventoryDocumentEntity;
    updateDocument(input: UpdateInventoryDocumentDbInput): InventoryDocumentEntity;

    getDocumentById(companyId: string, branchId: string, documentId: string): InventoryDocumentEntity | null;
    getDocumentHeaderById(companyId: string, branchId: string, documentId: string): InventoryDocumentHeaderEntity | null;
    getDocumentLinesByDocumentId(documentId: string): InventoryDocumentLineEntity[];

    getItemById(itemId: string): InventoryItemRecord | null;
    getWarehouseById(warehouseId: string): InventoryWarehouseRecord | null;

    isPerpetualInventoryEnabled(companyId: string): boolean;
    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string;

    getPostingState(companyId: string, branchId: string, documentId: string): InventoryPostingStateRecord | null;
    savePostingState(input: SaveInventoryPostingStateInput): void;
    saveReversalState(input: SaveInventoryReversalStateInput): void;

    hasStockLedgerPosting(companyId: string, docType: InventoryDocumentType, docId: string): boolean;
    hasStockLedgerReversal(companyId: string, docType: InventoryDocumentType, docId: string): boolean;
    listStockLedgerEntries(companyId: string, docType: InventoryDocumentType, docId: string, isReversal: boolean): StockLedgerEntryRecord[];
    insertStockLedgerEntries(entries: InsertStockLedgerEntryInput[]): void;
}
