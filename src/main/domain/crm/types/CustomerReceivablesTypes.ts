export type CustomerStatus = 'ACTIVE' | 'ON_HOLD' | 'INACTIVE';
export type CustomerRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type CustomerAddressType = 'BILLING' | 'SHIPPING' | 'OTHER';
export type CustomerFollowUpType = 'CALL' | 'EMAIL' | 'VISIT' | 'PROMISE' | 'REMINDER';
export type CustomerFollowUpStatus = 'OPEN' | 'DONE' | 'CANCELLED';

export interface CustomerEntity {
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
    status: CustomerStatus;
    currencyCode: string | null;
    paymentTermsId: string | null;
    receivableAccountId: string | null;
    priceListId: string | null;
    salesPersonId: string | null;
    territoryId: string | null;
    creditHold: boolean;
    isActive: boolean;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerContactEntity {
    id: string;
    customerId: string;
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

export interface CustomerAddressEntity {
    id: string;
    customerId: string;
    addressType: CustomerAddressType;
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

export interface CustomerCreditProfileEntity {
    id: string;
    customerId: string;
    creditLimit: number;
    overdueLimit: number;
    maxInvoiceAgeDays: number | null;
    riskLevel: CustomerRiskLevel;
    requiresApprovalOnHold: boolean;
    autoHoldOnOverdue: boolean;
    autoHoldOnCreditLimit: boolean;
    holdReason: string | null;
    lastReviewDate: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerPriceProfileEntity {
    id: string;
    customerId: string;
    priceListId: string;
    discountPercent: number;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerFollowUpEntity {
    id: string;
    companyId: string;
    customerId: string;
    followUpDate: string;
    followUpType: CustomerFollowUpType;
    status: CustomerFollowUpStatus;
    assignedTo: string | null;
    subject: string | null;
    noteText: string | null;
    promiseAmount: number | null;
    promiseDate: string | null;
    relatedSourceType: string | null;
    relatedSourceId: string | null;
    createdAt: string;
    updatedAt: string;
}

export type CustomerAgingBucket = 'CURRENT' | '1_30' | '31_60' | '61_90' | '91_120' | 'OVER_120';

export interface CustomerAgingDocument {
    sourceType: string;
    sourceId: string;
    sourceNo: string;
    docDate: string;
    dueDate: string;
    amount: number;
    bucket: CustomerAgingBucket;
    daysPastDue: number;
}

export interface CustomerAgingSummary {
    customerId: string;
    asOfDate: string;
    currencyCode: string | null;
    total: number;
    buckets: Record<CustomerAgingBucket, number>;
    documents: CustomerAgingDocument[];
}

export interface CustomerExposureSummary {
    customerId: string;
    asOfDate: string;
    openReceivableBalance: number;
    openInvoiceAmount: number;
    openOrderAmount: number;
    undepositedChequeAmount: number;
    returnedChequeAmount: number;
    exposureAmount: number;
    overdueAmount: number;
    oldestDueDays: number;
    availableCredit: number;
}

export interface CustomerCreditEvaluationResult {
    customerId: string;
    asOfDate: string;
    isOnHold: boolean;
    holdReasons: string[];
    riskLevel: CustomerRiskLevel;
    creditLimit: number;
    exposureAmount: number;
    overdueAmount: number;
    oldestDueDays: number;
    availableCredit: number;
    requiresApprovalOnHold: boolean;
}

export interface CustomerStatementRow {
    id: string;
    customerId: string;
    eventDate: string;
    dueDate: string | null;
    sourceType: string;
    sourceId: string;
    sourceNo: string | null;
    referenceNo: string | null;
    description: string | null;
    rowType: 'INVOICE' | 'RECEIPT' | 'CHEQUE_RECEIPT' | 'ADJUSTMENT';
    debit: number;
    credit: number;
    runningBalance: number;
    branchId: string | null;
    journalId: string;
}

export interface CustomerStatementResult {
    customerId: string;
    fromDate: string | null;
    toDate: string | null;
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
    rows: CustomerStatementRow[];
}

export interface CustomerTimelineEvent {
    id: string;
    customerId: string;
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

export interface CreateCustomerInput {
    code: string;
    name: string;
    nameAr?: string | null;
    taxNo?: string | null;
    registrationNo?: string | null;
    phone?: string | null;
    email?: string | null;
    mobile?: string | null;
    status?: CustomerStatus | null;
    currencyCode?: string | null;
    paymentTermsId?: string | null;
    receivableAccountId?: string | null;
    priceListId?: string | null;
    salesPersonId?: string | null;
    territoryId?: string | null;
    creditHold?: boolean | null;
    isActive?: boolean | null;
    remarks?: string | null;
}

export interface UpdateCustomerInput {
    id: string;
    code: string;
    name: string;
    nameAr?: string | null;
    taxNo?: string | null;
    registrationNo?: string | null;
    phone?: string | null;
    email?: string | null;
    mobile?: string | null;
    status?: CustomerStatus | null;
    currencyCode?: string | null;
    paymentTermsId?: string | null;
    receivableAccountId?: string | null;
    priceListId?: string | null;
    salesPersonId?: string | null;
    territoryId?: string | null;
    creditHold?: boolean | null;
    isActive?: boolean | null;
    remarks?: string | null;
}

export interface ListCustomersInput {
    search?: string | null;
    isActive?: boolean | null;
    status?: CustomerStatus | null;
    limit?: number | null;
    offset?: number | null;
}

export interface SetCustomerActiveInput {
    id: string;
    isActive: boolean;
}

export interface SaveCustomerContactInput {
    id?: string;
    customerId: string;
    fullName: string;
    jobTitle?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    isPrimary?: boolean | null;
    notes?: string | null;
}

export interface SaveCustomerAddressInput {
    id?: string;
    customerId: string;
    addressType: CustomerAddressType;
    label?: string | null;
    countryCode?: string | null;
    city?: string | null;
    region?: string | null;
    street?: string | null;
    postalCode?: string | null;
    isPrimary?: boolean | null;
    notes?: string | null;
}

export interface SaveCustomerCreditProfileInput {
    customerId: string;
    creditLimit: number;
    overdueLimit: number;
    maxInvoiceAgeDays?: number | null;
    riskLevel?: CustomerRiskLevel | null;
    requiresApprovalOnHold?: boolean | null;
    autoHoldOnOverdue?: boolean | null;
    autoHoldOnCreditLimit?: boolean | null;
    holdReason?: string | null;
    lastReviewDate?: string | null;
}

export interface SaveCustomerPriceProfileInput {
    id?: string;
    customerId: string;
    priceListId: string;
    discountPercent?: number | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    notes?: string | null;
}

export interface EvaluateCustomerCreditInput {
    customerId: string;
    asOfDate?: string | null;
}

export interface PlaceCustomerHoldInput {
    customerId: string;
    reason: string;
    manual?: boolean | null;
}

export interface ReleaseCustomerHoldInput {
    customerId: string;
    reason: string;
    manual?: boolean | null;
}

export interface CustomerStatementQueryInput {
    customerId: string;
    fromDate?: string | null;
    toDate?: string | null;
    includeOpenOnly?: boolean | null;
    includeDetails?: boolean | null;
    branchId?: string | null;
}

export interface CustomerAgingQueryInput {
    customerId: string;
    asOfDate?: string | null;
    includeDetails?: boolean | null;
    branchId?: string | null;
}

export interface CustomerTimelineQueryInput {
    customerId: string;
    fromDate?: string | null;
    toDate?: string | null;
    limit?: number | null;
}

export interface CreateCustomerFollowUpInput {
    customerId: string;
    followUpDate: string;
    followUpType: CustomerFollowUpType;
    assignedTo?: string | null;
    subject?: string | null;
    noteText?: string | null;
    promiseAmount?: number | null;
    promiseDate?: string | null;
    relatedSourceType?: string | null;
    relatedSourceId?: string | null;
}

export interface UpdateCustomerFollowUpInput {
    id: string;
    followUpDate: string;
    followUpType: CustomerFollowUpType;
    assignedTo?: string | null;
    subject?: string | null;
    noteText?: string | null;
    promiseAmount?: number | null;
    promiseDate?: string | null;
    relatedSourceType?: string | null;
    relatedSourceId?: string | null;
}

export interface MarkCustomerFollowUpDoneInput {
    id: string;
    noteText?: string | null;
}

export interface CancelCustomerFollowUpInput {
    id: string;
    reason: string;
}
