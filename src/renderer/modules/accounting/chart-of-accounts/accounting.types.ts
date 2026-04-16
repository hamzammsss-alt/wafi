export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type CurrencyBehavior = 'BASE_ONLY' | 'FIXED_CURRENCY' | 'MULTI_CURRENCY';
export type ScopeType = 'COMPANY' | 'BRANCH';
export type AccountReferenceType = 'NONE' | 'USER' | 'GUIDE' | 'BANK_CHEQUE' | 'FIXED_ASSET';

export interface AccountRowDto {
    id: string;
    companyId: string;
    branchId: string | null;
    accountCode: string;
    name: string;
    parentId: string | null;
    level: number;
    accountType: AccountType;
    accountCategory: string;
    accountSubtype: string;
    postingAllowed: boolean;
    currencyBehavior: CurrencyBehavior;
    currencyCode: string | null;
    referenceType: AccountReferenceType;
    scopeType: ScopeType;
    status: AccountStatus;
    requiresCostCenter: boolean;
    requiresAnalysisCode: boolean;
}

export interface AccountTreeNode extends AccountRowDto {
    children: AccountTreeNode[];
}

export interface AccountQueryInput {
    searchText: string;
    category: string | 'ALL';
    structure: 'ALL' | 'POSTING' | 'HEADER';
    includeInactive: boolean;
}

export interface CreateAccountInput {
    accountCode: string;
    name: string;
    parentId?: string | null;
    accountType: AccountType;
    accountCategory: string;
    accountSubtype: string;
    postingAllowed: boolean;
    currencyBehavior: CurrencyBehavior;
    currencyCode?: string | null;
    referenceType?: AccountReferenceType;
    scopeType: ScopeType;
    branchId?: string | null;
    status: AccountStatus;
    requiresCostCenter?: boolean;
    requiresAnalysisCode?: boolean;
}

export interface UpdateAccountInput extends CreateAccountInput {
    id: string;
}

export interface AccountFormModel {
    id?: string;
    accountCode: string;
    name: string;
    parentId: string | null;
    accountType: AccountType;
    accountCategory: string;
    accountSubtype: string;
    postingAllowed: boolean;
    currencyBehavior: CurrencyBehavior;
    currencyCode: string;
    referenceType: AccountReferenceType;
    scopeType: ScopeType;
    branchId: string;
    status: AccountStatus;
    requiresCostCenter: boolean;
    requiresAnalysisCode: boolean;
}

export interface FlattenedAccountRow {
    node: AccountTreeNode;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
}

export type AccountFormErrors = Partial<Record<
    | 'accountCode'
    | 'name'
    | 'parentId'
    | 'accountType'
    | 'accountCategory'
    | 'accountSubtype'
    | 'currencyCode'
    | 'branchId',
    string
>>;

