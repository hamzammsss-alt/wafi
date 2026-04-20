"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOperationsUseCases = void 0;
class PurchaseOperationsUseCases {
    constructor(service) {
        this.service = service;
    }
    createRequest(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createRequest({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    updateRequest(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateRequest({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getRequestById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getRequestById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    confirmRequest(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.confirmRequest({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    cancelRequest(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.cancelRequest({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    convertRequestToRfq(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.convertRequestToRfq({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    convertRequestToOrder(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.convertRequestToOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    createRfq(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createRfq({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    updateRfq(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateRfq({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getRfqById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getRfqById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    confirmRfq(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.confirmRfq({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    cancelRfq(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.cancelRfq({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    convertRfqToOrder(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.convertRfqToOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    createOrder(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    updateOrder(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getOrderById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getOrderById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    confirmOrder(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.confirmOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    cancelOrder(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.cancelOrder({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    convertOrderToReceipt(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.convertOrderToReceipt({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getOrderFulfillmentStatus(authenticatedCompanyId, authenticatedBranchId, orderId) {
        return this.service.getOrderFulfillmentStatus({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(orderId || '').trim());
    }
    orderToInvoicePreparation(authenticatedCompanyId, authenticatedBranchId, orderId) {
        return this.service.orderToInvoicePreparation({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(orderId || '').trim());
    }
    createGoodsReceiptNote(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createGoodsReceiptNote({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    updateGoodsReceiptNote(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateGoodsReceiptNote({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getGoodsReceiptNoteById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getGoodsReceiptNoteById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    postGoodsReceiptNote(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.postGoodsReceiptNote({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    cancelGoodsReceiptNote(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelGoodsReceiptNote({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    receiptToInvoicePreparation(authenticatedCompanyId, authenticatedBranchId, receiptId) {
        return this.service.receiptToInvoicePreparation({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(receiptId || '').trim());
    }
    convertReceiptToReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.convertReceiptToReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    createPurchaseReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createPurchaseReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    updatePurchaseReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updatePurchaseReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getPurchaseReturnById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getPurchaseReturnById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    postPurchaseReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.postPurchaseReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    cancelPurchaseReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelPurchaseReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getPurchaseReturnPostingStatus(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getPurchaseReturnPostingStatus({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
}
exports.PurchaseOperationsUseCases = PurchaseOperationsUseCases;
