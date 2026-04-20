"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteAccountingResolutionRepo = void 0;
const uuid_1 = require("uuid");
const errors_1 = require("../../domain/errors");
const FinancialDefinitionEntity_1 = require("../../domain/accountingResolution/entities/FinancialDefinitionEntity");
const FinancialAccountRole_1 = require("../../domain/accountingResolution/enums/FinancialAccountRole");
const FinancialDefinitionOwnerType_1 = require("../../domain/accountingResolution/enums/FinancialDefinitionOwnerType");
const OWNER_TYPE_SET = new Set(Object.values(FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType));
const ACCOUNT_ROLE_SET = new Set(Object.values(FinancialAccountRole_1.FinancialAccountRole));
const LEGACY_SCOPE_TYPES = new Set([
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.BRANCH,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.ITEM,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.ITEM_GROUP,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.WAREHOUSE,
    FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.PARTNER,
]);
class SqliteAccountingResolutionRepo {
    constructor(db) {
        this.db = db;
        this.ensureSchema();
    }
    nextIdentity() {
        return (0, uuid_1.v4)();
    }
    async createFinancialDefinition(definition) {
        const payload = definition.toJSON();
        const compatibility = this.toLegacyCompatibility(payload.ownerType, payload.ownerId, payload.accountRole);
        this.db
            .prepare(`
                INSERT INTO financial_definitions (
                    id,
                    company_id,
                    owner_type,
                    owner_id,
                    account_role,
                    account_id,
                    notes,
                    is_active,
                    created_at,
                    updated_at,
                    scope_type,
                    scope_id,
                    mapping_key,
                    priority
                ) VALUES (
                    @id,
                    @companyId,
                    @ownerType,
                    @ownerId,
                    @accountRole,
                    @accountId,
                    @notes,
                    @isActive,
                    COALESCE(@createdAt, CURRENT_TIMESTAMP),
                    COALESCE(@updatedAt, CURRENT_TIMESTAMP),
                    @scopeType,
                    @scopeId,
                    @mappingKey,
                    100
                )
                `)
            .run({
            id: payload.id,
            companyId: payload.companyId,
            ownerType: payload.ownerType,
            ownerId: payload.ownerId,
            accountRole: payload.accountRole,
            accountId: payload.accountId,
            notes: payload.notes,
            isActive: payload.isActive ? 1 : 0,
            createdAt: payload.createdAt || null,
            updatedAt: payload.updatedAt || null,
            scopeType: compatibility.scopeType,
            scopeId: compatibility.scopeId,
            mappingKey: compatibility.mappingKey,
        });
    }
    async updateFinancialDefinition(definition) {
        const payload = definition.toJSON();
        const compatibility = this.toLegacyCompatibility(payload.ownerType, payload.ownerId, payload.accountRole);
        const info = this.db
            .prepare(`
                UPDATE financial_definitions
                SET
                    owner_type = @ownerType,
                    owner_id = @ownerId,
                    account_role = @accountRole,
                    account_id = @accountId,
                    notes = @notes,
                    is_active = @isActive,
                    updated_at = CURRENT_TIMESTAMP,
                    scope_type = @scopeType,
                    scope_id = @scopeId,
                    mapping_key = @mappingKey
                WHERE company_id = @companyId
                  AND id = @id
                `)
            .run({
            id: payload.id,
            companyId: payload.companyId,
            ownerType: payload.ownerType,
            ownerId: payload.ownerId,
            accountRole: payload.accountRole,
            accountId: payload.accountId,
            notes: payload.notes,
            isActive: payload.isActive ? 1 : 0,
            scopeType: compatibility.scopeType,
            scopeId: compatibility.scopeId,
            mappingKey: compatibility.mappingKey,
        });
        if (info.changes === 0) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_NOT_FOUND', `Financial definition ${payload.id} was not found`, {
                messageKey: 'error.financial_definition.not_found',
            });
        }
    }
    async deactivateFinancialDefinition(companyId, id) {
        this.db
            .prepare(`
                UPDATE financial_definitions
                SET is_active = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND id = ?
                `)
            .run(companyId, id);
    }
    async listFinancialDefinitionsByOwner(companyId, ownerType, ownerId, includeInactive) {
        const rows = this.db
            .prepare(`
                SELECT *
                FROM financial_definitions
                WHERE company_id = @companyId
                  AND (@includeInactive = 1 OR COALESCE(is_active, 1) = 1)
                  AND UPPER(COALESCE(owner_type, scope_type, 'COMPANY')) = @ownerType
                  AND COALESCE(owner_id, scope_id, 'DEFAULT') = @ownerId
                ORDER BY account_role ASC, updated_at DESC, id DESC
                `)
            .all({
            companyId,
            includeInactive: includeInactive ? 1 : 0,
            ownerType,
            ownerId,
        });
        return rows.map((row) => this.mapDefinitionRow(row));
    }
    async listDefinitionsByCompany(companyId, includeInactive) {
        const rows = this.db
            .prepare(`
                SELECT *
                FROM financial_definitions
                WHERE company_id = @companyId
                  AND (@includeInactive = 1 OR COALESCE(is_active, 1) = 1)
                ORDER BY owner_type ASC, owner_id ASC, account_role ASC, updated_at DESC
                `)
            .all({
            companyId,
            includeInactive: includeInactive ? 1 : 0,
        });
        return rows.map((row) => this.mapDefinitionRow(row));
    }
    async findFinancialDefinition(companyId, id) {
        const row = this.db
            .prepare(`
                SELECT *
                FROM financial_definitions
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                `)
            .get(companyId, id);
        return row ? this.mapDefinitionRow(row) : null;
    }
    async findFinancialDefinitionByOwnerRole(companyId, ownerType, ownerId, accountRole) {
        const row = this.db
            .prepare(`
                SELECT *
                FROM financial_definitions
                WHERE company_id = @companyId
                  AND UPPER(COALESCE(owner_type, scope_type, 'COMPANY')) = @ownerType
                  AND COALESCE(owner_id, scope_id, 'DEFAULT') = @ownerId
                  AND UPPER(COALESCE(account_role, '')) = @accountRole
                LIMIT 1
                `)
            .get({
            companyId,
            ownerType,
            ownerId,
            accountRole,
        });
        return row ? this.mapDefinitionRow(row) : null;
    }
    async resolveDefinitionsByOwners(query) {
        const accountRoles = Array.from(new Set(query.accountRoles || []));
        if (!accountRoles.length)
            return [];
        const ownerClauses = [];
        const params = [query.companyId, query.includeInactive ? 1 : 0];
        for (const ownerCandidate of query.owners) {
            const ids = Array.from(new Set(ownerCandidate.ownerIds.filter((id) => String(id || '').trim())));
            if (!ids.length)
                continue;
            const placeholders = ids.map(() => '?').join(',');
            ownerClauses.push(`(UPPER(COALESCE(owner_type, scope_type, 'COMPANY')) = ? AND COALESCE(owner_id, scope_id, 'DEFAULT') IN (${placeholders}))`);
            params.push(ownerCandidate.ownerType, ...ids);
        }
        if (!ownerClauses.length) {
            return [];
        }
        const rows = this.db
            .prepare(`
                SELECT *
                FROM financial_definitions
                WHERE company_id = ?
                  AND (? = 1 OR COALESCE(is_active, 1) = 1)
                  AND (${ownerClauses.join(' OR ')})
                ORDER BY updated_at DESC, id DESC
                `)
            .all(...params);
        const allowedRoles = new Set(accountRoles);
        return rows
            .map((row) => this.mapDefinitionRow(row))
            .filter((definition) => allowedRoles.has(definition.accountRole));
    }
    async getAccountById(companyId, accountId) {
        const row = this.db
            .prepare(`
                SELECT *
                FROM accounts
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND id = ?
                LIMIT 1
                `)
            .get(companyId, accountId);
        return row ? this.mapAccountRow(row) : null;
    }
    async getAccountsByIds(companyId, accountIds) {
        if (!accountIds.length)
            return [];
        const placeholders = accountIds.map(() => '?').join(',');
        const rows = this.db
            .prepare(`
                SELECT *
                FROM accounts
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND id IN (${placeholders})
                `)
            .all(companyId, ...accountIds);
        return rows.map((row) => this.mapAccountRow(row));
    }
    mapDefinitionRow(row) {
        const ownerType = this.normalizeOwnerType(row.owner_type || row.scope_type);
        const ownerId = String(row.owner_id || row.scope_id || 'DEFAULT').trim() || 'DEFAULT';
        const accountRole = this.normalizeAccountRole(row.account_role, row.mapping_key);
        return FinancialDefinitionEntity_1.FinancialDefinitionEntity.rehydrate({
            id: String(row.id),
            companyId: String(row.company_id),
            ownerType,
            ownerId,
            accountRole,
            accountId: String(row.account_id),
            notes: row.notes ? String(row.notes) : null,
            isActive: Number(row.is_active ?? 1) === 1,
            createdAt: String(row.created_at || ''),
            updatedAt: String(row.updated_at || ''),
        });
    }
    mapAccountRow(row) {
        return {
            id: String(row.id),
            companyId: String(row.company_id || 'COMP_01'),
            code: String(row.code || row.account_code || '').trim(),
            name: String(row.name || '').trim(),
            isPosting: this.normalizeIsPosting(row),
            isActive: Number(row.is_active ?? 1) === 1,
            systemTag: row.system_tag ? String(row.system_tag).trim().toUpperCase() : null,
            allowManualEntry: Number(row.allow_manual_entry ?? 1) === 1,
        };
    }
    normalizeIsPosting(row) {
        if (row.is_posting !== null && row.is_posting !== undefined)
            return Number(row.is_posting) === 1;
        if (row.posting_allowed !== null && row.posting_allowed !== undefined)
            return Number(row.posting_allowed) === 1;
        if (row.is_transactional !== null && row.is_transactional !== undefined)
            return Number(row.is_transactional) === 1;
        return true;
    }
    normalizeOwnerType(value) {
        const normalized = String(value || '').trim().toUpperCase();
        if (OWNER_TYPE_SET.has(normalized)) {
            return normalized;
        }
        return FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY;
    }
    normalizeAccountRole(value, mappingKey) {
        const normalized = String(value || '').trim().toUpperCase();
        if (ACCOUNT_ROLE_SET.has(normalized)) {
            return normalized;
        }
        return this.legacyMappingKeyToRole(mappingKey);
    }
    legacyMappingKeyToRole(mappingKey) {
        const normalized = String(mappingKey || '').trim().toUpperCase();
        switch (normalized) {
            case 'RECEIVABLE':
                return FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT;
            case 'PAYABLE':
                return FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT;
            case 'REVENUE':
                return FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT;
            case 'EXPENSE':
                return FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT;
            case 'INVENTORY':
                return FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT;
            case 'COGS':
                return FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT;
            case 'TAX_PAYABLE':
                return FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT;
            case 'TAX_RECEIVABLE':
                return FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT;
            case 'DISCOUNT':
                return FinancialAccountRole_1.FinancialAccountRole.SALES_DISCOUNT_ACCOUNT;
            case 'ROUNDING':
                return FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT;
            default:
                return FinancialAccountRole_1.FinancialAccountRole.SUSPENSE_ACCOUNT;
        }
    }
    roleToLegacyMappingKey(role) {
        switch (role) {
            case FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT:
                return 'RECEIVABLE';
            case FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT:
                return 'PAYABLE';
            case FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT:
                return 'REVENUE';
            case FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT:
                return 'COGS';
            case FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT:
                return 'TAX_RECEIVABLE';
            case FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.WITHHOLDING_TAX_ACCOUNT:
                return 'TAX_PAYABLE';
            case FinancialAccountRole_1.FinancialAccountRole.SALES_DISCOUNT_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.PURCHASE_DISCOUNT_ACCOUNT:
                return 'DISCOUNT';
            case FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT:
                return 'ROUNDING';
            case FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.RAW_MATERIAL_INVENTORY_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.WIP_INVENTORY_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.FINISHED_GOODS_INVENTORY_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.MERCHANDISE_INVENTORY_ACCOUNT:
                return 'INVENTORY';
            case FinancialAccountRole_1.FinancialAccountRole.CASH_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.BANK_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.CHEQUE_IN_SAFE_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.CHEQUES_DEPOSITED_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.RETURNED_CHEQUE_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.ISSUED_CHEQUE_ACCOUNT:
            case FinancialAccountRole_1.FinancialAccountRole.BANK_CLEARING_ACCOUNT:
                return 'EXPENSE';
            default:
                return 'EXPENSE';
        }
    }
    toLegacyCompatibility(ownerType, ownerId, accountRole) {
        const scopeType = LEGACY_SCOPE_TYPES.has(ownerType) ? ownerType : FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY;
        const scopeId = LEGACY_SCOPE_TYPES.has(ownerType)
            ? ownerId
            : ownerType === FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.TAX_PROFILE
                ? `__TAX_PROFILE__:${ownerId}`
                : `__DOC_DEFAULT__:${ownerId}`;
        const mappingKey = this.roleToLegacyMappingKey(accountRole);
        return { scopeType, scopeId, mappingKey };
    }
    ensureSchema() {
        this.safeAddColumn('owner_type', 'TEXT');
        this.safeAddColumn('owner_id', 'TEXT');
        this.safeAddColumn('account_role', 'TEXT');
        this.safeAddColumn('notes', 'TEXT');
        this.db.exec(`
            UPDATE financial_definitions
            SET owner_type = COALESCE(NULLIF(owner_type, ''), NULLIF(scope_type, ''), 'COMPANY');

            UPDATE financial_definitions
            SET owner_id = COALESCE(NULLIF(owner_id, ''), NULLIF(scope_id, ''), 'DEFAULT');

            UPDATE financial_definitions
            SET account_role = COALESCE(
                NULLIF(account_role, ''),
                CASE UPPER(COALESCE(mapping_key, ''))
                    WHEN 'RECEIVABLE' THEN 'RECEIVABLE_ACCOUNT'
                    WHEN 'PAYABLE' THEN 'PAYABLE_ACCOUNT'
                    WHEN 'REVENUE' THEN 'REVENUE_ACCOUNT'
                    WHEN 'EXPENSE' THEN 'EXPENSE_ACCOUNT'
                    WHEN 'INVENTORY' THEN 'INVENTORY_ACCOUNT'
                    WHEN 'COGS' THEN 'COGS_ACCOUNT'
                    WHEN 'TAX_PAYABLE' THEN 'VAT_OUTPUT_ACCOUNT'
                    WHEN 'TAX_RECEIVABLE' THEN 'VAT_INPUT_ACCOUNT'
                    WHEN 'DISCOUNT' THEN 'SALES_DISCOUNT_ACCOUNT'
                    WHEN 'ROUNDING' THEN 'ROUNDING_ACCOUNT'
                    ELSE 'SUSPENSE_ACCOUNT'
                END
            );

            DELETE FROM financial_definitions
            WHERE id IN (
                SELECT id
                FROM (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY company_id, owner_type, owner_id, account_role
                            ORDER BY COALESCE(is_active, 1) DESC, COALESCE(updated_at, created_at, '') DESC, id DESC
                        ) AS rn
                    FROM financial_definitions
                ) ranked
                WHERE ranked.rn > 1
            );

            CREATE INDEX IF NOT EXISTS idx_fin_defs_company_v56
            ON financial_definitions(company_id);

            CREATE INDEX IF NOT EXISTS idx_fin_defs_owner_v56
            ON financial_definitions(company_id, owner_type, owner_id);

            CREATE INDEX IF NOT EXISTS idx_fin_defs_role_v56
            ON financial_definitions(company_id, account_role);

            CREATE INDEX IF NOT EXISTS idx_fin_defs_account_v56
            ON financial_definitions(company_id, account_id);
        `);
        try {
            this.db.exec(`
                CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_defs_company_owner_role_v56
                ON financial_definitions(company_id, owner_type, owner_id, account_role);
            `);
        }
        catch (error) {
            console.warn('[SqliteAccountingResolutionRepo] Could not create unique owner-role index:', error?.message || error);
        }
    }
    safeAddColumn(columnName, ddl) {
        const exists = this.db
            .prepare('PRAGMA table_info(financial_definitions)')
            .all()
            .some((column) => column.name === columnName);
        if (!exists) {
            this.db.prepare(`ALTER TABLE financial_definitions ADD COLUMN ${columnName} ${ddl}`).run();
        }
    }
}
exports.SqliteAccountingResolutionRepo = SqliteAccountingResolutionRepo;
