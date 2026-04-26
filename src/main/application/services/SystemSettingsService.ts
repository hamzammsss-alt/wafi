import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
    DEFAULT_SETTING_GROUPS,
    DEFAULT_SETTINGS,
    SettingDefinitionSeed,
    SettingInputType,
    SettingValueType,
} from '../../domain/settings/SettingsCatalog';
import { AuditService } from './AuditService';

export type SettingsScopeInput = {
    companyId?: string | null;
    branchId?: string | null;
    userId?: string | null;
};

type SettingsContext = {
    companyId?: string | null;
    branchId?: string | null;
    userId?: string | null;
    sessionId?: string | null;
    correlationId?: string | null;
    ipcid?: string | null;
};

type SettingRow = {
    key: string;
    value?: string | null;
    group_id?: string | null;
    group_code?: string | null;
    group_name_ar?: string | null;
    group_name_en?: string | null;
    label_ar?: string | null;
    label_en?: string | null;
    description_ar?: string | null;
    description_en?: string | null;
    value_type?: SettingValueType | string | null;
    input_type?: SettingInputType | string | null;
    default_value?: string | null;
    options_json?: string | null;
    validation_json?: string | null;
    scope?: string | null;
    sort_order?: number | null;
    is_required?: number | null;
    is_active?: number | null;
    is_sensitive?: number | null;
    needs_review?: number | null;
    metadata_json?: string | null;
    updated_at?: string | null;
};

type SettingValueRow = {
    id: string;
    setting_key: string;
    company_id: string;
    branch_id?: string | null;
    user_id?: string | null;
    value?: string | null;
    updated_by?: string | null;
    updated_at?: string | null;
};

const DEFAULT_COMPANY_ID = 'COMP_01';
const BOOLEAN_TRUE = new Set(['1', 'TRUE', 'YES', 'ON', 'ENABLED']);
const BOOLEAN_FALSE = new Set(['0', 'FALSE', 'NO', 'OFF', 'DISABLED']);

function normalizeText(value: unknown, fallback = ''): string {
    const text = String(value ?? '').trim();
    return text || fallback;
}

function safeJson(value: unknown): string | null {
    if (value === undefined) return null;
    try {
        return JSON.stringify(value ?? null);
    } catch {
        return JSON.stringify(String(value));
    }
}

function parseJson<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) return fallback;
    const text = String(value);
    if (!text.trim()) return fallback;
    try {
        return JSON.parse(text) as T;
    } catch {
        return fallback;
    }
}

function serializeDefaultValue(valueType: SettingValueType, value: unknown): string {
    if (valueType === 'json' || valueType === 'table') return safeJson(value) || 'null';
    if (valueType === 'boolean') return value ? 'true' : 'false';
    return String(value ?? '');
}

export class SystemSettingsService {
    private readonly db: Database.Database;
    private readonly auditService: AuditService | null;

    constructor(database: Database.Database, auditService?: AuditService | null) {
        this.db = database;
        this.auditService = auditService || null;
        this.ensureSchema();
        this.seedDefaults();
    }

    getAll(ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        const scope = this.resolveScope(ctx, scopeInput);
        const rows = this.getDefinitionRows();
        const values = this.getResolvedValues(rows, scope);
        const groups = this.getGroupRows();

        return {
            scope,
            groups: groups.map((group) => ({
                code: group.code,
                nameAr: group.name_ar,
                nameEn: group.name_en,
                descriptionAr: group.description_ar || '',
                descriptionEn: group.description_en || '',
                sortOrder: Number(group.sort_order || 0),
                settings: rows
                    .filter((row) => row.group_code === group.code)
                    .map((row) => this.mapSetting(row, values.get(row.key))),
            })),
            flatValues: Object.fromEntries(rows.map((row) => [row.key, values.get(row.key)?.parsedValue])),
            needsReview: rows
                .filter((row) => Number(row.needs_review || 0) === 1)
                .map((row) => ({
                    key: row.key,
                    groupCode: row.group_code,
                    labelAr: row.label_ar || row.key,
                    labelEn: row.label_en || row.key,
                })),
        };
    }

    getSection(sectionCode: string, ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        const normalizedSection = normalizeText(sectionCode);
        if (!normalizedSection) {
            throw this.validationError('settings.section_required', 'Section is required');
        }

        const all = this.getAll(ctx, scopeInput);
        const group = all.groups.find((item: any) => item.code === normalizedSection);
        if (!group) {
            throw this.validationError('settings.section_not_found', `Settings section not found: ${normalizedSection}`);
        }

        return {
            scope: all.scope,
            group,
        };
    }

    putSection(sectionCode: string, values: Record<string, unknown>, ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        const normalizedSection = normalizeText(sectionCode);
        const definitionRows = this.getDefinitionRows().filter((row) => row.group_code === normalizedSection);
        if (!definitionRows.length) {
            throw this.validationError('settings.section_not_found', `Settings section not found: ${normalizedSection}`);
        }

        const allowed = new Set(definitionRows.map((row) => row.key));
        const incoming = values || {};
        const updates: Array<{ key: string; value: unknown }> = [];

        for (const [key, value] of Object.entries(incoming)) {
            if (!allowed.has(key)) {
                throw this.validationError('settings.key_not_in_section', `Setting ${key} does not belong to ${normalizedSection}`);
            }
            updates.push({ key, value });
        }

        const result = this.updateMany(updates, ctx, scopeInput);
        return {
            ...result,
            section: this.getSection(normalizedSection, ctx, scopeInput),
        };
    }

    patchKey(key: string, value: unknown, ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        const result = this.updateMany([{ key, value }], ctx, scopeInput);
        return {
            ...result,
            setting: this.getSetting(key, ctx, scopeInput),
        };
    }

    getSetting(key: string, ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        const normalizedKey = normalizeText(key);
        const row = this.getDefinitionRow(normalizedKey);
        if (!row) {
            throw this.validationError('settings.key_not_found', `Setting not found: ${normalizedKey}`);
        }

        const scope = this.resolveScope(ctx, scopeInput);
        const values = this.getResolvedValues([row], scope);
        return this.mapSetting(row, values.get(row.key));
    }

    getLegacySettingsMap(ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        const all = this.getAll(ctx, scopeInput);
        return all.flatValues;
    }

    getLegacySettingsRows(ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        const all = this.getAll(ctx, scopeInput);
        return all.groups.flatMap((group: any) =>
            group.settings.map((setting: any) => ({
                key: setting.key,
                value: this.serializeForStorage(setting.valueType, setting.value),
                group: group.code,
                label_ar: setting.labelAr,
                label_en: setting.labelEn,
            })),
        );
    }

    saveLegacySettings(values: Record<string, unknown>, ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        const incoming = values || {};
        const updates: Array<{ key: string; value: unknown }> = [];

        for (const [key, value] of Object.entries(incoming)) {
            this.ensureAdHocSetting(key, value);
            updates.push({ key, value });
        }

        return this.updateMany(updates, ctx, scopeInput);
    }

    saveLegacySetting(key: string, value: unknown, ctx: SettingsContext = {}, scopeInput: SettingsScopeInput = {}) {
        this.ensureAdHocSetting(key, value);
        return this.patchKey(key, value, ctx, scopeInput);
    }

    listAuditLogs(limit = 200) {
        return this.db.prepare(`
            SELECT *
            FROM setting_audit_logs
            ORDER BY created_at DESC, id DESC
            LIMIT ?
        `).all(Math.max(1, Math.min(Number(limit || 200), 1000)));
    }

    private updateMany(updates: Array<{ key: string; value: unknown }>, ctx: SettingsContext, scopeInput: SettingsScopeInput) {
        const scope = this.resolveScope(ctx, scopeInput);
        const changed: Array<{
            key: string;
            sectionCode: string;
            oldValue: unknown;
            newValue: unknown;
        }> = [];

        const run = this.db.transaction(() => {
            for (const update of updates) {
                const key = normalizeText(update.key);
                const row = this.getDefinitionRow(key);
                if (!row) {
                    throw this.validationError('settings.key_not_found', `Setting not found: ${key}`);
                }

                const oldResolved = this.getResolvedValues([row], scope).get(row.key);
                const oldStorageValue = oldResolved?.storageValue ?? '';
                const newStorageValue = this.serializeForStorage(String(row.value_type || 'string') as SettingValueType, update.value);
                const parsedNewValue = this.parseStorageValue(String(row.value_type || 'string') as SettingValueType, newStorageValue);
                this.validateValue(row, parsedNewValue);

                if (oldStorageValue === newStorageValue) continue;

                this.upsertSettingValue(row.key, newStorageValue, scope, ctx);
                if (!scope.branchId && !scope.userId) {
                    this.syncLegacyValue(row.key, newStorageValue);
                }
                this.insertSettingsAudit(row, oldStorageValue, newStorageValue, scope, ctx);

                changed.push({
                    key: row.key,
                    sectionCode: String(row.group_code || ''),
                    oldValue: this.parseStorageValue(String(row.value_type || 'string') as SettingValueType, oldStorageValue),
                    newValue: parsedNewValue,
                });
            }
        });

        run();
        this.recordAuditEvents(changed, scope, ctx);

        return {
            success: true,
            scope,
            changedCount: changed.length,
            changed,
        };
    }

    private ensureSchema() {
        this.db.exec(`
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
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        `);

        this.ensureColumn('settings', 'group_id', 'TEXT');
        this.ensureColumn('settings', 'label_ar', 'TEXT');
        this.ensureColumn('settings', 'label_en', 'TEXT');
        this.ensureColumn('settings', 'description_ar', 'TEXT');
        this.ensureColumn('settings', 'description_en', 'TEXT');
        this.ensureColumn('settings', 'value_type', "TEXT DEFAULT 'string'");
        this.ensureColumn('settings', 'input_type', "TEXT DEFAULT 'text'");
        this.ensureColumn('settings', 'default_value', 'TEXT');
        this.ensureColumn('settings', 'options_json', 'TEXT');
        this.ensureColumn('settings', 'validation_json', 'TEXT');
        this.ensureColumn('settings', 'scope', "TEXT DEFAULT 'company'");
        this.ensureColumn('settings', 'sort_order', 'INTEGER DEFAULT 0');
        this.ensureColumn('settings', 'is_required', 'INTEGER DEFAULT 0');
        this.ensureColumn('settings', 'is_active', 'INTEGER DEFAULT 1');
        this.ensureColumn('settings', 'is_sensitive', 'INTEGER DEFAULT 0');
        this.ensureColumn('settings', 'needs_review', 'INTEGER DEFAULT 0');
        this.ensureColumn('settings', 'metadata_json', 'TEXT');
        this.ensureColumn('settings', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_settings_group_sort
                ON settings(group_id, sort_order);
        `);
    }

    private ensureColumn(table: string, column: string, definition: string) {
        const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
        if (!columns.some((item) => item.name === column)) {
            this.db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
        }
    }

    private seedDefaults() {
        const insertGroup = this.db.prepare(`
            INSERT INTO settings_groups (
                id, code, name_ar, name_en, description_ar, description_en, sort_order, is_active, updated_at
            ) VALUES (
                @id, @code, @nameAr, @nameEn, @descriptionAr, @descriptionEn, @sortOrder, 1, CURRENT_TIMESTAMP
            )
            ON CONFLICT(code) DO UPDATE SET
                name_ar = excluded.name_ar,
                name_en = excluded.name_en,
                description_ar = excluded.description_ar,
                description_en = excluded.description_en,
                sort_order = excluded.sort_order,
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
        `);

        const run = this.db.transaction(() => {
            for (const group of DEFAULT_SETTING_GROUPS) {
                insertGroup.run({
                    id: uuidv4(),
                    code: group.code,
                    nameAr: group.nameAr,
                    nameEn: group.nameEn,
                    descriptionAr: group.descriptionAr || '',
                    descriptionEn: group.descriptionEn || '',
                    sortOrder: group.sortOrder,
                });
            }

            for (const definition of DEFAULT_SETTINGS) {
                this.upsertDefinition(definition);
            }
        });

        run();
    }

    private upsertDefinition(definition: SettingDefinitionSeed) {
        const group = this.db.prepare('SELECT id FROM settings_groups WHERE code = ? LIMIT 1').get(definition.groupCode) as { id?: string } | undefined;
        if (!group?.id) return;

        const defaultValue = serializeDefaultValue(definition.valueType, definition.defaultValue);
        const existing = this.db.prepare('SELECT key, value FROM settings WHERE key = ? LIMIT 1').get(definition.key) as { key?: string; value?: string | null } | undefined;

        if (!existing) {
            this.db.prepare(`
                INSERT INTO settings (
                    key, value, group_id, label_ar, label_en, description_ar, description_en,
                    value_type, input_type, default_value, options_json, validation_json, scope,
                    sort_order, is_required, is_active, is_sensitive, needs_review, metadata_json,
                    created_at, updated_at
                ) VALUES (
                    @key, @value, @groupId, @labelAr, @labelEn, @descriptionAr, @descriptionEn,
                    @valueType, @inputType, @defaultValue, @optionsJson, @validationJson, @scope,
                    @sortOrder, @isRequired, 1, @isSensitive, @needsReview, @metadataJson,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            `).run(this.mapDefinitionParams(definition, group.id, defaultValue, defaultValue));
            return;
        }

        const nextValue = normalizeText(existing.value).length > 0 ? existing.value : defaultValue;
        this.db.prepare(`
            UPDATE settings
            SET
                value = @value,
                group_id = @groupId,
                label_ar = @labelAr,
                label_en = @labelEn,
                description_ar = @descriptionAr,
                description_en = @descriptionEn,
                value_type = @valueType,
                input_type = @inputType,
                default_value = @defaultValue,
                options_json = @optionsJson,
                validation_json = @validationJson,
                scope = @scope,
                sort_order = @sortOrder,
                is_required = @isRequired,
                is_active = 1,
                is_sensitive = @isSensitive,
                needs_review = @needsReview,
                metadata_json = @metadataJson,
                updated_at = CURRENT_TIMESTAMP
            WHERE key = @key
        `).run(this.mapDefinitionParams(definition, group.id, defaultValue, nextValue));
    }

    private mapDefinitionParams(definition: SettingDefinitionSeed, groupId: string, defaultValue: string, currentValue: string | null | undefined) {
        return {
            key: definition.key,
            value: currentValue ?? defaultValue,
            groupId,
            labelAr: definition.labelAr,
            labelEn: definition.labelEn,
            descriptionAr: definition.descriptionAr || '',
            descriptionEn: definition.descriptionEn || '',
            valueType: definition.valueType,
            inputType: definition.inputType,
            defaultValue,
            optionsJson: safeJson(definition.options || []),
            validationJson: safeJson(definition.validation || {}),
            scope: definition.scope || 'company',
            sortOrder: definition.sortOrder || 0,
            isRequired: definition.isRequired ? 1 : 0,
            isSensitive: definition.isSensitive ? 1 : 0,
            needsReview: definition.needsReview ? 1 : 0,
            metadataJson: safeJson(definition.metadata || {}),
        };
    }

    private ensureAdHocSetting(key: string, value: unknown) {
        const normalizedKey = normalizeText(key);
        if (!normalizedKey) return;
        if (this.getDefinitionRow(normalizedKey)) return;

        const group = this.db.prepare('SELECT id FROM settings_groups WHERE code = ? LIMIT 1').get('general') as { id?: string } | undefined;
        const groupId = group?.id || uuidv4();
        const valueType = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';
        const storage = this.serializeForStorage(valueType, value);

        this.db.prepare(`
            INSERT OR IGNORE INTO settings (
                key, value, group_id, label_ar, label_en, value_type, input_type, default_value,
                scope, sort_order, is_required, is_active, is_sensitive, needs_review,
                metadata_json, created_at, updated_at
            ) VALUES (
                @key, @value, @groupId, @label, @label, @valueType, @inputType, @value,
                'company', 9999, 0, 1, 0, 1, @metadataJson, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        `).run({
            key: normalizedKey,
            value: storage,
            groupId,
            label: normalizedKey,
            valueType,
            inputType: valueType === 'boolean' ? 'toggle' : valueType === 'number' ? 'number' : 'text',
            metadataJson: safeJson({ adHoc: true }),
        });
    }

    private getGroupRows() {
        return this.db.prepare(`
            SELECT *
            FROM settings_groups
            WHERE is_active = 1
            ORDER BY sort_order ASC, name_ar ASC
        `).all() as Array<Record<string, any>>;
    }

    private getDefinitionRows(): SettingRow[] {
        return this.db.prepare(`
            SELECT
                s.*,
                g.code AS group_code,
                g.name_ar AS group_name_ar,
                g.name_en AS group_name_en
            FROM settings s
            LEFT JOIN settings_groups g ON g.id = s.group_id
            WHERE COALESCE(s.is_active, 1) = 1
            ORDER BY COALESCE(g.sort_order, 9999), COALESCE(s.sort_order, 9999), s.key
        `).all() as SettingRow[];
    }

    private getDefinitionRow(key: string): SettingRow | null {
        const row = this.db.prepare(`
            SELECT
                s.*,
                g.code AS group_code,
                g.name_ar AS group_name_ar,
                g.name_en AS group_name_en
            FROM settings s
            LEFT JOIN settings_groups g ON g.id = s.group_id
            WHERE s.key = ?
            LIMIT 1
        `).get(key) as SettingRow | undefined;

        return row || null;
    }

    private getResolvedValues(rows: SettingRow[], scope: Required<SettingsScopeInput>): Map<string, { storageValue: string; parsedValue: unknown; source: string; row?: SettingValueRow }> {
        const result = new Map<string, { storageValue: string; parsedValue: unknown; source: string; row?: SettingValueRow }>();

        for (const row of rows) {
            const override = this.getBestValueOverride(row.key, scope);
            const storageValue = override?.value ?? row.value ?? row.default_value ?? '';
            const valueType = String(row.value_type || 'string') as SettingValueType;
            result.set(row.key, {
                storageValue: String(storageValue ?? ''),
                parsedValue: this.parseStorageValue(valueType, storageValue),
                source: override ? this.getOverrideSource(override) : 'default',
                row: override || undefined,
            });
        }

        return result;
    }

    private getBestValueOverride(key: string, scope: Required<SettingsScopeInput>): SettingValueRow | null {
        const branchId = scope.branchId || null;
        const userId = scope.userId || null;
        const rows = this.db.prepare(`
            SELECT *
            FROM setting_values
            WHERE setting_key = @key
              AND company_id = @companyId
              AND (branch_id IS NULL OR branch_id = @branchId)
              AND (user_id IS NULL OR user_id = @userId)
            ORDER BY
              CASE WHEN user_id = @userId AND @userId IS NOT NULL THEN 1 ELSE 0 END DESC,
              CASE WHEN branch_id = @branchId AND @branchId IS NOT NULL THEN 1 ELSE 0 END DESC,
              updated_at DESC
            LIMIT 1
        `).get({
            key,
            companyId: scope.companyId,
            branchId,
            userId,
        }) as SettingValueRow | undefined;

        return rows || null;
    }

    private getOverrideSource(row: SettingValueRow): string {
        if (row.user_id) return 'user';
        if (row.branch_id) return 'branch';
        return 'company';
    }

    private mapSetting(row: SettingRow, valueInfo?: { storageValue: string; parsedValue: unknown; source: string; row?: SettingValueRow }) {
        const valueType = String(row.value_type || 'string') as SettingValueType;
        return {
            key: row.key,
            groupCode: row.group_code || '',
            labelAr: row.label_ar || row.key,
            labelEn: row.label_en || row.key,
            descriptionAr: row.description_ar || '',
            descriptionEn: row.description_en || '',
            valueType,
            inputType: String(row.input_type || 'text') as SettingInputType,
            value: valueInfo?.parsedValue ?? this.parseStorageValue(valueType, row.value ?? row.default_value ?? ''),
            rawValue: valueInfo?.storageValue ?? row.value ?? row.default_value ?? '',
            defaultValue: this.parseStorageValue(valueType, row.default_value ?? ''),
            options: parseJson(row.options_json, []),
            validation: parseJson(row.validation_json, {}),
            scope: row.scope || 'company',
            sortOrder: Number(row.sort_order || 0),
            isRequired: Number(row.is_required || 0) === 1,
            isSensitive: Number(row.is_sensitive || 0) === 1,
            needsReview: Number(row.needs_review || 0) === 1,
            metadata: parseJson(row.metadata_json, {}),
            source: valueInfo?.source || 'default',
            updatedAt: valueInfo?.row?.updated_at || row.updated_at || null,
        };
    }

    private upsertSettingValue(key: string, storageValue: string, scope: Required<SettingsScopeInput>, ctx: SettingsContext) {
        const branchId = scope.branchId || null;
        const userId = scope.userId || null;
        const existing = this.db.prepare(`
            SELECT id
            FROM setting_values
            WHERE setting_key = @key
              AND company_id = @companyId
              AND COALESCE(branch_id, '') = COALESCE(@branchId, '')
              AND COALESCE(user_id, '') = COALESCE(@userId, '')
            LIMIT 1
        `).get({
            key,
            companyId: scope.companyId,
            branchId,
            userId,
        }) as { id?: string } | undefined;

        if (existing?.id) {
            this.db.prepare(`
                UPDATE setting_values
                SET value = @value,
                    updated_by = @updatedBy,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `).run({
                id: existing.id,
                value: storageValue,
                updatedBy: ctx.userId || 'SYSTEM',
            });
            return;
        }

        this.db.prepare(`
            INSERT INTO setting_values (
                id, setting_key, company_id, branch_id, user_id, value, updated_by, created_at, updated_at
            ) VALUES (
                @id, @key, @companyId, @branchId, @userId, @value, @updatedBy, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        `).run({
            id: uuidv4(),
            key,
            companyId: scope.companyId,
            branchId,
            userId,
            value: storageValue,
            updatedBy: ctx.userId || 'SYSTEM',
        });
    }

    private syncLegacyValue(key: string, storageValue: string) {
        this.db.prepare(`
            UPDATE settings
            SET value = @value,
                updated_at = CURRENT_TIMESTAMP
            WHERE key = @key
        `).run({
            key,
            value: storageValue,
        });
    }

    private insertSettingsAudit(row: SettingRow, oldValue: string, newValue: string, scope: Required<SettingsScopeInput>, ctx: SettingsContext) {
        this.db.prepare(`
            INSERT INTO setting_audit_logs (
                id, setting_key, section_code, company_id, branch_id, user_id, changed_by,
                old_value, new_value, created_at
            ) VALUES (
                @id, @settingKey, @sectionCode, @companyId, @branchId, @userId, @changedBy,
                @oldValue, @newValue, CURRENT_TIMESTAMP
            )
        `).run({
            id: uuidv4(),
            settingKey: row.key,
            sectionCode: row.group_code || '',
            companyId: scope.companyId,
            branchId: scope.branchId || null,
            userId: scope.userId || null,
            changedBy: ctx.userId || 'SYSTEM',
            oldValue,
            newValue,
        });
    }

    private recordAuditEvents(changed: Array<{ key: string; sectionCode: string; oldValue: unknown; newValue: unknown }>, scope: Required<SettingsScopeInput>, ctx: SettingsContext) {
        if (!this.auditService || !changed.length) return;

        for (const change of changed) {
            try {
                this.auditService.recordEvent(
                    {
                        companyId: scope.companyId,
                        branchId: scope.branchId || ctx.branchId || null,
                        userId: normalizeText(ctx.userId, 'SYSTEM'),
                        sessionId: ctx.sessionId || null,
                        correlationId: ctx.correlationId || null,
                        ipcid: ctx.ipcid || null,
                    },
                    {
                        entityType: 'settings',
                        entityId: change.key,
                        docType: null,
                        docId: null,
                        eventType: 'settings.update',
                        summaryI18nKey: 'audit.event.settings.update',
                        correlationId: ctx.correlationId || null,
                        ipcid: ctx.ipcid || null,
                        meta: {
                            action: 'update',
                            module: 'settings',
                            scope: {
                                companyId: scope.companyId,
                                branchId: scope.branchId || null,
                                userId: scope.userId || null,
                            },
                            settingKey: change.key,
                            section: change.sectionCode,
                        } as any,
                    },
                    [
                        {
                            fieldPath: change.key,
                            oldValue: change.oldValue,
                            newValue: change.newValue,
                        },
                    ],
                );
            } catch (error) {
                console.warn('[SettingsService] Audit event failed:', error);
            }
        }
    }

    private resolveScope(ctx: SettingsContext, scopeInput: SettingsScopeInput): Required<SettingsScopeInput> {
        return {
            companyId: normalizeText(scopeInput.companyId, normalizeText(ctx.companyId, DEFAULT_COMPANY_ID)),
            branchId: normalizeText(scopeInput.branchId, ''),
            userId: normalizeText(scopeInput.userId, ''),
        };
    }

    private serializeForStorage(valueType: SettingValueType | string, value: unknown): string {
        if (valueType === 'boolean') {
            if (typeof value === 'string') {
                const normalized = value.trim().toUpperCase();
                if (BOOLEAN_FALSE.has(normalized)) return 'false';
                if (BOOLEAN_TRUE.has(normalized)) return 'true';
            }
            return value ? 'true' : 'false';
        }

        if (valueType === 'number') {
            if (value === null || value === undefined || value === '') return '';
            const numeric = Number(value);
            if (Number.isNaN(numeric)) {
                throw this.validationError('settings.number_invalid', 'Value must be numeric');
            }
            return String(numeric);
        }

        if (valueType === 'json' || valueType === 'table') {
            if (typeof value === 'string') {
                const text = value.trim();
                if (!text) return valueType === 'table' ? '[]' : '{}';
                try {
                    JSON.parse(text);
                    return text;
                } catch {
                    throw this.validationError('settings.json_invalid', 'Value must be valid JSON');
                }
            }
            return safeJson(value) || (valueType === 'table' ? '[]' : '{}');
        }

        return String(value ?? '');
    }

    private parseStorageValue(valueType: SettingValueType, value: unknown): unknown {
        if (valueType === 'boolean') {
            const normalized = String(value ?? '').trim().toUpperCase();
            if (BOOLEAN_FALSE.has(normalized)) return false;
            if (BOOLEAN_TRUE.has(normalized)) return true;
            return Boolean(value);
        }

        if (valueType === 'number') {
            const text = String(value ?? '').trim();
            if (!text) return '';
            const numeric = Number(text);
            return Number.isNaN(numeric) ? '' : numeric;
        }

        if (valueType === 'json') return parseJson(value, {});
        if (valueType === 'table') return parseJson(value, []);

        return String(value ?? '');
    }

    private validateValue(row: SettingRow, value: unknown) {
        const validation = parseJson<Record<string, any>>(row.validation_json, {});
        const valueType = String(row.value_type || 'string') as SettingValueType;
        const label = row.label_ar || row.key;

        if (Number(row.is_required || 0) === 1) {
            const missing =
                value === null ||
                value === undefined ||
                (typeof value === 'string' && !value.trim()) ||
                (Array.isArray(value) && value.length === 0);
            if (missing) {
                throw this.validationError('settings.required', `${label} is required`, { key: row.key });
            }
        }

        if (valueType === 'number' && value !== '') {
            const numeric = Number(value);
            if (Number.isNaN(numeric)) {
                throw this.validationError('settings.number_invalid', `${label} must be numeric`, { key: row.key });
            }
            if (validation.min !== undefined && numeric < Number(validation.min)) {
                throw this.validationError('settings.number_min', `${label} is below minimum`, { key: row.key, min: validation.min });
            }
            if (validation.max !== undefined && numeric > Number(validation.max)) {
                throw this.validationError('settings.number_max', `${label} is above maximum`, { key: row.key, max: validation.max });
            }
        }

        if ((valueType === 'string' || valueType === 'select') && typeof value === 'string') {
            if (validation.maxLength !== undefined && value.length > Number(validation.maxLength)) {
                throw this.validationError('settings.max_length', `${label} is too long`, { key: row.key, maxLength: validation.maxLength });
            }
            if (validation.pattern) {
                const pattern = new RegExp(String(validation.pattern));
                if (value && !pattern.test(value)) {
                    throw this.validationError('settings.pattern', `${label} format is invalid`, { key: row.key });
                }
            }
        }

        if (valueType === 'select') {
            const options = parseJson<Array<{ value: string }>>(row.options_json, []);
            if (options.length && !options.some((option) => option.value === String(value))) {
                throw this.validationError('settings.option_invalid', `${label} option is invalid`, { key: row.key });
            }
        }

        if (valueType === 'table' && !Array.isArray(value)) {
            throw this.validationError('settings.table_invalid', `${label} must be a table`, { key: row.key });
        }
    }

    private validationError(messageKey: string, message: string, details?: Record<string, unknown>) {
        return {
            code: 'VALIDATION_ERROR',
            messageKey,
            message,
            details,
        };
    }
}
