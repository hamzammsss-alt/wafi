import { Account } from '../entities/Account';
import { DomainError } from '../errors';
import { AccountId } from '../valueObjects/AccountId';

export class ChartOfAccounts {
    constructor(
        public readonly companyId: string,
        private _accounts: Account[]
    ) { }

    get accounts(): ReadonlyArray<Account> {
        return this._accounts;
    }

    public addAccount(account: Account): void {
        if (account.companyId !== this.companyId) {
            throw new DomainError('VALIDATION_ERROR', 'Account company ID does not match Chart of Accounts');
        }
        if (this._accounts.some(a => a.number === account.number)) {
            throw new DomainError('VALIDATION_ERROR', `Account number ${account.number} already exists`);
        }
        if (account.parentId) {
            const parent = this.findAccount(account.parentId);
            if (!parent) {
                throw new DomainError('VALIDATION_ERROR', `Parent account ${account.parentId.value} not found`);
            }
            if (!parent.isGroup) {
                throw new DomainError('VALIDATION_ERROR', `Parent account ${parent.number} must be a group account`);
            }
        }
        this._accounts.push(account);
    }

    public findAccount(id: AccountId): Account | undefined {
        return this._accounts.find(a => a.id.value === id.value);
    }
}
