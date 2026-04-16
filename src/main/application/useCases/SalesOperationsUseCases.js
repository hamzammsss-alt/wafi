"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesOperationsUseCases = void 0;
class SalesOperationsUseCases {
    constructor(service) {
        this.service = service;
    }
    createQuotation(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createQuotation({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    updateQuotation(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateQuotation({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getQuotationById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getQuotationById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    confirmQuotation(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.confirmQuotation({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    cancelQuotation(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, documentId) {
        return this.service.cancelQuotation({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, String(documentId || '').trim());
    }
    convertQuotationToOrder(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.convertQuotationToOrder({
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
    convertOrderToDelivery(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.convertOrderToDelivery({
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
    createDeliveryNote(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createDeliveryNote({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    updateDeliveryNote(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateDeliveryNote({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getDeliveryNoteById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getDeliveryNoteById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    postDeliveryNote(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.postDeliveryNote({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    cancelDeliveryNote(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelDeliveryNote({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    deliveryToInvoicePreparation(authenticatedCompanyId, authenticatedBranchId, deliveryId) {
        return this.service.deliveryToInvoicePreparation({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(deliveryId || '').trim());
    }
    convertDeliveryToReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.convertDeliveryToReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    createSalesReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.createSalesReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    updateSalesReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.updateSalesReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getSalesReturnById(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getSalesReturnById({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
    postSalesReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.postSalesReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    cancelSalesReturn(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        return this.service.cancelSalesReturn({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
            userId: String(authenticatedUserId || '').trim(),
        }, input);
    }
    getSalesReturnPostingStatus(authenticatedCompanyId, authenticatedBranchId, documentId) {
        return this.service.getSalesReturnPostingStatus({
            companyId: String(authenticatedCompanyId || '').trim(),
            branchId: String(authenticatedBranchId || '').trim(),
        }, String(documentId || '').trim());
    }
}
exports.SalesOperationsUseCases = SalesOperationsUseCases;
