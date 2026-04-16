import {
    CreateInventoryDocumentInput,
    InventoryDocumentEntity,
    InventoryDocumentPostingStatus,
    ReverseInventoryDocumentCommand,
    UpdateInventoryDocumentInput,
} from '../../domain/inventoryDocuments/types/InventoryDocumentTypes';
import {
    InventoryDocumentService,
    PostInventoryDocumentResult,
    ReverseInventoryDocumentResult,
} from '../services/InventoryDocumentService';

export class InventoryDocumentUseCases {
    constructor(private readonly service: InventoryDocumentService) {}

    create(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateInventoryDocumentInput,
    ): InventoryDocumentEntity {
        return this.service.createDocument(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    update(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: UpdateInventoryDocumentInput,
    ): InventoryDocumentEntity {
        return this.service.updateDocument(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            input,
        );
    }

    getById(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): InventoryDocumentEntity {
        return this.service.getById(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    post(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        documentId: string,
    ): Promise<PostInventoryDocumentResult> {
        return this.service.post(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }

    reverse(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: ReverseInventoryDocumentCommand,
    ): ReverseInventoryDocumentResult {
        return this.service.reverse(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
                userId: String(authenticatedUserId || '').trim(),
            },
            {
                documentId: String(input?.documentId || '').trim(),
                reverseDate: String(input?.reverseDate || '').trim(),
                reason: input?.reason || null,
            },
        );
    }

    getPostingStatus(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        documentId: string,
    ): InventoryDocumentPostingStatus {
        return this.service.getPostingStatus(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }
}
