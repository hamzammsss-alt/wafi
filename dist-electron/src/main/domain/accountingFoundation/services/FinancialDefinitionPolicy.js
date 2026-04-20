"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialDefinitionPolicy = void 0;
const errors_1 = require("../../errors");
const AccountMappingKey_1 = require("../enums/AccountMappingKey");
const AccountingErrorCode_1 = require("../enums/AccountingErrorCode");
const AccountType_1 = require("../enums/AccountType");
const ALLOWED_ACCOUNT_TYPES_BY_MAPPING = {
    [AccountMappingKey_1.AccountMappingKey.RECEIVABLE]: [AccountType_1.AccountType.ASSET],
    [AccountMappingKey_1.AccountMappingKey.PAYABLE]: [AccountType_1.AccountType.LIABILITY],
    [AccountMappingKey_1.AccountMappingKey.REVENUE]: [AccountType_1.AccountType.REVENUE],
    [AccountMappingKey_1.AccountMappingKey.EXPENSE]: [AccountType_1.AccountType.EXPENSE],
    [AccountMappingKey_1.AccountMappingKey.INVENTORY]: [AccountType_1.AccountType.ASSET],
    [AccountMappingKey_1.AccountMappingKey.COGS]: [AccountType_1.AccountType.EXPENSE],
    [AccountMappingKey_1.AccountMappingKey.TAX_PAYABLE]: [AccountType_1.AccountType.LIABILITY],
    [AccountMappingKey_1.AccountMappingKey.TAX_RECEIVABLE]: [AccountType_1.AccountType.ASSET],
    [AccountMappingKey_1.AccountMappingKey.DISCOUNT]: [AccountType_1.AccountType.REVENUE, AccountType_1.AccountType.EXPENSE],
    [AccountMappingKey_1.AccountMappingKey.ROUNDING]: [AccountType_1.AccountType.REVENUE, AccountType_1.AccountType.EXPENSE],
};
class FinancialDefinitionPolicy {
    static normalizeQualifier(input) {
        const normalized = String(input || '').trim().toUpperCase();
        return normalized || null;
    }
    static assertMappingAccountCompatibility(mappingKey, account) {
        const allowedTypes = ALLOWED_ACCOUNT_TYPES_BY_MAPPING[mappingKey] || [];
        if (allowedTypes.includes(account.accountType)) {
            return;
        }
        throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_TYPE_MISMATCH, `Account type ${account.accountType} is invalid for mapping ${mappingKey}`, { messageKey: 'error.financial_definition.account_type.invalid_for_mapping' });
    }
}
exports.FinancialDefinitionPolicy = FinancialDefinitionPolicy;
