export type SalesOperationDocumentType =
    | 'SALES_QUOTATION'
    | 'SALES_ORDER'
    | 'DELIVERY_NOTE'
    | 'SALES_RETURN';

export type SalesOperationStatus =
    | 'DRAFT'
    | 'CONFIRMED'
    | 'POSTED'
    | 'PARTIAL'
    | 'COMPLETED'
    | 'CANCELLED';

export type SalesOrderFulfillmentStatus = 'OPEN' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';

export interface SalesOperationHeaderEntity {
    id: string;
    companyId: string;
    branchId: string;
    docType: SalesOperationDocumentType;
    docNo: string;
    docDate: string;
    status: SalesOperationStatus;
    customerId: string;
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
    sourceDocType: SalesOperationDocumentType | null;
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

export interface SalesOperationLineEntity {
    id: string;
    documentId: string;
    lineNo: number;
    itemId: string;
    warehouseId: string | null;
    qty: number;
    deliveredQty: number;
    returnedQty: number;
    invoicedQty: number;
    reservedQty: number;
    unitPrice: number;
    discountAmount: number;
    lineSubtotal: number;
    taxableAmount: number;
    vatAmount: number;
    lineTotal: number;
    unitCost: number | null;
    projectId: string | null;
    costCenterId: string | null;
    partnerId: string | null;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SalesOperationLineLinkEntity {
    id: string;
    companyId: string;
    branchId: string;
    sourceDocType: SalesOperationDocumentType;
    sourceDocId: string;
    sourceLineId: string;
    targetDocType: SalesOperationDocumentType;
    targetDocId: string;
    targetLineId: string;
    qty: number;
    createdAt: string;
}

export interface SalesReservationEntity {
    id: string;
    companyId: string;
    branchId: string;
    salesOrderId: string;
    salesOrderLineId: string;
    itemId: string;
    warehouseId: string;
    reservedQty: number;
    createdAt: string;
}

export interface SalesOperationDocumentEntity {
    header: SalesOperationHeaderEntity;
    lines: SalesOperationLineEntity[];
}

export interface SalesOperationLineInput {
    id?: string;
    itemId: string;
    warehouseId?: string | null;
    qty: number;
    unitPrice: number;
    discountAmount?: number | null;
    lineSubtotal?: number | null;
    taxableAmount?: number | null;
    vatAmount?: number | null;
    lineTotal?: number | null;
    unitCost?: number | null;
    projectId?: string | null;
    costCenterId?: string | null;
    partnerId?: string | null;
    remarks?: string | null;
}

export interface CreateSalesOperationDocumentInput {
    docDate: string;
    customerId: string;
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
    sourceDocType?: SalesOperationDocumentType | null;
    sourceDocId?: string | null;
    createdBy: string;
    approvedBy?: string | null;
    lines: SalesOperationLineInput[];
}

export interface UpdateSalesOperationDocumentInput {
    id: string;
    docDate: string;
    customerId: string;
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
    lines: SalesOperationLineInput[];
}

export interface ConvertLineSelectionInput {
    sourceLineId: string;
    qty: number;
}

export interface ConvertQuotationToOrderInput {
    quotationId: string;
}

export interface ConvertOrderToDeliveryInput {
    orderId: string;
    selectedLines?: ConvertLineSelectionInput[];
}

export interface ConvertDeliveryToReturnInput {
    deliveryId: string;
    selectedLines?: ConvertLineSelectionInput[];
}

export interface PostDeliveryNoteInput {
    documentId: string;
}

export interface CancelDeliveryNoteInput {
    documentId: string;
    reverseDate: string;
    reason?: string | null;
}

export interface PostSalesReturnInput {
    documentId: string;
}

export interface CancelSalesReturnInput {
    documentId: string;
    reverseDate: string;
    reason?: string | null;
}

export interface SalesLineRemainingDto {
    lineId: string;
    itemId: string;
    qty: number;
    reservedQty: number;
    deliveredQty: number;
    returnedQty: number;
    invoicedQty: number;
    remainingQty: number;
    lineStatus: SalesOrderFulfillmentStatus;
}

export interface SalesOrderFulfillmentSummary {
    orderId: string;
    orderNo: string;
    status: SalesOrderFulfillmentStatus;
    totalQty: number;
    deliveredQty: number;
    returnedQty: number;
    invoicedQty: number;
    reservedQty: number;
    remainingQty: number;
    lines: SalesLineRemainingDto[];
}

export interface SalesInvoicePreparationLineDto {
    sourceLineId: string;
    itemId: string;
    warehouseId: string | null;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    taxableAmount: number;
    vatAmount: number;
    lineTotal: number;
    projectId: string | null;
    costCenterId: string | null;
}

export interface SalesInvoicePreparationDto {
    sourceDocType: SalesOperationDocumentType;
    sourceDocId: string;
    sourceDocNo: string;
    customerId: string;
    currencyCode: string;
    currencyRate: number;
    warehouseId: string | null;
    lines: SalesInvoicePreparationLineDto[];
}

export interface SalesOperationalPostingStatus {
    documentId: string;
    docType: SalesOperationDocumentType;
    docNo: string;
    documentStatus: SalesOperationStatus;
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

export interface SalesOperationPolicy {
    cogsPostingMode: 'DELIVERY' | 'INVOICE';
    allowOverDelivery: boolean;
    allowOverReturn: boolean;
    returnCostReversalEnabled: boolean;
}
