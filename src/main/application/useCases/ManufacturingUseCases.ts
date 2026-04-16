import {
    BomEntity,
    CancelProductionIssueInput,
    CancelProductionReceiptInput,
    CreateBomInput,
    CreateProductionIssueInput,
    CreateProductionOrderFromBomInput,
    CreateProductionOrderInput,
    CreateProductionReceiptInput,
    CreateRoutingInput,
    ProductionDocumentCancelResult,
    ProductionDocumentPostResult,
    ProductionIssueEntity,
    ProductionOrderCostSummary,
    ProductionOrderDocumentEntity,
    ProductionOrderStatusSummary,
    ProductionReceiptEntity,
    RoutingEntity,
    UpdateBomInput,
    UpdateProductionOrderInput,
    UpdateRoutingInput,
} from '../../domain/manufacturing/types/ManufacturingTypes';
import { ManufacturingService } from '../services/ManufacturingService';

export class ManufacturingUseCases {
    constructor(private readonly service: ManufacturingService) {}

    bomCreate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: CreateBomInput): BomEntity {
        return this.service.createBom(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    bomUpdate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: UpdateBomInput): BomEntity {
        return this.service.updateBom(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    bomGetById(authenticatedCompanyId: string, bomId: string): BomEntity {
        return this.service.getBomById(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(bomId || '').trim(),
        );
    }

    bomGetDefaultForItem(authenticatedCompanyId: string, itemId: string, asOfDate?: string | null): BomEntity {
        return this.service.getDefaultBomForItem(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(itemId || '').trim(),
            asOfDate || null,
        );
    }

    bomSetDefault(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, bomId: string): BomEntity {
        return this.service.setBomDefault(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(bomId || '').trim(),
        );
    }

    bomConfirm(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, bomId: string): BomEntity {
        return this.service.confirmBom(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(bomId || '').trim(),
        );
    }

    bomCancel(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, bomId: string): BomEntity {
        return this.service.cancelBom(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(bomId || '').trim(),
        );
    }

    routingCreate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: CreateRoutingInput): RoutingEntity {
        return this.service.createRouting(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    routingUpdate(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, input: UpdateRoutingInput): RoutingEntity {
        return this.service.updateRouting(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    routingGetById(authenticatedCompanyId: string, routingId: string): RoutingEntity {
        return this.service.getRoutingById(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(routingId || '').trim(),
        );
    }

    routingGetDefaultForItem(authenticatedCompanyId: string, itemId: string): RoutingEntity {
        return this.service.getDefaultRoutingForItem(
            { companyId: String(authenticatedCompanyId || '').trim() },
            String(itemId || '').trim(),
        );
    }

    routingSetDefault(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, routingId: string): RoutingEntity {
        return this.service.setRoutingDefault(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(routingId || '').trim(),
        );
    }

    routingConfirm(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, routingId: string): RoutingEntity {
        return this.service.confirmRouting(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(routingId || '').trim(),
        );
    }

    routingCancel(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, routingId: string): RoutingEntity {
        return this.service.cancelRouting(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(routingId || '').trim(),
        );
    }

    productionOrderCreate(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateProductionOrderInput,
    ): ProductionOrderDocumentEntity {
        return this.service.createProductionOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    productionOrderCreateFromBom(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateProductionOrderFromBomInput,
    ): ProductionOrderDocumentEntity {
        return this.service.createProductionOrderFromBom(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    productionOrderUpdate(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdateProductionOrderInput,
    ): ProductionOrderDocumentEntity {
        return this.service.updateProductionOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    productionOrderGetById(authenticatedCompanyId: string, authenticatedBranchId: string, orderId: string): ProductionOrderDocumentEntity {
        return this.service.getProductionOrderById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(orderId || '').trim(),
        );
    }

    productionOrderRelease(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, orderId: string): ProductionOrderDocumentEntity {
        return this.service.releaseProductionOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(orderId || '').trim(),
        );
    }

    productionOrderCancel(authenticatedCompanyId: string, authenticatedBranchId: string, authenticatedUserId: string, orderId: string): Promise<ProductionOrderDocumentEntity> {
        return this.service.cancelProductionOrder(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(orderId || '').trim(),
        );
    }

    productionOrderGetStatusSummary(authenticatedCompanyId: string, authenticatedBranchId: string, orderId: string): ProductionOrderStatusSummary {
        return this.service.getProductionOrderStatusSummary(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(orderId || '').trim(),
        );
    }

    productionOrderGetCostSummary(authenticatedCompanyId: string, authenticatedBranchId: string, orderId: string): ProductionOrderCostSummary {
        return this.service.getProductionOrderCostSummary(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(orderId || '').trim(),
        );
    }

    productionIssueCreate(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateProductionIssueInput,
    ): ProductionIssueEntity {
        return this.service.createProductionIssue(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    productionIssueGetById(authenticatedCompanyId: string, authenticatedBranchId: string, issueId: string): ProductionIssueEntity {
        return this.service.getProductionIssueById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(issueId || '').trim(),
        );
    }

    productionIssuePost(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: { issueId: string; allowOverIssue?: boolean | null },
    ): Promise<ProductionDocumentPostResult> {
        return this.service.postProductionIssue(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    productionIssueCancel(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CancelProductionIssueInput,
    ): Promise<ProductionDocumentCancelResult> {
        return this.service.cancelProductionIssue(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    productionReceiptCreate(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateProductionReceiptInput,
    ): ProductionReceiptEntity {
        return this.service.createProductionReceipt(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    productionReceiptGetById(authenticatedCompanyId: string, authenticatedBranchId: string, receiptId: string): ProductionReceiptEntity {
        return this.service.getProductionReceiptById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(receiptId || '').trim(),
        );
    }

    productionReceiptPost(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: { receiptId: string; allowOverReceipt?: boolean | null },
    ): Promise<ProductionDocumentPostResult> {
        return this.service.postProductionReceipt(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    productionReceiptCancel(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CancelProductionReceiptInput,
    ): Promise<ProductionDocumentCancelResult> {
        return this.service.cancelProductionReceipt(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }
}
