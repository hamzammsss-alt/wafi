export type FinancialScopeType = 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER';
export type AccountMappingKey =
    | 'RECEIVABLE'
    | 'PAYABLE'
    | 'REVENUE'
    | 'EXPENSE'
    | 'INVENTORY'
    | 'COGS'
    | 'TAX_PAYABLE'
    | 'TAX_RECEIVABLE'
    | 'DISCOUNT'
    | 'ROUNDING';

export interface FinancialDefinitionRowDto {
    id: string;
    companyId: string;
    branchId: string | null;
    scopeType: FinancialScopeType;
    scopeId: string;
    mappingKey: AccountMappingKey;
    accountId: string;
    priority: number;
    isActive: boolean;
    validFrom: string | null;
    validTo: string | null;
    documentType: string | null;
    lineType: string | null;
    taxProfileId: string | null;
    updatedAt: string | null;
}

export interface FinancialDefinitionFormModel {
    id?: string;
    scopeType: FinancialScopeType;
    scopeId: string;
    mappingKey: AccountMappingKey;
    accountId: string;
    priority: number;
    isActive: boolean;
    validFrom: string;
    validTo: string;
    branchId: string;
    documentType: string;
    lineType: string;
    taxProfileId: string;
}

export interface FinancialDefinitionQueryInput {
    searchText: string;
    scopeType: FinancialScopeType | 'ALL';
    mappingKey: AccountMappingKey | 'ALL';
    includeInactive: boolean;
}

export type FinancialDefinitionErrors = Partial<Record<
    | 'scopeId'
    | 'mappingKey'
    | 'accountId'
    | 'branchId'
    | 'validRange',
    string
>>;

export interface PostableAccountOption {
    id: string;
    accountCode: string;
    name: string;
}

