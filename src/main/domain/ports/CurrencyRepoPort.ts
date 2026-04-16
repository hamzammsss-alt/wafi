import { Currency } from '../entities/Currency';

export interface CurrencyRepoPort {
    findById(id: string, companyId: string): Promise<Currency | null>;
    findAll(companyId: string): Promise<Currency[]>;
    create(currency: Currency): Promise<void>;
    update(currency: Currency): Promise<void>;
    delete(id: string, companyId: string): Promise<void>;
}
