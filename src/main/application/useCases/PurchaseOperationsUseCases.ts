import {
    CancelGoodsReceiptNoteInput,
    CancelPurchaseReturnInput,
    ConvertReceiptToReturnInput,
    ConvertOrderToReceiptInput,
    ConvertRequestToRfqInput,
    ConvertRequestToOrderInput,
    ConvertRfqToOrderInput,
    CreatePurchaseOperationDocumentInput,
    PostGoodsReceiptNoteInput,
    PostPurchaseReturnInput,
    PurchaseInvoicePreparationDto,
    PurchaseOperationDocumentEntity,
    PurchaseOperationalPostingStatus,
    PurchaseOrderFulfillmentSummary,
    UpdatePurchaseOperationDocumentInput,
} from '../../domain/purchaseOperations/types/PurchaseOperationsTypes';
import {
    PurchaseConversionResult,
    PurchaseDocumentCancelResult,
    PurchaseDocumentPostResult,
    PurchaseOperationsService,
} from '../services/PurchaseOperationsService';

export class PurchaseOperationsUseCases {
    constructor(private readonly service: PurchaseOperationsService) {}

    createRequest(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.createRequest(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    updateRequest(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.updateRequest(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getRequestById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.getRequestById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    confirmRequest(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.confirmRequest(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    cancelRequest(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.cancelRequest(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    convertRequestToRfq(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ConvertRequestToRfqInput,
    ): PurchaseConversionResult {
        return this.service.convertRequestToRfq(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    convertRequestToOrder(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ConvertRequestToOrderInput,
    ): PurchaseConversionResult {
        return this.service.convertRequestToOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    createRfq(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.createRfq(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    updateRfq(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.updateRfq(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getRfqById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.getRfqById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    confirmRfq(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.confirmRfq(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    cancelRfq(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.cancelRfq(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    convertRfqToOrder(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ConvertRfqToOrderInput,
    ): PurchaseConversionResult {
        return this.service.convertRfqToOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    createOrder(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.createOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    updateOrder(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.updateOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getOrderById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.getOrderById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    confirmOrder(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.confirmOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    cancelOrder(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.cancelOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    convertOrderToReceipt(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ConvertOrderToReceiptInput,
    ): PurchaseConversionResult {
        return this.service.convertOrderToReceipt(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getOrderFulfillmentStatus(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        orderId: string,
    ): PurchaseOrderFulfillmentSummary {
        return this.service.getOrderFulfillmentStatus(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(orderId || '').trim(),
        );
    }

    orderToInvoicePreparation(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        orderId: string,
    ): PurchaseInvoicePreparationDto {
        return this.service.orderToInvoicePreparation(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(orderId || '').trim(),
        );
    }

    createGoodsReceiptNote(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.createGoodsReceiptNote(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    updateGoodsReceiptNote(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.updateGoodsReceiptNote(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getGoodsReceiptNoteById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.getGoodsReceiptNoteById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    postGoodsReceiptNote(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: PostGoodsReceiptNoteInput,
    ): Promise<PurchaseDocumentPostResult> {
        return this.service.postGoodsReceiptNote(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    cancelGoodsReceiptNote(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CancelGoodsReceiptNoteInput,
    ): Promise<PurchaseDocumentCancelResult> {
        return this.service.cancelGoodsReceiptNote(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    receiptToInvoicePreparation(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        receiptId: string,
    ): PurchaseInvoicePreparationDto {
        return this.service.receiptToInvoicePreparation(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(receiptId || '').trim(),
        );
    }

    convertReceiptToReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ConvertReceiptToReturnInput,
    ): PurchaseConversionResult {
        return this.service.convertReceiptToReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    createPurchaseReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.createPurchaseReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    updatePurchaseReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdatePurchaseOperationDocumentInput,
    ): PurchaseOperationDocumentEntity {
        return this.service.updatePurchaseReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getPurchaseReturnById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): PurchaseOperationDocumentEntity {
        return this.service.getPurchaseReturnById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    postPurchaseReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: PostPurchaseReturnInput,
    ): Promise<PurchaseDocumentPostResult> {
        return this.service.postPurchaseReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    cancelPurchaseReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CancelPurchaseReturnInput,
    ): Promise<PurchaseDocumentCancelResult> {
        return this.service.cancelPurchaseReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getPurchaseReturnPostingStatus(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): PurchaseOperationalPostingStatus {
        return this.service.getPurchaseReturnPostingStatus(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }
}


