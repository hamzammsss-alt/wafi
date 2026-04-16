"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteTaxGroupRepo = void 0;
const TaxGroup_1 = require("../../domain/entities/TaxGroup");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SqliteTaxGroupRepo {
    constructor(database) {
        this.db = database || new better_sqlite3_1.default('wafi.db');
        this.ensureTableExists();
    }
    ensureTableExists() {
        const sql = `
            CREATE TABLE IF NOT EXISTS tax_groups (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                code TEXT NOT NULL,
                name_en TEXT NOT NULL,
                name_ar TEXT,
                rate_percent REAL NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_tax_groups_company on tax_groups(company_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_groups_code on tax_groups(company_id, code);
        `;
        this.db.exec(sql);
    }
    async findById(id, companyId) {
        const stmt = this.db.prepare('SELECT * FROM tax_groups WHERE id = ? AND company_id = ?');
        const row = stmt.get(id, companyId);
        if (!row)
            return null;
        return this.mapToDomain(row);
    }
    async findAll(companyId) {
        const stmt = this.db.prepare('SELECT * FROM tax_groups WHERE company_id = ? ORDER BY code ASC');
        const rows = stmt.all(companyId);
        return rows.map(r => this.mapToDomain(r));
    }
    async create(taxGroup) {
        const stmt = this.db.prepare(`
            INSERT INTO tax_groups (
                id, company_id, code, name_en, name_ar, rate_percent, is_active
            ) VALUES (
                @id, @companyId, @code, @nameEn, @nameAr, @ratePercent, @isActive
            )
        `);
        stmt.run({
            id: taxGroup.id,
            companyId: taxGroup.companyId,
            code: taxGroup.code,
            nameEn: taxGroup.nameEn,
            nameAr: taxGroup.nameAr,
            ratePercent: taxGroup.ratePercent,
            isActive: taxGroup.isActive ? 1 : 0
        });
    }
    async update(taxGroup) {
        const stmt = this.db.prepare(`
            UPDATE tax_groups 
            SET name_en = @nameEn, name_ar = @nameAr, rate_percent = @ratePercent, is_active = @isActive,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id AND company_id = @companyId
        `);
        stmt.run({
            id: taxGroup.id,
            companyId: taxGroup.companyId,
            nameEn: taxGroup.nameEn,
            nameAr: taxGroup.nameAr,
            ratePercent: taxGroup.ratePercent,
            isActive: taxGroup.isActive ? 1 : 0
        });
    }
    async delete(id, companyId) {
        const stmt = this.db.prepare('DELETE FROM tax_groups WHERE id = ? AND company_id = ?');
        stmt.run(id, companyId);
    }
    mapToDomain(row) {
        return new TaxGroup_1.TaxGroup(row.id, row.company_id, row.code, row.name_en, row.rate_percent, row.is_active === 1, row.name_ar);
    }
}
exports.SqliteTaxGroupRepo = SqliteTaxGroupRepo;
