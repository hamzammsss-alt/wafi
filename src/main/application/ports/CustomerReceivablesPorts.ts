import {
    CustomerAddressEntity,
    CustomerAddressType,
    CustomerContactEntity,
    CustomerCreditProfileEntity,
    CustomerEntity,
    CustomerFollowUpEntity,
    CustomerFollowUpStatus,
    CustomerFollowUpType,
    CustomerPriceProfileEntity,
    CustomerRiskLevel,
    CustomerStatus,
    CustomerTimelineEvent,
} from '../../domain/crm/types/CustomerReceivablesTypes';

export interface CustomerReceivablesPolicy {
    includeOpenOrdersInExposure: boolean;
    includeUndepositedChequesInExposure: boolean;
    includeReturnedChequesInExposure: boolean;
}

export interface CustomerListFilters {
    search: string | null;
    isActive: boolean | null;
    status: CustomerStatus | null;
    limit: number;
    offset: number;
}

export interface CreateCustomerDbInput {
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

export interface UpdateCustomerDbInput {
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
    updatedAt: string;
}

export interface SaveCustomerContactDbInput {
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

export interface SaveCustomerAddressDbInput {
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

export interface SaveCustomerCreditProfileDbInput {
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

export interface SaveCustomerPriceProfileDbInput {
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

export interface CreateCustomerFollowUpDbInput {
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

export interface UpdateCustomerFollowUpDbInput {
    id: string;
    companyId: string;
    customerId: string;
    followUpDate: string;
    followUpType: CustomerFollowUpType;
    assignedTo: string | null;
    subject: string | null;
    noteText: string | null;
    promiseAmount: number | null;
    promiseDate: string | null;
    relatedSourceType: string | null;
    relatedSourceId: string | null;
    updatedAt: string;
}

export interface SetCustomerFollowUpStatusDbInput {
    id: string;
    companyId: string;
    customerId: string;
    status: CustomerFollowUpStatus;
    noteText: string | null;
    updatedAt: string;
}

export interface SaveCustomerHoldLogDbInput {
    id: string;
    companyId: string;
    customerId: string;
    actionType: 'PLACE_HOLD' | 'RELEASE_HOLD';
    reason: string;
    manual: boolean;
    createdBy: string;
    createdAt: string;
}

export interface CustomerOpenInvoiceRecord {
    sourceType: string;
    sourceId: string;
    sourceNo: string;
    docDate: string;
    dueDate: string;
    paymentStatus: string;
    amount: number;
}

export interface CustomerChequeExposureRecord {
    undepositedAmount: number;
    returnedAmount: number;
}

export interface CustomerStatementRowRecord {
    id: string;
    customerId: string;
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

export interface CustomerStatementQuery {
    companyId: string;
    customerId: string;
    fromDate: string | null;
    toDate: string | null;
    includeOpenOnly: boolean;
    branchId: string | null;
}

export interface CustomerTimelineQuery {
    companyId: string;
    customerId: string;
    fromDate: string | null;
    toDate: string | null;
    limit: number;
}

export interface CustomerReceivablesRepositoryPort {
    ensureSchema(): void;
    nextIdentity(): string;
    runInTransaction<T>(work: () => T): T;

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string;

    createCustomer(input: CreateCustomerDbInput): CustomerEntity;
    updateCustomer(input: UpdateCustomerDbInput): CustomerEntity;
    getCustomerById(companyId: string, customerId: string): CustomerEntity | null;
    getCustomerByCode(companyId: string, code: string): CustomerEntity | null;
    listCustomers(companyId: string, filters: CustomerListFilters): CustomerEntity[];
    setCustomerActive(companyId: string, customerId: string, isActive: boolean, updatedAt: string): CustomerEntity | null;

    listCustomerContacts(customerId: string): CustomerContactEntity[];
    saveCustomerContact(input: SaveCustomerContactDbInput): CustomerContactEntity;

    listCustomerAddresses(customerId: string): CustomerAddressEntity[];
    saveCustomerAddress(input: SaveCustomerAddressDbInput): CustomerAddressEntity;

    getCustomerCreditProfile(customerId: string): CustomerCreditProfileEntity | null;
    saveCustomerCreditProfile(input: SaveCustomerCreditProfileDbInput): CustomerCreditProfileEntity;

    listCustomerPriceProfiles(customerId: string): CustomerPriceProfileEntity[];
    saveCustomerPriceProfile(input: SaveCustomerPriceProfileDbInput): CustomerPriceProfileEntity;

    createCustomerFollowUp(input: CreateCustomerFollowUpDbInput): CustomerFollowUpEntity;
    updateCustomerFollowUp(input: UpdateCustomerFollowUpDbInput): CustomerFollowUpEntity;
    getCustomerFollowUpById(companyId: string, followUpId: string): CustomerFollowUpEntity | null;
    listCustomerFollowUps(companyId: string, customerId: string, includeClosed: boolean): CustomerFollowUpEntity[];
    setCustomerFollowUpStatus(input: SetCustomerFollowUpStatusDbInput): CustomerFollowUpEntity;

    saveCustomerHoldLog(input: SaveCustomerHoldLogDbInput): void;

    getReceivableJournalBalance(companyId: string, customerId: string, asOfDate: string, branchId: string | null): number;
    listOpenSalesInvoices(companyId: string, customerId: string, asOfDate: string, branchId: string | null): CustomerOpenInvoiceRecord[];
    sumOpenSalesOrders(companyId: string, customerId: string, asOfDate: string, branchId: string | null): number;
    getChequeExposure(companyId: string, customerId: string, asOfDate: string, branchId: string | null): CustomerChequeExposureRecord;

    listStatementRows(query: CustomerStatementQuery): CustomerStatementRowRecord[];
    listTimelineRows(query: CustomerTimelineQuery): CustomerTimelineEvent[];

    getPolicy(companyId: string): CustomerReceivablesPolicy;
}
