"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteAccountingFoundationRepo = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const uuid_1 = require("uuid");
const Account_1 = require("../../domain/accountingFoundation/entities/Account");
const FinancialDefinition_1 = require("../../domain/accountingFoundation/entities/FinancialDefinition");
const AccountCategory_1 = require("../../domain/accountingFoundation/enums/AccountCategory");
const AccountCurrencyBehavior_1 = require("../../domain/accountingFoundation/enums/AccountCurrencyBehavior");
const AccountMappingKey_1 = require("../../domain/accountingFoundation/enums/AccountMappingKey");
const AccountReferenceType_1 = require("../../domain/accountingFoundation/enums/AccountReferenceType");
const AccountScopeType_1 = require("../../domain/accountingFoundation/enums/AccountScopeType");
const AccountSubtype_1 = require("../../domain/accountingFoundation/enums/AccountSubtype");
const AccountType_1 = require("../../domain/accountingFoundation/enums/AccountType");
const FinancialDefinitionScopeType_1 = require("../../domain/accountingFoundation/enums/FinancialDefinitionScopeType");
const CATEGORY_DEFAULT_BY_TYPE = {
    [AccountType_1.AccountType.ASSET]: AccountCategory_1.AccountCategory.CURRENT_ASSET,
    [AccountType_1.AccountType.LIABILITY]: AccountCategory_1.AccountCategory.CURRENT_LIABILITY,
    [AccountType_1.AccountType.EQUITY]: AccountCategory_1.AccountCategory.EQUITY,
    [AccountType_1.AccountType.REVENUE]: AccountCategory_1.AccountCategory.OPERATING_REVENUE,
    [AccountType_1.AccountType.EXPENSE]: AccountCategory_1.AccountCategory.OPERATING_EXPENSE,
};
class SqliteAccountingFoundationRepo {
    constructor(database) {
        this.db = database || new better_sqlite3_1.default('wafi.db');
        this.ensureSchema();
    }
    nextIdentity() {
        return (0, uuid_1.v4)();
    }
    async getById(companyId, accountId) {
        const row = this.db
            .prepare('SELECT * FROM accounts WHERE company_id = ? AND id = ? LIMIT 1')
            .get(companyId, accountId);
        return row ? this.mapAccountRow(row) : null;
    }
    async getByCode(companyId, accountCode) {
        const normalizedCode = String(accountCode || '').trim().toUpperCase();
        const row = this.db
            .prepare(`
                SELECT *
                FROM accounts
                WHERE company_id = ?
                  AND UPPER(COALESCE(account_code, code, '')) = ?
                LIMIT 1
            `)
            .get(companyId, normalizedCode);
        return row ? this.mapAccountRow(row) : null;
    }
    async getByIds(companyId, accountIds) {
        if (!accountIds.length)
            return [];
        const placeholders = accountIds.map(() => '?').join(',');
        const rows = this.db
            .prepare(`SELECT * FROM accounts WHERE company_id = ? AND id IN (${placeholders})`)
            .all(companyId, ...accountIds);
        return rows.map((row) => this.mapAccountRow(row));
    }
    async list(companyId, includeInactive) {
        const rows = this.db
            .prepare(`
                SELECT *
                FROM accounts
                WHERE company_id = ?
                  AND (? = 1 OR COALESCE(status, CASE WHEN is_active = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END) = 'ACTIVE')
                ORDER BY UPPER(COALESCE(account_code, code, '')) ASC
            `)
            .all(companyId, includeInactive ? 1 : 0);
        return rows.map((row) => this.mapAccountRow(row));
    }
    async save(account) {
        const payload = account.toJSON();
        this.db
            .prepare(`
                INSERT INTO accounts (
                    id, company_id, branch_id, account_code, code, name, type,
                    account_category, account_subtype, parent_id, account_level,
                    posting_allowed, is_transactional, is_group,
                    currency_behavior, currency_code, currency,
                    reference_type,
                    scope_type, status, is_active,
                    requires_cost_center, requires_analysis_code
                ) VALUES (
                    @id, @companyId, @branchId, @accountCode, @accountCode, @name, @accountType,
                    @accountCategory, @accountSubtype, @parentId, @level,
                    @postingAllowed, @postingAllowed, @isGroup,
                    @currencyBehavior, @currencyCode, @currencyCode,
                    @referenceType,
                    @scopeType, @status, @isActive,
                    @requiresCostCenter, @requiresAnalysisCode
                )
                ON CONFLICT(id) DO UPDATE SET
                    branch_id = excluded.branch_id,
                    account_code = excluded.account_code,
                    code = excluded.code,
                    name = excluded.name,
                    type = excluded.type,
                    account_category = excluded.account_category,
                    account_subtype = excluded.account_subtype,
                    parent_id = excluded.parent_id,
                    account_level = excluded.account_level,
                    posting_allowed = excluded.posting_allowed,
                    is_transactional = excluded.is_transactional,
                    is_group = excluded.is_group,
                    currency_behavior = excluded.currency_behavior,
                    currency_code = excluded.currency_code,
                    currency = excluded.currency,
                    reference_type = excluded.reference_type,
                    scope_type = excluded.scope_type,
                    status = excluded.status,
                    is_active = excluded.is_active,
                    requires_cost_center = excluded.requires_cost_center,
                    requires_analysis_code = excluded.requires_analysis_code
            `)
            .run({
            id: payload.id,
            companyId: payload.companyId,
            branchId: payload.branchId,
            accountCode: payload.accountCode,
            name: payload.name,
            accountType: payload.accountType,
            accountCategory: payload.accountCategory,
            accountSubtype: payload.accountSubtype,
            parentId: payload.parentId,
            level: payload.level,
            postingAllowed: payload.postingAllowed ? 1 : 0,
            isGroup: payload.postingAllowed ? 0 : 1,
            currencyBehavior: payload.currencyBehavior,
            currencyCode: payload.currencyCode,
            referenceType: payload.referenceType,
            scopeType: payload.scopeType,
            status: payload.status,
            isActive: payload.status === Account_1.AccountStatus.ACTIVE ? 1 : 0,
            requiresCostCenter: payload.requiresCostCenter ? 1 : 0,
            requiresAnalysisCode: payload.requiresAnalysisCode ? 1 : 0,
        });
    }
    async delete(companyId, accountId) {
        this.db.prepare('DELETE FROM accounts WHERE company_id = ? AND id = ?').run(companyId, accountId);
    }
    async hasChildren(companyId, accountId) {
        const row = this.db
            .prepare('SELECT 1 as ok FROM accounts WHERE company_id = ? AND parent_id = ? LIMIT 1')
            .get(companyId, accountId);
        return Boolean(row?.ok);
    }
    async hasReferences(companyId, accountId) {
        const checks = [
            { table: 'journal_entry_lines', column: 'account_id', companyColumn: null },
            { table: 'transaction_lines', column: 'account_id', companyColumn: null },
            { table: 'financial_definitions', column: 'account_id', companyColumn: 'company_id' },
        ];
        for (const check of checks) {
            if (!this.tableExists(check.table))
                continue;
            const sql = check.companyColumn
                ? `SELECT 1 as ok FROM ${check.table} WHERE ${check.column} = ? AND ${check.companyColumn} = ? LIMIT 1`
                : `SELECT 1 as ok FROM ${check.table} WHERE ${check.column} = ? LIMIT 1`;
            const row = check.companyColumn
                ? this.db.prepare(sql).get(accountId, companyId)
                : this.db.prepare(sql).get(accountId);
            if (row?.ok)
                return true;
        }
        return false;
    }
    async getPostable(companyId) {
        const rows = this.db
            .prepare(`
                SELECT *
                FROM accounts
                WHERE company_id = ?
                  AND COALESCE(posting_allowed, is_transactional, 1) = 1
                  AND COALESCE(status, CASE WHEN is_active = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END) = 'ACTIVE'
                ORDER BY UPPER(COALESCE(account_code, code, '')) ASC
            `)
            .all(companyId);
        return rows.map((row) => this.mapAccountRow(row));
    }
    async getDefinitionById(companyId, definitionId) {
        const row = this.db
            .prepare('SELECT * FROM financial_definitions WHERE company_id = ? AND id = ? LIMIT 1')
            .get(companyId, definitionId);
        return row ? this.mapDefinitionRow(row) : null;
    }
    async listDefinitions(companyId, includeInactive) {
        const rows = this.db
            .prepare(`
                SELECT *
                FROM financial_definitions
                WHERE company_id = ?
                  AND (? = 1 OR is_active = 1)
                ORDER BY mapping_key ASC, scope_type ASC, scope_id ASC, priority ASC
            `)
            .all(companyId, includeInactive ? 1 : 0);
        return rows.map((row) => this.mapDefinitionRow(row));
    }
    async listForResolution(query) {
        if (!query.mappingKeys.length)
            return [];
        const normalizedDocumentType = this.normalizeDefinitionQualifier(query.documentType);
        const normalizedLineType = this.normalizeDefinitionQualifier(query.lineType);
        const normalizedTaxProfileId = this.normalizeDefinitionQualifier(query.taxProfileId);
        const mappingPlaceholders = query.mappingKeys.map(() => '?').join(',');
        const scopeClauses = ["(scope_type = ? AND scope_id = ?)"];
        const params = [
            query.companyId,
            ...query.mappingKeys,
            query.postingDate,
            query.postingDate,
            FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.COMPANY,
            'DEFAULT',
        ];
        if (query.itemId) {
            scopeClauses.push('(scope_type = ? AND scope_id = ?)');
            params.push(FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.ITEM, query.itemId);
        }
        if (query.itemGroupId) {
            scopeClauses.push('(scope_type = ? AND scope_id = ?)');
            params.push(FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.ITEM_GROUP, query.itemGroupId);
        }
        if (query.warehouseId) {
            scopeClauses.push('(scope_type = ? AND scope_id = ?)');
            params.push(FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.WAREHOUSE, query.warehouseId);
        }
        if (query.partnerId) {
            scopeClauses.push('(scope_type = ? AND scope_id = ?)');
            params.push(FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.PARTNER, query.partnerId);
        }
        if (query.branchId) {
            scopeClauses.push('(scope_type = ? AND scope_id = ?)');
            params.push(FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.BRANCH, query.branchId);
        }
        let branchPredicate = 'AND branch_id IS NULL';
        if (query.branchId) {
            branchPredicate = 'AND (branch_id IS NULL OR branch_id = ?)';
            params.push(query.branchId);
        }
        const sql = `
            SELECT *
            FROM financial_definitions
            WHERE company_id = ?
              AND is_active = 1
              AND mapping_key IN (${mappingPlaceholders})
              AND (valid_from IS NULL OR valid_from <= ?)
              AND (valid_to IS NULL OR valid_to >= ?)
              AND (${scopeClauses.join(' OR ')})
              ${branchPredicate}
              AND (document_type IS NULL OR document_type = ?)
              AND (line_type IS NULL OR line_type = ?)
              AND (tax_profile_id IS NULL OR tax_profile_id = ?)
            ORDER BY priority ASC, updated_at DESC, id ASC
        `;
        params.push(normalizedDocumentType, normalizedLineType, normalizedTaxProfileId);
        const rows = this.db.prepare(sql).all(...params);
        return rows.map((row) => this.mapDefinitionRow(row));
    }
    async saveDefinition(definition) {
        const payload = definition.toJSON();
        this.db
            .prepare(`
                INSERT INTO financial_definitions (
                    id, company_id, branch_id, scope_type, scope_id, mapping_key,
                    account_id, priority, is_active, valid_from, valid_to,
                    document_type, line_type, tax_profile_id
                ) VALUES (
                    @id, @companyId, @branchId, @scopeType, @scopeId, @mappingKey,
                    @accountId, @priority, @isActive, @validFrom, @validTo,
                    @documentType, @lineType, @taxProfileId
                )
                ON CONFLICT(id) DO UPDATE SET
                    branch_id = excluded.branch_id,
                    scope_type = excluded.scope_type,
                    scope_id = excluded.scope_id,
                    mapping_key = excluded.mapping_key,
                    account_id = excluded.account_id,
                    priority = excluded.priority,
                    is_active = excluded.is_active,
                    valid_from = excluded.valid_from,
                    valid_to = excluded.valid_to,
                    document_type = excluded.document_type,
                    line_type = excluded.line_type,
                    tax_profile_id = excluded.tax_profile_id,
                    updated_at = CURRENT_TIMESTAMP
            `)
            .run({
            id: payload.id,
            companyId: payload.companyId,
            branchId: payload.branchId,
            scopeType: payload.scopeType,
            scopeId: payload.scopeId,
            mappingKey: payload.mappingKey,
            accountId: payload.accountId,
            priority: payload.priority,
            isActive: payload.isActive ? 1 : 0,
            validFrom: payload.validFrom,
            validTo: payload.validTo,
            documentType: this.normalizeDefinitionQualifier(payload.documentType),
            lineType: this.normalizeDefinitionQualifier(payload.lineType),
            taxProfileId: this.normalizeDefinitionQualifier(payload.taxProfileId),
        });
    }
    async deactivateActiveDuplicates(input) {
        const normalizedInput = {
            ...input,
            documentType: this.normalizeDefinitionQualifier(input.documentType),
            lineType: this.normalizeDefinitionQualifier(input.lineType),
            taxProfileId: this.normalizeDefinitionQualifier(input.taxProfileId),
        };
        this.db
            .prepare(`
                UPDATE financial_definitions
                SET is_active = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = @companyId
                  AND COALESCE(branch_id, '') = COALESCE(@branchId, '')
                  AND scope_type = @scopeType
                  AND scope_id = @scopeId
                  AND mapping_key = @mappingKey
                  AND COALESCE(document_type, '') = COALESCE(@documentType, '')
                  AND COALESCE(line_type, '') = COALESCE(@lineType, '')
                  AND COALESCE(tax_profile_id, '') = COALESCE(@taxProfileId, '')
                  AND id != @excludeId
                  AND is_active = 1
            `)
            .run(normalizedInput);
    }
    async deleteDefinition(companyId, definitionId) {
        this.db
            .prepare('DELETE FROM financial_definitions WHERE company_id = ? AND id = ?')
            .run(companyId, definitionId);
    }
    ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS financial_definitions (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT,
                scope_type TEXT NOT NULL,
                scope_id TEXT NOT NULL,
                mapping_key TEXT NOT NULL,
                account_id TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 100,
                is_active INTEGER NOT NULL DEFAULT 1,
                valid_from TEXT,
                valid_to TEXT,
                document_type TEXT,
                line_type TEXT,
                tax_profile_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        this.safeAddDefinitionColumn('document_type', 'TEXT');
        this.safeAddDefinitionColumn('line_type', 'TEXT');
        this.safeAddDefinitionColumn('tax_profile_id', 'TEXT');
        this.db.exec(`
            UPDATE financial_definitions
            SET document_type = NULLIF(UPPER(TRIM(COALESCE(document_type, ''))), ''),
                line_type = NULLIF(UPPER(TRIM(COALESCE(line_type, ''))), ''),
                tax_profile_id = NULLIF(UPPER(TRIM(COALESCE(tax_profile_id, ''))), '');
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_financial_definitions_company
            ON financial_definitions(company_id);

            CREATE INDEX IF NOT EXISTS idx_financial_definitions_mapping
            ON financial_definitions(company_id, mapping_key, scope_type, scope_id);

            CREATE INDEX IF NOT EXISTS idx_fin_defs_resolve_scope
            ON financial_definitions(company_id, scope_type, scope_id, mapping_key, is_active);

            CREATE INDEX IF NOT EXISTS idx_fin_defs_resolve_scope_branch
            ON financial_definitions(company_id, scope_type, scope_id, branch_id, mapping_key, is_active);

            CREATE INDEX IF NOT EXISTS idx_fin_defs_resolve_qual
            ON financial_definitions(company_id, mapping_key, document_type, line_type, tax_profile_id, is_active);
        `);
        this.db.exec(`
            DROP INDEX IF EXISTS ux_financial_definitions_active;

            CREATE UNIQUE INDEX IF NOT EXISTS ux_financial_definitions_active_variant
            ON financial_definitions(
                company_id,
                COALESCE(branch_id, ''),
                scope_type,
                scope_id,
                mapping_key,
                COALESCE(document_type, ''),
                COALESCE(line_type, ''),
                COALESCE(tax_profile_id, '')
            )
            WHERE is_active = 1;
        `);
        this.safeAddAccountColumn('company_id', "TEXT DEFAULT 'COMP_01'");
        this.safeAddAccountColumn('branch_id', 'TEXT');
        this.safeAddAccountColumn('account_code', 'TEXT');
        this.safeAddAccountColumn('account_category', "TEXT DEFAULT 'GENERAL'");
        this.safeAddAccountColumn('account_subtype', "TEXT DEFAULT 'GENERAL'");
        this.safeAddAccountColumn('posting_allowed', 'INTEGER DEFAULT 1');
        this.safeAddAccountColumn('currency_behavior', "TEXT DEFAULT 'BASE_ONLY'");
        this.safeAddAccountColumn('currency_code', 'TEXT');
        this.safeAddAccountColumn('reference_type', "TEXT DEFAULT 'NONE'");
        this.safeAddAccountColumn('scope_type', "TEXT DEFAULT 'COMPANY'");
        this.safeAddAccountColumn('status', "TEXT DEFAULT 'ACTIVE'");
        this.safeAddAccountColumn('requires_cost_center', 'INTEGER DEFAULT 0');
        this.safeAddAccountColumn('requires_analysis_code', 'INTEGER DEFAULT 0');
        this.db.exec(`
            UPDATE accounts
            SET company_id = COALESCE(NULLIF(company_id, ''), 'COMP_01');

            UPDATE accounts
            SET account_code = UPPER(COALESCE(NULLIF(account_code, ''), NULLIF(code, ''), id));

            UPDATE accounts
            SET account_category = COALESCE(NULLIF(account_category, ''), 'GENERAL'),
                account_subtype = COALESCE(NULLIF(account_subtype, ''), 'GENERAL'),
                posting_allowed = COALESCE(posting_allowed, is_transactional, CASE WHEN COALESCE(is_group, 0) = 1 THEN 0 ELSE 1 END),
                currency_behavior = COALESCE(NULLIF(currency_behavior, ''), CASE WHEN COALESCE(currency_code, currency, '') != '' THEN 'FIXED_CURRENCY' ELSE 'BASE_ONLY' END),
                currency_code = COALESCE(NULLIF(currency_code, ''), NULLIF(currency, '')),
                reference_type = COALESCE(NULLIF(reference_type, ''), CASE
                    WHEN UPPER(COALESCE(account_subtype, 'GENERAL')) IN ('RECEIVABLE','PAYABLE') THEN 'GUIDE'
                    WHEN UPPER(COALESCE(account_subtype, 'GENERAL')) = 'BANK' THEN 'BANK_CHEQUE'
                    WHEN UPPER(COALESCE(account_subtype, 'GENERAL')) = 'CASH' THEN 'USER'
                    ELSE 'NONE'
                END),
                scope_type = COALESCE(NULLIF(scope_type, ''), CASE WHEN COALESCE(branch_id, '') != '' THEN 'BRANCH' ELSE 'COMPANY' END),
                status = COALESCE(NULLIF(status, ''), CASE WHEN COALESCE(is_active, 1) = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END),
                requires_cost_center = COALESCE(requires_cost_center, 0),
                requires_analysis_code = COALESCE(requires_analysis_code, 0);
        `);
        try {
            this.db.exec(`
                CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_company_code
                ON accounts(company_id, account_code);
            `);
        }
        catch (error) {
            console.warn('[SqliteAccountingFoundationRepo] Could not create ux_accounts_company_code:', error?.message || error);
        }
    }
    safeAddAccountColumn(columnName, ddl) {
        const columns = this.db.prepare('PRAGMA table_info(accounts)').all();
        const exists = columns.some((column) => column.name === columnName);
        if (!exists) {
            this.db.prepare(`ALTER TABLE accounts ADD COLUMN ${columnName} ${ddl}`).run();
        }
    }
    safeAddDefinitionColumn(columnName, ddl) {
        const columns = this.db.prepare('PRAGMA table_info(financial_definitions)').all();
        const exists = columns.some((column) => column.name === columnName);
        if (!exists) {
            this.db.prepare(`ALTER TABLE financial_definitions ADD COLUMN ${columnName} ${ddl}`).run();
        }
    }
    tableExists(tableName) {
        const row = this.db
            .prepare("SELECT 1 as ok FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
            .get(tableName);
        return Boolean(row?.ok);
    }
    mapAccountRow(row) {
        const normalizedType = this.normalizeAccountType(row.type);
        const normalizedCategory = this.normalizeAccountCategory(row.account_category, normalizedType);
        const normalizedSubtype = this.normalizeAccountSubtype(row.account_subtype);
        const accountCode = String(row.account_code || row.code || row.id || '').trim().toUpperCase();
        const level = Number(row.account_level || this.estimateLevel(accountCode));
        const postingAllowed = this.normalizePostingAllowed(row);
        const currencyBehavior = this.normalizeCurrencyBehavior(row);
        const scopeType = this.normalizeScopeType(row);
        const status = this.normalizeStatus(row);
        return Account_1.Account.rehydrate({
            id: String(row.id),
            companyId: String(row.company_id || 'COMP_01'),
            branchId: row.branch_id ? String(row.branch_id) : null,
            accountCode,
            name: String(row.name || accountCode),
            parentId: row.parent_id ? String(row.parent_id) : null,
            level,
            accountType: normalizedType,
            accountCategory: normalizedCategory,
            accountSubtype: normalizedSubtype,
            postingAllowed,
            currencyBehavior,
            currencyCode: this.normalizeCurrencyCode(row),
            referenceType: this.normalizeReferenceType(row.reference_type, normalizedSubtype),
            scopeType,
            status,
            requiresCostCenter: Number(row.requires_cost_center || 0) === 1,
            requiresAnalysisCode: Number(row.requires_analysis_code || 0) === 1,
        });
    }
    mapDefinitionRow(row) {
        return FinancialDefinition_1.FinancialDefinition.rehydrate({
            id: String(row.id),
            companyId: String(row.company_id),
            branchId: row.branch_id ? String(row.branch_id) : null,
            scopeType: this.normalizeDefinitionScope(row.scope_type),
            scopeId: String(row.scope_id),
            mappingKey: this.normalizeMappingKey(row.mapping_key),
            accountId: String(row.account_id),
            priority: Number(row.priority || 100),
            isActive: Number(row.is_active || 0) === 1,
            validFrom: row.valid_from ? String(row.valid_from) : null,
            validTo: row.valid_to ? String(row.valid_to) : null,
            documentType: this.normalizeDefinitionQualifier(row.document_type),
            lineType: this.normalizeDefinitionQualifier(row.line_type),
            taxProfileId: this.normalizeDefinitionQualifier(row.tax_profile_id),
            updatedAt: row.updated_at ? String(row.updated_at) : null,
        });
    }
    normalizeAccountType(value) {
        const normalized = String(value || '').trim().toUpperCase();
        if (Object.values(AccountType_1.AccountType).includes(normalized)) {
            return normalized;
        }
        if (normalized === 'ASSET')
            return AccountType_1.AccountType.ASSET;
        if (normalized === 'LIABILITY')
            return AccountType_1.AccountType.LIABILITY;
        if (normalized === 'EQUITY')
            return AccountType_1.AccountType.EQUITY;
        if (normalized === 'REVENUE')
            return AccountType_1.AccountType.REVENUE;
        if (normalized === 'EXPENSE')
            return AccountType_1.AccountType.EXPENSE;
        return AccountType_1.AccountType.ASSET;
    }
    normalizeAccountCategory(value, accountType) {
        const normalized = String(value || '').trim().toUpperCase();
        if (Object.values(AccountCategory_1.AccountCategory).includes(normalized)) {
            return normalized;
        }
        return CATEGORY_DEFAULT_BY_TYPE[accountType];
    }
    normalizeAccountSubtype(value) {
        const normalized = String(value || '').trim().toUpperCase();
        if (Object.values(AccountSubtype_1.AccountSubtype).includes(normalized)) {
            return normalized;
        }
        return AccountSubtype_1.AccountSubtype.GENERAL;
    }
    normalizeDefinitionScope(value) {
        const normalized = String(value || '').trim().toUpperCase();
        if (Object.values(FinancialDefinitionScopeType_1.FinancialDefinitionScopeType).includes(normalized)) {
            return normalized;
        }
        return FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.COMPANY;
    }
    normalizeMappingKey(value) {
        const normalized = String(value || '').trim().toUpperCase();
        if (Object.values(AccountMappingKey_1.AccountMappingKey).includes(normalized)) {
            return normalized;
        }
        return AccountMappingKey_1.AccountMappingKey.REVENUE;
    }
    normalizeDefinitionQualifier(value) {
        const normalized = String(value || '').trim().toUpperCase();
        return normalized || null;
    }
    normalizePostingAllowed(row) {
        if (row.posting_allowed !== null && row.posting_allowed !== undefined) {
            return Number(row.posting_allowed) === 1;
        }
        if (row.is_transactional !== null && row.is_transactional !== undefined) {
            return Number(row.is_transactional) === 1;
        }
        if (row.is_group !== null && row.is_group !== undefined) {
            return Number(row.is_group) !== 1;
        }
        return true;
    }
    normalizeCurrencyBehavior(row) {
        const normalized = String(row.currency_behavior || '').trim().toUpperCase();
        if (Object.values(AccountCurrencyBehavior_1.AccountCurrencyBehavior).includes(normalized)) {
            return normalized;
        }
        return this.normalizeCurrencyCode(row) ? AccountCurrencyBehavior_1.AccountCurrencyBehavior.FIXED_CURRENCY : AccountCurrencyBehavior_1.AccountCurrencyBehavior.BASE_ONLY;
    }
    normalizeCurrencyCode(row) {
        const candidate = String(row.currency_code || row.currency || '').trim().toUpperCase();
        return candidate ? candidate : null;
    }
    normalizeReferenceType(value, subtype) {
        const normalized = String(value || '').trim().toUpperCase();
        if (Object.values(AccountReferenceType_1.AccountReferenceType).includes(normalized)) {
            return normalized;
        }
        if (subtype === AccountSubtype_1.AccountSubtype.RECEIVABLE || subtype === AccountSubtype_1.AccountSubtype.PAYABLE) {
            return AccountReferenceType_1.AccountReferenceType.GUIDE;
        }
        if (subtype === AccountSubtype_1.AccountSubtype.BANK) {
            return AccountReferenceType_1.AccountReferenceType.BANK_CHEQUE;
        }
        if (subtype === AccountSubtype_1.AccountSubtype.CASH) {
            return AccountReferenceType_1.AccountReferenceType.USER;
        }
        return AccountReferenceType_1.AccountReferenceType.NONE;
    }
    normalizeScopeType(row) {
        const normalized = String(row.scope_type || '').trim().toUpperCase();
        if (Object.values(AccountScopeType_1.AccountScopeType).includes(normalized)) {
            return normalized;
        }
        return row.branch_id ? AccountScopeType_1.AccountScopeType.BRANCH : AccountScopeType_1.AccountScopeType.COMPANY;
    }
    normalizeStatus(row) {
        const normalized = String(row.status || '').trim().toUpperCase();
        if (normalized === Account_1.AccountStatus.ACTIVE)
            return Account_1.AccountStatus.ACTIVE;
        if (normalized === Account_1.AccountStatus.INACTIVE)
            return Account_1.AccountStatus.INACTIVE;
        return Number(row.is_active || 1) === 1 ? Account_1.AccountStatus.ACTIVE : Account_1.AccountStatus.INACTIVE;
    }
    estimateLevel(accountCode) {
        const code = String(accountCode || '').trim();
        if (!code)
            return 1;
        if (code.includes('.'))
            return code.split('.').length;
        return code.length <= 2 ? 1 : Math.ceil(code.length / 2);
    }
}
exports.SqliteAccountingFoundationRepo = SqliteAccountingFoundationRepo;
