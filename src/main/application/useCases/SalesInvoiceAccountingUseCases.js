"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoiceAccountingUseCases = void 0;
class SalesInvoiceAccountingUseCases {
    constructor(service) {
        this.service = service;
    }
    postAccounting(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, invoiceId) {
        return this.service.postAccounting({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(invoiceId || '').trim());
    }
    reverseAccounting(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.reverseAccounting({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, {
            invoiceId: String(input?.invoiceId || '').trim(),
            reverseDate: String(input?.reverseDate || '').trim(),
            reason: input?.reason || null,
        });
    }
    getPostingStatus(authenticatedCompanyId, authenticatedBranchId, invoiceId) {
        return this.service.getPostingStatus({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(invoiceId || '').trim());
    }
}
exports.SalesInvoiceAccountingUseCases = SalesInvoiceAccountingUseCases;
