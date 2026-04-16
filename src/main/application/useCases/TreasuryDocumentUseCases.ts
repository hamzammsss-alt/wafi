import {
    CreateTreasuryDocumentInput,
    ReverseTreasuryDocumentCommand,
    TreasuryDocumentEntity,
    TreasuryDocumentPostingStatus,
    UpdateTreasuryDocumentInput,
} from '../../domain/treasury/types/TreasuryTypes';
import {
    PostTreasuryDocumentResult,
    ReverseTreasuryDocumentResult,
    TreasuryDocumentService,
} from '../services/TreasuryDocumentService';

export class TreasuryDocumentUseCases {
    constructor(private readonly service: TreasuryDocumentService) {}

    create(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: CreateTreasuryDocumentInput,
    ): TreasuryDocumentEntity {
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
        input: UpdateTreasuryDocumentInput,
    ): TreasuryDocumentEntity {
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
    ): TreasuryDocumentEntity {
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
    ): Promise<PostTreasuryDocumentResult> {
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
        input: ReverseTreasuryDocumentCommand,
    ): Promise<ReverseTreasuryDocumentResult> {
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
    ): TreasuryDocumentPostingStatus {
        return this.service.getPostingStatus(
            {
                companyId: String(authenticatedCompanyId || '').trim(),
                branchId: String(authenticatedBranchId || '').trim(),
            },
            String(documentId || '').trim(),
        );
    }
}