import { Account } from '../../domain/accountingFoundation/entities/Account';
import { FinancialDefinition } from '../../domain/accountingFoundation/entities/FinancialDefinition';
import { AccountMappingKey } from '../../domain/accountingFoundation/enums/AccountMappingKey';

export interface SaveAccountOptions {
    hasChildren?: boolean;
    hasReferences?: boolean;
}

export interface ResolutionDefinitionQuery {
    companyId: string;
    branchId: string | null;
    postingDate: string;
    mappingKeys: AccountMappingKey[];
    documentType: string;
    lineType: string | null;
    taxProfileId: string | null;
    itemId: string | null;
    itemGroupId: string | null;
    warehouseId: string | null;
    partnerId: string | null;
}

export interface AccountRepositoryPort {
    nextIdentity(): string;
    getById(companyId: string, accountId: string): Promise<Account | null>;
    getByCode(companyId: string, accountCode: string): Promise<Account | null>;
    getByIds(companyId: string, accountIds: string[]): Promise<Account[]>;
    list(companyId: string, includeInactive: boolean): Promise<Account[]>;
    save(account: Account): Promise<void>;
    delete(companyId: string, accountId: string): Promise<void>;
    hasChildren(companyId: string, accountId: string): Promise<boolean>;
    hasReferences(companyId: string, accountId: string): Promise<boolean>;
    getPostable(companyId: string): Promise<Account[]>;
}

export interface FinancialDefinitionRepositoryPort {
    nextIdentity(): string;
    getDefinitionById(companyId: string, definitionId: string): Promise<FinancialDefinition | null>;
    listDefinitions(companyId: string, includeInactive: boolean): Promise<FinancialDefinition[]>;
    listForResolution(query: ResolutionDefinitionQuery): Promise<FinancialDefinition[]>;
    saveDefinition(definition: FinancialDefinition): Promise<void>;
    deactivateActiveDuplicates(input: {
        companyId: string;
        branchId: string | null;
        scopeType: string;
        scopeId: string;
        mappingKey: string;
        documentType: string | null;
        lineType: string | null;
        taxProfileId: string | null;
        excludeId: string;
    }): Promise<void>;
    deleteDefinition(companyId: string, definitionId: string): Promise<void>;
}
