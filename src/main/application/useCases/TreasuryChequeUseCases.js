"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryChequeUseCases = void 0;
class TreasuryChequeUseCases {
    constructor(service) {
        this.service = service;
    }
    deposit(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.depositCheque({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, {
            chequeId: String(input?.chequeId || '').trim(),
            bankAccountId: String(input?.bankAccountId || '').trim(),
            date: String(input?.date || '').trim(),
            reason: input?.reason || null,
        });
    }
    clearReceived(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.clearReceivedCheque({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, {
            chequeId: String(input?.chequeId || '').trim(),
            date: String(input?.date || '').trim(),
            reason: input?.reason || null,
        });
    }
    returnReceived(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.returnReceivedCheque({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, {
            chequeId: String(input?.chequeId || '').trim(),
            date: String(input?.date || '').trim(),
            reason: input?.reason || null,
        });
    }
    clearIssued(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.clearIssuedCheque({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, {
            chequeId: String(input?.chequeId || '').trim(),
            date: String(input?.date || '').trim(),
            reason: input?.reason || null,
        });
    }
    cancel(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelCheque({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, {
            chequeId: String(input?.chequeId || '').trim(),
            date: String(input?.date || '').trim(),
            reason: input?.reason || null,
        });
    }
}
exports.TreasuryChequeUseCases = TreasuryChequeUseCases;
