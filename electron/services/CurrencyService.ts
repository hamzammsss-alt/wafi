import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Currency {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    symbol: string;
    is_base: number; // 0 or 1
    exchange_rate: number;
    last_update?: string;
}

export class CurrencyService {

    static getCurrencies(): Currency[] {
        const stmt = db.prepare('SELECT * FROM currencies ORDER BY is_base DESC, code ASC');
        return stmt.all() as Currency[];
    }

    static getBaseCurrency(): Currency {
        const stmt = db.prepare('SELECT * FROM currencies WHERE is_base = 1');
        const currency = stmt.get() as Currency;
        if (!currency) {
            // Fallback or Error
            throw new Error('No Base Currency Found');
        }
        return currency;
    }

    static createCurrency(currency: Omit<Currency, 'id'>) {
        // If setting as base, unset others
        if (currency.is_base) {
            db.prepare('UPDATE currencies SET is_base = 0').run();
        }

        const id = uuidv4();
        const stmt = db.prepare(`
      INSERT INTO currencies (id, code, name_ar, name_en, symbol, is_base, exchange_rate)
      VALUES (@id, @code, @name_ar, @name_en, @symbol, @is_base, @exchange_rate)
    `);

        stmt.run({
            id,
            ...currency
        });

        return id;
    }

    static updateCurrency(currency: Currency) {
        if (currency.is_base) {
            db.prepare('UPDATE currencies SET is_base = 0').run();
            // Base currency rate MUST be 1
            currency.exchange_rate = 1.0;
        }

        const stmt = db.prepare(`
        UPDATE currencies 
        SET code = @code, name_ar = @name_ar, name_en = @name_en, 
            symbol = @symbol, is_base = @is_base, exchange_rate = @exchange_rate, 
            last_update = CURRENT_TIMESTAMP
        WHERE id = @id
    `);

        stmt.run(currency);
        return { success: true };
    }

    static deleteCurrency(id: string) {
        // Check if base
        const current = db.prepare('SELECT is_base FROM currencies WHERE id = ?').get(id) as Currency;
        if (current && current.is_base) {
            throw new Error("Cannot delete the Base Currency");
        }
        db.prepare('DELETE FROM currencies WHERE id = ?').run(id);
        return { success: true };
    }

    static getCurrencyHistory(code: string, days: number = 30): { date: string, rate: number }[] {
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
