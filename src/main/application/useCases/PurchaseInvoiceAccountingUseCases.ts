import {
    PostPurchaseInvoiceAccountingResult,
    PurchaseInvoiceAccountingService,
    PurchaseInvoicePostingStatusResult,
    ReversePurchaseInvoiceAccountingInput,
    ReversePurchaseInvoiceAccountingResult,
} from '../services/PurchaseInvoiceAccountingService';

export class PurchaseInvoiceAccountingUseCases {
    constructor(private readonly service: PurchaseInvoiceAccountingService) {}

    postAccounting(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        invoiceId: string,
    ): Promise<PostPurchaseInvoiceAccountingResult> {
        return this.service.postAccounting(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(invoiceId || '').trim(),
        );
    }

    reverseAccounting(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ReversePurchaseInvoiceAccountingInput,
    ): ReversePurchaseInvoiceAccountingResult {
        return this.service.reverseAccounting(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            {
                invoiceId: String(input?.invoiceId || '').trim(),
                reverseDate: String(input?.reverseDate || '').trim(),
                reason: input?.reason || null,
            },
        );
    }

    getPostingStatus(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        invoiceId: string,
    ): PurchaseInvoicePostingStatusResult {
        return this.service.getPostingStatus(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(invoiceId || '').trim(),
        );
    }
}
