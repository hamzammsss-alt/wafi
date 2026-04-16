import {
    PostSalesInvoiceAccountingResult,
    ReverseSalesInvoiceAccountingInput,
    ReverseSalesInvoiceAccountingResult,
    SalesInvoiceAccountingService,
    SalesInvoicePostingStatusResult,
} from '../services/SalesInvoiceAccountingService';

export class SalesInvoiceAccountingUseCases {
    constructor(private readonly service: SalesInvoiceAccountingService) {}

    postAccounting(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        invoiceId: string,
    ): Promise<PostSalesInvoiceAccountingResult> {
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
        input: ReverseSalesInvoiceAccountingInput,
    ): ReverseSalesInvoiceAccountingResult {
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
    ): SalesInvoicePostingStatusResult {
        return this.service.getPostingStatus(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(invoiceId || '').trim(),
        );
    }
}
