import { Currency } from '../../src/main/domain/entities/Currency';
import { SqliteCurrencyRepo } from '../../src/main/infrastructure/adapters/SqliteCurrencyRepo';
import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../src/main/domain/errors';

export class CurrencyService {
    private static repo = new SqliteCurrencyRepo();

    static async getCurrencies(companyId: string): Promise<Currency[]> {
        return await this.repo.findAll(companyId);
    }

    static async getBaseCurrency(companyId: string): Promise<Currency> {
        const currencies = await this.repo.findAll(companyId);
        const base = currencies.find(c => c.isBaseCurrency);
        if (!base) {
            throw new DomainError('VALIDATION_ERROR', 'No Base Currency Found for this company');
        }
        return base;
    }

    static async createCurrency(data: {
        code: string,
        companyId: string,
        name: string,
        symbol: string,
        exchangeRate: number,
        isBaseCurrency: boolean,
        isActive: boolean,
        decimalPlaces?: number
    }): Promise<string> {
        // Business Rule: Ensure only one base currency
        if (data.isBaseCurrency) {
            const all = await this.repo.findAll(data.companyId);
            for (const c of all) {
                if (c.isBaseCurrency) {
                    c.isBaseCurrency = false;
                    await this.repo.update(c);
                }
            }
            data.exchangeRate = 1; // Base is always 1
        }

        const currency = new Currency(
            uuidv4(),
            data.code,
            data.companyId,
            data.name,
            data.symbol,
            data.exchangeRate,
            data.isBaseCurrency,
            data.isActive,
            data.decimalPlaces || 2
        );

        await this.repo.create(currency);
        return currency.id;
    }

    static async updateCurrency(
        id: string,
        companyId: string,
        updates: {
            name: string,
            symbol: string,
            exchangeRate: number,
            isBaseCurrency: boolean,
            isActive: boolean,
            decimalPlaces?: number
        }
    ): Promise<{ success: true }> {
        const currency = await this.repo.findById(id, companyId);
        if (!currency) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Currency not found');
        }

        if (updates.isBaseCurrency && !currency.isBaseCurrency) {
            const all = await this.repo.findAll(companyId);
            for (const c of all) {
                if (c.isBaseCurrency && c.id !== id) {
                    c.isBaseCurrency = false;
                    await this.repo.update(c);
                }
            }
            updates.exchangeRate = 1;
        }

        currency.updateDetails(updates.name, updates.symbol, updates.decimalPlaces || 2, updates.isActive);
        currency.isBaseCurrency = updates.isBaseCurrency; // Directly update since domain constructor sets it, but no setter. We need to set it.
        // wait, domain doesn't have setter for isBaseCurrency. It is public, so we can set it.

        if (!currency.isBaseCurrency) {
            currency.updateExchangeRate(updates.exchangeRate);
        } else {
            currency.exchangeRate = 1;
        }


        await this.repo.update(currency);
        return { success: true };
    }

    static async deleteCurrency(id: string, companyId: string): Promise<{ success: true }> {
        // Domain rule check
        const currency = await this.repo.findById(id, companyId);
        if (currency && currency.isBaseCurrency) {
            throw new DomainError('VALIDATION_ERROR', 'Cannot delete the Base Currency');
        }

        // Use direct DB for deletion as Repo doesn't have delete mapped
        const db = require('better-sqlite3')('wafi.db');
        db.prepare('DELETE FROM currencies WHERE id = ? AND company_id = ?').run(id, companyId);

        return { success: true };
    }

    static async getCurrencyHistory(code: string, days: number = 30): Promise<{ date: string, rate: number }[]> {
        const db = require('better-sqlite3')('wafi.db');
        const stmt = db.prepare(`
            SELECT date, rate 
            FROM currency_rate_history 
            WHERE currency_code = ? 
            ORDER BY date ASC 
            LIMIT ?
        `);
        return stmt.all(code, days) as { date: string, rate: number }[];
    }
}
