import { Currency } from '../entities/Currency';

export interface CurrencyUsageSummary {
    table: string;
    count: number;
}

export interface CurrencyRateHistoryEntry {
    id: string;
    currencyId: string;
    companyId: string;
    currencyCode: string;
    rate: number;
    date: string;
    recordedAt: string | null;
    source: string;
    isFixed: boolean;
}

export interface SaveCurrencyRateHistoryInput {
    currencyId: string;
    companyId: string;
    currencyCode: string;
    rate: number;
    date?: string | null;
    recordedAt?: string | null;
    source?: string | null;
    isFixed?: boolean;
}

export interface CurrencyRepoPort {
    findById(id: string, companyId: string): Promise<Currency | null>;
    findAll(companyId: string): Promise<Currency[]>;
    create(currency: Currency): Promise<void>;
    update(currency: Currency): Promise<void>;
    delete(id: string, companyId: string): Promise<void>;
    getUsageSummary(id: string): Promise<CurrencyUsageSummary[]>;
    saveRateHistory(input: SaveCurrencyRateHistoryInput): Promise<void>;
    getRateHistory(code: string, companyId: string, limit?: number): Promise<CurrencyRateHistoryEntry[]>;
    getRateTimeline(code: string, companyId: string, limit?: number): Promise<CurrencyRateHistoryEntry[]>;
}
