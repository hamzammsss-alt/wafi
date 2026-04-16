import { FinancialAccountRole } from '../enums/FinancialAccountRole';
import { FinancialDefinitionOwnerType } from '../enums/FinancialDefinitionOwnerType';

export interface CreateFinancialDefinitionInput {
    companyId: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    accountRole: FinancialAccountRole;
    accountId: string;
    notes?: string | null;
    isActive?: boolean;
    allowInactiveAccount?: boolean;
}
