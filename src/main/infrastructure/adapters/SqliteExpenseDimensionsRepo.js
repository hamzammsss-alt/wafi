"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteExpenseDimensionsRepo = void 0;
const errors_1 = require("../../domain/errors");
const EXPENSE_TYPE_SEED = [
    { id: 'exp_type_fuel', code: 'FUEL', name: 'Fuel' },
    { id: 'exp_type_maintenance', code: 'MAINTENANCE', name: 'Maintenance' },
    { id: 'exp_type_insurance', code: 'INSURANCE', name: 'Insurance' },
    { id: 'exp_type_license', code: 'LICENSE', name: 'License' },
    { id: 'exp_type_parking', code: 'PARKING', name: 'Parking' },
    { id: 'exp_type_cleaning', code: 'CLEANING', name: 'Cleaning' },
    { id: 'exp_type_fines', code: 'FINES', name: 'Fines' },
    { id: 'exp_type_other', code: 'OTHER', name: 'Other' },
];
const COST_CENTER_SEED = [
    { id: 'cc_logistics', code: 'LOGISTICS', name: 'Logistics', parentId: null },
    { id: 'cc_sales', code: 'SALES', name: 'Sales', parentId: null },
    { id: 'cc_admin', code: 'ADMIN', name: 'Administration', parentId: null },
    { id: 'cc_warehouse', code: 'WAREHOUSE', name: 'Warehouse', parentId: null },
];
class SqliteExpenseDimensionsRepo {
    constructor(db) {
        this.db = db;
        this.ensureSchema();
        this.hasExpenseTypeCompanyId = this.hasColumn('expense_types', 'company_id');
        this.hasCostCenterCompanyId = this.hasColumn('cost_centers', 'company_id');
        this.hasVehicleCompanyId = this.hasColumn('vehicles', 'company_id');
        this.seedDefaults();
    }
    async listExpenseTypes(companyId, query) {
        const includeInactive = query.includeInactive ? 1 : 0;
        const search = String(query.search || '').trim();
        const like = `%${search}%`;
        const companyClause = this.hasExpenseTypeCompanyId
            ? `AND COALESCE(NULLIF(company_id, ''), @companyId) = @companyId`
            : '';
        const rows = this.db
            .prepare(`
                SELECT
                    id,
                    UPPER(COALESCE(NULLIF(code, ''), REPLACE(NULLIF(name, ''), ' ', '_'))) AS code,
                    COALESCE(NULLIF(name, ''), NULLIF(name_en, ''), NULLIF(name_ar, ''), 'Other') AS name,
                    COALESCE(is_active, 1) AS is_active,
                    COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at
                FROM expense_types
                WHERE (@includeInactive = 1 OR COALESCE(is_active, 1) = 1)
                  ${companyClause}
                  AND (
                    @search = ''
                    OR UPPER(COALESCE(code, '')) LIKE UPPER(@like)
                    OR UPPER(COALESCE(name, name_en, name_ar, '')) LIKE UPPER(@like)
                  )
                ORDER BY code ASC, name ASC
                `)
            .all({
            companyId,
            includeInactive,
            search,
            like,
        });
        return rows.map((row) => ({
            id: String(row.id),
            code: String(row.code || '').trim(),
            name: String(row.name || '').trim(),
            isActive: Number(row.is_active ?? 1) === 1,
            createdAt: String(row.created_at || ''),
        }));
    }
    async listCostCenters(companyId, query) {
        const includeInactive = query.includeInactive ? 1 : 0;
        const search = String(query.search || '').trim();
        const like = `%${search}%`;
        const companyClause = this.hasCostCenterCompanyId
            ? `AND COALESCE(NULLIF(company_id, ''), @companyId) = @companyId`
            : '';
        const rows = this.db
            .prepare(`
                SELECT
                    id,
                    UPPER(COALESCE(code, '')) AS code,
                    COALESCE(NULLIF(name, ''), NULLIF(name_en, ''), NULLIF(name_ar, ''), code) AS name,
                    parent_id,
                    COALESCE(is_active, 1) AS is_active
                FROM cost_centers
                WHERE (@includeInactive = 1 OR COALESCE(is_active, 1) = 1)
                  ${companyClause}
                  AND (
                    @search = ''
                    OR UPPER(COALESCE(code, '')) LIKE UPPER(@like)
                    OR UPPER(COALESCE(name, name_en, name_ar, '')) LIKE UPPER(@like)
                  )
                ORDER BY code ASC, name ASC
                `)
            .all({
            companyId,
            includeInactive,
            search,
            like,
        });
        return rows.map((row) => ({
            id: String(row.id),
            code: String(row.code || '').trim(),
            name: String(row.name || '').trim(),
            parentId: row.parent_id ? String(row.parent_id) : null,
            isActive: Number(row.is_active ?? 1) === 1,
        }));
    }
    async listVehicles(companyId, query) {
        const includeInactive = query.includeInactive ? 1 : 0;
        const search = String(query.search || '').trim();
        const like = `%${search}%`;
        const companyClause = this.hasVehicleCompanyId
            ? `AND COALESCE(NULLIF(company_id, ''), @companyId) = @companyId`
            : '';
        const rows = this.db
            .prepare(`
                SELECT
                    id,
                    COALESCE(NULLIF(name, ''), NULLIF(vehicle_code, ''), NULLIF(brand, ''), NULLIF(model, ''), NULLIF(plate_no, ''), 'Vehicle') AS name,
                    COALESCE(plate_no, '') AS plate_no,
                    NULLIF(model, '') AS model,
                    NULLIF(department, '') AS department,
                    COALESCE(is_active, 1) AS is_active
                FROM vehicles
                WHERE (@includeInactive = 1 OR COALESCE(is_active, 1) = 1)
                  ${companyClause}
                  AND (
                    @search = ''
                    OR UPPER(COALESCE(name, '')) LIKE UPPER(@like)
                    OR UPPER(COALESCE(plate_no, '')) LIKE UPPER(@like)
                    OR UPPER(COALESCE(model, '')) LIKE UPPER(@like)
                    OR UPPER(COALESCE(department, '')) LIKE UPPER(@like)
                  )
                ORDER BY plate_no ASC, name ASC
                `)
            .all({
            companyId,
            includeInactive,
            search,
            like,
        });
        return rows.map((row) => ({
            id: String(row.id),
            name: String(row.name || '').trim(),
            plateNo: String(row.plate_no || '').trim(),
            model: row.model ? String(row.model).trim() : null,
            department: row.department ? String(row.department).trim() : null,
            isActive: Number(row.is_active ?? 1) === 1,
        }));
    }
    async validateJournalLineDimensions(companyId, dimensions) {
        await this.assertRecordIsActive(companyId, 'branches', dimensions.branchId, 'branch_id');
        await this.assertRecordIsActive(companyId, 'cost_centers', dimensions.costCenterId, 'cost_center_id');
        await this.assertRecordIsActive(companyId, 'expense_types', dimensions.expenseTypeId, 'expense_type_id');
        await this.assertRecordIsActive(companyId, 'vehicles', dimensions.vehicleId, 'vehicle_id');
        await this.assertRecordIsActive(companyId, 'business_partners', dimensions.partnerId, 'partner_id');
        if (dimensions.projectId) {
            if (!this.tableExists('projects')) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Project dimension table is not configured', {
                    messageKey: 'error.dimension.project.not_configured',
                    details: { projectId: dimensions.projectId },
                });
            }
            await this.assertRecordIsActive(companyId, 'projects', dimensions.projectId, 'project_id');
        }
    }
    async getVehicleExpenseReport(companyId, query) {
        const rows = this.db
            .prepare(`
                SELECT
                    v.id AS vehicle_id,
                    COALESCE(NULLIF(v.name, ''), NULLIF(v.vehicle_code, ''), NULLIF(v.plate_no, ''), 'Vehicle') AS vehicle_name,
                    COALESCE(v.plate_no, '') AS plate_no,
                    NULLIF(v.department, '') AS department,
                    SUM(COALESCE(jl.debit, 0)) AS total_debit,
                    SUM(COALESCE(jl.credit, 0)) AS total_credit,
                    SUM(COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0)) AS net_amount
                FROM journal_lines jl
                INNER JOIN vehicles v ON v.id = jl.vehicle_id
                LEFT JOIN journals j ON j.id = COALESCE(NULLIF(jl.journal_id, ''), NULLIF(jl.entry_id, ''))
                WHERE jl.vehicle_id IS NOT NULL
                  AND TRIM(jl.vehicle_id) <> ''
                  AND (@dateFrom IS NULL OR j.date >= @dateFrom)
                  AND (@dateTo IS NULL OR j.date <= @dateTo)
                  AND (@branchId IS NULL OR jl.branch_id = @branchId)
                  AND (@companyId = '' OR COALESCE(j.company_id, @companyId) = @companyId)
                GROUP BY v.id, vehicle_name, plate_no, department
                ORDER BY vehicle_name ASC
                `)
            .all({
            companyId,
            dateFrom: this.normalizeNullable(query.dateFrom),
            dateTo: this.normalizeNullable(query.dateTo),
            branchId: this.normalizeNullable(query.branchId),
        });
        return rows.map((row) => ({
            vehicleId: String(row.vehicle_id),
            vehicleName: String(row.vehicle_name || ''),
            plateNo: String(row.plate_no || ''),
            department: row.department ? String(row.department) : null,
            totalDebit: this.toNumber(row.total_debit),
            totalCredit: this.toNumber(row.total_credit),
            netAmount: this.toNumber(row.net_amount),
        }));
    }
    async getExpenseTypeReport(companyId, query) {
        const rows = this.db
            .prepare(`
                SELECT
                    et.id AS expense_type_id,
                    UPPER(COALESCE(NULLIF(et.code, ''), REPLACE(COALESCE(et.name, ''), ' ', '_'))) AS expense_type_code,
                    COALESCE(NULLIF(et.name, ''), NULLIF(et.name_en, ''), NULLIF(et.name_ar, ''), 'Other') AS expense_type_name,
                    SUM(COALESCE(jl.debit, 0)) AS total_debit,
                    SUM(COALESCE(jl.credit, 0)) AS total_credit,
                    SUM(COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0)) AS net_amount
                FROM journal_lines jl
                INNER JOIN expense_types et ON et.id = jl.expense_type_id
                LEFT JOIN journals j ON j.id = COALESCE(NULLIF(jl.journal_id, ''), NULLIF(jl.entry_id, ''))
                WHERE jl.expense_type_id IS NOT NULL
                  AND TRIM(jl.expense_type_id) <> ''
                  AND (@dateFrom IS NULL OR j.date >= @dateFrom)
                  AND (@dateTo IS NULL OR j.date <= @dateTo)
                  AND (@branchId IS NULL OR jl.branch_id = @branchId)
                  AND (@companyId = '' OR COALESCE(j.company_id, @companyId) = @companyId)
                GROUP BY et.id, expense_type_code, expense_type_name
                ORDER BY expense_type_code ASC
                `)
            .all({
            companyId,
            dateFrom: this.normalizeNullable(query.dateFrom),
            dateTo: this.normalizeNullable(query.dateTo),
            branchId: this.normalizeNullable(query.branchId),
        });
        return rows.map((row) => ({
            expenseTypeId: String(row.expense_type_id),
            expenseTypeCode: String(row.expense_type_code || ''),
            expenseTypeName: String(row.expense_type_name || ''),
            totalDebit: this.toNumber(row.total_debit),
            totalCredit: this.toNumber(row.total_credit),
            netAmount: this.toNumber(row.net_amount),
        }));
    }
    async getCostCenterExpenseReport(companyId, query) {
        const rows = this.db
            .prepare(`
                SELECT
                    cc.id AS cost_center_id,
                    UPPER(COALESCE(cc.code, '')) AS cost_center_code,
                    COALESCE(NULLIF(cc.name, ''), NULLIF(cc.name_en, ''), NULLIF(cc.name_ar, ''), cc.code) AS cost_center_name,
                    cc.parent_id AS parent_id,
                    SUM(COALESCE(jl.debit, 0)) AS total_debit,
                    SUM(COALESCE(jl.credit, 0)) AS total_credit,
                    SUM(COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0)) AS net_amount
                FROM journal_lines jl
                INNER JOIN cost_centers cc ON cc.id = jl.cost_center_id
                LEFT JOIN journals j ON j.id = COALESCE(NULLIF(jl.journal_id, ''), NULLIF(jl.entry_id, ''))
                WHERE jl.cost_center_id IS NOT NULL
                  AND TRIM(jl.cost_center_id) <> ''
                  AND (@dateFrom IS NULL OR j.date >= @dateFrom)
                  AND (@dateTo IS NULL OR j.date <= @dateTo)
                  AND (@branchId IS NULL OR jl.branch_id = @branchId)
                  AND (@companyId = '' OR COALESCE(j.company_id, @companyId) = @companyId)
                GROUP BY cc.id, cost_center_code, cost_center_name, cc.parent_id
                ORDER BY cost_center_code ASC
                `)
            .all({
            companyId,
            dateFrom: this.normalizeNullable(query.dateFrom),
            dateTo: this.normalizeNullable(query.dateTo),
            branchId: this.normalizeNullable(query.branchId),
        });
        return rows.map((row) => ({
            costCenterId: String(row.cost_center_id),
            costCenterCode: String(row.cost_center_code || ''),
            costCenterName: String(row.cost_center_name || ''),
            parentId: row.parent_id ? String(row.parent_id) : null,
            totalDebit: this.toNumber(row.total_debit),
            totalCredit: this.toNumber(row.total_credit),
            netAmount: this.toNumber(row.net_amount),
        }));
    }
    ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS expense_types (
                id TEXT PRIMARY KEY,
                code TEXT,
                name TEXT,
                name_en TEXT,
                name_ar TEXT,
                company_id TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cost_centers (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                name TEXT,
                name_en TEXT,
                name_ar TEXT,
                company_id TEXT,
                parent_id TEXT,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (parent_id) REFERENCES cost_centers(id)
            );

            CREATE TABLE IF NOT EXISTS vehicles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                vehicle_code TEXT,
                brand TEXT,
                plate_no TEXT NOT NULL,
                model TEXT,
                department TEXT,
                company_id TEXT,
                is_active INTEGER DEFAULT 1
            );
        `);
        this.safeAddColumn('expense_types', 'name', 'TEXT');
        this.safeAddColumn('expense_types', 'code', 'TEXT');
        this.safeAddColumn('expense_types', 'name_en', 'TEXT');
        this.safeAddColumn('expense_types', 'name_ar', 'TEXT');
        this.safeAddColumn('expense_types', 'company_id', 'TEXT');
        this.safeAddColumn('expense_types', 'is_active', 'INTEGER DEFAULT 1');
        this.safeAddColumn('expense_types', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        this.safeAddColumn('cost_centers', 'name', 'TEXT');
        this.safeAddColumn('cost_centers', 'code', 'TEXT');
        this.safeAddColumn('cost_centers', 'name_en', 'TEXT');
        this.safeAddColumn('cost_centers', 'name_ar', 'TEXT');
        this.safeAddColumn('cost_centers', 'company_id', 'TEXT');
        this.safeAddColumn('cost_centers', 'parent_id', 'TEXT');
        this.safeAddColumn('cost_centers', 'is_active', 'INTEGER DEFAULT 1');
        this.safeAddColumn('vehicles', 'name', 'TEXT');
        this.safeAddColumn('vehicles', 'vehicle_code', 'TEXT');
        this.safeAddColumn('vehicles', 'brand', 'TEXT');
        this.safeAddColumn('vehicles', 'plate_no', 'TEXT');
        this.safeAddColumn('vehicles', 'model', 'TEXT');
        this.safeAddColumn('vehicles', 'department', 'TEXT');
        this.safeAddColumn('vehicles', 'company_id', 'TEXT');
        this.safeAddColumn('vehicles', 'is_active', 'INTEGER DEFAULT 1');
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_expense_types_code_dim
            ON expense_types(code);
            CREATE INDEX IF NOT EXISTS idx_expense_types_company_dim
            ON expense_types(company_id);
            CREATE INDEX IF NOT EXISTS idx_cost_centers_code_dim
            ON cost_centers(code);
            CREATE INDEX IF NOT EXISTS idx_cost_centers_company_dim
            ON cost_centers(company_id);
            CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_dim
            ON cost_centers(parent_id);
            CREATE INDEX IF NOT EXISTS idx_vehicles_plate_dim
            ON vehicles(plate_no);
            CREATE INDEX IF NOT EXISTS idx_vehicles_company_dim
            ON vehicles(company_id);
        `);
    }
    seedDefaults() {
        const insertExpenseType = this.db.prepare(`
            INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
            VALUES (@id, @code, @name, @name, @name, 1)
        `);
        const selectExpenseType = this.db.prepare(`
            SELECT id, code, name, name_ar, name_en
            FROM expense_types
            WHERE UPPER(COALESCE(code, '')) = @code
               OR UPPER(COALESCE(name, '')) = @name
               OR UPPER(COALESCE(name_ar, '')) = @name
               OR UPPER(COALESCE(name_en, '')) = @name
            LIMIT 1
        `);
        for (const seed of EXPENSE_TYPE_SEED) {
            const existing = selectExpenseType.get({
                code: seed.code,
                name: seed.name.toUpperCase(),
            });
            if (!existing) {
                insertExpenseType.run(seed);
                continue;
            }
            if (!existing.code || !String(existing.code).trim()) {
                this.db
                    .prepare('UPDATE expense_types SET code = ? WHERE id = ?')
                    .run(seed.code, existing.id);
            }
            if (!existing.name || !String(existing.name).trim()) {
                this.db
                    .prepare('UPDATE expense_types SET name = ? WHERE id = ?')
                    .run(seed.name, existing.id);
            }
            if (!existing.name_ar || !String(existing.name_ar).trim()) {
                this.db
                    .prepare('UPDATE expense_types SET name_ar = ? WHERE id = ?')
                    .run(seed.name, existing.id);
            }
            if (!existing.name_en || !String(existing.name_en).trim()) {
                this.db
                    .prepare('UPDATE expense_types SET name_en = ? WHERE id = ?')
                    .run(seed.name, existing.id);
            }
        }
        const insertCostCenter = this.db.prepare(`
            INSERT INTO cost_centers (id, code, name, name_ar, name_en, parent_id, is_active)
            VALUES (@id, @code, @name, @name, @name, @parentId, 1)
        `);
        const selectCostCenter = this.db.prepare(`
            SELECT id, code, name, name_ar, name_en
            FROM cost_centers
            WHERE UPPER(COALESCE(code, '')) = @code
               OR UPPER(COALESCE(name, '')) = @name
               OR UPPER(COALESCE(name_ar, '')) = @name
               OR UPPER(COALESCE(name_en, '')) = @name
            LIMIT 1
        `);
        for (const seed of COST_CENTER_SEED) {
            const existing = selectCostCenter.get({
                code: seed.code,
                name: seed.name.toUpperCase(),
            });
            if (!existing) {
                insertCostCenter.run(seed);
                continue;
            }
            if (!existing.code || !String(existing.code).trim()) {
                this.db
                    .prepare('UPDATE cost_centers SET code = ? WHERE id = ?')
                    .run(seed.code, existing.id);
            }
            if (!existing.name || !String(existing.name).trim()) {
                this.db
                    .prepare('UPDATE cost_centers SET name = ? WHERE id = ?')
                    .run(seed.name, existing.id);
            }
            if (!existing.name_ar || !String(existing.name_ar).trim()) {
                this.db
                    .prepare('UPDATE cost_centers SET name_ar = ? WHERE id = ?')
                    .run(seed.name, existing.id);
            }
            if (!existing.name_en || !String(existing.name_en).trim()) {
                this.db
                    .prepare('UPDATE cost_centers SET name_en = ? WHERE id = ?')
                    .run(seed.name, existing.id);
            }
        }
    }
    async assertRecordIsActive(companyId, tableName, id, fieldName) {
        const normalizedId = this.normalizeNullable(id);
        if (!normalizedId)
            return;
        if (!this.tableExists(tableName)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', `Dimension table ${tableName} is not configured`, {
                messageKey: `error.dimension.${tableName}.not_configured`,
                details: { fieldName, id: normalizedId },
            });
        }
        const hasIsActive = this.hasColumn(tableName, 'is_active');
        const hasCompanyId = this.hasColumn(tableName, 'company_id');
        const companyClause = hasCompanyId
            ? 'AND COALESCE(NULLIF(company_id, \'\'), @companyId) = @companyId'
            : '';
        const activeClause = hasIsActive
            ? 'AND COALESCE(is_active, 1) = 1'
            : '';
        const row = this.db
            .prepare(`
                SELECT id
                FROM ${tableName}
                WHERE id = @id
                ${companyClause}
                ${activeClause}
                LIMIT 1
                `)
            .get({
            id: normalizedId,
            companyId,
        });
        if (!row) {
            throw new errors_1.DomainError('VALIDATION_ERROR', `Invalid or inactive ${fieldName}`, {
                messageKey: `error.dimension.${fieldName}.invalid_or_inactive`,
                details: { fieldName, id: normalizedId },
            });
        }
    }
    hasColumn(tableName, columnName) {
        if (!this.tableExists(tableName))
            return false;
        const cols = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        return cols.some((column) => column.name === columnName);
    }
    tableExists(tableName) {
        const row = this.db
            .prepare(`
                SELECT 1
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = ?
                LIMIT 1
                `)
            .get(tableName);
        return Boolean(row);
    }
    safeAddColumn(tableName, columnName, definition) {
        if (this.hasColumn(tableName, columnName)) {
            return;
        }
        this.db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
    }
    normalizeNullable(value) {
        const normalized = String(value || '').trim();
        return normalized || null;
    }
    toNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}
exports.SqliteExpenseDimensionsRepo = SqliteExpenseDimensionsRepo;
