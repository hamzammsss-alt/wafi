"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartOfAccountsPolicy = void 0;
const errors_1 = require("../../errors");
const Account_1 = require("../entities/Account");
const AccountCategory_1 = require("../enums/AccountCategory");
const AccountCurrencyBehavior_1 = require("../enums/AccountCurrencyBehavior");
const AccountReferenceType_1 = require("../enums/AccountReferenceType");
const AccountingErrorCode_1 = require("../enums/AccountingErrorCode");
const AccountScopeType_1 = require("../enums/AccountScopeType");
const AccountSubtype_1 = require("../enums/AccountSubtype");
const AccountType_1 = require("../enums/AccountType");
const CATEGORY_BY_TYPE = {
    [AccountType_1.AccountType.ASSET]: [
        AccountCategory_1.AccountCategory.CURRENT_ASSET,
        AccountCategory_1.AccountCategory.NON_CURRENT_ASSET,
        AccountCategory_1.AccountCategory.CONTROL,
        AccountCategory_1.AccountCategory.TAX,
        AccountCategory_1.AccountCategory.GENERAL,
    ],
    [AccountType_1.AccountType.LIABILITY]: [
        AccountCategory_1.AccountCategory.CURRENT_LIABILITY,
        AccountCategory_1.AccountCategory.NON_CURRENT_LIABILITY,
        AccountCategory_1.AccountCategory.CONTROL,
        AccountCategory_1.AccountCategory.TAX,
        AccountCategory_1.AccountCategory.GENERAL,
    ],
    [AccountType_1.AccountType.EQUITY]: [AccountCategory_1.AccountCategory.EQUITY, AccountCategory_1.AccountCategory.GENERAL],
    [AccountType_1.AccountType.REVENUE]: [AccountCategory_1.AccountCategory.OPERATING_REVENUE, AccountCategory_1.AccountCategory.OTHER_REVENUE, AccountCategory_1.AccountCategory.GENERAL],
    [AccountType_1.AccountType.EXPENSE]: [AccountCategory_1.AccountCategory.OPERATING_EXPENSE, AccountCategory_1.AccountCategory.OTHER_EXPENSE, AccountCategory_1.AccountCategory.GENERAL],
};
const SUBTYPE_WHITELIST = new Set(Object.values(AccountSubtype_1.AccountSubtype));
const SUBTYPE_BY_TYPE = {
    [AccountType_1.AccountType.ASSET]: [
        AccountSubtype_1.AccountSubtype.GENERAL,
        AccountSubtype_1.AccountSubtype.CASH,
        AccountSubtype_1.AccountSubtype.BANK,
        AccountSubtype_1.AccountSubtype.RECEIVABLE,
        AccountSubtype_1.AccountSubtype.INVENTORY,
        AccountSubtype_1.AccountSubtype.TAX_RECEIVABLE,
        AccountSubtype_1.AccountSubtype.DISCOUNT,
        AccountSubtype_1.AccountSubtype.ROUNDING,
    ],
    [AccountType_1.AccountType.LIABILITY]: [
        AccountSubtype_1.AccountSubtype.GENERAL,
        AccountSubtype_1.AccountSubtype.PAYABLE,
        AccountSubtype_1.AccountSubtype.TAX_PAYABLE,
        AccountSubtype_1.AccountSubtype.DISCOUNT,
        AccountSubtype_1.AccountSubtype.ROUNDING,
    ],
    [AccountType_1.AccountType.EQUITY]: [
        AccountSubtype_1.AccountSubtype.GENERAL,
        AccountSubtype_1.AccountSubtype.ROUNDING,
    ],
    [AccountType_1.AccountType.REVENUE]: [
        AccountSubtype_1.AccountSubtype.GENERAL,
        AccountSubtype_1.AccountSubtype.REVENUE,
        AccountSubtype_1.AccountSubtype.DISCOUNT,
        AccountSubtype_1.AccountSubtype.ROUNDING,
    ],
    [AccountType_1.AccountType.EXPENSE]: [
        AccountSubtype_1.AccountSubtype.GENERAL,
        AccountSubtype_1.AccountSubtype.EXPENSE,
        AccountSubtype_1.AccountSubtype.COGS,
        AccountSubtype_1.AccountSubtype.DISCOUNT,
        AccountSubtype_1.AccountSubtype.ROUNDING,
    ],
};
const REFERENCE_BY_SUBTYPE_DEFAULT = {
    [AccountSubtype_1.AccountSubtype.GENERAL]: AccountReferenceType_1.AccountReferenceType.NONE,
    [AccountSubtype_1.AccountSubtype.CASH]: AccountReferenceType_1.AccountReferenceType.USER,
    [AccountSubtype_1.AccountSubtype.BANK]: AccountReferenceType_1.AccountReferenceType.BANK_CHEQUE,
    [AccountSubtype_1.AccountSubtype.RECEIVABLE]: AccountReferenceType_1.AccountReferenceType.GUIDE,
    [AccountSubtype_1.AccountSubtype.PAYABLE]: AccountReferenceType_1.AccountReferenceType.GUIDE,
    [AccountSubtype_1.AccountSubtype.REVENUE]: AccountReferenceType_1.AccountReferenceType.NONE,
    [AccountSubtype_1.AccountSubtype.EXPENSE]: AccountReferenceType_1.AccountReferenceType.NONE,
    [AccountSubtype_1.AccountSubtype.INVENTORY]: AccountReferenceType_1.AccountReferenceType.NONE,
    [AccountSubtype_1.AccountSubtype.COGS]: AccountReferenceType_1.AccountReferenceType.NONE,
    [AccountSubtype_1.AccountSubtype.TAX_PAYABLE]: AccountReferenceType_1.AccountReferenceType.NONE,
    [AccountSubtype_1.AccountSubtype.TAX_RECEIVABLE]: AccountReferenceType_1.AccountReferenceType.NONE,
    [AccountSubtype_1.AccountSubtype.DISCOUNT]: AccountReferenceType_1.AccountReferenceType.NONE,
    [AccountSubtype_1.AccountSubtype.ROUNDING]: AccountReferenceType_1.AccountReferenceType.NONE,
};
class ChartOfAccountsPolicy {
    static normalizeCode(input) {
        return String(input || '')
            .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
            .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
            .replace(/\D+/g, '');
    }
    static deriveLevel(parent) {
        return parent ? parent.level + 1 : 1;
    }
    static validateCategoryByType(accountType, category) {
        const allowed = CATEGORY_BY_TYPE[accountType] || [];
        if (!allowed.includes(category)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CATEGORY_INVALID, `Category ${category} is not allowed for ${accountType}`, { messageKey: 'error.account.category.type_mismatch' });
        }
    }
    static validateSubtype(subtype) {
        if (!SUBTYPE_WHITELIST.has(subtype)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID, `Subtype ${subtype} is invalid`, { messageKey: 'error.account.subtype.invalid' });
        }
    }
    static validateSubtypeByType(accountType, subtype) {
        this.validateSubtype(subtype);
        const allowed = SUBTYPE_BY_TYPE[accountType] || [];
        if (!allowed.includes(subtype)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID, `Subtype ${subtype} is not allowed for ${accountType}`, { messageKey: 'error.account.subtype.type_mismatch' });
        }
    }
    static defaultReferenceTypeForSubtype(subtype) {
        return REFERENCE_BY_SUBTYPE_DEFAULT[subtype] || AccountReferenceType_1.AccountReferenceType.NONE;
    }
    static validateReferenceTypeBySubtype(subtype, referenceType) {
        if (subtype === AccountSubtype_1.AccountSubtype.RECEIVABLE || subtype === AccountSubtype_1.AccountSubtype.PAYABLE) {
            if (referenceType !== AccountReferenceType_1.AccountReferenceType.GUIDE) {
                throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID, 'Receivable/Payable accounts must use GUIDE reference type', { messageKey: 'error.account.reference_type.must_be_guide' });
            }
        }
        if (subtype === AccountSubtype_1.AccountSubtype.BANK) {
            const allowed = [AccountReferenceType_1.AccountReferenceType.BANK_CHEQUE, AccountReferenceType_1.AccountReferenceType.NONE];
            if (!allowed.includes(referenceType)) {
                throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID, 'Bank accounts must use BANK_CHEQUE reference type', { messageKey: 'error.account.reference_type.must_be_bank_cheque' });
            }
        }
    }
    static validateParentChild(parent, child) {
        if (!parent)
            return;
        if (parent.postingAllowed) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_PARENT_NOT_HEADER, 'Posting accounts cannot have children', { messageKey: 'error.account.parent.must_be_header' });
        }
        if (parent.accountType !== child.accountType) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_PARENT_TYPE_MISMATCH, 'Child account type must match parent account type', { messageKey: 'error.account.parent.type_mismatch' });
        }
        if (parent.scopeType !== child.scopeType) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_PARENT_SCOPE_MISMATCH, 'Parent and child must share scope type', { messageKey: 'error.account.parent.scope_mismatch' });
        }
        if (parent.scopeType === AccountScopeType_1.AccountScopeType.BRANCH && parent.branchId !== child.branchId) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_PARENT_SCOPE_MISMATCH, 'Parent and child must share branch scope', { messageKey: 'error.account.parent.branch_scope_mismatch' });
        }
    }
    static validateCodeHierarchy(parent, accountCode) {
        if (!parent)
            return;
        const childCode = String(accountCode || '').trim().toUpperCase();
        const parentCode = String(parent.accountCode || '').trim().toUpperCase();
        if (!childCode || !parentCode)
            return;
        if (!childCode.startsWith(parentCode)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CODE_INVALID, 'Child account code must start with parent account code', { messageKey: 'error.account.code.parent_prefix_required' });
        }
    }
    static validatePostingParent(parent, postingAllowed) {
        if (!postingAllowed)
            return;
        if (parent)
            return;
        throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_PARENT_NOT_FOUND, 'Posting account must have a parent header account', { messageKey: 'error.account.parent.required_for_posting' });
    }
    static validatePostingInvariant(hasChildren, postingAllowed) {
        if (postingAllowed && hasChildren) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_POSTING_HAS_CHILDREN, 'Posting account cannot have children', { messageKey: 'error.account.posting.has_children' });
        }
    }
    static validateCurrency(currencyBehavior, currencyCode) {
        if (currencyBehavior === AccountCurrencyBehavior_1.AccountCurrencyBehavior.FIXED_CURRENCY && !String(currencyCode || '').trim()) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CURRENCY_INVALID, 'Fixed currency behavior requires currency code', { messageKey: 'error.account.currency.fixed_required' });
        }
    }
    static assertScope(scopeType, branchId) {
        if (scopeType === AccountScopeType_1.AccountScopeType.BRANCH && !String(branchId || '').trim()) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SCOPE_INVALID, 'Branch scope account requires branch id', { messageKey: 'error.account.scope.branch_required' });
        }
    }
    static assertCanDelete(hasChildren, hasReferences) {
        if (hasChildren) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_HAS_CHILDREN, 'Account has children and cannot be deleted', { messageKey: 'error.account.delete.has_children' });
        }
        if (hasReferences) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_HAS_REFERENCES, 'Account is already referenced and cannot be deleted', { messageKey: 'error.account.delete.has_references' });
        }
    }
    static assertActiveForUpdate(status) {
        if (status !== Account_1.AccountStatus.ACTIVE) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_INACTIVE, 'Inactive account cannot be used as active mapping target', { messageKey: 'error.account.inactive' });
        }
    }
}
exports.ChartOfAccountsPolicy = ChartOfAccountsPolicy;
