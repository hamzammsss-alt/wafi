import {
    CancelDeliveryNoteInput,
    CancelSalesReturnInput,
    ConvertDeliveryToReturnInput,
    ConvertOrderToDeliveryInput,
    ConvertQuotationToOrderInput,
    CreateSalesOperationDocumentInput,
    PostDeliveryNoteInput,
    PostSalesReturnInput,
    SalesInvoicePreparationDto,
    SalesOperationDocumentEntity,
    SalesOperationalPostingStatus,
    SalesOrderFulfillmentSummary,
    UpdateSalesOperationDocumentInput,
} from '../../domain/salesOperations/types/SalesOperationsTypes';
import {
    SalesConversionResult,
    SalesDocumentCancelResult,
    SalesDocumentPostResult,
    SalesOperationsService,
} from '../services/SalesOperationsService';

export class SalesOperationsUseCases {
    constructor(private readonly service: SalesOperationsService) {}

    createQuotation(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
        return this.service.createQuotation(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    updateQuotation(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
        return this.service.updateQuotation(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getQuotationById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): SalesOperationDocumentEntity {
        return this.service.getQuotationById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    confirmQuotation(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): SalesOperationDocumentEntity {
        return this.service.confirmQuotation(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    cancelQuotation(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): SalesOperationDocumentEntity {
        return this.service.cancelQuotation(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    convertQuotationToOrder(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ConvertQuotationToOrderInput,
    ): SalesConversionResult {
        return this.service.convertQuotationToOrder(
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
        input: CreateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
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
        input: UpdateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
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
    ): SalesOperationDocumentEntity {
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
    ): SalesOperationDocumentEntity {
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
    ): SalesOperationDocumentEntity {
        return this.service.cancelOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    convertOrderToDelivery(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ConvertOrderToDeliveryInput,
    ): SalesConversionResult {
        return this.service.convertOrderToDelivery(
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
    ): SalesOrderFulfillmentSummary {
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
    ): SalesInvoicePreparationDto {
        return this.service.orderToInvoicePreparation(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(orderId || '').trim(),
        );
    }

    createDeliveryNote(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
        return this.service.createDeliveryNote(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    updateDeliveryNote(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
        return this.service.updateDeliveryNote(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getDeliveryNoteById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): SalesOperationDocumentEntity {
        return this.service.getDeliveryNoteById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    postDeliveryNote(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: PostDeliveryNoteInput,
    ): Promise<SalesDocumentPostResult> {
        return this.service.postDeliveryNote(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    cancelDeliveryNote(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CancelDeliveryNoteInput,
    ): Promise<SalesDocumentCancelResult> {
        return this.service.cancelDeliveryNote(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    deliveryToInvoicePreparation(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        deliveryId: string,
    ): SalesInvoicePreparationDto {
        return this.service.deliveryToInvoicePreparation(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(deliveryId || '').trim(),
        );
    }

    convertDeliveryToReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ConvertDeliveryToReturnInput,
    ): SalesConversionResult {
        return this.service.convertDeliveryToReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    createSalesReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
        return this.service.createSalesReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    updateSalesReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
        return this.service.updateSalesReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getSalesReturnById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): SalesOperationDocumentEntity {
        return this.service.getSalesReturnById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    postSalesReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: PostSalesReturnInput,
    ): Promise<SalesDocumentPostResult> {
        return this.service.postSalesReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    cancelSalesReturn(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CancelSalesReturnInput,
    ): Promise<SalesDocumentCancelResult> {
        return this.service.cancelSalesReturn(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getSalesReturnPostingStatus(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): SalesOperationalPostingStatus {
        return this.service.getSalesReturnPostingStatus(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }
}
