"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteManufacturingRepo = void 0;
const crypto_1 = require("crypto");
const TRUE_VALUES = new Set(['1', 'TRUE', 'YES', 'ON', 'ENABLED']);
class SqliteManufacturingRepo {
    constructor(db) {
        this.db = db;
        this.tableColumnsCache = new Map();
        this.tableExistsCache = new Map();
        this.ensureSchema();
    }
    ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS mfg_bom_headers (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                version_no INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                is_default INTEGER NOT NULL DEFAULT 0,
                output_qty REAL NOT NULL DEFAULT 1,
                effective_from TEXT,
                effective_to TEXT,
                remarks TEXT,
                created_by TEXT NOT NULL,
                approved_by TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mfg_bom_lines (
                id TEXT PRIMARY KEY,
                bom_id TEXT NOT NULL,
                line_no INTEGER NOT NULL,
                component_item_id TEXT NOT NULL,
                warehouse_id TEXT,
                qty_per REAL NOT NULL DEFAULT 0,
                scrap_percent REAL NOT NULL DEFAULT 0,
                issue_method TEXT NOT NULL DEFAULT 'MANUAL',
                remarks TEXT,
                FOREIGN KEY (bom_id) REFERENCES mfg_bom_headers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_routing_headers (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                version_no INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                is_default INTEGER NOT NULL DEFAULT 0,
                remarks TEXT,
                created_by TEXT NOT NULL,
                approved_by TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mfg_routing_steps (
                id TEXT PRIMARY KEY,
                routing_id TEXT NOT NULL,
                step_no INTEGER NOT NULL,
                work_center_code TEXT NOT NULL,
                operation_code TEXT NOT NULL,
                setup_time_minutes REAL NOT NULL DEFAULT 0,
                run_time_minutes REAL NOT NULL DEFAULT 0,
                labor_cost_rate REAL NOT NULL DEFAULT 0,
                machine_cost_rate REAL NOT NULL DEFAULT 0,
                remarks TEXT,
                FOREIGN KEY (routing_id) REFERENCES mfg_routing_headers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_production_orders (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                order_no TEXT NOT NULL,
                order_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                item_id TEXT NOT NULL,
                bom_id TEXT,
                routing_id TEXT,
                warehouse_id TEXT NOT NULL,
                qty_planned REAL NOT NULL DEFAULT 0,
                qty_started REAL NOT NULL DEFAULT 0,
                qty_completed REAL NOT NULL DEFAULT 0,
                qty_scrapped REAL NOT NULL DEFAULT 0,
                qty_issued REAL NOT NULL DEFAULT 0,
                material_cost_issued REAL NOT NULL DEFAULT 0,
                labor_cost_estimated REAL NOT NULL DEFAULT 0,
                machine_cost_estimated REAL NOT NULL DEFAULT 0,
                cost_capitalized REAL NOT NULL DEFAULT 0,
                total_wip_cost REAL NOT NULL DEFAULT 0,
                unit_cost_completed REAL NOT NULL DEFAULT 0,
                reference_no TEXT,
                remarks TEXT,
                project_id TEXT,
                cost_center_id TEXT,
                created_by TEXT NOT NULL,
                approved_by TEXT,
                source_doc_type TEXT,
                source_doc_id TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mfg_production_order_components (
                id TEXT PRIMARY KEY,
                production_order_id TEXT NOT NULL,
                line_no INTEGER NOT NULL,
                component_item_id TEXT NOT NULL,
                warehouse_id TEXT,
                qty_required REAL NOT NULL DEFAULT 0,
                qty_issued REAL NOT NULL DEFAULT 0,
                qty_returned REAL NOT NULL DEFAULT 0,
                issue_method TEXT NOT NULL DEFAULT 'MANUAL',
                unit_cost REAL,
                total_cost REAL,
                remarks TEXT,
                FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_production_order_operations (
                id TEXT PRIMARY KEY,
                production_order_id TEXT NOT NULL,
                step_no INTEGER NOT NULL,
                work_center_code TEXT NOT NULL,
                operation_code TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                setup_time_minutes REAL NOT NULL DEFAULT 0,
                run_time_minutes REAL NOT NULL DEFAULT 0,
                labor_cost_rate REAL NOT NULL DEFAULT 0,
                machine_cost_rate REAL NOT NULL DEFAULT 0,
                FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_production_issues (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                issue_no TEXT NOT NULL,
                issue_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                production_order_id TEXT NOT NULL,
                reference_no TEXT,
                remarks TEXT,
                created_by TEXT NOT NULL,
                approved_by TEXT,
                version INTEGER NOT NULL DEFAULT 1,
                journal_id TEXT,
                reversal_journal_id TEXT,
                posted_at TEXT,
                posted_by TEXT,
                reversed_at TEXT,
                reversed_by TEXT,
                stock_posted_at TEXT,
                stock_reversed_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_production_issue_lines (
                id TEXT PRIMARY KEY,
                issue_id TEXT NOT NULL,
                line_no INTEGER NOT NULL,
                component_line_id TEXT,
                component_item_id TEXT NOT NULL,
                warehouse_id TEXT NOT NULL,
                qty REAL NOT NULL DEFAULT 0,
                unit_cost REAL NOT NULL DEFAULT 0,
                total_cost REAL NOT NULL DEFAULT 0,
                remarks TEXT,
                FOREIGN KEY (issue_id) REFERENCES mfg_production_issues(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_production_receipts (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                receipt_no TEXT NOT NULL,
                receipt_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT',
                production_order_id TEXT NOT NULL,
                reference_no TEXT,
                remarks TEXT,
                created_by TEXT NOT NULL,
                approved_by TEXT,
                version INTEGER NOT NULL DEFAULT 1,
                journal_id TEXT,
                reversal_journal_id TEXT,
                posted_at TEXT,
                posted_by TEXT,
                reversed_at TEXT,
                reversed_by TEXT,
                stock_posted_at TEXT,
                stock_reversed_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_production_receipt_lines (
                id TEXT PRIMARY KEY,
                receipt_id TEXT NOT NULL,
                line_no INTEGER NOT NULL,
                item_id TEXT NOT NULL,
                warehouse_id TEXT NOT NULL,
                qty_received REAL NOT NULL DEFAULT 0,
                qty_scrapped REAL NOT NULL DEFAULT 0,
                unit_cost REAL NOT NULL DEFAULT 0,
                total_cost REAL NOT NULL DEFAULT 0,
                remarks TEXT,
                FOREIGN KEY (receipt_id) REFERENCES mfg_production_receipts(id) ON DELETE CASCADE
            );
        `);
        this.ensureLegacyCompatibility();
        this.ensureManufacturingIndexes();
        this.clearTableCache();
    }
    clearTableCache() {
        this.tableColumnsCache.clear();
        this.tableExistsCache.clear();
    }
    toSqlIdentifier(raw) {
        const value = String(raw || '').trim().toLowerCase();
        if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
            throw new Error(`Invalid SQL identifier: ${raw}`);
        }
        return value;
    }
    tableExists(tableName) {
        const key = this.toSqlIdentifier(tableName);
        if (this.tableExistsCache.has(key)) {
            return Boolean(this.tableExistsCache.get(key));
        }
        const row = this.db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND LOWER(name) = ?
            LIMIT 1
        `).get(key);
        const exists = Boolean(row?.name);
        this.tableExistsCache.set(key, exists);
        return exists;
    }
    getTableColumns(tableName) {
        const key = this.toSqlIdentifier(tableName);
        const cached = this.tableColumnsCache.get(key);
        if (cached)
            return cached;
        const columns = new Set();
        if (!this.tableExists(key)) {
            this.tableColumnsCache.set(key, columns);
            return columns;
        }
        const rows = this.db.prepare(`PRAGMA table_info(${key})`).all();
        for (const row of rows) {
            const name = String(row?.name || '').trim().toLowerCase();
            if (name)
                columns.add(name);
        }
        this.tableColumnsCache.set(key, columns);
        return columns;
    }
    hasColumn(tableName, columnName) {
        const col = this.toSqlIdentifier(columnName);
        return this.getTableColumns(tableName).has(col);
    }
    ensureColumn(tableName, columnName, ddl) {
        const table = this.toSqlIdentifier(tableName);
        const column = this.toSqlIdentifier(columnName);
        if (!this.tableExists(table))
            return;
        if (this.hasColumn(table, column))
            return;
        this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
        this.clearTableCache();
    }
    tryExec(sql) {
        try {
            this.db.exec(sql);
        }
        catch {
            // Legacy databases can carry historical duplicates/incompatible states.
            // Skip non-critical compatibility/index statements during bootstrap.
        }
    }
    ensureLegacyCompatibility() {
        this.ensureBomHeaderCompatibility();
        this.ensureBomLineCompatibility();
        this.ensureRoutingHeaderCompatibility();
        this.ensureRoutingStepCompatibility();
        this.ensureProductionOrderCompatibility();
        this.seedModernBomsFromLegacyCatalog();
        this.seedModernRoutingsFromLegacyCatalog();
        this.seedModernOrderComponentsFromLegacyInputs();
        this.ensureStockLedgerCompatibility();
    }
    ensureBomHeaderCompatibility() {
        if (!this.tableExists('mfg_bom_headers'))
            return;
        this.ensureColumn('mfg_bom_headers', 'item_id', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_bom_headers', 'version_no', 'INTEGER DEFAULT 1');
        this.ensureColumn('mfg_bom_headers', 'is_default', 'INTEGER DEFAULT 0');
        this.ensureColumn('mfg_bom_headers', 'output_qty', 'REAL DEFAULT 1');
        this.ensureColumn('mfg_bom_headers', 'effective_from', 'TEXT');
        this.ensureColumn('mfg_bom_headers', 'effective_to', 'TEXT');
        this.ensureColumn('mfg_bom_headers', 'remarks', 'TEXT');
        this.ensureColumn('mfg_bom_headers', 'created_by', "TEXT DEFAULT 'system'");
        this.ensureColumn('mfg_bom_headers', 'approved_by', 'TEXT');
        this.ensureColumn('mfg_bom_headers', 'updated_at', 'TEXT');
        if (this.hasColumn('mfg_bom_headers', 'product_id')) {
            this.tryExec(`
                UPDATE mfg_bom_headers
                SET item_id = COALESCE(NULLIF(TRIM(item_id), ''), NULLIF(TRIM(product_id), ''), item_id)
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_bom_headers', 'output_quantity')) {
            this.tryExec(`
                UPDATE mfg_bom_headers
                SET output_qty = CASE
                    WHEN COALESCE(output_qty, 0) > 0 THEN output_qty
                    WHEN COALESCE(output_quantity, 0) > 0 THEN output_quantity
                    ELSE 1
                END
                WHERE 1 = 1
            `);
        }
        this.tryExec(`
            UPDATE mfg_bom_headers
            SET item_id = COALESCE(NULLIF(TRIM(item_id), ''), id),
                version_no = CASE WHEN COALESCE(version_no, 0) > 0 THEN version_no ELSE 1 END,
                is_default = CASE WHEN COALESCE(is_default, 0) = 1 THEN 1 ELSE 0 END,
                output_qty = CASE WHEN COALESCE(output_qty, 0) > 0 THEN output_qty ELSE 1 END,
                created_by = COALESCE(NULLIF(TRIM(created_by), ''), 'system'),
                created_at = COALESCE(NULLIF(TRIM(created_at), ''), CURRENT_TIMESTAMP),
                updated_at = COALESCE(NULLIF(TRIM(updated_at), ''), COALESCE(NULLIF(TRIM(created_at), ''), CURRENT_TIMESTAMP)),
                status = CASE UPPER(COALESCE(status, 'DRAFT'))
                    WHEN 'ACTIVE' THEN 'CONFIRMED'
                    WHEN 'APPROVED' THEN 'CONFIRMED'
                    ELSE UPPER(COALESCE(status, 'DRAFT'))
                END
            WHERE 1 = 1
        `);
    }
    ensureBomLineCompatibility() {
        if (!this.tableExists('mfg_bom_lines'))
            return;
        this.ensureColumn('mfg_bom_lines', 'line_no', 'INTEGER DEFAULT 0');
        this.ensureColumn('mfg_bom_lines', 'component_item_id', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_bom_lines', 'warehouse_id', 'TEXT');
        this.ensureColumn('mfg_bom_lines', 'qty_per', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_bom_lines', 'scrap_percent', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_bom_lines', 'issue_method', "TEXT DEFAULT 'MANUAL'");
        this.ensureColumn('mfg_bom_lines', 'remarks', 'TEXT');
        if (this.hasColumn('mfg_bom_lines', 'item_id')) {
            this.tryExec(`
                UPDATE mfg_bom_lines
                SET component_item_id = COALESCE(NULLIF(TRIM(component_item_id), ''), NULLIF(TRIM(item_id), ''), component_item_id)
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_bom_lines', 'quantity')) {
            this.tryExec(`
                UPDATE mfg_bom_lines
                SET qty_per = CASE
                    WHEN COALESCE(qty_per, 0) > 0 THEN qty_per
                    ELSE COALESCE(quantity, 0)
                END
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_bom_lines', 'waste_percent')) {
            this.tryExec(`
                UPDATE mfg_bom_lines
                SET scrap_percent = CASE
                    WHEN COALESCE(scrap_percent, 0) > 0 THEN scrap_percent
                    ELSE COALESCE(waste_percent, 0)
                END
                WHERE 1 = 1
            `);
        }
        this.tryExec(`
            UPDATE mfg_bom_lines
            SET line_no = (
                SELECT COUNT(1)
                FROM mfg_bom_lines AS x
                WHERE x.bom_id = mfg_bom_lines.bom_id
                  AND x.rowid <= mfg_bom_lines.rowid
            )
            WHERE COALESCE(line_no, 0) <= 0
        `);
        this.tryExec(`
            UPDATE mfg_bom_lines
            SET component_item_id = COALESCE(NULLIF(TRIM(component_item_id), ''), id),
                qty_per = COALESCE(qty_per, 0),
                scrap_percent = COALESCE(scrap_percent, 0),
                issue_method = CASE
                    WHEN UPPER(COALESCE(issue_method, 'MANUAL')) = 'BACKFLUSH' THEN 'BACKFLUSH'
                    ELSE 'MANUAL'
                END
            WHERE 1 = 1
        `);
    }
    ensureRoutingHeaderCompatibility() {
        if (!this.tableExists('mfg_routing_headers'))
            return;
        this.ensureColumn('mfg_routing_headers', 'item_id', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_routing_headers', 'version_no', 'INTEGER DEFAULT 1');
        this.ensureColumn('mfg_routing_headers', 'status', "TEXT DEFAULT 'DRAFT'");
        this.ensureColumn('mfg_routing_headers', 'is_default', 'INTEGER DEFAULT 0');
        this.ensureColumn('mfg_routing_headers', 'remarks', 'TEXT');
        this.ensureColumn('mfg_routing_headers', 'created_by', "TEXT DEFAULT 'system'");
        this.ensureColumn('mfg_routing_headers', 'approved_by', 'TEXT');
        this.ensureColumn('mfg_routing_headers', 'created_at', 'TEXT');
        this.ensureColumn('mfg_routing_headers', 'updated_at', 'TEXT');
        if (this.hasColumn('mfg_routing_headers', 'product_id')) {
            this.tryExec(`
                UPDATE mfg_routing_headers
                SET item_id = COALESCE(NULLIF(TRIM(item_id), ''), NULLIF(TRIM(product_id), ''), item_id)
                WHERE 1 = 1
            `);
        }
        this.tryExec(`
            UPDATE mfg_routing_headers
            SET item_id = COALESCE(NULLIF(TRIM(item_id), ''), id),
                version_no = CASE WHEN COALESCE(version_no, 0) > 0 THEN version_no ELSE 1 END,
                is_default = CASE WHEN COALESCE(is_default, 0) = 1 THEN 1 ELSE 0 END,
                created_by = COALESCE(NULLIF(TRIM(created_by), ''), 'system'),
                created_at = COALESCE(NULLIF(TRIM(created_at), ''), CURRENT_TIMESTAMP),
                updated_at = COALESCE(NULLIF(TRIM(updated_at), ''), COALESCE(NULLIF(TRIM(created_at), ''), CURRENT_TIMESTAMP)),
                status = CASE UPPER(COALESCE(status, 'DRAFT'))
                    WHEN 'ACTIVE' THEN 'CONFIRMED'
                    WHEN 'APPROVED' THEN 'CONFIRMED'
                    ELSE UPPER(COALESCE(status, 'DRAFT'))
                END
            WHERE 1 = 1
        `);
    }
    ensureRoutingStepCompatibility() {
        if (!this.tableExists('mfg_routing_steps'))
            return;
        this.ensureColumn('mfg_routing_steps', 'step_no', 'INTEGER DEFAULT 0');
        this.ensureColumn('mfg_routing_steps', 'work_center_code', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_routing_steps', 'operation_code', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_routing_steps', 'setup_time_minutes', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_routing_steps', 'run_time_minutes', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_routing_steps', 'labor_cost_rate', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_routing_steps', 'machine_cost_rate', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_routing_steps', 'remarks', 'TEXT');
        if (this.hasColumn('mfg_routing_steps', 'sequence_order')) {
            this.tryExec(`
                UPDATE mfg_routing_steps
                SET step_no = CASE
                    WHEN COALESCE(step_no, 0) > 0 THEN step_no
                    ELSE COALESCE(sequence_order, 0)
                END
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_routing_steps', 'work_center_id')) {
            this.tryExec(`
                UPDATE mfg_routing_steps
                SET work_center_code = COALESCE(NULLIF(TRIM(work_center_code), ''), NULLIF(TRIM(work_center_id), ''), work_center_code)
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_routing_steps', 'description')) {
            this.tryExec(`
                UPDATE mfg_routing_steps
                SET operation_code = COALESCE(NULLIF(TRIM(operation_code), ''), NULLIF(TRIM(description), ''), operation_code)
                WHERE 1 = 1
            `);
        }
        this.tryExec(`
            UPDATE mfg_routing_steps
            SET step_no = (
                SELECT COUNT(1)
                FROM mfg_routing_steps AS x
                WHERE x.routing_id = mfg_routing_steps.routing_id
                  AND x.rowid <= mfg_routing_steps.rowid
            )
            WHERE COALESCE(step_no, 0) <= 0
        `);
        this.tryExec(`
            UPDATE mfg_routing_steps
            SET work_center_code = COALESCE(NULLIF(TRIM(work_center_code), ''), 'DEFAULT'),
                operation_code = COALESCE(NULLIF(TRIM(operation_code), ''), 'OP')
            WHERE 1 = 1
        `);
    }
    ensureProductionOrderCompatibility() {
        if (!this.tableExists('mfg_production_orders'))
            return;
        this.ensureColumn('mfg_production_orders', 'company_id', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_production_orders', 'branch_id', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_production_orders', 'order_no', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_production_orders', 'order_date', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'status', "TEXT DEFAULT 'DRAFT'");
        this.ensureColumn('mfg_production_orders', 'item_id', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_production_orders', 'bom_id', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'routing_id', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'warehouse_id', "TEXT DEFAULT ''");
        this.ensureColumn('mfg_production_orders', 'qty_planned', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'qty_started', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'qty_completed', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'qty_scrapped', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'qty_issued', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'material_cost_issued', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'labor_cost_estimated', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'machine_cost_estimated', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'cost_capitalized', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'total_wip_cost', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'unit_cost_completed', 'REAL DEFAULT 0');
        this.ensureColumn('mfg_production_orders', 'reference_no', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'remarks', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'project_id', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'cost_center_id', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'created_by', "TEXT DEFAULT 'system'");
        this.ensureColumn('mfg_production_orders', 'approved_by', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'source_doc_type', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'source_doc_id', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'created_at', 'TEXT');
        this.ensureColumn('mfg_production_orders', 'updated_at', 'TEXT');
        if (this.hasColumn('mfg_production_orders', 'order_number')) {
            this.tryExec(`
                UPDATE mfg_production_orders
                SET order_no = COALESCE(NULLIF(TRIM(order_no), ''), NULLIF(TRIM(order_number), ''), order_no)
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_production_orders', 'start_date')) {
            this.tryExec(`
                UPDATE mfg_production_orders
                SET order_date = COALESCE(NULLIF(TRIM(order_date), ''), NULLIF(TRIM(start_date), ''), order_date)
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_production_orders', 'quantity')) {
            this.tryExec(`
                UPDATE mfg_production_orders
                SET qty_planned = CASE
                    WHEN COALESCE(qty_planned, 0) > 0 THEN qty_planned
                    ELSE COALESCE(quantity, 0)
                END
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_production_orders', 'actual_material_cost')) {
            this.tryExec(`
                UPDATE mfg_production_orders
                SET material_cost_issued = CASE
                    WHEN COALESCE(material_cost_issued, 0) > 0 THEN material_cost_issued
                    ELSE COALESCE(actual_material_cost, 0)
                END
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_production_orders', 'actual_labor_cost')) {
            this.tryExec(`
                UPDATE mfg_production_orders
                SET labor_cost_estimated = CASE
                    WHEN COALESCE(labor_cost_estimated, 0) > 0 THEN labor_cost_estimated
                    ELSE COALESCE(actual_labor_cost, 0)
                END
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_production_orders', 'actual_overhead_cost')) {
            this.tryExec(`
                UPDATE mfg_production_orders
                SET machine_cost_estimated = CASE
                    WHEN COALESCE(machine_cost_estimated, 0) > 0 THEN machine_cost_estimated
                    ELSE COALESCE(actual_overhead_cost, 0)
                END
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_production_orders', 'total_cost')) {
            this.tryExec(`
                UPDATE mfg_production_orders
                SET total_wip_cost = CASE
                    WHEN COALESCE(total_wip_cost, 0) > 0 THEN total_wip_cost
                    ELSE COALESCE(total_cost, 0)
                END
                WHERE 1 = 1
            `);
        }
        if (this.hasColumn('mfg_production_orders', 'unit_cost')) {
            this.tryExec(`
                UPDATE mfg_production_orders
                SET unit_cost_completed = CASE
                    WHEN COALESCE(unit_cost_completed, 0) > 0 THEN unit_cost_completed
                    ELSE COALESCE(unit_cost, 0)
                END
                WHERE 1 = 1
            `);
        }
        this.tryExec(`
            UPDATE mfg_production_orders
            SET company_id = COALESCE(NULLIF(TRIM(company_id), ''), 'COMP_01'),
                branch_id = COALESCE(NULLIF(TRIM(branch_id), ''), 'MAIN'),
                order_no = COALESCE(NULLIF(TRIM(order_no), ''), id),
                order_date = COALESCE(NULLIF(TRIM(order_date), ''), NULLIF(TRIM(created_at), ''), DATE('now')),
                status = COALESCE(NULLIF(UPPER(TRIM(status)), ''), 'DRAFT'),
                item_id = COALESCE(NULLIF(TRIM(item_id), ''), id),
                warehouse_id = COALESCE(NULLIF(TRIM(warehouse_id), ''), 'MAIN'),
                qty_planned = COALESCE(qty_planned, 0),
                qty_started = COALESCE(qty_started, 0),
                qty_completed = COALESCE(qty_completed, 0),
                qty_scrapped = COALESCE(qty_scrapped, 0),
                qty_issued = COALESCE(qty_issued, 0),
                material_cost_issued = COALESCE(material_cost_issued, 0),
                labor_cost_estimated = COALESCE(labor_cost_estimated, 0),
                machine_cost_estimated = COALESCE(machine_cost_estimated, 0),
                cost_capitalized = COALESCE(cost_capitalized, 0),
                total_wip_cost = COALESCE(total_wip_cost, 0),
                unit_cost_completed = COALESCE(unit_cost_completed, 0),
                created_by = COALESCE(NULLIF(TRIM(created_by), ''), 'system'),
                created_at = COALESCE(NULLIF(TRIM(created_at), ''), CURRENT_TIMESTAMP),
                updated_at = COALESCE(NULLIF(TRIM(updated_at), ''), COALESCE(NULLIF(TRIM(created_at), ''), CURRENT_TIMESTAMP))
            WHERE 1 = 1
        `);
    }
    seedModernBomsFromLegacyCatalog() {
        if (!this.tableExists('mfg_boms'))
            return;
        if (!this.tableExists('mfg_bom_headers'))
            return;
        this.tryExec(`
            INSERT OR IGNORE INTO mfg_bom_headers (
                id,
                company_id,
                item_id,
                version_no,
                status,
                is_default,
                output_qty,
                effective_from,
                effective_to,
                remarks,
                created_by,
                approved_by,
                created_at,
                updated_at
            )
            SELECT
                legacy.id,
                'COMP_01',
                COALESCE(NULLIF(TRIM(legacy.item_id), ''), legacy.id),
                CASE WHEN COALESCE(legacy.version, 0) > 0 THEN legacy.version ELSE 1 END,
                'CONFIRMED',
                CASE WHEN COALESCE(legacy.is_default, 0) = 1 THEN 1 ELSE 0 END,
                CASE WHEN COALESCE(legacy.batch_size, 0) > 0 THEN legacy.batch_size ELSE 1 END,
                NULL,
                NULL,
                NULLIF(TRIM(legacy.notes), ''),
                'system',
                NULL,
                COALESCE(NULLIF(TRIM(legacy.created_at), ''), CURRENT_TIMESTAMP),
                COALESCE(NULLIF(TRIM(legacy.created_at), ''), CURRENT_TIMESTAMP)
            FROM mfg_boms legacy
            WHERE NOT EXISTS (
                SELECT 1
                FROM mfg_bom_headers current
                WHERE current.id = legacy.id
            )
        `);
        if (!this.tableExists('mfg_bom_components'))
            return;
        if (!this.tableExists('mfg_bom_lines'))
            return;
        this.tryExec(`
            INSERT OR IGNORE INTO mfg_bom_lines (
                id,
                bom_id,
                line_no,
                component_item_id,
                warehouse_id,
                qty_per,
                scrap_percent,
                issue_method,
                remarks
            )
            SELECT
                legacy.id,
                legacy.bom_id,
                (
                    SELECT COUNT(1)
                    FROM mfg_bom_components ranked
                    WHERE ranked.bom_id = legacy.bom_id
                      AND ranked.rowid <= legacy.rowid
                ),
                COALESCE(NULLIF(TRIM(legacy.item_id), ''), legacy.id),
                NULL,
                COALESCE(legacy.quantity, 0),
                COALESCE(legacy.scarp_percentage, 0),
                'MANUAL',
                CASE
                    WHEN COALESCE(legacy.is_critical, 0) = 1 THEN 'critical_component'
                    ELSE NULL
                END
            FROM mfg_bom_components legacy
            WHERE EXISTS (
                SELECT 1
                FROM mfg_bom_headers current
                WHERE current.id = legacy.bom_id
            )
              AND NOT EXISTS (
                SELECT 1
                FROM mfg_bom_lines current
                WHERE current.id = legacy.id
            )
        `);
    }
    seedModernRoutingsFromLegacyCatalog() {
        if (!this.tableExists('mfg_routings'))
            return;
        if (!this.tableExists('mfg_routing_headers'))
            return;
        this.tryExec(`
            INSERT OR IGNORE INTO mfg_routing_headers (
                id,
                company_id,
                item_id,
                version_no,
                status,
                is_default,
                remarks,
                created_by,
                approved_by,
                created_at,
                updated_at
            )
            SELECT
                legacy.id,
                COALESCE(NULLIF(TRIM(bom.company_id), ''), 'COMP_01'),
                COALESCE(NULLIF(TRIM(bom.item_id), ''), legacy.id),
                1,
                'CONFIRMED',
                CASE WHEN COALESCE(legacy.is_default, 0) = 1 THEN 1 ELSE 0 END,
                NULLIF(TRIM(legacy.name), ''),
                'system',
                NULL,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM mfg_routings legacy
            LEFT JOIN mfg_bom_headers bom
              ON bom.id = legacy.bom_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM mfg_routing_headers current
                WHERE current.id = legacy.id
            )
        `);
        if (!this.tableExists('mfg_routing_operations'))
            return;
        if (!this.tableExists('mfg_routing_steps'))
            return;
        this.tryExec(`
            INSERT OR IGNORE INTO mfg_routing_steps (
                id,
                routing_id,
                step_no,
                work_center_code,
                operation_code,
                setup_time_minutes,
                run_time_minutes,
                labor_cost_rate,
                machine_cost_rate,
                remarks
            )
            SELECT
                legacy.id,
                legacy.routing_id,
                CASE
                    WHEN COALESCE(legacy.sequence_order, 0) > 0 THEN legacy.sequence_order
                    ELSE (
                        SELECT COUNT(1)
                        FROM mfg_routing_operations ranked
                        WHERE ranked.routing_id = legacy.routing_id
                          AND ranked.rowid <= legacy.rowid
                    )
                END,
                COALESCE(NULLIF(TRIM(legacy.work_center_id), ''), 'DEFAULT'),
                COALESCE(NULLIF(TRIM(legacy.step_type), ''), NULLIF(TRIM(legacy.description), ''), 'OP'),
                COALESCE(legacy.setup_time_minutes, 0),
                COALESCE(legacy.run_time_minutes, 0),
                0,
                0,
                NULLIF(TRIM(legacy.description), '')
            FROM mfg_routing_operations legacy
            WHERE EXISTS (
                SELECT 1
                FROM mfg_routing_headers current
                WHERE current.id = legacy.routing_id
            )
              AND NOT EXISTS (
                SELECT 1
                FROM mfg_routing_steps current
                WHERE current.id = legacy.id
            )
        `);
    }
    seedModernOrderComponentsFromLegacyInputs() {
        if (!this.tableExists('mfg_production_order_inputs'))
            return;
        if (!this.tableExists('mfg_production_order_components'))
            return;
        this.tryExec(`
            INSERT OR IGNORE INTO mfg_production_order_components (
                id,
                production_order_id,
                line_no,
                component_item_id,
                warehouse_id,
                qty_required,
                qty_issued,
                qty_returned,
                issue_method,
                unit_cost,
                total_cost,
                remarks
            )
            SELECT
                legacy.id,
                legacy.production_order_id,
                (
                    SELECT COUNT(1)
                    FROM mfg_production_order_inputs ranked
                    WHERE ranked.production_order_id = legacy.production_order_id
                      AND ranked.rowid <= legacy.rowid
                ),
                COALESCE(NULLIF(TRIM(legacy.item_id), ''), legacy.id),
                NULLIF(TRIM(legacy.warehouse_id), ''),
                COALESCE(legacy.qty_issued, 0),
                COALESCE(legacy.qty_issued, 0),
                0,
                'MANUAL',
                COALESCE(legacy.unit_cost, 0),
                COALESCE(legacy.qty_issued, 0) * COALESCE(legacy.unit_cost, 0),
                'seeded_from_legacy_input'
            FROM mfg_production_order_inputs legacy
            WHERE EXISTS (
                SELECT 1
                FROM mfg_production_orders current
                WHERE current.id = legacy.production_order_id
            )
              AND NOT EXISTS (
                SELECT 1
                FROM mfg_production_order_components current
                WHERE current.id = legacy.id
            )
        `);
    }
    ensureStockLedgerCompatibility() {
        if (!this.tableExists('stock_ledger_entries'))
            return;
        this.ensureColumn('stock_ledger_entries', 'movement_side', "TEXT DEFAULT 'IN'");
        this.ensureColumn('stock_ledger_entries', 'is_reversal', 'INTEGER DEFAULT 0');
        this.ensureColumn('stock_ledger_entries', 'reversed_entry_id', 'TEXT');
    }
    createIndexIfPossible(sql, tableName, requiredColumns) {
        if (!this.tableExists(tableName))
            return;
        for (const column of requiredColumns) {
            if (!this.hasColumn(tableName, column))
                return;
        }
        this.tryExec(sql);
    }
    ensureManufacturingIndexes() {
        this.createIndexIfPossible('CREATE INDEX IF NOT EXISTS idx_mfg_bom_item_default ON mfg_bom_headers(company_id, item_id, status, is_default, version_no DESC)', 'mfg_bom_headers', ['company_id', 'item_id', 'status', 'is_default', 'version_no']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_bom_line_no ON mfg_bom_lines(bom_id, line_no)', 'mfg_bom_lines', ['bom_id', 'line_no']);
        this.createIndexIfPossible('CREATE INDEX IF NOT EXISTS idx_mfg_routing_item_default ON mfg_routing_headers(company_id, item_id, status, is_default, version_no DESC)', 'mfg_routing_headers', ['company_id', 'item_id', 'status', 'is_default', 'version_no']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_routing_step_no ON mfg_routing_steps(routing_id, step_no)', 'mfg_routing_steps', ['routing_id', 'step_no']);
        this.createIndexIfPossible('CREATE INDEX IF NOT EXISTS idx_mfg_order_scope ON mfg_production_orders(company_id, branch_id, status, order_date, id)', 'mfg_production_orders', ['company_id', 'branch_id', 'status', 'order_date', 'id']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_order_no ON mfg_production_orders(company_id, branch_id, order_no)', 'mfg_production_orders', ['company_id', 'branch_id', 'order_no']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_order_component_no ON mfg_production_order_components(production_order_id, line_no)', 'mfg_production_order_components', ['production_order_id', 'line_no']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_order_operation_no ON mfg_production_order_operations(production_order_id, step_no)', 'mfg_production_order_operations', ['production_order_id', 'step_no']);
        this.createIndexIfPossible('CREATE INDEX IF NOT EXISTS idx_mfg_issue_scope ON mfg_production_issues(company_id, branch_id, status, issue_date, id)', 'mfg_production_issues', ['company_id', 'branch_id', 'status', 'issue_date', 'id']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_issue_no ON mfg_production_issues(company_id, branch_id, issue_no)', 'mfg_production_issues', ['company_id', 'branch_id', 'issue_no']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_issue_line_no ON mfg_production_issue_lines(issue_id, line_no)', 'mfg_production_issue_lines', ['issue_id', 'line_no']);
        this.createIndexIfPossible('CREATE INDEX IF NOT EXISTS idx_mfg_receipt_scope ON mfg_production_receipts(company_id, branch_id, status, receipt_date, id)', 'mfg_production_receipts', ['company_id', 'branch_id', 'status', 'receipt_date', 'id']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_receipt_no ON mfg_production_receipts(company_id, branch_id, receipt_no)', 'mfg_production_receipts', ['company_id', 'branch_id', 'receipt_no']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_receipt_line_no ON mfg_production_receipt_lines(receipt_id, line_no)', 'mfg_production_receipt_lines', ['receipt_id', 'line_no']);
        this.createIndexIfPossible('CREATE INDEX IF NOT EXISTS idx_mfg_stock_ledger_doc ON stock_ledger_entries(company_id, doc_type, doc_id, is_reversal)', 'stock_ledger_entries', ['company_id', 'doc_type', 'doc_id', 'is_reversal']);
        this.createIndexIfPossible('CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_stock_ledger_line ON stock_ledger_entries(company_id, doc_type, doc_id, doc_line_id, warehouse_id, movement_side, is_reversal)', 'stock_ledger_entries', ['company_id', 'doc_type', 'doc_id', 'doc_line_id', 'warehouse_id', 'movement_side', 'is_reversal']);
    }
    nextIdentity() {
        return (0, crypto_1.randomUUID)();
    }
    runInTransaction(work) {
        return this.db.transaction(work)();
    }
    nextDocumentNo(companyId, branchId, key) {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const config = this.resolveDocumentConfig(key);
        const likePattern = `${config.prefix}-${today}-%`;
        const row = this.db.prepare(`
            SELECT COUNT(1) AS count
            FROM ${config.table}
            WHERE company_id = ?
              AND branch_id = ?
              AND ${config.column} LIKE ?
        `).get(companyId, branchId, likePattern);
        const seq = Number(row?.count || 0) + 1;
        return `${config.prefix}-${today}-${String(seq).padStart(4, '0')}`;
    }
    resolveDocumentConfig(key) {
        const normalized = String(key || '').trim().toUpperCase();
        if (normalized === 'MFG_ISSUE') {
            return { table: 'mfg_production_issues', column: 'issue_no', prefix: 'MI' };
        }
        if (normalized === 'MFG_RECEIPT') {
            return { table: 'mfg_production_receipts', column: 'receipt_no', prefix: 'MR' };
        }
        return { table: 'mfg_production_orders', column: 'order_no', prefix: 'MO' };
    }
    resolveCurrencyCode(rawCurrencyCode) {
        const normalized = String(rawCurrencyCode || '').trim();
        if (!normalized)
            return 'ILS';
        if (/^[A-Za-z]{3}$/.test(normalized))
            return normalized.toUpperCase();
        try {
            const row = this.db.prepare(`
                SELECT code
                FROM currencies
                WHERE id = ? OR UPPER(code) = UPPER(?)
                LIMIT 1
            `).get(normalized, normalized);
            return String(row?.code || 'ILS').trim().toUpperCase() || 'ILS';
        }
        catch {
            return 'ILS';
        }
    }
    getItemById(itemId) {
        try {
            const row = this.db.prepare(`
                SELECT
                    id,
                    NULLIF(TRIM(COALESCE(item_group_id, '')), '') AS item_group_id,
                    COALESCE(is_active, 1) AS is_active,
                    COALESCE(is_stock_item, CASE
                        WHEN UPPER(COALESCE(type, item_type, 'ITEM')) IN ('SERVICE', 'SERVICES') THEN 0
                        ELSE 1
                    END) AS is_stock_item,
                    COALESCE(cost_price, 0) AS cost_price
                FROM items
                WHERE id = ?
                LIMIT 1
            `).get(itemId);
            if (!row)
                return null;
            return {
                id: row.id,
                itemGroupId: row.item_group_id || null,
                isActive: Number(row.is_active ?? 1) === 1,
                isStockItem: Number(row.is_stock_item ?? 1) === 1,
                defaultUnitCost: Number(row.cost_price || 0),
            };
        }
        catch {
            return null;
        }
    }
    getWarehouseById(warehouseId) {
        const row = this.db.prepare(`
            SELECT
                id,
                COALESCE(is_active, 1) AS is_active
            FROM warehouses
            WHERE id = ?
            LIMIT 1
        `).get(warehouseId);
        if (!row)
            return null;
        return {
            id: row.id,
            isActive: Number(row.is_active ?? 1) === 1,
        };
    }
    createBom(input) {
        const insertHeader = this.db.prepare(`
            INSERT INTO mfg_bom_headers (
                id, company_id, item_id, version_no, status, is_default, output_qty,
                effective_from, effective_to, remarks, created_by, approved_by, created_at, updated_at
            ) VALUES (
                @id, @companyId, @itemId, @versionNo, @status, @isDefault, @outputQty,
                @effectiveFrom, @effectiveTo, @remarks, @createdBy, @approvedBy, @createdAt, @updatedAt
            )
        `);
        const insertLine = this.db.prepare(`
            INSERT INTO mfg_bom_lines (
                id, bom_id, line_no, component_item_id, warehouse_id, qty_per, scrap_percent, issue_method, remarks
            ) VALUES (
                @id, @bomId, @lineNo, @componentItemId, @warehouseId, @qtyPer, @scrapPercent, @issueMethod, @remarks
            )
        `);
        this.db.transaction((payload) => {
            insertHeader.run({
                ...payload,
                isDefault: payload.isDefault ? 1 : 0,
            });
            for (const line of payload.lines) {
                insertLine.run({ ...line, bomId: payload.id });
            }
        })(input);
        return this.getBomById(input.companyId, input.id);
    }
    updateBom(input) {
        const updateHeader = this.db.prepare(`
            UPDATE mfg_bom_headers
            SET output_qty = @outputQty,
                effective_from = @effectiveFrom,
                effective_to = @effectiveTo,
                remarks = @remarks,
                approved_by = COALESCE(@approvedBy, approved_by),
                updated_at = @updatedAt
            WHERE id = @id
              AND company_id = @companyId
        `);
        const deleteLines = this.db.prepare('DELETE FROM mfg_bom_lines WHERE bom_id = ?');
        const insertLine = this.db.prepare(`
            INSERT INTO mfg_bom_lines (
                id, bom_id, line_no, component_item_id, warehouse_id, qty_per, scrap_percent, issue_method, remarks
            ) VALUES (
                @id, @bomId, @lineNo, @componentItemId, @warehouseId, @qtyPer, @scrapPercent, @issueMethod, @remarks
            )
        `);
        this.db.transaction((payload) => {
            updateHeader.run(payload);
            deleteLines.run(payload.id);
            for (const line of payload.lines) {
                insertLine.run({ ...line, bomId: payload.id });
            }
        })(input);
        return this.getBomById(input.companyId, input.id);
    }
    getBomById(companyId, bomId) {
        const header = this.db.prepare(`
            SELECT *
            FROM mfg_bom_headers
            WHERE id = ?
              AND company_id = ?
            LIMIT 1
        `).get(bomId, companyId);
        if (!header)
            return null;
        const lines = this.db.prepare(`
            SELECT *
            FROM mfg_bom_lines
            WHERE bom_id = ?
            ORDER BY line_no
        `).all(bomId);
        return {
            header: this.mapBomHeader(header),
            lines: lines.map((row) => this.mapBomLine(row)),
        };
    }
    getDefaultBomForItem(companyId, itemId, asOfDate) {
        const effectiveDate = String(asOfDate || new Date().toISOString().slice(0, 10)).trim();
        const header = this.db.prepare(`
            SELECT *
            FROM mfg_bom_headers
            WHERE company_id = ?
              AND item_id = ?
              AND status = 'CONFIRMED'
              AND (
                effective_from IS NULL OR TRIM(effective_from) = '' OR effective_from <= ?
              )
              AND (
                effective_to IS NULL OR TRIM(effective_to) = '' OR effective_to >= ?
              )
            ORDER BY is_default DESC, version_no DESC, created_at DESC
            LIMIT 1
        `).get(companyId, itemId, effectiveDate, effectiveDate);
        if (!header)
            return null;
        const lines = this.db.prepare(`
            SELECT *
            FROM mfg_bom_lines
            WHERE bom_id = ?
            ORDER BY line_no
        `).all(header.id);
        return {
            header: this.mapBomHeader(header),
            lines: lines.map((row) => this.mapBomLine(row)),
        };
    }
    listBomHeadersByItem(companyId, itemId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_bom_headers
            WHERE company_id = ?
              AND item_id = ?
            ORDER BY version_no DESC, created_at DESC
        `).all(companyId, itemId);
        return rows.map((row) => ({
            header: this.mapBomHeader(row),
            lines: this.db.prepare('SELECT * FROM mfg_bom_lines WHERE bom_id = ? ORDER BY line_no').all(row.id).map((line) => this.mapBomLine(line)),
        }));
    }
    setBomDefault(companyId, itemId, bomId, updatedAt) {
        const resetDefaults = this.db.prepare(`
            UPDATE mfg_bom_headers
            SET is_default = 0,
                updated_at = @updatedAt
            WHERE company_id = @companyId
              AND item_id = @itemId
        `);
        const setDefault = this.db.prepare(`
            UPDATE mfg_bom_headers
            SET is_default = 1,
                updated_at = @updatedAt
            WHERE id = @bomId
              AND company_id = @companyId
              AND item_id = @itemId
        `);
        this.db.transaction((payload) => {
            resetDefaults.run(payload);
            setDefault.run(payload);
        })({ companyId, itemId, bomId, updatedAt });
    }
    setBomStatus(companyId, bomId, status, approvedBy, updatedAt) {
        this.db.prepare(`
            UPDATE mfg_bom_headers
            SET status = @status,
                approved_by = COALESCE(@approvedBy, approved_by),
                updated_at = @updatedAt,
                is_default = CASE WHEN @status = 'CANCELLED' THEN 0 ELSE is_default END
            WHERE id = @bomId
              AND company_id = @companyId
        `).run({ companyId, bomId, status, approvedBy, updatedAt });
    }
    createRouting(input) {
        const insertHeader = this.db.prepare(`
            INSERT INTO mfg_routing_headers (
                id, company_id, item_id, version_no, status, is_default, remarks,
                created_by, approved_by, created_at, updated_at
            ) VALUES (
                @id, @companyId, @itemId, @versionNo, @status, @isDefault, @remarks,
                @createdBy, @approvedBy, @createdAt, @updatedAt
            )
        `);
        const insertStep = this.db.prepare(`
            INSERT INTO mfg_routing_steps (
                id, routing_id, step_no, work_center_code, operation_code,
                setup_time_minutes, run_time_minutes, labor_cost_rate, machine_cost_rate, remarks
            ) VALUES (
                @id, @routingId, @stepNo, @workCenterCode, @operationCode,
                @setupTimeMinutes, @runTimeMinutes, @laborCostRate, @machineCostRate, @remarks
            )
        `);
        this.db.transaction((payload) => {
            insertHeader.run({
                ...payload,
                isDefault: payload.isDefault ? 1 : 0,
            });
            for (const step of payload.steps) {
                insertStep.run({ ...step, routingId: payload.id });
            }
        })(input);
    }
    updateRouting(input) {
        const updateHeader = this.db.prepare(`
            UPDATE mfg_routing_headers
            SET remarks = @remarks,
                approved_by = COALESCE(@approvedBy, approved_by),
                updated_at = @updatedAt
            WHERE id = @id
              AND company_id = @companyId
        `);
        const deleteSteps = this.db.prepare('DELETE FROM mfg_routing_steps WHERE routing_id = ?');
        const insertStep = this.db.prepare(`
            INSERT INTO mfg_routing_steps (
                id, routing_id, step_no, work_center_code, operation_code,
                setup_time_minutes, run_time_minutes, labor_cost_rate, machine_cost_rate, remarks
            ) VALUES (
                @id, @routingId, @stepNo, @workCenterCode, @operationCode,
                @setupTimeMinutes, @runTimeMinutes, @laborCostRate, @machineCostRate, @remarks
            )
        `);
        this.db.transaction((payload) => {
            updateHeader.run(payload);
            deleteSteps.run(payload.id);
            for (const step of payload.steps) {
                insertStep.run({ ...step, routingId: payload.id });
            }
        })(input);
    }
    getRoutingById(companyId, routingId) {
        const header = this.db.prepare(`
            SELECT *
            FROM mfg_routing_headers
            WHERE id = ?
              AND company_id = ?
            LIMIT 1
        `).get(routingId, companyId);
        if (!header)
            return null;
        const steps = this.db.prepare(`
            SELECT *
            FROM mfg_routing_steps
            WHERE routing_id = ?
            ORDER BY step_no
        `).all(routingId);
        return {
            header: this.mapRoutingHeader(header),
            steps: steps.map((row) => this.mapRoutingStep(row)),
        };
    }
    getDefaultRoutingForItem(companyId, itemId) {
        const header = this.db.prepare(`
            SELECT *
            FROM mfg_routing_headers
            WHERE company_id = ?
              AND item_id = ?
              AND status = 'CONFIRMED'
            ORDER BY is_default DESC, version_no DESC, created_at DESC
            LIMIT 1
        `).get(companyId, itemId);
        if (!header)
            return null;
        const steps = this.db.prepare(`
            SELECT *
            FROM mfg_routing_steps
            WHERE routing_id = ?
            ORDER BY step_no
        `).all(header.id);
        return {
            header: this.mapRoutingHeader(header),
            steps: steps.map((row) => this.mapRoutingStep(row)),
        };
    }
    setRoutingDefault(companyId, itemId, routingId, updatedAt) {
        const resetDefaults = this.db.prepare(`
            UPDATE mfg_routing_headers
            SET is_default = 0,
                updated_at = @updatedAt
            WHERE company_id = @companyId
              AND item_id = @itemId
        `);
        const setDefault = this.db.prepare(`
            UPDATE mfg_routing_headers
            SET is_default = 1,
                updated_at = @updatedAt
            WHERE id = @routingId
              AND company_id = @companyId
              AND item_id = @itemId
        `);
        this.db.transaction((payload) => {
            resetDefaults.run(payload);
            setDefault.run(payload);
        })({ companyId, itemId, routingId, updatedAt });
    }
    setRoutingStatus(companyId, routingId, status, approvedBy, updatedAt) {
        this.db.prepare(`
            UPDATE mfg_routing_headers
            SET status = @status,
                approved_by = COALESCE(@approvedBy, approved_by),
                updated_at = @updatedAt,
                is_default = CASE WHEN @status = 'CANCELLED' THEN 0 ELSE is_default END
            WHERE id = @routingId
              AND company_id = @companyId
        `).run({ companyId, routingId, status, approvedBy, updatedAt });
    }
    createProductionOrder(input) {
        const insertHeader = this.db.prepare(`
            INSERT INTO mfg_production_orders (
                id, company_id, branch_id, order_no, order_date, status, item_id, bom_id, routing_id,
                warehouse_id, qty_planned, qty_started, qty_completed, qty_scrapped, qty_issued,
                material_cost_issued, labor_cost_estimated, machine_cost_estimated,
                cost_capitalized, total_wip_cost, unit_cost_completed,
                reference_no, remarks, project_id, cost_center_id,
                created_by, approved_by, source_doc_type, source_doc_id,
                created_at, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @orderNo, @orderDate, @status, @itemId, @bomId, @routingId,
                @warehouseId, @qtyPlanned, @qtyStarted, @qtyCompleted, @qtyScrapped, @qtyIssued,
                @materialCostIssued, @laborCostEstimated, @machineCostEstimated,
                @costCapitalized, @totalWipCost, @unitCostCompleted,
                @referenceNo, @remarks, @projectId, @costCenterId,
                @createdBy, @approvedBy, @sourceDocType, @sourceDocId,
                @createdAt, @updatedAt
            )
        `);
        const insertComponent = this.db.prepare(`
            INSERT INTO mfg_production_order_components (
                id, production_order_id, line_no, component_item_id, warehouse_id,
                qty_required, qty_issued, qty_returned, issue_method, unit_cost, total_cost, remarks
            ) VALUES (
                @id, @productionOrderId, @lineNo, @componentItemId, @warehouseId,
                @qtyRequired, @qtyIssued, @qtyReturned, @issueMethod, @unitCost, @totalCost, @remarks
            )
        `);
        const insertOperation = this.db.prepare(`
            INSERT INTO mfg_production_order_operations (
                id, production_order_id, step_no, work_center_code, operation_code,
                status, setup_time_minutes, run_time_minutes, labor_cost_rate, machine_cost_rate
            ) VALUES (
                @id, @productionOrderId, @stepNo, @workCenterCode, @operationCode,
                @status, @setupTimeMinutes, @runTimeMinutes, @laborCostRate, @machineCostRate
            )
        `);
        this.db.transaction((payload) => {
            insertHeader.run(payload);
            for (const component of payload.components) {
                insertComponent.run({ ...component, productionOrderId: payload.id });
            }
            for (const operation of payload.operations) {
                insertOperation.run({ ...operation, productionOrderId: payload.id });
            }
        })(input);
        return this.getProductionOrderById(input.companyId, input.branchId, input.id);
    }
    updateProductionOrder(input) {
        this.db.prepare(`
            UPDATE mfg_production_orders
            SET order_date = @orderDate,
                warehouse_id = @warehouseId,
                qty_planned = @qtyPlanned,
                reference_no = @referenceNo,
                remarks = @remarks,
                project_id = @projectId,
                cost_center_id = @costCenterId,
                approved_by = COALESCE(@approvedBy, approved_by),
                updated_at = @updatedAt
            WHERE id = @id
              AND company_id = @companyId
              AND branch_id = @branchId
        `).run(input);
        return this.getProductionOrderById(input.companyId, input.branchId, input.id);
    }
    getProductionOrderById(companyId, branchId, orderId) {
        const row = this.db.prepare(`
            SELECT *
            FROM mfg_production_orders
            WHERE id = ?
              AND company_id = ?
              AND branch_id = ?
            LIMIT 1
        `).get(orderId, companyId, branchId);
        if (!row)
            return null;
        return this.mapProductionOrder(row);
    }
    listProductionOrderComponents(orderId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_production_order_components
            WHERE production_order_id = ?
            ORDER BY line_no
        `).all(orderId);
        return rows.map((row) => this.mapProductionOrderComponent(row));
    }
    listProductionOrderOperations(orderId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_production_order_operations
            WHERE production_order_id = ?
            ORDER BY step_no
        `).all(orderId);
        return rows.map((row) => this.mapProductionOrderOperation(row));
    }
    saveProductionOrderStatus(input) {
        this.db.prepare(`
            UPDATE mfg_production_orders
            SET status = @status,
                approved_by = COALESCE(@approvedBy, approved_by),
                updated_at = @updatedAt
            WHERE id = @orderId
              AND company_id = @companyId
              AND branch_id = @branchId
        `).run(input);
    }
    updateProductionOrderProgress(input) {
        this.db.prepare(`
            UPDATE mfg_production_orders
            SET qty_issued = MAX(0, COALESCE(qty_issued, 0) + @qtyIssuedDelta),
                qty_completed = MAX(0, COALESCE(qty_completed, 0) + @qtyCompletedDelta),
                qty_scrapped = MAX(0, COALESCE(qty_scrapped, 0) + @qtyScrappedDelta),
                material_cost_issued = MAX(0, COALESCE(material_cost_issued, 0) + @materialCostIssuedDelta),
                cost_capitalized = MAX(0, COALESCE(cost_capitalized, 0) + @costCapitalizedDelta),
                unit_cost_completed = COALESCE(@unitCostCompleted, unit_cost_completed),
                total_wip_cost = COALESCE(@totalWipCost, total_wip_cost),
                status = COALESCE(@status, status),
                updated_at = @updatedAt
            WHERE id = @orderId
              AND company_id = @companyId
              AND branch_id = @branchId
        `).run({
            ...input,
            qtyIssuedDelta: Number(input.qtyIssuedDelta || 0),
            qtyCompletedDelta: Number(input.qtyCompletedDelta || 0),
            qtyScrappedDelta: Number(input.qtyScrappedDelta || 0),
            materialCostIssuedDelta: Number(input.materialCostIssuedDelta || 0),
            costCapitalizedDelta: Number(input.costCapitalizedDelta || 0),
            unitCostCompleted: input.unitCostCompleted ?? null,
            totalWipCost: input.totalWipCost ?? null,
            status: input.status ?? null,
        });
    }
    updateProductionOrderComponentProgress(orderId, componentLineId, deltaIssued, deltaReturned, updatedAt) {
        this.db.prepare(`
            UPDATE mfg_production_order_components
            SET qty_issued = MAX(0, COALESCE(qty_issued, 0) + @deltaIssued),
                qty_returned = MAX(0, COALESCE(qty_returned, 0) + @deltaReturned),
                unit_cost = CASE
                    WHEN COALESCE(qty_issued, 0) + @deltaIssued > 0
                        THEN COALESCE(unit_cost, 0)
                    ELSE unit_cost
                END,
                total_cost = (COALESCE(qty_issued, 0) + @deltaIssued) * COALESCE(unit_cost, 0),
                remarks = remarks
            WHERE production_order_id = @orderId
              AND id = @componentLineId
        `).run({ orderId, componentLineId, deltaIssued, deltaReturned, updatedAt });
    }
    createProductionIssue(input) {
        const insertHeader = this.db.prepare(`
            INSERT INTO mfg_production_issues (
                id, company_id, branch_id, issue_no, issue_date, status, production_order_id,
                reference_no, remarks, created_by, approved_by, version,
                created_at, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @issueNo, @issueDate, @status, @productionOrderId,
                @referenceNo, @remarks, @createdBy, @approvedBy, @version,
                @createdAt, @updatedAt
            )
        `);
        const insertLine = this.db.prepare(`
            INSERT INTO mfg_production_issue_lines (
                id, issue_id, line_no, component_line_id, component_item_id,
                warehouse_id, qty, unit_cost, total_cost, remarks
            ) VALUES (
                @id, @issueId, @lineNo, @componentLineId, @componentItemId,
                @warehouseId, @qty, @unitCost, @totalCost, @remarks
            )
        `);
        this.db.transaction((payload) => {
            insertHeader.run(payload);
            for (const line of payload.lines) {
                insertLine.run({ ...line, issueId: payload.id });
            }
        })(input);
        return this.getProductionIssueById(input.companyId, input.branchId, input.id);
    }
    getProductionIssueById(companyId, branchId, issueId) {
        const header = this.db.prepare(`
            SELECT *
            FROM mfg_production_issues
            WHERE id = ?
              AND company_id = ?
              AND branch_id = ?
            LIMIT 1
        `).get(issueId, companyId, branchId);
        if (!header)
            return null;
        const lines = this.db.prepare(`
            SELECT *
            FROM mfg_production_issue_lines
            WHERE issue_id = ?
            ORDER BY line_no
        `).all(issueId);
        return {
            header: this.mapProductionIssueHeader(header),
            lines: lines.map((row) => this.mapProductionIssueLine(row)),
        };
    }
    listProductionIssueLines(issueId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_production_issue_lines
            WHERE issue_id = ?
            ORDER BY line_no
        `).all(issueId);
        return rows.map((row) => this.mapProductionIssueLine(row));
    }
    listPostedActiveIssuesByOrder(orderId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_production_issues
            WHERE production_order_id = ?
              AND status = 'POSTED'
            ORDER BY issue_date, created_at
        `).all(orderId);
        return rows.map((row) => this.mapProductionIssueHeader(row));
    }
    saveProductionIssuePostingState(input) {
        this.db.prepare(`
            UPDATE mfg_production_issues
            SET status = @nextStatus,
                journal_id = COALESCE(@journalId, journal_id),
                posted_by = @postedBy,
                posted_at = @postedAt,
                stock_posted_at = @stockPostedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @postedAt
            WHERE id = @issueId
              AND company_id = @companyId
              AND branch_id = @branchId
        `).run(input);
    }
    saveProductionIssueReversalState(input) {
        this.db.prepare(`
            UPDATE mfg_production_issues
            SET status = @nextStatus,
                reversal_journal_id = COALESCE(@reversalJournalId, reversal_journal_id),
                reversed_by = @reversedBy,
                reversed_at = @reversedAt,
                stock_reversed_at = @stockReversedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @reversedAt
            WHERE id = @issueId
              AND company_id = @companyId
              AND branch_id = @branchId
        `).run(input);
    }
    createProductionReceipt(input) {
        const insertHeader = this.db.prepare(`
            INSERT INTO mfg_production_receipts (
                id, company_id, branch_id, receipt_no, receipt_date, status, production_order_id,
                reference_no, remarks, created_by, approved_by, version,
                created_at, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @receiptNo, @receiptDate, @status, @productionOrderId,
                @referenceNo, @remarks, @createdBy, @approvedBy, @version,
                @createdAt, @updatedAt
            )
        `);
        const insertLine = this.db.prepare(`
            INSERT INTO mfg_production_receipt_lines (
                id, receipt_id, line_no, item_id, warehouse_id,
                qty_received, qty_scrapped, unit_cost, total_cost, remarks
            ) VALUES (
                @id, @receiptId, @lineNo, @itemId, @warehouseId,
                @qtyReceived, @qtyScrapped, @unitCost, @totalCost, @remarks
            )
        `);
        this.db.transaction((payload) => {
            insertHeader.run(payload);
            for (const line of payload.lines) {
                insertLine.run({ ...line, receiptId: payload.id });
            }
        })(input);
        return this.getProductionReceiptById(input.companyId, input.branchId, input.id);
    }
    getProductionReceiptById(companyId, branchId, receiptId) {
        const header = this.db.prepare(`
            SELECT *
            FROM mfg_production_receipts
            WHERE id = ?
              AND company_id = ?
              AND branch_id = ?
            LIMIT 1
        `).get(receiptId, companyId, branchId);
        if (!header)
            return null;
        const lines = this.db.prepare(`
            SELECT *
            FROM mfg_production_receipt_lines
            WHERE receipt_id = ?
            ORDER BY line_no
        `).all(receiptId);
        return {
            header: this.mapProductionReceiptHeader(header),
            lines: lines.map((row) => this.mapProductionReceiptLine(row)),
        };
    }
    listProductionReceiptLines(receiptId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_production_receipt_lines
            WHERE receipt_id = ?
            ORDER BY line_no
        `).all(receiptId);
        return rows.map((row) => this.mapProductionReceiptLine(row));
    }
    listPostedActiveReceiptsByOrder(orderId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_production_receipts
            WHERE production_order_id = ?
              AND status = 'POSTED'
            ORDER BY receipt_date, created_at
        `).all(orderId);
        return rows.map((row) => this.mapProductionReceiptHeader(row));
    }
    saveProductionReceiptPostingState(input) {
        this.db.prepare(`
            UPDATE mfg_production_receipts
            SET status = @nextStatus,
                journal_id = COALESCE(@journalId, journal_id),
                posted_by = @postedBy,
                posted_at = @postedAt,
                stock_posted_at = @stockPostedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @postedAt
            WHERE id = @receiptId
              AND company_id = @companyId
              AND branch_id = @branchId
        `).run(input);
    }
    saveProductionReceiptReversalState(input) {
        this.db.prepare(`
            UPDATE mfg_production_receipts
            SET status = @nextStatus,
                reversal_journal_id = COALESCE(@reversalJournalId, reversal_journal_id),
                reversed_by = @reversedBy,
                reversed_at = @reversedAt,
                stock_reversed_at = @stockReversedAt,
                version = COALESCE(version, 1) + 1,
                updated_at = @reversedAt
            WHERE id = @receiptId
              AND company_id = @companyId
              AND branch_id = @branchId
        `).run(input);
    }
    hasStockLedgerPosting(companyId, docType, docId, isReversal) {
        const row = this.db.prepare(`
            SELECT 1
            FROM stock_ledger_entries
            WHERE company_id = ?
              AND doc_type = ?
              AND doc_id = ?
              AND COALESCE(is_reversal, 0) = ?
            LIMIT 1
        `).get(companyId, docType, docId, isReversal ? 1 : 0);
        return Boolean(row);
    }
    listStockLedgerEntries(companyId, docType, docId, isReversal) {
        const rows = this.db.prepare(`
            SELECT
                id,
                company_id,
                branch_id,
                doc_type,
                doc_id,
                doc_line_id,
                item_id,
                warehouse_id,
                COALESCE(qty_in, 0) AS qty_in,
                COALESCE(qty_out, 0) AS qty_out,
                COALESCE(unit_cost, 0) AS unit_cost,
                COALESCE(total_cost, 0) AS total_cost,
                COALESCE(movement_side, CASE WHEN COALESCE(qty_out, 0) > 0 THEN 'OUT' ELSE 'IN' END) AS movement_side,
                COALESCE(is_reversal, 0) AS is_reversal,
                reversed_entry_id,
                movement_date,
                created_at
            FROM stock_ledger_entries
            WHERE company_id = ?
              AND doc_type = ?
              AND doc_id = ?
              AND COALESCE(is_reversal, 0) = ?
            ORDER BY created_at, id
        `).all(companyId, docType, docId, isReversal ? 1 : 0);
        return rows.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            docType: row.doc_type,
            docId: row.doc_id,
            docLineId: row.doc_line_id,
            itemId: row.item_id,
            warehouseId: row.warehouse_id,
            qtyIn: Number(row.qty_in || 0),
            qtyOut: Number(row.qty_out || 0),
            unitCost: Number(row.unit_cost || 0),
            totalCost: Number(row.total_cost || 0),
            movementSide: String(row.movement_side || 'IN').toUpperCase() === 'OUT' ? 'OUT' : 'IN',
            isReversal: Number(row.is_reversal || 0) === 1,
            reversedEntryId: row.reversed_entry_id || null,
            movementDate: row.movement_date,
            createdAt: row.created_at,
        }));
    }
    insertStockLedgerEntries(entries) {
        if (!entries.length)
            return;
        const insert = this.db.prepare(`
            INSERT INTO stock_ledger_entries (
                id,
                company_id,
                branch_id,
                doc_type,
                doc_id,
                doc_line_id,
                item_id,
                warehouse_id,
                qty_in,
                qty_out,
                unit_cost,
                total_cost,
                movement_side,
                is_reversal,
                reversed_entry_id,
                movement_date,
                created_at
            ) VALUES (
                @id,
                @companyId,
                @branchId,
                @docType,
                @docId,
                @docLineId,
                @itemId,
                @warehouseId,
                @qtyIn,
                @qtyOut,
                @unitCost,
                @totalCost,
                @movementSide,
                @isReversal,
                @reversedEntryId,
                @movementDate,
                @createdAt
            )
        `);
        const tx = this.db.transaction((rows) => {
            for (const row of rows) {
                insert.run({
                    ...row,
                    qtyIn: Number(row.qtyIn || 0),
                    qtyOut: Number(row.qtyOut || 0),
                    unitCost: Number(row.unitCost || 0),
                    totalCost: Number(row.totalCost || 0),
                    isReversal: row.isReversal ? 1 : 0,
                });
            }
        });
        tx(entries);
    }
    getPolicy(_companyId) {
        const getSetting = (keys) => {
            for (const key of keys) {
                const row = this.db.prepare('SELECT value FROM settings WHERE key = ? LIMIT 1').get(key);
                const value = String(row?.value || '').trim();
                if (value)
                    return value;
            }
            return '';
        };
        const issueAccountingRaw = getSetting([
            'manufacturing.issue.accounting',
            'manufacturing_issue_accounting',
            'manufacturing.accounting.issue',
            'manufacturing_accounting_issue',
        ]).toUpperCase();
        const receiptAccountingRaw = getSetting([
            'manufacturing.receipt.accounting',
            'manufacturing_receipt_accounting',
            'manufacturing.accounting.receipt',
            'manufacturing_accounting_receipt',
        ]).toUpperCase();
        const allowOverIssueRaw = getSetting([
            'manufacturing.allow_over_issue',
            'manufacturing_allow_over_issue',
        ]).toUpperCase();
        const allowOverReceiptRaw = getSetting([
            'manufacturing.allow_over_receipt',
            'manufacturing_allow_over_receipt',
        ]).toUpperCase();
        return {
            issueAccountingEnabled: issueAccountingRaw ? TRUE_VALUES.has(issueAccountingRaw) : true,
            receiptAccountingEnabled: receiptAccountingRaw ? TRUE_VALUES.has(receiptAccountingRaw) : true,
            allowOverIssue: TRUE_VALUES.has(allowOverIssueRaw),
            allowOverReceipt: TRUE_VALUES.has(allowOverReceiptRaw),
        };
    }
    mapBomHeader(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            itemId: row.item_id,
            versionNo: Number(row.version_no || 1),
            status: String(row.status || 'DRAFT').toUpperCase(),
            isDefault: Number(row.is_default || 0) === 1,
            outputQty: Number(row.output_qty || 0),
            effectiveFrom: row.effective_from || null,
            effectiveTo: row.effective_to || null,
            remarks: row.remarks || null,
            createdBy: row.created_by,
            approvedBy: row.approved_by || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    mapBomLine(row) {
        return {
            id: row.id,
            bomId: row.bom_id,
            lineNo: Number(row.line_no || 0),
            componentItemId: row.component_item_id,
            warehouseId: row.warehouse_id || null,
            qtyPer: Number(row.qty_per || 0),
            scrapPercent: Number(row.scrap_percent || 0),
            issueMethod: String(row.issue_method || 'MANUAL').toUpperCase() === 'BACKFLUSH' ? 'BACKFLUSH' : 'MANUAL',
            remarks: row.remarks || null,
        };
    }
    mapRoutingHeader(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            itemId: row.item_id,
            versionNo: Number(row.version_no || 1),
            status: String(row.status || 'DRAFT').toUpperCase(),
            isDefault: Number(row.is_default || 0) === 1,
            remarks: row.remarks || null,
            createdBy: row.created_by,
            approvedBy: row.approved_by || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    mapRoutingStep(row) {
        return {
            id: row.id,
            routingId: row.routing_id,
            stepNo: Number(row.step_no || 0),
            workCenterCode: row.work_center_code,
            operationCode: row.operation_code,
            setupTimeMinutes: Number(row.setup_time_minutes || 0),
            runTimeMinutes: Number(row.run_time_minutes || 0),
            laborCostRate: Number(row.labor_cost_rate || 0),
            machineCostRate: Number(row.machine_cost_rate || 0),
            remarks: row.remarks || null,
        };
    }
    mapProductionOrder(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            orderNo: row.order_no,
            orderDate: row.order_date,
            status: String(row.status || 'DRAFT').toUpperCase(),
            itemId: row.item_id,
            bomId: row.bom_id || null,
            routingId: row.routing_id || null,
            warehouseId: row.warehouse_id,
            qtyPlanned: Number(row.qty_planned || 0),
            qtyStarted: Number(row.qty_started || 0),
            qtyCompleted: Number(row.qty_completed || 0),
            qtyScrapped: Number(row.qty_scrapped || 0),
            qtyIssued: Number(row.qty_issued || 0),
            materialCostIssued: Number(row.material_cost_issued || 0),
            laborCostEstimated: Number(row.labor_cost_estimated || 0),
            machineCostEstimated: Number(row.machine_cost_estimated || 0),
            costCapitalized: Number(row.cost_capitalized || 0),
            totalWipCost: Number(row.total_wip_cost || 0),
            unitCostCompleted: Number(row.unit_cost_completed || 0),
            referenceNo: row.reference_no || null,
            remarks: row.remarks || null,
            projectId: row.project_id || null,
            costCenterId: row.cost_center_id || null,
            createdBy: row.created_by,
            approvedBy: row.approved_by || null,
            sourceDocType: row.source_doc_type || null,
            sourceDocId: row.source_doc_id || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    mapProductionOrderComponent(row) {
        return {
            id: row.id,
            productionOrderId: row.production_order_id,
            lineNo: Number(row.line_no || 0),
            componentItemId: row.component_item_id,
            warehouseId: row.warehouse_id || null,
            qtyRequired: Number(row.qty_required || 0),
            qtyIssued: Number(row.qty_issued || 0),
            qtyReturned: Number(row.qty_returned || 0),
            issueMethod: String(row.issue_method || 'MANUAL').toUpperCase() === 'BACKFLUSH' ? 'BACKFLUSH' : 'MANUAL',
            unitCost: row.unit_cost === null || row.unit_cost === undefined ? null : Number(row.unit_cost),
            totalCost: row.total_cost === null || row.total_cost === undefined ? null : Number(row.total_cost),
            remarks: row.remarks || null,
        };
    }
    mapProductionOrderOperation(row) {
        return {
            id: row.id,
            productionOrderId: row.production_order_id,
            stepNo: Number(row.step_no || 0),
            workCenterCode: row.work_center_code,
            operationCode: row.operation_code,
            status: String(row.status || 'PENDING').toUpperCase(),
            setupTimeMinutes: Number(row.setup_time_minutes || 0),
            runTimeMinutes: Number(row.run_time_minutes || 0),
            laborCostRate: Number(row.labor_cost_rate || 0),
            machineCostRate: Number(row.machine_cost_rate || 0),
        };
    }
    mapProductionIssueHeader(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            issueNo: row.issue_no,
            issueDate: row.issue_date,
            status: String(row.status || 'DRAFT').toUpperCase(),
            productionOrderId: row.production_order_id,
            referenceNo: row.reference_no || null,
            remarks: row.remarks || null,
            createdBy: row.created_by,
            approvedBy: row.approved_by || null,
            version: Number(row.version || 1),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            postedAt: row.posted_at || null,
            postedBy: row.posted_by || null,
            reversedAt: row.reversed_at || null,
            reversedBy: row.reversed_by || null,
            stockPostedAt: row.stock_posted_at || null,
            stockReversedAt: row.stock_reversed_at || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    mapProductionIssueLine(row) {
        return {
            id: row.id,
            issueId: row.issue_id,
            lineNo: Number(row.line_no || 0),
            componentLineId: row.component_line_id || null,
            componentItemId: row.component_item_id,
            warehouseId: row.warehouse_id,
            qty: Number(row.qty || 0),
            unitCost: Number(row.unit_cost || 0),
            totalCost: Number(row.total_cost || 0),
            remarks: row.remarks || null,
        };
    }
    mapProductionReceiptHeader(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            receiptNo: row.receipt_no,
            receiptDate: row.receipt_date,
            status: String(row.status || 'DRAFT').toUpperCase(),
            productionOrderId: row.production_order_id,
            referenceNo: row.reference_no || null,
            remarks: row.remarks || null,
            createdBy: row.created_by,
            approvedBy: row.approved_by || null,
            version: Number(row.version || 1),
            journalId: row.journal_id || null,
            reversalJournalId: row.reversal_journal_id || null,
            postedAt: row.posted_at || null,
            postedBy: row.posted_by || null,
            reversedAt: row.reversed_at || null,
            reversedBy: row.reversed_by || null,
            stockPostedAt: row.stock_posted_at || null,
            stockReversedAt: row.stock_reversed_at || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    mapProductionReceiptLine(row) {
        return {
            id: row.id,
            receiptId: row.receipt_id,
            lineNo: Number(row.line_no || 0),
            itemId: row.item_id,
            warehouseId: row.warehouse_id,
            qtyReceived: Number(row.qty_received || 0),
            qtyScrapped: Number(row.qty_scrapped || 0),
            unitCost: Number(row.unit_cost || 0),
            totalCost: Number(row.total_cost || 0),
            remarks: row.remarks || null,
        };
    }
}
exports.SqliteManufacturingRepo = SqliteManufacturingRepo;
