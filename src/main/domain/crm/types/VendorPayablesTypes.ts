export type VendorStatus = 'ACTIVE' | 'ON_HOLD' | 'INACTIVE';
export type VendorRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type VendorAddressType = 'BILLING' | 'SHIPPING' | 'OTHER';
export type VendorFollowUpType = 'CALL' | 'EMAIL' | 'VISIT' | 'REMINDER' | 'COMMITMENT' | 'DISPUTE';
export type VendorFollowUpStatus = 'OPEN' | 'DONE' | 'CANCELLED';

export interface VendorEntity {
    id: string;
    companyId: string;
    code: string;
    name: string;
    nameAr: string | null;
    taxNo: string | null;
    registrationNo: string | null;
    phone: string | null;
    email: string | null;
    mobile: string | null;
    status: VendorStatus;
    currencyCode: string | null;
    paymentTermsId: string | null;
    payableAccountId: string | null;
    priceListId: string | null;
    buyerId: string | null;
    territoryId: string | null;
    paymentHold: boolean;
    isActive: boolean;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VendorContactEntity {
    id: string;
    vendorId: string;
    fullName: string;
    jobTitle: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    isPrimary: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VendorAddressEntity {
    id: string;
    vendorId: string;
    addressType: VendorAddressType;
    label: string | null;
    countryCode: string | null;
    city: string | null;
    region: string | null;
    street: string | null;
    postalCode: string | null;
    isPrimary: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VendorPaymentProfileEntity {
    id: string;
    vendorId: string;
    paymentLimit: number;
    overdueLimit: number;
    maxBillAgeDays: number | null;
    riskLevel: VendorRiskLevel;
    requiresApprovalOnHold: boolean;
    autoHoldOnOverdue: boolean;
    autoHoldOnPaymentLimit: boolean;
    holdReason: string | null;
    lastReviewDate: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VendorPriceProfileEntity {
    id: string;
    vendorId: string;
    priceListId: string;
    discountPercent: number;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VendorFollowUpEntity {
    id: string;
    companyId: string;
    vendorId: string;
    followUpDate: string;
    followUpType: VendorFollowUpType;
    status: VendorFollowUpStatus;
    assignedTo: string | null;
    subject: string | null;
    noteText: string | null;
    expectedPaymentAmount: number | null;
    expectedPaymentDate: string | null;
    relatedSourceType: string | null;
    relatedSourceId: string | null;
    createdAt: string;
    updatedAt: string;
}

export type VendorAgingBucket = 'CURRENT' | '1_30' | '31_60' | '61_90' | '91_120' | 'OVER_120';

export interface VendorAgingDocument {
    sourceType: string;
    sourceId: string;
    sourceNo: string;
    docDate: string;
    dueDate: string;
    amount: number;
    bucket: VendorAgingBucket;
    daysPastDue: number;
}

export interface VendorAgingSummary {
    vendorId: string;
    asOfDate: string;
    currencyCode: string | null;
    total: number;
    buckets: Record<VendorAgingBucket, number>;
    documents: VendorAgingDocument[];
}

export interface VendorExposureSummary {
    vendorId: string;
    asOfDate: string;
    openPayableBalance: number;
    openInvoiceAmount: number;
    openOrderAmount: number;
    issuedUnclearedChequeAmount: number;
    exposureAmount: number;
    overdueAmount: number;
    oldestDueDays: number;
    availablePaymentCapacity: number;
}

export interface VendorPaymentControlResult {
    vendorId: string;
    asOfDate: string;
    isOnHold: boolean;
    holdReasons: string[];
    riskLevel: VendorRiskLevel;
    paymentLimit: number;
    exposureAmount: number;
    overdueAmount: number;
    oldestDueDays: number;
    availablePaymentCapacity: number;
    requiresApprovalOnHold: boolean;
}

export interface VendorStatementRow {
    id: string;
    vendorId: string;
    eventDate: string;
    dueDate: string | null;
    sourceType: string;
    sourceId: string;
    sourceNo: string | null;
    referenceNo: string | null;
    description: string | null;
    rowType: 'INVOICE' | 'PAYMENT' | 'CHEQUE_PAYMENT' | 'ADJUSTMENT';
    debit: number;
    credit: number;
    runningBalance: number;
    branchId: string | null;
    journalId: string;
}

export interface VendorStatementResult {
    vendorId: string;
    fromDate: string | null;
    toDate: string | null;
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
    rows: VendorStatementRow[];
}

export interface VendorTimelineEvent {
    id: string;
    vendorId: string;
    eventDate: string;
    eventType: string;
    sourceType: string;
    sourceId: string;
    sourceNo: string | null;
    title: string;
    details: string | null;
    status: string | null;
    amount: number | null;
    createdBy: string | null;
}

export interface CreateVendorInput {
    code: string;
    name: string;
    nameAr?: string | null;
    taxNo?: string | null;
    registrationNo?: string | null;
    phone?: string | null;
    email?: string | null;
    mobile?: string | null;
    status?: VendorStatus | null;
    currencyCode?: string | null;
    paymentTermsId?: string | null;
    payableAccountId?: string | null;
    priceListId?: string | null;
    buyerId?: string | null;
    territoryId?: string | null;
    paymentHold?: boolean | null;
    isActive?: boolean | null;
    remarks?: string | null;
}

export interface UpdateVendorInput {
    id: string;
    code: string;
    name: string;
    nameAr?: string | null;
    taxNo?: string | null;
    registrationNo?: string | null;
    phone?: string | null;
    email?: string | null;
    mobile?: string | null;
    status?: VendorStatus | null;
    currencyCode?: string | null;
    paymentTermsId?: string | null;
    payableAccountId?: string | null;
    priceListId?: string | null;
    buyerId?: string | null;
    territoryId?: string | null;
    paymentHold?: boolean | null;
    isActive?: boolean | null;
    remarks?: string | null;
}

export interface ListVendorsInput {
    search?: string | null;
    isActive?: boolean | null;
    status?: VendorStatus | null;
    limit?: number | null;
    offset?: number | null;
}

export interface SetVendorActiveInput {
    id: string;
    isActive: boolean;
}

export interface SaveVendorContactInput {
    id?: string;
    vendorId: string;
    fullName: string;
    jobTitle?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    isPrimary?: boolean | null;
    notes?: string | null;
}

export interface SaveVendorAddressInput {
    id?: string;
    vendorId: string;
    addressType: VendorAddressType;
    label?: string | null;
    countryCode?: string | null;
    city?: string | null;
    region?: string | null;
    street?: string | null;
    postalCode?: string | null;
    isPrimary?: boolean | null;
    notes?: string | null;
}

export interface SaveVendorPaymentProfileInput {
    vendorId: string;
    paymentLimit: number;
    overdueLimit: number;
    maxBillAgeDays?: number | null;
    riskLevel?: VendorRiskLevel | null;
    requiresApprovalOnHold?: boolean | null;
    autoHoldOnOverdue?: boolean | null;
    autoHoldOnPaymentLimit?: boolean | null;
    holdReason?: string | null;
    lastReviewDate?: string | null;
}

export interface EvaluateVendorPaymentControlInput {
    vendorId: string;
    asOfDate?: string | null;
}

export interface PlaceVendorHoldInput {
    vendorId: string;
    reason: string;
    manual?: boolean | null;
}

export interface ReleaseVendorHoldInput {
    vendorId: string;
    reason: string;
    manual?: boolean | null;
}

export interface VendorStatementQueryInput {
    vendorId: string;
    fromDate?: string | null;
    toDate?: string | null;
    includeOpenOnly?: boolean | null;
    includeDetails?: boolean | null;
    branchId?: string | null;
}

export interface VendorAgingQueryInput {
    vendorId: string;
    asOfDate?: string | null;
    includeDetails?: boolean | null;
    branchId?: string | null;
}

export interface VendorTimelineQueryInput {
    vendorId: string;
    fromDate?: string | null;
    toDate?: string | null;
    limit?: number | null;
}

export interface CreateVendorFollowUpInput {
    vendorId: string;
    followUpDate: string;
    followUpType: VendorFollowUpType;
    assignedTo?: string | null;
    subject?: string | null;
    noteText?: string | null;
    expectedPaymentAmount?: number | null;
    expectedPaymentDate?: string | null;
    relatedSourceType?: string | null;
    relatedSourceId?: string | null;
}

export interface UpdateVendorFollowUpInput {
    id: string;
    followUpDate: string;
    followUpType: VendorFollowUpType;
    assignedTo?: string | null;
    subject?: string | null;
    noteText?: string | null;
    expectedPaymentAmount?: number | null;
    expectedPaymentDate?: string | null;
    relatedSourceType?: string | null;
    relatedSourceId?: string | null;
}

export interface MarkVendorFollowUpDoneInput {
    id: string;
    noteText?: string | null;
}

export interface CancelVendorFollowUpInput {
    id: string;
    reason: string;
}
