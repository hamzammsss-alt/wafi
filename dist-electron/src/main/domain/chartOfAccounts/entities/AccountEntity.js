"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountEntity = void 0;
const errors_1 = require("../../errors");
const AccountCategory_1 = require("../enums/AccountCategory");
const AccountSubtype_1 = require("../enums/AccountSubtype");
const NormalBalance_1 = require("../enums/NormalBalance");
class AccountEntity {
    constructor(props) {
        this.props = props;
    }
    static create(input) {
        const now = new Date().toISOString();
        return new AccountEntity(AccountEntity.normalize({
            ...input,
            parentId: input.parentId ?? null,
            systemTag: input.systemTag ?? null,
            createdAt: input.createdAt ?? now,
            updatedAt: input.updatedAt ?? now,
        }));
    }
    static rehydrate(props) {
        return new AccountEntity(AccountEntity.normalize(props));
    }
    static normalize(input) {
        const id = String(input.id || '').trim();
        if (!id) {
            throw new errors_1.DomainError('ERR_ACCOUNT_ID_REQUIRED', 'Account id is required', {
                messageKey: 'error.account.id.required',
            });
        }
        const companyId = String(input.companyId || '').trim();
        if (!companyId) {
            throw new errors_1.DomainError('ERR_ACCOUNT_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.account.company.required',
            });
        }
        const code = String(input.code || '').trim();
        if (!/^\d{5}$/.test(code)) {
            throw new errors_1.DomainError('ERR_ACCOUNT_CODE_INVALID', 'Account code must be fixed-width 5 digits', {
                messageKey: 'error.account.code.fixed_width',
            });
        }
        const name = String(input.name || '').trim();
        if (!name) {
            throw new errors_1.DomainError('ERR_ACCOUNT_NAME_REQUIRED', 'Account name is required', {
                messageKey: 'error.account.name.required',
            });
        }
        if (!Object.values(AccountCategory_1.AccountCategory).includes(input.category)) {
            throw new errors_1.DomainError('ERR_ACCOUNT_CATEGORY_INVALID', `Unsupported account category: ${input.category}`, {
                messageKey: 'error.account.category.invalid',
            });
        }
        if (!Object.values(AccountSubtype_1.AccountSubtype).includes(input.subtype)) {
            throw new errors_1.DomainError('ERR_ACCOUNT_SUBTYPE_INVALID', `Unsupported account subtype: ${input.subtype}`, {
                messageKey: 'error.account.subtype.invalid',
            });
        }
        if (!Object.values(NormalBalance_1.NormalBalance).includes(input.normalBalance)) {
            throw new errors_1.DomainError('ERR_ACCOUNT_NORMAL_BALANCE_INVALID', `Unsupported normal balance: ${input.normalBalance}`, { messageKey: 'error.account.normal_balance.invalid' });
        }
        const level = Number(input.level);
        if (!Number.isInteger(level) || level < 1) {
            throw new errors_1.DomainError('ERR_ACCOUNT_LEVEL_INVALID', 'Account level must be a positive integer', {
                messageKey: 'error.account.level.invalid',
            });
        }
        const normalizedPath = String(input.path || '')
            .trim()
            .replace(/^\/+|\/+$/g, '');
        if (!normalizedPath) {
            throw new errors_1.DomainError('ERR_ACCOUNT_PATH_REQUIRED', 'Account path is required', {
                messageKey: 'error.account.path.required',
            });
        }
        const parentId = input.parentId ? String(input.parentId).trim() : null;
        const systemTag = input.systemTag ? String(input.systemTag).trim().toUpperCase() : null;
        return {
            id,
            companyId,
            code,
            name,
            category: input.category,
            subtype: input.subtype,
            parentId,
            isPosting: Boolean(input.isPosting),
            normalBalance: input.normalBalance,
            systemTag,
            allowManualEntry: Boolean(input.allowManualEntry),
            isActive: Boolean(input.isActive),
            level,
            path: normalizedPath,
            createdAt: String(input.createdAt || ''),
            updatedAt: String(input.updatedAt || ''),
        };
    }
    get id() {
        return this.props.id;
    }
    get companyId() {
        return this.props.companyId;
    }
    get code() {
        return this.props.code;
    }
    get name() {
        return this.props.name;
    }
    get category() {
        return this.props.category;
    }
    get subtype() {
        return this.props.subtype;
    }
    get parentId() {
        return this.props.parentId;
    }
    get isPosting() {
        return this.props.isPosting;
    }
    get normalBalance() {
        return this.props.normalBalance;
    }
    get systemTag() {
        return this.props.systemTag;
    }
    get allowManualEntry() {
        return this.props.allowManualEntry;
    }
    get isActive() {
        return this.props.isActive;
    }
    get level() {
        return this.props.level;
    }
    get path() {
        return this.props.path;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get updatedAt() {
        return this.props.updatedAt;
    }
    toJSON() {
        return { ...this.props };
    }
}
exports.AccountEntity = AccountEntity;
