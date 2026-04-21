import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export class MasterDataService {
    private static normalizeName(value: any): string {
        return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
    }

    private static normalizeCurrencyCode(value: any): string {
        const code = String(value || '').trim().toUpperCase();
        if (!code) return 'ILS';
        if (code === 'NIS') return 'ILS';
        return code;
    }

    private static currencyCodesMatch(left: any, right: any): boolean {
        return this.normalizeCurrencyCode(left) === this.normalizeCurrencyCode(right);
    }

    private static resolveCurrencyValue(value: any) {
        const incoming = String(value || '').trim();
        const normalized = this.normalizeCurrencyCode(incoming);
        const codeCandidates = Array.from(new Set([
            normalized,
            normalized === 'NIS' ? 'ILS' : normalized,
            normalized === 'ILS' ? 'NIS' : normalized
        ]));

        for (const codeCandidate of codeCandidates) {
            const byCode = db.prepare("SELECT id, code, name_ar, name_en FROM currencies WHERE UPPER(code) = ?").get(codeCandidate);
            if (byCode) {
                return {
                    id: byCode.id as string,
                    code: this.normalizeCurrencyCode(byCode.code),
                    name: byCode.name_ar || byCode.name_en || byCode.code
                };
            }
        }

        if (incoming) {
            const byId = db.prepare("SELECT id, code, name_ar, name_en FROM currencies WHERE id = ?").get(incoming);
            if (byId) {
                return {
                    id: byId.id as string,
                    code: this.normalizeCurrencyCode(byId.code),
                    name: byId.name_ar || byId.name_en || byId.code
                };
            }
        }

        const fallback = db.prepare("SELECT id, code, name_ar, name_en FROM currencies ORDER BY code LIMIT 1").get();
        if (fallback) {
            return {
                id: fallback.id as string,
                code: this.normalizeCurrencyCode(fallback.code),
                name: fallback.name_ar || fallback.name_en || fallback.code
            };
        }

        return { id: null, code: normalized, name: normalized };
    }

    private static resolveLegacyAccountId(inputId: string | null | undefined, preferredCurrencyCode = 'ILS'): string | null {
        const normalizedId = String(inputId || '').trim();
        if (!normalizedId) return null;

        const direct = db.prepare("SELECT id FROM accounts WHERE id = ?").get(normalizedId) as { id: string } | undefined;
        if (direct?.id) return direct.id;

        const chart = db.prepare(`
            SELECT
                g.id,
                g.account_code,
                COALESCE(g.name_ar, g.name_en, g.account_code) AS account_name,
                g.parent_id,
                g.account_type,
                g.is_transactional,
                COALESCE(cur.code, ?) AS currency_code
            FROM gl_chart_of_accounts g
            LEFT JOIN currencies cur ON cur.id = g.currency_id
            WHERE g.id = ?
        `).get(preferredCurrencyCode, normalizedId) as {
            id: string;
            account_code: string;
            account_name: string;
            parent_id: string | null;
            account_type: string;
            is_transactional: number;
            currency_code: string;
        } | undefined;

        if (!chart) return null;

        const byCode = db.prepare("SELECT id FROM accounts WHERE code = ? LIMIT 1").get(chart.account_code) as { id: string } | undefined;
        if (byCode?.id) return byCode.id;

        let parentLegacyId: string | null = null;
        if (chart.parent_id) {
            parentLegacyId = this.resolveLegacyAccountId(chart.parent_id, chart.currency_code || preferredCurrencyCode);
        }

        db.prepare(`
            INSERT INTO accounts (
                id, code, account_code, name, type, balance,
                parent_id, account_level, posting_allowed, is_transactional, is_group,
                currency, currency_code, currency_behavior, reference_type, scope_type,
                status, is_active, requires_cost_center, requires_analysis_code
            ) VALUES (
                @id, @code, @account_code, @name, @type, '0',
                @parent_id, @account_level, @posting_allowed, @is_transactional, @is_group,
                @currency, @currency_code, 'FIXED_CURRENCY', 'NONE', 'COMPANY',
                'ACTIVE', 1, 0, 0
            )
            ON CONFLICT(id) DO NOTHING
        `).run({
            id: chart.id,
            code: chart.account_code,
            account_code: chart.account_code,
            name: chart.account_name,
            type: String(chart.account_type || 'ASSET').charAt(0) + String(chart.account_type || 'ASSET').slice(1).toLowerCase(),
            parent_id: parentLegacyId,
            account_level: String(chart.account_code || '').length || 1,
            posting_allowed: chart.is_transactional ? 1 : 0,
            is_transactional: chart.is_transactional ? 1 : 0,
            is_group: chart.is_transactional ? 0 : 1,
            currency: this.normalizeCurrencyCode(chart.currency_code || preferredCurrencyCode),
            currency_code: this.normalizeCurrencyCode(chart.currency_code || preferredCurrencyCode)
        });

        return chart.id;
    }

    private static getAccountIdentity(accountId: string) {
        return db.prepare(`
            SELECT
                a.id,
                COALESCE(a.code, a.account_code, g.account_code) AS account_code,
                COALESCE(a.name, g.name_ar, g.name_en, g.account_code) AS account_name,
                COALESCE(NULLIF(a.currency_code, ''), NULLIF(a.currency, ''), cur.code, 'NIS') AS currency_code,
                COALESCE(a.is_transactional, g.is_transactional, 1) AS is_transactional
            FROM accounts a
            LEFT JOIN gl_chart_of_accounts g
                ON g.id = a.id OR g.account_code = COALESCE(a.account_code, a.code)
            LEFT JOIN currencies cur
                ON cur.id = g.currency_id
            WHERE a.id = ?
            LIMIT 1
        `).get(accountId) as {
            id: string;
            account_code: string;
            account_name: string;
            currency_code: string;
            is_transactional: number;
        } | undefined;
    }

    private static buildBankSubAccountName(data: {
        account_name?: any;
        bank_name?: any;
        account_number?: any;
    }): string {
        const explicitName = String(data?.account_name || '').trim();
        const bankName = String(data?.bank_name || '').trim();
        const accountNumber = String(data?.account_number || '').trim();

        if (explicitName && accountNumber) {
            return explicitName.includes(accountNumber) ? explicitName : `${explicitName} - ${accountNumber}`;
        }
        if (explicitName) return explicitName;
        if (bankName && accountNumber) return `${bankName} - ${accountNumber}`;
        return bankName || accountNumber || 'حساب بنكي';
    }

    private static buildBankSubAccountCode(data: {
        id?: any;
        code?: any;
        account_number?: any;
    }): string {
        const explicitCode = String(data?.code || '').trim().toUpperCase();
        if (explicitCode) return explicitCode;

        const accountNumber = String(data?.account_number || '').trim().toUpperCase();
        if (accountNumber) return accountNumber;

        const fallbackId = String(data?.id || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (fallbackId) return `BANK-${fallbackId.slice(0, 8)}`;

        return `BANK-${uuidv4().slice(0, 8).toUpperCase()}`;
    }

    private static syncBankAccountSubAccount(
        data: {
            id: string;
            gl_account_id?: string | null;
            code?: any;
            account_number?: any;
            account_name?: any;
            bank_name?: any;
            currency?: any;
            currency_id?: any;
            is_active?: any;
        },
        options: { strict?: boolean } = {}
    ) {
        const bankAccountId = String(data?.id || '').trim();
        if (!bankAccountId) return;

        const currencyInfo = this.resolveCurrencyValue(data?.currency_id || data?.currency);
        const linkedLegacyAccountId = this.resolveLegacyAccountId(data?.gl_account_id, currencyInfo.code);
        if (!linkedLegacyAccountId) return;

        const subAccountName = this.buildBankSubAccountName(data);
        const normalizedName = this.normalizeName(subAccountName);
        const subAccountCode = this.buildBankSubAccountCode(data);
        const isActive = data?.is_active === false || Number(data?.is_active ?? 1) === 0 ? 0 : 1;

        db.prepare(`
            UPDATE accounts
            SET requires_sub_account = 1
            WHERE id = ?
        `).run(linkedLegacyAccountId);

        const duplicateSubAccount = db.prepare(`
            SELECT id
            FROM ae_sub_accounts
            WHERE account_id = ?
              AND id != ?
              AND (
                UPPER(TRIM(COALESCE(code, ''))) = ?
                OR UPPER(TRIM(COALESCE(normalized_name, ''))) = ?
              )
            LIMIT 1
        `).get(linkedLegacyAccountId, bankAccountId, subAccountCode, normalizedName) as { id: string } | undefined;

        if (duplicateSubAccount) {
            if (options.strict) {
                throw new Error('يوجد حساب فرعي بنكي بنفس الرمز أو الاسم لهذا الحساب');
            }
            return;
        }

        const existingSubAccount = db.prepare(`
            SELECT id
            FROM ae_sub_accounts
            WHERE id = ?
            LIMIT 1
        `).get(bankAccountId) as { id: string } | undefined;

        if (existingSubAccount) {
            db.prepare(`
                UPDATE ae_sub_accounts
                SET account_id = ?, code = ?, name = ?, normalized_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(linkedLegacyAccountId, subAccountCode, subAccountName, normalizedName, isActive, bankAccountId);
        } else {
            db.prepare(`
                INSERT INTO ae_sub_accounts (id, account_id, code, name, normalized_name, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(bankAccountId, linkedLegacyAccountId, subAccountCode, subAccountName, normalizedName, isActive);
        }
    }

    // ================================================================
    // 1. BANKS
    // ================================================================
    static getBanks() {
        return db.prepare('SELECT * FROM banks ORDER BY name_ar').all();
    }

    static saveBank(data: any) {
        const normalizedName = String(data?.name_ar || '').trim().replace(/\s+/g, ' ').toUpperCase();
        if (!normalizedName) {
            throw new Error('اسم البنك مطلوب');
        }

        const normalizedBranch = String(data?.branch_code || '').trim().toUpperCase();
        if (!data.id) {
            const duplicate = db.prepare(`
                SELECT id
                FROM banks
                WHERE UPPER(TRIM(COALESCE(name_ar, ''))) = ?
                  AND UPPER(TRIM(COALESCE(branch_code, ''))) = ?
                LIMIT 1
            `).get(normalizedName, normalizedBranch);
            if (duplicate) throw new Error('اسم البنك/الفرع موجود مسبقاً');
        } else {
            const duplicate = db.prepare(`
                SELECT id
                FROM banks
                WHERE UPPER(TRIM(COALESCE(name_ar, ''))) = ?
                  AND UPPER(TRIM(COALESCE(branch_code, ''))) = ?
                  AND id != ?
                LIMIT 1
            `).get(normalizedName, normalizedBranch, data.id);
            if (duplicate) throw new Error('اسم البنك/الفرع موجود مسبقاً');
        }

        if (!data.id) {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO banks (
                    id, name_ar, name_en, swift_code, is_local, 
                    bank_code, branch_code, name_he, routing_no, address
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                data.name_ar,
                data.name_en,
                data.swift_code,
                data.is_local ? 1 : 0,
                data.bank_code,
                data.branch_code,
                data.name_he,
                data.routing_no,
                data.address
            );
            return { success: true, id };
        } else {
            db.prepare(`
                UPDATE banks SET 
                    name_ar=?, name_en=?, swift_code=?, is_local=?,
                    bank_code=?, branch_code=?, name_he=?, routing_no=?, address=?
                WHERE id=?
            `).run(
                data.name_ar,
                data.name_en,
                data.swift_code,
                data.is_local ? 1 : 0,
                data.bank_code,
                data.branch_code,
                data.name_he,
                data.routing_no,
                data.address,
                data.id
            );
            return { success: true, id: data.id };
        }
    }

    static deleteBank(id: string) {
        db.prepare('DELETE FROM banks WHERE id = ?').run(id);
        return { success: true };
    }

    static async importBanksFromHTML(filePath: string) {
        const fs = require('fs');
        const cheerio = require('cheerio');

        if (!fs.existsSync(filePath)) throw new Error('File not found');

        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);
        const rows = $('table.list tr');

        let valid = 0, updated = 0, inserted = 0;

        const checkStmt = db.prepare('SELECT id FROM banks WHERE bank_code = ? AND branch_code = ?');
        const insertStmt = db.prepare(`
            INSERT INTO banks (id, name_ar, name_en, name_he, bank_code, branch_code, swift_code, routing_no, address, is_local)
            VALUES (@id, @name_ar, @name_en, @name_he, @bank_code, @branch_code, @swift_code, @routing_no, @address, 1)
        `);
        const updateStmt = db.prepare(`
            UPDATE banks SET 
                name_ar = @name_ar,
                name_en = @name_en,
                name_he = @name_he,
                swift_code = @swift_code,
                routing_no = @routing_no,
                address = @address
            WHERE id = @id
        `);

        // Transaction for speed
        const runImport = db.transaction(() => {
            rows.each((i: number, el: any) => {
                const tds = $(el).find('td');
                if (tds.length === 0) return;
                if ($(el).find('.tableHeader').length > 0) return;

                const txt = (idx: number) => $(tds[idx]).text().trim();
                const bankCode = txt(1);
                // Important: Branch code is column 2
                const branchCode = txt(2);

                if (!bankCode || bankCode === '00' || bankCode === 'بنك') return;

                const data: any = {
                    bank_code: bankCode,
                    branch_code: branchCode || '',
                    name_ar: txt(3),
                    name_en: txt(6),
                    name_he: txt(7),
                    swift_code: txt(17),
                    routing_no: txt(18),
                    address: txt(19)
                };

                valid++;
                const existing = checkStmt.get(data.bank_code, data.branch_code);

                if (existing) {
                    updateStmt.run({ ...data, id: existing.id });
                    updated++;
                } else {
                    insertStmt.run({ ...data, id: uuidv4() });
                    inserted++;
                }
            });
        });

        runImport();
        return { success: true, valid, inserted, updated };
    }

    // ================================================================
    // 2. BANK ACCOUNTS
    // ================================================================
    static getBankAccounts() {
        // Self-heal legacy links: if bank_accounts points to gl_chart_of_accounts IDs,
        // ensure corresponding rows exist in legacy "accounts" and remap by code when needed.
        try {
            db.prepare(`
                INSERT OR IGNORE INTO accounts (
                    id, code, name, type, balance, parent_id, account_level, is_transactional, currency, is_active
                )
                SELECT
                    g.id,
                    g.account_code,
                    COALESCE(g.name_ar, g.name_en, g.account_code),
                    CASE UPPER(COALESCE(g.account_type, 'ASSET'))
                        WHEN 'LIABILITY' THEN 'Liability'
                        WHEN 'EQUITY' THEN 'Equity'
                        WHEN 'REVENUE' THEN 'Revenue'
                        WHEN 'EXPENSE' THEN 'Expense'
                        ELSE 'Asset'
                    END,
                    '0',
                    NULL,
                    LENGTH(g.account_code),
                    COALESCE(g.is_transactional, 1),
                    COALESCE(cur.code, 'ILS'),
                    1
                FROM gl_chart_of_accounts g
                LEFT JOIN currencies cur ON cur.id = g.currency_id
                WHERE
                    (g.id IN (
                        SELECT gl_account_id FROM bank_accounts WHERE gl_account_id IS NOT NULL
                        UNION
                        SELECT commission_account_id FROM bank_accounts WHERE commission_account_id IS NOT NULL
                    ))
                    AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = g.id)
                    AND NOT EXISTS (SELECT 1 FROM accounts ax WHERE ax.code = g.account_code)
            `).run();

            db.prepare(`
                UPDATE bank_accounts
                SET gl_account_id = (
                    SELECT a.id
                    FROM gl_chart_of_accounts g
                    JOIN accounts a ON a.code = g.account_code
                    WHERE g.id = bank_accounts.gl_account_id
                    LIMIT 1
                )
                WHERE gl_account_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM accounts x WHERE x.id = bank_accounts.gl_account_id)
            `).run();

            db.prepare(`
                UPDATE bank_accounts
                SET commission_account_id = (
                    SELECT a.id
                    FROM gl_chart_of_accounts g
                    JOIN accounts a ON a.code = g.account_code
                    WHERE g.id = bank_accounts.commission_account_id
                    LIMIT 1
                )
                WHERE commission_account_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM accounts x WHERE x.id = bank_accounts.commission_account_id)
            `).run();
        } catch (e) {
            console.error("MasterDataService.getBankAccounts self-heal failed:", e);
        }

        try {
            const rows = db.prepare(`
                SELECT
                    ba.id,
                    ba.gl_account_id,
                    ba.code,
                    ba.account_number,
                    ba.account_name,
                    ba.currency,
                    ba.currency_id,
                    COALESCE(ba.is_active, 1) AS is_active,
                    COALESCE(b.name_ar, b.name_en, ba.bank_name) AS bank_name
                FROM bank_accounts ba
                LEFT JOIN banks b ON b.id = ba.bank_id
            `).all();

            const syncBankSubAccounts = db.transaction((bankRows: any[]) => {
                for (const row of bankRows) {
                    this.syncBankAccountSubAccount(row, { strict: false });
                }
            });

            syncBankSubAccounts(rows);
        } catch (e) {
            console.error("MasterDataService.getBankAccounts sub-account sync failed:", e);
        }

        return db.prepare(`
            SELECT
                ba.*,
                ba.currency_id AS currency_uuid,
                COALESCE(cur.code, ba.currency, ba.currency_id) AS currency_id,
                COALESCE(b.name_ar, b.name_en, ba.bank_name) AS bank_name,
                COALESCE(acc.name, gl.name_ar, gl.name_en) AS gl_account_name,
                COALESCE(acc.code, gl.account_code) AS gl_account_code,
                COALESCE(comm_acc.name, comm_gl.name_ar, comm_gl.name_en) AS commission_account_name,
                sa.id AS sub_account_id,
                COALESCE(sa.code, '') AS sub_account_code,
                COALESCE(sa.name, '') AS sub_account_name
            FROM bank_accounts ba
            LEFT JOIN banks b ON ba.bank_id = b.id
            LEFT JOIN currencies cur ON ba.currency_id = cur.id
            LEFT JOIN accounts acc ON ba.gl_account_id = acc.id
            LEFT JOIN gl_chart_of_accounts gl ON ba.gl_account_id = gl.id
            LEFT JOIN accounts comm_acc ON ba.commission_account_id = comm_acc.id
            LEFT JOIN gl_chart_of_accounts comm_gl ON ba.commission_account_id = comm_gl.id
            LEFT JOIN ae_sub_accounts sa ON sa.id = ba.id
            ORDER BY ba.created_at
        `).all();
    }

    static saveBankAccount(data: any) {
        try {
            // SELF-HEAL: Ensure columns exist at runtime
            try {
                const cols = db.prepare("PRAGMA table_info(bank_accounts)").all();
                if (!cols.some((c: any) => c.name === 'commission_account_id')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN commission_account_id TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'branch')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN branch TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'iban')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN iban TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'account_name')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN account_name TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'bank_name')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN bank_name TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'currency')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN currency TEXT DEFAULT 'ILS'").run();
                }
                if (!cols.some((c: any) => c.name === 'code')) {
                    // Custom Numbering Column
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN code TEXT").run();
                }
            } catch (e) { /* ignore */ }

            const id = data.id || uuidv4();

            const normalizeType = (raw: string | null | undefined) => {
                const value = (raw || 'ASSET').toUpperCase();
                if (value === 'ASSET') return 'Asset';
                if (value === 'LIABILITY') return 'Liability';
                if (value === 'EQUITY') return 'Equity';
                if (value === 'REVENUE') return 'Revenue';
                if (value === 'EXPENSE') return 'Expense';
                return 'Asset';
            };

            const resolveCurrency = (value: any) => {
                const incoming = (value || 'ILS').toString().trim();
                const byCode = db.prepare("SELECT id, code FROM currencies WHERE code = ?").get(incoming);
                if (byCode) return { code: byCode.code, id: byCode.id };

                const byId = db.prepare("SELECT id, code FROM currencies WHERE id = ?").get(incoming);
                if (byId) return { code: byId.code, id: byId.id };

                const fallback = db.prepare("SELECT id, code FROM currencies ORDER BY code LIMIT 1").get();
                if (fallback) return { code: fallback.code, id: fallback.id };

                return { code: incoming || 'ILS', id: null };
            };

            const currencyInfo = resolveCurrency(data.currency_id || data.currency);
            const currencyCode = currencyInfo.code;
            const currencyUUID = currencyInfo.id;
            const companyId = 'COMP_01';

            const defaultCategoryByType = (rawType: string | null | undefined) => {
                const t = (rawType || 'ASSET').toUpperCase();
                if (t === 'LIABILITY') return 'CURRENT_LIABILITY';
                if (t === 'EQUITY') return 'EQUITY';
                if (t === 'REVENUE') return 'OPERATING_REVENUE';
                if (t === 'EXPENSE') return 'OPERATING_EXPENSE';
                return 'CURRENT_ASSET';
            };

            const upsertLegacyAccountRow = (payload: {
                id: string;
                code: string;
                name: string;
                type: string;
                parentLegacyId: string | null;
                level: number;
                isTransactional: number;
                currency: string;
                subtype: string;
            }) => {
                const accountType = (payload.type || 'ASSET').toUpperCase();
                const postingAllowed = payload.isTransactional ? 1 : 0;
                const isGroup = postingAllowed ? 0 : 1;
                const category = defaultCategoryByType(accountType);

                db.prepare(`
                    INSERT INTO accounts (
                        id, company_id, branch_id, code, account_code, name, type,
                        account_category, account_subtype,
                        balance, parent_id, account_level,
                        posting_allowed, is_transactional, is_group,
                        currency, currency_code, currency_behavior,
                        reference_type, scope_type,
                        status, is_active,
                        requires_cost_center, requires_analysis_code
                    ) VALUES (
                        @id, @company_id, NULL, @code, @code, @name, @type,
                        @account_category, @account_subtype,
                        '0', @parent_id, @account_level,
                        @posting_allowed, @is_transactional, @is_group,
                        @currency, @currency, 'FIXED_CURRENCY',
                        'NONE', 'COMPANY',
                        'ACTIVE', 1,
                        0, 0
                    )
                    ON CONFLICT(id) DO UPDATE SET
                        company_id = COALESCE(accounts.company_id, excluded.company_id),
                        code = excluded.code,
                        account_code = COALESCE(accounts.account_code, excluded.account_code),
                        name = excluded.name,
                        type = excluded.type,
                        account_category = COALESCE(accounts.account_category, excluded.account_category),
                        account_subtype = COALESCE(accounts.account_subtype, excluded.account_subtype),
                        parent_id = excluded.parent_id,
                        account_level = excluded.account_level,
                        posting_allowed = COALESCE(accounts.posting_allowed, excluded.posting_allowed),
                        is_transactional = COALESCE(accounts.is_transactional, excluded.is_transactional),
                        is_group = COALESCE(accounts.is_group, excluded.is_group),
                        currency = COALESCE(accounts.currency, excluded.currency),
                        currency_code = COALESCE(accounts.currency_code, excluded.currency_code),
                        currency_behavior = COALESCE(accounts.currency_behavior, excluded.currency_behavior),
                        status = COALESCE(accounts.status, excluded.status),
                        is_active = COALESCE(accounts.is_active, excluded.is_active)
                `).run({
                    id: payload.id,
                    company_id: companyId,
                    code: payload.code,
                    name: payload.name,
                    type: accountType,
                    account_category: category,
                    account_subtype: payload.subtype || 'GENERAL',
                    parent_id: payload.parentLegacyId,
                    account_level: payload.level,
                    posting_allowed: postingAllowed,
                    is_transactional: postingAllowed,
                    is_group: isGroup,
                    currency: payload.currency || currencyCode,
                });
            };

            const normalizeLegacyParentId = (legacyId: string | null): string | null => {
                if (!legacyId) return null;
                const row = db.prepare("SELECT is_transactional FROM accounts WHERE id = ?").get(legacyId);
                if (!row) return null;
                // Legacy trigger blocks children under transactional/posting accounts.
                if (Number(row.is_transactional || 0) === 1) return null;
                return legacyId;
            };

            // Ensure a picked Chart-of-Accounts node always maps to a valid legacy "accounts" row.
            const ensureLegacyAccountFromChart = (chartAccountId: string | null): string | null => {
                if (!chartAccountId) return null;

                const direct = db.prepare("SELECT id FROM accounts WHERE id = ?").get(chartAccountId);
                if (direct) return direct.id;

                const chart = db.prepare(`
                    SELECT id, account_code, name_ar, name_en, parent_id, account_type, is_transactional, currency_id
                    FROM gl_chart_of_accounts
                    WHERE id = ?
                `).get(chartAccountId);
                if (!chart) return null;

                const existingByCode = db.prepare("SELECT id FROM accounts WHERE code = ?").get(chart.account_code);
                if (existingByCode) return existingByCode.id;

                let parentLegacyId: string | null = null;
                if (chart.parent_id) {
                    const parentDirect = db.prepare("SELECT id FROM accounts WHERE id = ?").get(chart.parent_id);
                    parentLegacyId = parentDirect?.id || ensureLegacyAccountFromChart(chart.parent_id);
                }
                parentLegacyId = normalizeLegacyParentId(parentLegacyId);

                let legacyCurrencyCode = currencyCode;
                if (chart.currency_id) {
                    const c = db.prepare("SELECT code FROM currencies WHERE id = ?").get(chart.currency_id);
                    if (c?.code) legacyCurrencyCode = c.code;
                }

                db.prepare(`
                    INSERT INTO accounts (
                        id, code, name, type, balance, parent_id, account_level, is_transactional, currency, is_active
                    ) VALUES (
                        @id, @code, @name, @type, '0', @parent_id, @account_level, @is_transactional, @currency, 1
                    )
                `).run({
                    id: chart.id,
                    code: chart.account_code,
                    name: chart.name_ar || chart.name_en || chart.account_code,
                    type: normalizeType(chart.account_type),
                    parent_id: parentLegacyId,
                    account_level: String(chart.account_code || '').length || 1,
                    is_transactional: chart.is_transactional ? 1 : 0,
                    currency: legacyCurrencyCode
                });

                upsertLegacyAccountRow({
                    id: chart.id,
                    code: chart.account_code,
                    name: chart.name_ar || chart.name_en || chart.account_code,
                    type: chart.account_type || 'ASSET',
                    parentLegacyId,
                    level: String(chart.account_code || '').length || 1,
                    isTransactional: chart.is_transactional ? 1 : 0,
                    currency: legacyCurrencyCode,
                    subtype: chart.is_transactional ? 'BANK' : 'GENERAL',
                });

                return chart.id;
            };

            const resolveLinkedAccountId = (inputId: string | null | undefined): string | null => {
                if (!inputId) return null;

                const direct = db.prepare("SELECT id FROM accounts WHERE id = ?").get(inputId);
                if (direct) return direct.id;

                const synced = ensureLegacyAccountFromChart(inputId);
                if (synced) return synced;

                return inputId;
            };

            const bankNameFromMaster = data.bank_id
                ? db.prepare("SELECT name_ar FROM banks WHERE id = ?").get(data.bank_id)?.name_ar
                : null;

            const resolveCurrencyLabel = (code: string) => {
                const c = (code || '').toUpperCase();
                if (c === 'JOD') return 'دينار';
                if (c === 'USD') return 'دولار';
                if (c === 'EUR') return 'يورو';
                if (c === 'ILS' || c === 'NIS') return 'شيكل';
                return code || 'متعدد العملات';
            };

            const resolveChartAccountId = (inputId: string | null | undefined): string | null => {
                if (!inputId) return null;

                const chartDirect = db.prepare("SELECT id FROM gl_chart_of_accounts WHERE id = ?").get(inputId);
                if (chartDirect) return chartDirect.id;

                const legacy = db.prepare("SELECT code FROM accounts WHERE id = ?").get(inputId);
                if (legacy?.code) {
                    const chartByCode = db.prepare("SELECT id FROM gl_chart_of_accounts WHERE account_code = ?").get(legacy.code);
                    if (chartByCode) return chartByCode.id;
                }

                return null;
            };

            const findBankRootAccount = () => {
                return db.prepare(`
                    SELECT id, account_code, account_type
                    FROM gl_chart_of_accounts
                    WHERE account_code = '112'
                      AND is_transactional = 0
                    LIMIT 1
                `).get() || db.prepare(`
                    SELECT id, account_code, account_type
                    FROM gl_chart_of_accounts
                    WHERE is_transactional = 0
                      AND account_type = 'ASSET'
                      AND (name_ar LIKE '%بنوك%' OR name_ar LIKE '%البنوك%' OR name_en LIKE '%Bank%')
                    ORDER BY LENGTH(account_code), account_code
                    LIMIT 1
                `).get();
            };

            const isDescendantOf = (nodeId: string, ancestorId: string) => {
                if (!nodeId || !ancestorId) return false;
                if (nodeId === ancestorId) return true;

                let cursor: string | null = nodeId;
                const guard = new Set<string>();

                while (cursor && !guard.has(cursor)) {
                    guard.add(cursor);
                    const row = db.prepare(`SELECT parent_id FROM gl_chart_of_accounts WHERE id = ?`).get(cursor);
                    const parentId = row?.parent_id || null;
                    if (!parentId) return false;
                    if (parentId === ancestorId) return true;
                    cursor = parentId;
                }

                return false;
            };

            const isParentCompatibleWithCurrency = (parentChartId: string | null, targetCurrencyId: string | null) => {
                if (!parentChartId) return false;
                const parent = db.prepare(`SELECT currency_id, is_transactional FROM gl_chart_of_accounts WHERE id = ?`).get(parentChartId);
                if (!parent) return false;
                if (Number(parent.is_transactional || 0) === 1) return false;

                const parentCurrencyId = parent.currency_id || null;
                if (!targetCurrencyId) return true;
                return !parentCurrencyId || parentCurrencyId === targetCurrencyId;
            };

            const getNextChildCode = (parentChartId: string, parentCode: string) => {
                const lastSibling = db.prepare(`
                    SELECT account_code
                    FROM gl_chart_of_accounts
                    WHERE parent_id = ?
                    ORDER BY LENGTH(account_code) DESC, account_code DESC
                    LIMIT 1
                `).get(parentChartId);

                let suffixDigits = 1;
                let suffixNumber = 1;
                if (lastSibling?.account_code && lastSibling.account_code.startsWith(parentCode)) {
                    const suffix = lastSibling.account_code.slice(parentCode.length);
                    if (/^\d+$/.test(suffix)) {
                        suffixDigits = suffix.length || 1;
                        suffixNumber = Number(suffix) + 1;
                    }
                }

                let nextCode = `${parentCode}${suffixNumber.toString().padStart(suffixDigits, '0')}`;
                let guard = 0;
                while (db.prepare(`
                    SELECT 1
                    FROM gl_chart_of_accounts
                    WHERE account_code = ?
                    UNION ALL
                    SELECT 1
                    FROM accounts
                    WHERE code = ?
                    LIMIT 1
                `).get(nextCode, nextCode)) {
                    suffixNumber += 1;
                    nextCode = `${parentCode}${suffixNumber.toString().padStart(suffixDigits, '0')}`;
                    guard += 1;
                    if (guard > 500) throw new Error("Unable to generate a unique account code");
                }

                return nextCode;
            };

            const ensureBankCurrencyParentAccount = (): string | null => {
                if (data.id) return null;

                const bankRoot = findBankRootAccount();

                if (!bankRoot) return null;

                if (currencyUUID) {
                    const existingByCurrency = db.prepare(`
                        SELECT id
                        FROM gl_chart_of_accounts
                        WHERE parent_id = ?
                          AND is_transactional = 0
                          AND currency_id = ?
                          AND (name_ar LIKE '%بنوك%' OR name_ar LIKE '%البنوك%' OR name_en LIKE '%Bank%')
                        ORDER BY account_code
                        LIMIT 1
                    `).get(bankRoot.id, currencyUUID);
                    if (existingByCurrency) return existingByCurrency.id;
                }

                const label = resolveCurrencyLabel(currencyCode);
                const parentNameAr = `البنوك - ${label}`;
                const parentNameEn = `Banks - ${currencyCode}`;

                const existingByName = db.prepare(`
                    SELECT id
                    FROM gl_chart_of_accounts
                    WHERE parent_id = ?
                      AND is_transactional = 0
                      AND (name_ar = ? OR name_en = ?)
                    LIMIT 1
                `).get(bankRoot.id, parentNameAr, parentNameEn);
                if (existingByName) return existingByName.id;

                const parentId = uuidv4();
                const parentCode = getNextChildCode(bankRoot.id, bankRoot.account_code);
                const parentLegacyId = normalizeLegacyParentId(resolveLinkedAccountId(bankRoot.id));

                db.prepare(`
                    INSERT INTO gl_chart_of_accounts (
                        id, account_code, name_ar, name_en, parent_id, account_type,
                        is_transactional, currency_id, requires_cost_center, balance
                    ) VALUES (
                        @id, @account_code, @name_ar, @name_en, @parent_id, @account_type,
                        0, @currency_id, 0, 0
                    )
                `).run({
                    id: parentId,
                    account_code: parentCode,
                    name_ar: parentNameAr,
                    name_en: parentNameEn,
                    parent_id: bankRoot.id,
                    account_type: bankRoot.account_type || 'ASSET',
                    currency_id: currencyUUID
                });

                db.prepare(`
                    INSERT INTO accounts (
                        id, code, name, type, balance, parent_id, account_level, is_transactional, currency, is_active
                    ) VALUES (
                        @id, @code, @name, @type, '0', @parent_id, @account_level, 0, @currency, 1
                    )
                `).run({
                    id: parentId,
                    code: parentCode,
                    name: parentNameAr,
                    type: normalizeType(bankRoot.account_type || 'ASSET'),
                    parent_id: parentLegacyId,
                    account_level: String(parentCode).length,
                    currency: currencyCode
                });

                upsertLegacyAccountRow({
                    id: parentId,
                    code: parentCode,
                    name: parentNameAr,
                    type: bankRoot.account_type || 'ASSET',
                    parentLegacyId,
                    level: String(parentCode).length,
                    isTransactional: 0,
                    currency: currencyCode,
                    subtype: 'GENERAL',
                });

                return parentId;
            };

            const createAutoLinkedGLAccount = (parentChartId: string): string | null => {
                if (data.id || !parentChartId) return null;

                const parentChart = db.prepare(`
                    SELECT id, account_code, account_type, currency_id
                    FROM gl_chart_of_accounts
                    WHERE id = ?
                `).get(parentChartId);
                if (!parentChart) return null;

                const nextCode = getNextChildCode(parentChart.id, parentChart.account_code);
                const newId = uuidv4();
                const newAccountName = data.account_name || `${data.bank_name || bankNameFromMaster || 'Bank'} - ${currencyCode}`;
                const parentLegacyId = normalizeLegacyParentId(resolveLinkedAccountId(parentChart.id));
                const chartCurrencyId = parentChart.currency_id || currencyUUID || null;

                db.prepare(`
                    INSERT INTO gl_chart_of_accounts (
                        id, account_code, name_ar, name_en, parent_id, account_type,
                        is_transactional, currency_id, requires_cost_center, balance
                    ) VALUES (
                        @id, @account_code, @name_ar, @name_en, @parent_id, @account_type,
                        1, @currency_id, 0, 0
                    )
                `).run({
                    id: newId,
                    account_code: nextCode,
                    name_ar: newAccountName,
                    name_en: newAccountName,
                    parent_id: parentChart.id,
                    account_type: parentChart.account_type || 'ASSET',
                    currency_id: chartCurrencyId
                });

                db.prepare(`
                    INSERT INTO accounts (
                        id, code, name, type, balance, parent_id, account_level, is_transactional, currency, is_active
                    ) VALUES (
                        @id, @code, @name, @type, '0', @parent_id, @account_level, 1, @currency, 1
                    )
                `).run({
                    id: newId,
                    code: nextCode,
                    name: newAccountName,
                    type: normalizeType(parentChart.account_type || 'ASSET'),
                    parent_id: parentLegacyId,
                    account_level: String(nextCode).length,
                    currency: currencyCode
                });

                upsertLegacyAccountRow({
                    id: newId,
                    code: nextCode,
                    name: newAccountName,
                    type: parentChart.account_type || 'ASSET',
                    parentLegacyId,
                    level: String(nextCode).length,
                    isTransactional: 1,
                    currency: currencyCode,
                    subtype: 'BANK',
                });

                console.log(`[Auto-Create] Created bank GL account ${newAccountName} (${nextCode})`);
                return newId;
            };

            let glAccountId = resolveLinkedAccountId(data.gl_account_id || null);
            if (!glAccountId) {
                const explicitParentChartId = resolveChartAccountId(data.parent_gl_id || null);
                const bankRoot = findBankRootAccount();
                const explicitParentIsValid =
                    Boolean(bankRoot?.id) &&
                    Boolean(explicitParentChartId) &&
                    isDescendantOf(explicitParentChartId as string, bankRoot.id) &&
                    isParentCompatibleWithCurrency(explicitParentChartId, currencyUUID);

                const autoParentChartId = explicitParentIsValid
                    ? explicitParentChartId
                    : ensureBankCurrencyParentAccount();
                if (autoParentChartId) {
                    glAccountId = createAutoLinkedGLAccount(autoParentChartId);
                }
            }

            const commissionAccountId = resolveLinkedAccountId(data.commission_account_id || null);

            // Heal existing linked accounts so they appear in modern chart listings by company.
            const ensureAccountVisibleInCompanyChart = (accountId: string | null) => {
                if (!accountId) return;
                db.prepare(`
                    UPDATE accounts
                    SET company_id = COALESCE(company_id, ?),
                        account_code = COALESCE(account_code, code),
                        posting_allowed = COALESCE(posting_allowed, is_transactional, 1),
                        is_group = COALESCE(is_group, CASE WHEN COALESCE(posting_allowed, is_transactional, 1)=1 THEN 0 ELSE 1 END),
                        status = COALESCE(status, CASE WHEN COALESCE(is_active, 1)=1 THEN 'ACTIVE' ELSE 'INACTIVE' END),
                        scope_type = COALESCE(scope_type, 'COMPANY')
                    WHERE id = ?
                `).run(companyId, accountId);
            };
            ensureAccountVisibleInCompanyChart(glAccountId);
            ensureAccountVisibleInCompanyChart(commissionAccountId);

            const params = {
                id,
                bank_id: data.bank_id,
                branch: data.branch || null,
                account_number: data.account_number,
                iban: data.iban || null,
                currency: currencyCode, // Store code in 'currency' column
                currency_id: currencyUUID, // Store UUID in 'currency_id' column (FK)
                gl_account_id: glAccountId,
                commission_account_id: commissionAccountId,
                account_name: data.account_name,
                bank_name: data.bank_name || bankNameFromMaster || null,
                code: data.code || null, // Custom code
                is_active: data.is_active !== false ? 1 : 0
            };

            const saveTx = db.transaction(() => {
                if (!data.id) {
                    db.prepare(`
                        INSERT INTO bank_accounts (
                            id, bank_id, branch, account_number, iban, 
                            currency, currency_id, gl_account_id, commission_account_id, account_name, bank_name, code, is_active
                        )
                        VALUES (
                            @id, @bank_id, @branch, @account_number, @iban, 
                            @currency, @currency_id, @gl_account_id, @commission_account_id, @account_name, @bank_name, @code, @is_active
                        )
                    `).run(params);
                } else {
                    db.prepare(`
                        UPDATE bank_accounts SET 
                            bank_id=@bank_id, branch=@branch, account_number=@account_number, 
                            iban=@iban, currency=@currency, currency_id=@currency_id,
                            gl_account_id=@gl_account_id, commission_account_id=@commission_account_id,
                            account_name=@account_name, bank_name=@bank_name, code=@code, is_active=@is_active
                        WHERE id=@id
                    `).run(params);
                }

                this.syncBankAccountSubAccount({
                    id,
                    gl_account_id: glAccountId,
                    code: params.code,
                    account_number: params.account_number,
                    account_name: params.account_name,
                    bank_name: params.bank_name,
                    currency: params.currency,
                    currency_id: params.currency_id,
                    is_active: params.is_active
                }, { strict: true });
            });

            saveTx();
            return { success: true, id };
        } catch (err: any) {
            console.error("MasterDataService.saveBankAccount Error:", err);
            throw err;
        }
    }

    static deleteBankAccount(id: string) {
        db.prepare(`
            UPDATE ae_sub_accounts
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);
        db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(id);
        return { success: true };
    }

    // ================================================================
    // 3. CASH BOXES
    // ================================================================
    static getCashBoxes() {
        return db.prepare(`
            SELECT
                cb.*,
                COALESCE(cur.code, cb.currency_code) AS currency_code,
                COALESCE(cur.name_ar, cur.name_en, cb.currency_code) AS currency_name,
                COALESCE(acc.code, acc.account_code, gl.account_code) AS gl_account_code,
                COALESCE(acc.name, gl.name_ar, gl.name_en, gl.account_code) AS gl_account_name
            FROM cash_boxes cb
            LEFT JOIN currencies cur ON cur.id = cb.currency_id
            LEFT JOIN accounts acc ON acc.id = cb.gl_account_id
            LEFT JOIN gl_chart_of_accounts gl
                ON gl.id = cb.gl_account_id
                OR gl.account_code = COALESCE(acc.account_code, acc.code)
            WHERE COALESCE(cb.is_active, 1) = 1
            ORDER BY COALESCE(cb.code, ''), cb.name_ar
        `).all();
    }

    static saveCashBox(data: any) {
        const normalizedName = this.normalizeName(data?.name_ar);
        if (!normalizedName) throw new Error('اسم الصندوق مطلوب');

        const normalizedCode = String(data?.code || '').trim().toUpperCase();
        if (!normalizedCode) throw new Error('رمز الصندوق مطلوب');

        const currencyInfo = this.resolveCurrencyValue(data?.currency_id || data?.currency_code || data?.currency);
        const linkedLegacyAccountId = this.resolveLegacyAccountId(data?.gl_account_id, currencyInfo.code);
        if (!linkedLegacyAccountId) throw new Error('يجب اختيار حساب صندوق صالح');

        const accountIdentity = this.getAccountIdentity(linkedLegacyAccountId);
        if (!accountIdentity) throw new Error('تعذر قراءة حساب الصندوق المختار');
        if (!String(accountIdentity.account_code || '').startsWith('111')) {
            throw new Error('يمكن ربط الصندوق فقط بحسابات الصندوق النقدية من مجموعة 111');
        }
        if (Number(accountIdentity.is_transactional || 0) !== 1) {
            throw new Error('حساب الصندوق يجب أن يكون حساباً حركياً');
        }
        if (!this.currencyCodesMatch(accountIdentity.currency_code, currencyInfo.code)) {
            throw new Error('عملة الصندوق يجب أن تطابق عملة الحساب المرتبط');
        }

        if (!data?.id) {
            const duplicateCode = db.prepare(`
                SELECT id
                FROM cash_boxes
                WHERE UPPER(TRIM(COALESCE(code, ''))) = ?
                LIMIT 1
            `).get(normalizedCode);
            if (duplicateCode) throw new Error('رمز الصندوق مستخدم مسبقاً');

            const duplicateName = db.prepare(`
                SELECT id
                FROM cash_boxes
                WHERE UPPER(TRIM(COALESCE(name_ar, ''))) = ?
                  AND UPPER(TRIM(COALESCE(currency_code, ''))) = ?
                  AND COALESCE(is_active, 1) = 1
                LIMIT 1
            `).get(normalizedName, currencyInfo.code);
            if (duplicateName) throw new Error('اسم الصندوق موجود مسبقاً بنفس العملة');
        } else {
            const duplicateCode = db.prepare(`
                SELECT id
                FROM cash_boxes
                WHERE UPPER(TRIM(COALESCE(code, ''))) = ?
                  AND id != ?
                LIMIT 1
            `).get(normalizedCode, data.id);
            if (duplicateCode) throw new Error('رمز الصندوق مستخدم مسبقاً');

            const duplicateName = db.prepare(`
                SELECT id
                FROM cash_boxes
                WHERE UPPER(TRIM(COALESCE(name_ar, ''))) = ?
                  AND UPPER(TRIM(COALESCE(currency_code, ''))) = ?
                  AND id != ?
                  AND COALESCE(is_active, 1) = 1
                LIMIT 1
            `).get(normalizedName, currencyInfo.code, data.id);
            if (duplicateName) throw new Error('اسم الصندوق موجود مسبقاً بنفس العملة');
        }

        const id = data?.id || uuidv4();
        const payload = {
            id,
            code: normalizedCode,
            name_ar: String(data?.name_ar || '').trim(),
            name_en: String(data?.name_en || '').trim() || null,
            currency_id: currencyInfo.id,
            currency_code: currencyInfo.code,
            gl_account_id: linkedLegacyAccountId,
            note: String(data?.note || '').trim() || null,
            is_active: data?.is_active === false ? 0 : 1
        };

        const saveTx = db.transaction(() => {
            if (!data?.id) {
                db.prepare(`
                    INSERT INTO cash_boxes (
                        id, code, name_ar, name_en, currency_id, currency_code,
                        gl_account_id, note, is_active
                    ) VALUES (
                        @id, @code, @name_ar, @name_en, @currency_id, @currency_code,
                        @gl_account_id, @note, @is_active
                    )
                `).run(payload);
            } else {
                db.prepare(`
                    UPDATE cash_boxes SET
                        code = @code,
                        name_ar = @name_ar,
                        name_en = @name_en,
                        currency_id = @currency_id,
                        currency_code = @currency_code,
                        gl_account_id = @gl_account_id,
                        note = @note,
                        is_active = @is_active,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id
                `).run(payload);
            }

            db.prepare(`
                UPDATE accounts
                SET requires_sub_account = 1
                WHERE id = ?
            `).run(linkedLegacyAccountId);

            const duplicateSubAccount = db.prepare(`
                SELECT id
                FROM ae_sub_accounts
                WHERE account_id = ?
                  AND id != ?
                  AND (
                    UPPER(TRIM(COALESCE(code, ''))) = ?
                    OR UPPER(TRIM(COALESCE(normalized_name, ''))) = ?
                  )
                LIMIT 1
            `).get(linkedLegacyAccountId, id, normalizedCode, normalizedName);
            if (duplicateSubAccount) {
                throw new Error('يوجد حساب فرعي بنفس الرمز أو الاسم لهذا الحساب');
            }

            const existingSubAccount = db.prepare(`SELECT id FROM ae_sub_accounts WHERE id = ? LIMIT 1`).get(id);
            if (existingSubAccount) {
                db.prepare(`
                    UPDATE ae_sub_accounts
                    SET account_id = ?, code = ?, name = ?, normalized_name = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(linkedLegacyAccountId, normalizedCode, payload.name_ar, normalizedName, id);
            } else {
                db.prepare(`
                    INSERT INTO ae_sub_accounts (id, account_id, code, name, normalized_name, is_active)
                    VALUES (?, ?, ?, ?, ?, 1)
                `).run(id, linkedLegacyAccountId, normalizedCode, payload.name_ar, normalizedName);
            }
        });

        saveTx();
        return { success: true, id };
    }

    static deleteCashBox(id: string) {
        db.prepare(`
            UPDATE cash_boxes
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        db.prepare(`
            UPDATE ae_sub_accounts
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        return { success: true, id };
    }

    // ================================================================
    // 4. COST CENTERS
    // ================================================================
    static getCostCenters() {
        // Return hierarchy or flat list? Flat list for now, UI builds tree
        return db.prepare('SELECT * FROM cost_centers ORDER BY code').all();
    }

    static saveCostCenter(data: any) {
        const id = data.id || uuidv4();
        const sanitizedData = {
            ...data,
            id,
            code: data.code || null,
            parent_id: data.parent_id || null,
            name_en: data.name_en || null,
            manager_name: data.manager_name || null,
            type: data.type || 'DEPARTMENT'
        };

        if (!data.id) {
            db.prepare(`
                INSERT INTO cost_centers (id, code, name_ar, name_en, parent_id, type, manager_name, is_active)
                VALUES (@id, @code, @name_ar, @name_en, @parent_id, @type, @manager_name, 1)
            `).run(sanitizedData);
        } else {
            db.prepare(`
                UPDATE cost_centers SET 
                    code=@code, name_ar=@name_ar, name_en=@name_en, parent_id=@parent_id, 
                    type=@type, manager_name=@manager_name
                WHERE id=@id
            `).run(sanitizedData);
        }
        return { success: true, id };
    }

    static deleteCostCenter(id: string) {
        db.prepare('DELETE FROM cost_centers WHERE id = ?').run(id);
        return { success: true };
    }

    // ================================================================
    // 5. PAYMENT METHODS
    // ================================================================
    static getPaymentMethods() {
        return db.prepare('SELECT * FROM payment_methods ORDER BY name_ar').all();
    }

    static savePaymentMethod(data: any) {
        const id = data.id || uuidv4();
        if (!data.id) {
            db.prepare(`
                INSERT INTO payment_methods (id, name_ar, name_en, type, gl_account_id, commission_rate, is_active)
                VALUES (@id, @name_ar, @name_en, @type, @gl_account_id, @commission_rate, 1)
            `).run({
                ...data,
                id,
                name_en: data.name_en || null,
                type: data.type || 'CASH', // Fix missing param default
                gl_account_id: data.gl_account_id || null,
                commission_rate: data.commission_rate || 0
            });
        } else {
            db.prepare(`
                UPDATE payment_methods SET 
                    name_ar=@name_ar, name_en=@name_en, type=@type, 
                    gl_account_id=@gl_account_id, commission_rate=@commission_rate
                WHERE id=@id
            `).run(data);
        }
        return { success: true, id };
    }

    // ================================================================
    // 6. BRANCHES
    // ================================================================
    static getBranches() {
        return db.prepare('SELECT * FROM branches ORDER BY is_main DESC, name_ar').all();
    }

    static saveBranch(data: any) {
        const id = data.id || uuidv4();
        if (!data.id) {
            db.prepare(`
                INSERT INTO branches (id, name_ar, name_en, type, address, phone, is_main, is_active)
                VALUES (@id, @name_ar, @name_en, @type, @address, @phone, @is_main, 1)
            `).run({
                ...data,
                id,
                name_en: data.name_en || null,
                type: data.type || 'BRANCH',
                address: data.address || null,
                phone: data.phone || null,
                is_main: data.is_main ? 1 : 0
            });
        } else {
            db.prepare(`
                UPDATE branches SET 
                    name_ar=@name_ar, name_en=@name_en, type=@type,
                    address=@address, phone=@phone, is_main=@is_main
                WHERE id=@id
            `).run({
                ...data,
                is_main: data.is_main ? 1 : 0
            });
        }
        return { success: true, id };
    }

    static deleteBranch(id: string) {
        db.prepare('DELETE FROM branches WHERE id = ?').run(id);
        return { success: true };
    }
}
