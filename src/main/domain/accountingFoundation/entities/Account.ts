import { DomainError } from '../../errors';
import { AccountCategory } from '../enums/AccountCategory';
import { AccountCurrencyBehavior } from '../enums/AccountCurrencyBehavior';
import { AccountReferenceType } from '../enums/AccountReferenceType';
import { AccountingErrorCode } from '../enums/AccountingErrorCode';
import { AccountScopeType } from '../enums/AccountScopeType';
import { AccountSubtype } from '../enums/AccountSubtype';
import { AccountType } from '../enums/AccountType';

export enum AccountStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

export interface AccountProps {
    id: string;
    companyId: string;
    branchId: string | null;
    accountCode: string;
    name: string;
    parentId: string | null;
    level: number;
    accountType: AccountType;
    accountCategory: AccountCategory;
    accountSubtype: AccountSubtype;
    postingAllowed: boolean;
    currencyBehavior: AccountCurrencyBehavior;
    currencyCode: string | null;
    referenceType: AccountReferenceType;
    scopeType: AccountScopeType;
    status: AccountStatus;
    requiresCostCenter: boolean;
    requiresAnalysisCode: boolean;
}

const ACCOUNT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;

export class Account {
    private constructor(private readonly props: AccountProps) { }

    static create(props: AccountProps): Account {
        Account.validate(props);
        return new Account(props);
    }

    static rehydrate(props: AccountProps): Account {
        Account.validate(props);
        return new Account(props);
    }

    private static validate(props: AccountProps): void {
        const code = String(props.accountCode || '').trim().toUpperCase();
        if (!code) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_CODE_REQUIRED, 'Account code is required', {
                messageKey: 'error.account.code.required',
            });
        }
        if (!ACCOUNT_CODE_PATTERN.test(code)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_CODE_INVALID, 'Account code is invalid', {
                messageKey: 'error.account.code.invalid',
            });
        }
        if (!String(props.name || '').trim()) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_NAME_REQUIRED, 'Account name is required', {
                messageKey: 'error.account.name.required',
            });
        }
        if (!Object.values(AccountType).includes(props.accountType)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_TYPE_INVALID, 'Account type is invalid', {
                messageKey: 'error.account.type.invalid',
            });
        }
        if (!Object.values(AccountCategory).includes(props.accountCategory)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_CATEGORY_INVALID, 'Account category is invalid', {
                messageKey: 'error.account.category.invalid',
            });
        }
        if (!Object.values(AccountSubtype).includes(props.accountSubtype)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID, 'Account subtype is invalid', {
                messageKey: 'error.account.subtype.invalid',
            });
        }
        if (props.level < 1) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_SCOPE_INVALID, 'Account level must be >= 1', {
                messageKey: 'error.account.level.invalid',
            });
        }
        if (!Object.values(AccountScopeType).includes(props.scopeType)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_SCOPE_INVALID, 'Account scope type is invalid', {
                messageKey: 'error.account.scope.invalid',
            });
        }
        if (props.scopeType === AccountScopeType.BRANCH && !String(props.branchId || '').trim()) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_SCOPE_INVALID, 'Branch scope requires branch id', {
                messageKey: 'error.account.scope.branch_required',
            });
        }
        if (!Object.values(AccountCurrencyBehavior).includes(props.currencyBehavior)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_CURRENCY_INVALID, 'Currency behavior is invalid', {
                messageKey: 'error.account.currency_behavior.invalid',
            });
        }
        if (props.currencyBehavior === AccountCurrencyBehavior.FIXED_CURRENCY && !String(props.currencyCode || '').trim()) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_CURRENCY_INVALID, 'Fixed currency requires currency code', {
                messageKey: 'error.account.currency.fixed_required',
            });
        }
        if (!Object.values(AccountReferenceType).includes(props.referenceType)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID, 'Account reference type is invalid', {
                messageKey: 'error.account.reference_type.invalid',
            });
        }
    }

    toJSON(): AccountProps {
        return { ...this.props };
    }

    get id(): string {
        return this.props.id;
    }

    get companyId(): string {
        return this.props.companyId;
    }

    get branchId(): string | null {
        return this.props.branchId;
    }

    get accountCode(): string {
        return this.props.accountCode;
    }

    get name(): string {
        return this.props.name;
    }

    get parentId(): string | null {
        return this.props.parentId;
    }

    get level(): number {
        return this.props.level;
    }

    get accountType(): AccountType {
        return this.props.accountType;
    }

    get accountCategory(): AccountCategory {
        return this.props.accountCategory;
    }

    get accountSubtype(): AccountSubtype {
        return this.props.accountSubtype;
    }

    get postingAllowed(): boolean {
        return this.props.postingAllowed;
    }

    get currencyBehavior(): AccountCurrencyBehavior {
        return this.props.currencyBehavior;
    }

    get currencyCode(): string | null {
        return this.props.currencyCode;
    }

    get referenceType(): AccountReferenceType {
        return this.props.referenceType;
    }

    get scopeType(): AccountScopeType {
        return this.props.scopeType;
    }

    get status(): AccountStatus {
        return this.props.status;
    }

    get requiresCostCenter(): boolean {
        return this.props.requiresCostCenter;
    }

    get requiresAnalysisCode(): boolean {
        return this.props.requiresAnalysisCode;
    }

    get isHeader(): boolean {
        return !this.props.postingAllowed;
    }

    assertCanPost(): void {
        if (this.status !== AccountStatus.ACTIVE) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_INACTIVE, 'Account is inactive', {
                messageKey: 'error.account.inactive',
                accountId: this.id,
            });
        }
        if (!this.postingAllowed) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_NOT_POSTABLE, 'Header account cannot be posted', {
                messageKey: 'error.account.not_postable',
                accountId: this.id,
            });
        }
    }
}

