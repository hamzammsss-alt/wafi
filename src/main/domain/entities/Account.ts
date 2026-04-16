import { AccountId } from '../valueObjects/AccountId';
import { AccountType, AccountNature } from '../types/accounting';
import { DomainError } from '../errors';

export class Account {
    constructor(
        public readonly id: AccountId,
        public readonly companyId: string,
        public readonly branchId: string,
        public readonly number: string,
        public name: string,
        public readonly type: AccountType,
        public readonly nature: AccountNature,
        public parentId: AccountId | null,
        public isActive: boolean,
        public readonly isGroup: boolean
    ) {
        if (!number || number.trim() === '') {
            throw new DomainError('VALIDATION_ERROR', 'Account number is required');
        }
        if (!name || name.trim() === '') {
            throw new DomainError('VALIDATION_ERROR', 'Account name is required');
        }
    }

    public updateDetails(name: string, isActive: boolean): void {
        if (!name || name.trim() === '') {
            throw new DomainError('VALIDATION_ERROR', 'Account name cannot be empty');
        }
        this.name = name;
        this.isActive = isActive;
    }

    public ensurePostable(): void {
        if (!this.isActive) {
            throw new DomainError('VALIDATION_ERROR', `Account ${this.number} is inactive and cannot accept transactions`);
        }
        if (this.isGroup) {
            throw new DomainError('VALIDATION_ERROR', `Account ${this.number} is a group account and cannot accept transactions`);
        }
    }

    public setParent(parent: Account | null): void {
        if (!parent) {
            this.parentId = null;
            return;
        }
        if (parent.id === this.id) {
            throw new DomainError('VALIDATION_ERROR', 'Account cannot be its own parent');
        }
        if (parent.companyId !== this.companyId) {
            throw new DomainError('VALIDATION_ERROR', 'Parent account must belong to the same company');
        }
        if (!parent.isGroup) {
            throw new DomainError('VALIDATION_ERROR', 'Parent account must be a group account');
        }
        this.parentId = parent.id;
    }
}
