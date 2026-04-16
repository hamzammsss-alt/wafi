import { Account } from '../../domain/entities/Account';
import { JournalEntry } from '../../domain/aggregates/JournalEntry';
import { AccountId } from '../../domain/valueObjects/AccountId';

export interface Cursor { createdAt: string; id: string; }
export interface PagedResult<T> { rows: T[]; nextCursor: Cursor | null; }

export interface UnitOfWork { runInTransaction<T>(work: () => Promise<T>): Promise<T>; }

export interface AccountsRepositoryPort {
    nextIdentity(): AccountId;
    save(account: Account): Promise<void>;
    getById(companyId: string, id: AccountId): Promise<Account | null>;
    list(companyId: string): Promise<Account[]>;
}

export interface JournalRepositoryPort {
    nextIdentity(): string;
    nextNumber(companyId: string): string;
    save(journal: JournalEntry): Promise<void>;
    getById(companyId: string, id: string): Promise<JournalEntry | null>;
    list(companyId: string, cursor?: Cursor, limit?: number): Promise<PagedResult<JournalEntry>>;
}

export interface FiscalPeriodPort {
    ensureIsOpen(companyId: string, date: string): Promise<void>;
}
