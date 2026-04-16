import {
    CancelCustomerFollowUpInput,
    CreateCustomerFollowUpInput,
    CreateCustomerInput,
    CustomerAgingQueryInput,
    CustomerStatementQueryInput,
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
import { CustomerReceivablesService } from '../services/CustomerReceivablesService';

export class CustomerReceivablesUseCases {
    constructor(private readonly service: CustomerReceivablesService) {}

    customerCreate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: CreateCustomerInput) {
        return this.service.createCustomer(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as CreateCustomerInput),
        );
    }

    customerUpdate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: UpdateCustomerInput) {
        return this.service.updateCustomer(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as UpdateCustomerInput),
        );
    }

    customerGetById(authenticatedCompanyId: string, customerId: string) {
        return this.service.getCustomerById(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(customerId || '').trim(),
        );
    }

    customerList(authenticatedCompanyId: string, input: ListCustomersInput) {
        return this.service.listCustomers(
            { companyId: String(authenticatedCompanyId || '').trim() },
            input || {},
        );
    }

    customerSetActive(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: SetCustomerActiveInput) {
        return this.service.setCustomerActive(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as SetCustomerActiveInput),
        );
    }

    customerGetContacts(authenticatedCompanyId: string, customerId: string) {
        return this.service.getCustomerContacts(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(customerId || '').trim(),
        );
    }

    customerSaveContact(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: SaveCustomerContactInput) {
        return this.service.saveCustomerContact(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as SaveCustomerContactInput),
        );
    }

    customerGetAddresses(authenticatedCompanyId: string, customerId: string) {
        return this.service.getCustomerAddresses(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(customerId || '').trim(),
        );
    }

    customerSaveAddress(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: SaveCustomerAddressInput) {
        return this.service.saveCustomerAddress(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as SaveCustomerAddressInput),
        );
    }

    customerGetCreditProfile(authenticatedCompanyId: string, customerId: string) {
        return this.service.getCustomerCreditProfile(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(customerId || '').trim(),
        );
    }

    customerSaveCreditProfile(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: SaveCustomerCreditProfileInput) {
        return this.service.saveCustomerCreditProfile(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as SaveCustomerCreditProfileInput),
        );
    }

    customerEvaluateCredit(authenticatedCompanyId: string, authenticatedBranchId: string, input: EvaluateCustomerCreditInput) {
        return this.service.evaluateCustomerCredit(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            input || ({} as EvaluateCustomerCreditInput),
        );
    }

    customerPlaceHold(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: PlaceCustomerHoldInput) {
        return this.service.placeCustomerOnHold(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as PlaceCustomerHoldInput),
        );
    }

    customerReleaseHold(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: ReleaseCustomerHoldInput) {
        return this.service.releaseCustomerHold(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as ReleaseCustomerHoldInput),
        );
    }

    customerGetExposure(authenticatedCompanyId: string, authenticatedBranchId: string, input: EvaluateCustomerCreditInput) {
        return this.service.getCustomerExposure(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            input || ({} as EvaluateCustomerCreditInput),
        );
    }

    customerGetStatement(authenticatedCompanyId: string, authenticatedBranchId: string, input: CustomerStatementQueryInput) {
        return this.service.getCustomerStatement(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            input || ({} as CustomerStatementQueryInput),
        );
    }

    customerGetAging(authenticatedCompanyId: string, authenticatedBranchId: string, input: CustomerAgingQueryInput) {
        return this.service.getCustomerAging(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            input || ({} as CustomerAgingQueryInput),
        );
    }

    customerGetTimeline(authenticatedCompanyId: string, input: CustomerTimelineQueryInput) {
        return this.service.getCustomerTimeline(
            { companyId: String(authenticatedCompanyId || '').trim() },
            input || ({} as CustomerTimelineQueryInput),
        );
    }

    customerFollowUpCreate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: CreateCustomerFollowUpInput) {
        return this.service.createCustomerFollowUp(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as CreateCustomerFollowUpInput),
        );
    }

    customerFollowUpUpdate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: UpdateCustomerFollowUpInput) {
        return this.service.updateCustomerFollowUp(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as UpdateCustomerFollowUpInput),
        );
    }

    customerFollowUpGetByCustomer(authenticatedCompanyId: string, customerId: string, includeClosed?: boolean) {
        return this.service.getCustomerFollowUps(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(customerId || '').trim(),
            includeClosed !== false,
        );
    }

    customerFollowUpMarkDone(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: MarkCustomerFollowUpDoneInput) {
        return this.service.markCustomerFollowUpDone(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as MarkCustomerFollowUpDoneInput),
        );
    }

    customerFollowUpCancel(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: CancelCustomerFollowUpInput) {
        return this.service.cancelCustomerFollowUp(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input || ({} as CancelCustomerFollowUpInput),
        );
    }
}
