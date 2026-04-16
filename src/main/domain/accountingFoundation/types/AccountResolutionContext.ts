import { AccountMappingKey } from '../enums/AccountMappingKey';

export interface AccountResolutionContext {
    documentType: string;
    companyId: string;
    branchId: string | null;
    postingDate: string;
    itemId: string | null;
    itemGroupId: string | null;
    warehouseId: string | null;
    partnerId: string | null;
    taxProfileId: string | null;
    lineType: string | null;
    mappingKeys: AccountMappingKey[];
}

