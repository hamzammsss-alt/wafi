import { JournalEntity } from '../../domain/journalEngine/entities/JournalEntity';
import { JournalLineEntity } from '../../domain/journalEngine/entities/JournalLineEntity';
import { JournalStatus } from '../../domain/journalEngine/types/JournalStatus';

export interface AccountPostingValidationState {
    accountId: string;
    exists: boolean;
    isActive: boolean;
    isPosting: boolean;
    accountCode: string | null;
    accountName: string | null;
}

export interface PostingRegistryRecord {
    id: string;
    companyId: string;
    sourceType: string;
    sourceId: string;
    sourceVersion: number;
    journalId: string;
    postingHash: string;
    createdAt: string;
}

export interface JournalHeaderRepositoryPort {
    nextIdentity(): string;
    nextJournalNo(companyId: string, journalDate: string): string;
    insert(journal: JournalEntity): void;
    getById(companyId: string, journalId: string): JournalEntity | null;
    getBySource(companyId: string, sourceType: string, sourceId: string, sourceVersion?: number | null): JournalEntity | null;
    updateReversalLink(companyId: string, journalId: string, reversedJournalId: string, status: JournalStatus): void;
}

export interface JournalLineRepositoryPort {
    nextIdentity(): string;
    insertMany(lines: JournalLineEntity[]): void;
    listByJournalId(journalId: string): JournalLineEntity[];
}

export interface PostingRegistryRepositoryPort {
    nextIdentity(): string;
    findBySource(companyId: string, sourceType: string, sourceId: string, sourceVersion: number): PostingRegistryRecord | null;
    insert(record: PostingRegistryRecord): void;
}

export interface FiscalPeriodRepositoryPort {
    resolveOpenPeriodId(companyId: string, journalDate: string): string | null;
}

export interface AccountLookupRepositoryPort {
    getPostingValidationState(companyId: string, accountId: string): AccountPostingValidationState;
}
