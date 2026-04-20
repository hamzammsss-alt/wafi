"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteCostCenterRepo = void 0;
const CostCenter_1 = require("../../domain/entities/CostCenter");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SqliteCostCenterRepo {
    constructor(database) {
        this.db = database || new better_sqlite3_1.default('wafi.db');
        this.ensureTableExists();
    }
    ensureTableExists() {
        const exists = this.db
            .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'cost_centers'")
            .get();
        if (!exists) {
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS cost_centers (
                    id TEXT PRIMARY KEY,
                    company_id TEXT NOT NULL,
                    code TEXT NOT NULL,
                    name_en TEXT NOT NULL,
                    name_ar TEXT,
                    description TEXT,
                    parent_id TEXT,
                    is_parent INTEGER DEFAULT 0,
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES cost_centers(id)
                );
            `);
        }
        else {
            const cols = this.db.prepare("PRAGMA table_info(cost_centers)").all();
            const hasCol = (name) => cols.some(c => c.name === name);
            if (!hasCol('company_id')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN company_id TEXT").run();
                this.db.prepare("UPDATE cost_centers SET company_id = '1' WHERE company_id IS NULL OR TRIM(company_id) = ''").run();
            }
            if (!hasCol('description')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN description TEXT").run();
            }
            if (!hasCol('is_parent')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN is_parent INTEGER DEFAULT 0").run();
            }
            if (!hasCol('created_at')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN created_at DATETIME").run();
                this.db.prepare("UPDATE cost_centers SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL").run();
            }
            if (!hasCol('updated_at')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN updated_at DATETIME").run();
                this.db.prepare("UPDATE cost_centers SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL").run();
            }
            if (!hasCol('name_en')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN name_en TEXT").run();
                this.db.prepare("UPDATE cost_centers SET name_en = COALESCE(NULLIF(name_ar, ''), code) WHERE name_en IS NULL OR TRIM(name_en) = ''").run();
            }
            if (!hasCol('name_ar')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN name_ar TEXT").run();
            }
            if (!hasCol('parent_id')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN parent_id TEXT").run();
            }
            if (!hasCol('is_active')) {
                this.db.prepare("ALTER TABLE cost_centers ADD COLUMN is_active INTEGER DEFAULT 1").run();
            }
        }
        this.db.exec("CREATE INDEX IF NOT EXISTS idx_cost_centers_company on cost_centers(company_id);");
        try {
            this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_centers_code on cost_centers(company_id, code);");
        }
        catch (err) {
            console.warn('[CostCenterRepo] Could not create unique index idx_cost_centers_code:', err?.message || err);
        }
    }
    async findById(id, companyId) {
        const stmt = this.db.prepare('SELECT * FROM cost_centers WHERE id = ? AND company_id = ?');
        const row = stmt.get(id, companyId);
        if (!row)
            return null;
        return this.mapToDomain(row);
    }
    async findAll(companyId) {
        const stmt = this.db.prepare('SELECT * FROM cost_centers WHERE company_id = ? ORDER BY code ASC');
        const rows = stmt.all(companyId);
        return rows.map(r => this.mapToDomain(r));
    }
    async create(costCenter) {
        const stmt = this.db.prepare(`
            INSERT INTO cost_centers (
                id, company_id, code, name_en, name_ar, description, parent_id, is_parent, is_active
            ) VALUES (
                @id, @companyId, @code, @nameEn, @nameAr, @description, @parentId, @isParent, @isActive
            )
        `);
        stmt.run({
            id: costCenter.id,
            companyId: costCenter.companyId,
            code: costCenter.code,
            nameEn: costCenter.nameEn,
            nameAr: costCenter.nameAr,
            description: costCenter.description,
            parentId: costCenter.parentId,
            isParent: costCenter.isParent ? 1 : 0,
            isActive: costCenter.isActive ? 1 : 0
        });
    }
    async update(costCenter) {
        const stmt = this.db.prepare(`
            UPDATE cost_centers 
            SET name_en = @nameEn, name_ar = @nameAr, description = @description,
                parent_id = @parentId, is_parent = @isParent, is_active = @isActive,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id AND company_id = @companyId
        `);
        stmt.run({
            id: costCenter.id,
            companyId: costCenter.companyId,
            nameEn: costCenter.nameEn,
            nameAr: costCenter.nameAr,
            description: costCenter.description,
            parentId: costCenter.parentId,
            isParent: costCenter.isParent ? 1 : 0,
            isActive: costCenter.isActive ? 1 : 0
        });
    }
    async delete(id, companyId) {
        const stmt = this.db.prepare('DELETE FROM cost_centers WHERE id = ? AND company_id = ?');
        stmt.run(id, companyId);
    }
    mapToDomain(row) {
        const fallbackNameEn = row.name_en || row.name_ar || row.code;
        return new CostCenter_1.CostCenter(row.id, row.company_id || '1', row.code, fallbackNameEn, row.is_active === 1, row.is_parent === 1, row.name_ar, row.description, row.parent_id);
    }
}
exports.SqliteCostCenterRepo = SqliteCostCenterRepo;
