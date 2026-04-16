import {
    BomEntity,
    ManufacturingBomStatus,
    ManufacturingPolicy,
    ManufacturingRoutingStatus,
    ProductionIssueEntity,
    ProductionIssueHeaderEntity,
    ProductionOrderComponentEntity,
    ProductionOrderEntity,
    ProductionOrderOperationEntity,
    ProductionOrderStatus,
    ProductionReceiptEntity,
    ProductionReceiptHeaderEntity,
} from '../../domain/manufacturing/types/ManufacturingTypes';

export interface ManufacturingItemRecord {
    id: string;
    itemGroupId: string | null;
    isActive: boolean;
    isStockItem: boolean;
    defaultUnitCost: number;
}

export interface ManufacturingWarehouseRecord {
    id: string;
    isActive: boolean;
}

export interface ManufacturingStockLedgerEntryRecord {
    id: string;
    companyId: string;
    branchId: string;
    docType: string;
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

export interface CreateBomDbInput {
    id: string;
    companyId: string;
    itemId: string;
    versionNo: number;
    status: ManufacturingBomStatus;
    isDefault: boolean;
    outputQty: number;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    remarks: string | null;
    createdBy: string;
    approvedBy: string | null;
    createdAt: string;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        componentItemId: string;
        warehouseId: string | null;
        qtyPer: number;
        scrapPercent: number;
        issueMethod: string;
        remarks: string | null;
    }>;
}

export interface UpdateBomDbInput {
    id: string;
    companyId: string;
    outputQty: number;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    remarks: string | null;
    approvedBy: string | null;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        componentItemId: string;
        warehouseId: string | null;
        qtyPer: number;
        scrapPercent: number;
        issueMethod: string;
        remarks: string | null;
    }>;
}

export interface CreateRoutingDbInput {
    id: string;
    companyId: string;
    itemId: string;
    versionNo: number;
    status: ManufacturingRoutingStatus;
    isDefault: boolean;
    remarks: string | null;
    createdBy: string;
    approvedBy: string | null;
    createdAt: string;
    updatedAt: string;
    steps: Array<{
        id: string;
        stepNo: number;
        workCenterCode: string;
        operationCode: string;
        setupTimeMinutes: number;
        runTimeMinutes: number;
        laborCostRate: number;
        machineCostRate: number;
        remarks: string | null;
    }>;
}

export interface UpdateRoutingDbInput {
    id: string;
    companyId: string;
    remarks: string | null;
    approvedBy: string | null;
    updatedAt: string;
    steps: Array<{
        id: string;
        stepNo: number;
        workCenterCode: string;
        operationCode: string;
        setupTimeMinutes: number;
        runTimeMinutes: number;
        laborCostRate: number;
        machineCostRate: number;
        remarks: string | null;
    }>;
}

export interface CreateProductionOrderDbInput {
    id: string;
    companyId: string;
    branchId: string;
    orderNo: string;
    orderDate: string;
    status: ProductionOrderStatus;
    itemId: string;
    bomId: string | null;
    routingId: string | null;
    warehouseId: string;
    qtyPlanned: number;
    qtyStarted: number;
    qtyCompleted: number;
    qtyScrapped: number;
    qtyIssued: number;
    materialCostIssued: number;
    laborCostEstimated: number;
    machineCostEstimated: number;
    costCapitalized: number;
    totalWipCost: number;
    unitCostCompleted: number;
    referenceNo: string | null;
    remarks: string | null;
    projectId: string | null;
    costCenterId: string | null;
    createdBy: string;
    approvedBy: string | null;
    sourceDocType: string | null;
    sourceDocId: string | null;
    createdAt: string;
    updatedAt: string;
    components: Array<{
        id: string;
        lineNo: number;
        componentItemId: string;
        warehouseId: string | null;
        qtyRequired: number;
        qtyIssued: number;
        qtyReturned: number;
        issueMethod: string;
        unitCost: number | null;
        totalCost: number | null;
        remarks: string | null;
    }>;
    operations: Array<{
        id: string;
        stepNo: number;
        workCenterCode: string;
        operationCode: string;
        status: string;
        setupTimeMinutes: number;
        runTimeMinutes: number;
        laborCostRate: number;
        machineCostRate: number;
    }>;
}

export interface UpdateProductionOrderDbInput {
    id: string;
    companyId: string;
    branchId: string;
    orderDate: string;
    warehouseId: string;
    qtyPlanned: number;
    referenceNo: string | null;
    remarks: string | null;
    projectId: string | null;
    costCenterId: string | null;
    approvedBy: string | null;
    updatedAt: string;
}

export interface SaveProductionOrderStatusInput {
    companyId: string;
    branchId: string;
    orderId: string;
    status: ProductionOrderStatus;
    approvedBy: string | null;
    updatedAt: string;
}

export interface UpdateProductionOrderProgressInput {
    companyId: string;
    branchId: string;
    orderId: string;
    qtyIssuedDelta?: number;
    qtyCompletedDelta?: number;
    qtyScrappedDelta?: number;
    materialCostIssuedDelta?: number;
    costCapitalizedDelta?: number;
    unitCostCompleted?: number;
    totalWipCost?: number;
    status?: ProductionOrderStatus;
    updatedAt: string;
}

export interface CreateProductionIssueDbInput {
    id: string;
    companyId: string;
    branchId: string;
    issueNo: string;
    issueDate: string;
    status: 'DRAFT' | 'POSTED' | 'CANCELLED';
    productionOrderId: string;
    referenceNo: string | null;
    remarks: string | null;
    createdBy: string;
    approvedBy: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        componentLineId: string | null;
        componentItemId: string;
        warehouseId: string;
        qty: number;
        unitCost: number;
        totalCost: number;
        remarks: string | null;
    }>;
}

export interface CreateProductionReceiptDbInput {
    id: string;
    companyId: string;
    branchId: string;
    receiptNo: string;
    receiptDate: string;
    status: 'DRAFT' | 'POSTED' | 'CANCELLED';
    productionOrderId: string;
    referenceNo: string | null;
    remarks: string | null;
    createdBy: string;
    approvedBy: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        itemId: string;
        warehouseId: string;
        qtyReceived: number;
        qtyScrapped: number;
        unitCost: number;
        totalCost: number;
        remarks: string | null;
    }>;
}

export interface SaveProductionIssuePostingStateInput {
    companyId: string;
    branchId: string;
    issueId: string;
    journalId: string | null;
    postedBy: string;
    postedAt: string;
    stockPostedAt: string;
    nextStatus: 'POSTED';
}

export interface SaveProductionIssueReversalStateInput {
    companyId: string;
    branchId: string;
    issueId: string;
    reversalJournalId: string | null;
    reversedBy: string;
    reversedAt: string;
    stockReversedAt: string;
    nextStatus: 'CANCELLED';
}

export interface SaveProductionReceiptPostingStateInput {
    companyId: string;
    branchId: string;
    receiptId: string;
    journalId: string | null;
    postedBy: string;
    postedAt: string;
    stockPostedAt: string;
    nextStatus: 'POSTED';
}

export interface SaveProductionReceiptReversalStateInput {
    companyId: string;
    branchId: string;
    receiptId: string;
    reversalJournalId: string | null;
    reversedBy: string;
    reversedAt: string;
    stockReversedAt: string;
    nextStatus: 'CANCELLED';
}

export interface ManufacturingRepositoryPort {
    ensureSchema(): void;
    nextIdentity(): string;
    nextDocumentNo(companyId: string, branchId: string, key: string): string;
    runInTransaction<T>(work: () => T): T;

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string;
    getItemById(itemId: string): ManufacturingItemRecord | null;
    getWarehouseById(warehouseId: string): ManufacturingWarehouseRecord | null;

    createBom(input: CreateBomDbInput): BomEntity;
    updateBom(input: UpdateBomDbInput): BomEntity;
    getBomById(companyId: string, bomId: string): BomEntity | null;
    getDefaultBomForItem(companyId: string, itemId: string, asOfDate: string | null): BomEntity | null;
    setBomDefault(companyId: string, itemId: string, bomId: string, updatedAt: string): void;
    setBomStatus(companyId: string, bomId: string, status: ManufacturingBomStatus, approvedBy: string | null, updatedAt: string): void;
    listBomHeadersByItem(companyId: string, itemId: string): BomEntity[];

    createRouting(input: CreateRoutingDbInput): void;
    updateRouting(input: UpdateRoutingDbInput): void;
    getRoutingById(companyId: string, routingId: string): import('../../domain/manufacturing/types/ManufacturingTypes').RoutingEntity | null;
    getDefaultRoutingForItem(companyId: string, itemId: string): import('../../domain/manufacturing/types/ManufacturingTypes').RoutingEntity | null;
    setRoutingDefault(companyId: string, itemId: string, routingId: string, updatedAt: string): void;
    setRoutingStatus(companyId: string, routingId: string, status: ManufacturingRoutingStatus, approvedBy: string | null, updatedAt: string): void;

    createProductionOrder(input: CreateProductionOrderDbInput): ProductionOrderEntity;
    updateProductionOrder(input: UpdateProductionOrderDbInput): ProductionOrderEntity;
    getProductionOrderById(companyId: string, branchId: string, orderId: string): ProductionOrderEntity | null;
    listProductionOrderComponents(orderId: string): ProductionOrderComponentEntity[];
    listProductionOrderOperations(orderId: string): ProductionOrderOperationEntity[];
    saveProductionOrderStatus(input: SaveProductionOrderStatusInput): void;
    updateProductionOrderProgress(input: UpdateProductionOrderProgressInput): void;
    updateProductionOrderComponentProgress(orderId: string, componentLineId: string, deltaIssued: number, deltaReturned: number, updatedAt: string): void;

    createProductionIssue(input: CreateProductionIssueDbInput): ProductionIssueEntity;
    getProductionIssueById(companyId: string, branchId: string, issueId: string): ProductionIssueEntity | null;
    saveProductionIssuePostingState(input: SaveProductionIssuePostingStateInput): void;
    saveProductionIssueReversalState(input: SaveProductionIssueReversalStateInput): void;
    listProductionIssueLines(issueId: string): ProductionIssueEntity['lines'];
    listPostedActiveIssuesByOrder(orderId: string): ProductionIssueHeaderEntity[];

    createProductionReceipt(input: CreateProductionReceiptDbInput): ProductionReceiptEntity;
    getProductionReceiptById(companyId: string, branchId: string, receiptId: string): ProductionReceiptEntity | null;
    saveProductionReceiptPostingState(input: SaveProductionReceiptPostingStateInput): void;
    saveProductionReceiptReversalState(input: SaveProductionReceiptReversalStateInput): void;
    listProductionReceiptLines(receiptId: string): ProductionReceiptEntity['lines'];
    listPostedActiveReceiptsByOrder(orderId: string): ProductionReceiptHeaderEntity[];

    hasStockLedgerPosting(companyId: string, docType: string, docId: string, isReversal: boolean): boolean;
    listStockLedgerEntries(companyId: string, docType: string, docId: string, isReversal: boolean): ManufacturingStockLedgerEntryRecord[];
    insertStockLedgerEntries(entries: ManufacturingStockLedgerEntryRecord[]): void;

    getPolicy(companyId: string): ManufacturingPolicy;
}
