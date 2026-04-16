"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManufacturingUseCases = void 0;
class ManufacturingUseCases {
    constructor(service) {
        this.service = service;
    }
    bomCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createBom({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    bomUpdate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateBom({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    bomGetById(authenticatedCompanyId, bomId) {
        return this.service.getBomById({ companyId: String(authenticatedCompanyId || '').trim() }, String(bomId || '').trim());
    }
    bomGetDefaultForItem(authenticatedCompanyId, itemId, asOfDate) {
        return this.service.getDefaultBomForItem({ companyId: String(authenticatedCompanyId || '').trim() }, String(itemId || '').trim(), asOfDate || null);
    }
    bomSetDefault(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, bomId) {
        return this.service.setBomDefault({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(bomId || '').trim());
    }
    bomConfirm(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, bomId) {
        return this.service.confirmBom({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(bomId || '').trim());
    }
    bomCancel(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, bomId) {
        return this.service.cancelBom({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(bomId || '').trim());
    }
    routingCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createRouting({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    routingUpdate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateRouting({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    routingGetById(authenticatedCompanyId, routingId) {
        return this.service.getRoutingById({ companyId: String(authenticatedCompanyId || '').trim() }, String(routingId || '').trim());
    }
    routingGetDefaultForItem(authenticatedCompanyId, itemId) {
        return this.service.getDefaultRoutingForItem({ companyId: String(authenticatedCompanyId || '').trim() }, String(itemId || '').trim());
    }
    routingSetDefault(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, routingId) {
        return this.service.setRoutingDefault({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(routingId || '').trim());
    }
    routingConfirm(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, routingId) {
        return this.service.confirmRouting({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(routingId || '').trim());
    }
    routingCancel(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, routingId) {
        return this.service.cancelRouting({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(routingId || '').trim());
    }
    productionOrderCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createProductionOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    productionOrderCreateFromBom(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createProductionOrderFromBom({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    productionOrderUpdate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateProductionOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    productionOrderGetById(authenticatedCompanyId, authenticatedBranchId, orderId) {
        return this.service.getProductionOrderById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(orderId || '').trim());
    }
    productionOrderRelease(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, orderId) {
        return this.service.releaseProductionOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(orderId || '').trim());
    }
    productionOrderCancel(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, orderId) {
        return this.service.cancelProductionOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(orderId || '').trim());
    }
    productionOrderGetStatusSummary(authenticatedCompanyId, authenticatedBranchId, orderId) {
        return this.service.getProductionOrderStatusSummary({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(orderId || '').trim());
    }
    productionOrderGetCostSummary(authenticatedCompanyId, authenticatedBranchId, orderId) {
        return this.service.getProductionOrderCostSummary({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(orderId || '').trim());
    }
    productionIssueCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createProductionIssue({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    productionIssueGetById(authenticatedCompanyId, authenticatedBranchId, issueId) {
        return this.service.getProductionIssueById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(issueId || '').trim());
    }
    productionIssuePost(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.postProductionIssue({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    productionIssueCancel(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelProductionIssue({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    productionReceiptCreate(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createProductionReceipt({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    productionReceiptGetById(authenticatedCompanyId, authenticatedBranchId, receiptId) {
        return this.service.getProductionReceiptById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(receiptId || '').trim());
    }
    productionReceiptPost(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.postProductionReceipt({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    productionReceiptCancel(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelProductionReceipt({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
}
exports.ManufacturingUseCases = ManufacturingUseCases;
