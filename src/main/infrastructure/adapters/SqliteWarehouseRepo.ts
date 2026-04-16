import { Warehouse, BinLocation } from '../../domain/entities/Warehouse';
import { WarehouseRepoPort, BinLocationRepoPort } from '../../domain/ports/WarehouseRepoPort';
import Database from 'better-sqlite3';

export class SqliteWarehouseRepo implements WarehouseRepoPort {
    private db: Database.Database;

    constructor(database?: Database.Database) {
        this.db = database || new Database('wafi.db');
        this.ensureTableExists();
    }

    private ensureTableExists() {
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
        } else {
            const cols = this.db.prepare("PRAGMA table_info(warehouses)").all() as Array<{ name: string }>;
            const hasCol = (name: string) => cols.some(c => c.name === name);

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
        } catch (err: any) {
            console.warn('[WarehouseRepo] Could not create unique index idx_warehouses_code:', err?.message || err);
        }
    }

    async findById(id: string, companyId: string): Promise<Warehouse | null> {
        const stmt = this.db.prepare('SELECT * FROM warehouses WHERE id = ? AND company_id = ?');
        const row = stmt.get(id, companyId) as any;
        if (!row) return null;
        return this.mapToDomain(row);
    }

    async findAll(companyId: string): Promise<Warehouse[]> {
        const stmt = this.db.prepare('SELECT * FROM warehouses WHERE company_id = ? ORDER BY code ASC');
        const rows = stmt.all(companyId) as any[];
        return rows.map(r => this.mapToDomain(r));
    }

    async create(warehouse: Warehouse): Promise<void> {
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

    async update(warehouse: Warehouse): Promise<void> {
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

    async delete(id: string, companyId: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM warehouses WHERE id = ? AND company_id = ?');
        stmt.run(id, companyId);
    }

    private mapToDomain(row: any): Warehouse {
        const fallbackNameEn = row.name_en || row.name_ar || row.name || row.code;
        return new Warehouse(
            row.id,
            row.company_id || '1',
            row.code,
            fallbackNameEn,
            row.is_active === 1,
            row.name_ar,
            row.location
        );
    }
}
