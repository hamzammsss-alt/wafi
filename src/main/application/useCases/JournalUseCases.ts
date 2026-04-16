import { UnitOfWork, JournalRepositoryPort, AccountsRepositoryPort, FiscalPeriodPort } from '../ports/AccountingPorts';
import { DomainError } from '../../domain/errors';
import { JournalEntry } from '../../domain/aggregates/JournalEntry';
import { JournalLine } from '../../domain/entities/JournalLine';
import { AccountId } from '../../domain/valueObjects/AccountId';
import { DocumentStatus } from '../../domain/entities/DocumentBase';

export class JournalUseCases {
    constructor(
        private uow: UnitOfWork,
        private journalRepo: JournalRepositoryPort,
        private accountsRepo: AccountsRepositoryPort,
        private fiscalPort: FiscalPeriodPort
    ) { }

    async createDraft(companyId: string, branchId: string): Promise<JournalEntry> {
        return this.uow.runInTransaction(async () => {
            const id = this.journalRepo.nextIdentity();
            const num = this.journalRepo.nextNumber(companyId);
            const now = new Date().toISOString();
            const journal = new JournalEntry(id, companyId, branchId, num, now.split('T')[0], '', '', DocumentStatus.DRAFT, [], now, now, null);
            await this.journalRepo.save(journal);
            return journal;
        });
    }

    async saveDraft(companyId: string, id: string, header: any, lines: any[]): Promise<JournalEntry> {
        return this.uow.runInTransaction(async () => {
            const journal = await this.journalRepo.getById(companyId, id);
            if (!journal) throw new DomainError('NOT_FOUND', 'Journal not found');

            for (const line of lines) {
                const actId = new AccountId(line.accountId.value || line.accountId);
                const acct = await this.accountsRepo.getById(companyId, actId);
                if (!acct) throw new DomainError('VALIDATION_ERROR', `Account ${actId.value} not found in this company`);
                acct.ensurePostable();
            }

            journal.updateHeader(header.date, header.reference, header.notes);

            const defaultBranchId = this.normalizeNullable(header?.branchId) || journal.branchId;
            const domainLines = lines.map((l: any, index: number) => {
                const lineId = this.normalizeNullable(l?.id) || `${journal.id}-${index + 1}`;
                const accountId = new AccountId(l.accountId.value || l.accountId);
                return new JournalLine(
                    lineId,
                    journal.id,
                    accountId,
                    this.toNumber(l.debit),
                    this.toNumber(l.credit),
                    String(l.memo || ''),
                    this.normalizeNullable(l.currencyId),
                    this.toOptionalNumber(l.exchangeRate),
                    this.toOptionalNumber(l.foreignDebit),
                    this.toOptionalNumber(l.foreignCredit),
                    this.normalizeNullable(l.branchId) || defaultBranchId,
                    this.normalizeNullable(l.costCenterId),
                    this.normalizeNullable(l.expenseTypeId),
                    this.normalizeNullable(l.vehicleId),
                    this.normalizeNullable(l.partnerId),
                    this.normalizeNullable(l.projectId),
                );
            });
            journal.updateLines(domainLines);
            journal.validate();

            await this.journalRepo.save(journal);
            return journal;
        });
    }

    async postJournal(companyId: string, id: string): Promise<JournalEntry> {
        return this.uow.runInTransaction(async () => {
            const journal = await this.journalRepo.getById(companyId, id);
            if (!journal) throw new DomainError('NOT_FOUND', 'Journal not found');

            await this.fiscalPort.ensureIsOpen(companyId, journal.date);

            journal.post();
            await this.journalRepo.save(journal);
            return journal;
        });
    }

    async get(companyId: string, id: string) { return this.journalRepo.getById(companyId, id); }
    async list(companyId: string, cursor?: any) { return this.journalRepo.list(companyId, cursor); }

    private normalizeNullable(value: unknown): string | null {
        const normalized = String(value || '').trim();
        return normalized || null;
    }

    private toNumber(value: unknown): number {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric)) return 0;
        return numeric;
    }

    private toOptionalNumber(value: unknown): number | undefined {
        const normalized = this.normalizeNullable(value);
        if (!normalized) return undefined;
        const numeric = Number(normalized);
        return Number.isFinite(numeric) ? numeric : undefined;
    }
}
