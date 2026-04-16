import { DomainError } from '../../errors';
import { Account } from '../entities/Account';
import { AccountMappingKey } from '../enums/AccountMappingKey';
import { AccountingErrorCode } from '../enums/AccountingErrorCode';
import { AccountType } from '../enums/AccountType';

const ALLOWED_ACCOUNT_TYPES_BY_MAPPING: Record<AccountMappingKey, AccountType[]> = {
    [AccountMappingKey.RECEIVABLE]: [AccountType.ASSET],
    [AccountMappingKey.PAYABLE]: [AccountType.LIABILITY],
    [AccountMappingKey.REVENUE]: [AccountType.REVENUE],
    [AccountMappingKey.EXPENSE]: [AccountType.EXPENSE],
    [AccountMappingKey.INVENTORY]: [AccountType.ASSET],
    [AccountMappingKey.COGS]: [AccountType.EXPENSE],
    [AccountMappingKey.TAX_PAYABLE]: [AccountType.LIABILITY],
    [AccountMappingKey.TAX_RECEIVABLE]: [AccountType.ASSET],
    [AccountMappingKey.DISCOUNT]: [AccountType.REVENUE, AccountType.EXPENSE],
    [AccountMappingKey.ROUNDING]: [AccountType.REVENUE, AccountType.EXPENSE],
};

export class FinancialDefinitionPolicy {
    static normalizeQualifier(input: string | null | undefined): string | null {
        const normalized = String(input || '').trim().toUpperCase();
        return normalized || null;
    }

    static assertMappingAccountCompatibility(mappingKey: AccountMappingKey, account: Account): void {
        const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_MAPPING[mappingKey] || [];
        if (allowedTypes.includes(account.accountType)) {
            return;
        }

        throw new DomainError(
            AccountingErrorCode.ERR_ACCOUNT_MAPPING_TYPE_MISMATCH,
            `Account type ${account.accountType} is invalid for mapping ${mappingKey}`,
            { messageKey: 'error.financial_definition.account_type.invalid_for_mapping' },
        );
    }
}
