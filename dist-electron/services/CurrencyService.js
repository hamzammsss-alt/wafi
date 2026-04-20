"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyService = void 0;
const Currency_1 = require("../../src/main/domain/entities/Currency");
const SqliteCurrencyRepo_1 = require("../../src/main/infrastructure/adapters/SqliteCurrencyRepo");
const uuid_1 = require("uuid");
const errors_1 = require("../../src/main/domain/errors");
class CurrencyService {
    static async getCurrencies(companyId) {
        return await this.repo.findAll(companyId);
    }
    static async getBaseCurrency(companyId) {
        const currencies = await this.repo.findAll(companyId);
        const base = currencies.find(c => c.isBaseCurrency);
        if (!base) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'No Base Currency Found for this company');
        }
        return base;
    }
    static async createCurrency(data) {
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
        const currency = new Currency_1.Currency((0, uuid_1.v4)(), data.code, data.companyId, data.name, data.symbol, data.exchangeRate, data.isBaseCurrency, data.isActive, data.decimalPlaces || 2);
        await this.repo.create(currency);
        return currency.id;
    }
    static async updateCurrency(id, companyId, updates) {
        const currency = await this.repo.findById(id, companyId);
        if (!currency) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Currency not found');
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
        }
        else {
            currency.exchangeRate = 1;
        }
        await this.repo.update(currency);
        return { success: true };
    }
    static async deleteCurrency(id, companyId) {
        // Domain rule check
        const currency = await this.repo.findById(id, companyId);
        if (currency && currency.isBaseCurrency) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Cannot delete the Base Currency');
        }
        // Use direct DB for deletion as Repo doesn't have delete mapped
        const db = require('better-sqlite3')('wafi.db');
        db.prepare('DELETE FROM currencies WHERE id = ? AND company_id = ?').run(id, companyId);
        return { success: true };
    }
    static async getCurrencyHistory(code, days = 30) {
        const db = require('better-sqlite3')('wafi.db');
        const stmt = db.prepare(`
            SELECT date, rate 
            FROM currency_rate_history 
            WHERE currency_code = ? 
            ORDER BY date ASC 
            LIMIT ?
        `);
        return stmt.all(code, days);
    }
}
exports.CurrencyService = CurrencyService;
CurrencyService.repo = new SqliteCurrencyRepo_1.SqliteCurrencyRepo();
