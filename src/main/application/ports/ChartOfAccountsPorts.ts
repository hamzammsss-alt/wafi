import { SeedDuplicateStrategy } from '../dtos/ChartOfAccountsDtos';
import { AccountEntity } from '../../domain/chartOfAccounts/entities/AccountEntity';
import { AccountCategory } from '../../domain/chartOfAccounts/enums/AccountCategory';
import { SeedAccount } from '../../domain/chartOfAccounts/types/SeedAccount';

export interface AccountListQuery {
    includeInactive: boolean;
    search: string | null;
    category: AccountCategory | null;
    posting: 'ALL' | 'POSTING' | 'HEADER';
}

export interface SeedDefaultChartResult {
    inserted: number;
    skipped: number;
    total: number;
}

export interface AccountTreeNodeEntity {
    account: AccountEntity;
    children: AccountTreeNodeEntity[];
}

export interface ChartOfAccountsRepositoryPort {
    nextIdentity(): string;

    createAccount(account: AccountEntity): Promise<void>;
    updateAccount(account: AccountEntity): Promise<void>;
    findById(companyId: string, id: string): Promise<AccountEntity | null>;
    findByCode(companyId: string, code: string): Promise<AccountEntity | null>;
    findBySystemTag(companyId: string, systemTag: string): Promise<AccountEntity | null>;
    hasChildren(companyId: string, accountId: string): Promise<boolean>;
    listFlatAccounts(companyId: string, query: AccountListQuery): Promise<AccountEntity[]>;
    listAccountTree(companyId: string, query: AccountListQuery): Promise<AccountTreeNodeEntity[]>;

    seedDefaultChartOfAccounts(
        companyId: string,
        seed: SeedAccount[],
        strategy: SeedDuplicateStrategy,
    ): Promise<SeedDefaultChartResult>;
}

export interface ChartOfAccountsSeedPort {
    seedDefaultChartOfAccounts(
        companyId: string,
        strategy: SeedDuplicateStrategy,
    ): Promise<SeedDefaultChartResult>;
}
