
import axios from 'axios';
import * as cheerio from 'cheerio';
import schedule from 'node-schedule';
import { db } from '../database';

const PMA_URL = 'https://www.pma.ps/';

interface ExchangeRate {
    currency: string;
    rate: number;
}

export class CurrencyScraperService {
    private job: schedule.Job | null = null;

    constructor() {
        this.initialize();
    }

    private initialize() {
        // Schedule job to run every day at 10:00 AM
        this.job = schedule.scheduleJob('0 10 * * *', () => {
            console.log('[CurrencyScraper] Starting daily update...');
            this.updateRates();
        });

        console.log('[CurrencyScraper] Service initialized. Next run:', this.job?.nextInvocation());
    }

    public async updateRates(): Promise<boolean> {
        try {
            console.log('[CurrencyScraper] Fetching main page...');

            // 1. Fetch Main Page to get Iframe Token/URL
            const mainResponse = await axios.get(PMA_URL);
            const $main = cheerio.load(mainResponse.data);

            const iframeSrc = $main('iframe#currency-ifrm').attr('src');
            if (!iframeSrc) {
                console.error('[CurrencyScraper] Iframe not found on main page.');
                return false;
            }

            console.log('[CurrencyScraper] Found iframe:', iframeSrc);

            // 2. Fetch Iframe Content
            const iframeResponse = await axios.get(iframeSrc);
            const $ = cheerio.load(iframeResponse.data);

            const rates: { code: string, rate: number }[] = [];

            // Helper to extract rate using Regex from the card text
            // Structure is variable, but text "البيع" (Sell) usually precedes the value
            const extractRate = (keywords: string[]) => {
                let foundRate: number | null = null;

                // Find li that contains the currency image or name
                // We assume one li per currency
                const li = $('ul li').filter((i, el) => {
                    const html = $(el).html() || '';
                    return keywords.some(k => html.toLowerCase().includes(k.toLowerCase()));
                }).first();

                if (li.length) {
                    const text = li.text().replace(/\s+/g, ' '); // Clean whitespace
                    // Regex to find "البيع" followed by number
                    // Matches: "البيع = 3.65" or "البيع: 3.65" or just "البيع 3.65"
                    const match = text.match(/البيع\s*[=:]?\s*([\d.]+)/);
                    if (match && match[1]) {
                        foundRate = parseFloat(match[1]);
                    }
                }
                return foundRate;
            };

            const usdRate = extractRate(['usd', 'dollar', 'دولار']);
            const jodRate = extractRate(['jod', 'dinar', 'دينار']);
            const eurRate = extractRate(['eur', 'euro', 'يورو']);

            if (usdRate) rates.push({ code: 'USD', rate: usdRate });
            if (jodRate) rates.push({ code: 'JOD', rate: jodRate });
            if (eurRate) rates.push({ code: 'EUR', rate: eurRate });

            console.log('[CurrencyScraper] Extracted Rates:', rates);

            if (rates.length === 0) {
                console.warn('[CurrencyScraper] No rates found.');
                return false;
            }

            db.exec(`
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

            // 3. Update Database
            const updateStmt = db.prepare(`
                UPDATE currencies
                SET
                    exchange_rate = @rate,
                    last_update = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE UPPER(TRIM(COALESCE(code, ''))) = UPPER(TRIM(@code))
                  AND COALESCE(is_base, 0) = 0
                  AND COALESCE(is_base_currency, 0) = 0
                  AND COALESCE(is_fixed, 0) = 0
            `);

            const historyTimelineStmt = db.prepare(`
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
                    id,
                    COALESCE(company_id, 'COMP_01'),
                    UPPER(TRIM(COALESCE(code, @code))),
                    @rate,
                    date('now', 'localtime'),
                    datetime('now', 'localtime'),
                    'SCRAPER',
                    COALESCE(is_fixed, 0)
                FROM currencies
                WHERE UPPER(TRIM(COALESCE(code, ''))) = UPPER(TRIM(@code))
                  AND COALESCE(is_base, 0) = 0
                  AND COALESCE(is_base_currency, 0) = 0
                  AND COALESCE(is_fixed, 0) = 0
            `);

            const transaction = db.transaction((items) => {
                for (const item of items) {
                    const result = updateStmt.run(item);
                    console.log(`[CurrencyScraper] Updated ${item.code}: ${result.changes > 0 ? 'Success' : 'Not Found/Base/Fixed'}`);

                    // Insert History
                    try {
                        historyTimelineStmt.run(item);

                        const historyStmt = db.prepare(`
                             INSERT INTO currency_rate_history (currency_code, rate, date)
                             VALUES (@code, @rate, date('now', 'localtime'))
                             ON CONFLICT(currency_code, date) DO UPDATE SET rate = @rate
                        `);
                        historyStmt.run(item);
                    } catch (histErr: any) {
                        console.error(`[CurrencyScraper] History insert failed for ${item.code}:`, histErr.message);
                    }
                }
            });

            transaction(rates);
            console.log('[CurrencyScraper] Database updated successfully.');
            return true;

        } catch (error: any) {
            console.error('[CurrencyScraper] Failed to update rates:', error.message);
            return false;
        }
    }

    public stop() {
        this.job?.cancel();
    }
}
