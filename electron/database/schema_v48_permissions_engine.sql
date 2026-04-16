-- Permissions Engine V48
-- Company/Branch scoped RBAC + capability registry + ACL versions.

-- roles: extends existing roles table contract with optional multi-tenant metadata.
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    code TEXT,
    name_i18n_key TEXT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- If the roles table already exists from legacy schema, these are safe no-op adds in loader.
ALTER TABLE roles ADD COLUMN company_id TEXT;
ALTER TABLE roles ADD COLUMN code TEXT;
ALTER TABLE roles ADD COLUMN name_i18n_key TEXT;
ALTER TABLE roles ADD COLUMN role_key TEXT;
ALTER TABLE roles ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;
ALTER TABLE roles ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE roles ADD COLUMN updated_at DATETIME;

UPDATE roles
SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_roles_company_active
    ON roles(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_roles_company_code
    ON roles(company_id, code);

CREATE INDEX IF NOT EXISTS idx_roles_role_key
    ON roles(role_key);

-- role_permissions: permission_key == capability_key (EN only).
CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    capability_key TEXT NOT NULL,
    effect TEXT NOT NULL DEFAULT 'ALLOW',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, capability_key),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_capability
    ON role_permissions(role_id, capability_key);

CREATE INDEX IF NOT EXISTS idx_role_permissions_capability
    ON role_permissions(capability_key);

-- user_role_assignments: scoped assignment rows.
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    scope_level TEXT NOT NULL DEFAULT 'BRANCH',
    is_active INTEGER NOT NULL DEFAULT 1,
    valid_from DATETIME,
    valid_to DATETIME,
    criteria_json TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, branch_id, user_id, role_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_company_user_active
    ON user_role_assignments(company_id, user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_company_branch_user_active
    ON user_role_assignments(company_id, branch_id, user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role
    ON user_role_assignments(role_id);

-- ACL versions (company scope).
CREATE TABLE IF NOT EXISTS acl_versions (
    company_id TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    acl_version INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ACL versions (branch scope).
CREATE TABLE IF NOT EXISTS branch_acl_versions (
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    acl_version INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, branch_id)
);

ALTER TABLE acl_versions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE branch_acl_versions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ABAC criteria rules (capability-based, JSON predicate).
CREATE TABLE IF NOT EXISTS criteria_rules (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT,
    capability_key TEXT NOT NULL,
    effect TEXT NOT NULL DEFAULT 'ALLOW',
    predicate_json TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_criteria_rules_scope_capability_active
    ON criteria_rules(company_id, branch_id, capability_key, is_active);

CREATE INDEX IF NOT EXISTS idx_criteria_rules_priority
    ON criteria_rules(company_id, branch_id, capability_key, priority);

-- Optional runtime registry, synced from CapabilityRegistry.
CREATE TABLE IF NOT EXISTS capability_registry (
    capability_key TEXT PRIMARY KEY,
    label_i18n_key TEXT NOT NULL,
    category TEXT,
    module_key TEXT,
    product_key TEXT,
    default_scope TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE capability_registry ADD COLUMN category TEXT;
ALTER TABLE capability_registry ADD COLUMN created_at DATETIME;

UPDATE capability_registry
SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_capability_registry_module
    ON capability_registry(module_key);

CREATE INDEX IF NOT EXISTS idx_capability_registry_category
    ON capability_registry(category);

-- Ensure at least one company ACL row exists.
INSERT INTO acl_versions (company_id, version, acl_version, updated_at)
VALUES ('COMP_01', 1, 1, CURRENT_TIMESTAMP)
ON CONFLICT(company_id) DO NOTHING;

-- Keep numeric version aliases in sync (version <-> acl_version compatibility).
CREATE TRIGGER IF NOT EXISTS trg_acl_versions_sync_version_ai
AFTER INSERT ON acl_versions
BEGIN
    UPDATE acl_versions
    SET version = COALESCE(NEW.acl_version, NEW.version, 1),
        acl_version = COALESCE(NEW.acl_version, NEW.version, 1)
    WHERE company_id = NEW.company_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_acl_versions_sync_version_au
AFTER UPDATE OF acl_version ON acl_versions
BEGIN
    UPDATE acl_versions
    SET version = COALESCE(NEW.acl_version, 1)
    WHERE company_id = NEW.company_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_branch_acl_versions_sync_version_ai
AFTER INSERT ON branch_acl_versions
BEGIN
    UPDATE branch_acl_versions
    SET version = COALESCE(NEW.acl_version, NEW.version, 1),
        acl_version = COALESCE(NEW.acl_version, NEW.version, 1)
    WHERE company_id = NEW.company_id AND branch_id = NEW.branch_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_branch_acl_versions_sync_version_au
AFTER UPDATE OF acl_version ON branch_acl_versions
BEGIN
    UPDATE branch_acl_versions
    SET version = COALESCE(NEW.acl_version, 1)
    WHERE company_id = NEW.company_id AND branch_id = NEW.branch_id;
END;

-- ---------------------------
-- Version bump triggers
-- ---------------------------

-- Roles and role_permissions bump company ACL version.
CREATE TRIGGER IF NOT EXISTS trg_roles_acl_company_ai
AFTER INSERT ON roles
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (COALESCE(NEW.company_id, 'COMP_01'), 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_roles_acl_company_au
AFTER UPDATE ON roles
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (COALESCE(NEW.company_id, COALESCE(OLD.company_id, 'COMP_01')), 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_roles_acl_company_ad
AFTER DELETE ON roles
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (COALESCE(OLD.company_id, 'COMP_01'), 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_role_permissions_acl_company_ai
AFTER INSERT ON role_permissions
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (
        COALESCE((SELECT company_id FROM roles WHERE id = NEW.role_id), 'COMP_01'),
        1,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_role_permissions_acl_company_au
AFTER UPDATE ON role_permissions
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (
        COALESCE((SELECT company_id FROM roles WHERE id = NEW.role_id), 'COMP_01'),
        1,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_role_permissions_acl_company_ad
AFTER DELETE ON role_permissions
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (
        COALESCE((SELECT company_id FROM roles WHERE id = OLD.role_id), 'COMP_01'),
        1,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

-- Scoped user assignment changes:
-- company-level assignment => bump company ACL
-- branch-level assignment  => bump branch ACL
CREATE TRIGGER IF NOT EXISTS trg_user_role_assignments_acl_company_ai
AFTER INSERT ON user_role_assignments
WHEN NEW.branch_id IS NULL
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (NEW.company_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_role_assignments_acl_company_au
AFTER UPDATE ON user_role_assignments
WHEN NEW.branch_id IS NULL
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (NEW.company_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_role_assignments_acl_company_ad
AFTER DELETE ON user_role_assignments
WHEN OLD.branch_id IS NULL
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (OLD.company_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_role_assignments_acl_branch_ai
AFTER INSERT ON user_role_assignments
WHEN NEW.branch_id IS NOT NULL
BEGIN
    INSERT INTO branch_acl_versions (company_id, branch_id, acl_version, updated_at)
    VALUES (NEW.company_id, NEW.branch_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, branch_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_role_assignments_acl_branch_au
AFTER UPDATE ON user_role_assignments
WHEN NEW.branch_id IS NOT NULL
BEGIN
    INSERT INTO branch_acl_versions (company_id, branch_id, acl_version, updated_at)
    VALUES (NEW.company_id, NEW.branch_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, branch_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

-- If assignment moved away from an old branch, bump old branch ACL too.
CREATE TRIGGER IF NOT EXISTS trg_user_role_assignments_acl_branch_au_old
AFTER UPDATE ON user_role_assignments
WHEN OLD.branch_id IS NOT NULL
 AND (
    NEW.branch_id IS NULL
    OR NEW.branch_id <> OLD.branch_id
    OR NEW.company_id <> OLD.company_id
 )
BEGIN
    INSERT INTO branch_acl_versions (company_id, branch_id, acl_version, updated_at)
    VALUES (OLD.company_id, OLD.branch_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, branch_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_role_assignments_acl_branch_ad
AFTER DELETE ON user_role_assignments
WHEN OLD.branch_id IS NOT NULL
BEGIN
    INSERT INTO branch_acl_versions (company_id, branch_id, acl_version, updated_at)
    VALUES (OLD.company_id, OLD.branch_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, branch_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

-- Criteria rules changes bump company or branch version by scope.
CREATE TRIGGER IF NOT EXISTS trg_criteria_rules_acl_company_ai
AFTER INSERT ON criteria_rules
WHEN NEW.branch_id IS NULL
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (NEW.company_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_criteria_rules_acl_company_au
AFTER UPDATE ON criteria_rules
WHEN NEW.branch_id IS NULL
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (NEW.company_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_criteria_rules_acl_company_ad
AFTER DELETE ON criteria_rules
WHEN OLD.branch_id IS NULL
BEGIN
    INSERT INTO acl_versions (company_id, acl_version, updated_at)
    VALUES (OLD.company_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_criteria_rules_acl_branch_ai
AFTER INSERT ON criteria_rules
WHEN NEW.branch_id IS NOT NULL
BEGIN
    INSERT INTO branch_acl_versions (company_id, branch_id, acl_version, updated_at)
    VALUES (NEW.company_id, NEW.branch_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, branch_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_criteria_rules_acl_branch_au
AFTER UPDATE ON criteria_rules
WHEN NEW.branch_id IS NOT NULL
BEGIN
    INSERT INTO branch_acl_versions (company_id, branch_id, acl_version, updated_at)
    VALUES (NEW.company_id, NEW.branch_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, branch_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

-- If criteria moved away from an old branch, bump old branch ACL too.
CREATE TRIGGER IF NOT EXISTS trg_criteria_rules_acl_branch_au_old
AFTER UPDATE ON criteria_rules
WHEN OLD.branch_id IS NOT NULL
 AND (
    NEW.branch_id IS NULL
    OR NEW.branch_id <> OLD.branch_id
    OR NEW.company_id <> OLD.company_id
 )
BEGIN
    INSERT INTO branch_acl_versions (company_id, branch_id, acl_version, updated_at)
    VALUES (OLD.company_id, OLD.branch_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, branch_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS trg_criteria_rules_acl_branch_ad
AFTER DELETE ON criteria_rules
WHEN OLD.branch_id IS NOT NULL
BEGIN
    INSERT INTO branch_acl_versions (company_id, branch_id, acl_version, updated_at)
    VALUES (OLD.company_id, OLD.branch_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, branch_id) DO UPDATE SET
        acl_version = acl_version + 1,
        updated_at = CURRENT_TIMESTAMP;
END;
