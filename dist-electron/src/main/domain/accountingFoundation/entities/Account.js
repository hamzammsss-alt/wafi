"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = exports.AccountStatus = void 0;
const errors_1 = require("../../errors");
const AccountCategory_1 = require("../enums/AccountCategory");
const AccountCurrencyBehavior_1 = require("../enums/AccountCurrencyBehavior");
const AccountReferenceType_1 = require("../enums/AccountReferenceType");
const AccountingErrorCode_1 = require("../enums/AccountingErrorCode");
const AccountScopeType_1 = require("../enums/AccountScopeType");
const AccountSubtype_1 = require("../enums/AccountSubtype");
const AccountType_1 = require("../enums/AccountType");
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["ACTIVE"] = "ACTIVE";
    AccountStatus["INACTIVE"] = "INACTIVE";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
const ACCOUNT_CODE_PATTERN = /^\d{1,32}$/;
class Account {
    constructor(props) {
        this.props = props;
    }
    static create(props) {
        Account.validate(props);
        return new Account(props);
    }
    static rehydrate(props) {
        Account.validate(props);
        return new Account(props);
    }
    static validate(props) {
        const code = String(props.accountCode || '').trim();
        if (!code) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CODE_REQUIRED, 'Account code is required', {
                messageKey: 'error.account.code.required',
            });
        }
        if (!ACCOUNT_CODE_PATTERN.test(code)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CODE_INVALID, 'Account code is invalid', {
                messageKey: 'error.account.code.invalid',
            });
        }
        if (!String(props.name || '').trim()) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_NAME_REQUIRED, 'Account name is required', {
                messageKey: 'error.account.name.required',
            });
        }
        if (!Object.values(AccountType_1.AccountType).includes(props.accountType)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_TYPE_INVALID, 'Account type is invalid', {
                messageKey: 'error.account.type.invalid',
            });
        }
        if (!Object.values(AccountCategory_1.AccountCategory).includes(props.accountCategory)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CATEGORY_INVALID, 'Account category is invalid', {
                messageKey: 'error.account.category.invalid',
            });
        }
        if (!Object.values(AccountSubtype_1.AccountSubtype).includes(props.accountSubtype)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID, 'Account subtype is invalid', {
                messageKey: 'error.account.subtype.invalid',
            });
        }
        if (props.level < 1) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SCOPE_INVALID, 'Account level must be >= 1', {
                messageKey: 'error.account.level.invalid',
            });
        }
        if (!Object.values(AccountScopeType_1.AccountScopeType).includes(props.scopeType)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SCOPE_INVALID, 'Account scope type is invalid', {
                messageKey: 'error.account.scope.invalid',
            });
        }
        if (props.scopeType === AccountScopeType_1.AccountScopeType.BRANCH && !String(props.branchId || '').trim()) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SCOPE_INVALID, 'Branch scope requires branch id', {
                messageKey: 'error.account.scope.branch_required',
            });
        }
        if (!Object.values(AccountCurrencyBehavior_1.AccountCurrencyBehavior).includes(props.currencyBehavior)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CURRENCY_INVALID, 'Currency behavior is invalid', {
                messageKey: 'error.account.currency_behavior.invalid',
            });
        }
        if (props.currencyBehavior === AccountCurrencyBehavior_1.AccountCurrencyBehavior.FIXED_CURRENCY && !String(props.currencyCode || '').trim()) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CURRENCY_INVALID, 'Fixed currency requires currency code', {
                messageKey: 'error.account.currency.fixed_required',
            });
        }
        if (!Object.values(AccountReferenceType_1.AccountReferenceType).includes(props.referenceType)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_SUBTYPE_INVALID, 'Account reference type is invalid', {
                messageKey: 'error.account.reference_type.invalid',
            });
        }
    }
    toJSON() {
        return { ...this.props };
    }
    get id() {
        return this.props.id;
    }
    get companyId() {
        return this.props.companyId;
    }
    get branchId() {
        return this.props.branchId;
    }
    get accountCode() {
        return this.props.accountCode;
    }
    get name() {
        return this.props.name;
    }
    get parentId() {
        return this.props.parentId;
    }
    get level() {
        return this.props.level;
    }
    get accountType() {
        return this.props.accountType;
    }
    get accountCategory() {
        return this.props.accountCategory;
    }
    get accountSubtype() {
        return this.props.accountSubtype;
    }
    get postingAllowed() {
        return this.props.postingAllowed;
    }
    get currencyBehavior() {
        return this.props.currencyBehavior;
    }
    get currencyCode() {
        return this.props.currencyCode;
    }
    get referenceType() {
        return this.props.referenceType;
    }
    get scopeType() {
        return this.props.scopeType;
    }
    get status() {
        return this.props.status;
    }
    get requiresCostCenter() {
        return this.props.requiresCostCenter;
    }
    get requiresAnalysisCode() {
        return this.props.requiresAnalysisCode;
    }
    get isHeader() {
        return !this.props.postingAllowed;
    }
    assertCanPost() {
        if (this.status !== AccountStatus.ACTIVE) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_INACTIVE, 'Account is inactive', {
                messageKey: 'error.account.inactive',
                accountId: this.id,
            });
        }
        if (!this.postingAllowed) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_NOT_POSTABLE, 'Header account cannot be posted', {
                messageKey: 'error.account.not_postable',
                accountId: this.id,
            });
        }
    }
}
exports.Account = Account;
