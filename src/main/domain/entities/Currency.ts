import { DomainError } from '../errors';

export class Currency {
    constructor(
        public readonly id: string,
        public readonly code: string,
        public readonly companyId: string,
        public name: string,
        public symbol: string,
        public exchangeRate: number,
        public isBaseCurrency: boolean,
        public isActive: boolean,
        public decimalPlaces: number = 2
    ) {
        if (!code || code.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Currency code is required');
        if (!name || name.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Currency name is required');
        if (exchangeRate <= 0) throw new DomainError('VALIDATION_ERROR', 'Exchange rate must be greater than zero');
    }

    public updateDetails(name: string, symbol: string, decimalPlaces: number, isActive: boolean): void {
        if (!name || name.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Currency name cannot be empty');
        this.name = name;
        this.symbol = symbol;
        this.decimalPlaces = decimalPlaces;
        this.isActive = isActive;
    }

    public updateExchangeRate(rate: number): void {
        if (this.isBaseCurrency) {
            throw new DomainError('VALIDATION_ERROR', 'Cannot update exchange rate of base currency. It is always 1');
        }
        if (rate <= 0) throw new DomainError('VALIDATION_ERROR', 'Exchange rate must be greater than zero');
        this.exchangeRate = rate;
    }
}
