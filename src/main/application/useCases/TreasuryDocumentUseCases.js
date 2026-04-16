"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryDocumentUseCases = void 0;
class TreasuryDocumentUseCases {
    constructor(service) {
        this.service = service;
    }
    create(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createDocument({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    update(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateDocument({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    post(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.post({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    reverse(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.reverse({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, {
            documentId: String(input?.documentId || '').trim(),
            reverseDate: String(input?.reverseDate || '').trim(),
            reason: input?.reason || null,
        });
    }
    getPostingStatus(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getPostingStatus({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
}
exports.TreasuryDocumentUseCases = TreasuryDocumentUseCases;
