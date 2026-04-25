import { DomainError } from '../../errors';
import { Account, AccountStatus } from '../entities/Account';
import { AccountCategory } from '../enums/AccountCategory';
import { AccountCurrencyBehavior } from '../enums/AccountCurrencyBehavior';
import { AccountReferenceType } from '../enums/AccountReferenceType';
import { AccountingErrorCode } from '../enums/AccountingErrorCode';
import { AccountScopeType } from '../enums/AccountScopeType';
import { AccountSubtype } from '../enums/AccountSubtype';
import { AccountType } from '../enums/AccountType';

const CATEGORY_BY_TYPE: Record<AccountType, AccountCategory[]> = {
    [AccountType.ASSET]: [
        AccountCategory.CURRENT_ASSET,
        AccountCategory.NON_CURRENT_ASSET,
        AccountCategory.CONTROL,
        AccountCategory.TAX,
        AccountCategory.GENERAL,
    ],
    [AccountType.LIABILITY]: [
        AccountCategory.CURRENT_LIABILITY,
        AccountCategory.NON_CURRENT_LIABILITY,
        AccountCategory.CONTROL,
        AccountCategory.TAX,
        AccountCategory.GENERAL,
    ],
    [AccountType.EQUITY]: [AccountCategory.EQUITY, AccountCategory.GENERAL],
    [AccountType.REVENUE]: [AccountCategory.OPERATING_REVENUE, AccountCategory.OTHER_REVENUE, AccountCategory.GENERAL],
    [AccountType.EXPENSE]: [AccountCategory.OPERATING_EXPENSE, AccountCategory.OTHER_EXPENSE, AccountCategory.GENERAL],
};

const SUBTYPE_WHITELIST: Set<AccountSubtype> = new Set(Object.values(AccountSubtype));

const SUBTYPE_BY_TYPE: Record<AccountType, AccountSubtype[]> = {
    [AccountType.ASSET]: [
        AccountSubtype.GENERAL,
        AccountSubtype.CASH,
        AccountSubtype.BANK,
        AccountSubtype.RECEIVABLE,
        AccountSubtype.INVENTORY,
        AccountSubtype.TAX_RECEIVABLE,
        AccountSubtype.DISCOUNT,
        AccountSubtype.ROUNDING,
    ],
    [AccountType.LIABILITY]: [
        AccountSubtype.GENERAL,
        AccountSubtype.PAYABLE,
        AccountSubtype.TAX_PAYABLE,
        AccountSubtype.DISCOUNT,
        AccountSubtype.ROUNDING,
    ],
    [AccountType.EQUITY]: [
        AccountSubtype.GENERAL,
        AccountSubtype.ROUNDING,
    ],
    [AccountType.REVENUE]: [
        AccountSubtype.GENERAL,
        AccountSubtype.REVENUE,
        AccountSubtype.DISCOUNT,
        AccountSubtype.ROUNDING,
    ],
    [AccountType.EXPENSE]: [
        AccountSubtype.GENERAL,
        AccountSubtype.EXPENSE,
        AccountSubtype.COGS,
        AccountSubtype.DISCOUNT,
        AccountSubtype.ROUNDING,
    ],
};

const REFERENCE_BY_SUBTYPE_DEFAULT: Record<AccountSubtype, AccountReferenceType> = {
    [AccountSubtype.GENERAL]: AccountReferenceType.NONE,
    [AccountSubtype.CASH]: AccountReferenceType.USER,
    [AccountSubtype.BANK]: AccountReferenceType.BANK_CHEQUE,
    [AccountSubtype.RECEIVABLE]: AccountReferenceType.GUIDE,
    [AccountSubtype.PAYABLE]: AccountReferenceType.GUIDE,
    [AccountSubtype.REVENUE]: AccountReferenceType.NONE,
    [AccountSubtype.EXPENSE]: AccountReferenceType.NONE,
    [AccountSubtype.INVENTORY]: AccountReferenceType.NONE,
    [AccountSubtype.COGS]: AccountReferenceType.NONE,
    [AccountSubtype.TAX_PAYABLE]: AccountReferenceType.NONE,
    [AccountSubtype.TAX_RECEIVABLE]: AccountReferenceType.NONE,
    [AccountSubtype.DISCOUNT]: AccountReferenceType.NONE,
    [AccountSubtype.ROUNDING]: AccountReferenceType.NONE,
};

export class ChartOfAccountsPolicy {
    static normalizeCode(input: string): string {
        return String(input || '')
            .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
            .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
            .replace(/\D+/g, '');
    }

    static deriveLevel(parent: Account | null): number {
        return parent ? parent.level + 1 : 1;
    }

    static validateCategoryByType(accountType: AccountType, category: AccountCategory): void {
        const allowed = CATEGORY_BY_TYPE[accountType] || [];
        if (!allowed.includes(category)) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_CATEGORY_INVALID,
                `Category ${category} is not allowed for ${accountType}`,
                { messageKey: 'error.account.category.type_mismatch' },
            );
        }
    }

    static validateSubtype(subtype: AccountSubtype): void {
        if (!SUBTYPE_WHITELIST.has(subtype)) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID,
                `Subtype ${subtype} is invalid`,
                { messageKey: 'error.account.subtype.invalid' },
            );
        }
    }

    static validateSubtypeByType(accountType: AccountType, subtype: AccountSubtype): void {
        this.validateSubtype(subtype);

        const allowed = SUBTYPE_BY_TYPE[accountType] || [];
        if (!allowed.includes(subtype)) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID,
                `Subtype ${subtype} is not allowed for ${accountType}`,
                { messageKey: 'error.account.subtype.type_mismatch' },
            );
        }
    }

    static defaultReferenceTypeForSubtype(subtype: AccountSubtype): AccountReferenceType {
        return REFERENCE_BY_SUBTYPE_DEFAULT[subtype] || AccountReferenceType.NONE;
    }

    static validateReferenceTypeBySubtype(subtype: AccountSubtype, referenceType: AccountReferenceType): void {
        if (subtype === AccountSubtype.RECEIVABLE || subtype === AccountSubtype.PAYABLE) {
            if (referenceType !== AccountReferenceType.GUIDE) {
                throw new DomainError(
                    AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID,
                    'Receivable/Payable accounts must use GUIDE reference type',
                    { messageKey: 'error.account.reference_type.must_be_guide' },
                );
            }
        }

        if (subtype === AccountSubtype.BANK) {
            const allowed = [AccountReferenceType.BANK_CHEQUE, AccountReferenceType.NONE];
            if (!allowed.includes(referenceType)) {
                throw new DomainError(
                    AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID,
                    'Bank accounts must use BANK_CHEQUE reference type',
                    { messageKey: 'error.account.reference_type.must_be_bank_cheque' },
                );
            }
        }
    }

    static validateParentChild(parent: Account | null, child: Account): void {
        if (!parent) return;

        if (parent.postingAllowed) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_PARENT_NOT_HEADER,
                'Posting accounts cannot have children',
                { messageKey: 'error.account.parent.must_be_header' },
            );
        }

        if (parent.accountType !== child.accountType) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_PARENT_TYPE_MISMATCH,
                'Child account type must match parent account type',
                { messageKey: 'error.account.parent.type_mismatch' },
            );
        }

        if (parent.scopeType !== child.scopeType) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_PARENT_SCOPE_MISMATCH,
                'Parent and child must share scope type',
                { messageKey: 'error.account.parent.scope_mismatch' },
            );
        }

        if (parent.scopeType === AccountScopeType.BRANCH && parent.branchId !== child.branchId) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_PARENT_SCOPE_MISMATCH,
                'Parent and child must share branch scope',
                { messageKey: 'error.account.parent.branch_scope_mismatch' },
            );
        }
    }

    static validateCodeHierarchy(parent: Account | null, accountCode: string): void {
        if (!parent) return;

        const childCode = String(accountCode || '').trim().toUpperCase();
        const parentCode = String(parent.accountCode || '').trim().toUpperCase();
        if (!childCode || !parentCode) return;

        if (!childCode.startsWith(parentCode)) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_CODE_INVALID,
                'Child account code must start with parent account code',
                { messageKey: 'error.account.code.parent_prefix_required' },
            );
        }
    }

    static validatePostingParent(parent: Account | null, postingAllowed: boolean): void {
        if (!postingAllowed) return;
        if (parent) return;

        throw new DomainError(
            AccountingErrorCode.ERR_ACCOUNT_PARENT_NOT_FOUND,
            'Posting account must have a parent header account',
            { messageKey: 'error.account.parent.required_for_posting' },
        );
    }

    static validatePostingInvariant(hasChildren: boolean, postingAllowed: boolean): void {
        if (postingAllowed && hasChildren) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_POSTING_HAS_CHILDREN,
                'Posting account cannot have children',
                { messageKey: 'error.account.posting.has_children' },
            );
        }
    }

    static validateCurrency(currencyBehavior: AccountCurrencyBehavior, currencyCode: string | null): void {
        if (currencyBehavior === AccountCurrencyBehavior.FIXED_CURRENCY && !String(currencyCode || '').trim()) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_CURRENCY_INVALID,
                'Fixed currency behavior requires currency code',
                { messageKey: 'error.account.currency.fixed_required' },
            );
        }
    }

    static assertScope(scopeType: AccountScopeType, branchId: string | null): void {
        if (scopeType === AccountScopeType.BRANCH && !String(branchId || '').trim()) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_SCOPE_INVALID,
                'Branch scope account requires branch id',
                { messageKey: 'error.account.scope.branch_required' },
            );
        }
    }

    static assertCanDelete(hasChildren: boolean, hasReferences: boolean): void {
        if (hasChildren) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_HAS_CHILDREN,
                'Account has children and cannot be deleted',
                { messageKey: 'error.account.delete.has_children' },
            );
        }
        if (hasReferences) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_HAS_REFERENCES,
                'Account is already referenced and cannot be deleted',
                { messageKey: 'error.account.delete.has_references' },
            );
        }
    }

    static assertActiveForUpdate(status: AccountStatus): void {
        if (status !== AccountStatus.ACTIVE) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_INACTIVE,
                'Inactive account cannot be used as active mapping target',
                { messageKey: 'error.account.inactive' },
            );
        }
    }
}
