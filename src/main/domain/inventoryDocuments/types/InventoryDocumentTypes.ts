export type InventoryDocumentType =
    | 'GOODS_RECEIPT'
    | 'GOODS_ISSUE'
    | 'STOCK_TRANSFER'
    | 'STOCK_ADJUSTMENT';

export type InventoryDocumentStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export type InventoryAdjustmentDirection = 'IN' | 'OUT';

export interface InventoryDocumentHeaderEntity {
    id: string;
    companyId: string;
    branchId: string;
    docType: InventoryDocumentType;
    docNo: string;
    docDate: string;
    status: InventoryDocumentStatus;
    warehouseId: string | null;
    toWarehouseId: string | null;
    referenceNo: string | null;
    remarks: string | null;
    currencyCode: string;
    currencyRate: number;
    createdBy: string;
    approvedBy: string | null;
    version: number;
    journalId: string | null;
    reversalJournalId: string | null;
    postedAt: string | null;
    postedBy: string | null;
    reversedAt: string | null;
    reversedBy: string | null;
    stockPostedAt: string | null;
    stockReversedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InventoryDocumentLineEntity {
    id: string;
    documentId: string;
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
}

export interface InventoryDocumentEntity {
    header: InventoryDocumentHeaderEntity;
    lines: InventoryDocumentLineEntity[];
}

export interface CreateInventoryDocumentInput {
    docType: InventoryDocumentType;
    docDate: string;
    warehouseId?: string | null;
    toWarehouseId?: string | null;
    referenceNo?: string | null;
    remarks?: string | null;
    currencyCode?: string | null;
    currencyRate?: number | null;
    createdBy: string;
    approvedBy?: string | null;
    lines: Array<{
        itemId: string;
        fromWarehouseId?: string | null;
        toWarehouseId?: string | null;
        qty: number;
        unitCost: number;
        totalCost?: number | null;
        projectId?: string | null;
        costCenterId?: string | null;
        partnerId?: string | null;
        expenseTypeId?: string | null;
        vehicleId?: string | null;
        remarks?: string | null;
        adjustmentDirection?: InventoryAdjustmentDirection | null;
    }>;
}

export interface UpdateInventoryDocumentInput {
    id: string;
    docDate: string;
    warehouseId?: string | null;
    toWarehouseId?: string | null;
    referenceNo?: string | null;
    remarks?: string | null;
    currencyCode?: string | null;
    currencyRate?: number | null;
    approvedBy?: string | null;
    lines: Array<{
        id?: string;
        itemId: string;
        fromWarehouseId?: string | null;
        toWarehouseId?: string | null;
        qty: number;
        unitCost: number;
        totalCost?: number | null;
        projectId?: string | null;
        costCenterId?: string | null;
        partnerId?: string | null;
        expenseTypeId?: string | null;
        vehicleId?: string | null;
        remarks?: string | null;
        adjustmentDirection?: InventoryAdjustmentDirection | null;
    }>;
}

export interface PostInventoryDocumentCommand {
    companyId: string;
    branchId: string;
    userId: string;
    documentId: string;
}

export interface ReverseInventoryDocumentCommand {
    documentId: string;
    reverseDate: string;
    reason?: string | null;
}

export interface InventoryDocumentPostingStatus {
    documentId: string;
    docType: InventoryDocumentType;
    docNo: string | null;
    documentStatus: InventoryDocumentStatus;
    sourceVersion: number;
    isStockPosted: boolean;
    isStockReversed: boolean;
    isFinancialPosted: boolean;
    isFinancialReversed: boolean;
    journalId: string | null;
    journalNo: string | null;
    reversalJournalId: string | null;
    reversalJournalNo: string | null;
    postedAt: string | null;
    reversedAt: string | null;
}
