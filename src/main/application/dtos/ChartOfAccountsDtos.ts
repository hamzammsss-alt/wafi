import { AccountCategory } from '../../domain/chartOfAccounts/enums/AccountCategory';
import { AccountSubtype } from '../../domain/chartOfAccounts/enums/AccountSubtype';
import { NormalBalance } from '../../domain/chartOfAccounts/enums/NormalBalance';

export type PostingFilter = 'ALL' | 'POSTING' | 'HEADER';
export type SeedDuplicateStrategy = 'skip' | 'fail';

export interface AccountQueryInput {
    includeInactive?: boolean;
    search?: string;
    category?: AccountCategory | 'ALL';
    posting?: PostingFilter;
}

export interface AccountRowDto {
    id: string;
    companyId: string;
    code: string;
    name: string;
    category: AccountCategory;
    subtype: AccountSubtype;
    parentId: string | null;
    parentCode: string | null;
    isPosting: boolean;
    normalBalance: NormalBalance;
    systemTag: string | null;
    allowManualEntry: boolean;
    isActive: boolean;
    level: number;
    path: string;
    createdAt: string;
    updatedAt: string;
    notes?: string | null;
}

export interface AccountTreeNode extends AccountRowDto {
    children: AccountTreeNode[];
}

export interface CreateAccountInput {
    companyId: string;
    code: string;
    name: string;
    category: AccountCategory;
    subtype: AccountSubtype;
    parentCode?: string | null;
    isPosting: boolean;
    normalBalance: NormalBalance;
    systemTag?: string | null;
    allowManualEntry: boolean;
    isActive: boolean;
    notes?: string | null;
}

export interface UpdateAccountInput extends CreateAccountInput {
    id: string;
}

export interface SeedDefaultChartInput {
    companyId: string;
    strategy?: SeedDuplicateStrategy;
}

export interface SeedDefaultChartResultDto {
    companyId: string;
    strategy: SeedDuplicateStrategy;
    inserted: number;
    skipped: number;
    total: number;
}
