import { DomainError } from '../../domain/errors';
import { JournalEntity } from '../../domain/journalEngine/entities/JournalEntity';
import {
    PostingCommand,
    PostingLineInput,
    PostJournalResult,
    ReverseJournalCommand,
    ReverseJournalResult,
} from '../../domain/journalEngine/types/PostingTypes';
import { JournalEngineService } from '../services/JournalEngineService';

export interface PostJournalInput {
    companyId?: string;
    branchId?: string;
    journalDate: string;
    fiscalPeriodId?: string | null;
    sourceType: string;
    sourceId: string;
    sourceNo?: string | null;
    sourceVersion?: number;
    referenceNo?: string | null;
    description?: string | null;
    currencyCode?: string;
    exchangeRate?: number;
    totalDebit?: number | null;
    totalCredit?: number | null;
    postedBy?: string;
    lines: PostingLineInput[];
}

export interface ReverseJournalInput {
    companyId?: string;
    journalId: string;
    reverseDate: string;
    sourceType?: string | null;
    sourceId?: string | null;
    sourceNo?: string | null;
    sourceVersion?: number;
    referenceNo?: string | null;
    reason?: string | null;
    postedBy?: string;
}

export interface GetBySourceInput {
    companyId?: string;
    sourceType: string;
    sourceId: string;
    sourceVersion?: number | null;
}

export interface JournalLineDto {
    id: string;
    journalId: string;
    lineNo: number;
    accountId: string;
    description: string | null;
    debit: number;
    credit: number;
    currencyCode: string;
    exchangeRate: number;
    baseDebit: number;
    baseCredit: number;
    branchId: string | null;
    costCenterId: string | null;
    expenseTypeId: string | null;
    vehicleId: string | null;
    partnerId: string | null;
    projectId: string | null;
    itemId: string | null;
    warehouseId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface JournalDto {
    id: string;
    companyId: string;
    branchId: string;
    journalNo: string;
    journalDate: string;
    fiscalPeriodId: string;
    sourceType: string;
    sourceId: string;
    sourceNo: string | null;
    sourceVersion: number;
    referenceNo: string | null;
    description: string | null;
    status: 'DRAFT' | 'POSTED' | 'REVERSED';
    currencyCode: string;
    exchangeRate: number;
    totalDebit: number;
    totalCredit: number;
    postedBy: string;
    postedAt: string;
    reversedJournalId: string | null;
    createdAt: string;
    updatedAt: string;
    lines: JournalLineDto[];
}

export class JournalEngineUseCases {
    constructor(private readonly journalEngine: JournalEngineService) {}

    postJournal(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: PostJournalInput,
    ): PostJournalResult {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const command: PostingCommand = {
            companyId,
            branchId: String(input.branchId || authenticatedBranchId || '').trim(),
            journalDate: String(input.journalDate || '').trim(),
            fiscalPeriodId: input.fiscalPeriodId || null,
            sourceType: String(input.sourceType || '').trim(),
            sourceId: String(input.sourceId || '').trim(),
            sourceNo: input.sourceNo || null,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.referenceNo || null,
            description: input.description || null,
            currencyCode: String(input.currencyCode || 'ILS').trim().toUpperCase(),
            exchangeRate: Number(input.exchangeRate || 1),
            totalDebit: input.totalDebit ?? null,
            totalCredit: input.totalCredit ?? null,
            postedBy: String(input.postedBy || authenticatedUserId || '').trim(),
            lines: input.lines || [],
        };
        return this.journalEngine.postJournal(command);
    }

    reverseJournal(
        authenticatedCompanyId: string,
        authenticatedUserId: string,
        input: ReverseJournalInput,
    ): ReverseJournalResult {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const command: ReverseJournalCommand = {
            companyId,
            journalId: String(input.journalId || '').trim(),
            reverseDate: String(input.reverseDate || '').trim(),
            sourceType: input.sourceType || null,
            sourceId: input.sourceId || null,
            sourceNo: input.sourceNo || null,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.referenceNo || null,
            reason: input.reason || null,
            postedBy: String(input.postedBy || authenticatedUserId || '').trim(),
        };
        return this.journalEngine.reverseJournal(command);
    }

    getBySource(authenticatedCompanyId: string, input: GetBySourceInput): JournalDto | null {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const journal = this.journalEngine.getBySource(
            companyId,
            String(input.sourceType || '').trim(),
            String(input.sourceId || '').trim(),
            input.sourceVersion ?? null,
        );
        return journal ? this.toJournalDto(journal) : null;
    }

    getById(authenticatedCompanyId: string, journalId: string): JournalDto | null {
        const normalizedJournalId = String(journalId || '').trim();
        if (!normalizedJournalId) {
            throw new DomainError('ERR_JOURNAL_ID_REQUIRED', 'Journal id is required');
        }
        const journal = this.journalEngine.getById(authenticatedCompanyId, normalizedJournalId);
        return journal ? this.toJournalDto(journal) : null;
    }

    previewValidation(
        authenticatedCompanyId: string,
        authenticatedBranchId: string,
        authenticatedUserId: string,
        input: PostJournalInput,
    ) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        return this.journalEngine.previewValidation({
            companyId,
            branchId: String(input.branchId || authenticatedBranchId || '').trim(),
            journalDate: String(input.journalDate || '').trim(),
            fiscalPeriodId: input.fiscalPeriodId || null,
            sourceType: String(input.sourceType || '').trim(),
            sourceId: String(input.sourceId || '').trim(),
            sourceNo: input.sourceNo || null,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.referenceNo || null,
            description: input.description || null,
            currencyCode: String(input.currencyCode || 'ILS').trim().toUpperCase(),
            exchangeRate: Number(input.exchangeRate || 1),
            totalDebit: input.totalDebit ?? null,
            totalCredit: input.totalCredit ?? null,
            postedBy: String(input.postedBy || authenticatedUserId || '').trim(),
            lines: input.lines || [],
        });
    }

    private assertCompanyScope(authenticatedCompanyId: string, requestedCompanyId?: string): string {
        const normalizedAuthenticated = String(authenticatedCompanyId || '').trim();
        const normalizedRequested = String(requestedCompanyId || '').trim();
        if (normalizedRequested && normalizedRequested !== normalizedAuthenticated) {
            throw new DomainError('INVALID_SCOPE', 'Requested company scope is not allowed');
        }
        return normalizedAuthenticated;
    }

    private toJournalDto(journal: JournalEntity): JournalDto {
        return {
            id: journal.id,
            companyId: journal.companyId,
            branchId: journal.branchId,
            journalNo: journal.journalNo,
            journalDate: journal.journalDate,
            fiscalPeriodId: journal.fiscalPeriodId,
            sourceType: journal.sourceType,
            sourceId: journal.sourceId,
            sourceNo: journal.sourceNo,
            sourceVersion: journal.sourceVersion,
            referenceNo: journal.referenceNo,
            description: journal.description,
            status: journal.status,
            currencyCode: journal.currencyCode,
            exchangeRate: journal.exchangeRate,
            totalDebit: journal.totalDebit,
            totalCredit: journal.totalCredit,
            postedBy: journal.postedBy,
            postedAt: journal.postedAt,
            reversedJournalId: journal.reversedJournalId,
            createdAt: journal.createdAt,
            updatedAt: journal.updatedAt,
            lines: journal.lines.map((line) => ({
                id: line.id,
                journalId: line.journalId,
                lineNo: line.lineNo,
                accountId: line.accountId,
                description: line.description,
                debit: line.debit,
                credit: line.credit,
                currencyCode: line.currencyCode,
                exchangeRate: line.exchangeRate,
                baseDebit: line.baseDebit,
                baseCredit: line.baseCredit,
                branchId: line.branchId,
                costCenterId: line.costCenterId,
                expenseTypeId: line.expenseTypeId,
                vehicleId: line.vehicleId,
                partnerId: line.partnerId,
                projectId: line.projectId,
                itemId: line.itemId,
                warehouseId: line.warehouseId,
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
            })),
        };
    }
}
