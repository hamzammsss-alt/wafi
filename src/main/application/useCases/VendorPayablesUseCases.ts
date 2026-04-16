import {
    CancelVendorFollowUpInput,
    CreateVendorFollowUpInput,
    CreateVendorInput,
    VendorAgingQueryInput,
    VendorStatementQueryInput,
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
import { VendorPayablesService } from '../services/VendorPayablesService';

export class VendorPayablesUseCases {
    constructor(private readonly service: VendorPayablesService) {}

    vendorCreate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: CreateVendorInput) {
        return this.service.createVendor(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as CreateVendorInput),
        );
    }

    vendorUpdate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: UpdateVendorInput) {
        return this.service.updateVendor(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as UpdateVendorInput),
        );
    }

    vendorGetById(authenticatedCompanyId: string, vendorId: string) {
        return this.service.getVendorById(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(vendorId || '').trim(),
        );
    }

    vendorList(authenticatedCompanyId: string, input: ListVendorsInput) {
        return this.service.listVendors(
            { companyId: String(authenticatedCompanyId || '').trim() },
            input || {},
        );
    }

    vendorSetActive(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: SetVendorActiveInput) {
        return this.service.setVendorActive(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as SetVendorActiveInput),
        );
    }

    vendorGetContacts(authenticatedCompanyId: string, vendorId: string) {
        return this.service.getVendorContacts(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(vendorId || '').trim(),
        );
    }

    vendorSaveContact(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: SaveVendorContactInput) {
        return this.service.saveVendorContact(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as SaveVendorContactInput),
        );
    }

    vendorGetAddresses(authenticatedCompanyId: string, vendorId: string) {
        return this.service.getVendorAddresses(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(vendorId || '').trim(),
        );
    }

    vendorSaveAddress(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: SaveVendorAddressInput) {
        return this.service.saveVendorAddress(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as SaveVendorAddressInput),
        );
    }

    vendorGetPaymentProfile(authenticatedCompanyId: string, vendorId: string) {
        return this.service.getVendorPaymentProfile(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(vendorId || '').trim(),
        );
    }

    vendorSavePaymentProfile(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: SaveVendorPaymentProfileInput) {
        return this.service.saveVendorPaymentProfile(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as SaveVendorPaymentProfileInput),
        );
    }

    vendorEvaluatePaymentControl(authenticatedCompanyId: string, authenticatedBranchId: string, input: EvaluateVendorPaymentControlInput) {
        return this.service.evaluateVendorPaymentControl(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            input || ({} as EvaluateVendorPaymentControlInput),
        );
    }

    vendorPlaceHold(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: PlaceVendorHoldInput) {
        return this.service.placeVendorOnHold(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as PlaceVendorHoldInput),
        );
    }

    vendorReleaseHold(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: ReleaseVendorHoldInput) {
        return this.service.releaseVendorHold(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as ReleaseVendorHoldInput),
        );
    }

    vendorGetExposure(authenticatedCompanyId: string, authenticatedBranchId: string, input: EvaluateVendorPaymentControlInput) {
        return this.service.getVendorExposure(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            input || ({} as EvaluateVendorPaymentControlInput),
        );
    }

    vendorGetStatement(authenticatedCompanyId: string, authenticatedBranchId: string, input: VendorStatementQueryInput) {
        return this.service.getVendorStatement(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            input || ({} as VendorStatementQueryInput),
        );
    }

    vendorGetAging(authenticatedCompanyId: string, authenticatedBranchId: string, input: VendorAgingQueryInput) {
        return this.service.getVendorAging(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            input || ({} as VendorAgingQueryInput),
        );
    }

    vendorGetTimeline(authenticatedCompanyId: string, input: VendorTimelineQueryInput) {
        return this.service.getVendorTimeline(
            { companyId: String(authenticatedCompanyId || '').trim() },
            input || ({} as VendorTimelineQueryInput),
        );
    }

    vendorFollowUpCreate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: CreateVendorFollowUpInput) {
        return this.service.createVendorFollowUp(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as CreateVendorFollowUpInput),
        );
    }

    vendorFollowUpUpdate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: UpdateVendorFollowUpInput) {
        return this.service.updateVendorFollowUp(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as UpdateVendorFollowUpInput),
        );
    }

    vendorFollowUpGetByVendor(authenticatedCompanyId: string, vendorId: string, includeClosed?: boolean) {
        return this.service.getVendorFollowUps(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(vendorId || '').trim(),
            includeClosed !== false,
        );
    }

    vendorFollowUpMarkDone(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: MarkVendorFollowUpDoneInput) {
        return this.service.markVendorFollowUpDone(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as MarkVendorFollowUpDoneInput),
        );
    }

    vendorFollowUpCancel(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: CancelVendorFollowUpInput) {
        return this.service.cancelVendorFollowUp(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as CancelVendorFollowUpInput),
        );
    }
}

