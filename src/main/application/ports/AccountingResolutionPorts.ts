import { FinancialDefinitionEntity } from '../../domain/accountingResolution/entities/FinancialDefinitionEntity';
import { FinancialAccountRole } from '../../domain/accountingResolution/enums/FinancialAccountRole';
import { FinancialDefinitionOwnerType } from '../../domain/accountingResolution/enums/FinancialDefinitionOwnerType';

export interface ResolutionDefinitionOwnerCandidate {
    ownerType: FinancialDefinitionOwnerType;
    ownerIds: string[];
}

export interface ResolveDefinitionsByOwnersQuery {
    companyId: string;
    owners: ResolutionDefinitionOwnerCandidate[];
    accountRoles: FinancialAccountRole[];
    includeInactive?: boolean;
}

export interface ResolutionAccountLookup {
    id: string;
    companyId: string;
    code: string;
    name: string;
    isPosting: boolean;
    isActive: boolean;
    systemTag: string | null;
    allowManualEntry: boolean;
}

export interface FinancialDefinitionRepositoryPort {
    nextIdentity(): string;

    createFinancialDefinition(definition: FinancialDefinitionEntity): Promise<void>;
    updateFinancialDefinition(definition: FinancialDefinitionEntity): Promise<void>;
    deactivateFinancialDefinition(companyId: string, id: string): Promise<void>;

    listFinancialDefinitionsByOwner(
        companyId: string,
        ownerType: FinancialDefinitionOwnerType,
        ownerId: string,
        includeInactive: boolean,
    ): Promise<FinancialDefinitionEntity[]>;

    listDefinitionsByCompany(companyId: string, includeInactive: boolean): Promise<FinancialDefinitionEntity[]>;

    findFinancialDefinition(companyId: string, id: string): Promise<FinancialDefinitionEntity | null>;
    findFinancialDefinitionByOwnerRole(
        companyId: string,
        ownerType: FinancialDefinitionOwnerType,
        ownerId: string,
        accountRole: FinancialAccountRole,
    ): Promise<FinancialDefinitionEntity | null>;

    resolveDefinitionsByOwners(query: ResolveDefinitionsByOwnersQuery): Promise<FinancialDefinitionEntity[]>;

    getAccountById(companyId: string, accountId: string): Promise<ResolutionAccountLookup | null>;
    getAccountsByIds(companyId: string, accountIds: string[]): Promise<ResolutionAccountLookup[]>;
}
