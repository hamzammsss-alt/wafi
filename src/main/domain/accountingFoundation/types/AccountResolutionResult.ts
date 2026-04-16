import { AccountMappingKey } from '../enums/AccountMappingKey';
import { AccountingErrorCode } from '../enums/AccountingErrorCode';
import { FinancialDefinitionScopeType } from '../enums/FinancialDefinitionScopeType';

export interface ResolvedAccountEntry {
    mappingKey: AccountMappingKey;
    accountId: string;
    accountCode: string;
    accountName: string;
    definitionId: string;
    sourceScopeType: FinancialDefinitionScopeType;
    sourceScopeId: string;
    sourceBranchId: string | null;
    qualifierScore: number;
    trace: string[];
}

export interface AccountResolutionFailure {
    mappingKey: AccountMappingKey;
    errorCode: AccountingErrorCode;
    messageKey: string;
    trace: string[];
}

export interface AccountResolutionResult {
    isSuccessful: boolean;
    entries: ResolvedAccountEntry[];
    failures: AccountResolutionFailure[];
}
