-- Field-level Audit Engine (V50)

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT,
    user_id TEXT NOT NULL,
    session_id TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    doc_type TEXT,
    doc_id TEXT,
    event_type TEXT NOT NULL,
    correlation_id TEXT,
    ipcid TEXT,
    summary_i18n_key TEXT,
    meta_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_event_fields (
    id TEXT PRIMARY KEY,
    audit_event_id TEXT NOT NULL,
    field_path TEXT NOT NULL,
    old_value_json TEXT,
    new_value_json TEXT,
    FOREIGN KEY (audit_event_id) REFERENCES audit_events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_events_company_created_desc
    ON audit_events(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_company_branch_created_desc
    ON audit_events(company_id, branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_company_entity_created_desc
    ON audit_events(company_id, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_company_user_created_desc
    ON audit_events(company_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_company_event_created_desc
    ON audit_events(company_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_company_correlation
    ON audit_events(company_id, correlation_id, event_type, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_fields_audit_event_id
    ON audit_event_fields(audit_event_id);
