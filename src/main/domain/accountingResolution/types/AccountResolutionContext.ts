import { ResolutionDirection } from '../enums/ResolutionDirection';

export interface AccountResolutionContext {
    companyId: string;
    branchId: string | null;
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
}
