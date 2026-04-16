import Database from 'better-sqlite3';

export type ScreenViewRow = {
    id: string;
    company_id: string;
    branch_id: string | null;
    user_id: string | null;
    screen_key: string;
    scope: 'user' | 'branch' | 'company';
    name: string;
    name_i18n_key: string | null;
    filters_json: string;
    columns_json: string;
    sort_json: string;
    is_default: number;
    is_shared: number;
    created_at: string;
    updated_at: string;
};

export class SqliteScreenViewsRepo {
    private readonly db: Database.Database;

    constructor(database: Database.Database) {
        this.db = database;
        this.ensureSchema();
    }

    private ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS screen_views (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT,
                user_id TEXT,
                screen_key TEXT NOT NULL,
                scope TEXT NOT NULL CHECK (scope IN ('user', 'branch', 'company')),
                name TEXT NOT NULL,
                name_i18n_key TEXT,
                filters_json TEXT NOT NULL DEFAULT '[]',
                columns_json TEXT NOT NULL DEFAULT '[]',
                sort_json TEXT NOT NULL DEFAULT '[]',
                is_default INTEGER NOT NULL DEFAULT 0,
                is_shared INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (company_id, branch_id, user_id, screen_key, name)
            );

            CREATE INDEX IF NOT EXISTS idx_screen_views_company_screen_scope
                ON screen_views (company_id, screen_key, scope);

            CREATE INDEX IF NOT EXISTS idx_screen_views_company_user_screen
                ON screen_views (company_id, user_id, screen_key);

            CREATE INDEX IF NOT EXISTS idx_screen_views_company_branch_screen
                ON screen_views (company_id, branch_id, screen_key);

            CREATE INDEX IF NOT EXISTS idx_screen_views_default_lookup
                ON screen_views (company_id, screen_key, is_default);
        `);
    }

    listVisibleViews(params: {
        companyId: string;
        branchId: string;
        userId: string;
        screenKey: string;
    }): ScreenViewRow[] {
        const query = this.db.prepare(`
            SELECT *
            FROM screen_views
            WHERE company_id = @companyId
              AND screen_key = @screenKey
              AND (
                    (scope = 'company')
                 OR (scope = 'branch' AND branch_id = @branchId)
                 OR (scope = 'user' AND user_id = @userId)
              )
            ORDER BY
                CASE scope WHEN 'company' THEN 1 WHEN 'branch' THEN 2 ELSE 3 END,
                is_default DESC,
                updated_at DESC,
                created_at DESC
        `);

        return query.all({
            companyId: params.companyId,
            branchId: params.branchId,
            userId: params.userId,
            screenKey: params.screenKey,
        }) as ScreenViewRow[];
    }

    getViewById(viewId: string): ScreenViewRow | null {
        const row = this.db.prepare('SELECT * FROM screen_views WHERE id = ? LIMIT 1').get(viewId) as ScreenViewRow | undefined;
        return row || null;
    }

    insertView(row: {
        id: string;
        companyId: string;
        branchId: string | null;
        userId: string | null;
        screenKey: string;
        scope: 'user' | 'branch' | 'company';
        name: string;
        nameI18nKey?: string | null;
        filtersJson: string;
        columnsJson: string;
        sortJson: string;
        isDefault: number;
        isShared: number;
    }): void {
        this.db.prepare(`
            INSERT INTO screen_views (
                id, company_id, branch_id, user_id, screen_key, scope, name, name_i18n_key,
                filters_json, columns_json, sort_json, is_default, is_shared, created_at, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @userId, @screenKey, @scope, @name, @nameI18nKey,
                @filtersJson, @columnsJson, @sortJson, @isDefault, @isShared, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        `).run({
            id: row.id,
            companyId: row.companyId,
            branchId: row.branchId,
            userId: row.userId,
            screenKey: row.screenKey,
            scope: row.scope,
            name: row.name,
            nameI18nKey: row.nameI18nKey || null,
            filtersJson: row.filtersJson,
            columnsJson: row.columnsJson,
            sortJson: row.sortJson,
            isDefault: row.isDefault,
            isShared: row.isShared,
        });
    }

    updateView(row: {
        id: string;
        companyId: string;
        branchId: string | null;
        userId: string | null;
        scope: 'user' | 'branch' | 'company';
        name: string;
        nameI18nKey?: string | null;
        filtersJson: string;
        columnsJson: string;
        sortJson: string;
        isDefault: number;
        isShared: number;
    }): void {
        this.db.prepare(`
            UPDATE screen_views
            SET branch_id = @branchId,
                user_id = @userId,
                scope = @scope,
                name = @name,
                name_i18n_key = @nameI18nKey,
                filters_json = @filtersJson,
                columns_json = @columnsJson,
                sort_json = @sortJson,
                is_default = @isDefault,
                is_shared = @isShared,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
              AND company_id = @companyId
        `).run({
            id: row.id,
            companyId: row.companyId,
            branchId: row.branchId,
            userId: row.userId,
            scope: row.scope,
            name: row.name,
            nameI18nKey: row.nameI18nKey || null,
            filtersJson: row.filtersJson,
            columnsJson: row.columnsJson,
            sortJson: row.sortJson,
            isDefault: row.isDefault,
            isShared: row.isShared,
        });
    }

    clearDefaultForScope(params: {
        companyId: string;
        screenKey: string;
        scope: 'user' | 'branch' | 'company';
        branchId: string | null;
        userId: string | null;
    }): void {
        this.db.prepare(`
            UPDATE screen_views
            SET is_default = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = @companyId
              AND screen_key = @screenKey
              AND scope = @scope
              AND COALESCE(branch_id, '') = COALESCE(@branchId, '')
              AND COALESCE(user_id, '') = COALESCE(@userId, '')
              AND is_default = 1
        `).run({
            companyId: params.companyId,
            screenKey: params.screenKey,
            scope: params.scope,
            branchId: params.branchId,
            userId: params.userId,
        });
    }

    setDefaultById(viewId: string, companyId: string): void {
        this.db.prepare(`
            UPDATE screen_views
            SET is_default = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND company_id = ?
        `).run(viewId, companyId);
    }

    deleteView(viewId: string, companyId: string): void {
        this.db.prepare(`
            DELETE FROM screen_views
            WHERE id = ?
              AND company_id = ?
        `).run(viewId, companyId);
    }

    runRowsQuery<T = any>(sql: string, params: unknown[]): T[] {
        return this.db.prepare(sql).all(...params) as T[];
    }

    runCountQuery(sql: string, params: unknown[]): number {
        const row = this.db.prepare(sql).get(...params) as { total?: number } | undefined;
        return Number(row?.total || 0);
    }

    runScalarQuery(sql: string, params: unknown[]): number {
        const row = this.db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
        if (!row) return 0;
        const firstValue = row[Object.keys(row)[0]];
        return Number(firstValue || 0);
    }
}
