import { AccountStatus } from '../../domain/accountingFoundation/entities/Account';
import { AccountMappingKey } from '../../domain/accountingFoundation/enums/AccountMappingKey';
import { AccountCategory } from '../../domain/accountingFoundation/enums/AccountCategory';
import { AccountCurrencyBehavior } from '../../domain/accountingFoundation/enums/AccountCurrencyBehavior';
import { AccountReferenceType } from '../../domain/accountingFoundation/enums/AccountReferenceType';
import { AccountScopeType } from '../../domain/accountingFoundation/enums/AccountScopeType';
import { AccountSubtype } from '../../domain/accountingFoundation/enums/AccountSubtype';
import { AccountType } from '../../domain/accountingFoundation/enums/AccountType';
import { FinancialDefinitionScopeType } from '../../domain/accountingFoundation/enums/FinancialDefinitionScopeType';

export interface AccountDto {
    id: string;
    companyId: string;
    branchId: string | null;
    accountCode: string;
    name: string;
    parentId: string | null;
    level: number;
    accountType: AccountType;
    accountCategory: AccountCategory;
    accountSubtype: AccountSubtype;
    postingAllowed: boolean;
    currencyBehavior: AccountCurrencyBehavior;
    currencyCode: string | null;
    referenceType: AccountReferenceType;
    scopeType: AccountScopeType;
    status: AccountStatus;
    requiresCostCenter: boolean;
    requiresAnalysisCode: boolean;
}

export interface AccountTreeNodeDto extends AccountDto {
    children: AccountTreeNodeDto[];
}

export interface SaveAccountInput {
    id?: string;
    accountCode: string;
    name: string;
    parentId?: string | null;
    accountType: AccountType;
    accountCategory: AccountCategory;
    accountSubtype: AccountSubtype;
    postingAllowed: boolean;
    currencyBehavior: AccountCurrencyBehavior;
    currencyCode?: string | null;
    referenceType?: AccountReferenceType;
    scopeType: AccountScopeType;
    branchId?: string | null;
    status: AccountStatus;
    requiresCostCenter?: boolean;
    requiresAnalysisCode?: boolean;
}

export interface FinancialDefinitionDto {
    id: string;
    companyId: string;
    branchId: string | null;
    scopeType: FinancialDefinitionScopeType;
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

export interface SaveFinancialDefinitionInput {
    id?: string;
    scopeType: FinancialDefinitionScopeType;
    scopeId: string;
    mappingKey: AccountMappingKey;
    accountId: string;
    priority?: number;
    isActive?: boolean;
    validFrom?: string | null;
    validTo?: string | null;
    branchId?: string | null;
    documentType?: string | null;
    lineType?: string | null;
    taxProfileId?: string | null;
}

export interface ResolveAccountsInput {
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
