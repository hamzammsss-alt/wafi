import { DomainError } from '../../errors';
import { AccountCategory } from '../enums/AccountCategory';
import { AccountSubtype } from '../enums/AccountSubtype';
import { NormalBalance } from '../enums/NormalBalance';

export interface AccountEntityProps {
    id: string;
    companyId: string;
    code: string;
    name: string;
    category: AccountCategory;
    subtype: AccountSubtype;
    parentId: string | null;
    isPosting: boolean;
    normalBalance: NormalBalance;
    systemTag: string | null;
    allowManualEntry: boolean;
    isActive: boolean;
    level: number;
    path: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAccountEntityProps {
    id: string;
    companyId: string;
    code: string;
    name: string;
    category: AccountCategory;
    subtype: AccountSubtype;
    parentId?: string | null;
    isPosting: boolean;
    normalBalance: NormalBalance;
    systemTag?: string | null;
    allowManualEntry: boolean;
    isActive: boolean;
    level: number;
    path: string;
    createdAt?: string;
    updatedAt?: string;
}

export class AccountEntity {
    private constructor(private readonly props: AccountEntityProps) {}

    static create(input: CreateAccountEntityProps): AccountEntity {
        const now = new Date().toISOString();
        return new AccountEntity(
            AccountEntity.normalize({
                ...input,
                parentId: input.parentId ?? null,
                systemTag: input.systemTag ?? null,
                createdAt: input.createdAt ?? now,
                updatedAt: input.updatedAt ?? now,
            }),
        );
    }

    static rehydrate(props: AccountEntityProps): AccountEntity {
        return new AccountEntity(AccountEntity.normalize(props));
    }

    private static normalize(input: AccountEntityProps): AccountEntityProps {
        const id = String(input.id || '').trim();
        if (!id) {
            throw new DomainError('ERR_ACCOUNT_ID_REQUIRED', 'Account id is required', {
                messageKey: 'error.account.id.required',
            });
        }

        const companyId = String(input.companyId || '').trim();
        if (!companyId) {
            throw new DomainError('ERR_ACCOUNT_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.account.company.required',
            });
        }

        const code = String(input.code || '').trim();
        if (!/^\d{5}$/.test(code)) {
            throw new DomainError('ERR_ACCOUNT_CODE_INVALID', 'Account code must be fixed-width 5 digits', {
                messageKey: 'error.account.code.fixed_width',
            });
        }

        const name = String(input.name || '').trim();
        if (!name) {
            throw new DomainError('ERR_ACCOUNT_NAME_REQUIRED', 'Account name is required', {
                messageKey: 'error.account.name.required',
            });
        }

        if (!Object.values(AccountCategory).includes(input.category)) {
            throw new DomainError('ERR_ACCOUNT_CATEGORY_INVALID', `Unsupported account category: ${input.category}`, {
                messageKey: 'error.account.category.invalid',
            });
        }

        if (!Object.values(AccountSubtype).includes(input.subtype)) {
            throw new DomainError('ERR_ACCOUNT_SUBTYPE_INVALID', `Unsupported account subtype: ${input.subtype}`, {
                messageKey: 'error.account.subtype.invalid',
            });
        }

        if (!Object.values(NormalBalance).includes(input.normalBalance)) {
            throw new DomainError(
                'ERR_ACCOUNT_NORMAL_BALANCE_INVALID',
                `Unsupported normal balance: ${input.normalBalance}`,
                { messageKey: 'error.account.normal_balance.invalid' },
            );
        }

        const level = Number(input.level);
        if (!Number.isInteger(level) || level < 1) {
            throw new DomainError('ERR_ACCOUNT_LEVEL_INVALID', 'Account level must be a positive integer', {
                messageKey: 'error.account.level.invalid',
            });
        }

        const normalizedPath = String(input.path || '')
            .trim()
            .replace(/^\/+|\/+$/g, '');
        if (!normalizedPath) {
            throw new DomainError('ERR_ACCOUNT_PATH_REQUIRED', 'Account path is required', {
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

    get id(): string {
        return this.props.id;
    }

    get companyId(): string {
        return this.props.companyId;
    }

    get code(): string {
        return this.props.code;
    }

    get name(): string {
        return this.props.name;
    }

    get category(): AccountCategory {
        return this.props.category;
    }

    get subtype(): AccountSubtype {
        return this.props.subtype;
    }

    get parentId(): string | null {
        return this.props.parentId;
    }

    get isPosting(): boolean {
        return this.props.isPosting;
    }

    get normalBalance(): NormalBalance {
        return this.props.normalBalance;
    }

    get systemTag(): string | null {
        return this.props.systemTag;
    }

    get allowManualEntry(): boolean {
        return this.props.allowManualEntry;
    }

    get isActive(): boolean {
        return this.props.isActive;
    }

    get level(): number {
        return this.props.level;
    }

    get path(): string {
        return this.props.path;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    toJSON(): AccountEntityProps {
        return { ...this.props };
    }
}
