import { DomainError } from '../errors';

export class Currency {
    public nameAr: string;
    public nameEn: string;
    public isFixedRate: boolean;
    public lastUpdate: string | null;

    constructor(
        public readonly id: string,
        public readonly code: string,
        public readonly companyId: string,
        public name: string,
        public symbol: string,
        public exchangeRate: number,
        public isBaseCurrency: boolean,
        public isActive: boolean,
        public decimalPlaces: number = 2,
        nameAr?: string | null,
        nameEn?: string | null,
        isFixedRate: boolean = false,
        lastUpdate?: string | null
    ) {
        if (!code || code.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Currency code is required');
        if (!name || name.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Currency name is required');
        if (exchangeRate <= 0) throw new DomainError('VALIDATION_ERROR', 'Exchange rate must be greater than zero');
        this.nameAr = this.normalizeArabicName(nameAr, name);
        this.nameEn = this.normalizeOptionalName(nameEn);
        this.isFixedRate = Boolean(isFixedRate) || Boolean(isBaseCurrency);
        this.lastUpdate = typeof lastUpdate === 'string' && lastUpdate.trim() !== '' ? lastUpdate : null;
    }

    public updateDetails(
        name: string,
        symbol: string,
        decimalPlaces: number,
        isActive: boolean,
        nameAr?: string | null,
        nameEn?: string | null
    ): void {
        if (!name || name.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Currency name cannot be empty');
        this.name = name;
        this.symbol = symbol;
        this.decimalPlaces = decimalPlaces;
        this.isActive = isActive;
        this.nameAr = this.normalizeArabicName(nameAr, name);
        this.nameEn = this.normalizeOptionalName(nameEn);
    }

    public updateExchangeRate(rate: number): void {
        if (this.isBaseCurrency) {
            throw new DomainError('VALIDATION_ERROR', 'Cannot update exchange rate of base currency. It is always 1');
        }
        if (rate <= 0) throw new DomainError('VALIDATION_ERROR', 'Exchange rate must be greater than zero');
        this.exchangeRate = rate;
    }

    private normalizeArabicName(value: string | null | undefined, fallback: string): string {
        const normalized = typeof value === 'string' ? value.trim() : '';
        return normalized || fallback;
    }

    private normalizeOptionalName(value: string | null | undefined): string {
        return typeof value === 'string' ? value.trim() : '';
    }
}
