import { DomainError } from '../../domain/errors';
import {
    CancelVendorFollowUpInput,
    CreateVendorFollowUpInput,
    CreateVendorInput,
    VendorAgingBucket,
    VendorAgingQueryInput,
    VendorAgingSummary,
    VendorAddressEntity,
    VendorAddressType,
    VendorContactEntity,
    VendorPaymentControlResult,
    VendorPaymentProfileEntity,
    VendorEntity,
    VendorExposureSummary,
    VendorFollowUpEntity,
    VendorFollowUpType,
    VendorRiskLevel,
    VendorStatementQueryInput,
    VendorStatementResult,
    VendorStatus,
    VendorTimelineEvent,
    VendorTimelineQueryInput,
    EvaluateVendorPaymentControlInput,
    ListVendorsInput,
    MarkVendorFollowUpDoneInput,
    PlaceVendorHoldInput,
    ReleaseVendorHoldInput,
    SaveVendorAddressInput,
    SaveVendorContactInput,
    SaveVendorPaymentProfileInput,
    SetVendorActiveInput,
    UpdateVendorFollowUpInput,
    UpdateVendorInput,
} from '../../domain/crm/types/VendorPayablesTypes';
import {
    CreateVendorDbInput,
    VendorOpenInvoiceRecord,
    VendorPayablesRepositoryPort,
    SaveVendorAddressDbInput,
    SaveVendorContactDbInput,
    SaveVendorPaymentProfileDbInput,
} from '../ports/VendorPayablesPorts';

const EPSILON = 0.000001;

type VendorPayablesContext = {
    companyId: string;
    branchId: string;
    userId: string;
};

export class VendorPayablesService {
    constructor(private readonly repository: VendorPayablesRepositoryPort) {
        this.repository.ensureSchema();
    }

    createVendor(context: VendorPayablesContext, input: CreateVendorInput): VendorEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const code = this.normalizeCode(input.code);
        const name = this.normalizeRequired(input.name, 'Vendor name is required');
        this.assertEmail(input.email || null);
        this.assertPhone(input.phone || null, 'Phone format is invalid');
        this.assertPhone(input.mobile || null, 'Mobile format is invalid');

        const existingByCode = this.repository.getVendorByCode(companyId, code);
        if (existingByCode) {
            throw new DomainError('VALIDATION_ERROR', 'Vendor code already exists', {
                messageKey: 'validation.vendor.code.unique',
                details: { code, companyId },
            });
        }

        const now = new Date().toISOString();
        const payload: CreateVendorDbInput = {
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
            status: this.normalizeVendorStatus(input.status, 'ACTIVE'),
            currencyCode: this.normalizeCurrencyCode(input.currencyCode),
            paymentTermsId: this.normalizeNullable(input.paymentTermsId),
            payableAccountId: this.normalizeNullable(input.payableAccountId),
            priceListId: this.normalizeNullable(input.priceListId),
            buyerId: this.normalizeNullable(input.buyerId),
            territoryId: this.normalizeNullable(input.territoryId),
            paymentHold: Boolean(input.paymentHold),
            isActive: input.isActive !== false,
            remarks: this.normalizeNullable(input.remarks),
            createdAt: now,
            updatedAt: now,
        };

        return this.repository.createVendor(payload);
    }

    updateVendor(context: VendorPayablesContext, input: UpdateVendorInput): VendorEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.id, 'Vendor id is required');
        const current = this.requireVendor(companyId, vendorId);

        const code = this.normalizeCode(input.code);
        const name = this.normalizeRequired(input.name, 'Vendor name is required');
        this.assertEmail(input.email || null);
        this.assertPhone(input.phone || null, 'Phone format is invalid');
        this.assertPhone(input.mobile || null, 'Mobile format is invalid');

        const existingByCode = this.repository.getVendorByCode(companyId, code);
        if (existingByCode && existingByCode.id !== vendorId) {
            throw new DomainError('VALIDATION_ERROR', 'Vendor code already exists', {
                messageKey: 'validation.vendor.code.unique',
                details: { code, companyId },
            });
        }

        const nextStatus = this.normalizeVendorStatus(input.status, current.status);
        const payload = {
            id: vendorId,
            companyId,
            code,
            name,
            nameAr: this.normalizeNullable(input.nameAr),
            taxNo: this.normalizeNullable(input.taxNo),
            registrationNo: this.normalizeNullable(input.registrationNo),
            phone: this.normalizeNullable(input.phone),
            email: this.normalizeNullable(input.email),
            mobile: this.normalizeNullable(input.mobile),
            status: input.isActive === false ? 'INACTIVE' as VendorStatus : nextStatus,
            currencyCode: this.normalizeCurrencyCode(input.currencyCode),
            paymentTermsId: this.normalizeNullable(input.paymentTermsId),
            payableAccountId: this.normalizeNullable(input.payableAccountId),
            priceListId: this.normalizeNullable(input.priceListId),
            buyerId: this.normalizeNullable(input.buyerId),
            territoryId: this.normalizeNullable(input.territoryId),
            paymentHold: input.paymentHold == null ? current.paymentHold : Boolean(input.paymentHold),
            isActive: input.isActive == null ? current.isActive : Boolean(input.isActive),
            remarks: this.normalizeNullable(input.remarks),
            updatedAt: new Date().toISOString(),
        };

        return this.repository.updateVendor(payload);
    }

    getVendorById(context: Pick<VendorPayablesContext, 'companyId'>, vendorId: string): VendorEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        return this.requireVendor(companyId, this.normalizeRequired(vendorId, 'Vendor id is required'));
    }

    listVendors(context: Pick<VendorPayablesContext, 'companyId'>, input: ListVendorsInput): VendorEntity[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        return this.repository.listVendors(companyId, {
            search: this.normalizeNullable(input.search),
            isActive: input.isActive == null ? null : Boolean(input.isActive),
            status: input.status ? this.normalizeVendorStatus(input.status, 'ACTIVE') : null,
            limit: this.normalizeLimit(input.limit, 500),
            offset: this.normalizeOffset(input.offset),
        });
    }

    setVendorActive(context: VendorPayablesContext, input: SetVendorActiveInput): VendorEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.id, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const updated = this.repository.setVendorActive(
            companyId,
            vendorId,
            Boolean(input.isActive),
            new Date().toISOString(),
        );

        if (!updated) {
            throw new DomainError('INTERNAL_ERROR', 'Vendor active state update failed', {
                messageKey: 'error.vendor.active_update_failed',
                details: { vendorId },
            });
        }

        return updated;
    }

    getVendorContacts(context: Pick<VendorPayablesContext, 'companyId'>, vendorId: string): VendorContactEntity[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedVendorId = this.normalizeRequired(vendorId, 'Vendor id is required');
        this.requireVendor(companyId, normalizedVendorId);
        return this.repository.listVendorContacts(normalizedVendorId);
    }

    saveVendorContact(context: VendorPayablesContext, input: SaveVendorContactInput): VendorContactEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const fullName = this.normalizeRequired(input.fullName, 'Contact full name is required');
        this.assertEmail(input.email || null);
        this.assertPhone(input.phone || null, 'Phone format is invalid');
        this.assertPhone(input.mobile || null, 'Mobile format is invalid');

        const now = new Date().toISOString();
        const payload: SaveVendorContactDbInput = {
            id: this.normalizeNullable(input.id) || this.repository.nextIdentity(),
            vendorId,
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

        return this.repository.saveVendorContact(payload);
    }

    getVendorAddresses(context: Pick<VendorPayablesContext, 'companyId'>, vendorId: string): VendorAddressEntity[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedVendorId = this.normalizeRequired(vendorId, 'Vendor id is required');
        this.requireVendor(companyId, normalizedVendorId);
        return this.repository.listVendorAddresses(normalizedVendorId);
    }

    saveVendorAddress(context: VendorPayablesContext, input: SaveVendorAddressInput): VendorAddressEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const now = new Date().toISOString();
        const payload: SaveVendorAddressDbInput = {
            id: this.normalizeNullable(input.id) || this.repository.nextIdentity(),
            vendorId,
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

        return this.repository.saveVendorAddress(payload);
    }

    getVendorPaymentProfile(context: Pick<VendorPayablesContext, 'companyId'>, vendorId: string): VendorPaymentProfileEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedVendorId = this.normalizeRequired(vendorId, 'Vendor id is required');
        this.requireVendor(companyId, normalizedVendorId);

        const profile = this.repository.getVendorPaymentProfile(normalizedVendorId);
        if (profile) {
            return profile;
        }

        const now = new Date().toISOString();
        return this.repository.saveVendorPaymentProfile({
            id: this.repository.nextIdentity(),
            vendorId: normalizedVendorId,
            paymentLimit: 0,
            overdueLimit: 0,
            maxBillAgeDays: null,
            riskLevel: 'MEDIUM',
            requiresApprovalOnHold: true,
            autoHoldOnOverdue: false,
            autoHoldOnPaymentLimit: false,
            holdReason: null,
            lastReviewDate: null,
            createdAt: now,
            updatedAt: now,
        });
    }

    saveVendorPaymentProfile(context: VendorPayablesContext, input: SaveVendorPaymentProfileInput): VendorPaymentProfileEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const paymentLimit = this.normalizeNonNegative(input.paymentLimit, 'Payment limit cannot be negative');
        const overdueLimit = this.normalizeNonNegative(input.overdueLimit, 'Overdue limit cannot be negative');

        if (input.maxBillAgeDays != null && Number(input.maxBillAgeDays) < 0) {
            throw new DomainError('VALIDATION_ERROR', 'Max bill age days cannot be negative', {
                messageKey: 'validation.vendor.payment.max_bill_age_days.non_negative',
                details: { value: input.maxBillAgeDays },
            });
        }

        const current = this.repository.getVendorPaymentProfile(vendorId);
        const now = new Date().toISOString();
        const payload: SaveVendorPaymentProfileDbInput = {
            id: current?.id || this.repository.nextIdentity(),
            vendorId,
            paymentLimit,
            overdueLimit,
            maxBillAgeDays: input.maxBillAgeDays == null ? current?.maxBillAgeDays || null : Number(input.maxBillAgeDays),
            riskLevel: this.normalizeRiskLevel(input.riskLevel || current?.riskLevel || 'MEDIUM'),
            requiresApprovalOnHold: input.requiresApprovalOnHold == null
                ? (current?.requiresApprovalOnHold ?? true)
                : Boolean(input.requiresApprovalOnHold),
            autoHoldOnOverdue: input.autoHoldOnOverdue == null
                ? (current?.autoHoldOnOverdue ?? false)
                : Boolean(input.autoHoldOnOverdue),
            autoHoldOnPaymentLimit: input.autoHoldOnPaymentLimit == null
                ? (current?.autoHoldOnPaymentLimit ?? false)
                : Boolean(input.autoHoldOnPaymentLimit),
            holdReason: this.normalizeNullable(input.holdReason) ?? current?.holdReason ?? null,
            lastReviewDate: input.lastReviewDate == null
                ? current?.lastReviewDate || null
                : this.normalizeDateOrNull(input.lastReviewDate),
            createdAt: current?.createdAt || now,
            updatedAt: now,
        };

        return this.repository.saveVendorPaymentProfile(payload);
    }

    evaluateVendorPaymentControl(
        context: Pick<VendorPayablesContext, 'companyId' | 'branchId'>,
        input: EvaluateVendorPaymentControlInput,
    ): VendorPaymentControlResult {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeNullable(context.branchId);
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');

        const vendor = this.requireVendor(companyId, vendorId);
        if (!vendor.isActive) {
            throw new DomainError('POLICY_VIOLATION', 'Inactive vendor cannot pass payment policy evaluation', {
                messageKey: 'policy.vendor.inactive',
                details: { vendorId },
            });
        }

        const asOfDate = this.normalizeDate(input.asOfDate || new Date().toISOString().slice(0, 10), 'As of date is invalid');
        const profile = this.getVendorPaymentProfile({ companyId }, vendorId);
        const exposure = this.buildExposureSummary(companyId, vendorId, asOfDate, branchId, profile.paymentLimit);

        const holdReasons: string[] = [];

        if (vendor.paymentHold) {
            holdReasons.push(profile.holdReason || 'MANUAL_HOLD');
        }

        if (profile.autoHoldOnPaymentLimit && profile.paymentLimit > 0 && exposure.exposureAmount > profile.paymentLimit + EPSILON) {
            holdReasons.push('PAYMENT_LIMIT_EXCEEDED');
        }

        if (profile.autoHoldOnOverdue && exposure.overdueAmount > profile.overdueLimit + EPSILON) {
            holdReasons.push('OVERDUE_LIMIT_EXCEEDED');
        }

        if (profile.maxBillAgeDays != null && profile.maxBillAgeDays >= 0 && exposure.oldestDueDays > profile.maxBillAgeDays) {
            holdReasons.push('MAX_BILL_AGE_EXCEEDED');
        }

        if (vendor.status === 'ON_HOLD') {
            holdReasons.push('STATUS_ON_HOLD');
        }

        return {
            vendorId,
            asOfDate,
            isOnHold: holdReasons.length > 0,
            holdReasons: Array.from(new Set(holdReasons)),
            riskLevel: profile.riskLevel,
            paymentLimit: profile.paymentLimit,
            exposureAmount: exposure.exposureAmount,
            overdueAmount: exposure.overdueAmount,
            oldestDueDays: exposure.oldestDueDays,
            availablePaymentCapacity: exposure.availablePaymentCapacity,
            requiresApprovalOnHold: profile.requiresApprovalOnHold,
        };
    }

    placeVendorOnHold(context: VendorPayablesContext, input: PlaceVendorHoldInput): VendorPaymentControlResult {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        const reason = this.normalizeRequired(input.reason, 'Hold reason is required');

        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            const vendor = this.requireVendor(companyId, vendorId);
            const nextStatus: VendorStatus = vendor.isActive ? 'ON_HOLD' : 'INACTIVE';

            this.repository.updateVendor({
                id: vendor.id,
                companyId,
                code: vendor.code,
                name: vendor.name,
                nameAr: vendor.nameAr,
                taxNo: vendor.taxNo,
                registrationNo: vendor.registrationNo,
                phone: vendor.phone,
                email: vendor.email,
                mobile: vendor.mobile,
                status: nextStatus,
                currencyCode: vendor.currencyCode,
                paymentTermsId: vendor.paymentTermsId,
                payableAccountId: vendor.payableAccountId,
                priceListId: vendor.priceListId,
                buyerId: vendor.buyerId,
                territoryId: vendor.territoryId,
                paymentHold: true,
                isActive: vendor.isActive,
                remarks: vendor.remarks,
                updatedAt: now,
            });

            const profile = this.repository.getVendorPaymentProfile(vendor.id);
            this.repository.saveVendorPaymentProfile({
                id: profile?.id || this.repository.nextIdentity(),
                vendorId: vendor.id,
                paymentLimit: profile?.paymentLimit ?? 0,
                overdueLimit: profile?.overdueLimit ?? 0,
                maxBillAgeDays: profile?.maxBillAgeDays ?? null,
                riskLevel: profile?.riskLevel ?? 'MEDIUM',
                requiresApprovalOnHold: profile?.requiresApprovalOnHold ?? true,
                autoHoldOnOverdue: profile?.autoHoldOnOverdue ?? false,
                autoHoldOnPaymentLimit: profile?.autoHoldOnPaymentLimit ?? false,
                holdReason: reason,
                lastReviewDate: profile?.lastReviewDate ?? null,
                createdAt: profile?.createdAt || now,
                updatedAt: now,
            });

            this.repository.saveVendorHoldLog({
                id: this.repository.nextIdentity(),
                companyId,
                vendorId: vendor.id,
                actionType: 'PLACE_HOLD',
                reason,
                manual: input.manual !== false,
                createdBy: this.normalizeRequired(context.userId, 'User id is required'),
                createdAt: now,
            });
        });

        return this.evaluateVendorPaymentControl(
            { companyId, branchId: context.branchId },
            { vendorId, asOfDate: new Date().toISOString().slice(0, 10) },
        );
    }

    releaseVendorHold(context: VendorPayablesContext, input: ReleaseVendorHoldInput): VendorPaymentControlResult {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        const reason = this.normalizeRequired(input.reason, 'Release reason is required');

        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            const vendor = this.requireVendor(companyId, vendorId);
            const nextStatus: VendorStatus = vendor.isActive ? 'ACTIVE' : 'INACTIVE';

            this.repository.updateVendor({
                id: vendor.id,
                companyId,
                code: vendor.code,
                name: vendor.name,
                nameAr: vendor.nameAr,
                taxNo: vendor.taxNo,
                registrationNo: vendor.registrationNo,
                phone: vendor.phone,
                email: vendor.email,
                mobile: vendor.mobile,
                status: nextStatus,
                currencyCode: vendor.currencyCode,
                paymentTermsId: vendor.paymentTermsId,
                payableAccountId: vendor.payableAccountId,
                priceListId: vendor.priceListId,
                buyerId: vendor.buyerId,
                territoryId: vendor.territoryId,
                paymentHold: false,
                isActive: vendor.isActive,
                remarks: vendor.remarks,
                updatedAt: now,
            });

            const profile = this.repository.getVendorPaymentProfile(vendor.id);
            if (profile) {
                this.repository.saveVendorPaymentProfile({
                    id: profile.id,
                    vendorId: vendor.id,
                    paymentLimit: profile.paymentLimit,
                    overdueLimit: profile.overdueLimit,
                    maxBillAgeDays: profile.maxBillAgeDays,
                    riskLevel: profile.riskLevel,
                    requiresApprovalOnHold: profile.requiresApprovalOnHold,
                    autoHoldOnOverdue: profile.autoHoldOnOverdue,
                    autoHoldOnPaymentLimit: profile.autoHoldOnPaymentLimit,
                    holdReason: null,
                    lastReviewDate: profile.lastReviewDate,
                    createdAt: profile.createdAt,
                    updatedAt: now,
                });
            }

            this.repository.saveVendorHoldLog({
                id: this.repository.nextIdentity(),
                companyId,
                vendorId: vendor.id,
                actionType: 'RELEASE_HOLD',
                reason,
                manual: input.manual !== false,
                createdBy: this.normalizeRequired(context.userId, 'User id is required'),
                createdAt: now,
            });
        });

        return this.evaluateVendorPaymentControl(
            { companyId, branchId: context.branchId },
            { vendorId, asOfDate: new Date().toISOString().slice(0, 10) },
        );
    }

    getVendorExposure(
        context: Pick<VendorPayablesContext, 'companyId' | 'branchId'>,
        input: EvaluateVendorPaymentControlInput,
    ): VendorExposureSummary {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const asOfDate = this.normalizeDate(input.asOfDate || new Date().toISOString().slice(0, 10), 'As of date is invalid');
        const profile = this.getVendorPaymentProfile({ companyId }, vendorId);
        return this.buildExposureSummary(
            companyId,
            vendorId,
            asOfDate,
            this.normalizeNullable(context.branchId),
            profile.paymentLimit,
        );
    }

    getVendorStatement(
        context: Pick<VendorPayablesContext, 'companyId' | 'branchId'>,
        input: VendorStatementQueryInput,
    ): VendorStatementResult {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const fromDate = this.normalizeDateOrNull(input.fromDate);
        const toDate = this.normalizeDateOrNull(input.toDate);
        if (fromDate && toDate && fromDate > toDate) {
            throw new DomainError('VALIDATION_ERROR', 'From date cannot be after to date', {
                messageKey: 'validation.vendor.statement.invalid_range',
                details: { fromDate, toDate },
            });
        }

        const branchId = this.normalizeNullable(input.branchId) || this.normalizeNullable(context.branchId);
        const openingBalance = fromDate
            ? this.repository.getPayableJournalBalance(companyId, vendorId, this.previousDate(fromDate), branchId)
            : 0;

        const sourceRows = this.repository.listStatementRows({
            companyId,
            vendorId,
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
                running = this.round(running + credit - debit);

                const sourceType = String(row.sourceType || '').toUpperCase();
                const isInvoice = sourceType === 'PURCHASE_INVOICE' || sourceType === 'AP_INVOICE' || sourceType.endsWith('_INVOICE');
                const isChequePayment = sourceType === 'CHEQUE_PAYMENT' || sourceType.endsWith('CHEQUE_PAYMENT');
                const isPayment = sourceType.endsWith('PAYMENT') || sourceType === 'TREASURY_PAYMENT';
                const rowType: 'INVOICE' | 'PAYMENT' | 'CHEQUE_PAYMENT' | 'ADJUSTMENT' = isInvoice
                    ? 'INVOICE'
                    : isChequePayment
                        ? 'CHEQUE_PAYMENT'
                        : isPayment
                            ? 'PAYMENT'
                            : credit > debit
                                ? 'INVOICE'
                                : debit > credit
                                    ? 'PAYMENT'
                                    : 'ADJUSTMENT';

                return {
                    id: row.id,
                    vendorId: row.vendorId,
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
            vendorId,
            fromDate,
            toDate,
            openingBalance: this.round(openingBalance),
            closingBalance: rows.length ? rows[rows.length - 1].runningBalance : this.round(openingBalance),
            totalDebit: this.round(totalDebit),
            totalCredit: this.round(totalCredit),
            rows,
        };
    }

    getVendorAging(
        context: Pick<VendorPayablesContext, 'companyId' | 'branchId'>,
        input: VendorAgingQueryInput,
    ): VendorAgingSummary {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const asOfDate = this.normalizeDate(input.asOfDate || new Date().toISOString().slice(0, 10), 'As of date is invalid');
        const openInvoices = this.repository.listOpenPurchaseInvoices(
            companyId,
            vendorId,
            asOfDate,
            this.normalizeNullable(input.branchId) || this.normalizeNullable(context.branchId),
        );

        const buckets: Record<VendorAgingBucket, number> = {
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
            vendorId,
            asOfDate,
            currencyCode: null,
            total: this.round(documents.reduce((sum, row) => sum + row.amount, 0)),
            buckets,
            documents: input.includeDetails === false ? [] : documents,
        };
    }

    getVendorTimeline(
        context: Pick<VendorPayablesContext, 'companyId'>,
        input: VendorTimelineQueryInput,
    ): VendorTimelineEvent[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const fromDate = this.normalizeDateOrNull(input.fromDate);
        const toDate = this.normalizeDateOrNull(input.toDate);
        if (fromDate && toDate && fromDate > toDate) {
            throw new DomainError('VALIDATION_ERROR', 'From date cannot be after to date', {
                messageKey: 'validation.vendor.timeline.invalid_range',
                details: { fromDate, toDate },
            });
        }

        return this.repository.listTimelineRows({
            companyId,
            vendorId,
            fromDate,
            toDate,
            limit: this.normalizeLimit(input.limit, 200),
        });
    }

    createVendorFollowUp(context: VendorPayablesContext, input: CreateVendorFollowUpInput): VendorFollowUpEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const vendorId = this.normalizeRequired(input.vendorId, 'Vendor id is required');
        this.requireVendor(companyId, vendorId);

        const expectedPaymentAmount = input.expectedPaymentAmount == null
            ? null
            : this.normalizeNonNegative(input.expectedPaymentAmount, 'Expected payment amount cannot be negative');
        const now = new Date().toISOString();

        return this.repository.createVendorFollowUp({
            id: this.repository.nextIdentity(),
            companyId,
            vendorId,
            followUpDate: this.normalizeDate(input.followUpDate, 'Follow-up date is required'),
            followUpType: this.normalizeFollowUpType(input.followUpType),
            status: 'OPEN',
            assignedTo: this.normalizeNullable(input.assignedTo),
            subject: this.normalizeNullable(input.subject),
            noteText: this.normalizeNullable(input.noteText),
            expectedPaymentAmount,
            expectedPaymentDate: this.normalizeDateOrNull(input.expectedPaymentDate),
            relatedSourceType: this.normalizeNullable(input.relatedSourceType),
            relatedSourceId: this.normalizeNullable(input.relatedSourceId),
            createdAt: now,
            updatedAt: now,
        });
    }

    updateVendorFollowUp(context: VendorPayablesContext, input: UpdateVendorFollowUpInput): VendorFollowUpEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const followUpId = this.normalizeRequired(input.id, 'Follow-up id is required');

        const current = this.requireFollowUp(companyId, followUpId);
        if (current.status !== 'OPEN') {
            throw new DomainError('INVALID_TRANSITION', 'Only open follow-up can be updated', {
                messageKey: 'validation.vendor.follow_up.must_be_open',
                details: { followUpId, status: current.status },
            });
        }

        const expectedPaymentAmount = input.expectedPaymentAmount == null
            ? null
            : this.normalizeNonNegative(input.expectedPaymentAmount, 'Expected payment amount cannot be negative');

        return this.repository.updateVendorFollowUp({
            id: current.id,
            companyId,
            vendorId: current.vendorId,
            followUpDate: this.normalizeDate(input.followUpDate, 'Follow-up date is required'),
            followUpType: this.normalizeFollowUpType(input.followUpType),
            assignedTo: this.normalizeNullable(input.assignedTo),
            subject: this.normalizeNullable(input.subject),
            noteText: this.normalizeNullable(input.noteText),
            expectedPaymentAmount,
            expectedPaymentDate: this.normalizeDateOrNull(input.expectedPaymentDate),
            relatedSourceType: this.normalizeNullable(input.relatedSourceType),
            relatedSourceId: this.normalizeNullable(input.relatedSourceId),
            updatedAt: new Date().toISOString(),
        });
    }

    getVendorFollowUps(
        context: Pick<VendorPayablesContext, 'companyId'>,
        vendorId: string,
        includeClosed = true,
    ): VendorFollowUpEntity[] {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const normalizedVendorId = this.normalizeRequired(vendorId, 'Vendor id is required');
        this.requireVendor(companyId, normalizedVendorId);
        return this.repository.listVendorFollowUps(companyId, normalizedVendorId, includeClosed);
    }

    markVendorFollowUpDone(context: VendorPayablesContext, input: MarkVendorFollowUpDoneInput): VendorFollowUpEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const followUp = this.requireFollowUp(companyId, this.normalizeRequired(input.id, 'Follow-up id is required'));

        if (followUp.status === 'DONE') {
            return followUp;
        }

        if (followUp.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled follow-up cannot be marked done', {
                messageKey: 'validation.vendor.follow_up.cancelled',
                details: { id: followUp.id },
            });
        }

        return this.repository.setVendorFollowUpStatus({
            id: followUp.id,
            companyId,
            vendorId: followUp.vendorId,
            status: 'DONE',
            noteText: this.mergeNote(followUp.noteText, input.noteText || null),
            updatedAt: new Date().toISOString(),
        });
    }

    cancelVendorFollowUp(context: VendorPayablesContext, input: CancelVendorFollowUpInput): VendorFollowUpEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const followUp = this.requireFollowUp(companyId, this.normalizeRequired(input.id, 'Follow-up id is required'));
        const reason = this.normalizeRequired(input.reason, 'Cancellation reason is required');

        if (followUp.status === 'CANCELLED') {
            return followUp;
        }

        return this.repository.setVendorFollowUpStatus({
            id: followUp.id,
            companyId,
            vendorId: followUp.vendorId,
            status: 'CANCELLED',
            noteText: this.mergeNote(followUp.noteText, `Cancelled: ${reason}`),
            updatedAt: new Date().toISOString(),
        });
    }

    private buildExposureSummary(
        companyId: string,
        vendorId: string,
        asOfDate: string,
        branchId: string | null,
        paymentLimit: number,
    ): VendorExposureSummary {
        const policy = this.repository.getPolicy(companyId);
        const aging = this.getVendorAging(
            { companyId, branchId: branchId || '' },
            {
                vendorId,
                asOfDate,
                includeDetails: true,
                branchId,
            },
        );

        const openPayableBalance = this.round(this.repository.getPayableJournalBalance(companyId, vendorId, asOfDate, branchId));
        const openInvoiceAmount = this.round(aging.total);
        const openOrderAmount = policy.includeOpenOrdersInExposure
            ? this.round(this.repository.sumOpenPurchaseOrders(companyId, vendorId, asOfDate, branchId))
            : 0;

        const chequeExposure = this.repository.getIssuedChequeExposure(companyId, vendorId, asOfDate, branchId);
        const issuedUnclearedChequeAmount = policy.includeIssuedUnclearedChequesInExposure
            ? this.round(chequeExposure.issuedUnclearedAmount)
            : 0;

        const baseExposure = Math.max(openPayableBalance, openInvoiceAmount, 0);
        const exposureAmount = this.round(baseExposure + openOrderAmount + issuedUnclearedChequeAmount);
        const overdueAmount = this.round(
            aging.buckets['1_30']
            + aging.buckets['31_60']
            + aging.buckets['61_90']
            + aging.buckets['91_120']
            + aging.buckets.OVER_120,
        );
        const oldestDueDays = aging.documents.reduce((max, row) => Math.max(max, row.daysPastDue), 0);

        return {
            vendorId,
            asOfDate,
            openPayableBalance,
            openInvoiceAmount,
            openOrderAmount,
            issuedUnclearedChequeAmount,
            exposureAmount,
            overdueAmount,
            oldestDueDays,
            availablePaymentCapacity: this.round(paymentLimit - exposureAmount),
        };
    }

    private toAgingDocument(row: VendorOpenInvoiceRecord, asOfDate: string) {
        const dueDate = this.normalizeDateOrNull(row.dueDate) || this.normalizeDate(row.docDate, 'Invoice date is invalid');
        const docDate = this.normalizeDate(row.docDate, 'Invoice date is invalid');
        const amount = this.round(row.amount);
        const daysPastDue = Math.max(0, this.daysBetween(dueDate, asOfDate));

        let bucket: VendorAgingBucket = 'CURRENT';
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

    private requireVendor(companyId: string, vendorId: string): VendorEntity {
        const vendor = this.repository.getVendorById(companyId, vendorId);
        if (!vendor) {
            throw new DomainError('VALIDATION_ERROR', 'Vendor was not found', {
                messageKey: 'validation.vendor.not_found',
                details: { companyId, vendorId },
            });
        }
        return vendor;
    }

    private requireFollowUp(companyId: string, followUpId: string): VendorFollowUpEntity {
        const row = this.repository.getVendorFollowUpById(companyId, followUpId);
        if (!row) {
            throw new DomainError('VALIDATION_ERROR', 'Follow-up was not found', {
                messageKey: 'validation.vendor.follow_up.not_found',
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
        const normalized = this.normalizeRequired(value, 'Vendor code is required').toUpperCase();
        if (!/^[A-Z0-9._-]{2,40}$/.test(normalized)) {
            throw new DomainError('VALIDATION_ERROR', 'Vendor code format is invalid', {
                messageKey: 'validation.vendor.code.format',
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

    private normalizeVendorStatus(value: VendorStatus | string | null | undefined, fallback: VendorStatus): VendorStatus {
        const normalized = String(value || '').trim().toUpperCase();
        if (!normalized) return fallback;
        if (normalized === 'ACTIVE' || normalized === 'ON_HOLD' || normalized === 'INACTIVE') {
            return normalized as VendorStatus;
        }
        return fallback;
    }

    private normalizeRiskLevel(value: VendorRiskLevel | string | null | undefined): VendorRiskLevel {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'LOW' || normalized === 'MEDIUM' || normalized === 'HIGH') {
            return normalized as VendorRiskLevel;
        }
        return 'MEDIUM';
    }

    private normalizeAddressType(value: VendorAddressType | string | null | undefined): VendorAddressType {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'BILLING' || normalized === 'SHIPPING' || normalized === 'OTHER') {
            return normalized as VendorAddressType;
        }
        throw new DomainError('VALIDATION_ERROR', 'Address type is invalid', {
            messageKey: 'validation.vendor.address.type',
            details: { value },
        });
    }

    private normalizeFollowUpType(value: VendorFollowUpType | string | null | undefined): VendorFollowUpType {
        const normalized = String(value || '').trim().toUpperCase();
        if (
            normalized === 'CALL'
            || normalized === 'EMAIL'
            || normalized === 'VISIT'
            || normalized === 'REMINDER'
            || normalized === 'COMMITMENT'
            || normalized === 'DISPUTE'
        ) {
            return normalized as VendorFollowUpType;
        }
        throw new DomainError('VALIDATION_ERROR', 'Follow-up type is invalid', {
            messageKey: 'validation.vendor.follow_up.type',
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
                messageKey: 'validation.vendor.email.format',
                details: { value },
            });
        }
    }

    private assertPhone(value: string | null, message: string): void {
        if (!value) return;
        const normalized = String(value || '').trim();
        if (!/^[0-9+()\-\s]{5,24}$/.test(normalized)) {
            throw new DomainError('VALIDATION_ERROR', message, {
                messageKey: 'validation.vendor.phone.format',
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

