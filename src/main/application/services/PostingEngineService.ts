import { UnitOfWork, JournalRepositoryPort, AccountsRepositoryPort } from '../ports/AccountingPorts';
import { JournalEntry } from '../../domain/aggregates/JournalEntry';
import { JournalLine } from '../../domain/entities/JournalLine';
import { AccountId } from '../../domain/valueObjects/AccountId';
import { DomainError } from '../../domain/errors';
import { DocumentStatus } from '../../domain/entities/DocumentBase';
import { AccountMappingKey } from '../../domain/accountingFoundation/enums/AccountMappingKey';
import { AccountingErrorCode } from '../../domain/accountingFoundation/enums/AccountingErrorCode';

export interface DocumentPostingData {
    companyId: string;
    branchId: string;
    documentType: string;
    documentId: string;
    date: string;
    reference: string;
    notes: string;
    lines: { accountId: string; debit: number; credit: number; memo: string }[];
}

export interface DocumentPostingLineWithMapping {
    mappingKey: AccountMappingKey;
    debit: number;
    credit: number;
    memo: string;
    itemId?: string | null;
    itemGroupId?: string | null;
    warehouseId?: string | null;
    partnerId?: string | null;
    taxProfileId?: string | null;
    lineType?: string | null;
}

export interface DocumentPostingWithResolutionData {
    companyId: string;
    branchId: string;
    documentType: string;
    documentId: string;
    date: string;
    reference: string;
    notes: string;
    lines: DocumentPostingLineWithMapping[];
}

export interface AccountResolutionPort {
    resolveAccounts(
        companyId: string,
        branchId: string,
        payload: {
            documentType: string;
            postingDate: string;
            itemId?: string | null;
            itemGroupId?: string | null;
            warehouseId?: string | null;
            partnerId?: string | null;
            taxProfileId?: string | null;
            lineType?: string | null;
            mappingKeys: AccountMappingKey[];
        }
    ): Promise<{
        isSuccessful: boolean;
        entries: Array<{ mappingKey: AccountMappingKey; accountId: string }>;
        failures: Array<{ mappingKey: AccountMappingKey; errorCode: string; messageKey: string }>;
    }>;
}

export class PostingEngineService {
    constructor(
        private uow: UnitOfWork,
        private journalRepo: JournalRepositoryPort,
        private accountsRepo: AccountsRepositoryPort
    ) { }

    async postDocument(data: DocumentPostingData): Promise<JournalEntry> {
        return this.uow.runInTransaction(async () => {
            const id = this.journalRepo.nextIdentity();
            const num = this.journalRepo.nextNumber(data.companyId);
            const now = new Date().toISOString();

            const journal = new JournalEntry(
                id,
                data.companyId,
                data.branchId,
                num,
                data.date,
                data.reference || `${data.documentType}-${data.documentId}`,
                data.notes,
                DocumentStatus.DRAFT,
                [],
                now,
                now,
                null
            );

            const journalLines: JournalLine[] = [];
            let i = 0;
            for (const line of data.lines) {
                const actId = new AccountId(line.accountId);
                const acct = await this.accountsRepo.getById(data.companyId, actId);
                if (!acct) {
                    throw new DomainError(
                        AccountingErrorCode.ERR_ACCOUNT_MAPPING_NOT_FOUND,
                        `Account ${line.accountId} not found in this company`,
                        { messageKey: 'error.account_resolution.account_not_found' },
                    );
                }
                acct.ensurePostable();

                journalLines.push(new JournalLine(
                    String(Date.now() + i++),
                    id,
                    actId,
                    line.debit,
                    line.credit,
                    line.memo
                ));
            }

            journal.updateLines(journalLines);
            journal.post(); // validates internally

            await this.journalRepo.save(journal);
            return journal;
        });
    }

    async postDocumentWithResolution(
        data: DocumentPostingWithResolutionData,
        resolver: AccountResolutionPort,
    ): Promise<JournalEntry> {
        const resolvedLines: Array<{ accountId: string; debit: number; credit: number; memo: string }> = [];

        for (const line of data.lines) {
            const resolution = await resolver.resolveAccounts(data.companyId, data.branchId, {
                documentType: data.documentType,
                postingDate: data.date,
                itemId: line.itemId || null,
                itemGroupId: line.itemGroupId || null,
                warehouseId: line.warehouseId || null,
                partnerId: line.partnerId || null,
                taxProfileId: line.taxProfileId || null,
                lineType: line.lineType || null,
                mappingKeys: [line.mappingKey],
            });

            if (!resolution.isSuccessful || !resolution.entries.length) {
                const failure = resolution.failures[0];
                throw new DomainError(
                    failure?.errorCode || AccountingErrorCode.ERR_ACCOUNT_MAPPING_NOT_FOUND,
                    `Account resolution failed for ${line.mappingKey}`,
                    { messageKey: failure?.messageKey || 'error.account_resolution.mapping_not_found' },
                );
            }

            resolvedLines.push({
                accountId: resolution.entries[0].accountId,
                debit: line.debit,
                credit: line.credit,
                memo: line.memo,
            });
        }

        return this.postDocument({
            companyId: data.companyId,
            branchId: data.branchId,
            documentType: data.documentType,
            documentId: data.documentId,
            date: data.date,
            reference: data.reference,
            notes: data.notes,
            lines: resolvedLines,
        });
    }
}
