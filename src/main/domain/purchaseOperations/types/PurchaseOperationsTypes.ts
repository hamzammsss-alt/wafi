export type PurchaseOperationDocumentType =
    | 'PURCHASE_REQUEST'
    | 'PURCHASE_RFQ'
    | 'PURCHASE_ORDER'
    | 'GOODS_RECEIPT_NOTE'
    | 'PURCHASE_RETURN';

export type PurchaseOperationLineType = 'INVENTORY' | 'EXPENSE' | 'SERVICE';

export type PurchaseOperationStatus =
    | 'DRAFT'
    | 'CONFIRMED'
    | 'POSTED'
    | 'PARTIAL'
    | 'COMPLETED'
    | 'CANCELLED';

export type PurchaseOrderFulfillmentStatus = 'OPEN' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseOperationHeaderEntity {
    id: string;
    companyId: string;
    branchId: string;
    docType: PurchaseOperationDocumentType;
    docNo: string;
    docDate: string;
    status: PurchaseOperationStatus;
    vendorId: string | null;
    warehouseId: string | null;
    currencyCode: string;
    currencyRate: number;
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    vatAmount: number;
    totalAmount: number;
    referenceNo: string | null;
    remarks: string | null;
    sourceDocType: PurchaseOperationDocumentType | null;
    sourceDocId: string | null;
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

export interface PurchaseOperationLineEntity {
    id: string;
    documentId: string;
    lineNo: number;
    itemId: string | null;
    lineType: PurchaseOperationLineType;
    warehouseId: string | null;
    qty: number;
    receivedQty: number;
    returnedQty: number;
    billedQty: number;
    reservedQty: number;
    unitPrice: number;
    discountAmount: number;
    lineSubtotal: number;
    taxableAmount: number;
    vatAmount: number;
    lineTotal: number;
    unitCost: number | null;
    expenseTypeId: string | null;
    vehicleId: string | null;
    projectId: string | null;
    costCenterId: string | null;
    partnerId: string | null;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PurchaseOperationLineLinkEntity {
    id: string;
    companyId: string;
    branchId: string;
    sourceDocType: PurchaseOperationDocumentType;
    sourceDocId: string;
    sourceLineId: string;
    targetDocType: PurchaseOperationDocumentType;
    targetDocId: string;
    targetLineId: string;
    qty: number;
    createdAt: string;
}

export interface PurchaseCommitmentEntity {
    id: string;
    companyId: string;
    branchId: string;
    purchaseOrderId: string;
    purchaseOrderLineId: string;
    itemId: string;
    warehouseId: string;
    expectedQty: number;
    createdAt: string;
}

export interface PurchaseOperationDocumentEntity {
    header: PurchaseOperationHeaderEntity;
    lines: PurchaseOperationLineEntity[];
}

export interface PurchaseOperationLineInput {
    id?: string;
    itemId?: string | null;
    lineType?: PurchaseOperationLineType | null;
    warehouseId?: string | null;
    qty: number;
    unitPrice: number;
    discountAmount?: number | null;
    lineSubtotal?: number | null;
    taxableAmount?: number | null;
    vatAmount?: number | null;
    lineTotal?: number | null;
    unitCost?: number | null;
    expenseTypeId?: string | null;
    vehicleId?: string | null;
    projectId?: string | null;
    costCenterId?: string | null;
    partnerId?: string | null;
    remarks?: string | null;
}

export interface CreatePurchaseOperationDocumentInput {
    docDate: string;
    vendorId?: string | null;
    warehouseId?: string | null;
    currencyCode?: string | null;
    currencyRate?: number | null;
    subtotal?: number | null;
    discountAmount?: number | null;
    taxableAmount?: number | null;
    vatAmount?: number | null;
    totalAmount?: number | null;
    referenceNo?: string | null;
    remarks?: string | null;
    sourceDocType?: PurchaseOperationDocumentType | null;
    sourceDocId?: string | null;
    createdBy: string;
    approvedBy?: string | null;
    lines: PurchaseOperationLineInput[];
}

export interface UpdatePurchaseOperationDocumentInput {
    id: string;
    docDate: string;
    vendorId?: string | null;
    warehouseId?: string | null;
    currencyCode?: string | null;
    currencyRate?: number | null;
    subtotal?: number | null;
    discountAmount?: number | null;
    taxableAmount?: number | null;
    vatAmount?: number | null;
    totalAmount?: number | null;
    referenceNo?: string | null;
    remarks?: string | null;
    approvedBy?: string | null;
    lines: PurchaseOperationLineInput[];
}

export interface ConvertLineSelectionInput {
    sourceLineId: string;
    qty: number;
}

export interface ConvertRequestToRfqInput {
    requestId: string;
}

export interface ConvertRequestToOrderInput {
    requestId: string;
}

export interface ConvertRfqToOrderInput {
    rfqId: string;
}

export interface ConvertOrderToReceiptInput {
    orderId: string;
    selectedLines?: ConvertLineSelectionInput[];
}

export interface ConvertReceiptToReturnInput {
    receiptId: string;
    selectedLines?: ConvertLineSelectionInput[];
}

export interface PostGoodsReceiptNoteInput {
    documentId: string;
}

export interface CancelGoodsReceiptNoteInput {
    documentId: string;
    reverseDate: string;
    reason?: string | null;
}

export interface PostPurchaseReturnInput {
    documentId: string;
}

export interface CancelPurchaseReturnInput {
    documentId: string;
    reverseDate: string;
    reason?: string | null;
}

export interface PurchaseLineRemainingDto {
    lineId: string;
    itemId: string | null;
    lineType: PurchaseOperationLineType;
    qty: number;
    receivedQty: number;
    returnedQty: number;
    billedQty: number;
    reservedQty: number;
    remainingQty: number;
    lineStatus: PurchaseOrderFulfillmentStatus;
}

export interface PurchaseOrderFulfillmentSummary {
    orderId: string;
    orderNo: string;
    status: PurchaseOrderFulfillmentStatus;
    totalQty: number;
    receivedQty: number;
    returnedQty: number;
    billedQty: number;
    reservedQty: number;
    remainingQty: number;
    lines: PurchaseLineRemainingDto[];
}

export interface PurchaseInvoicePreparationLineDto {
    sourceLineId: string;
    lineType: PurchaseOperationLineType;
    itemId: string | null;
    warehouseId: string | null;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    taxableAmount: number;
    vatAmount: number;
    lineTotal: number;
    unitCost: number | null;
    expenseTypeId: string | null;
    vehicleId: string | null;
    projectId: string | null;
    costCenterId: string | null;
}

export interface PurchaseInvoicePreparationDto {
    sourceDocType: PurchaseOperationDocumentType;
    sourceDocId: string;
    sourceDocNo: string;
    vendorId: string | null;
    currencyCode: string;
    currencyRate: number;
    warehouseId: string | null;
    lines: PurchaseInvoicePreparationLineDto[];
}

export interface PurchaseOperationalPostingStatus {
    documentId: string;
    docType: PurchaseOperationDocumentType;
    docNo: string;
    documentStatus: PurchaseOperationStatus;
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

export interface PurchaseOperationPolicy {
    receiptAccountingMode: 'RECEIPT' | 'INVOICE';
    returnFinancialImpactEnabled: boolean;
    allowOverReceipt: boolean;
    allowOverReturn: boolean;
}
