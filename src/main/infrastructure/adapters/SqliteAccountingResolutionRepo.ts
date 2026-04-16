import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../domain/errors';
import { FinancialDefinitionEntity } from '../../domain/accountingResolution/entities/FinancialDefinitionEntity';
import { FinancialAccountRole } from '../../domain/accountingResolution/enums/FinancialAccountRole';
import { FinancialDefinitionOwnerType } from '../../domain/accountingResolution/enums/FinancialDefinitionOwnerType';
import {
    FinancialDefinitionRepositoryPort,
    ResolutionAccountLookup,
    ResolveDefinitionsByOwnersQuery,
} from '../../application/ports/AccountingResolutionPorts';

type FinancialDefinitionRow = {
    id: string;
    company_id: string;
    owner_type: string | null;
    owner_id: string | null;
    account_role: string | null;
    account_id: string;
    notes: string | null;
    is_active: number | null;
    created_at: string | null;
    updated_at: string | null;
    scope_type: string | null;
    scope_id: string | null;
    mapping_key: string | null;
};

type AccountRow = {
    id: string;
    company_id: string | null;
    code: string | null;
    account_code: string | null;
    name: string | null;
    is_posting: number | null;
    posting_allowed: number | null;
    is_transactional: number | null;
    is_active: number | null;
    system_tag: string | null;
    allow_manual_entry: number | null;
};

const OWNER_TYPE_SET = new Set<string>(Object.values(FinancialDefinitionOwnerType));
const ACCOUNT_ROLE_SET = new Set<string>(Object.values(FinancialAccountRole));

const LEGACY_SCOPE_TYPES = new Set<string>([
    FinancialDefinitionOwnerType.COMPANY,
    FinancialDefinitionOwnerType.BRANCH,
    FinancialDefinitionOwnerType.ITEM,
    FinancialDefinitionOwnerType.ITEM_GROUP,
    FinancialDefinitionOwnerType.WAREHOUSE,
    FinancialDefinitionOwnerType.PARTNER,
]);

export class SqliteAccountingResolutionRepo implements FinancialDefinitionRepositoryPort {
    constructor(private readonly db: Database.Database) {
        this.ensureSchema();
    }

    nextIdentity(): string {
        return uuidv4();
    }

    async createFinancialDefinition(definition: FinancialDefinitionEntity): Promise<void> {
        const payload = definition.toJSON();
        const compatibility = this.toLegacyCompatibility(payload.ownerType, payload.ownerId, payload.accountRole);

        this.db
            .prepare(
                `
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
                `,
            )
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

    async updateFinancialDefinition(definition: FinancialDefinitionEntity): Promise<void> {
        const payload = definition.toJSON();
        const compatibility = this.toLegacyCompatibility(payload.ownerType, payload.ownerId, payload.accountRole);

        const info = this.db
            .prepare(
                `
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
                `,
            )
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
            throw new DomainError('ERR_FIN_DEFINITION_NOT_FOUND', `Financial definition ${payload.id} was not found`, {
                messageKey: 'error.financial_definition.not_found',
            });
        }
    }

    async deactivateFinancialDefinition(companyId: string, id: string): Promise<void> {
        this.db
            .prepare(
                `
                UPDATE financial_definitions
                SET is_active = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND id = ?
                `,
            )
            .run(companyId, id);
    }

    async listFinancialDefinitionsByOwner(
        companyId: string,
        ownerType: FinancialDefinitionOwnerType,
        ownerId: string,
        includeInactive: boolean,
    ): Promise<FinancialDefinitionEntity[]> {
        const rows = this.db
            .prepare(
                `
                SELECT *
                FROM financial_definitions
                WHERE company_id = @companyId
                  AND (@includeInactive = 1 OR COALESCE(is_active, 1) = 1)
                  AND UPPER(COALESCE(owner_type, scope_type, 'COMPANY')) = @ownerType
                  AND COALESCE(owner_id, scope_id, 'DEFAULT') = @ownerId
                ORDER BY account_role ASC, updated_at DESC, id DESC
                `,
            )
            .all({
                companyId,
                includeInactive: includeInactive ? 1 : 0,
                ownerType,
                ownerId,
            }) as FinancialDefinitionRow[];
        return rows.map((row) => this.mapDefinitionRow(row));
    }

    async listDefinitionsByCompany(companyId: string, includeInactive: boolean): Promise<FinancialDefinitionEntity[]> {
        const rows = this.db
            .prepare(
                `
                SELECT *
                FROM financial_definitions
                WHERE company_id = @companyId
                  AND (@includeInactive = 1 OR COALESCE(is_active, 1) = 1)
                ORDER BY owner_type ASC, owner_id ASC, account_role ASC, updated_at DESC
                `,
            )
            .all({
                companyId,
                includeInactive: includeInactive ? 1 : 0,
            }) as FinancialDefinitionRow[];
        return rows.map((row) => this.mapDefinitionRow(row));
    }

    async findFinancialDefinition(companyId: string, id: string): Promise<FinancialDefinitionEntity | null> {
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM financial_definitions
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                `,
            )
            .get(companyId, id) as FinancialDefinitionRow | undefined;
        return row ? this.mapDefinitionRow(row) : null;
    }

    async findFinancialDefinitionByOwnerRole(
        companyId: string,
        ownerType: FinancialDefinitionOwnerType,
        ownerId: string,
        accountRole: FinancialAccountRole,
    ): Promise<FinancialDefinitionEntity | null> {
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM financial_definitions
                WHERE company_id = @companyId
                  AND UPPER(COALESCE(owner_type, scope_type, 'COMPANY')) = @ownerType
                  AND COALESCE(owner_id, scope_id, 'DEFAULT') = @ownerId
                  AND UPPER(COALESCE(account_role, '')) = @accountRole
                LIMIT 1
                `,
            )
            .get({
                companyId,
                ownerType,
                ownerId,
                accountRole,
            }) as FinancialDefinitionRow | undefined;
        return row ? this.mapDefinitionRow(row) : null;
    }

    async resolveDefinitionsByOwners(query: ResolveDefinitionsByOwnersQuery): Promise<FinancialDefinitionEntity[]> {
        const accountRoles = Array.from(new Set(query.accountRoles || []));
        if (!accountRoles.length) return [];

        const ownerClauses: string[] = [];
        const params: Array<string | number> = [query.companyId, query.includeInactive ? 1 : 0];

        for (const ownerCandidate of query.owners) {
            const ids = Array.from(new Set(ownerCandidate.ownerIds.filter((id) => String(id || '').trim())));
            if (!ids.length) continue;
            const placeholders = ids.map(() => '?').join(',');
            ownerClauses.push(
                `(UPPER(COALESCE(owner_type, scope_type, 'COMPANY')) = ? AND COALESCE(owner_id, scope_id, 'DEFAULT') IN (${placeholders}))`,
            );
            params.push(ownerCandidate.ownerType, ...ids);
        }

        if (!ownerClauses.length) {
            return [];
        }

        const rows = this.db
            .prepare(
                `
                SELECT *
                FROM financial_definitions
                WHERE company_id = ?
                  AND (? = 1 OR COALESCE(is_active, 1) = 1)
                  AND (${ownerClauses.join(' OR ')})
                ORDER BY updated_at DESC, id DESC
                `,
            )
            .all(...params) as FinancialDefinitionRow[];

        const allowedRoles = new Set(accountRoles);
        return rows
            .map((row) => this.mapDefinitionRow(row))
            .filter((definition) => allowedRoles.has(definition.accountRole));
    }

    async getAccountById(companyId: string, accountId: string): Promise<ResolutionAccountLookup | null> {
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM accounts
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND id = ?
                LIMIT 1
                `,
            )
            .get(companyId, accountId) as AccountRow | undefined;
        return row ? this.mapAccountRow(row) : null;
    }

    async getAccountsByIds(companyId: string, accountIds: string[]): Promise<ResolutionAccountLookup[]> {
        if (!accountIds.length) return [];
        const placeholders = accountIds.map(() => '?').join(',');
        const rows = this.db
            .prepare(
                `
                SELECT *
                FROM accounts
                WHERE COALESCE(company_id, 'COMP_01') = ?
                  AND id IN (${placeholders})
                `,
            )
            .all(companyId, ...accountIds) as AccountRow[];
        return rows.map((row) => this.mapAccountRow(row));
    }

    private mapDefinitionRow(row: FinancialDefinitionRow): FinancialDefinitionEntity {
        const ownerType = this.normalizeOwnerType(row.owner_type || row.scope_type);
        const ownerId = String(row.owner_id || row.scope_id || 'DEFAULT').trim() || 'DEFAULT';
        const accountRole = this.normalizeAccountRole(row.account_role, row.mapping_key);

        return FinancialDefinitionEntity.rehydrate({
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

    private mapAccountRow(row: AccountRow): ResolutionAccountLookup {
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

    private normalizeIsPosting(row: AccountRow): boolean {
        if (row.is_posting !== null && row.is_posting !== undefined) return Number(row.is_posting) === 1;
        if (row.posting_allowed !== null && row.posting_allowed !== undefined) return Number(row.posting_allowed) === 1;
        if (row.is_transactional !== null && row.is_transactional !== undefined) return Number(row.is_transactional) === 1;
        return true;
    }

    private normalizeOwnerType(value: string | null): FinancialDefinitionOwnerType {
        const normalized = String(value || '').trim().toUpperCase();
        if (OWNER_TYPE_SET.has(normalized)) {
            return normalized as FinancialDefinitionOwnerType;
        }
        return FinancialDefinitionOwnerType.COMPANY;
    }

    private normalizeAccountRole(value: string | null, mappingKey: string | null): FinancialAccountRole {
        const normalized = String(value || '').trim().toUpperCase();
        if (ACCOUNT_ROLE_SET.has(normalized)) {
            return normalized as FinancialAccountRole;
        }
        return this.legacyMappingKeyToRole(mappingKey);
    }

    private legacyMappingKeyToRole(mappingKey: string | null): FinancialAccountRole {
        const normalized = String(mappingKey || '').trim().toUpperCase();
        switch (normalized) {
            case 'RECEIVABLE':
                return FinancialAccountRole.RECEIVABLE_ACCOUNT;
            case 'PAYABLE':
                return FinancialAccountRole.PAYABLE_ACCOUNT;
            case 'REVENUE':
                return FinancialAccountRole.REVENUE_ACCOUNT;
            case 'EXPENSE':
                return FinancialAccountRole.EXPENSE_ACCOUNT;
            case 'INVENTORY':
                return FinancialAccountRole.INVENTORY_ACCOUNT;
            case 'COGS':
                return FinancialAccountRole.COGS_ACCOUNT;
            case 'TAX_PAYABLE':
                return FinancialAccountRole.VAT_OUTPUT_ACCOUNT;
            case 'TAX_RECEIVABLE':
                return FinancialAccountRole.VAT_INPUT_ACCOUNT;
            case 'DISCOUNT':
                return FinancialAccountRole.SALES_DISCOUNT_ACCOUNT;
            case 'ROUNDING':
                return FinancialAccountRole.ROUNDING_ACCOUNT;
            default:
                return FinancialAccountRole.SUSPENSE_ACCOUNT;
        }
    }

    private roleToLegacyMappingKey(role: FinancialAccountRole): string {
        switch (role) {
            case FinancialAccountRole.RECEIVABLE_ACCOUNT:
                return 'RECEIVABLE';
            case FinancialAccountRole.PAYABLE_ACCOUNT:
                return 'PAYABLE';
            case FinancialAccountRole.REVENUE_ACCOUNT:
            case FinancialAccountRole.SERVICE_REVENUE_ACCOUNT:
                return 'REVENUE';
            case FinancialAccountRole.COGS_ACCOUNT:
                return 'COGS';
            case FinancialAccountRole.VAT_INPUT_ACCOUNT:
                return 'TAX_RECEIVABLE';
            case FinancialAccountRole.VAT_OUTPUT_ACCOUNT:
            case FinancialAccountRole.WITHHOLDING_TAX_ACCOUNT:
                return 'TAX_PAYABLE';
            case FinancialAccountRole.SALES_DISCOUNT_ACCOUNT:
            case FinancialAccountRole.PURCHASE_DISCOUNT_ACCOUNT:
                return 'DISCOUNT';
            case FinancialAccountRole.ROUNDING_ACCOUNT:
                return 'ROUNDING';
            case FinancialAccountRole.INVENTORY_ACCOUNT:
            case FinancialAccountRole.RAW_MATERIAL_INVENTORY_ACCOUNT:
            case FinancialAccountRole.WIP_INVENTORY_ACCOUNT:
            case FinancialAccountRole.FINISHED_GOODS_INVENTORY_ACCOUNT:
            case FinancialAccountRole.MERCHANDISE_INVENTORY_ACCOUNT:
                return 'INVENTORY';
            case FinancialAccountRole.CASH_ACCOUNT:
            case FinancialAccountRole.BANK_ACCOUNT:
            case FinancialAccountRole.CHEQUE_IN_SAFE_ACCOUNT:
            case FinancialAccountRole.CHEQUES_DEPOSITED_ACCOUNT:
            case FinancialAccountRole.RETURNED_CHEQUE_ACCOUNT:
            case FinancialAccountRole.ISSUED_CHEQUE_ACCOUNT:
            case FinancialAccountRole.BANK_CLEARING_ACCOUNT:
                return 'EXPENSE';
            default:
                return 'EXPENSE';
        }
    }

    private toLegacyCompatibility(
        ownerType: FinancialDefinitionOwnerType,
        ownerId: string,
        accountRole: FinancialAccountRole,
    ): { scopeType: string; scopeId: string; mappingKey: string } {
        const scopeType = LEGACY_SCOPE_TYPES.has(ownerType) ? ownerType : FinancialDefinitionOwnerType.COMPANY;
        const scopeId = LEGACY_SCOPE_TYPES.has(ownerType)
            ? ownerId
            : ownerType === FinancialDefinitionOwnerType.TAX_PROFILE
                ? `__TAX_PROFILE__:${ownerId}`
                : `__DOC_DEFAULT__:${ownerId}`;
        const mappingKey = this.roleToLegacyMappingKey(accountRole);
        return { scopeType, scopeId, mappingKey };
    }

    private ensureSchema(): void {
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
        } catch (error: any) {
            console.warn('[SqliteAccountingResolutionRepo] Could not create unique owner-role index:', error?.message || error);
        }
    }

    private safeAddColumn(columnName: string, ddl: string): void {
        const exists = this.db
            .prepare('PRAGMA table_info(financial_definitions)')
            .all()
            .some((column: { name: string }) => column.name === columnName);
        if (!exists) {
            this.db.prepare(`ALTER TABLE financial_definitions ADD COLUMN ${columnName} ${ddl}`).run();
        }
    }
}
