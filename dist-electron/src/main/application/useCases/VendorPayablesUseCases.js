"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorPayablesUseCases = void 0;
class VendorPayablesUseCases {
    constructor(service) {
        this.service = service;
    }
    vendorCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createVendor({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorUpdate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateVendor({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorGetById(authenticatedCompanyId, vendorId) {
        return this.service.getVendorById({ companyId: String(authenticatedCompanyId || '').trim() }, String(vendorId || '').trim());
    }
    vendorList(authenticatedCompanyId, input) {
        return this.service.listVendors({ companyId: String(authenticatedCompanyId || '').trim() }, input || {});
    }
    vendorSetActive(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.setVendorActive({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorGetContacts(authenticatedCompanyId, vendorId) {
        return this.service.getVendorContacts({ companyId: String(authenticatedCompanyId || '').trim() }, String(vendorId || '').trim());
    }
    vendorSaveContact(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.saveVendorContact({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorGetAddresses(authenticatedCompanyId, vendorId) {
        return this.service.getVendorAddresses({ companyId: String(authenticatedCompanyId || '').trim() }, String(vendorId || '').trim());
    }
    vendorSaveAddress(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.saveVendorAddress({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorGetPaymentProfile(authenticatedCompanyId, vendorId) {
        return this.service.getVendorPaymentProfile({ companyId: String(authenticatedCompanyId || '').trim() }, String(vendorId || '').trim());
    }
    vendorSavePaymentProfile(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.saveVendorPaymentProfile({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorEvaluatePaymentControl(authenticatedCompanyId, authenticatedBranchId, input) {
        return this.service.evaluateVendorPaymentControl({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, input || {});
    }
    vendorPlaceHold(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.placeVendorOnHold({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorReleaseHold(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.releaseVendorHold({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorGetExposure(authenticatedCompanyId, authenticatedBranchId, input) {
        return this.service.getVendorExposure({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, input || {});
    }
    vendorGetStatement(authenticatedCompanyId, authenticatedBranchId, input) {
        return this.service.getVendorStatement({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, input || {});
    }
    vendorGetAging(authenticatedCompanyId, authenticatedBranchId, input) {
        return this.service.getVendorAging({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, input || {});
    }
    vendorGetTimeline(authenticatedCompanyId, input) {
        return this.service.getVendorTimeline({ companyId: String(authenticatedCompanyId || '').trim() }, input || {});
    }
    vendorFollowUpCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createVendorFollowUp({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorFollowUpUpdate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateVendorFollowUp({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorFollowUpGetByVendor(authenticatedCompanyId, vendorId, includeClosed) {
        return this.service.getVendorFollowUps({ companyId: String(authenticatedCompanyId || '').trim() }, String(vendorId || '').trim(), includeClosed !== false);
    }
    vendorFollowUpMarkDone(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.markVendorFollowUpDone({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
    vendorFollowUpCancel(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelVendorFollowUp({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input || {});
    }
}
exports.VendorPayablesUseCases = VendorPayablesUseCases;
