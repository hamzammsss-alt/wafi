"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlitePermissionEngineRepo = void 0;
const uuid_1 = require("uuid");
class SqlitePermissionEngineRepo {
    constructor(database) {
        this.db = database;
        this.ensureSchema();
    }
    ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sys_capabilities (
                key TEXT PRIMARY KEY,
                product_key TEXT NOT NULL,
                module_key TEXT NOT NULL,
                label_i18n_key TEXT NOT NULL,
                deny_i18n_key TEXT NOT NULL,
                default_scope TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'SYSTEM',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sys_capability_permissions (
                capability_key TEXT NOT NULL,
                permission_key TEXT NOT NULL,
                PRIMARY KEY (capability_key, permission_key),
                FOREIGN KEY (capability_key) REFERENCES sys_capabilities(key) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sys_capability_field_rules (
                capability_key TEXT NOT NULL,
                field_key TEXT NOT NULL,
                criteria TEXT NOT NULL,
                effect TEXT NOT NULL,
                PRIMARY KEY (capability_key, field_key, effect),
                FOREIGN KEY (capability_key) REFERENCES sys_capabilities(key) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sys_capability_policy_guards (
                capability_key TEXT NOT NULL,
                guard_key TEXT NOT NULL,
                config_json TEXT,
                PRIMARY KEY (capability_key, guard_key),
                FOREIGN KEY (capability_key) REFERENCES sys_capabilities(key) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sys_capability_bundles (
                key TEXT PRIMARY KEY,
                product_key TEXT NOT NULL,
                label_i18n_key TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'SYSTEM',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sys_bundle_capabilities (
                bundle_key TEXT NOT NULL,
                capability_key TEXT NOT NULL,
                PRIMARY KEY (bundle_key, capability_key),
                FOREIGN KEY (bundle_key) REFERENCES sys_capability_bundles(key) ON DELETE CASCADE,
                FOREIGN KEY (capability_key) REFERENCES sys_capabilities(key) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sys_sector_packs (
                key TEXT PRIMARY KEY,
                label_i18n_key TEXT NOT NULL,
                report_template_keys TEXT,
                print_template_keys TEXT,
                policy_template_keys TEXT,
                source TEXT NOT NULL DEFAULT 'SYSTEM',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sys_sector_pack_bundles (
                sector_pack_key TEXT NOT NULL,
                bundle_key TEXT NOT NULL,
                PRIMARY KEY (sector_pack_key, bundle_key),
                FOREIGN KEY (sector_pack_key) REFERENCES sys_sector_packs(key) ON DELETE CASCADE,
                FOREIGN KEY (bundle_key) REFERENCES sys_capability_bundles(key) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sys_sector_pack_capabilities (
                sector_pack_key TEXT NOT NULL,
                capability_key TEXT NOT NULL,
                PRIMARY KEY (sector_pack_key, capability_key),
                FOREIGN KEY (sector_pack_key) REFERENCES sys_sector_packs(key) ON DELETE CASCADE,
                FOREIGN KEY (capability_key) REFERENCES sys_capabilities(key) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sys_role_capabilities (
                id TEXT PRIMARY KEY,
                role_id TEXT NOT NULL,
                capability_key TEXT NOT NULL,
                scope_company_id TEXT,
                scope_branch_id TEXT,
                criteria_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sys_role_bundles (
                id TEXT PRIMARY KEY,
                role_id TEXT NOT NULL,
                bundle_key TEXT NOT NULL,
                scope_company_id TEXT,
                scope_branch_id TEXT,
                criteria_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sys_permissions_version (
                company_id TEXT PRIMARY KEY,
                version INTEGER NOT NULL DEFAULT 1,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sys_registry_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_sys_role_capabilities_role_scope
                ON sys_role_capabilities(role_id, scope_company_id, scope_branch_id);
            CREATE INDEX IF NOT EXISTS idx_sys_role_bundles_role_scope
                ON sys_role_bundles(role_id, scope_company_id, scope_branch_id);
            CREATE INDEX IF NOT EXISTS idx_sys_capability_permissions_permission
                ON sys_capability_permissions(permission_key);
        `);
        // V48 permission engine runtime tables (kept here for startup resilience).
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id TEXT PRIMARY KEY,
                role_id TEXT NOT NULL,
                capability_key TEXT NOT NULL,
                effect TEXT NOT NULL DEFAULT 'ALLOW',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role_id, capability_key),
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            );

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

            CREATE TABLE IF NOT EXISTS acl_versions (
                company_id TEXT PRIMARY KEY,
                version INTEGER NOT NULL DEFAULT 1,
                acl_version INTEGER NOT NULL DEFAULT 1,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS branch_acl_versions (
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                acl_version INTEGER NOT NULL DEFAULT 1,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (company_id, branch_id)
            );

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

            CREATE INDEX IF NOT EXISTS idx_role_permissions_role_capability
                ON role_permissions(role_id, capability_key);
            CREATE INDEX IF NOT EXISTS idx_user_role_assignments_company_user_active
                ON user_role_assignments(company_id, user_id, is_active);
            CREATE INDEX IF NOT EXISTS idx_user_role_assignments_company_branch_user_active
                ON user_role_assignments(company_id, branch_id, user_id, is_active);
            CREATE INDEX IF NOT EXISTS idx_criteria_rules_scope_capability_active
                ON criteria_rules(company_id, branch_id, capability_key, is_active);
            CREATE INDEX IF NOT EXISTS idx_roles_company_code
                ON roles(company_id, code);
            CREATE INDEX IF NOT EXISTS idx_capability_registry_category
                ON capability_registry(category);
        `);
        const safeAddColumn = (table, columnDef) => {
            try {
                this.db.prepare(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`).run();
            }
            catch {
                // Column already exists or table absent in older bootstrap phase.
            }
        };
        safeAddColumn('roles', 'company_id TEXT');
        safeAddColumn('roles', 'code TEXT');
        safeAddColumn('roles', 'name_i18n_key TEXT');
        safeAddColumn('roles', 'role_key TEXT');
        safeAddColumn('roles', 'is_system INTEGER NOT NULL DEFAULT 0');
        safeAddColumn('roles', 'is_active INTEGER NOT NULL DEFAULT 1');
        safeAddColumn('roles', 'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        safeAddColumn('acl_versions', 'version INTEGER NOT NULL DEFAULT 1');
        safeAddColumn('branch_acl_versions', 'version INTEGER NOT NULL DEFAULT 1');
        safeAddColumn('capability_registry', 'category TEXT');
        safeAddColumn('capability_registry', 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        this.db.prepare(`
            INSERT OR IGNORE INTO sys_permissions_version (company_id, version)
            VALUES ('COMP_01', 1)
        `).run();
        this.db.prepare(`
            INSERT OR IGNORE INTO acl_versions (company_id, version, acl_version)
            VALUES ('COMP_01', 1, 1)
        `).run();
    }
    seedCatalog(catalog, registryVersion) {
        const upsertCapability = this.db.prepare(`
            INSERT INTO sys_capabilities (
                key, product_key, module_key, label_i18n_key, deny_i18n_key, default_scope, source, updated_at
            ) VALUES (
                @key, @productKey, @moduleKey, @labelI18nKey, @denyI18nKey, @defaultScope, 'SYSTEM', CURRENT_TIMESTAMP
            )
            ON CONFLICT(key) DO UPDATE SET
                product_key = excluded.product_key,
                module_key = excluded.module_key,
                label_i18n_key = excluded.label_i18n_key,
                deny_i18n_key = excluded.deny_i18n_key,
                default_scope = excluded.default_scope,
                source = 'SYSTEM',
                updated_at = CURRENT_TIMESTAMP
        `);
        const deleteCapabilityPermissions = this.db.prepare('DELETE FROM sys_capability_permissions WHERE capability_key = ?');
        const insertCapabilityPermission = this.db.prepare(`
            INSERT OR IGNORE INTO sys_capability_permissions (capability_key, permission_key)
            VALUES (?, ?)
        `);
        const deleteCapabilityFieldRules = this.db.prepare('DELETE FROM sys_capability_field_rules WHERE capability_key = ?');
        const insertCapabilityFieldRule = this.db.prepare(`
            INSERT OR IGNORE INTO sys_capability_field_rules (capability_key, field_key, criteria, effect)
            VALUES (?, ?, ?, ?)
        `);
        const deleteCapabilityPolicyGuards = this.db.prepare('DELETE FROM sys_capability_policy_guards WHERE capability_key = ?');
        const insertCapabilityPolicyGuard = this.db.prepare(`
            INSERT OR IGNORE INTO sys_capability_policy_guards (capability_key, guard_key, config_json)
            VALUES (?, ?, ?)
        `);
        const upsertBundle = this.db.prepare(`
            INSERT INTO sys_capability_bundles (key, product_key, label_i18n_key, source, updated_at)
            VALUES (@key, @productKey, @labelI18nKey, 'SYSTEM', CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                product_key = excluded.product_key,
                label_i18n_key = excluded.label_i18n_key,
                source = 'SYSTEM',
                updated_at = CURRENT_TIMESTAMP
        `);
        const deleteBundleCapabilities = this.db.prepare('DELETE FROM sys_bundle_capabilities WHERE bundle_key = ?');
        const insertBundleCapability = this.db.prepare(`
            INSERT OR IGNORE INTO sys_bundle_capabilities (bundle_key, capability_key)
            VALUES (?, ?)
        `);
        const upsertSectorPack = this.db.prepare(`
            INSERT INTO sys_sector_packs (
                key, label_i18n_key, report_template_keys, print_template_keys, policy_template_keys, source, updated_at
            )
            VALUES (@key, @labelI18nKey, @reportTemplateKeys, @printTemplateKeys, @policyTemplateKeys, 'SYSTEM', CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                label_i18n_key = excluded.label_i18n_key,
                report_template_keys = excluded.report_template_keys,
                print_template_keys = excluded.print_template_keys,
                policy_template_keys = excluded.policy_template_keys,
                source = 'SYSTEM',
                updated_at = CURRENT_TIMESTAMP
        `);
        const deleteSectorPackBundles = this.db.prepare('DELETE FROM sys_sector_pack_bundles WHERE sector_pack_key = ?');
        const insertSectorPackBundle = this.db.prepare(`
            INSERT OR IGNORE INTO sys_sector_pack_bundles (sector_pack_key, bundle_key)
            VALUES (?, ?)
        `);
        const deleteSectorPackCapabilities = this.db.prepare('DELETE FROM sys_sector_pack_capabilities WHERE sector_pack_key = ?');
        const insertSectorPackCapability = this.db.prepare(`
            INSERT OR IGNORE INTO sys_sector_pack_capabilities (sector_pack_key, capability_key)
            VALUES (?, ?)
        `);
        const setRegistryVersion = this.db.prepare(`
            INSERT INTO sys_registry_meta (key, value)
            VALUES ('capability_registry_version', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);
        const upsertCapabilityRegistry = this.db.prepare(`
            INSERT INTO capability_registry (
                capability_key, label_i18n_key, category, module_key, product_key, default_scope, is_active, created_at, updated_at
            ) VALUES (
                @capabilityKey, @labelI18nKey, @category, @moduleKey, @productKey, @defaultScope, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT(capability_key) DO UPDATE SET
                label_i18n_key = excluded.label_i18n_key,
                category = excluded.category,
                module_key = excluded.module_key,
                product_key = excluded.product_key,
                default_scope = excluded.default_scope,
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
        `);
        const transaction = this.db.transaction(() => {
            for (const capability of catalog.capabilities) {
                upsertCapability.run({
                    key: capability.key,
                    productKey: capability.productKey,
                    moduleKey: capability.moduleKey,
                    labelI18nKey: capability.labelI18nKey,
                    denyI18nKey: capability.denyI18nKey,
                    defaultScope: capability.defaultScope,
                });
                upsertCapabilityRegistry.run({
                    capabilityKey: capability.key,
                    labelI18nKey: capability.labelI18nKey,
                    category: `${capability.productKey}.${capability.moduleKey}`,
                    moduleKey: capability.moduleKey,
                    productKey: capability.productKey,
                    defaultScope: capability.defaultScope,
                });
                deleteCapabilityPermissions.run(capability.key);
                for (const permissionKey of new Set(capability.permissions || [])) {
                    insertCapabilityPermission.run(capability.key, permissionKey);
                }
                deleteCapabilityFieldRules.run(capability.key);
                for (const fieldRule of capability.fieldRules || []) {
                    insertCapabilityFieldRule.run(capability.key, fieldRule.fieldKey, fieldRule.criteria, fieldRule.effect);
                }
                deleteCapabilityPolicyGuards.run(capability.key);
                for (const guard of capability.policyGuards || []) {
                    insertCapabilityPolicyGuard.run(capability.key, guard.guardKey, guard.config ? JSON.stringify(guard.config) : null);
                }
            }
            for (const bundle of catalog.bundles) {
                upsertBundle.run({
                    key: bundle.key,
                    productKey: bundle.productKey,
                    labelI18nKey: bundle.labelI18nKey,
                });
                deleteBundleCapabilities.run(bundle.key);
                for (const capabilityKey of new Set(bundle.capabilityKeys || [])) {
                    insertBundleCapability.run(bundle.key, capabilityKey);
                }
            }
            for (const pack of catalog.sectorPacks) {
                upsertSectorPack.run({
                    key: pack.key,
                    labelI18nKey: pack.labelI18nKey,
                    reportTemplateKeys: JSON.stringify(pack.reportTemplateKeys || []),
                    printTemplateKeys: JSON.stringify(pack.printTemplateKeys || []),
                    policyTemplateKeys: JSON.stringify(pack.policyTemplateKeys || []),
                });
                deleteSectorPackBundles.run(pack.key);
                for (const bundleKey of new Set(pack.bundleKeys || [])) {
                    insertSectorPackBundle.run(pack.key, bundleKey);
                }
                deleteSectorPackCapabilities.run(pack.key);
                for (const capabilityKey of new Set(pack.capabilityKeys || [])) {
                    insertSectorPackCapability.run(pack.key, capabilityKey);
                }
            }
            setRegistryVersion.run(String(registryVersion));
        });
        transaction();
    }
    getRegistryVersion() {
        const row = this.db.prepare(`
            SELECT value
            FROM sys_registry_meta
            WHERE key = 'capability_registry_version'
        `).get();
        const parsed = Number(row?.value || '0');
        return Number.isFinite(parsed) ? parsed : 0;
    }
    seedCapabilityRegistry(rows) {
        if (!rows?.length)
            return;
        const upsert = this.db.prepare(`
            INSERT INTO capability_registry (
                capability_key, label_i18n_key, category, module_key, product_key, default_scope, is_active, created_at, updated_at
            ) VALUES (
                @capabilityKey, @labelI18nKey, @category, @moduleKey, @productKey, @defaultScope, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT(capability_key) DO UPDATE SET
                label_i18n_key = excluded.label_i18n_key,
                category = excluded.category,
                module_key = excluded.module_key,
                product_key = excluded.product_key,
                default_scope = excluded.default_scope,
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
        `);
        const tx = this.db.transaction(() => {
            for (const row of rows) {
                upsert.run(row);
            }
        });
        tx();
    }
    getCatalog() {
        const capabilityRows = this.db.prepare(`
            SELECT *
            FROM sys_capabilities
            ORDER BY key
        `).all();
        const permissionRows = this.db.prepare(`
            SELECT capability_key, permission_key
            FROM sys_capability_permissions
            ORDER BY capability_key, permission_key
        `).all();
        const fieldRuleRows = this.db.prepare(`
            SELECT capability_key, field_key, criteria, effect
            FROM sys_capability_field_rules
            ORDER BY capability_key
        `).all();
        const policyGuardRows = this.db.prepare(`
            SELECT capability_key, guard_key, config_json
            FROM sys_capability_policy_guards
            ORDER BY capability_key
        `).all();
        const capabilityMap = new Map();
        for (const row of capabilityRows) {
            capabilityMap.set(row.key, {
                key: row.key,
                productKey: row.product_key,
                moduleKey: row.module_key,
                permissions: [],
                labelI18nKey: row.label_i18n_key,
                denyI18nKey: row.deny_i18n_key,
                defaultScope: row.default_scope,
                fieldRules: [],
                policyGuards: [],
            });
        }
        for (const row of permissionRows) {
            const capability = capabilityMap.get(row.capability_key);
            if (!capability)
                continue;
            capability.permissions.push(row.permission_key);
        }
        for (const row of fieldRuleRows) {
            const capability = capabilityMap.get(row.capability_key);
            if (!capability)
                continue;
            capability.fieldRules?.push({
                fieldKey: row.field_key,
                criteria: row.criteria,
                effect: row.effect,
            });
        }
        for (const row of policyGuardRows) {
            const capability = capabilityMap.get(row.capability_key);
            if (!capability)
                continue;
            capability.policyGuards?.push({
                guardKey: row.guard_key,
                config: row.config_json ? JSON.parse(row.config_json) : undefined,
            });
        }
        const bundleRows = this.db.prepare(`
            SELECT *
            FROM sys_capability_bundles
            ORDER BY key
        `).all();
        const bundleCapabilityRows = this.db.prepare(`
            SELECT bundle_key, capability_key
            FROM sys_bundle_capabilities
            ORDER BY bundle_key, capability_key
        `).all();
        const bundles = bundleRows.map((row) => ({
            key: row.key,
            productKey: row.product_key,
            labelI18nKey: row.label_i18n_key,
            capabilityKeys: bundleCapabilityRows
                .filter((x) => x.bundle_key === row.key)
                .map((x) => x.capability_key),
        }));
        const packRows = this.db.prepare(`
            SELECT *
            FROM sys_sector_packs
            ORDER BY key
        `).all();
        const packBundleRows = this.db.prepare(`
            SELECT sector_pack_key, bundle_key
            FROM sys_sector_pack_bundles
            ORDER BY sector_pack_key, bundle_key
        `).all();
        const packCapabilityRows = this.db.prepare(`
            SELECT sector_pack_key, capability_key
            FROM sys_sector_pack_capabilities
            ORDER BY sector_pack_key, capability_key
        `).all();
        const sectorPacks = packRows.map((row) => ({
            key: row.key,
            labelI18nKey: row.label_i18n_key,
            bundleKeys: packBundleRows.filter((x) => x.sector_pack_key === row.key).map((x) => x.bundle_key),
            capabilityKeys: packCapabilityRows.filter((x) => x.sector_pack_key === row.key).map((x) => x.capability_key),
            reportTemplateKeys: this.tryParseStringArray(row.report_template_keys),
            printTemplateKeys: this.tryParseStringArray(row.print_template_keys),
            policyTemplateKeys: this.tryParseStringArray(row.policy_template_keys),
        }));
        return {
            capabilities: Array.from(capabilityMap.values()),
            bundles,
            sectorPacks,
        };
    }
    getAclVersions(companyId = 'COMP_01', branchId = 'BR_01') {
        const normalizedCompanyId = this.normalizeScope(companyId, 'COMP_01');
        const normalizedBranchId = this.normalizeScope(branchId, 'BR_01');
        this.db.prepare(`
            INSERT OR IGNORE INTO acl_versions (company_id, version, acl_version, updated_at)
            VALUES (?, 1, 1, CURRENT_TIMESTAMP)
        `).run(normalizedCompanyId);
        this.db.prepare(`
            INSERT OR IGNORE INTO branch_acl_versions (company_id, branch_id, version, acl_version, updated_at)
            VALUES (?, ?, 1, 1, CURRENT_TIMESTAMP)
        `).run(normalizedCompanyId, normalizedBranchId);
        const companyRow = this.db.prepare(`
            SELECT COALESCE(version, acl_version, 1) AS version
            FROM acl_versions
            WHERE company_id = ?
        `).get(normalizedCompanyId);
        const branchRow = this.db.prepare(`
            SELECT COALESCE(version, acl_version, 1) AS version
            FROM branch_acl_versions
            WHERE company_id = ? AND branch_id = ?
        `).get(normalizedCompanyId, normalizedBranchId);
        return {
            companyAclVersion: Number(companyRow?.version || 1),
            branchAclVersion: Number(branchRow?.version || 1),
        };
    }
    bumpCompanyAclVersion(companyId = 'COMP_01') {
        const normalizedCompanyId = this.normalizeScope(companyId, 'COMP_01');
        this.db.prepare(`
            INSERT INTO acl_versions (company_id, version, acl_version, updated_at)
            VALUES (?, 1, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(company_id) DO UPDATE SET
                version = COALESCE(version, acl_version, 1) + 1,
                acl_version = COALESCE(acl_version, version, 1) + 1,
                updated_at = CURRENT_TIMESTAMP
        `).run(normalizedCompanyId);
        return this.getAclVersions(normalizedCompanyId).companyAclVersion;
    }
    bumpBranchAclVersion(companyId = 'COMP_01', branchId = 'BR_01') {
        const normalizedCompanyId = this.normalizeScope(companyId, 'COMP_01');
        const normalizedBranchId = this.normalizeScope(branchId, 'BR_01');
        this.db.prepare(`
            INSERT INTO branch_acl_versions (company_id, branch_id, version, acl_version, updated_at)
            VALUES (?, ?, 1, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(company_id, branch_id) DO UPDATE SET
                version = COALESCE(version, acl_version, 1) + 1,
                acl_version = COALESCE(acl_version, version, 1) + 1,
                updated_at = CURRENT_TIMESTAMP
        `).run(normalizedCompanyId, normalizedBranchId);
        return this.getAclVersions(normalizedCompanyId, normalizedBranchId).branchAclVersion;
    }
    // Backward compatibility wrappers.
    getVersion(companyId = 'COMP_01') {
        return this.getAclVersions(companyId).companyAclVersion;
    }
    bumpVersion(companyId = 'COMP_01') {
        return this.bumpCompanyAclVersion(companyId);
    }
    getUserById(userId) {
        if (!userId)
            return null;
        return this.db.prepare(`
            SELECT id, username, role_id, branch_id
            FROM users
            WHERE id = ? AND is_active = 1
            LIMIT 1
        `).get(userId) || null;
    }
    getFallbackUser() {
        return this.db.prepare(`
            SELECT id, username, role_id, branch_id
            FROM users
            WHERE is_active = 1
            ORDER BY created_at ASC
            LIMIT 1
        `).get() || null;
    }
    getRolePermissions(roleId) {
        if (!roleId)
            return [];
        const capabilityRows = this.db.prepare(`
            SELECT capability_key AS permission_key
            FROM role_permissions
            WHERE role_id = ?
        `).all(roleId);
        if (capabilityRows.length) {
            return capabilityRows.map(r => r.permission_key).filter(Boolean);
        }
        const rows = this.db.prepare(`
            SELECT permission_key
            FROM permissions
            WHERE role_id = ?
        `).all(roleId);
        return rows.map(r => r.permission_key).filter(Boolean);
    }
    getRolePermissionsByRoleIds(roleIds) {
        const ids = Array.from(new Set((roleIds || []).map((x) => String(x || '').trim()).filter(Boolean)));
        if (!ids.length)
            return [];
        const placeholders = ids.map(() => '?').join(', ');
        try {
            const rows = this.db.prepare(`
                SELECT capability_key AS permission_key
                FROM role_permissions
                WHERE role_id IN (${placeholders})
                UNION
                SELECT permission_key
                FROM permissions
                WHERE role_id IN (${placeholders})
            `).all(...ids, ...ids);
            return Array.from(new Set(rows.map((r) => String(r.permission_key || '').trim()).filter(Boolean)));
        }
        catch {
            const rows = this.db.prepare(`
                SELECT capability_key AS permission_key
                FROM role_permissions
                WHERE role_id IN (${placeholders})
            `).all(...ids);
            return Array.from(new Set(rows.map((r) => String(r.permission_key || '').trim()).filter(Boolean)));
        }
    }
    getUserAssignedRoleIds(params) {
        const companyId = this.normalizeScope(params.companyId, 'COMP_01');
        const branchId = this.normalizeScope(params.branchId, 'BR_01');
        const userId = String(params.userId || '').trim();
        if (!userId)
            return [];
        const rows = this.db.prepare(`
            SELECT role_id
            FROM user_role_assignments
            WHERE company_id = @companyId
              AND user_id = @userId
              AND is_active = 1
              AND (branch_id IS NULL OR branch_id = @branchId)
              AND (valid_from IS NULL OR datetime(valid_from) <= CURRENT_TIMESTAMP)
              AND (valid_to IS NULL OR datetime(valid_to) >= CURRENT_TIMESTAMP)
            ORDER BY CASE WHEN branch_id IS NULL THEN 1 ELSE 0 END, updated_at DESC
        `).all({
            companyId,
            branchId,
            userId,
        });
        return Array.from(new Set(rows.map((r) => String(r.role_id || '').trim()).filter(Boolean)));
    }
    getRoleCapabilitiesByRoleIds(roleIds) {
        const ids = Array.from(new Set((roleIds || []).map((x) => String(x || '').trim()).filter(Boolean)));
        if (!ids.length)
            return [];
        const placeholders = ids.map(() => '?').join(', ');
        const rows = this.db.prepare(`
            SELECT capability_key
            FROM role_permissions
            WHERE role_id IN (${placeholders})
              AND effect = 'ALLOW'
        `).all(...ids);
        const capabilities = rows.map((r) => String(r.capability_key || '').trim()).filter(Boolean);
        if (capabilities.includes('ALL') || capabilities.includes('*.*')) {
            return this.getAllCapabilityKeys();
        }
        return Array.from(new Set(capabilities));
    }
    getCriteriaRulesByCapabilities(params) {
        const result = {};
        const companyId = this.normalizeScope(params.companyId, 'COMP_01');
        const branchId = this.normalizeScope(params.branchId, 'BR_01');
        const keys = Array.from(new Set((params.capabilityKeys || []).filter(Boolean)));
        if (!keys.length)
            return result;
        const placeholders = keys.map(() => '?').join(', ');
        const rows = this.db.prepare(`
            SELECT capability_key, effect, predicate_json, priority
            FROM criteria_rules
            WHERE company_id = ?
              AND (branch_id IS NULL OR branch_id = ?)
              AND capability_key IN (${placeholders})
              AND is_active = 1
            ORDER BY priority ASC, created_at ASC
        `).all(companyId, branchId, ...keys);
        for (const row of rows) {
            const key = row.capability_key;
            if (!result[key])
                result[key] = [];
            result[key].push({
                effect: row.effect,
                priority: row.priority,
                predicateJson: row.predicate_json,
            });
        }
        return result;
    }
    getScopedRoleCapabilitiesByRoleIds(roleIds, companyId, branchId) {
        const ids = Array.from(new Set((roleIds || []).map((x) => String(x || '').trim()).filter(Boolean)));
        if (!ids.length)
            return [];
        const placeholders = ids.map(() => '?').join(', ');
        const rows = this.db.prepare(`
            SELECT capability_key
            FROM sys_role_capabilities
            WHERE role_id IN (${placeholders})
              AND (scope_company_id IS NULL OR scope_company_id = ?)
              AND (scope_branch_id IS NULL OR scope_branch_id = ?)
        `).all(...ids, companyId, branchId);
        return Array.from(new Set(rows.map((r) => String(r.capability_key || '').trim()).filter(Boolean)));
    }
    getScopedRoleBundlesByRoleIds(roleIds, companyId, branchId) {
        const ids = Array.from(new Set((roleIds || []).map((x) => String(x || '').trim()).filter(Boolean)));
        if (!ids.length)
            return [];
        const placeholders = ids.map(() => '?').join(', ');
        const rows = this.db.prepare(`
            SELECT bundle_key
            FROM sys_role_bundles
            WHERE role_id IN (${placeholders})
              AND (scope_company_id IS NULL OR scope_company_id = ?)
              AND (scope_branch_id IS NULL OR scope_branch_id = ?)
        `).all(...ids, companyId, branchId);
        return Array.from(new Set(rows.map((r) => String(r.bundle_key || '').trim()).filter(Boolean)));
    }
    getScopedRoleCapabilities(roleId, companyId, branchId) {
        if (!roleId)
            return [];
        const rows = this.db.prepare(`
            SELECT capability_key
            FROM sys_role_capabilities
            WHERE role_id = ?
              AND (scope_company_id IS NULL OR scope_company_id = ?)
              AND (scope_branch_id IS NULL OR scope_branch_id = ?)
        `).all(roleId, companyId, branchId);
        return rows.map(r => r.capability_key).filter(Boolean);
    }
    getScopedRoleBundles(roleId, companyId, branchId) {
        if (!roleId)
            return [];
        const rows = this.db.prepare(`
            SELECT bundle_key
            FROM sys_role_bundles
            WHERE role_id = ?
              AND (scope_company_id IS NULL OR scope_company_id = ?)
              AND (scope_branch_id IS NULL OR scope_branch_id = ?)
        `).all(roleId, companyId, branchId);
        return rows.map(r => r.bundle_key).filter(Boolean);
    }
    expandBundleCapabilities(bundleKeys) {
        const uniqueKeys = Array.from(new Set(bundleKeys.filter(Boolean)));
        if (!uniqueKeys.length)
            return [];
        const placeholders = uniqueKeys.map(() => '?').join(', ');
        const rows = this.db.prepare(`
            SELECT capability_key
            FROM sys_bundle_capabilities
            WHERE bundle_key IN (${placeholders})
        `).all(...uniqueKeys);
        return rows.map(r => r.capability_key).filter(Boolean);
    }
    capabilitiesFromPermissions(permissionKeys) {
        const uniqueKeys = Array.from(new Set((permissionKeys || []).filter(Boolean)));
        if (!uniqueKeys.length)
            return [];
        if (uniqueKeys.includes('ALL') || uniqueKeys.includes('*.*')) {
            return this.getAllCapabilityKeys();
        }
        const placeholders = uniqueKeys.map(() => '?').join(', ');
        const rows = this.db.prepare(`
            SELECT DISTINCT capability_key
            FROM sys_capability_permissions
            WHERE permission_key IN (${placeholders})
        `).all(...uniqueKeys);
        return rows.map(r => r.capability_key).filter(Boolean);
    }
    getAllCapabilityKeys() {
        const rows = this.db.prepare(`
            SELECT capability_key AS key
            FROM capability_registry
            WHERE is_active = 1
            UNION
            SELECT key
            FROM sys_capabilities
            ORDER BY key
        `).all();
        return rows.map(r => r.key).filter(Boolean);
    }
    getFieldRules(capabilityKeys) {
        const result = {};
        const keys = Array.from(new Set((capabilityKeys || []).filter(Boolean)));
        if (!keys.length)
            return result;
        const placeholders = keys.map(() => '?').join(', ');
        const rows = this.db.prepare(`
            SELECT capability_key, field_key, criteria, effect
            FROM sys_capability_field_rules
            WHERE capability_key IN (${placeholders})
        `).all(...keys);
        for (const row of rows) {
            const list = result[row.capability_key] || [];
            list.push({
                fieldKey: row.field_key,
                criteria: row.criteria,
                effect: row.effect,
            });
            result[row.capability_key] = list;
        }
        return result;
    }
    getPolicyGuards(capabilityKeys) {
        const result = {};
        const keys = Array.from(new Set((capabilityKeys || []).filter(Boolean)));
        if (!keys.length)
            return result;
        const placeholders = keys.map(() => '?').join(', ');
        const rows = this.db.prepare(`
            SELECT capability_key, guard_key, config_json
            FROM sys_capability_policy_guards
            WHERE capability_key IN (${placeholders})
        `).all(...keys);
        for (const row of rows) {
            const list = result[row.capability_key] || [];
            list.push({
                guardKey: row.guard_key,
                config: row.config_json ? JSON.parse(row.config_json) : undefined,
            });
            result[row.capability_key] = list;
        }
        return result;
    }
    getRoleAssignments(roleId, scope) {
        const whereScope = this.buildScopeWhere(scope);
        const capabilityRows = this.db.prepare(`
            SELECT capability_key, scope_company_id, scope_branch_id, criteria_json
            FROM sys_role_capabilities
            WHERE role_id = @roleId
            ${whereScope.sql}
            ORDER BY capability_key
        `).all({
            roleId,
            companyId: scope?.companyId || null,
            branchId: scope?.branchId || null,
        });
        const bundleRows = this.db.prepare(`
            SELECT bundle_key, scope_company_id, scope_branch_id, criteria_json
            FROM sys_role_bundles
            WHERE role_id = @roleId
            ${whereScope.sql}
            ORDER BY bundle_key
        `).all({
            roleId,
            companyId: scope?.companyId || null,
            branchId: scope?.branchId || null,
        });
        return {
            roleId,
            capabilities: capabilityRows.map((r) => ({
                capabilityKey: r.capability_key,
                companyId: r.scope_company_id || undefined,
                branchId: r.scope_branch_id || undefined,
                criteria: r.criteria_json || undefined,
            })),
            bundles: bundleRows.map((r) => ({
                bundleKey: r.bundle_key,
                companyId: r.scope_company_id || undefined,
                branchId: r.scope_branch_id || undefined,
                criteria: r.criteria_json || undefined,
            })),
        };
    }
    saveRoleAssignments(input) {
        const companyId = this.cleanScope(input.companyId);
        const branchId = this.cleanScope(input.branchId);
        const deleteCapabilities = this.db.prepare(`
            DELETE FROM sys_role_capabilities
            WHERE role_id = @roleId
              AND COALESCE(scope_company_id, '') = COALESCE(@companyId, '')
              AND COALESCE(scope_branch_id, '') = COALESCE(@branchId, '')
        `);
        const deleteBundles = this.db.prepare(`
            DELETE FROM sys_role_bundles
            WHERE role_id = @roleId
              AND COALESCE(scope_company_id, '') = COALESCE(@companyId, '')
              AND COALESCE(scope_branch_id, '') = COALESCE(@branchId, '')
        `);
        const insertCapability = this.db.prepare(`
            INSERT INTO sys_role_capabilities (
                id, role_id, capability_key, scope_company_id, scope_branch_id, criteria_json, created_at, updated_at
            ) VALUES (
                @id, @roleId, @capabilityKey, @companyId, @branchId, @criteriaJson, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        `);
        const insertBundle = this.db.prepare(`
            INSERT INTO sys_role_bundles (
                id, role_id, bundle_key, scope_company_id, scope_branch_id, criteria_json, created_at, updated_at
            ) VALUES (
                @id, @roleId, @bundleKey, @companyId, @branchId, @criteriaJson, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        `);
        const transaction = this.db.transaction(() => {
            deleteCapabilities.run({ roleId: input.roleId, companyId, branchId });
            deleteBundles.run({ roleId: input.roleId, companyId, branchId });
            for (const capabilityKey of new Set(input.capabilities || [])) {
                insertCapability.run({
                    id: (0, uuid_1.v4)(),
                    roleId: input.roleId,
                    capabilityKey,
                    companyId,
                    branchId,
                    criteriaJson: input.criteriaByCapability?.[capabilityKey] || null,
                });
            }
            for (const bundleKey of new Set(input.bundles || [])) {
                insertBundle.run({
                    id: (0, uuid_1.v4)(),
                    roleId: input.roleId,
                    bundleKey,
                    companyId,
                    branchId,
                    criteriaJson: null,
                });
            }
        });
        transaction();
        const effectiveCompanyId = companyId || 'COMP_01';
        if (branchId) {
            this.bumpBranchAclVersion(effectiveCompanyId, branchId);
            return this.getAclVersions(effectiveCompanyId, branchId).branchAclVersion;
        }
        return this.bumpCompanyAclVersion(effectiveCompanyId);
    }
    cleanScope(value) {
        const raw = String(value || '').trim();
        return raw ? raw : null;
    }
    buildScopeWhere(scope) {
        if (!scope?.companyId && !scope?.branchId) {
            return { sql: '' };
        }
        if (scope.companyId && !scope.branchId) {
            return { sql: ` AND (scope_company_id = @companyId)` };
        }
        if (!scope.companyId && scope.branchId) {
            return { sql: ` AND (scope_branch_id = @branchId)` };
        }
        return {
            sql: `
              AND (scope_company_id = @companyId)
              AND (scope_branch_id = @branchId)
            `,
        };
    }
    tryParseStringArray(value) {
        if (!value)
            return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map(v => String(v)) : [];
        }
        catch {
            return [];
        }
    }
    normalizeScope(value, fallback) {
        const raw = String(value || '').trim();
        return raw || fallback;
    }
}
exports.SqlitePermissionEngineRepo = SqlitePermissionEngineRepo;
