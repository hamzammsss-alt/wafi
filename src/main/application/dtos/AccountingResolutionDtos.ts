import { FinancialDefinitionOwnerType } from '../../domain/accountingResolution/enums/FinancialDefinitionOwnerType';
import { FinancialAccountRole } from '../../domain/accountingResolution/enums/FinancialAccountRole';
import { ResolutionDirection } from '../../domain/accountingResolution/enums/ResolutionDirection';
import { AccountResolutionResult } from '../../domain/accountingResolution/types/AccountResolutionResult';

export interface FinancialDefinitionDto {
    id: string;
    companyId: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    accountRole: FinancialAccountRole;
    accountId: string;
    accountCode: string | null;
    accountName: string | null;
    notes: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ListFinancialDefinitionsByOwnerInput {
    companyId: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    includeInactive?: boolean;
}

export interface UpsertFinancialDefinitionInput {
    id?: string;
    companyId: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    accountRole: FinancialAccountRole;
    accountId: string;
    notes?: string | null;
    isActive?: boolean;
    allowInactiveAccount?: boolean;
}

export interface BulkSaveFinancialDefinitionsForOwnerInput {
    companyId: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    definitions: Array<{
        id?: string;
        accountRole: FinancialAccountRole;
        accountId: string;
        notes?: string | null;
        isActive?: boolean;
        allowInactiveAccount?: boolean;
    }>;
    deactivateMissing?: boolean;
}

export interface BulkSaveFinancialDefinitionsForOwnerResult {
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    saved: FinancialDefinitionDto[];
    deactivatedCount: number;
}

export interface DeactivateFinancialDefinitionInput {
    companyId: string;
    id: string;
}

export interface ResolveAccountsInput {
    companyId: string;
    branchId?: string | null;
    documentType: string;
    documentId?: string | null;
    lineType?: string | null;
    itemId?: string | null;
    itemGroupId?: string | null;
    warehouseId?: string | null;
    partnerId?: string | null;
    taxProfileId?: string | null;
    isService?: boolean;
    inventoryMode?: string | null;
    requiresInventory?: boolean;
    requiresTax?: boolean;
    currencyCode?: string | null;
    direction?: ResolutionDirection | null;
    requiredRoles: FinancialAccountRole[];
    optionalRoles?: FinancialAccountRole[];
}

export interface ResolutionPreviewInput {
    companyId: string;
    branchId?: string | null;
    documentType?: string;
    lineType?: string | null;
    itemId?: string | null;
    itemGroupId?: string | null;
    warehouseId?: string | null;
    partnerId?: string | null;
    taxProfileId?: string | null;
    isService?: boolean;
    requiresInventory?: boolean;
    requiresTax?: boolean;
    currencyCode?: string | null;
}

export interface ResolveAccountsOutput extends AccountResolutionResult {}
