"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteManufacturingRepo = void 0;
const crypto_1 = require("crypto");
const WorkCenter_1 = require("../../domain/entities/WorkCenter");
const BillOfMaterial_1 = require("../../domain/entities/BillOfMaterial");
const RoutingOperation_1 = require("../../domain/entities/RoutingOperation");
const ProductionOrder_1 = require("../../domain/entities/ProductionOrder");
const JobCard_1 = require("../../domain/entities/JobCard");
class SqliteManufacturingRepo {
    constructor(db) {
        this.db = db;
        this.ensureTablesExist();
    }
    hasTable(tableName) {
        const row = this.db
            .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
            .get(tableName);
        return !!row;
    }
    hasColumn(tableName, columnName) {
        const cols = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        return cols.some(c => c.name === columnName);
    }
    addColumnIfMissing(tableName, columnName, sqlTypeWithDefault) {
        if (!this.hasColumn(tableName, columnName)) {
            this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlTypeWithDefault}`);
        }
    }
    tableCount(tableName) {
        return Number(this.db.prepare(`SELECT COUNT(*) as c FROM ${tableName}`).get()?.c || 0);
    }
    ensureTablesExist() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS mfg_work_centers (
                id            TEXT PRIMARY KEY,
                company_id    TEXT NOT NULL DEFAULT '1',
                code          TEXT NOT NULL,
                name          TEXT NOT NULL,
                capacity      REAL NOT NULL DEFAULT 1,
                cost_per_hour REAL NOT NULL DEFAULT 0,
                is_active     INTEGER NOT NULL DEFAULT 1,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mfg_bom_headers (
                id              TEXT PRIMARY KEY,
                company_id      TEXT NOT NULL DEFAULT '1',
                code            TEXT NOT NULL,
                product_id      TEXT NOT NULL,
                product_name    TEXT NOT NULL,
                output_quantity REAL NOT NULL DEFAULT 1,
                unit            TEXT NOT NULL DEFAULT 'EA',
                labor_cost      REAL NOT NULL DEFAULT 0,
                overhead_cost   REAL NOT NULL DEFAULT 0,
                status          TEXT NOT NULL DEFAULT 'Draft',
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mfg_bom_lines (
                id            TEXT PRIMARY KEY,
                bom_id        TEXT NOT NULL,
                item_id       TEXT NOT NULL,
                item_name     TEXT NOT NULL,
                quantity      REAL NOT NULL DEFAULT 1,
                unit          TEXT NOT NULL DEFAULT 'EA',
                waste_percent REAL NOT NULL DEFAULT 0,
                FOREIGN KEY (bom_id) REFERENCES mfg_bom_headers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_routing_operations (
                id              TEXT PRIMARY KEY,
                bom_id          TEXT NOT NULL,
                sequence        INTEGER NOT NULL DEFAULT 1,
                work_center_id  TEXT,
                operation_name  TEXT NOT NULL,
                setup_minutes   REAL NOT NULL DEFAULT 0,
                run_minutes     REAL NOT NULL DEFAULT 0,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bom_id) REFERENCES mfg_bom_headers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mfg_production_orders (
                id             TEXT PRIMARY KEY,
                company_id     TEXT NOT NULL DEFAULT '1',
                order_no       TEXT NOT NULL,
                bom_id         TEXT NOT NULL,
                product_id     TEXT NOT NULL,
                product_name   TEXT NOT NULL,
                planned_qty    REAL NOT NULL DEFAULT 0,
                produced_qty   REAL NOT NULL DEFAULT 0,
                status         TEXT NOT NULL DEFAULT 'Draft',
                planned_date   TEXT,
                completed_date TEXT,
                notes          TEXT DEFAULT '',
                created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mfg_job_cards (
                id             TEXT PRIMARY KEY,
                order_id       TEXT NOT NULL,
                operation_id   TEXT,
                work_center_id TEXT,
                status         TEXT NOT NULL DEFAULT 'Pending',
                started_at     TEXT,
                completed_at   TEXT,
                output_qty     REAL NOT NULL DEFAULT 0,
                notes          TEXT DEFAULT '',
                created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
            );
        `);
        // Legacy compatibility: work centers
        this.addColumnIfMissing('mfg_work_centers', 'company_id', "TEXT NOT NULL DEFAULT '1'");
        this.addColumnIfMissing('mfg_work_centers', 'code', 'TEXT');
        this.addColumnIfMissing('mfg_work_centers', 'name', 'TEXT');
        this.addColumnIfMissing('mfg_work_centers', 'capacity', 'REAL NOT NULL DEFAULT 1');
        this.addColumnIfMissing('mfg_work_centers', 'cost_per_hour', 'REAL NOT NULL DEFAULT 0');
        this.addColumnIfMissing('mfg_work_centers', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
        this.addColumnIfMissing('mfg_work_centers', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        if (this.hasColumn('mfg_work_centers', 'capacity_per_hour')) {
            this.db.exec("UPDATE mfg_work_centers SET capacity = COALESCE(capacity, capacity_per_hour, 1)");
        }
        this.db.exec(`
            UPDATE mfg_work_centers
            SET company_id = COALESCE(NULLIF(company_id, ''), '1'),
                code = COALESCE(NULLIF(code, ''), id),
                name = COALESCE(NULLIF(name, ''), code, id),
                capacity = COALESCE(capacity, 1),
                cost_per_hour = COALESCE(cost_per_hour, 0),
                is_active = COALESCE(is_active, 1),
                created_at = COALESCE(created_at, CURRENT_TIMESTAMP);
        `);
        // Legacy compatibility: BOM headers/lines
        this.addColumnIfMissing('mfg_bom_headers', 'company_id', "TEXT NOT NULL DEFAULT '1'");
        this.addColumnIfMissing('mfg_bom_headers', 'code', 'TEXT');
        this.addColumnIfMissing('mfg_bom_headers', 'product_id', 'TEXT');
        this.addColumnIfMissing('mfg_bom_headers', 'product_name', 'TEXT');
        this.addColumnIfMissing('mfg_bom_headers', 'output_quantity', 'REAL NOT NULL DEFAULT 1');
        this.addColumnIfMissing('mfg_bom_headers', 'unit', "TEXT NOT NULL DEFAULT 'EA'");
        this.addColumnIfMissing('mfg_bom_headers', 'labor_cost', 'REAL NOT NULL DEFAULT 0');
        this.addColumnIfMissing('mfg_bom_headers', 'overhead_cost', 'REAL NOT NULL DEFAULT 0');
        this.addColumnIfMissing('mfg_bom_headers', 'status', "TEXT NOT NULL DEFAULT 'Draft'");
        this.addColumnIfMissing('mfg_bom_headers', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        this.addColumnIfMissing('mfg_bom_lines', 'item_name', 'TEXT');
        this.addColumnIfMissing('mfg_bom_lines', 'unit', "TEXT NOT NULL DEFAULT 'EA'");
        this.addColumnIfMissing('mfg_bom_lines', 'waste_percent', 'REAL NOT NULL DEFAULT 0');
        if (this.hasTable('mfg_boms') && this.tableCount('mfg_bom_headers') === 0) {
            this.db.exec(`
                INSERT OR IGNORE INTO mfg_bom_headers (
                    id, company_id, code, product_id, product_name,
                    output_quantity, unit, labor_cost, overhead_cost, status, created_at
                )
                SELECT
                    b.id,
                    '1',
                    COALESCE(NULLIF(b.bom_number, ''), b.id),
                    COALESCE(NULLIF(b.item_id, ''), ''),
                    COALESCE(NULLIF(i.name_ar, ''), NULLIF(i.name_en, ''), b.item_id, ''),
                    COALESCE(b.batch_size, 1),
                    'EA',
                    0,
                    0,
                    CASE WHEN COALESCE(b.is_default, 0) = 1 THEN 'Active' ELSE 'Draft' END,
                    COALESCE(b.created_at, CURRENT_TIMESTAMP)
                FROM mfg_boms b
                LEFT JOIN items i ON i.id = b.item_id;
            `);
        }
        if (this.hasTable('mfg_bom_components')) {
            this.db.exec(`
                INSERT OR IGNORE INTO mfg_bom_lines (
                    id, bom_id, item_id, item_name, quantity, unit, waste_percent
                )
                SELECT
                    c.id,
                    c.bom_id,
                    COALESCE(NULLIF(c.item_id, ''), ''),
                    COALESCE(NULLIF(i.name_ar, ''), NULLIF(i.name_en, ''), c.item_id, ''),
                    COALESCE(c.quantity, 0),
                    'EA',
                    COALESCE(c.scarp_percentage, 0)
                FROM mfg_bom_components c
                LEFT JOIN items i ON i.id = c.item_id
                WHERE EXISTS (SELECT 1 FROM mfg_bom_headers h WHERE h.id = c.bom_id);
            `);
        }
        this.db.exec(`
            UPDATE mfg_bom_headers
            SET company_id = COALESCE(NULLIF(company_id, ''), '1'),
                code = COALESCE(NULLIF(code, ''), id),
                product_id = COALESCE(product_id, ''),
                product_name = COALESCE(NULLIF(product_name, ''), product_id, code),
                output_quantity = COALESCE(output_quantity, 1),
                unit = COALESCE(NULLIF(unit, ''), 'EA'),
                labor_cost = COALESCE(labor_cost, 0),
                overhead_cost = COALESCE(overhead_cost, 0),
                status = COALESCE(NULLIF(status, ''), 'Draft'),
                created_at = COALESCE(created_at, CURRENT_TIMESTAMP);

            UPDATE mfg_bom_lines
            SET item_name = COALESCE(NULLIF(item_name, ''), item_id),
                quantity = COALESCE(quantity, 0),
                unit = COALESCE(NULLIF(unit, ''), 'EA'),
                waste_percent = COALESCE(waste_percent, 0);
        `);
        // Legacy compatibility: routing operations
        this.addColumnIfMissing('mfg_routing_operations', 'bom_id', 'TEXT');
        this.addColumnIfMissing('mfg_routing_operations', 'sequence', 'INTEGER NOT NULL DEFAULT 1');
        this.addColumnIfMissing('mfg_routing_operations', 'operation_name', 'TEXT');
        this.addColumnIfMissing('mfg_routing_operations', 'setup_minutes', 'REAL NOT NULL DEFAULT 0');
        this.addColumnIfMissing('mfg_routing_operations', 'run_minutes', 'REAL NOT NULL DEFAULT 0');
        this.addColumnIfMissing('mfg_routing_operations', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        this.addColumnIfMissing('mfg_routing_operations', 'work_center_id', 'TEXT');
        if (this.hasColumn('mfg_routing_operations', 'routing_id') && this.hasTable('mfg_routings')) {
            this.db.exec(`
                UPDATE mfg_routing_operations
                SET bom_id = COALESCE(
                    bom_id,
                    (SELECT r.bom_id FROM mfg_routings r WHERE r.id = mfg_routing_operations.routing_id LIMIT 1)
                );
            `);
        }
        if (this.hasColumn('mfg_routing_operations', 'sequence_order')) {
            this.db.exec("UPDATE mfg_routing_operations SET sequence = COALESCE(sequence, sequence_order, 1)");
        }
        if (this.hasColumn('mfg_routing_operations', 'description')) {
            this.db.exec("UPDATE mfg_routing_operations SET operation_name = COALESCE(operation_name, description)");
        }
        if (this.hasColumn('mfg_routing_operations', 'step_type')) {
            this.db.exec("UPDATE mfg_routing_operations SET operation_name = COALESCE(operation_name, step_type)");
        }
        if (this.hasColumn('mfg_routing_operations', 'setup_time_minutes')) {
            this.db.exec("UPDATE mfg_routing_operations SET setup_minutes = COALESCE(setup_minutes, setup_time_minutes, 0)");
        }
        if (this.hasColumn('mfg_routing_operations', 'run_time_minutes')) {
            this.db.exec("UPDATE mfg_routing_operations SET run_minutes = COALESCE(run_minutes, run_time_minutes, 0)");
        }
        this.db.exec(`
            UPDATE mfg_routing_operations
            SET sequence = COALESCE(sequence, 1),
                operation_name = COALESCE(NULLIF(operation_name, ''), 'Operation'),
                setup_minutes = COALESCE(setup_minutes, 0),
                run_minutes = COALESCE(run_minutes, 0),
                created_at = COALESCE(created_at, CURRENT_TIMESTAMP);
        `);
        // Legacy compatibility: production orders
        this.addColumnIfMissing('mfg_production_orders', 'company_id', "TEXT NOT NULL DEFAULT '1'");
        this.addColumnIfMissing('mfg_production_orders', 'order_no', 'TEXT');
        this.addColumnIfMissing('mfg_production_orders', 'bom_id', 'TEXT');
        this.addColumnIfMissing('mfg_production_orders', 'product_id', 'TEXT');
        this.addColumnIfMissing('mfg_production_orders', 'product_name', 'TEXT');
        this.addColumnIfMissing('mfg_production_orders', 'planned_qty', 'REAL NOT NULL DEFAULT 0');
        this.addColumnIfMissing('mfg_production_orders', 'produced_qty', 'REAL NOT NULL DEFAULT 0');
        this.addColumnIfMissing('mfg_production_orders', 'status', "TEXT NOT NULL DEFAULT 'Draft'");
        this.addColumnIfMissing('mfg_production_orders', 'planned_date', 'TEXT');
        this.addColumnIfMissing('mfg_production_orders', 'completed_date', 'TEXT');
        this.addColumnIfMissing('mfg_production_orders', 'notes', "TEXT DEFAULT ''");
        this.addColumnIfMissing('mfg_production_orders', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        if (this.hasColumn('mfg_production_orders', 'order_number')) {
            this.db.exec("UPDATE mfg_production_orders SET order_no = COALESCE(order_no, order_number)");
        }
        if (this.hasColumn('mfg_production_orders', 'item_id')) {
            this.db.exec("UPDATE mfg_production_orders SET product_id = COALESCE(product_id, item_id)");
        }
        if (this.hasColumn('mfg_production_orders', 'quantity')) {
            this.db.exec("UPDATE mfg_production_orders SET planned_qty = COALESCE(planned_qty, quantity, 0)");
        }
        if (this.hasColumn('mfg_production_orders', 'produced_quantity')) {
            this.db.exec("UPDATE mfg_production_orders SET produced_qty = COALESCE(produced_qty, produced_quantity, 0)");
        }
        if (this.hasColumn('mfg_production_orders', 'start_date')) {
            this.db.exec("UPDATE mfg_production_orders SET planned_date = COALESCE(planned_date, start_date)");
        }
        this.db.exec(`
            UPDATE mfg_production_orders
            SET product_name = COALESCE(
                    NULLIF(product_name, ''),
                    (SELECT COALESCE(NULLIF(i.name_ar, ''), NULLIF(i.name_en, ''), product_id) FROM items i WHERE i.id = mfg_production_orders.product_id LIMIT 1),
                    product_id
                ),
                company_id = COALESCE(NULLIF(company_id, ''), '1'),
                order_no = COALESCE(NULLIF(order_no, ''), id),
                planned_qty = COALESCE(planned_qty, 0),
                produced_qty = COALESCE(produced_qty, 0),
                status = COALESCE(NULLIF(status, ''), 'Draft'),
                planned_date = COALESCE(planned_date, DATE('now')),
                notes = COALESCE(notes, ''),
                created_at = COALESCE(created_at, CURRENT_TIMESTAMP);
        `);
        // Legacy compatibility: job cards
        this.addColumnIfMissing('mfg_job_cards', 'order_id', 'TEXT');
        this.addColumnIfMissing('mfg_job_cards', 'operation_id', 'TEXT');
        this.addColumnIfMissing('mfg_job_cards', 'work_center_id', 'TEXT');
        this.addColumnIfMissing('mfg_job_cards', 'status', "TEXT NOT NULL DEFAULT 'Pending'");
        this.addColumnIfMissing('mfg_job_cards', 'started_at', 'TEXT');
        this.addColumnIfMissing('mfg_job_cards', 'completed_at', 'TEXT');
        this.addColumnIfMissing('mfg_job_cards', 'output_qty', 'REAL NOT NULL DEFAULT 0');
        this.addColumnIfMissing('mfg_job_cards', 'notes', "TEXT DEFAULT ''");
        this.addColumnIfMissing('mfg_job_cards', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        if (this.hasColumn('mfg_job_cards', 'production_order_id')) {
            this.db.exec("UPDATE mfg_job_cards SET order_id = COALESCE(order_id, production_order_id)");
        }
        if (this.hasColumn('mfg_job_cards', 'start_time')) {
            this.db.exec("UPDATE mfg_job_cards SET started_at = COALESCE(started_at, start_time)");
        }
        if (this.hasColumn('mfg_job_cards', 'end_time')) {
            this.db.exec("UPDATE mfg_job_cards SET completed_at = COALESCE(completed_at, end_time)");
        }
        if (this.hasColumn('mfg_job_cards', 'produced_quantity')) {
            this.db.exec("UPDATE mfg_job_cards SET output_qty = COALESCE(output_qty, produced_quantity, 0)");
        }
        this.db.exec(`
            UPDATE mfg_job_cards
            SET status = COALESCE(NULLIF(status, ''), 'Pending'),
                output_qty = COALESCE(output_qty, 0),
                notes = COALESCE(notes, ''),
                created_at = COALESCE(created_at, CURRENT_TIMESTAMP);
        `);
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_mfg_wc_company ON mfg_work_centers(company_id);
            CREATE INDEX IF NOT EXISTS idx_mfg_bom_company ON mfg_bom_headers(company_id);
            CREATE INDEX IF NOT EXISTS idx_mfg_po_company ON mfg_production_orders(company_id);
            CREATE INDEX IF NOT EXISTS idx_mfg_jc_order ON mfg_job_cards(order_id);
            CREATE INDEX IF NOT EXISTS idx_mfg_bom_lines_bom ON mfg_bom_lines(bom_id);
            CREATE INDEX IF NOT EXISTS idx_mfg_routing_bom ON mfg_routing_operations(bom_id);
        `);
    }
    nextIdentity() {
        return (0, crypto_1.randomUUID)();
    }
    // ─── Work Centers ────────────────────────────────────────────────────────
    async saveWorkCenter(wc) {
        this.db.prepare(`
            INSERT INTO mfg_work_centers (id, company_id, code, name, capacity, cost_per_hour, is_active, created_at)
            VALUES (@id, @company_id, @code, @name, @capacity, @cost_per_hour, @is_active, @created_at)
            ON CONFLICT(id) DO UPDATE SET
                company_id = excluded.company_id,
                code = excluded.code,
                name = excluded.name,
                capacity = excluded.capacity,
                cost_per_hour = excluded.cost_per_hour,
                is_active = excluded.is_active
        `).run({
            id: wc.id,
            company_id: wc.companyId,
            code: wc.code,
            name: wc.name,
            capacity: wc.capacity,
            cost_per_hour: wc.costPerHour,
            is_active: wc.isActive ? 1 : 0,
            created_at: wc.createdAt
        });
    }
    async getWorkCenters(companyId) {
        const rows = this.db.prepare(`
            SELECT
                id,
                COALESCE(NULLIF(company_id, ''), '1') as company_id,
                COALESCE(NULLIF(code, ''), id) as code,
                COALESCE(NULLIF(name, ''), code, id) as name,
                COALESCE(capacity, 1) as capacity,
                COALESCE(cost_per_hour, 0) as cost_per_hour,
                COALESCE(is_active, 1) as is_active,
                COALESCE(created_at, CURRENT_TIMESTAMP) as created_at
            FROM mfg_work_centers
            WHERE COALESCE(NULLIF(company_id, ''), '1') = ?
            ORDER BY code
        `).all(companyId);
        return (rows || []).map((r) => new WorkCenter_1.WorkCenter(r.id, r.company_id, r.code, r.name, Number(r.capacity), Number(r.cost_per_hour), !!r.is_active, r.created_at));
    }
    async deleteWorkCenter(id) {
        this.db.prepare('DELETE FROM mfg_work_centers WHERE id = ?').run(id);
    }
    // ─── BOM ─────────────────────────────────────────────────────────────────
    async saveBOM(bom) {
        const upsertHeader = this.db.prepare(`
            INSERT INTO mfg_bom_headers (
                id, company_id, code, product_id, product_name,
                output_quantity, unit, labor_cost, overhead_cost, status, created_at
            )
            VALUES (
                @id, @company_id, @code, @product_id, @product_name,
                @output_quantity, @unit, @labor_cost, @overhead_cost, @status, @created_at
            )
            ON CONFLICT(id) DO UPDATE SET
                company_id = excluded.company_id,
                code = excluded.code,
                product_id = excluded.product_id,
                product_name = excluded.product_name,
                output_quantity = excluded.output_quantity,
                unit = excluded.unit,
                labor_cost = excluded.labor_cost,
                overhead_cost = excluded.overhead_cost,
                status = excluded.status
        `);
        const deleteLines = this.db.prepare('DELETE FROM mfg_bom_lines WHERE bom_id = ?');
        const insertLine = this.db.prepare(`
            INSERT INTO mfg_bom_lines (id, bom_id, item_id, item_name, quantity, unit, waste_percent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const tx = this.db.transaction((payload) => {
            upsertHeader.run({
                id: payload.id,
                company_id: payload.companyId,
                code: payload.code,
                product_id: payload.productId,
                product_name: payload.productName,
                output_quantity: payload.outputQuantity,
                unit: payload.unit,
                labor_cost: payload.laborCost,
                overhead_cost: payload.overheadCost,
                status: payload.status,
                created_at: payload.createdAt
            });
            deleteLines.run(payload.id);
            for (const l of payload.lines) {
                insertLine.run(l.id, payload.id, l.itemId, l.itemName, l.quantity, l.unit || 'EA', l.wastePercent || 0);
            }
        });
        tx(bom);
    }
    async getBOMs(companyId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_bom_headers
            WHERE COALESCE(NULLIF(company_id, ''), '1') = ?
            ORDER BY code
        `).all(companyId);
        return (rows || []).map((r) => this._rowToBOM(r, []));
    }
    async getBOMById(id) {
        const row = this.db.prepare('SELECT * FROM mfg_bom_headers WHERE id = ?').get(id);
        if (!row)
            return null;
        const lines = this.db.prepare('SELECT * FROM mfg_bom_lines WHERE bom_id = ? ORDER BY rowid').all(id);
        return this._rowToBOM(row, lines || []);
    }
    _rowToBOM(row, lineRows) {
        const lines = (lineRows || []).map((l) => ({
            id: l.id,
            bomId: l.bom_id,
            itemId: l.item_id,
            itemName: l.item_name,
            quantity: Number(l.quantity || 0),
            unit: l.unit || 'EA',
            wastePercent: Number(l.waste_percent || 0)
        }));
        return new BillOfMaterial_1.BillOfMaterial(row.id, row.company_id || '1', row.code || row.id, row.product_id || '', row.product_name || row.product_id || '', Number(row.output_quantity || 1), row.unit || 'EA', Number(row.labor_cost || 0), Number(row.overhead_cost || 0), row.status || 'Draft', lines, row.created_at);
    }
    // ─── Routing ─────────────────────────────────────────────────────────────
    async saveRouting(op) {
        this.db.prepare(`
            INSERT INTO mfg_routing_operations (
                id, bom_id, sequence, work_center_id, operation_name, setup_minutes, run_minutes, created_at
            )
            VALUES (
                @id, @bom_id, @sequence, @work_center_id, @operation_name, @setup_minutes, @run_minutes, @created_at
            )
            ON CONFLICT(id) DO UPDATE SET
                bom_id = excluded.bom_id,
                sequence = excluded.sequence,
                work_center_id = excluded.work_center_id,
                operation_name = excluded.operation_name,
                setup_minutes = excluded.setup_minutes,
                run_minutes = excluded.run_minutes
        `).run({
            id: op.id,
            bom_id: op.bomId,
            sequence: op.sequence,
            work_center_id: op.workCenterId || null,
            operation_name: op.operationName,
            setup_minutes: op.setupMinutes,
            run_minutes: op.runMinutes,
            created_at: op.createdAt
        });
    }
    async deleteRoutingsByBOM(bomId) {
        this.db.prepare('DELETE FROM mfg_routing_operations WHERE bom_id = ?').run(bomId);
    }
    async getRoutingsByBOM(bomId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_routing_operations
            WHERE bom_id = ?
            ORDER BY sequence, rowid
        `).all(bomId);
        return (rows || []).map((r) => new RoutingOperation_1.RoutingOperation(r.id, r.bom_id, Number(r.sequence || 1), r.work_center_id || '', r.operation_name || 'Operation', Number(r.setup_minutes || 0), Number(r.run_minutes || 0), r.created_at));
    }
    // ─── Production Orders ────────────────────────────────────────────────────
    async saveOrder(order) {
        this.db.prepare(`
            INSERT INTO mfg_production_orders (
                id, company_id, order_no, bom_id, product_id, product_name,
                planned_qty, produced_qty, status, planned_date, completed_date, notes, created_at
            )
            VALUES (
                @id, @company_id, @order_no, @bom_id, @product_id, @product_name,
                @planned_qty, @produced_qty, @status, @planned_date, @completed_date, @notes, @created_at
            )
            ON CONFLICT(id) DO UPDATE SET
                company_id = excluded.company_id,
                order_no = excluded.order_no,
                bom_id = excluded.bom_id,
                product_id = excluded.product_id,
                product_name = excluded.product_name,
                planned_qty = excluded.planned_qty,
                produced_qty = excluded.produced_qty,
                status = excluded.status,
                planned_date = excluded.planned_date,
                completed_date = excluded.completed_date,
                notes = excluded.notes
        `).run({
            id: order.id,
            company_id: order.companyId,
            order_no: order.orderNo,
            bom_id: order.bomId,
            product_id: order.productId,
            product_name: order.productName,
            planned_qty: order.plannedQty,
            produced_qty: order.producedQty,
            status: order.status,
            planned_date: order.plannedDate,
            completed_date: order.completedDate,
            notes: order.notes || '',
            created_at: order.createdAt
        });
    }
    async getOrders(companyId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_production_orders
            WHERE COALESCE(NULLIF(company_id, ''), '1') = ?
            ORDER BY created_at DESC
        `).all(companyId);
        return (rows || []).map((r) => this._rowToOrder(r));
    }
    async getOrderById(id) {
        const row = this.db.prepare('SELECT * FROM mfg_production_orders WHERE id = ?').get(id);
        return row ? this._rowToOrder(row) : null;
    }
    _rowToOrder(r) {
        return new ProductionOrder_1.ProductionOrder(r.id, r.company_id || '1', r.order_no || r.id, r.bom_id || '', r.product_id || '', r.product_name || r.product_id || '', Number(r.planned_qty || 0), Number(r.produced_qty || 0), r.status || 'Draft', r.planned_date || new Date().toISOString().split('T')[0], r.completed_date || null, r.notes || '', r.created_at);
    }
    // ─── Job Cards ────────────────────────────────────────────────────────────
    async saveJobCard(card) {
        this.db.prepare(`
            INSERT INTO mfg_job_cards (
                id, order_id, operation_id, work_center_id, status,
                started_at, completed_at, output_qty, notes, created_at
            )
            VALUES (
                @id, @order_id, @operation_id, @work_center_id, @status,
                @started_at, @completed_at, @output_qty, @notes, @created_at
            )
            ON CONFLICT(id) DO UPDATE SET
                order_id = excluded.order_id,
                operation_id = excluded.operation_id,
                work_center_id = excluded.work_center_id,
                status = excluded.status,
                started_at = excluded.started_at,
                completed_at = excluded.completed_at,
                output_qty = excluded.output_qty,
                notes = excluded.notes
        `).run({
            id: card.id,
            order_id: card.orderId,
            operation_id: card.operationId,
            work_center_id: card.workCenterId,
            status: card.status,
            started_at: card.startedAt,
            completed_at: card.completedAt,
            output_qty: card.outputQty,
            notes: card.notes || '',
            created_at: card.createdAt
        });
    }
    async getJobCardById(id) {
        const row = this.db.prepare('SELECT * FROM mfg_job_cards WHERE id = ?').get(id);
        return row ? this._rowToJobCard(row) : null;
    }
    async getJobCards(orderId) {
        const rows = this.db.prepare(`
            SELECT *
            FROM mfg_job_cards
            WHERE order_id = ?
            ORDER BY created_at
        `).all(orderId);
        return (rows || []).map((r) => this._rowToJobCard(r));
    }
    _rowToJobCard(r) {
        return new JobCard_1.JobCard(r.id, r.order_id, r.operation_id || null, r.work_center_id || null, r.status || 'Pending', r.started_at || null, r.completed_at || null, Number(r.output_qty || 0), r.notes || '', r.created_at);
    }
}
exports.SqliteManufacturingRepo = SqliteManufacturingRepo;
