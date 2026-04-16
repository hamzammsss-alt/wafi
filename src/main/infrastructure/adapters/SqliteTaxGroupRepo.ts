import { TaxGroup } from '../../domain/entities/TaxGroup';
import { TaxGroupRepoPort } from '../../domain/ports/TaxGroupRepoPort';
import Database from 'better-sqlite3';

export class SqliteTaxGroupRepo implements TaxGroupRepoPort {
    private db: Database.Database;

    constructor(database?: Database.Database) {
        this.db = database || new Database('wafi.db');
        this.ensureTableExists();
    }

    private ensureTableExists() {
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

    async findById(id: string, companyId: string): Promise<TaxGroup | null> {
        const stmt = this.db.prepare('SELECT * FROM tax_groups WHERE id = ? AND company_id = ?');
        const row = stmt.get(id, companyId) as any;
        if (!row) return null;
        return this.mapToDomain(row);
    }

    async findAll(companyId: string): Promise<TaxGroup[]> {
        const stmt = this.db.prepare('SELECT * FROM tax_groups WHERE company_id = ? ORDER BY code ASC');
        const rows = stmt.all(companyId) as any[];
        return rows.map(r => this.mapToDomain(r));
    }

    async create(taxGroup: TaxGroup): Promise<void> {
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

    async update(taxGroup: TaxGroup): Promise<void> {
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

    async delete(id: string, companyId: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM tax_groups WHERE id = ? AND company_id = ?');
        stmt.run(id, companyId);
    }

    private mapToDomain(row: any): TaxGroup {
        return new TaxGroup(
            row.id,
            row.company_id,
            row.code,
            row.name_en,
            row.rate_percent,
            row.is_active === 1,
            row.name_ar
        );
    }
}
