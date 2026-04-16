-- Dynamic Filters + Column Chooser + Saved Views (V49)

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

CREATE TRIGGER IF NOT EXISTS trg_screen_views_updated_at
AFTER UPDATE ON screen_views
FOR EACH ROW
BEGIN
    UPDATE screen_views
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;
