import { BinLocation } from '../../domain/entities/Warehouse';
import { BinLocationRepoPort } from '../../domain/ports/WarehouseRepoPort';
import Database from 'better-sqlite3';

export class SqliteBinLocationRepo implements BinLocationRepoPort {
    private db: Database.Database;

    constructor(database?: Database.Database) {
        this.db = database || new Database('wafi.db');
        this.ensureTableExists();
    }

    private ensureTableExists() {
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

    async findById(id: string): Promise<BinLocation | null> {
        const stmt = this.db.prepare('SELECT * FROM bin_locations WHERE id = ?');
        const row = stmt.get(id) as any;
        if (!row) return null;
        return this.mapToDomain(row);
    }

    async findByWarehouse(warehouseId: string): Promise<BinLocation[]> {
        const stmt = this.db.prepare('SELECT * FROM bin_locations WHERE warehouse_id = ? ORDER BY code ASC');
        const rows = stmt.all(warehouseId) as any[];
        return rows.map(r => this.mapToDomain(r));
    }

    async create(binLocation: BinLocation): Promise<void> {
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

    async update(binLocation: BinLocation): Promise<void> {
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

    async delete(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM bin_locations WHERE id = ?');
        stmt.run(id);
    }

    private mapToDomain(row: any): BinLocation {
        return new BinLocation(
            row.id,
            row.warehouse_id,
            row.code,
            row.name_en,
            row.is_active === 1,
            row.name_ar,
            row.capacity
        );
    }
}
