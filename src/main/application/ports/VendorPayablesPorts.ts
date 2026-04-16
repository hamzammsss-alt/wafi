import {
    VendorAddressEntity,
    VendorAddressType,
    VendorContactEntity,
    VendorEntity,
    VendorFollowUpEntity,
    VendorFollowUpStatus,
    VendorFollowUpType,
    VendorPaymentProfileEntity,
    VendorPriceProfileEntity,
    VendorRiskLevel,
    VendorStatus,
    VendorTimelineEvent,
} from '../../domain/crm/types/VendorPayablesTypes';

export interface VendorPayablesPolicy {
    includeOpenOrdersInExposure: boolean;
    includeIssuedUnclearedChequesInExposure: boolean;
}

export interface VendorListFilters {
    search: string | null;
    isActive: boolean | null;
    status: VendorStatus | null;
    limit: number;
    offset: number;
}

export interface CreateVendorDbInput {
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

export interface UpdateVendorDbInput {
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
    updatedAt: string;
}

export interface SaveVendorContactDbInput {
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

export interface SaveVendorAddressDbInput {
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

export interface SaveVendorPaymentProfileDbInput {
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

export interface SaveVendorPriceProfileDbInput {
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

export interface CreateVendorFollowUpDbInput {
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

export interface UpdateVendorFollowUpDbInput {
    id: string;
    companyId: string;
    vendorId: string;
    followUpDate: string;
    followUpType: VendorFollowUpType;
    assignedTo: string | null;
    subject: string | null;
    noteText: string | null;
    expectedPaymentAmount: number | null;
    expectedPaymentDate: string | null;
    relatedSourceType: string | null;
    relatedSourceId: string | null;
    updatedAt: string;
}

export interface SetVendorFollowUpStatusDbInput {
    id: string;
    companyId: string;
    vendorId: string;
    status: VendorFollowUpStatus;
    noteText: string | null;
    updatedAt: string;
}

export interface SaveVendorHoldLogDbInput {
    id: string;
    companyId: string;
    vendorId: string;
    actionType: 'PLACE_HOLD' | 'RELEASE_HOLD';
    reason: string;
    manual: boolean;
    createdBy: string;
    createdAt: string;
}

export interface VendorOpenInvoiceRecord {
    sourceType: string;
    sourceId: string;
    sourceNo: string;
    docDate: string;
    dueDate: string;
    paymentStatus: string;
    amount: number;
}

export interface VendorChequeExposureRecord {
    issuedUnclearedAmount: number;
}

export interface VendorStatementRowRecord {
    id: string;
    vendorId: string;
    eventDate: string;
    dueDate: string | null;
    sourceType: string;
    sourceId: string;
    sourceNo: string | null;
    referenceNo: string | null;
    description: string | null;
    debit: number;
    credit: number;
    branchId: string | null;
    journalId: string;
    lineNo: number;
}

export interface VendorStatementQuery {
    companyId: string;
    vendorId: string;
    fromDate: string | null;
    toDate: string | null;
    includeOpenOnly: boolean;
    branchId: string | null;
}

export interface VendorTimelineQuery {
    companyId: string;
    vendorId: string;
    fromDate: string | null;
    toDate: string | null;
    limit: number;
}

export interface VendorPayablesRepositoryPort {
    ensureSchema(): void;
    nextIdentity(): string;
    runInTransaction<T>(work: () => T): T;

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string;

    createVendor(input: CreateVendorDbInput): VendorEntity;
    updateVendor(input: UpdateVendorDbInput): VendorEntity;
    getVendorById(companyId: string, vendorId: string): VendorEntity | null;
    getVendorByCode(companyId: string, code: string): VendorEntity | null;
    listVendors(companyId: string, filters: VendorListFilters): VendorEntity[];
    setVendorActive(companyId: string, vendorId: string, isActive: boolean, updatedAt: string): VendorEntity | null;

    listVendorContacts(vendorId: string): VendorContactEntity[];
    saveVendorContact(input: SaveVendorContactDbInput): VendorContactEntity;

    listVendorAddresses(vendorId: string): VendorAddressEntity[];
    saveVendorAddress(input: SaveVendorAddressDbInput): VendorAddressEntity;

    getVendorPaymentProfile(vendorId: string): VendorPaymentProfileEntity | null;
    saveVendorPaymentProfile(input: SaveVendorPaymentProfileDbInput): VendorPaymentProfileEntity;

    listVendorPriceProfiles(vendorId: string): VendorPriceProfileEntity[];
    saveVendorPriceProfile(input: SaveVendorPriceProfileDbInput): VendorPriceProfileEntity;

    createVendorFollowUp(input: CreateVendorFollowUpDbInput): VendorFollowUpEntity;
    updateVendorFollowUp(input: UpdateVendorFollowUpDbInput): VendorFollowUpEntity;
    getVendorFollowUpById(companyId: string, followUpId: string): VendorFollowUpEntity | null;
    listVendorFollowUps(companyId: string, vendorId: string, includeClosed: boolean): VendorFollowUpEntity[];
    setVendorFollowUpStatus(input: SetVendorFollowUpStatusDbInput): VendorFollowUpEntity;

    saveVendorHoldLog(input: SaveVendorHoldLogDbInput): void;

    getPayableJournalBalance(companyId: string, vendorId: string, asOfDate: string, branchId: string | null): number;
    listOpenPurchaseInvoices(companyId: string, vendorId: string, asOfDate: string, branchId: string | null): VendorOpenInvoiceRecord[];
    sumOpenPurchaseOrders(companyId: string, vendorId: string, asOfDate: string, branchId: string | null): number;
    getIssuedChequeExposure(companyId: string, vendorId: string, asOfDate: string, branchId: string | null): VendorChequeExposureRecord;

    listStatementRows(query: VendorStatementQuery): VendorStatementRowRecord[];
    listTimelineRows(query: VendorTimelineQuery): VendorTimelineEvent[];

    getPolicy(companyId: string): VendorPayablesPolicy;
}
