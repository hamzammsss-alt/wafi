-- Flexible Settings Engine (V67)
-- The runtime service also performs safe column migrations for older databases.

CREATE TABLE IF NOT EXISTS settings_groups (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    group_id TEXT,
    label_ar TEXT,
    label_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    value_type TEXT DEFAULT 'string',
    input_type TEXT DEFAULT 'text',
    default_value TEXT,
    options_json TEXT,
    validation_json TEXT,
    scope TEXT DEFAULT 'company',
    sort_order INTEGER DEFAULT 0,
    is_required INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_sensitive INTEGER DEFAULT 0,
    needs_review INTEGER DEFAULT 0,
    metadata_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES settings_groups(id)
);

CREATE TABLE IF NOT EXISTS setting_values (
    id TEXT PRIMARY KEY,
    setting_key TEXT NOT NULL,
    company_id TEXT NOT NULL DEFAULT 'COMP_01',
    branch_id TEXT,
    user_id TEXT,
    value TEXT,
    updated_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (setting_key) REFERENCES settings(key) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_setting_values_scope_unique
    ON setting_values(setting_key, company_id, COALESCE(branch_id, ''), COALESCE(user_id, ''));

CREATE INDEX IF NOT EXISTS idx_setting_values_key_scope
    ON setting_values(setting_key, company_id, branch_id, user_id);

CREATE TABLE IF NOT EXISTS setting_audit_logs (
    id TEXT PRIMARY KEY,
    setting_key TEXT NOT NULL,
    section_code TEXT,
    company_id TEXT NOT NULL DEFAULT 'COMP_01',
    branch_id TEXT,
    user_id TEXT,
    changed_by TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_setting_audit_logs_key_time
    ON setting_audit_logs(setting_key, created_at DESC);

