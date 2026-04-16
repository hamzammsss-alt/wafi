export type ManufacturingIssueMethod = 'MANUAL' | 'BACKFLUSH';

export type ManufacturingBomStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type ManufacturingRoutingStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export type ProductionOrderStatus =
    | 'DRAFT'
    | 'RELEASED'
    | 'IN_PROGRESS'
    | 'PARTIAL'
    | 'COMPLETED'
    | 'CANCELLED';

export type ProductionTransactionStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface BomLineEntity {
    id: string;
    bomId: string;
    lineNo: number;
    componentItemId: string;
    warehouseId: string | null;
    qtyPer: number;
    scrapPercent: number;
    issueMethod: ManufacturingIssueMethod;
    remarks: string | null;
}

export interface BomHeaderEntity {
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
}

export interface BomEntity {
    header: BomHeaderEntity;
    lines: BomLineEntity[];
}

export interface RoutingStepEntity {
    id: string;
    routingId: string;
    stepNo: number;
    workCenterCode: string;
    operationCode: string;
    setupTimeMinutes: number;
    runTimeMinutes: number;
    laborCostRate: number;
    machineCostRate: number;
    remarks: string | null;
}

export interface RoutingHeaderEntity {
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
}

export interface RoutingEntity {
    header: RoutingHeaderEntity;
    steps: RoutingStepEntity[];
}

export interface ProductionOrderEntity {
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
}

export interface ProductionOrderComponentEntity {
    id: string;
    productionOrderId: string;
    lineNo: number;
    componentItemId: string;
    warehouseId: string | null;
    qtyRequired: number;
    qtyIssued: number;
    qtyReturned: number;
    issueMethod: ManufacturingIssueMethod;
    unitCost: number | null;
    totalCost: number | null;
    remarks: string | null;
}

export interface ProductionOrderOperationEntity {
    id: string;
    productionOrderId: string;
    stepNo: number;
    workCenterCode: string;
    operationCode: string;
    status: string;
    setupTimeMinutes: number;
    runTimeMinutes: number;
    laborCostRate: number;
    machineCostRate: number;
}

export interface ProductionOrderDocumentEntity {
    header: ProductionOrderEntity;
    components: ProductionOrderComponentEntity[];
    operations: ProductionOrderOperationEntity[];
}

export interface ProductionIssueLineEntity {
    id: string;
    issueId: string;
    lineNo: number;
    componentLineId: string | null;
    componentItemId: string;
    warehouseId: string;
    qty: number;
    unitCost: number;
    totalCost: number;
    remarks: string | null;
}

export interface ProductionIssueHeaderEntity {
    id: string;
    companyId: string;
    branchId: string;
    issueNo: string;
    issueDate: string;
    status: ProductionTransactionStatus;
    productionOrderId: string;
    referenceNo: string | null;
    remarks: string | null;
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

export interface ProductionIssueEntity {
    header: ProductionIssueHeaderEntity;
    lines: ProductionIssueLineEntity[];
}

export interface ProductionReceiptLineEntity {
    id: string;
    receiptId: string;
    lineNo: number;
    itemId: string;
    warehouseId: string;
    qtyReceived: number;
    qtyScrapped: number;
    unitCost: number;
    totalCost: number;
    remarks: string | null;
}

export interface ProductionReceiptHeaderEntity {
    id: string;
    companyId: string;
    branchId: string;
    receiptNo: string;
    receiptDate: string;
    status: ProductionTransactionStatus;
    productionOrderId: string;
    referenceNo: string | null;
    remarks: string | null;
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

export interface ProductionReceiptEntity {
    header: ProductionReceiptHeaderEntity;
    lines: ProductionReceiptLineEntity[];
}

export interface ProductionOrderComponentStatusSummary {
    componentLineId: string;
    lineNo: number;
    componentItemId: string;
    warehouseId: string | null;
    qtyRequired: number;
    qtyIssued: number;
    qtyReturned: number;
    remainingIssueQty: number;
    issueMethod: ManufacturingIssueMethod;
}

export interface ProductionOrderStatusSummary {
    orderId: string;
    orderNo: string;
    status: ProductionOrderStatus;
    qtyPlanned: number;
    qtyStarted: number;
    qtyIssued: number;
    qtyCompleted: number;
    qtyScrapped: number;
    remainingReceiptQty: number;
    components: ProductionOrderComponentStatusSummary[];
}

export interface ProductionOrderCostSummary {
    orderId: string;
    orderNo: string;
    materialCostIssued: number;
    laborCostEstimated: number;
    machineCostEstimated: number;
    costCapitalized: number;
    totalWipCost: number;
    qtyCompleted: number;
    unitCostCompleted: number;
}

export interface ManufacturingPostingStatus {
    documentId: string;
    documentNo: string;
    documentStatus: ProductionTransactionStatus;
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

export interface CreateBomInput {
    itemId: string;
    versionNo?: number | null;
    isDefault?: boolean | null;
    outputQty: number;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    remarks?: string | null;
    createdBy: string;
    lines: Array<{
        componentItemId: string;
        warehouseId?: string | null;
        qtyPer: number;
        scrapPercent?: number | null;
        issueMethod?: ManufacturingIssueMethod | null;
        remarks?: string | null;
    }>;
}

export interface UpdateBomInput {
    id: string;
    outputQty: number;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    remarks?: string | null;
    approvedBy?: string | null;
    lines: Array<{
        id?: string;
        componentItemId: string;
        warehouseId?: string | null;
        qtyPer: number;
        scrapPercent?: number | null;
        issueMethod?: ManufacturingIssueMethod | null;
        remarks?: string | null;
    }>;
}

export interface CreateRoutingInput {
    itemId: string;
    versionNo?: number | null;
    isDefault?: boolean | null;
    remarks?: string | null;
    createdBy: string;
    steps: Array<{
        workCenterCode: string;
        operationCode: string;
        setupTimeMinutes?: number | null;
        runTimeMinutes?: number | null;
        laborCostRate?: number | null;
        machineCostRate?: number | null;
        remarks?: string | null;
    }>;
}

export interface UpdateRoutingInput {
    id: string;
    remarks?: string | null;
    approvedBy?: string | null;
    steps: Array<{
        id?: string;
        workCenterCode: string;
        operationCode: string;
        setupTimeMinutes?: number | null;
        runTimeMinutes?: number | null;
        laborCostRate?: number | null;
        machineCostRate?: number | null;
        remarks?: string | null;
    }>;
}

export interface CreateProductionOrderInput {
    orderDate: string;
    itemId: string;
    bomId?: string | null;
    routingId?: string | null;
    warehouseId: string;
    qtyPlanned: number;
    referenceNo?: string | null;
    remarks?: string | null;
    projectId?: string | null;
    costCenterId?: string | null;
    createdBy: string;
    approvedBy?: string | null;
    sourceDocType?: string | null;
    sourceDocId?: string | null;
}

export interface CreateProductionOrderFromBomInput {
    orderDate: string;
    itemId: string;
    qtyPlanned: number;
    warehouseId: string;
    bomId?: string | null;
    routingId?: string | null;
    referenceNo?: string | null;
    remarks?: string | null;
    projectId?: string | null;
    costCenterId?: string | null;
    createdBy: string;
    approvedBy?: string | null;
    sourceDocType?: string | null;
    sourceDocId?: string | null;
}

export interface UpdateProductionOrderInput {
    id: string;
    orderDate: string;
    warehouseId: string;
    qtyPlanned: number;
    referenceNo?: string | null;
    remarks?: string | null;
    projectId?: string | null;
    costCenterId?: string | null;
    approvedBy?: string | null;
}

export interface CreateProductionIssueInput {
    productionOrderId: string;
    issueDate: string;
    referenceNo?: string | null;
    remarks?: string | null;
    createdBy: string;
    approvedBy?: string | null;
    lines: Array<{
        componentLineId?: string | null;
        componentItemId: string;
        warehouseId: string;
        qty: number;
        unitCost?: number | null;
        remarks?: string | null;
    }>;
}

export interface PostProductionIssueInput {
    issueId: string;
    allowOverIssue?: boolean | null;
}

export interface CancelProductionIssueInput {
    issueId: string;
    reverseDate: string;
    reason?: string | null;
}

export interface CreateProductionReceiptInput {
    productionOrderId: string;
    receiptDate: string;
    referenceNo?: string | null;
    remarks?: string | null;
    createdBy: string;
    approvedBy?: string | null;
    lines: Array<{
        itemId: string;
        warehouseId: string;
        qtyReceived: number;
        qtyScrapped?: number | null;
        unitCost?: number | null;
        remarks?: string | null;
    }>;
}

export interface PostProductionReceiptInput {
    receiptId: string;
    allowOverReceipt?: boolean | null;
}

export interface CancelProductionReceiptInput {
    receiptId: string;
    reverseDate: string;
    reason?: string | null;
}

export interface ProductionDocumentPostResult {
    documentId: string;
    documentNo: string;
    status: 'POSTED' | 'ALREADY_POSTED';
    sourceVersion: number;
    isStockPosted: boolean;
    isFinancialPosted: boolean;
    journalId: string | null;
    journalNo: string | null;
}

export interface ProductionDocumentCancelResult {
    documentId: string;
    documentNo: string;
    status: 'CANCELLED' | 'ALREADY_CANCELLED';
    isStockReversed: boolean;
    isFinancialReversed: boolean;
    reversalJournalId: string | null;
    reversalJournalNo: string | null;
}

export interface ManufacturingPolicy {
    issueAccountingEnabled: boolean;
    receiptAccountingEnabled: boolean;
    allowOverIssue: boolean;
    allowOverReceipt: boolean;
}
