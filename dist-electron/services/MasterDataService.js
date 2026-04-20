"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterDataService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class MasterDataService {
    // ================================================================
    // 1. BANKS
    // ================================================================
    static getBanks() {
        return database_1.db.prepare('SELECT * FROM banks ORDER BY name_ar').all();
    }
    static saveBank(data) {
        if (!data.id) {
            const id = (0, uuid_1.v4)();
            database_1.db.prepare(`
                INSERT INTO banks (
                    id, name_ar, name_en, swift_code, is_local, 
                    bank_code, branch_code, name_he, routing_no, address
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, data.name_ar, data.name_en, data.swift_code, data.is_local ? 1 : 0, data.bank_code, data.branch_code, data.name_he, data.routing_no, data.address);
            return { success: true, id };
        }
        else {
            database_1.db.prepare(`
                UPDATE banks SET 
                    name_ar=?, name_en=?, swift_code=?, is_local=?,
                    bank_code=?, branch_code=?, name_he=?, routing_no=?, address=?
                WHERE id=?
            `).run(data.name_ar, data.name_en, data.swift_code, data.is_local ? 1 : 0, data.bank_code, data.branch_code, data.name_he, data.routing_no, data.address, data.id);
            return { success: true, id: data.id };
        }
    }
    static deleteBank(id) {
        database_1.db.prepare('DELETE FROM banks WHERE id = ?').run(id);
        return { success: true };
    }
    static async importBanksFromHTML(filePath) {
        const fs = require('fs');
        const cheerio = require('cheerio');
        if (!fs.existsSync(filePath))
            throw new Error('File not found');
        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);
        const rows = $('table.list tr');
        let valid = 0, updated = 0, inserted = 0;
        const checkStmt = database_1.db.prepare('SELECT id FROM banks WHERE bank_code = ? AND branch_code = ?');
        const insertStmt = database_1.db.prepare(`
            INSERT INTO banks (id, name_ar, name_en, name_he, bank_code, branch_code, swift_code, routing_no, address, is_local)
            VALUES (@id, @name_ar, @name_en, @name_he, @bank_code, @branch_code, @swift_code, @routing_no, @address, 1)
        `);
        const updateStmt = database_1.db.prepare(`
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
        const runImport = database_1.db.transaction(() => {
            rows.each((i, el) => {
                const tds = $(el).find('td');
                if (tds.length === 0)
                    return;
                if ($(el).find('.tableHeader').length > 0)
                    return;
                const txt = (idx) => $(tds[idx]).text().trim();
                const bankCode = txt(1);
                // Important: Branch code is column 2
                const branchCode = txt(2);
                if (!bankCode || bankCode === '00' || bankCode === 'بنك')
                    return;
                const data = {
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
                }
                else {
                    insertStmt.run({ ...data, id: (0, uuid_1.v4)() });
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
            database_1.db.prepare(`
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
            database_1.db.prepare(`
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
            database_1.db.prepare(`
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
        }
        catch (e) {
            console.error("MasterDataService.getBankAccounts self-heal failed:", e);
        }
        return database_1.db.prepare(`
            SELECT
                ba.*,
                ba.currency_id AS currency_uuid,
                COALESCE(cur.code, ba.currency, ba.currency_id) AS currency_id,
                COALESCE(b.name_ar, b.name_en, ba.bank_name) AS bank_name,
                COALESCE(acc.name, gl.name_ar, gl.name_en) AS gl_account_name,
                COALESCE(acc.code, gl.account_code) AS gl_account_code,
                COALESCE(comm_acc.name, comm_gl.name_ar, comm_gl.name_en) AS commission_account_name
            FROM bank_accounts ba
            LEFT JOIN banks b ON ba.bank_id = b.id
            LEFT JOIN currencies cur ON ba.currency_id = cur.id
            LEFT JOIN accounts acc ON ba.gl_account_id = acc.id
            LEFT JOIN gl_chart_of_accounts gl ON ba.gl_account_id = gl.id
            LEFT JOIN accounts comm_acc ON ba.commission_account_id = comm_acc.id
            LEFT JOIN gl_chart_of_accounts comm_gl ON ba.commission_account_id = comm_gl.id
            ORDER BY ba.created_at
        `).all();
    }
    static saveBankAccount(data) {
        try {
            // SELF-HEAL: Ensure columns exist at runtime
            try {
                const cols = database_1.db.prepare("PRAGMA table_info(bank_accounts)").all();
                if (!cols.some((c) => c.name === 'commission_account_id')) {
                    database_1.db.prepare("ALTER TABLE bank_accounts ADD COLUMN commission_account_id TEXT").run();
                }
                if (!cols.some((c) => c.name === 'branch')) {
                    database_1.db.prepare("ALTER TABLE bank_accounts ADD COLUMN branch TEXT").run();
                }
                if (!cols.some((c) => c.name === 'iban')) {
                    database_1.db.prepare("ALTER TABLE bank_accounts ADD COLUMN iban TEXT").run();
                }
                if (!cols.some((c) => c.name === 'account_name')) {
                    database_1.db.prepare("ALTER TABLE bank_accounts ADD COLUMN account_name TEXT").run();
                }
                if (!cols.some((c) => c.name === 'bank_name')) {
                    database_1.db.prepare("ALTER TABLE bank_accounts ADD COLUMN bank_name TEXT").run();
                }
                if (!cols.some((c) => c.name === 'currency')) {
                    database_1.db.prepare("ALTER TABLE bank_accounts ADD COLUMN currency TEXT DEFAULT 'ILS'").run();
                }
                if (!cols.some((c) => c.name === 'code')) {
                    // Custom Numbering Column
                    database_1.db.prepare("ALTER TABLE bank_accounts ADD COLUMN code TEXT").run();
                }
            }
            catch (e) { /* ignore */ }
            const id = data.id || (0, uuid_1.v4)();
            const normalizeType = (raw) => {
                const value = (raw || 'ASSET').toUpperCase();
                if (value === 'ASSET')
                    return 'Asset';
                if (value === 'LIABILITY')
                    return 'Liability';
                if (value === 'EQUITY')
                    return 'Equity';
                if (value === 'REVENUE')
                    return 'Revenue';
                if (value === 'EXPENSE')
                    return 'Expense';
                return 'Asset';
            };
            const resolveCurrency = (value) => {
                const incoming = (value || 'ILS').toString().trim();
                const byCode = database_1.db.prepare("SELECT id, code FROM currencies WHERE code = ?").get(incoming);
                if (byCode)
                    return { code: byCode.code, id: byCode.id };
                const byId = database_1.db.prepare("SELECT id, code FROM currencies WHERE id = ?").get(incoming);
                if (byId)
                    return { code: byId.code, id: byId.id };
                const fallback = database_1.db.prepare("SELECT id, code FROM currencies ORDER BY code LIMIT 1").get();
                if (fallback)
                    return { code: fallback.code, id: fallback.id };
                return { code: incoming || 'ILS', id: null };
            };
            const currencyInfo = resolveCurrency(data.currency_id || data.currency);
            const currencyCode = currencyInfo.code;
            const currencyUUID = currencyInfo.id;
            // Ensure a picked Chart-of-Accounts node always maps to a valid legacy "accounts" row.
            const ensureLegacyAccountFromChart = (chartAccountId) => {
                if (!chartAccountId)
                    return null;
                const direct = database_1.db.prepare("SELECT id FROM accounts WHERE id = ?").get(chartAccountId);
                if (direct)
                    return direct.id;
                const chart = database_1.db.prepare(`
                    SELECT id, account_code, name_ar, name_en, parent_id, account_type, is_transactional, currency_id
                    FROM gl_chart_of_accounts
                    WHERE id = ?
                `).get(chartAccountId);
                if (!chart)
                    return null;
                const existingByCode = database_1.db.prepare("SELECT id FROM accounts WHERE code = ?").get(chart.account_code);
                if (existingByCode)
                    return existingByCode.id;
                let parentLegacyId = null;
                if (chart.parent_id) {
                    const parentDirect = database_1.db.prepare("SELECT id FROM accounts WHERE id = ?").get(chart.parent_id);
                    parentLegacyId = parentDirect?.id || ensureLegacyAccountFromChart(chart.parent_id);
                }
                let legacyCurrencyCode = currencyCode;
                if (chart.currency_id) {
                    const c = database_1.db.prepare("SELECT code FROM currencies WHERE id = ?").get(chart.currency_id);
                    if (c?.code)
                        legacyCurrencyCode = c.code;
                }
                database_1.db.prepare(`
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
                return chart.id;
            };
            const resolveLinkedAccountId = (inputId) => {
                if (!inputId)
                    return null;
                const direct = database_1.db.prepare("SELECT id FROM accounts WHERE id = ?").get(inputId);
                if (direct)
                    return direct.id;
                const synced = ensureLegacyAccountFromChart(inputId);
                if (synced)
                    return synced;
                return inputId;
            };
            const bankNameFromMaster = data.bank_id
                ? database_1.db.prepare("SELECT name_ar FROM banks WHERE id = ?").get(data.bank_id)?.name_ar
                : null;
            const resolveCurrencyLabel = (code) => {
                const c = (code || '').toUpperCase();
                if (c === 'JOD')
                    return 'دينار';
                if (c === 'USD')
                    return 'دولار';
                if (c === 'EUR')
                    return 'يورو';
                if (c === 'ILS' || c === 'NIS')
                    return 'شيكل';
                return code || 'متعدد العملات';
            };
            const resolveChartAccountId = (inputId) => {
                if (!inputId)
                    return null;
                const chartDirect = database_1.db.prepare("SELECT id FROM gl_chart_of_accounts WHERE id = ?").get(inputId);
                if (chartDirect)
                    return chartDirect.id;
                const legacy = database_1.db.prepare("SELECT code FROM accounts WHERE id = ?").get(inputId);
                if (legacy?.code) {
                    const chartByCode = database_1.db.prepare("SELECT id FROM gl_chart_of_accounts WHERE account_code = ?").get(legacy.code);
                    if (chartByCode)
                        return chartByCode.id;
                }
                return null;
            };
            const getNextChildCode = (parentChartId, parentCode) => {
                const lastSibling = database_1.db.prepare(`
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
                while (database_1.db.prepare(`
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
                    if (guard > 500)
                        throw new Error("Unable to generate a unique account code");
                }
                return nextCode;
            };
            const ensureBankCurrencyParentAccount = () => {
                if (data.id)
                    return null;
                const bankRoot = database_1.db.prepare(`
                    SELECT id, account_code, account_type
                    FROM gl_chart_of_accounts
                    WHERE account_code = '112'
                    LIMIT 1
                `).get() || database_1.db.prepare(`
                    SELECT id, account_code, account_type
                    FROM gl_chart_of_accounts
                    WHERE is_transactional = 0
                      AND account_type = 'ASSET'
                      AND (name_ar LIKE '%بنوك%' OR name_ar LIKE '%البنوك%' OR name_en LIKE '%Bank%')
                    ORDER BY LENGTH(account_code), account_code
                    LIMIT 1
                `).get();
                if (!bankRoot)
                    return null;
                if (currencyUUID) {
                    const existingByCurrency = database_1.db.prepare(`
                        SELECT id
                        FROM gl_chart_of_accounts
                        WHERE parent_id = ?
                          AND is_transactional = 0
                          AND currency_id = ?
                          AND (name_ar LIKE '%بنوك%' OR name_ar LIKE '%البنوك%' OR name_en LIKE '%Bank%')
                        ORDER BY account_code
                        LIMIT 1
                    `).get(bankRoot.id, currencyUUID);
                    if (existingByCurrency)
                        return existingByCurrency.id;
                }
                const label = resolveCurrencyLabel(currencyCode);
                const parentNameAr = `البنوك - ${label}`;
                const parentNameEn = `Banks - ${currencyCode}`;
                const existingByName = database_1.db.prepare(`
                    SELECT id
                    FROM gl_chart_of_accounts
                    WHERE parent_id = ?
                      AND is_transactional = 0
                      AND (name_ar = ? OR name_en = ?)
                    LIMIT 1
                `).get(bankRoot.id, parentNameAr, parentNameEn);
                if (existingByName)
                    return existingByName.id;
                const parentId = (0, uuid_1.v4)();
                const parentCode = getNextChildCode(bankRoot.id, bankRoot.account_code);
                const parentLegacyId = resolveLinkedAccountId(bankRoot.id);
                database_1.db.prepare(`
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
                database_1.db.prepare(`
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
                return parentId;
            };
            const createAutoLinkedGLAccount = (parentChartId) => {
                if (data.id || !parentChartId)
                    return null;
                const parentChart = database_1.db.prepare(`
                    SELECT id, account_code, account_type, currency_id
                    FROM gl_chart_of_accounts
                    WHERE id = ?
                `).get(parentChartId);
                if (!parentChart)
                    return null;
                const nextCode = getNextChildCode(parentChart.id, parentChart.account_code);
                const newId = (0, uuid_1.v4)();
                const newAccountName = data.account_name || `${data.bank_name || bankNameFromMaster || 'Bank'} - ${currencyCode}`;
                const parentLegacyId = resolveLinkedAccountId(parentChart.id);
                const chartCurrencyId = parentChart.currency_id || currencyUUID || null;
                database_1.db.prepare(`
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
                database_1.db.prepare(`
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
                console.log(`[Auto-Create] Created bank GL account ${newAccountName} (${nextCode})`);
                return newId;
            };
            let glAccountId = resolveLinkedAccountId(data.gl_account_id || null);
            if (!glAccountId) {
                const explicitParentChartId = resolveChartAccountId(data.parent_gl_id || null);
                const autoParentChartId = explicitParentChartId || ensureBankCurrencyParentAccount();
                if (autoParentChartId) {
                    glAccountId = createAutoLinkedGLAccount(autoParentChartId);
                }
            }
            const commissionAccountId = resolveLinkedAccountId(data.commission_account_id || null);
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
            if (!data.id) {
                database_1.db.prepare(`
                    INSERT INTO bank_accounts (
                        id, bank_id, branch, account_number, iban, 
                        currency, currency_id, gl_account_id, commission_account_id, account_name, bank_name, code, is_active
                    )
                    VALUES (
                        @id, @bank_id, @branch, @account_number, @iban, 
                        @currency, @currency_id, @gl_account_id, @commission_account_id, @account_name, @bank_name, @code, @is_active
                    )
                `).run(params);
            }
            else {
                database_1.db.prepare(`
                    UPDATE bank_accounts SET 
                        bank_id=@bank_id, branch=@branch, account_number=@account_number, 
                        iban=@iban, currency=@currency, currency_id=@currency_id,
                        gl_account_id=@gl_account_id, commission_account_id=@commission_account_id,
                        account_name=@account_name, bank_name=@bank_name, code=@code, is_active=@is_active
                    WHERE id=@id
                `).run(params);
            }
            return { success: true, id };
        }
        catch (err) {
            console.error("MasterDataService.saveBankAccount Error:", err);
            throw err;
        }
    }
    static deleteBankAccount(id) {
        database_1.db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(id);
        return { success: true };
    }
    // ================================================================
    // 3. COST CENTERS
    // ================================================================
    static getCostCenters() {
        // Return hierarchy or flat list? Flat list for now, UI builds tree
        return database_1.db.prepare('SELECT * FROM cost_centers ORDER BY code').all();
    }
    static saveCostCenter(data) {
        const id = data.id || (0, uuid_1.v4)();
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
            database_1.db.prepare(`
                INSERT INTO cost_centers (id, code, name_ar, name_en, parent_id, type, manager_name, is_active)
                VALUES (@id, @code, @name_ar, @name_en, @parent_id, @type, @manager_name, 1)
            `).run(sanitizedData);
        }
        else {
            database_1.db.prepare(`
                UPDATE cost_centers SET 
                    code=@code, name_ar=@name_ar, name_en=@name_en, parent_id=@parent_id, 
                    type=@type, manager_name=@manager_name
                WHERE id=@id
            `).run(sanitizedData);
        }
        return { success: true, id };
    }
    static deleteCostCenter(id) {
        database_1.db.prepare('DELETE FROM cost_centers WHERE id = ?').run(id);
        return { success: true };
    }
    // ================================================================
    // 4. PAYMENT METHODS
    // ================================================================
    static getPaymentMethods() {
        return database_1.db.prepare('SELECT * FROM payment_methods ORDER BY name_ar').all();
    }
    static savePaymentMethod(data) {
        const id = data.id || (0, uuid_1.v4)();
        if (!data.id) {
            database_1.db.prepare(`
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
        }
        else {
            database_1.db.prepare(`
                UPDATE payment_methods SET 
                    name_ar=@name_ar, name_en=@name_en, type=@type, 
                    gl_account_id=@gl_account_id, commission_rate=@commission_rate
                WHERE id=@id
            `).run(data);
        }
        return { success: true, id };
    }
    // ================================================================
    // 5. BRANCHES
    // ================================================================
    static getBranches() {
        return database_1.db.prepare('SELECT * FROM branches ORDER BY is_main DESC, name_ar').all();
    }
    static saveBranch(data) {
        const id = data.id || (0, uuid_1.v4)();
        if (!data.id) {
            database_1.db.prepare(`
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
        }
        else {
            database_1.db.prepare(`
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
    static deleteBranch(id) {
        database_1.db.prepare('DELETE FROM branches WHERE id = ?').run(id);
        return { success: true };
    }
}
exports.MasterDataService = MasterDataService;
