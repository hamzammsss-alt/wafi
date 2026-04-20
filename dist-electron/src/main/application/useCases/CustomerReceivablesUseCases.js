"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerReceivablesUseCases = void 0;
class CustomerReceivablesUseCases {
    constructor(service) {
        this.service = service;
    }
    customerCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createCustomer({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerUpdate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateCustomer({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerGetById(authenticatedCompanyId, customerId) {
        return this.service.getCustomerById({ companyId: String(authenticatedCompanyId || '').trim() }, String(customerId || '').trim());
    }
    customerList(authenticatedCompanyId, input) {
        return this.service.listCustomers({ companyId: String(authenticatedCompanyId || '').trim() }, input || {});
    }
    customerSetActive(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.setCustomerActive({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerGetContacts(authenticatedCompanyId, customerId) {
        return this.service.getCustomerContacts({ companyId: String(authenticatedCompanyId || '').trim() }, String(customerId || '').trim());
    }
    customerSaveContact(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.saveCustomerContact({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerGetAddresses(authenticatedCompanyId, customerId) {
        return this.service.getCustomerAddresses({ companyId: String(authenticatedCompanyId || '').trim() }, String(customerId || '').trim());
    }
    customerSaveAddress(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.saveCustomerAddress({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerGetCreditProfile(authenticatedCompanyId, customerId) {
        return this.service.getCustomerCreditProfile({ companyId: String(authenticatedCompanyId || '').trim() }, String(customerId || '').trim());
    }
    customerSaveCreditProfile(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.saveCustomerCreditProfile({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerEvaluateCredit(authenticatedCompanyId, authenticatedBranchId, input) {
        return this.service.evaluateCustomerCredit({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, input || {});
    }
    customerPlaceHold(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.placeCustomerOnHold({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerReleaseHold(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.releaseCustomerHold({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerGetExposure(authenticatedCompanyId, authenticatedBranchId, input) {
        return this.service.getCustomerExposure({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, input || {});
    }
    customerGetStatement(authenticatedCompanyId, authenticatedBranchId, input) {
        return this.service.getCustomerStatement({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, input || {});
    }
    customerGetAging(authenticatedCompanyId, authenticatedBranchId, input) {
        return this.service.getCustomerAging({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, input || {});
    }
    customerGetTimeline(authenticatedCompanyId, input) {
        return this.service.getCustomerTimeline({ companyId: String(authenticatedCompanyId || '').trim() }, input || {});
    }
    customerFollowUpCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createCustomerFollowUp({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerFollowUpUpdate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateCustomerFollowUp({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerFollowUpGetByCustomer(authenticatedCompanyId, customerId, includeClosed) {
        return this.service.getCustomerFollowUps({ companyId: String(authenticatedCompanyId || '').trim() }, String(customerId || '').trim(), includeClosed !== false);
    }
    customerFollowUpMarkDone(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.markCustomerFollowUpDone({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    customerFollowUpCancel(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelCustomerFollowUp({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
}
exports.CustomerReceivablesUseCases = CustomerReceivablesUseCases;
