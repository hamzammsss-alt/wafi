import { DomainError } from '../../domain/errors';
import {
    CancelCustomerFollowUpInput,
    CreateCustomerFollowUpInput,
    CreateCustomerInput,
    CustomerAgingBucket,
    CustomerAgingQueryInput,
    CustomerAgingSummary,
    CustomerAddressEntity,
    CustomerAddressType,
    CustomerContactEntity,
    CustomerCreditEvaluationResult,
    CustomerCreditProfileEntity,
    CustomerEntity,
    CustomerExposureSummary,
    CustomerFollowUpEntity,
    CustomerFollowUpType,
    CustomerRiskLevel,
    CustomerStatementQueryInput,
    CustomerStatementResult,
    CustomerStatus,
    CustomerTimelineEvent,
    CustomerTimelineQueryInput,
    EvaluateCustomerCreditInput,
    ListCustomersInput,
    MarkCustomerFollowUpDoneInput,
    PlaceCustomerHoldInput,
    ReleaseCustomerHoldInput,
    SaveCustomerAddressInput,
    SaveCustomerContactInput,
    SaveCustomerCreditProfileInput,
    SetCustomerActiveInput,
    UpdateCustomerFollowUpInput,
    UpdateCustomerInput,
} from '../../domain/crm/types/CustomerReceivablesTypes';
import {
    CreateCustomerDbInput,
    CustomerOpenInvoiceRecord,
    CustomerReceivablesRepositoryPort,
    SaveCustomerAddressDbInput,
    SaveCustomerContactDbInput,
    SaveCustomerCreditProfileDbInput,
} from '../ports/CustomerReceivablesPorts';

const EPSILON = 0.000001;

type CustomerReceivablesContext = {
    companyId: string;
    branchId: string;
    userId: string;
};

export class CustomerReceivablesService {
    constructor(private readonly repository: CustomerReceivablesRepositoryPort) {
        this.repository.ensureSchema();
    }

    createCustomer(context: CustomerReceivablesContext, input: CreateCustomerInput): CustomerEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const code = this.normalizeCode(input.code);
        const name = this.normalizeRequired(input.name, 'Customer name is required');
        this.assertEmail(input.email || null);
        this.assertPhone(input.phone || null, 'Phone format is invalid');
        this.assertPhone(input.mobile || null, 'Mobile format is invalid');

        const existingByCode = this.repository.getCustomerByCode(companyId, code);
        if (existingByCode) {
            throw new DomainError('VALIDATION_ERROR', 'Customer code already exists', {
                messageKey: 'validation.customer.code.unique',
                details: { code, companyId },
            });
        }

        const now = new Date().toISOString();
        const payload: CreateCustomerDbInput = {
            id: this.repository.nextIdentity(),
            companyId,
            code,
            name,
            nameAr: this.normalizeNullable(input.nameAr),
            taxNo: this.normalizeNullable(input.taxNo),
            registrationNo: this.normalizeNullable(input.registrationNo),
            phone: this.normalizeNullable(input.phone),
            email: this.normalizeNullable(input.email),
            mobile: this.normalizeNullable(input.mobile),
            status: this.normalizeCustomerStatus(input.status, 'ACTIVE'),
            currencyCode: this.normalizeCurrencyCode(input.currencyCode),
            paymentTermsId: this.normalizeNullable(input.paymentTermsId),
            receivableAccountId: this.normalizeNullable(input.receivableAccountId),
            priceListId: this.normalizeNullable(input.priceListId),
            salesPersonId: this.normalizeNullable(input.salesPersonId),
            territoryId: this.normalizeNullable(input.territoryId),
            creditHold: Boolean(input.creditHold),
            isActive: input.isActive !== false,
            remarks: this.normalizeNullable(input.remarks),
            createdAt: now,
            updatedAt: now,
        };

        return this.repository.createCustomer(payload);
    }

    updateCustomer(context: CustomerReceivablesContext, input: UpdateCustomerInput): CustomerEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.id, 'Customer id is required');
        const current = this.requireCustomer(companyId, customerId);

        const code = this.normalizeCode(input.code);
        const name = this.normalizeRequired(input.name, 'Customer name is required');
        this.assertEmail(input.email || null);
        this.assertPhone(input.phone || null, 'Phone format is invalid');
        this.assertPhone(input.mobile || null, 'Mobile format is invalid');

        const existingByCode = this.repository.getCustomerByCode(companyId, code);
        if (existingByCode && existingByCode.id !== customerId) {
            throw new DomainError('VALIDATION_ERROR', 'Customer code already exists', {
                messageKey: 'validation.customer.code.unique',
                details: { code, companyId },
            });
        }

        const nextStatus = this.normalizeCustomerStatus(input.status, current.status);
        const payload = {
            id: customerId,
            companyId,
            code,
            name,
            nameAr: this.normalizeNullable(input.nameAr),
            taxNo: this.normalizeNullable(input.taxNo),
            registrationNo: this.normalizeNullable(input.registrationNo),
            phone: this.normalizeNullable(input.phone),
            email: this.normalizeNullable(input.email),
            mobile: this.normalizeNullable(input.mobile),
            status: input.isActive === false ? 'INACTIVE' as CustomerStatus : nextStatus,
            currencyCode: this.normalizeCurrencyCode(input.currencyCode),
            paymentTermsId: this.normalizeNullable(input.paymentTermsId),
            receivableAccountId: this.normalizeNullable(input.receivableAccountId),
            priceListId: this.normalizeNullable(input.priceListId),
            salesPersonId: this.normalizeNullable(input.salesPersonId),
            territoryId: this.normalizeNullable(input.territoryId),
            creditHold: input.creditHold == null ? current.creditHold : Boolean(input.creditHold),
            isActive: input.isActive == null ? current.isActive : Boolean(input.isActive),
            remarks: this.normalizeNullable(input.remarks),
            updatedAt: new Date().toISOString(),
        };

        return this.repository.updateCustomer(payload);
    }

    getCustomerById(context: Pick<CustomerReceivablesContext, 'companyId'>, customerId: string): CustomerEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        return this.requireCustomer(companyId, this.normalizeRequired(customerId, 'Customer id is required'));
    }

    listCustomers(context: Pick<CustomerReceivablesContext, 'companyId'>, input: ListCustomersInput): CustomerEntity[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        return this.repository.listCustomers(companyId, {
            search: this.normalizeNullable(input.search),
            isActive: input.isActive == null ? null : Boolean(input.isActive),
            status: input.status ? this.normalizeCustomerStatus(input.status, 'ACTIVE') : null,
            limit: this.normalizeLimit(input.limit, 500),
            offset: this.normalizeOffset(input.offset),
        });
    }

    setCustomerActive(context: CustomerReceivablesContext, input: SetCustomerActiveInput): CustomerEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.id, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const updated = this.repository.setCustomerActive(
            companyId,
            customerId,
            Boolean(input.isActive),
            new Date().toISOString(),
        );

        if (!updated) {
            throw new DomainError('INTERNAL_ERROR', 'Customer active state update failed', {
                messageKey: 'error.customer.active_update_failed',
                details: { customerId },
            });
        }

        return updated;
    }

    getCustomerContacts(context: Pick<CustomerReceivablesContext, 'companyId'>, customerId: string): CustomerContactEntity[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedCustomerId = this.normalizeRequired(customerId, 'Customer id is required');
        this.requireCustomer(companyId, normalizedCustomerId);
        return this.repository.listCustomerContacts(normalizedCustomerId);
    }

    saveCustomerContact(context: CustomerReceivablesContext, input: SaveCustomerContactInput): CustomerContactEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const fullName = this.normalizeRequired(input.fullName, 'Contact full name is required');
        this.assertEmail(input.email || null);
        this.assertPhone(input.phone || null, 'Phone format is invalid');
        this.assertPhone(input.mobile || null, 'Mobile format is invalid');

        const now = new Date().toISOString();
        const payload: SaveCustomerContactDbInput = {
            id: this.normalizeNullable(input.id) || this.repository.nextIdentity(),
            customerId,
            fullName,
            jobTitle: this.normalizeNullable(input.jobTitle),
            phone: this.normalizeNullable(input.phone),
            mobile: this.normalizeNullable(input.mobile),
            email: this.normalizeNullable(input.email),
            isPrimary: Boolean(input.isPrimary),
            notes: this.normalizeNullable(input.notes),
            createdAt: now,
            updatedAt: now,
        };

        return this.repository.saveCustomerContact(payload);
    }

    getCustomerAddresses(context: Pick<CustomerReceivablesContext, 'companyId'>, customerId: string): CustomerAddressEntity[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedCustomerId = this.normalizeRequired(customerId, 'Customer id is required');
        this.requireCustomer(companyId, normalizedCustomerId);
        return this.repository.listCustomerAddresses(normalizedCustomerId);
    }

    saveCustomerAddress(context: CustomerReceivablesContext, input: SaveCustomerAddressInput): CustomerAddressEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const now = new Date().toISOString();
        const payload: SaveCustomerAddressDbInput = {
            id: this.normalizeNullable(input.id) || this.repository.nextIdentity(),
            customerId,
            addressType: this.normalizeAddressType(input.addressType),
            label: this.normalizeNullable(input.label),
            countryCode: this.normalizeNullable(input.countryCode),
            city: this.normalizeNullable(input.city),
            region: this.normalizeNullable(input.region),
            street: this.normalizeNullable(input.street),
            postalCode: this.normalizeNullable(input.postalCode),
            isPrimary: Boolean(input.isPrimary),
            notes: this.normalizeNullable(input.notes),
            createdAt: now,
            updatedAt: now,
        };

        return this.repository.saveCustomerAddress(payload);
    }

    getCustomerCreditProfile(context: Pick<CustomerReceivablesContext, 'companyId'>, customerId: string): CustomerCreditProfileEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedCustomerId = this.normalizeRequired(customerId, 'Customer id is required');
        this.requireCustomer(companyId, normalizedCustomerId);

        const profile = this.repository.getCustomerCreditProfile(normalizedCustomerId);
        if (profile) {
            return profile;
        }

        const now = new Date().toISOString();
        return this.repository.saveCustomerCreditProfile({
            id: this.repository.nextIdentity(),
            customerId: normalizedCustomerId,
            creditLimit: 0,
            overdueLimit: 0,
            maxInvoiceAgeDays: null,
            riskLevel: 'MEDIUM',
            requiresApprovalOnHold: true,
            autoHoldOnOverdue: true,
            autoHoldOnCreditLimit: true,
            holdReason: null,
            lastReviewDate: null,
            createdAt: now,
            updatedAt: now,
        });
    }

    saveCustomerCreditProfile(context: CustomerReceivablesContext, input: SaveCustomerCreditProfileInput): CustomerCreditProfileEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const creditLimit = this.normalizeNonNegative(input.creditLimit, 'Credit limit cannot be negative');
        const overdueLimit = this.normalizeNonNegative(input.overdueLimit, 'Overdue limit cannot be negative');

        if (input.maxInvoiceAgeDays != null && Number(input.maxInvoiceAgeDays) < 0) {
            throw new DomainError('VALIDATION_ERROR', 'Max invoice age days cannot be negative', {
                messageKey: 'validation.customer.credit.max_invoice_age_days.non_negative',
                details: { value: input.maxInvoiceAgeDays },
            });
        }

        const current = this.repository.getCustomerCreditProfile(customerId);
        const now = new Date().toISOString();
        const payload: SaveCustomerCreditProfileDbInput = {
            id: current?.id || this.repository.nextIdentity(),
            customerId,
            creditLimit,
            overdueLimit,
            maxInvoiceAgeDays: input.maxInvoiceAgeDays == null ? current?.maxInvoiceAgeDays || null : Number(input.maxInvoiceAgeDays),
            riskLevel: this.normalizeRiskLevel(input.riskLevel || current?.riskLevel || 'MEDIUM'),
            requiresApprovalOnHold: input.requiresApprovalOnHold == null
                ? (current?.requiresApprovalOnHold ?? true)
                : Boolean(input.requiresApprovalOnHold),
            autoHoldOnOverdue: input.autoHoldOnOverdue == null
                ? (current?.autoHoldOnOverdue ?? true)
                : Boolean(input.autoHoldOnOverdue),
            autoHoldOnCreditLimit: input.autoHoldOnCreditLimit == null
                ? (current?.autoHoldOnCreditLimit ?? true)
                : Boolean(input.autoHoldOnCreditLimit),
            holdReason: this.normalizeNullable(input.holdReason) ?? current?.holdReason ?? null,
            lastReviewDate: input.lastReviewDate == null
                ? current?.lastReviewDate || null
                : this.normalizeDateOrNull(input.lastReviewDate),
            createdAt: current?.createdAt || now,
            updatedAt: now,
        };

        return this.repository.saveCustomerCreditProfile(payload);
    }

    evaluateCustomerCredit(
        context: Pick<CustomerReceivablesContext, 'companyId' | 'branchId'>,
        input: EvaluateCustomerCreditInput,
    ): CustomerCreditEvaluationResult {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeNullable(context.branchId);
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');

        const customer = this.requireCustomer(companyId, customerId);
        if (!customer.isActive) {
            throw new DomainError('POLICY_VIOLATION', 'Inactive customer cannot pass credit policy evaluation', {
                messageKey: 'policy.customer.inactive',
                details: { customerId },
            });
        }

        const asOfDate = this.normalizeDate(input.asOfDate || new Date().toISOString().slice(0, 10), 'As of date is invalid');
        const profile = this.getCustomerCreditProfile({ companyId }, customerId);
        const exposure = this.buildExposureSummary(companyId, customerId, asOfDate, branchId, profile.creditLimit);

        const holdReasons: string[] = [];

        if (customer.creditHold) {
            holdReasons.push(profile.holdReason || 'MANUAL_HOLD');
        }

        if (profile.autoHoldOnCreditLimit && profile.creditLimit > 0 && exposure.exposureAmount > profile.creditLimit + EPSILON) {
            holdReasons.push('CREDIT_LIMIT_EXCEEDED');
        }

        if (profile.autoHoldOnOverdue && exposure.overdueAmount > profile.overdueLimit + EPSILON) {
            holdReasons.push('OVERDUE_LIMIT_EXCEEDED');
        }

        if (profile.maxInvoiceAgeDays != null && profile.maxInvoiceAgeDays >= 0 && exposure.oldestDueDays > profile.maxInvoiceAgeDays) {
            holdReasons.push('MAX_INVOICE_AGE_EXCEEDED');
        }

        if (customer.status === 'ON_HOLD') {
            holdReasons.push('STATUS_ON_HOLD');
        }

        return {
            customerId,
            asOfDate,
            isOnHold: holdReasons.length > 0,
            holdReasons: Array.from(new Set(holdReasons)),
            riskLevel: profile.riskLevel,
            creditLimit: profile.creditLimit,
            exposureAmount: exposure.exposureAmount,
            overdueAmount: exposure.overdueAmount,
            oldestDueDays: exposure.oldestDueDays,
            availableCredit: exposure.availableCredit,
            requiresApprovalOnHold: profile.requiresApprovalOnHold,
        };
    }

    placeCustomerOnHold(context: CustomerReceivablesContext, input: PlaceCustomerHoldInput): CustomerCreditEvaluationResult {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        const reason = this.normalizeRequired(input.reason, 'Hold reason is required');

        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            const customer = this.requireCustomer(companyId, customerId);
            const nextStatus: CustomerStatus = customer.isActive ? 'ON_HOLD' : 'INACTIVE';

            this.repository.updateCustomer({
                id: customer.id,
                companyId,
                code: customer.code,
                name: customer.name,
                nameAr: customer.nameAr,
                taxNo: customer.taxNo,
                registrationNo: customer.registrationNo,
                phone: customer.phone,
                email: customer.email,
                mobile: customer.mobile,
                status: nextStatus,
                currencyCode: customer.currencyCode,
                paymentTermsId: customer.paymentTermsId,
                receivableAccountId: customer.receivableAccountId,
                priceListId: customer.priceListId,
                salesPersonId: customer.salesPersonId,
                territoryId: customer.territoryId,
                creditHold: true,
                isActive: customer.isActive,
                remarks: customer.remarks,
                updatedAt: now,
            });

            const profile = this.repository.getCustomerCreditProfile(customer.id);
            this.repository.saveCustomerCreditProfile({
                id: profile?.id || this.repository.nextIdentity(),
                customerId: customer.id,
                creditLimit: profile?.creditLimit ?? 0,
                overdueLimit: profile?.overdueLimit ?? 0,
                maxInvoiceAgeDays: profile?.maxInvoiceAgeDays ?? null,
                riskLevel: profile?.riskLevel ?? 'MEDIUM',
                requiresApprovalOnHold: profile?.requiresApprovalOnHold ?? true,
                autoHoldOnOverdue: profile?.autoHoldOnOverdue ?? true,
                autoHoldOnCreditLimit: profile?.autoHoldOnCreditLimit ?? true,
                holdReason: reason,
                lastReviewDate: profile?.lastReviewDate ?? null,
                createdAt: profile?.createdAt || now,
                updatedAt: now,
            });

            this.repository.saveCustomerHoldLog({
                id: this.repository.nextIdentity(),
                companyId,
                customerId: customer.id,
                actionType: 'PLACE_HOLD',
                reason,
                manual: input.manual !== false,
                createdBy: this.normalizeRequired(context.userId, 'User id is required'),
                createdAt: now,
            });
        });

        return this.evaluateCustomerCredit(
            { companyId, branchId: context.branchId },
            { customerId, asOfDate: new Date().toISOString().slice(0, 10) },
        );
    }

    releaseCustomerHold(context: CustomerReceivablesContext, input: ReleaseCustomerHoldInput): CustomerCreditEvaluationResult {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        const reason = this.normalizeRequired(input.reason, 'Release reason is required');

        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            const customer = this.requireCustomer(companyId, customerId);
            const nextStatus: CustomerStatus = customer.isActive ? 'ACTIVE' : 'INACTIVE';

            this.repository.updateCustomer({
                id: customer.id,
                companyId,
                code: customer.code,
                name: customer.name,
                nameAr: customer.nameAr,
                taxNo: customer.taxNo,
                registrationNo: customer.registrationNo,
                phone: customer.phone,
                email: customer.email,
                mobile: customer.mobile,
                status: nextStatus,
                currencyCode: customer.currencyCode,
                paymentTermsId: customer.paymentTermsId,
                receivableAccountId: customer.receivableAccountId,
                priceListId: customer.priceListId,
                salesPersonId: customer.salesPersonId,
                territoryId: customer.territoryId,
                creditHold: false,
                isActive: customer.isActive,
                remarks: customer.remarks,
                updatedAt: now,
            });

            const profile = this.repository.getCustomerCreditProfile(customer.id);
            if (profile) {
                this.repository.saveCustomerCreditProfile({
                    id: profile.id,
                    customerId: customer.id,
                    creditLimit: profile.creditLimit,
                    overdueLimit: profile.overdueLimit,
                    maxInvoiceAgeDays: profile.maxInvoiceAgeDays,
                    riskLevel: profile.riskLevel,
                    requiresApprovalOnHold: profile.requiresApprovalOnHold,
                    autoHoldOnOverdue: profile.autoHoldOnOverdue,
                    autoHoldOnCreditLimit: profile.autoHoldOnCreditLimit,
                    holdReason: null,
                    lastReviewDate: profile.lastReviewDate,
                    createdAt: profile.createdAt,
                    updatedAt: now,
                });
            }

            this.repository.saveCustomerHoldLog({
                id: this.repository.nextIdentity(),
                companyId,
                customerId: customer.id,
                actionType: 'RELEASE_HOLD',
                reason,
                manual: input.manual !== false,
                createdBy: this.normalizeRequired(context.userId, 'User id is required'),
                createdAt: now,
            });
        });

        return this.evaluateCustomerCredit(
            { companyId, branchId: context.branchId },
            { customerId, asOfDate: new Date().toISOString().slice(0, 10) },
        );
    }

    getCustomerExposure(
        context: Pick<CustomerReceivablesContext, 'companyId' | 'branchId'>,
        input: EvaluateCustomerCreditInput,
    ): CustomerExposureSummary {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const asOfDate = this.normalizeDate(input.asOfDate || new Date().toISOString().slice(0, 10), 'As of date is invalid');
        const profile = this.getCustomerCreditProfile({ companyId }, customerId);
        return this.buildExposureSummary(
            companyId,
            customerId,
            asOfDate,
            this.normalizeNullable(context.branchId),
            profile.creditLimit,
        );
    }

    getCustomerStatement(
        context: Pick<CustomerReceivablesContext, 'companyId' | 'branchId'>,
        input: CustomerStatementQueryInput,
    ): CustomerStatementResult {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const fromDate = this.normalizeDateOrNull(input.fromDate);
        const toDate = this.normalizeDateOrNull(input.toDate);
        if (fromDate && toDate && fromDate > toDate) {
            throw new DomainError('VALIDATION_ERROR', 'From date cannot be after to date', {
                messageKey: 'validation.customer.statement.invalid_range',
                details: { fromDate, toDate },
            });
        }

        const branchId = this.normalizeNullable(input.branchId) || this.normalizeNullable(context.branchId);
        const openingBalance = fromDate
            ? this.repository.getReceivableJournalBalance(companyId, customerId, this.previousDate(fromDate), branchId)
            : 0;

        const sourceRows = this.repository.listStatementRows({
            companyId,
            customerId,
            fromDate,
            toDate,
            includeOpenOnly: Boolean(input.includeOpenOnly),
            branchId,
        });

        let running = this.round(openingBalance);
        let totalDebit = 0;
        let totalCredit = 0;
        const rows = sourceRows
            .sort((a, b) => {
                if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
                if (a.lineNo !== b.lineNo) return a.lineNo - b.lineNo;
                return a.id.localeCompare(b.id);
            })
            .map((row) => {
                const debit = this.round(row.debit);
                const credit = this.round(row.credit);
                totalDebit = this.round(totalDebit + debit);
                totalCredit = this.round(totalCredit + credit);
                running = this.round(running + debit - credit);

                const sourceType = String(row.sourceType || '').toUpperCase();
                const rowType: 'INVOICE' | 'RECEIPT' | 'CHEQUE_RECEIPT' | 'ADJUSTMENT' = sourceType === 'SALES_INVOICE'
                    ? 'INVOICE'
                    : sourceType === 'CHEQUE_RECEIPT'
                        ? 'CHEQUE_RECEIPT'
                        : sourceType.endsWith('RECEIPT')
                            ? 'RECEIPT'
                            : 'ADJUSTMENT';

                return {
                    id: row.id,
                    customerId: row.customerId,
                    eventDate: row.eventDate,
                    dueDate: row.dueDate,
                    sourceType: sourceType || 'ADJUSTMENT',
                    sourceId: row.sourceId,
                    sourceNo: row.sourceNo,
                    referenceNo: row.referenceNo,
                    description: row.description,
                    rowType,
                    debit,
                    credit,
                    runningBalance: running,
                    branchId: row.branchId,
                    journalId: row.journalId,
                };
            });

        return {
            customerId,
            fromDate,
            toDate,
            openingBalance: this.round(openingBalance),
            closingBalance: rows.length ? rows[rows.length - 1].runningBalance : this.round(openingBalance),
            totalDebit: this.round(totalDebit),
            totalCredit: this.round(totalCredit),
            rows,
        };
    }

    getCustomerAging(
        context: Pick<CustomerReceivablesContext, 'companyId' | 'branchId'>,
        input: CustomerAgingQueryInput,
    ): CustomerAgingSummary {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const asOfDate = this.normalizeDate(input.asOfDate || new Date().toISOString().slice(0, 10), 'As of date is invalid');
        const openInvoices = this.repository.listOpenSalesInvoices(
            companyId,
            customerId,
            asOfDate,
            this.normalizeNullable(input.branchId) || this.normalizeNullable(context.branchId),
        );

        const buckets: Record<CustomerAgingBucket, number> = {
            CURRENT: 0,
            '1_30': 0,
            '31_60': 0,
            '61_90': 0,
            '91_120': 0,
            OVER_120: 0,
        };

        const documents = openInvoices.map((row) => this.toAgingDocument(row, asOfDate));
        for (const row of documents) {
            buckets[row.bucket] = this.round(buckets[row.bucket] + row.amount);
        }

        return {
            customerId,
            asOfDate,
            currencyCode: null,
            total: this.round(documents.reduce((sum, row) => sum + row.amount, 0)),
            buckets,
            documents: input.includeDetails === false ? [] : documents,
        };
    }

    getCustomerTimeline(
        context: Pick<CustomerReceivablesContext, 'companyId'>,
        input: CustomerTimelineQueryInput,
    ): CustomerTimelineEvent[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const fromDate = this.normalizeDateOrNull(input.fromDate);
        const toDate = this.normalizeDateOrNull(input.toDate);
        if (fromDate && toDate && fromDate > toDate) {
            throw new DomainError('VALIDATION_ERROR', 'From date cannot be after to date', {
                messageKey: 'validation.customer.timeline.invalid_range',
                details: { fromDate, toDate },
            });
        }

        return this.repository.listTimelineRows({
            companyId,
            customerId,
            fromDate,
            toDate,
            limit: this.normalizeLimit(input.limit, 200),
        });
    }

    createCustomerFollowUp(context: CustomerReceivablesContext, input: CreateCustomerFollowUpInput): CustomerFollowUpEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.requireCustomer(companyId, customerId);

        const promiseAmount = input.promiseAmount == null ? null : this.normalizeNonNegative(input.promiseAmount, 'Promise amount cannot be negative');
        const now = new Date().toISOString();

        return this.repository.createCustomerFollowUp({
            id: this.repository.nextIdentity(),
            companyId,
            customerId,
            followUpDate: this.normalizeDate(input.followUpDate, 'Follow-up date is required'),
            followUpType: this.normalizeFollowUpType(input.followUpType),
            status: 'OPEN',
            assignedTo: this.normalizeNullable(input.assignedTo),
            subject: this.normalizeNullable(input.subject),
            noteText: this.normalizeNullable(input.noteText),
            promiseAmount,
            promiseDate: this.normalizeDateOrNull(input.promiseDate),
            relatedSourceType: this.normalizeNullable(input.relatedSourceType),
            relatedSourceId: this.normalizeNullable(input.relatedSourceId),
            createdAt: now,
            updatedAt: now,
        });
    }

    updateCustomerFollowUp(context: CustomerReceivablesContext, input: UpdateCustomerFollowUpInput): CustomerFollowUpEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const followUpId = this.normalizeRequired(input.id, 'Follow-up id is required');

        const current = this.requireFollowUp(companyId, followUpId);
        if (current.status !== 'OPEN') {
            throw new DomainError('INVALID_TRANSITION', 'Only open follow-up can be updated', {
                messageKey: 'validation.customer.follow_up.must_be_open',
                details: { followUpId, status: current.status },
            });
        }

        const promiseAmount = input.promiseAmount == null ? null : this.normalizeNonNegative(input.promiseAmount, 'Promise amount cannot be negative');

        return this.repository.updateCustomerFollowUp({
            id: current.id,
            companyId,
            customerId: current.customerId,
            followUpDate: this.normalizeDate(input.followUpDate, 'Follow-up date is required'),
            followUpType: this.normalizeFollowUpType(input.followUpType),
            assignedTo: this.normalizeNullable(input.assignedTo),
            subject: this.normalizeNullable(input.subject),
            noteText: this.normalizeNullable(input.noteText),
            promiseAmount,
            promiseDate: this.normalizeDateOrNull(input.promiseDate),
            relatedSourceType: this.normalizeNullable(input.relatedSourceType),
            relatedSourceId: this.normalizeNullable(input.relatedSourceId),
            updatedAt: new Date().toISOString(),
        });
    }

    getCustomerFollowUps(
        context: Pick<CustomerReceivablesContext, 'companyId'>,
        customerId: string,
        includeClosed = true,
    ): CustomerFollowUpEntity[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedCustomerId = this.normalizeRequired(customerId, 'Customer id is required');
        this.requireCustomer(companyId, normalizedCustomerId);
        return this.repository.listCustomerFollowUps(companyId, normalizedCustomerId, includeClosed);
    }

    markCustomerFollowUpDone(context: CustomerReceivablesContext, input: MarkCustomerFollowUpDoneInput): CustomerFollowUpEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const followUp = this.requireFollowUp(companyId, this.normalizeRequired(input.id, 'Follow-up id is required'));

        if (followUp.status === 'DONE') {
            return followUp;
        }

        if (followUp.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled follow-up cannot be marked done', {
                messageKey: 'validation.customer.follow_up.cancelled',
                details: { id: followUp.id },
            });
        }

        return this.repository.setCustomerFollowUpStatus({
            id: followUp.id,
            companyId,
            customerId: followUp.customerId,
            status: 'DONE',
            noteText: this.mergeNote(followUp.noteText, input.noteText || null),
            updatedAt: new Date().toISOString(),
        });
    }

    cancelCustomerFollowUp(context: CustomerReceivablesContext, input: CancelCustomerFollowUpInput): CustomerFollowUpEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const followUp = this.requireFollowUp(companyId, this.normalizeRequired(input.id, 'Follow-up id is required'));
        const reason = this.normalizeRequired(input.reason, 'Cancellation reason is required');

        if (followUp.status === 'CANCELLED') {
            return followUp;
        }

        return this.repository.setCustomerFollowUpStatus({
            id: followUp.id,
            companyId,
            customerId: followUp.customerId,
            status: 'CANCELLED',
            noteText: this.mergeNote(followUp.noteText, `Cancelled: ${reason}`),
            updatedAt: new Date().toISOString(),
        });
    }

    private buildExposureSummary(
        companyId: string,
        customerId: string,
        asOfDate: string,
        branchId: string | null,
        creditLimit: number,
    ): CustomerExposureSummary {
        const policy = this.repository.getPolicy(companyId);
        const aging = this.getCustomerAging(
            { companyId, branchId: branchId || '' },
            {
                customerId,
                asOfDate,
                includeDetails: true,
                branchId,
            },
        );

        const openReceivableBalance = this.round(this.repository.getReceivableJournalBalance(companyId, customerId, asOfDate, branchId));
        const openInvoiceAmount = this.round(aging.total);
        const openOrderAmount = policy.includeOpenOrdersInExposure
            ? this.round(this.repository.sumOpenSalesOrders(companyId, customerId, asOfDate, branchId))
            : 0;

        const chequeExposure = this.repository.getChequeExposure(companyId, customerId, asOfDate, branchId);
        const undepositedChequeAmount = policy.includeUndepositedChequesInExposure
            ? this.round(chequeExposure.undepositedAmount)
            : 0;
        const returnedChequeAmount = policy.includeReturnedChequesInExposure
            ? this.round(chequeExposure.returnedAmount)
            : 0;

        const baseExposure = Math.max(openReceivableBalance, openInvoiceAmount, 0);
        const exposureAmount = this.round(baseExposure + openOrderAmount + undepositedChequeAmount + returnedChequeAmount);
        const overdueAmount = this.round(
            aging.buckets['1_30']
            + aging.buckets['31_60']
            + aging.buckets['61_90']
            + aging.buckets['91_120']
            + aging.buckets.OVER_120,
        );
        const oldestDueDays = aging.documents.reduce((max, row) => Math.max(max, row.daysPastDue), 0);

        return {
            customerId,
            asOfDate,
            openReceivableBalance,
            openInvoiceAmount,
            openOrderAmount,
            undepositedChequeAmount,
            returnedChequeAmount,
            exposureAmount,
            overdueAmount,
            oldestDueDays,
            availableCredit: this.round(creditLimit - exposureAmount),
        };
    }

    private toAgingDocument(row: CustomerOpenInvoiceRecord, asOfDate: string) {
        const dueDate = this.normalizeDateOrNull(row.dueDate) || this.normalizeDate(row.docDate, 'Invoice date is invalid');
        const docDate = this.normalizeDate(row.docDate, 'Invoice date is invalid');
        const amount = this.round(row.amount);
        const daysPastDue = Math.max(0, this.daysBetween(dueDate, asOfDate));

        let bucket: CustomerAgingBucket = 'CURRENT';
        if (daysPastDue <= 0) bucket = 'CURRENT';
        else if (daysPastDue <= 30) bucket = '1_30';
        else if (daysPastDue <= 60) bucket = '31_60';
        else if (daysPastDue <= 90) bucket = '61_90';
        else if (daysPastDue <= 120) bucket = '91_120';
        else bucket = 'OVER_120';

        return {
            sourceType: row.sourceType,
            sourceId: row.sourceId,
            sourceNo: row.sourceNo,
            docDate,
            dueDate,
            amount,
            bucket,
            daysPastDue,
        };
    }

    private requireCustomer(companyId: string, customerId: string): CustomerEntity {
        const customer = this.repository.getCustomerById(companyId, customerId);
        if (!customer) {
            throw new DomainError('VALIDATION_ERROR', 'Customer was not found', {
                messageKey: 'validation.customer.not_found',
                details: { companyId, customerId },
            });
        }
        return customer;
    }

    private requireFollowUp(companyId: string, followUpId: string): CustomerFollowUpEntity {
        const row = this.repository.getCustomerFollowUpById(companyId, followUpId);
        if (!row) {
            throw new DomainError('VALIDATION_ERROR', 'Follow-up was not found', {
                messageKey: 'validation.customer.follow_up.not_found',
                details: { companyId, followUpId },
            });
        }
        return row;
    }

    private normalizeRequired(value: string | null | undefined, message: string): string {
        const normalized = String(value || '').trim();
        if (!normalized) {
            throw new DomainError('VALIDATION_ERROR', message, { messageKey: 'error.validation' });
        }
        return normalized;
    }

    private normalizeNullable(value: string | null | undefined): string | null {
        const normalized = String(value || '').trim();
        return normalized || null;
    }

    private normalizeCode(value: string | null | undefined): string {
        const normalized = this.normalizeRequired(value, 'Customer code is required').toUpperCase();
        if (!/^[A-Z0-9._-]{2,40}$/.test(normalized)) {
            throw new DomainError('VALIDATION_ERROR', 'Customer code format is invalid', {
                messageKey: 'validation.customer.code.format',
                details: { value },
            });
        }
        return normalized;
    }

    private normalizeDate(value: string | null | undefined, message: string): string {
        const normalized = String(value || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            throw new DomainError('VALIDATION_ERROR', message, {
                messageKey: 'validation.date.format',
                details: { value },
            });
        }
        return normalized;
    }

    private normalizeDateOrNull(value: string | null | undefined): string | null {
        const normalized = String(value || '').trim();
        if (!normalized) return null;
        return this.normalizeDate(normalized, 'Date format is invalid');
    }

    private normalizeCurrencyCode(value: string | null | undefined): string | null {
        const normalized = this.normalizeNullable(value);
        if (!normalized) return null;
        return this.repository.resolveCurrencyCode(normalized);
    }

    private normalizeCustomerStatus(value: CustomerStatus | string | null | undefined, fallback: CustomerStatus): CustomerStatus {
        const normalized = String(value || '').trim().toUpperCase();
        if (!normalized) return fallback;
        if (normalized === 'ACTIVE' || normalized === 'ON_HOLD' || normalized === 'INACTIVE') {
            return normalized as CustomerStatus;
        }
        return fallback;
    }

    private normalizeRiskLevel(value: CustomerRiskLevel | string | null | undefined): CustomerRiskLevel {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'LOW' || normalized === 'MEDIUM' || normalized === 'HIGH') {
            return normalized as CustomerRiskLevel;
        }
        return 'MEDIUM';
    }

    private normalizeAddressType(value: CustomerAddressType | string | null | undefined): CustomerAddressType {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'BILLING' || normalized === 'SHIPPING' || normalized === 'OTHER') {
            return normalized as CustomerAddressType;
        }
        throw new DomainError('VALIDATION_ERROR', 'Address type is invalid', {
            messageKey: 'validation.customer.address.type',
            details: { value },
        });
    }

    private normalizeFollowUpType(value: CustomerFollowUpType | string | null | undefined): CustomerFollowUpType {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'CALL' || normalized === 'EMAIL' || normalized === 'VISIT' || normalized === 'PROMISE' || normalized === 'REMINDER') {
            return normalized as CustomerFollowUpType;
        }
        throw new DomainError('VALIDATION_ERROR', 'Follow-up type is invalid', {
            messageKey: 'validation.customer.follow_up.type',
            details: { value },
        });
    }

    private normalizeLimit(value: number | null | undefined, fallback: number): number {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) return fallback;
        return Math.min(Math.floor(n), 5000);
    }

    private normalizeOffset(value: number | null | undefined): number {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.floor(n);
    }

    private normalizeNonNegative(value: number, message: string): number {
        const normalized = Number(value);
        if (!Number.isFinite(normalized) || normalized < 0) {
            throw new DomainError('VALIDATION_ERROR', message, {
                messageKey: 'error.validation',
                details: { value },
            });
        }
        return this.round(normalized);
    }

    private assertEmail(value: string | null): void {
        if (!value) return;
        const normalized = String(value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            throw new DomainError('VALIDATION_ERROR', 'Email format is invalid', {
                messageKey: 'validation.customer.email.format',
                details: { value },
            });
        }
    }

    private assertPhone(value: string | null, message: string): void {
        if (!value) return;
        const normalized = String(value || '').trim();
        if (!/^[0-9+()\-\s]{5,24}$/.test(normalized)) {
            throw new DomainError('VALIDATION_ERROR', message, {
                messageKey: 'validation.customer.phone.format',
                details: { value },
            });
        }
    }

    private daysBetween(fromDate: string, toDate: string): number {
        const start = Date.parse(fromDate);
        const end = Date.parse(toDate);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
        return Math.floor((end - start) / 86400000);
    }

    private previousDate(dateText: string): string {
        const date = new Date(`${dateText}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime())) return dateText;
        date.setUTCDate(date.getUTCDate() - 1);
        return date.toISOString().slice(0, 10);
    }

    private mergeNote(current: string | null, append: string | null | undefined): string | null {
        const currentText = this.normalizeNullable(current);
        const appendText = this.normalizeNullable(append || null);
        if (!appendText) return currentText;
        if (!currentText) return appendText;
        return `${currentText}\n${appendText}`;
    }

    private round(value: number): number {
        return Math.round((Number(value) + Number.EPSILON) * 1000000) / 1000000;
    }
}
