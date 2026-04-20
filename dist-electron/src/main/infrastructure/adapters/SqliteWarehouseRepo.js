"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteWarehouseRepo = void 0;
const Warehouse_1 = require("../../domain/entities/Warehouse");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SqliteWarehouseRepo {
    constructor(database) {
        this.db = database || new better_sqlite3_1.default('wafi.db');
        this.ensureTableExists();
    }
    ensureTableExists() {
        const exists = this.db
            .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'warehouses'")
            .get();
        if (!exists) {
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS warehouses (
                    id TEXT PRIMARY KEY,
                    company_id TEXT NOT NULL,
                    code TEXT NOT NULL,
                    name_en TEXT NOT NULL,
                    name_ar TEXT,
                    location TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
        }
        else {
            const cols = this.db.prepare("PRAGMA table_info(warehouses)").all();
            const hasCol = (name) => cols.some(c => c.name === name);
            if (!hasCol('company_id')) {
                this.db.prepare("ALTER TABLE warehouses ADD COLUMN company_id TEXT").run();
                this.db.prepare("UPDATE warehouses SET company_id = '1' WHERE company_id IS NULL OR TRIM(company_id) = ''").run();
            }
            if (!hasCol('code')) {
                this.db.prepare("ALTER TABLE warehouses ADD COLUMN code TEXT").run();
                this.db.prepare("UPDATE warehouses SET code = id WHERE code IS NULL OR TRIM(code) = ''").run();
            }
            if (!hasCol('name_en')) {
                this.db.prepare("ALTER TABLE warehouses ADD COLUMN name_en TEXT").run();
                this.db.prepare("UPDATE warehouses SET name_en = COALESCE(NULLIF(name_ar, ''), NULLIF(name, ''), code) WHERE name_en IS NULL OR TRIM(name_en) = ''").run();
            }
            if (!hasCol('name_ar')) {
                this.db.prepare("ALTER TABLE warehouses ADD COLUMN name_ar TEXT").run();
            }
            if (!hasCol('location')) {
                this.db.prepare("ALTER TABLE warehouses ADD COLUMN location TEXT").run();
            }
            if (!hasCol('is_active')) {
                this.db.prepare("ALTER TABLE warehouses ADD COLUMN is_active INTEGER DEFAULT 1").run();
            }
            if (!hasCol('created_at')) {
                this.db.prepare("ALTER TABLE warehouses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP").run();
            }
            if (!hasCol('updated_at')) {
                this.db.prepare("ALTER TABLE warehouses ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP").run();
            }
        }
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_warehouses_company on warehouses(company_id);");
        try {
            this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_code on warehouses(company_id, code);");
        }
        catch (err) {
            console.warn('[WarehouseRepo] Could not create unique index idx_warehouses_code:', err?.message || err);
        }
    }
    async findById(id, companyId) {
        const stmt = this.db.prepare('SELECT * FROM warehouses WHERE id = ? AND company_id = ?');
        const row = stmt.get(id, companyId);
        if (!row)
            return null;
        return this.mapToDomain(row);
    }
    async findAll(companyId) {
        const stmt = this.db.prepare('SELECT * FROM warehouses WHERE company_id = ? ORDER BY code ASC');
        const rows = stmt.all(companyId);
        return rows.map(r => this.mapToDomain(r));
    }
    async create(warehouse) {
        const stmt = this.db.prepare(`
            INSERT INTO warehouses (
                id, company_id, code, name_en, name_ar, location, is_active
            ) VALUES (
                @id, @companyId, @code, @nameEn, @nameAr, @location, @isActive
            )
        `);
        stmt.run({
            id: warehouse.id,
            companyId: warehouse.companyId,
            code: warehouse.code,
            nameEn: warehouse.nameEn,
            nameAr: warehouse.nameAr,
            location: warehouse.location,
            isActive: warehouse.isActive ? 1 : 0
        });
    }
    async update(warehouse) {
        const stmt = this.db.prepare(`
            UPDATE warehouses 
            SET name_en = @nameEn, name_ar = @nameAr, location = @location, is_active = @isActive,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id AND company_id = @companyId
        `);
        stmt.run({
            id: warehouse.id,
            companyId: warehouse.companyId,
            nameEn: warehouse.nameEn,
            nameAr: warehouse.nameAr,
            location: warehouse.location,
            isActive: warehouse.isActive ? 1 : 0
        });
    }
    async delete(id, companyId) {
        const stmt = this.db.prepare('DELETE FROM warehouses WHERE id = ? AND company_id = ?');
        stmt.run(id, companyId);
    }
    mapToDomain(row) {
        const fallbackNameEn = row.name_en || row.name_ar || row.name || row.code;
        return new Warehouse_1.Warehouse(row.id, row.company_id || '1', row.code, fallbackNameEn, row.is_active === 1, row.name_ar, row.location);
    }
}
exports.SqliteWarehouseRepo = SqliteWarehouseRepo;
