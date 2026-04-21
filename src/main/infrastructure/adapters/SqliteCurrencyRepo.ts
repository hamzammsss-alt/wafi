import { Currency } from '../../domain/entities/Currency';
import {
    CurrencyRateHistoryEntry,
    CurrencyRepoPort,
    CurrencyUsageSummary,
    SaveCurrencyRateHistoryInput,
} from '../../domain/ports/CurrencyRepoPort';
import Database from 'better-sqlite3';

export class SqliteCurrencyRepo implements CurrencyRepoPort {
    private db: Database.Database;

    constructor(database?: Database.Database) {
        this.db = database || new Database('wafi.db');
        this.ensureTableExists();
    }

    private ensureTableExists() {
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
        const cols = this.db.prepare("PRAGMA table_info(currencies)").all() as any[];
        const hasCol = (name: string) => cols.some(c => c.name === name);
        const addCol = (sql: string) => this.db.prepare(sql).run();

        if (!hasCol('company_id')) addCol("ALTER TABLE currencies ADD COLUMN company_id TEXT");
        if (!hasCol('name')) addCol("ALTER TABLE currencies ADD COLUMN name TEXT");
        if (!hasCol('name_ar')) addCol("ALTER TABLE currencies ADD COLUMN name_ar TEXT");
        if (!hasCol('name_en')) addCol("ALTER TABLE currencies ADD COLUMN name_en TEXT");
        if (!hasCol('symbol')) addCol("ALTER TABLE currencies ADD COLUMN symbol TEXT");
        if (!hasCol('exchange_rate')) addCol("ALTER TABLE currencies ADD COLUMN exchange_rate REAL DEFAULT 1.0");
        if (!hasCol('is_base_currency')) addCol("ALTER TABLE currencies ADD COLUMN is_base_currency INTEGER DEFAULT 0");
        if (!hasCol('is_base')) addCol("ALTER TABLE currencies ADD COLUMN is_base INTEGER DEFAULT 0");
        if (!hasCol('is_fixed')) addCol("ALTER TABLE currencies ADD COLUMN is_fixed INTEGER DEFAULT 0");
        if (!hasCol('is_active')) addCol("ALTER TABLE currencies ADD COLUMN is_active INTEGER DEFAULT 1");
        if (!hasCol('decimal_places')) addCol("ALTER TABLE currencies ADD COLUMN decimal_places INTEGER DEFAULT 2");
        if (!hasCol('created_at')) addCol("ALTER TABLE currencies ADD COLUMN created_at DATETIME");
        if (!hasCol('updated_at')) addCol("ALTER TABLE currencies ADD COLUMN updated_at DATETIME");
        if (!hasCol('last_update')) addCol("ALTER TABLE currencies ADD COLUMN last_update DATETIME");

        const hasNameAr = hasCol('name_ar');
        const hasNameEn = hasCol('name_en');
        const hasIsBase = hasCol('is_base');
        const hasIsBaseCurrency = hasCol('is_base_currency');

        // Normalize legacy rows
        this.db.prepare("UPDATE currencies SET company_id = 'COMP_01' WHERE company_id IS NULL OR TRIM(company_id) = ''").run();
        if (hasNameAr) {
            this.db.prepare("UPDATE currencies SET name = COALESCE(NULLIF(name, ''), name_ar, code) WHERE name IS NULL OR TRIM(name) = ''").run();
            this.db.prepare("UPDATE currencies SET name_ar = COALESCE(NULLIF(name_ar, ''), name, code) WHERE name_ar IS NULL OR TRIM(name_ar) = ''").run();
        } else {
            this.db.prepare("UPDATE currencies SET name = COALESCE(NULLIF(name, ''), code) WHERE name IS NULL OR TRIM(name) = ''").run();
        }
        if (hasNameEn) {
            this.db.prepare("UPDATE currencies SET name_en = COALESCE(name_en, '') WHERE name_en IS NULL").run();
        }
        if (hasIsBase && hasIsBaseCurrency) {
            this.db.prepare(`
                UPDATE currencies
                SET
                    is_base_currency = CASE WHEN COALESCE(is_base_currency, 0) = 1 OR COALESCE(is_base, 0) = 1 THEN 1 ELSE 0 END,
                    is_base = CASE WHEN COALESCE(is_base_currency, 0) = 1 OR COALESCE(is_base, 0) = 1 THEN 1 ELSE 0 END
            `).run();
        } else if (hasIsBaseCurrency) {
            this.db.prepare("UPDATE currencies SET is_base_currency = COALESCE(is_base_currency, 0) WHERE is_base_currency IS NULL").run();
        } else if (hasIsBase) {
            this.db.prepare("UPDATE currencies SET is_base = COALESCE(is_base, 0) WHERE is_base IS NULL").run();
        }
        this.db.prepare("UPDATE currencies SET exchange_rate = 1.0 WHERE exchange_rate IS NULL").run();
        this.db.prepare(`
            UPDATE currencies
            SET is_fixed = CASE
                WHEN COALESCE(is_base_currency, 0) = 1 OR COALESCE(is_base, 0) = 1 THEN 1
                ELSE COALESCE(is_fixed, 0)
            END
            WHERE is_fixed IS NULL
               OR COALESCE(is_base_currency, 0) = 1
               OR COALESCE(is_base, 0) = 1
        `).run();
        this.db.prepare("UPDATE currencies SET is_active = 1 WHERE is_active IS NULL").run();
        this.db.prepare("UPDATE currencies SET decimal_places = 2 WHERE decimal_places IS NULL").run();
        this.db.prepare("UPDATE currencies SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL").run();
        this.db.prepare("UPDATE currencies SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL").run();
        if (hasCol('last_update')) {
            this.db.prepare("UPDATE currencies SET last_update = CURRENT_TIMESTAMP WHERE last_update IS NULL").run();
        }

        this.ensureHistoryTableExists();
        this.consolidateShekelCurrencies();

        this.db.exec("CREATE INDEX IF NOT EXISTS idx_currencies_company ON currencies(company_id)");
        try {
            this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_currencies_code ON currencies(company_id, code)");
        } catch (err: any) {
            console.warn('[CurrencyRepo] Could not create unique index idx_currencies_code:', err?.message || err);
        }
    }

    async create(currency: Currency): Promise<void> {
        const columns = this.getColumnSet();
        const insertColumns: string[] = [];
        const values: any[] = [];

        const pushValue = (column: string, value: any) => {
            if (!columns.has(column)) return;
            insertColumns.push(column);
            values.push(value);
        };

        pushValue('id', currency.id);
        pushValue('code', currency.code);
        pushValue('company_id', currency.companyId);
        pushValue('name', currency.name);
        pushValue('name_ar', this.getArabicName(currency));
        pushValue('name_en', this.getEnglishName(currency));
        pushValue('symbol', currency.symbol || null);
        pushValue('exchange_rate', currency.exchangeRate);
        pushValue('is_base_currency', currency.isBaseCurrency ? 1 : 0);
        pushValue('is_base', currency.isBaseCurrency ? 1 : 0);
        pushValue('is_fixed', currency.isFixedRate ? 1 : 0);
        pushValue('is_active', currency.isActive ? 1 : 0);
        pushValue('decimal_places', currency.decimalPlaces);
        pushValue('last_update', this.currentTimestamp());

        const placeholders = insertColumns.map(() => '?').join(', ');
        const stmt = this.db.prepare(`
            INSERT INTO currencies (${insertColumns.join(', ')})
            VALUES (${placeholders})
        `);
        stmt.run(...values);
    }

    async update(currency: Currency): Promise<void> {
        const columns = this.getColumnSet();
        const setClauses: string[] = [];
        const values: any[] = [];

        const setValue = (column: string, value: any) => {
            if (!columns.has(column)) return;
            setClauses.push(`${column} = ?`);
            values.push(value);
        };

        setValue('name', currency.name);
        setValue('name_ar', this.getArabicName(currency));
        setValue('name_en', this.getEnglishName(currency));
        setValue('symbol', currency.symbol || null);
        setValue('exchange_rate', currency.exchangeRate);
        setValue('is_base_currency', currency.isBaseCurrency ? 1 : 0);
        setValue('is_base', currency.isBaseCurrency ? 1 : 0);
        setValue('is_fixed', currency.isFixedRate ? 1 : 0);
        setValue('is_active', currency.isActive ? 1 : 0);
        setValue('decimal_places', currency.decimalPlaces);

        if (columns.has('updated_at')) {
            setClauses.push('updated_at = CURRENT_TIMESTAMP');
        }
        if (columns.has('last_update')) {
            setClauses.push('last_update = CURRENT_TIMESTAMP');
        }

        const whereClauses = ['id = ?'];
        values.push(currency.id);
        if (columns.has('company_id')) {
            whereClauses.push('company_id = ?');
            values.push(currency.companyId);
        }

        const stmt = this.db.prepare(`
            UPDATE currencies
            SET ${setClauses.join(', ')}
            WHERE ${whereClauses.join(' AND ')}
        `);
        stmt.run(...values);
    }

    async delete(id: string, companyId: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM currencies WHERE id = ? AND company_id = ?');
        stmt.run(id, companyId);
    }

    async getUsageSummary(id: string): Promise<CurrencyUsageSummary[]> {
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;
        const usage: CurrencyUsageSummary[] = [];

        for (const { name: tableName } of tables) {
            if (!this.isSafeIdentifier(tableName)) continue;

            const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as Array<{ table: string; from: string }>;
            const currencyRefs = foreignKeys.filter(fk => fk.table === 'currencies' && this.isSafeIdentifier(fk.from));

            for (const ref of currencyRefs) {
                const row = this.db.prepare(`SELECT COUNT(*) AS count FROM "${tableName}" WHERE "${ref.from}" = ?`).get(id) as { count: number } | undefined;
                const count = Number(row?.count || 0);
                if (count > 0) {
                    usage.push({ table: tableName, count });
                }
            }
        }

        return usage.sort((a, b) => a.table.localeCompare(b.table));
    }

    async saveRateHistory(input: SaveCurrencyRateHistoryInput): Promise<void> {
        const normalizedCode = this.normalizeCurrencyCode(input.currencyCode);
        const normalizedDate = this.normalizeHistoryDate(input.date);
        const normalizedRecordedAt = this.normalizeRecordedAt(input.recordedAt);
        const normalizedSource = this.normalizeText(input.source).toUpperCase() || 'MANUAL';
        const rate = this.toPositiveNumber(input.rate, 1);

        this.db.prepare(`
            INSERT INTO currency_rates_history (
                id,
                currency_id,
                company_id,
                currency_code,
                rate,
                rate_date,
                recorded_at,
                source,
                is_fixed
            )
            VALUES (
                lower(hex(randomblob(16))),
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `).run(
            input.currencyId,
            input.companyId || 'COMP_01',
            normalizedCode,
            rate,
            normalizedDate,
            normalizedRecordedAt,
            normalizedSource,
            input.isFixed ? 1 : 0,
        );
    }

    async getRateHistory(code: string, companyId: string, limit: number = 30): Promise<CurrencyRateHistoryEntry[]> {
        const normalizedCode = this.normalizeCurrencyCode(code);
        const maxRows = this.normalizeLimit(limit, 30);

        const rows = this.db.prepare(`
            WITH ranked_history AS (
                SELECT
                    h.id,
                    h.currency_id,
                    COALESCE(h.company_id, c.company_id, 'COMP_01') AS company_id,
                    COALESCE(NULLIF(h.currency_code, ''), c.code) AS currency_code,
                    h.rate,
                    COALESCE(h.rate_date, date(h.recorded_at), date('now')) AS rate_date,
                    h.recorded_at,
                    COALESCE(NULLIF(h.source, ''), 'MANUAL') AS source,
                    COALESCE(h.is_fixed, 0) AS is_fixed,
                    ROW_NUMBER() OVER (
                        PARTITION BY COALESCE(h.rate_date, date(h.recorded_at), date('now'))
                        ORDER BY COALESCE(h.recorded_at, h.rate_date || ' 00:00:00') DESC, h.rowid DESC
                    ) AS row_num
                FROM currency_rates_history h
                INNER JOIN currencies c ON c.id = h.currency_id
                WHERE COALESCE(h.company_id, c.company_id, 'COMP_01') = ?
                  AND UPPER(TRIM(COALESCE(h.currency_code, c.code, ''))) = ?
            ),
            daily_history AS (
                SELECT *
                FROM ranked_history
                WHERE row_num = 1
                ORDER BY rate_date DESC
                LIMIT ?
            )
            SELECT *
            FROM daily_history
            ORDER BY rate_date ASC, COALESCE(recorded_at, rate_date || ' 00:00:00') ASC
        `).all(companyId, normalizedCode, maxRows) as any[];

        return rows.map(row => this.mapHistoryRow(row));
    }

    async getRateTimeline(code: string, companyId: string, limit: number = 20): Promise<CurrencyRateHistoryEntry[]> {
        const normalizedCode = this.normalizeCurrencyCode(code);
        const maxRows = this.normalizeLimit(limit, 20);

        const rows = this.db.prepare(`
            SELECT
                h.id,
                h.currency_id,
                COALESCE(h.company_id, c.company_id, 'COMP_01') AS company_id,
                COALESCE(NULLIF(h.currency_code, ''), c.code) AS currency_code,
                h.rate,
                COALESCE(h.rate_date, date(h.recorded_at), date('now')) AS rate_date,
                h.recorded_at,
                COALESCE(NULLIF(h.source, ''), 'MANUAL') AS source,
                COALESCE(h.is_fixed, 0) AS is_fixed
            FROM currency_rates_history h
            INNER JOIN currencies c ON c.id = h.currency_id
            WHERE COALESCE(h.company_id, c.company_id, 'COMP_01') = ?
              AND UPPER(TRIM(COALESCE(h.currency_code, c.code, ''))) = ?
            ORDER BY COALESCE(h.recorded_at, h.rate_date || ' 00:00:00') DESC, h.rowid DESC
            LIMIT ?
        `).all(companyId, normalizedCode, maxRows) as any[];

        return rows.map(row => this.mapHistoryRow(row));
    }

    async findById(id: string, companyId: string): Promise<Currency | null> {
        const columns = this.getColumnSet();
        const whereClauses = ['id = ?'];
        const params: any[] = [id];
        if (columns.has('company_id')) {
            whereClauses.push('company_id = ?');
            params.push(companyId);
        }

        const row = this.db.prepare(`
            SELECT * FROM currencies WHERE ${whereClauses.join(' AND ')}
        `).get(...params) as any;

        if (!row) return null;

        return this.mapRowToCurrency(row);
    }

    async findAll(companyId: string): Promise<Currency[]> {
        const columns = this.getColumnSet();
        const whereClause = columns.has('company_id') ? 'WHERE company_id = ?' : '';
        const params = columns.has('company_id') ? [companyId] : [];
        const orderBy = columns.has('is_base_currency') || columns.has('is_base')
            ? '(CASE WHEN COALESCE(is_base_currency, 0) = 1 OR COALESCE(is_base, 0) = 1 THEN 1 ELSE 0 END) DESC, code ASC'
            : 'code ASC';
        const rows = this.db.prepare(`
            SELECT * FROM currencies ${whereClause} ORDER BY ${orderBy}
        `).all(...params) as any[];

        return rows.map(row => this.mapRowToCurrency(row));
    }

    private ensureHistoryTableExists(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS currency_rates_history (
                id TEXT PRIMARY KEY,
                currency_id TEXT NOT NULL,
                rate REAL NOT NULL,
                rate_date DATE NOT NULL,
                company_id TEXT,
                currency_code TEXT,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                source TEXT DEFAULT 'MANUAL',
                is_fixed INTEGER DEFAULT 0,
                FOREIGN KEY (currency_id) REFERENCES currencies(id)
            );
        `);

        const historyColumns = this.db.prepare("PRAGMA table_info(currency_rates_history)").all() as Array<{ name: string }>;
        const hasHistoryCol = (name: string) => historyColumns.some(column => column.name === name);
        const addHistoryCol = (sql: string) => this.db.prepare(sql).run();

        if (!hasHistoryCol('company_id')) addHistoryCol("ALTER TABLE currency_rates_history ADD COLUMN company_id TEXT");
        if (!hasHistoryCol('currency_code')) addHistoryCol("ALTER TABLE currency_rates_history ADD COLUMN currency_code TEXT");
        if (!hasHistoryCol('recorded_at')) addHistoryCol("ALTER TABLE currency_rates_history ADD COLUMN recorded_at DATETIME");
        if (!hasHistoryCol('source')) addHistoryCol("ALTER TABLE currency_rates_history ADD COLUMN source TEXT DEFAULT 'MANUAL'");
        if (!hasHistoryCol('is_fixed')) addHistoryCol("ALTER TABLE currency_rates_history ADD COLUMN is_fixed INTEGER DEFAULT 0");

        this.db.prepare(`
            UPDATE currency_rates_history
            SET company_id = COALESCE(
                NULLIF(company_id, ''),
                (SELECT COALESCE(c.company_id, 'COMP_01') FROM currencies c WHERE c.id = currency_rates_history.currency_id),
                'COMP_01'
            )
            WHERE company_id IS NULL OR TRIM(company_id) = ''
        `).run();
        this.db.prepare(`
            UPDATE currency_rates_history
            SET currency_code = COALESCE(
                NULLIF(currency_code, ''),
                (SELECT c.code FROM currencies c WHERE c.id = currency_rates_history.currency_id)
            )
            WHERE currency_code IS NULL OR TRIM(currency_code) = ''
        `).run();
        this.db.prepare(`
            UPDATE currency_rates_history
            SET recorded_at = COALESCE(
                recorded_at,
                CASE
                    WHEN rate_date IS NOT NULL THEN rate_date || 'T00:00:00.000Z'
                    ELSE CURRENT_TIMESTAMP
                END
            )
            WHERE recorded_at IS NULL OR TRIM(recorded_at) = ''
        `).run();
        this.db.prepare("UPDATE currency_rates_history SET source = 'MANUAL' WHERE source IS NULL OR TRIM(source) = ''").run();
        this.db.prepare("UPDATE currency_rates_history SET is_fixed = 0 WHERE is_fixed IS NULL").run();

        this.migrateLegacyRateHistory();

        this.db.exec("CREATE INDEX IF NOT EXISTS idx_currency_rates_history_company_code_date ON currency_rates_history(company_id, currency_code, rate_date DESC)");
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_currency_rates_history_currency_id ON currency_rates_history(currency_id)");
    }

    private migrateLegacyRateHistory(): void {
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>;
        const tableNames = new Set(tables.map(table => table.name));

        if (tableNames.has('currency_rate_history')) {
            this.db.prepare(`
                INSERT INTO currency_rates_history (
                    id,
                    currency_id,
                    company_id,
                    currency_code,
                    rate,
                    rate_date,
                    recorded_at,
                    source,
                    is_fixed
                )
                SELECT
                    lower(hex(randomblob(16))),
                    c.id,
                    COALESCE(c.company_id, 'COMP_01'),
                    UPPER(TRIM(COALESCE(legacy.currency_code, c.code))),
                    legacy.rate,
                    legacy.date,
                    COALESCE(NULLIF(legacy.created_at, ''), legacy.date || 'T00:00:00.000Z'),
                    'SCRAPER',
                    COALESCE(c.is_fixed, 0)
                FROM currency_rate_history legacy
                INNER JOIN currencies c
                    ON UPPER(TRIM(COALESCE(c.code, ''))) = UPPER(TRIM(COALESCE(legacy.currency_code, '')))
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM currency_rates_history current
                    WHERE current.currency_id = c.id
                      AND current.rate_date = legacy.date
                      AND ABS(current.rate - legacy.rate) < 0.000001
                      AND UPPER(TRIM(COALESCE(current.source, ''))) = 'SCRAPER'
                )
            `).run();
        }

        if (tableNames.has('currency_rates')) {
            this.db.prepare(`
                INSERT INTO currency_rates_history (
                    id,
                    currency_id,
                    company_id,
                    currency_code,
                    rate,
                    rate_date,
                    recorded_at,
                    source,
                    is_fixed
                )
                SELECT
                    lower(hex(randomblob(16))),
                    c.id,
                    COALESCE(c.company_id, 'COMP_01'),
                    UPPER(TRIM(COALESCE(legacy.currency_code, c.code))),
                    legacy.rate,
                    COALESCE(legacy.date, date(legacy.created_at), date('now')),
                    COALESCE(NULLIF(legacy.created_at, ''), COALESCE(legacy.date, date('now')) || 'T00:00:00.000Z'),
                    COALESCE(NULLIF(legacy.source, ''), 'SYSTEM'),
                    COALESCE(c.is_fixed, 0)
                FROM currency_rates legacy
                INNER JOIN currencies c
                    ON UPPER(TRIM(COALESCE(c.code, ''))) = UPPER(TRIM(COALESCE(legacy.currency_code, '')))
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM currency_rates_history current
                    WHERE current.currency_id = c.id
                      AND current.rate_date = COALESCE(legacy.date, date(legacy.created_at), date('now'))
                      AND ABS(current.rate - legacy.rate) < 0.000001
                      AND UPPER(TRIM(COALESCE(current.source, ''))) = UPPER(TRIM(COALESCE(legacy.source, 'SYSTEM')))
                )
            `).run();
        }
    }

    private getColumnSet(): Set<string> {
        const cols = this.db.prepare("PRAGMA table_info(currencies)").all() as Array<{ name: string }>;
        return new Set(cols.map(col => col.name));
    }

    private mapRowToCurrency(row: any): Currency {
        const name = this.normalizeText(row.name) || this.normalizeText(row.name_ar) || this.normalizeText(row.name_en) || row.code;
        const nameAr = this.normalizeText(row.name_ar) || name;
        const nameEn = this.normalizeText(row.name_en);
        const exchangeRate = this.toPositiveNumber(row.exchange_rate, 1);
        const isBase = Number(row.is_base_currency || 0) === 1 || Number(row.is_base || 0) === 1;
        const isFixed = isBase || Number(row.is_fixed || 0) === 1;
        const isActive = row.is_active === undefined || row.is_active === null ? true : Number(row.is_active) !== 0;
        const decimalPlaces = this.toPositiveNumber(row.decimal_places, 2);

        return new Currency(
            row.id,
            row.code,
            row.company_id || 'COMP_01',
            name,
            row.symbol || '',
            exchangeRate,
            isBase,
            isActive,
            decimalPlaces,
            nameAr,
            nameEn,
            isFixed,
            this.normalizeText(row.last_update) || null,
        );
    }

    private mapHistoryRow(row: any): CurrencyRateHistoryEntry {
        return {
            id: String(row.id || ''),
            currencyId: String(row.currency_id || ''),
            companyId: String(row.company_id || 'COMP_01'),
            currencyCode: this.normalizeCurrencyCode(row.currency_code),
            rate: this.toPositiveNumber(row.rate, 1),
            date: this.normalizeHistoryDate(row.rate_date),
            recordedAt: this.normalizeText(row.recorded_at) || null,
            source: this.normalizeText(row.source).toUpperCase() || 'MANUAL',
            isFixed: Number(row.is_fixed || 0) === 1,
        };
    }

    private getArabicName(currency: Currency): string {
        return this.normalizeText(currency.nameAr) || this.normalizeText(currency.name) || currency.code;
    }

    private getEnglishName(currency: Currency): string | null {
        const nameEn = this.normalizeText(currency.nameEn);
        return nameEn || null;
    }

    private normalizeText(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private toPositiveNumber(value: unknown, fallback: number): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    private currentTimestamp(): string {
        return new Date().toISOString();
    }

    private normalizeHistoryDate(value: unknown): string {
        const normalized = this.normalizeText(value);
        if (!normalized) {
            return new Date().toISOString().slice(0, 10);
        }

        const datePart = normalized.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return datePart;
        }

        const parsed = new Date(normalized);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }

        return new Date().toISOString().slice(0, 10);
    }

    private normalizeRecordedAt(value: unknown): string {
        const normalized = this.normalizeText(value);
        if (!normalized) {
            return this.currentTimestamp();
        }

        const parsed = new Date(normalized);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }

        return this.currentTimestamp();
    }

    private normalizeLimit(value: unknown, fallback: number): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
        return Math.min(Math.round(parsed), 3650);
    }

    private isSafeIdentifier(value: string): boolean {
        return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
    }

    private normalizeCurrencyCode(value: unknown): string {
        const normalized = this.normalizeText(value).toUpperCase();
        if (!normalized) return '';
        if (normalized === 'NIS') return 'ILS';
        return normalized;
    }

    private consolidateShekelCurrencies(): void {
        const companyRows = this.db.prepare(`
            SELECT DISTINCT COALESCE(company_id, 'COMP_01') AS company_id
            FROM currencies
            WHERE UPPER(TRIM(COALESCE(code, ''))) IN ('ILS', 'NIS')
        `).all() as Array<{ company_id: string }>;

        for (const companyRow of companyRows) {
            const rows = this.db.prepare(`
                SELECT *
                FROM currencies
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND UPPER(TRIM(COALESCE(code, ''))) IN ('ILS', 'NIS')
                ORDER BY
                    CASE WHEN UPPER(TRIM(COALESCE(code, ''))) = 'ILS' THEN 0 ELSE 1 END,
                    CASE WHEN COALESCE(is_base_currency, 0) = 1 OR COALESCE(is_base, 0) = 1 THEN 0 ELSE 1 END,
                    id ASC
            `).all(companyRow.company_id) as any[];

            if (rows.length === 0) continue;

            const canonical = rows.find(row => this.normalizeCurrencyCode(row.code) === 'ILS' && String(row.code || '').trim().toUpperCase() === 'ILS') || rows[0];
            const duplicates = rows.filter(row => row.id !== canonical.id);

            const nameAr = this.pickPreferredValue(rows.map(row => row.name_ar), 'شيكل إسرائيلي جديد');
            const nameEn = this.pickPreferredValue(rows.map(row => row.name_en), 'Israeli New Shekel');
            const symbol = this.pickPreferredValue(rows.map(row => row.symbol), '₪');
            const isBase = rows.some(row => Number(row.is_base_currency || 0) === 1 || Number(row.is_base || 0) === 1);
            const isFixed = isBase || rows.some(row => Number(row.is_fixed || 0) === 1);

            const tx = this.db.transaction(() => {
                this.db.prepare(`
                    UPDATE currencies
                    SET
                        code = ?,
                        name = ?,
                        name_ar = ?,
                        name_en = ?,
                        symbol = ?,
                        exchange_rate = ?,
                        is_base_currency = ?,
                        is_base = ?,
                        is_fixed = ?,
                        updated_at = CURRENT_TIMESTAMP,
                        last_update = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(
                    'ILS',
                    nameAr,
                    nameAr,
                    nameEn,
                    symbol,
                    1,
                    isBase ? 1 : 0,
                    isBase ? 1 : 0,
                    isFixed ? 1 : 0,
                    canonical.id
                );

                for (const duplicate of duplicates) {
                    this.repointCurrencyReferences(duplicate.id, canonical.id);
                    this.db.prepare(`DELETE FROM currencies WHERE id = ?`).run(duplicate.id);
                }

                this.normalizeLegacyCurrencyCodes('NIS', 'ILS');
            });

            tx();
        }
    }

    private repointCurrencyReferences(fromCurrencyId: string, toCurrencyId: string): void {
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;

        for (const { name: tableName } of tables) {
            if (!this.isSafeIdentifier(tableName) || tableName === 'currencies') continue;

            const columns = this.db.prepare(`PRAGMA table_info("${tableName}")`).all() as Array<{ name: string }>;
            const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as Array<{ table: string; from: string }>;

            const candidateColumns = new Set<string>();
            for (const foreignKey of foreignKeys) {
                if (foreignKey.table === 'currencies' && this.isSafeIdentifier(foreignKey.from)) {
                    candidateColumns.add(foreignKey.from);
                }
            }

            for (const column of columns) {
                if (!this.isSafeIdentifier(column.name)) continue;
                if (column.name.toLowerCase().includes('currency')) {
                    candidateColumns.add(column.name);
                }
            }

            for (const columnName of candidateColumns) {
                this.db.prepare(`
                    UPDATE "${tableName}"
                    SET "${columnName}" = ?
                    WHERE "${columnName}" = ?
                `).run(toCurrencyId, fromCurrencyId);
            }
        }
    }

    private normalizeLegacyCurrencyCodes(fromCode: string, toCode: string): void {
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;

        for (const { name: tableName } of tables) {
            if (!this.isSafeIdentifier(tableName)) continue;

            const columns = this.db.prepare(`PRAGMA table_info("${tableName}")`).all() as Array<{ name: string }>;
            for (const column of columns) {
                if (!this.isSafeIdentifier(column.name)) continue;
                if (!column.name.toLowerCase().includes('currency')) continue;

                this.db.prepare(`
                    UPDATE "${tableName}"
                    SET "${column.name}" = ?
                    WHERE UPPER(TRIM(COALESCE("${column.name}", ''))) = ?
                `).run(toCode, fromCode);
            }
        }
    }

    private pickPreferredValue(values: unknown[], fallback: string): string {
        const normalizedValues = values
            .map(value => this.normalizeText(value))
            .filter(Boolean)
            .sort((left, right) => right.length - left.length);

        return normalizedValues[0] || fallback;
    }
}
