import { DomainError } from '../../domain/errors';
import { AccountMappingKey } from '../../domain/accountingFoundation/enums/AccountMappingKey';
import { AccountingErrorCode } from '../../domain/accountingFoundation/enums/AccountingErrorCode';
import { AccountResolutionPort } from './PostingEngineService';

export interface DocumentResolutionContext {
    companyId: string;
    branchId: string;
    postingDate: string;
    itemId?: string | null;
    itemGroupId?: string | null;
    warehouseId?: string | null;
    partnerId?: string | null;
    taxProfileId?: string | null;
    lineType?: string | null;
}

export interface SalesInvoiceResolutionInput extends DocumentResolutionContext {
    includeDiscount: boolean;
    includeRounding: boolean;
}

export interface PurchaseInvoiceResolutionInput extends DocumentResolutionContext {
    expenseRecognition: 'EXPENSE' | 'INVENTORY';
    includeRounding: boolean;
}

export interface ResolvedAccountMappingSet {
    byMappingKey: Partial<Record<AccountMappingKey, string>>;
}

export class DocumentAccountResolutionService {
    constructor(private readonly resolver: AccountResolutionPort) { }

    async resolveSalesInvoiceAccounts(input: SalesInvoiceResolutionInput): Promise<ResolvedAccountMappingSet> {
        const requiredMappings: AccountMappingKey[] = [
            AccountMappingKey.RECEIVABLE,
            AccountMappingKey.REVENUE,
            AccountMappingKey.TAX_PAYABLE,
        ];
        if (input.includeDiscount) {
            requiredMappings.push(AccountMappingKey.DISCOUNT);
        }
        if (input.includeRounding) {
            requiredMappings.push(AccountMappingKey.ROUNDING);
        }

        return this.resolveRequiredMappings('SALES_INVOICE', input, requiredMappings);
    }

    async resolvePurchaseInvoiceAccounts(input: PurchaseInvoiceResolutionInput): Promise<ResolvedAccountMappingSet> {
        const requiredMappings: AccountMappingKey[] = [
            AccountMappingKey.PAYABLE,
            input.expenseRecognition === 'INVENTORY'
                ? AccountMappingKey.INVENTORY
                : AccountMappingKey.EXPENSE,
            AccountMappingKey.TAX_RECEIVABLE,
        ];
        if (input.includeRounding) {
            requiredMappings.push(AccountMappingKey.ROUNDING);
        }

        return this.resolveRequiredMappings('PURCHASE_INVOICE', input, requiredMappings);
    }

    private async resolveRequiredMappings(
        documentType: string,
        input: DocumentResolutionContext,
        requiredMappings: AccountMappingKey[],
    ): Promise<ResolvedAccountMappingSet> {
        const resolution = await this.resolver.resolveAccounts(input.companyId, input.branchId, {
            documentType,
            postingDate: input.postingDate,
            itemId: input.itemId || null,
            itemGroupId: input.itemGroupId || null,
            warehouseId: input.warehouseId || null,
            partnerId: input.partnerId || null,
            taxProfileId: input.taxProfileId || null,
            lineType: input.lineType || null,
            mappingKeys: requiredMappings,
        });

        if (!resolution.isSuccessful) {
            const firstFailure = resolution.failures[0];
            throw new DomainError(
                firstFailure?.errorCode || AccountingErrorCode.ERR_ACCOUNT_MAPPING_NOT_FOUND,
                `Account resolution failed for ${documentType}`,
                {
                    messageKey: firstFailure?.messageKey || 'error.account_resolution.mapping_not_found',
                    documentType,
                    failures: resolution.failures,
                },
            );
        }

        const byMappingKey: Partial<Record<AccountMappingKey, string>> = {};
        for (const entry of resolution.entries) {
            byMappingKey[entry.mappingKey] = entry.accountId;
        }

        for (const requiredMapping of requiredMappings) {
            if (!byMappingKey[requiredMapping]) {
                throw new DomainError(
                    AccountingErrorCode.ERR_ACCOUNT_MAPPING_NOT_FOUND,
                    `Missing resolved mapping ${requiredMapping} for ${documentType}`,
                    {
                        messageKey: 'error.account_resolution.mapping_not_found',
                        mappingKey: requiredMapping,
                        documentType,
                    },
                );
            }
        }

        return { byMappingKey };
    }
}
