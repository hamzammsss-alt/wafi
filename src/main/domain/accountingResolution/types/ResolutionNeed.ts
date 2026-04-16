import { FinancialAccountRole } from '../enums/FinancialAccountRole';

export interface ResolutionNeed {
    requiredRoles: FinancialAccountRole[];
    optionalRoles?: FinancialAccountRole[];
}
