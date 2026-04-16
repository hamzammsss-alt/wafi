import { DomainError } from '../errors';

export class AccountId {
    constructor(public readonly value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('VALIDATION_ERROR', 'Account ID cannot be empty');
        }
    }
}
