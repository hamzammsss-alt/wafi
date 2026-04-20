"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteCurrencyRepo = void 0;
const Currency_1 = require("../../domain/entities/Currency");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SqliteCurrencyRepo {
    constructor(database) {
        this.db = database || new better_sqlite3_1.default('wafi.db');
        this.ensureTableExists();
    }
    ensureTableExists() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS currencies (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                symbol TEXT,
                exchange_rate REAL DEFAULT 1.0,
                is_base_currency INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                decimal_places INTEGER DEFAULT 2,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Migrate legacy currencies schema before creating indexes.
        const cols = this.db.prepare("PRAGMA table_info(currencies)").all();
        const hasCol = (name) => cols.some(c => c.name === name);
        const addCol = (sql) => this.db.prepare(sql).run();
        if (!hasCol('company_id'))
            addCol("ALTER TABLE currencies ADD COLUMN company_id TEXT");
        if (!hasCol('name'))
            addCol("ALTER TABLE currencies ADD COLUMN name TEXT");
        if (!hasCol('symbol'))
            addCol("ALTER TABLE currencies ADD COLUMN symbol TEXT");
        if (!hasCol('exchange_rate'))
            addCol("ALTER TABLE currencies ADD COLUMN exchange_rate REAL DEFAULT 1.0");
        if (!hasCol('is_base_currency'))
            addCol("ALTER TABLE currencies ADD COLUMN is_base_currency INTEGER DEFAULT 0");
        if (!hasCol('is_active'))
            addCol("ALTER TABLE currencies ADD COLUMN is_active INTEGER DEFAULT 1");
        if (!hasCol('decimal_places'))
            addCol("ALTER TABLE currencies ADD COLUMN decimal_places INTEGER DEFAULT 2");
        if (!hasCol('created_at'))
            addCol("ALTER TABLE currencies ADD COLUMN created_at DATETIME");
        if (!hasCol('updated_at'))
            addCol("ALTER TABLE currencies ADD COLUMN updated_at DATETIME");
        const hasNameAr = hasCol('name_ar');
        const hasIsBase = hasCol('is_base');
        // Normalize legacy rows
        this.db.prepare("UPDATE currencies SET company_id = 'COMP_01' WHERE company_id IS NULL OR TRIM(company_id) = ''").run();
        if (hasNameAr) {
            this.db.prepare("UPDATE currencies SET name = COALESCE(NULLIF(name, ''), name_ar, code) WHERE name IS NULL OR TRIM(name) = ''").run();
        }
        else {
            this.db.prepare("UPDATE currencies SET name = COALESCE(NULLIF(name, ''), code) WHERE name IS NULL OR TRIM(name) = ''").run();
        }
        if (hasIsBase) {
            this.db.prepare("UPDATE currencies SET is_base_currency = COALESCE(is_base_currency, is_base, 0) WHERE is_base_currency IS NULL").run();
        }
        else {
            this.db.prepare("UPDATE currencies SET is_base_currency = 0 WHERE is_base_currency IS NULL").run();
        }
        this.db.prepare("UPDATE currencies SET exchange_rate = 1.0 WHERE exchange_rate IS NULL").run();
        this.db.prepare("UPDATE currencies SET is_active = 1 WHERE is_active IS NULL").run();
        this.db.prepare("UPDATE currencies SET decimal_places = 2 WHERE decimal_places IS NULL").run();
        this.db.prepare("UPDATE currencies SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL").run();
        this.db.prepare("UPDATE currencies SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL").run();
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_currencies_company ON currencies(company_id)");
        try {
            this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_currencies_code ON currencies(company_id, code)");
        }
        catch (err) {
            console.warn('[CurrencyRepo] Could not create unique index idx_currencies_code:', err?.message || err);
        }
    }
    async create(currency) {
        const stmt = this.db.prepare(`
            INSERT INTO currencies (id, code, company_id, name, symbol, exchange_rate, is_base_currency, is_active, decimal_places)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(currency.id, currency.code, currency.companyId, currency.name, currency.symbol, currency.exchangeRate, currency.isBaseCurrency ? 1 : 0, currency.isActive ? 1 : 0, currency.decimalPlaces);
    }
    async update(currency) {
        const stmt = this.db.prepare(`
            UPDATE currencies 
            SET name = ?, symbol = ?, exchange_rate = ?, is_base_currency = ?, is_active = ?, decimal_places = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND company_id = ?
        `);
        stmt.run(currency.name, currency.symbol, currency.exchangeRate, currency.isBaseCurrency ? 1 : 0, currency.isActive ? 1 : 0, currency.decimalPlaces, currency.id, currency.companyId);
    }
    async delete(id, companyId) {
        const stmt = this.db.prepare('DELETE FROM currencies WHERE id = ? AND company_id = ?');
        stmt.run(id, companyId);
    }
    async findById(id, companyId) {
        const row = this.db.prepare(`
            SELECT * FROM currencies WHERE id = ? AND company_id = ?
        `).get(id, companyId);
        if (!row)
            return null;
        return new Currency_1.Currency(row.id, row.code, row.company_id || 'COMP_01', row.name || row.name_ar || row.code, row.symbol, row.exchange_rate, row.is_base_currency === 1, row.is_active === 1, row.decimal_places ?? 2);
    }
    async findAll(companyId) {
        const rows = this.db.prepare(`
            SELECT * FROM currencies WHERE company_id = ? ORDER BY is_base_currency DESC, code ASC
        `).all(companyId);
        return rows.map(row => new Currency_1.Currency(row.id, row.code, row.company_id || 'COMP_01', row.name || row.name_ar || row.code, row.symbol, row.exchange_rate, row.is_base_currency === 1, row.is_active === 1, row.decimal_places ?? 2));
    }
}
exports.SqliteCurrencyRepo = SqliteCurrencyRepo;
