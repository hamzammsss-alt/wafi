"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyScraperService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const node_schedule_1 = __importDefault(require("node-schedule"));
const database_1 = require("../database");
const PMA_URL = 'https://www.pma.ps/';
class CurrencyScraperService {
    constructor() {
        this.job = null;
        this.initialize();
    }
    initialize() {
        // Schedule job to run every day at 10:00 AM
        this.job = node_schedule_1.default.scheduleJob('0 10 * * *', () => {
            console.log('[CurrencyScraper] Starting daily update...');
            this.updateRates();
        });
        console.log('[CurrencyScraper] Service initialized. Next run:', this.job?.nextInvocation());
    }
    async updateRates() {
        try {
            console.log('[CurrencyScraper] Fetching main page...');
            // 1. Fetch Main Page to get Iframe Token/URL
            const mainResponse = await axios_1.default.get(PMA_URL);
            const $main = cheerio.load(mainResponse.data);
            const iframeSrc = $main('iframe#currency-ifrm').attr('src');
            if (!iframeSrc) {
                console.error('[CurrencyScraper] Iframe not found on main page.');
                return false;
            }
            console.log('[CurrencyScraper] Found iframe:', iframeSrc);
            // 2. Fetch Iframe Content
            const iframeResponse = await axios_1.default.get(iframeSrc);
            const $ = cheerio.load(iframeResponse.data);
            const rates = [];
            // Helper to extract rate using Regex from the card text
            // Structure is variable, but text "البيع" (Sell) usually precedes the value
            const extractRate = (keywords) => {
                let foundRate = null;
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
            if (usdRate)
                rates.push({ code: 'USD', rate: usdRate });
            if (jodRate)
                rates.push({ code: 'JOD', rate: jodRate });
            if (eurRate)
                rates.push({ code: 'EUR', rate: eurRate });
            console.log('[CurrencyScraper] Extracted Rates:', rates);
            if (rates.length === 0) {
                console.warn('[CurrencyScraper] No rates found.');
                return false;
            }
            database_1.db.exec(`
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
            const updateStmt = database_1.db.prepare(`
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
            const historyTimelineStmt = database_1.db.prepare(`
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
            const transaction = database_1.db.transaction((items) => {
                for (const item of items) {
                    const result = updateStmt.run(item);
                    console.log(`[CurrencyScraper] Updated ${item.code}: ${result.changes > 0 ? 'Success' : 'Not Found/Base/Fixed'}`);
                    // Insert History
                    try {
                        historyTimelineStmt.run(item);
                        const historyStmt = database_1.db.prepare(`
                             INSERT INTO currency_rate_history (currency_code, rate, date)
                             VALUES (@code, @rate, date('now', 'localtime'))
                             ON CONFLICT(currency_code, date) DO UPDATE SET rate = @rate
                        `);
                        historyStmt.run(item);
                    }
                    catch (histErr) {
                        console.error(`[CurrencyScraper] History insert failed for ${item.code}:`, histErr.message);
                    }
                }
            });
            transaction(rates);
            console.log('[CurrencyScraper] Database updated successfully.');
            return true;
        }
        catch (error) {
            console.error('[CurrencyScraper] Failed to update rates:', error.message);
            return false;
        }
    }
    stop() {
        this.job?.cancel();
    }
}
exports.CurrencyScraperService = CurrencyScraperService;
