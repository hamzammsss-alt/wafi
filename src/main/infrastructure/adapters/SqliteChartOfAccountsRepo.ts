import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../domain/errors';
import { AccountEntity } from '../../domain/chartOfAccounts/entities/AccountEntity';
import { AccountCategory } from '../../domain/chartOfAccounts/enums/AccountCategory';
import { AccountSubtype } from '../../domain/chartOfAccounts/enums/AccountSubtype';
import { NormalBalance } from '../../domain/chartOfAccounts/enums/NormalBalance';
import { SeedAccount } from '../../domain/chartOfAccounts/types/SeedAccount';
import {
    AccountListQuery,
    AccountTreeNodeEntity,
    ChartOfAccountsRepositoryPort,
    SeedDefaultChartResult,
} from '../../application/ports/ChartOfAccountsPorts';
import { SeedDuplicateStrategy } from '../../application/dtos/ChartOfAccountsDtos';

type AccountRow = {
    id: string;
    company_id: string | null;
    code: string | null;
    account_code: string | null;
    name: string | null;
    category: string | null;
    account_category: string | null;
    subtype: string | null;
    account_subtype: string | null;
    parent_id: string | null;
    is_posting: number | null;
    posting_allowed: number | null;
    is_transactional: number | null;
    normal_balance: string | null;
    system_tag: string | null;
    allow_manual_entry: number | null;
    is_active: number | null;
    level: number | null;
    account_level: number | null;
    path: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type SeedResolvedParent = {
    id: string;
    level: number;
    path: string;
    category: AccountCategory;
    isPosting: boolean;
};

const LEGACY_DUPLICATE_ACCOUNT_CODES = new Set([
    '1110',
    '112001',
    '1200',
    '1300',
    '2300',
    '4406',
    '5000',
    '6000',
    'ACC-DEMO-CASH',
    'ACC-DEMO-REV',
    'ACC-DEMO-EXP',
    'ACC-DEMO-AR',
    'ACC-DEMO-AP',
]);

export class SqliteChartOfAccountsRepo implements ChartOfAccountsRepositoryPort {
    constructor(private readonly db: Database.Database) {
        this.ensureSchema();
        this.cleanupLegacyDuplicateAccounts();
    }

    nextIdentity(): string {
        return uuidv4();
    }

    async createAccount(account: AccountEntity): Promise<void> {
        this.insertAccount(account);
    }

    async updateAccount(account: AccountEntity): Promise<void> {
        const payload = account.toJSON();
        const info = this.db
            .prepare(
                `
                UPDATE accounts
                SET
                    code = @code,
                    account_code = @code,
                    name = @name,
                    category = @category,
                    account_category = @category,
                    subtype = @subtype,
                    account_subtype = @subtype,
                    parent_id = @parentId,
                    is_posting = @isPosting,
                    posting_allowed = @isPosting,
                    is_transactional = @isPosting,
                    is_group = @isGroup,
                    normal_balance = @normalBalance,
                    system_tag = @systemTag,
                    allow_manual_entry = @allowManualEntry,
                    is_active = @isActive,
                    status = @status,
                    level = @level,
                    account_level = @level,
                    path = @path,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = @companyId
                  AND id = @id
                `,
            )
            .run({
                id: payload.id,
                companyId: payload.companyId,
                code: payload.code,
                name: payload.name,
                category: payload.category,
                subtype: payload.subtype,
                parentId: payload.parentId,
                isPosting: payload.isPosting ? 1 : 0,
                isGroup: payload.isPosting ? 0 : 1,
                normalBalance: payload.normalBalance,
                systemTag: payload.systemTag,
                allowManualEntry: payload.allowManualEntry ? 1 : 0,
                isActive: payload.isActive ? 1 : 0,
                status: payload.isActive ? 'ACTIVE' : 'INACTIVE',
                level: payload.level,
                path: payload.path,
            });
        if (info.changes === 0) {
            throw new DomainError('ERR_ACCOUNT_NOT_FOUND', `Account ${payload.id} was not found`, {
                messageKey: 'error.account.not_found',
            });
        }
    }

    async findById(companyId: string, id: string): Promise<AccountEntity | null> {
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM accounts
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                `,
            )
            .get(companyId, id) as AccountRow | undefined;
        return row ? this.mapAccountRow(row) : null;
    }

    async findByCode(companyId: string, code: string): Promise<AccountEntity | null> {
        const normalizedCode = String(code || '').trim();
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM accounts
                WHERE company_id = ?
                  AND UPPER(COALESCE(code, account_code, '')) = UPPER(?)
                LIMIT 1
                `,
            )
            .get(companyId, normalizedCode) as AccountRow | undefined;
        return row ? this.mapAccountRow(row) : null;
    }

    async findBySystemTag(companyId: string, systemTag: string): Promise<AccountEntity | null> {
        const normalizedTag = String(systemTag || '').trim().toUpperCase();
        if (!normalizedTag) {
            return null;
        }
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM accounts
                WHERE company_id = ?
                  AND UPPER(COALESCE(system_tag, '')) = ?
                LIMIT 1
                `,
            )
            .get(companyId, normalizedTag) as AccountRow | undefined;
        return row ? this.mapAccountRow(row) : null;
    }

    async hasChildren(companyId: string, accountId: string): Promise<boolean> {
        const row = this.db
            .prepare(
                `
                SELECT 1 as ok
                FROM accounts
                WHERE company_id = ?
                  AND parent_id = ?
                LIMIT 1
                `,
            )
            .get(companyId, accountId) as { ok: number } | undefined;
        return Boolean(row?.ok);
    }

    async listFlatAccounts(companyId: string, query: AccountListQuery): Promise<AccountEntity[]> {
        const searchText = query.search ? `%${query.search.trim().toUpperCase()}%` : null;
        const rows = this.db
            .prepare(
                `
                SELECT *
                FROM accounts
                WHERE company_id = @companyId
                  AND (@includeInactive = 1 OR COALESCE(is_active, 1) = 1)
                  AND (@category IS NULL OR UPPER(COALESCE(category, account_category, '')) = @category)
                  AND (
                    @posting = 'ALL'
                    OR (@posting = 'POSTING' AND COALESCE(is_posting, posting_allowed, is_transactional, 1) = 1)
                    OR (@posting = 'HEADER' AND COALESCE(is_posting, posting_allowed, is_transactional, 1) = 0)
                  )
                  AND (
                    @searchText IS NULL
                    OR UPPER(COALESCE(code, account_code, '')) LIKE @searchText
                    OR UPPER(COALESCE(name, '')) LIKE @searchText
                  )
                ORDER BY
                    COALESCE(path, UPPER(COALESCE(code, account_code, id))) ASC,
                    UPPER(COALESCE(code, account_code, id)) ASC
                `,
            )
            .all({
                companyId,
                includeInactive: query.includeInactive ? 1 : 0,
                category: query.category || null,
                posting: query.posting,
                searchText,
            }) as AccountRow[];
        return rows
            .filter((row) => !this.shouldHideLegacyDuplicateAccount(row))
            .map((row) => this.mapAccountRow(row));
    }

    async listAccountTree(companyId: string, query: AccountListQuery): Promise<AccountTreeNodeEntity[]> {
        const accounts = await this.listFlatAccounts(companyId, query);
        const map = new Map<string, AccountTreeNodeEntity>();
        const roots: AccountTreeNodeEntity[] = [];

        for (const account of accounts) {
            map.set(account.id, {
                account,
                children: [],
            });
        }

        for (const account of accounts) {
            const node = map.get(account.id);
            if (!node) continue;

            if (!account.parentId) {
                roots.push(node);
                continue;
            }

            const parentNode = map.get(account.parentId);
            if (!parentNode) {
                roots.push(node);
                continue;
            }

            parentNode.children.push(node);
        }

        const sortTree = (nodes: AccountTreeNodeEntity[]): void => {
            nodes.sort((a, b) => a.account.code.localeCompare(b.account.code));
            for (const node of nodes) {
                sortTree(node.children);
            }
        };
        sortTree(roots);

        return roots;
    }

    async seedDefaultChartOfAccounts(
        companyId: string,
        seed: SeedAccount[],
        strategy: SeedDuplicateStrategy,
    ): Promise<SeedDefaultChartResult> {
        const byCode = new Map<string, SeedAccount>();
        for (const seedAccount of seed) {
            byCode.set(seedAccount.code, seedAccount);
        }

        const depthCache = new Map<string, number>();
        const getDepth = (code: string): number => {
            if (depthCache.has(code)) {
                return depthCache.get(code) || 1;
            }
            const current = byCode.get(code);
            if (!current || !current.parentCode) {
                depthCache.set(code, 1);
                return 1;
            }
            const parentDepth = getDepth(current.parentCode);
            const resolvedDepth = parentDepth + 1;
            depthCache.set(code, resolvedDepth);
            return resolvedDepth;
        };

        const ordered = [...seed].sort((a, b) => {
            const byDepth = getDepth(a.code) - getDepth(b.code);
            if (byDepth !== 0) return byDepth;
            return a.code.localeCompare(b.code);
        });

        const runSeed = this.db.transaction((): SeedDefaultChartResult => {
            let inserted = 0;
            let skipped = 0;
            const parentCache = new Map<string, SeedResolvedParent>();

            for (const seedAccount of ordered) {
                const existing = this.findByCodeSync(companyId, seedAccount.code);
                if (existing) {
                    if (strategy === 'fail') {
                        throw new DomainError(
                            'ERR_ACCOUNT_CODE_DUPLICATE',
                            `Account code ${seedAccount.code} already exists`,
                            {
                                messageKey: 'error.account.code.duplicate',
                                details: { code: seedAccount.code },
                            },
                        );
                    }
                    skipped += 1;
                    parentCache.set(seedAccount.code, {
                        id: existing.id,
                        level: existing.level,
                        path: existing.path,
                        category: existing.category,
                        isPosting: existing.isPosting,
                    });
                    continue;
                }

                const resolvedParent = this.resolveParentForSeed(companyId, seedAccount, parentCache);
                const level = resolvedParent ? resolvedParent.level + 1 : 1;
                const path = resolvedParent ? `${resolvedParent.path}/${seedAccount.code}` : seedAccount.code;

                const entity = AccountEntity.create({
                    id: this.nextIdentity(),
                    companyId,
                    code: seedAccount.code,
                    name: seedAccount.name,
                    category: seedAccount.category,
                    subtype: seedAccount.subtype,
                    parentId: resolvedParent?.id || null,
                    isPosting: seedAccount.isPosting,
                    normalBalance: seedAccount.normalBalance,
                    systemTag: seedAccount.systemTag,
                    allowManualEntry: seedAccount.allowManualEntry,
                    isActive: seedAccount.isActive,
                    level,
                    path,
                });

                this.insertAccount(entity);
                inserted += 1;

                parentCache.set(seedAccount.code, {
                    id: entity.id,
                    level: entity.level,
                    path: entity.path,
                    category: entity.category,
                    isPosting: entity.isPosting,
                });
            }

            return {
                inserted,
                skipped,
                total: seed.length,
            };
        });

        return runSeed();
    }

    private resolveParentForSeed(
        companyId: string,
        seedAccount: SeedAccount,
        parentCache: Map<string, SeedResolvedParent>,
    ): SeedResolvedParent | null {
        if (!seedAccount.parentCode) return null;

        const cached = parentCache.get(seedAccount.parentCode);
        const parent = cached || (() => {
            const dbParent = this.findByCodeSync(companyId, seedAccount.parentCode as string);
            if (!dbParent) {
                return null;
            }
            return {
                id: dbParent.id,
                level: dbParent.level,
                path: dbParent.path,
                category: dbParent.category,
                isPosting: dbParent.isPosting,
            } as SeedResolvedParent;
        })();

        if (!parent) {
            throw new DomainError(
                'ERR_ACCOUNT_PARENT_NOT_FOUND',
                `Parent account ${seedAccount.parentCode} was not found`,
                {
                    messageKey: 'error.account.parent.not_found',
                    details: { parentCode: seedAccount.parentCode, code: seedAccount.code },
                },
            );
        }

        if (parent.isPosting) {
            throw new DomainError(
                'ERR_ACCOUNT_PARENT_IS_POSTING',
                `Parent account ${seedAccount.parentCode} is posting and cannot have children`,
                {
                    messageKey: 'error.account.parent.is_posting',
                    details: { parentCode: seedAccount.parentCode },
                },
            );
        }

        if (parent.category !== seedAccount.category) {
            throw new DomainError(
                'ERR_ACCOUNT_CATEGORY_INCOMPATIBLE',
                `Parent category ${parent.category} is not compatible with child category ${seedAccount.category}`,
                {
                    messageKey: 'error.account.category.incompatible',
                    details: {
                        parentCode: seedAccount.parentCode,
                        parentCategory: parent.category,
                        childCode: seedAccount.code,
                        childCategory: seedAccount.category,
                    },
                },
            );
        }

        return parent;
    }

    private findByCodeSync(companyId: string, code: string): AccountEntity | null {
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM accounts
                WHERE company_id = ?
                  AND UPPER(COALESCE(code, account_code, '')) = UPPER(?)
                LIMIT 1
                `,
            )
            .get(companyId, code) as AccountRow | undefined;
        return row ? this.mapAccountRow(row) : null;
    }

    private insertAccount(account: AccountEntity): void {
        const payload = account.toJSON();
        try {
            this.db
                .prepare(
                    `
                    INSERT INTO accounts (
                        id,
                        company_id,
                        code,
                        account_code,
                        name,
                        category,
                        account_category,
                        subtype,
                        account_subtype,
                        parent_id,
                        is_posting,
                        posting_allowed,
                        is_transactional,
                        is_group,
                        normal_balance,
                        system_tag,
                        allow_manual_entry,
                        is_active,
                        status,
                        level,
                        account_level,
                        path,
                        created_at,
                        updated_at
                    ) VALUES (
                        @id,
                        @companyId,
                        @code,
                        @code,
                        @name,
                        @category,
                        @category,
                        @subtype,
                        @subtype,
                        @parentId,
                        @isPosting,
                        @isPosting,
                        @isPosting,
                        @isGroup,
                        @normalBalance,
                        @systemTag,
                        @allowManualEntry,
                        @isActive,
                        @status,
                        @level,
                        @level,
                        @path,
                        COALESCE(@createdAt, CURRENT_TIMESTAMP),
                        COALESCE(@updatedAt, CURRENT_TIMESTAMP)
                    )
                    `,
                )
                .run({
                    id: payload.id,
                    companyId: payload.companyId,
                    code: payload.code,
                    name: payload.name,
                    category: payload.category,
                    subtype: payload.subtype,
                    parentId: payload.parentId,
                    isPosting: payload.isPosting ? 1 : 0,
                    isGroup: payload.isPosting ? 0 : 1,
                    normalBalance: payload.normalBalance,
                    systemTag: payload.systemTag,
                    allowManualEntry: payload.allowManualEntry ? 1 : 0,
                    isActive: payload.isActive ? 1 : 0,
                    status: payload.isActive ? 'ACTIVE' : 'INACTIVE',
                    level: payload.level,
                    path: payload.path,
                    createdAt: payload.createdAt || null,
                    updatedAt: payload.updatedAt || null,
                });
        } catch (error: any) {
            if (String(error?.message || '').includes('UNIQUE')) {
                throw new DomainError('ERR_ACCOUNT_DUPLICATE', 'Duplicate account code or system tag', {
                    messageKey: 'error.account.duplicate',
                    details: { code: payload.code, systemTag: payload.systemTag },
                });
            }
            throw error;
        }
    }

    private mapAccountRow(row: AccountRow): AccountEntity {
        const code = String(row.code || row.account_code || '').trim();
        const category = this.normalizeCategory(row.category || row.account_category);
        const subtype = this.normalizeSubtype(row.subtype || row.account_subtype);
        const isPosting = this.normalizeIsPosting(row);
        const level = Number(row.level || row.account_level || 1);
        const path = String(row.path || code).trim();
        const normalBalance = this.normalizeNormalBalance(row.normal_balance, category, subtype);

        return AccountEntity.rehydrate({
            id: String(row.id),
            companyId: String(row.company_id || 'COMP_01'),
            code,
            name: String(row.name || code),
            category,
            subtype,
            parentId: row.parent_id ? String(row.parent_id) : null,
            isPosting,
            normalBalance,
            systemTag: row.system_tag ? String(row.system_tag).trim().toUpperCase() : null,
            allowManualEntry: Number(row.allow_manual_entry ?? 1) === 1,
            isActive: Number(row.is_active ?? 1) === 1,
            level: Number.isInteger(level) && level > 0 ? level : 1,
            path,
            createdAt: String(row.created_at || ''),
            updatedAt: String(row.updated_at || ''),
        });
    }

    private normalizeCategory(value: string | null): AccountCategory {
        const normalized = String(value || '').trim().toUpperCase();
        if (Object.values(AccountCategory).includes(normalized as AccountCategory)) {
            return normalized as AccountCategory;
        }
        if (normalized === 'OTHERINCOME') return AccountCategory.OTHER_INCOME;
        if (normalized === 'OTHEREXPENSE') return AccountCategory.OTHER_EXPENSE;
        if (normalized === 'COSTOFSALES') return AccountCategory.COST_OF_SALES;
        return AccountCategory.ASSET;
    }

    private normalizeSubtype(value: string | null): AccountSubtype {
        const normalized = String(value || '').trim().toUpperCase();
        if (Object.values(AccountSubtype).includes(normalized as AccountSubtype)) {
            return normalized as AccountSubtype;
        }
        return AccountSubtype.GENERAL;
    }

    private normalizeIsPosting(row: AccountRow): boolean {
        if (row.is_posting !== null && row.is_posting !== undefined) {
            return Number(row.is_posting) === 1;
        }
        if (row.posting_allowed !== null && row.posting_allowed !== undefined) {
            return Number(row.posting_allowed) === 1;
        }
        if (row.is_transactional !== null && row.is_transactional !== undefined) {
            return Number(row.is_transactional) === 1;
        }
        return true;
    }

    private normalizeNormalBalance(
        value: string | null,
        category: AccountCategory,
        subtype: AccountSubtype,
    ): NormalBalance {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === NormalBalance.CREDIT) return NormalBalance.CREDIT;
        if (normalized === NormalBalance.DEBIT) return NormalBalance.DEBIT;

        if (subtype === AccountSubtype.ALLOWANCE_DOUBTFUL_DEBTS) return NormalBalance.CREDIT;
        if (subtype === AccountSubtype.ACCUMULATED_DEPRECIATION) return NormalBalance.CREDIT;
        if (subtype === AccountSubtype.ACCUMULATED_AMORTIZATION) return NormalBalance.CREDIT;
        if (subtype === AccountSubtype.CHEQUE_RECEIVABLE) return NormalBalance.DEBIT;
        if (subtype === AccountSubtype.CHEQUE_PAYABLE) return NormalBalance.CREDIT;
        if (subtype === AccountSubtype.VEHICLE_EXPENSE) return NormalBalance.DEBIT;
        if (subtype === AccountSubtype.PURCHASE_RETURN) return NormalBalance.CREDIT;
        if (subtype === AccountSubtype.PURCHASE_DISCOUNT) return NormalBalance.CREDIT;
        if (subtype === AccountSubtype.SALES_RETURN) return NormalBalance.DEBIT;
        if (subtype === AccountSubtype.SALES_DISCOUNT) return NormalBalance.DEBIT;
        if (subtype === AccountSubtype.PROMOTIONAL_DISCOUNT) return NormalBalance.DEBIT;

        if (category === AccountCategory.LIABILITY) return NormalBalance.CREDIT;
        if (category === AccountCategory.EQUITY) return NormalBalance.CREDIT;
        if (category === AccountCategory.REVENUE) return NormalBalance.CREDIT;
        if (category === AccountCategory.OTHER_INCOME) return NormalBalance.CREDIT;
        return NormalBalance.DEBIT;
    }

    private shouldHideLegacyDuplicateAccount(row: AccountRow): boolean {
        const code = String(row.code || row.account_code || '').trim().toUpperCase();
        if (!LEGACY_DUPLICATE_ACCOUNT_CODES.has(code)) {
            return false;
        }

        const isInactive =
            Number(row.is_active ?? 1) === 0 ||
            String((row as AccountRow & { status?: string | null }).status || '')
                .trim()
                .toUpperCase() === 'INACTIVE';

        return isInactive && !row.parent_id;
    }

    private cleanupLegacyDuplicateAccounts(): void {
        const codes = [...LEGACY_DUPLICATE_ACCOUNT_CODES];
        if (!codes.length) {
            return;
        }

        const codePlaceholders = codes.map(() => '?').join(', ');
        const hasVoucherLinesTable = this.tableExists('ae_voucher_lines');
        const hasSubAccountsTable = this.tableExists('ae_sub_accounts');
        const voucherLineGuard = hasVoucherLinesTable
            ? `
                      AND NOT EXISTS (
                        SELECT 1
                        FROM ae_voucher_lines vl
                        WHERE vl.account_id = a.id
                      )
              `
            : '';

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS app_runtime_flags (
                flag_key TEXT PRIMARY KEY,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const alreadyApplied = this.db
            .prepare('SELECT 1 FROM app_runtime_flags WHERE flag_key = ? LIMIT 1')
            .get('cleanup.legacyDuplicateAccounts.v1');
        if (alreadyApplied) {
            return;
        }

        const cleanup = this.db.transaction((): void => {
            const candidateIds = this.db
                .prepare(
                    `
                    SELECT a.id
                    FROM accounts a
                    WHERE UPPER(COALESCE(a.code, a.account_code, '')) IN (${codePlaceholders})
                      AND (
                        COALESCE(a.is_active, 1) = 0
                        OR UPPER(COALESCE(a.status, '')) = 'INACTIVE'
                      )
                      AND a.parent_id IS NULL
                      AND NOT EXISTS (
                        SELECT 1
                        FROM accounts c
                        WHERE c.parent_id = a.id
                      )
                      ${voucherLineGuard}
                    `,
                )
                .all(...codes) as Array<{ id: string }>;

            if (!candidateIds.length) {
                this.db
                    .prepare('INSERT OR IGNORE INTO app_runtime_flags(flag_key) VALUES (?)')
                    .run('cleanup.legacyDuplicateAccounts.v1');
                return;
            }

            const ids = candidateIds.map((row) => row.id);
            const idPlaceholders = ids.map(() => '?').join(', ');

            if (hasSubAccountsTable) {
                this.db.prepare(`DELETE FROM ae_sub_accounts WHERE account_id IN (${idPlaceholders})`).run(...ids);
            }
            this.db.prepare(`DELETE FROM accounts WHERE id IN (${idPlaceholders})`).run(...ids);
            this.db
                .prepare('INSERT OR IGNORE INTO app_runtime_flags(flag_key) VALUES (?)')
                .run('cleanup.legacyDuplicateAccounts.v1');
        });

        cleanup();
    }

    private tableExists(tableName: string): boolean {
        const row = this.db
            .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`)
            .get(tableName) as { 1?: number } | undefined;
        return Boolean(row);
    }

    private ensureSchema(): void {
        this.safeAddColumn('company_id', "TEXT DEFAULT 'COMP_01'");
        this.safeAddColumn('category', 'TEXT');
        this.safeAddColumn('subtype', "TEXT DEFAULT 'GENERAL'");
        this.safeAddColumn('is_posting', 'INTEGER DEFAULT 1');
        this.safeAddColumn('normal_balance', "TEXT DEFAULT 'DEBIT'");
        this.safeAddColumn('system_tag', 'TEXT');
        this.safeAddColumn('allow_manual_entry', 'INTEGER DEFAULT 1');
        this.safeAddColumn('level', 'INTEGER');
        this.safeAddColumn('path', 'TEXT');
        this.safeAddColumn('created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');
        this.safeAddColumn('updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

        this.safeAddColumn('account_code', 'TEXT');
        this.safeAddColumn('account_category', 'TEXT');
        this.safeAddColumn('account_subtype', 'TEXT');
        this.safeAddColumn('posting_allowed', 'INTEGER');
        this.safeAddColumn('account_level', 'INTEGER');
        this.safeAddColumn('status', "TEXT DEFAULT 'ACTIVE'");
        this.safeAddColumn('is_group', 'INTEGER DEFAULT 0');
        this.safeAddColumn('is_transactional', 'INTEGER DEFAULT 1');

        // Fix buggy v55 trigger: it blocked ALL updates to posting accounts with children,
        // even when is_posting was not being changed. The fixed version (v56) only fires
        // when the account is being CHANGED from non-posting to posting.
        this.db.exec(`
            DROP TRIGGER IF EXISTS trg_accounts_prevent_posting_with_children_v55;

            CREATE TRIGGER IF NOT EXISTS trg_accounts_prevent_posting_with_children_v56
            BEFORE UPDATE OF is_posting ON accounts
            FOR EACH ROW
            WHEN COALESCE(NEW.is_posting, 0) = 1
              AND COALESCE(OLD.is_posting, 0) = 0
              AND EXISTS (
                SELECT 1
                FROM accounts c
                WHERE c.parent_id = NEW.id
              )
            BEGIN
                SELECT RAISE(ABORT, 'Posting accounts cannot have children');
            END;
        `);

        this.db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_company_code_v55
            ON accounts(company_id, code);

            CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_company_system_tag_v55
            ON accounts(company_id, system_tag)
            WHERE system_tag IS NOT NULL;

            CREATE INDEX IF NOT EXISTS idx_accounts_parent_id_v55
            ON accounts(parent_id);

            CREATE INDEX IF NOT EXISTS idx_accounts_category_v55
            ON accounts(category);

            CREATE INDEX IF NOT EXISTS idx_accounts_is_posting_v55
            ON accounts(is_posting);

            CREATE INDEX IF NOT EXISTS idx_accounts_is_active_v55
            ON accounts(is_active);

            CREATE TRIGGER IF NOT EXISTS trg_accounts_prevent_child_of_posting_insert_v55
            BEFORE INSERT ON accounts
            FOR EACH ROW
            WHEN NEW.parent_id IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM accounts p
                WHERE p.id = NEW.parent_id
                  AND COALESCE(p.is_posting, p.posting_allowed, p.is_transactional, 1) = 1
              )
            BEGIN
                SELECT RAISE(ABORT, 'Posting accounts cannot have children');
            END;

            CREATE TRIGGER IF NOT EXISTS trg_accounts_prevent_child_of_posting_update_v55
            BEFORE UPDATE OF parent_id ON accounts
            FOR EACH ROW
            WHEN NEW.parent_id IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM accounts p
                WHERE p.id = NEW.parent_id
                  AND COALESCE(p.is_posting, p.posting_allowed, p.is_transactional, 1) = 1
              )
            BEGIN
                SELECT RAISE(ABORT, 'Posting accounts cannot have children');
            END;

            CREATE TRIGGER IF NOT EXISTS trg_accounts_header_manual_forbidden_insert_v55
            BEFORE INSERT ON accounts
            FOR EACH ROW
            WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) = 0
              AND COALESCE(NEW.allow_manual_entry, 1) = 1
            BEGIN
                SELECT RAISE(ABORT, 'Header accounts cannot allow manual entry');
            END;

            CREATE TRIGGER IF NOT EXISTS trg_accounts_header_manual_forbidden_update_v55
            BEFORE UPDATE OF is_posting, allow_manual_entry ON accounts
            FOR EACH ROW
            WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) = 0
              AND COALESCE(NEW.allow_manual_entry, 1) = 1
            BEGIN
                SELECT RAISE(ABORT, 'Header accounts cannot allow manual entry');
            END;

            CREATE TRIGGER IF NOT EXISTS trg_accounts_ar_control_policy_insert_v55
            BEFORE INSERT ON accounts
            FOR EACH ROW
            WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) = 'RECEIVABLE_CONTROL'
               OR UPPER(COALESCE(NEW.system_tag, '')) = 'AR_CONTROL'
            BEGIN
                SELECT CASE
                    WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) != 'RECEIVABLE_CONTROL' THEN RAISE(ABORT, 'AR control must use RECEIVABLE_CONTROL subtype')
                    WHEN UPPER(COALESCE(NEW.system_tag, '')) != 'AR_CONTROL' THEN RAISE(ABORT, 'AR control must use AR_CONTROL system tag')
                    WHEN UPPER(COALESCE(NEW.category, NEW.account_category, '')) != 'ASSET' THEN RAISE(ABORT, 'AR control must be ASSET category')
                    WHEN COALESCE(NEW.allow_manual_entry, 1) = 1 THEN RAISE(ABORT, 'AR control cannot allow manual entry')
                    WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) != 1 THEN RAISE(ABORT, 'AR control must be posting')
                END;
            END;

            CREATE TRIGGER IF NOT EXISTS trg_accounts_ar_control_policy_update_v55
            BEFORE UPDATE OF subtype, account_subtype, system_tag, category, account_category, allow_manual_entry, is_posting, posting_allowed, is_transactional ON accounts
            FOR EACH ROW
            WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) = 'RECEIVABLE_CONTROL'
               OR UPPER(COALESCE(NEW.system_tag, '')) = 'AR_CONTROL'
            BEGIN
                SELECT CASE
                    WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) != 'RECEIVABLE_CONTROL' THEN RAISE(ABORT, 'AR control must use RECEIVABLE_CONTROL subtype')
                    WHEN UPPER(COALESCE(NEW.system_tag, '')) != 'AR_CONTROL' THEN RAISE(ABORT, 'AR control must use AR_CONTROL system tag')
                    WHEN UPPER(COALESCE(NEW.category, NEW.account_category, '')) != 'ASSET' THEN RAISE(ABORT, 'AR control must be ASSET category')
                    WHEN COALESCE(NEW.allow_manual_entry, 1) = 1 THEN RAISE(ABORT, 'AR control cannot allow manual entry')
                    WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) != 1 THEN RAISE(ABORT, 'AR control must be posting')
                END;
            END;

            CREATE TRIGGER IF NOT EXISTS trg_accounts_ap_control_policy_insert_v55
            BEFORE INSERT ON accounts
            FOR EACH ROW
            WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) = 'PAYABLE_CONTROL'
               OR UPPER(COALESCE(NEW.system_tag, '')) = 'AP_CONTROL'
            BEGIN
                SELECT CASE
                    WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) != 'PAYABLE_CONTROL' THEN RAISE(ABORT, 'AP control must use PAYABLE_CONTROL subtype')
                    WHEN UPPER(COALESCE(NEW.system_tag, '')) != 'AP_CONTROL' THEN RAISE(ABORT, 'AP control must use AP_CONTROL system tag')
                    WHEN UPPER(COALESCE(NEW.category, NEW.account_category, '')) != 'LIABILITY' THEN RAISE(ABORT, 'AP control must be LIABILITY category')
                    WHEN COALESCE(NEW.allow_manual_entry, 1) = 1 THEN RAISE(ABORT, 'AP control cannot allow manual entry')
                    WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) != 1 THEN RAISE(ABORT, 'AP control must be posting')
                END;
            END;

            CREATE TRIGGER IF NOT EXISTS trg_accounts_ap_control_policy_update_v55
            BEFORE UPDATE OF subtype, account_subtype, system_tag, category, account_category, allow_manual_entry, is_posting, posting_allowed, is_transactional ON accounts
            FOR EACH ROW
            WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) = 'PAYABLE_CONTROL'
               OR UPPER(COALESCE(NEW.system_tag, '')) = 'AP_CONTROL'
            BEGIN
                SELECT CASE
                    WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) != 'PAYABLE_CONTROL' THEN RAISE(ABORT, 'AP control must use PAYABLE_CONTROL subtype')
                    WHEN UPPER(COALESCE(NEW.system_tag, '')) != 'AP_CONTROL' THEN RAISE(ABORT, 'AP control must use AP_CONTROL system tag')
                    WHEN UPPER(COALESCE(NEW.category, NEW.account_category, '')) != 'LIABILITY' THEN RAISE(ABORT, 'AP control must be LIABILITY category')
                    WHEN COALESCE(NEW.allow_manual_entry, 1) = 1 THEN RAISE(ABORT, 'AP control cannot allow manual entry')
                    WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) != 1 THEN RAISE(ABORT, 'AP control must be posting')
                END;
            END;
        `);
    }

    private safeAddColumn(columnName: string, ddl: string): void {
        const exists = this.db
            .prepare('PRAGMA table_info(accounts)')
            .all()
            .some((column: { name: string }) => column.name === columnName);
        if (!exists) {
            this.db.prepare(`ALTER TABLE accounts ADD COLUMN ${columnName} ${ddl}`).run();
        }
    }
}
