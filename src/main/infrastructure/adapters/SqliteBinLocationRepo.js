"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteBinLocationRepo = void 0;
const Warehouse_1 = require("../../domain/entities/Warehouse");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SqliteBinLocationRepo {
    constructor(database) {
        this.db = database || new better_sqlite3_1.default('wafi.db');
        this.ensureTableExists();
    }
    ensureTableExists() {
        const sql = `
            CREATE TABLE IF NOT EXISTS bin_locations (
                id TEXT PRIMARY KEY,
                warehouse_id TEXT NOT NULL,
                code TEXT NOT NULL,
                name_en TEXT NOT NULL,
                name_ar TEXT,
                capacity REAL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
            );

            CREATE INDEX IF NOT EXISTS idx_bin_locations_warehouse on bin_locations(warehouse_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_bin_locations_code on bin_locations(warehouse_id, code);
        `;
        this.db.exec(sql);
    }
    async findById(id) {
        const stmt = this.db.prepare('SELECT * FROM bin_locations WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapToDomain(row);
    }
    async findByWarehouse(warehouseId) {
        const stmt = this.db.prepare('SELECT * FROM bin_locations WHERE warehouse_id = ? ORDER BY code ASC');
        const rows = stmt.all(warehouseId);
        return rows.map(r => this.mapToDomain(r));
    }
    async create(binLocation) {
        const stmt = this.db.prepare(`
            INSERT INTO bin_locations (
                id, warehouse_id, code, name_en, name_ar, capacity, is_active
            ) VALUES (
                @id, @warehouseId, @code, @nameEn, @nameAr, @capacity, @isActive
            )
        `);
        stmt.run({
            id: binLocation.id,
            warehouseId: binLocation.warehouseId,
            code: binLocation.code,
            nameEn: binLocation.nameEn,
            nameAr: binLocation.nameAr,
            capacity: binLocation.capacity,
            isActive: binLocation.isActive ? 1 : 0
        });
    }
    async update(binLocation) {
        const stmt = this.db.prepare(`
            UPDATE bin_locations 
            SET name_en = @nameEn, name_ar = @nameAr, capacity = @capacity, is_active = @isActive,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `);
        stmt.run({
            id: binLocation.id,
            nameEn: binLocation.nameEn,
            nameAr: binLocation.nameAr,
            capacity: binLocation.capacity,
            isActive: binLocation.isActive ? 1 : 0
        });
    }
    async delete(id) {
        const stmt = this.db.prepare('DELETE FROM bin_locations WHERE id = ?');
        stmt.run(id);
    }
    mapToDomain(row) {
        return new Warehouse_1.BinLocation(row.id, row.warehouse_id, row.code, row.name_en, row.is_active === 1, row.name_ar, row.capacity);
    }
}
exports.SqliteBinLocationRepo = SqliteBinLocationRepo;
