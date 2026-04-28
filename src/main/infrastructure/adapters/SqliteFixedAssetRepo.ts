import { randomUUID } from 'crypto';
import { IFixedAssetRepository } from '../../domain/repositories/IFixedAssetRepository';
import { FixedAsset, DepreciationMethod, AssetStatus } from '../../domain/entities/FixedAsset';
import { DepreciationSchedule } from '../../domain/entities/DepreciationSchedule';

export class SqliteFixedAssetRepo implements IFixedAssetRepository {
    constructor(private db: any) {
        this.ensureTableExists();
    }

    private hasTable(tableName: string): boolean {
        const row = this.db
            .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
            .get(tableName);
        return !!row;
    }

    private hasColumn(tableName: string, columnName: string): boolean {
        const cols = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
        return cols.some(c => c.name === columnName);
    }

    private addColumnIfMissing(tableName: string, columnName: string, sqlTypeWithDefault: string) {
        if (!this.hasColumn(tableName, columnName)) {
            this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlTypeWithDefault}`);
        }
    }

    private ensureTableExists() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS fixed_assets (
                id                          TEXT PRIMARY KEY,
                company_id                  TEXT NOT NULL,
                code                        TEXT NOT NULL,
                name                        TEXT NOT NULL,
                category_id                 TEXT,
                asset_account_id            TEXT,
                accumulated_dep_account_id  TEXT,
                dep_expense_account_id      TEXT,
                purchase_date               TEXT NOT NULL,
                purchase_cost               REAL NOT NULL DEFAULT 0,
                supplier_id                 TEXT,
                supplier_account_id         TEXT,
                supplier_invoice_no         TEXT,
                supplier_invoice_amount     REAL NOT NULL DEFAULT 0,
                clearance_cost              REAL NOT NULL DEFAULT 0,
                clearance_account_id        TEXT,
                purchase_journal_id         TEXT,
                purchase_journal_no         TEXT,
                clearance_journal_id        TEXT,
                clearance_journal_no        TEXT,
                salvage_value               REAL NOT NULL DEFAULT 0,
                life_years                  REAL NOT NULL DEFAULT 0,
                depreciation_method         TEXT NOT NULL DEFAULT 'StraightLine',
                status                      TEXT NOT NULL DEFAULT 'Active',
                book_value                  REAL NOT NULL DEFAULT 0,
                accumulated_depreciation    REAL NOT NULL DEFAULT 0,
                created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fixed_asset_depreciations (
                id               TEXT PRIMARY KEY,
                asset_id         TEXT NOT NULL,
                period_date      TEXT NOT NULL,
                amount           REAL NOT NULL,
                journal_entry_id TEXT,
                created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_fixed_assets_company
                ON fixed_assets(company_id);
            CREATE INDEX IF NOT EXISTS idx_fixed_asset_dep_asset
                ON fixed_asset_depreciations(asset_id);
        `);

        if (this.hasTable('fixed_assets')) {
            this.addColumnIfMissing('fixed_assets', 'company_id', "TEXT NOT NULL DEFAULT '1'");
            this.addColumnIfMissing('fixed_assets', 'code', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'name', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'category_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'asset_account_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'accumulated_dep_account_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'dep_expense_account_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'purchase_date', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'purchase_cost', 'REAL NOT NULL DEFAULT 0');
            this.addColumnIfMissing('fixed_assets', 'supplier_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'supplier_account_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'supplier_invoice_no', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'supplier_invoice_amount', 'REAL NOT NULL DEFAULT 0');
            this.addColumnIfMissing('fixed_assets', 'clearance_cost', 'REAL NOT NULL DEFAULT 0');
            this.addColumnIfMissing('fixed_assets', 'clearance_account_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'purchase_journal_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'purchase_journal_no', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'clearance_journal_id', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'clearance_journal_no', 'TEXT');
            this.addColumnIfMissing('fixed_assets', 'salvage_value', 'REAL NOT NULL DEFAULT 0');
            this.addColumnIfMissing('fixed_assets', 'life_years', 'REAL NOT NULL DEFAULT 0');
            this.addColumnIfMissing('fixed_assets', 'depreciation_method', "TEXT NOT NULL DEFAULT 'StraightLine'");
            this.addColumnIfMissing('fixed_assets', 'status', "TEXT NOT NULL DEFAULT 'Active'");
            this.addColumnIfMissing('fixed_assets', 'book_value', 'REAL NOT NULL DEFAULT 0');
            this.addColumnIfMissing('fixed_assets', 'accumulated_depreciation', 'REAL NOT NULL DEFAULT 0');
            this.addColumnIfMissing('fixed_assets', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

            this.db.exec(`
                UPDATE fixed_assets
                SET company_id = '1'
                WHERE company_id IS NULL OR TRIM(company_id) = '';

                UPDATE fixed_assets
                SET code = COALESCE(NULLIF(code, ''), id)
                WHERE code IS NULL OR TRIM(code) = '';

                UPDATE fixed_assets
                SET name = COALESCE(NULLIF(name, ''), code)
                WHERE name IS NULL OR TRIM(name) = '';

                UPDATE fixed_assets
                SET purchase_date = COALESCE(NULLIF(purchase_date, ''), DATE('now'))
                WHERE purchase_date IS NULL OR TRIM(purchase_date) = '';

                UPDATE fixed_assets
                SET purchase_cost = COALESCE(purchase_cost, 0),
                    supplier_invoice_amount = CASE
                        WHEN COALESCE(supplier_invoice_amount, 0) <= 0
                        THEN COALESCE(purchase_cost, 0) - COALESCE(clearance_cost, 0)
                        ELSE supplier_invoice_amount
                    END,
                    clearance_cost = COALESCE(clearance_cost, 0),
                    salvage_value = COALESCE(salvage_value, 0),
                    life_years = COALESCE(life_years, 0),
                    accumulated_depreciation = COALESCE(accumulated_depreciation, 0),
                    book_value = COALESCE(book_value, purchase_cost, 0),
                    depreciation_method = COALESCE(NULLIF(depreciation_method, ''), 'StraightLine'),
                    status = COALESCE(NULLIF(status, ''), 'Active');
            `);
        }
    }

    nextIdentity(): string {
        return randomUUID();
    }

    async save(asset: FixedAsset): Promise<void> {
        const sql = `
            INSERT INTO fixed_assets (
                id, company_id, code, name, category_id,
                asset_account_id, accumulated_dep_account_id, dep_expense_account_id,
                purchase_date, purchase_cost, supplier_id, supplier_account_id,
                supplier_invoice_no, supplier_invoice_amount, clearance_cost,
                clearance_account_id, purchase_journal_id, purchase_journal_no,
                clearance_journal_id, clearance_journal_no,
                salvage_value, life_years,
                depreciation_method, status, book_value, accumulated_depreciation, created_at
            ) VALUES (
                @id, @company_id, @code, @name, @category_id,
                @asset_account_id, @accumulated_dep_account_id, @dep_expense_account_id,
                @purchase_date, @purchase_cost, @supplier_id, @supplier_account_id,
                @supplier_invoice_no, @supplier_invoice_amount, @clearance_cost,
                @clearance_account_id, @purchase_journal_id, @purchase_journal_no,
                @clearance_journal_id, @clearance_journal_no,
                @salvage_value, @life_years,
                @depreciation_method, @status, @book_value, @accumulated_depreciation, @created_at
            )
            ON CONFLICT(id) DO UPDATE SET
                code                        = excluded.code,
                name                        = excluded.name,
                category_id                 = excluded.category_id,
                asset_account_id            = excluded.asset_account_id,
                accumulated_dep_account_id  = excluded.accumulated_dep_account_id,
                dep_expense_account_id      = excluded.dep_expense_account_id,
                purchase_date               = excluded.purchase_date,
                purchase_cost               = excluded.purchase_cost,
                supplier_id                 = excluded.supplier_id,
                supplier_account_id         = excluded.supplier_account_id,
                supplier_invoice_no         = excluded.supplier_invoice_no,
                supplier_invoice_amount     = excluded.supplier_invoice_amount,
                clearance_cost              = excluded.clearance_cost,
                clearance_account_id        = excluded.clearance_account_id,
                purchase_journal_id         = excluded.purchase_journal_id,
                purchase_journal_no         = excluded.purchase_journal_no,
                clearance_journal_id        = excluded.clearance_journal_id,
                clearance_journal_no        = excluded.clearance_journal_no,
                salvage_value               = excluded.salvage_value,
                life_years                  = excluded.life_years,
                depreciation_method         = excluded.depreciation_method,
                status                      = excluded.status,
                book_value                  = excluded.book_value,
                accumulated_depreciation    = excluded.accumulated_depreciation
        `;

        this.db.prepare(sql).run({
            id: asset.id,
            company_id: asset.companyId,
            code: asset.code,
            name: asset.name,
            category_id: asset.categoryId,
            asset_account_id: asset.assetAccountId,
            accumulated_dep_account_id: asset.accumulatedDepAccountId,
            dep_expense_account_id: asset.depExpenseAccountId,
            purchase_date: asset.purchaseDate,
            purchase_cost: asset.purchaseCost,
            supplier_id: asset.supplierId,
            supplier_account_id: asset.supplierAccountId,
            supplier_invoice_no: asset.supplierInvoiceNo,
            supplier_invoice_amount: asset.supplierInvoiceAmount,
            clearance_cost: asset.clearanceCost,
            clearance_account_id: asset.clearanceAccountId,
            purchase_journal_id: asset.purchaseJournalId,
            purchase_journal_no: asset.purchaseJournalNo,
            clearance_journal_id: asset.clearanceJournalId,
            clearance_journal_no: asset.clearanceJournalNo,
            salvage_value: asset.salvageValue,
            life_years: asset.lifeYears,
            depreciation_method: asset.depreciationMethod,
            status: asset.status,
            book_value: asset.bookValue,
            accumulated_depreciation: asset.accumulatedDepreciation,
            created_at: asset.createdAt
        });
    }

    async findById(id: string): Promise<FixedAsset | null> {
        const row = this.db.prepare('SELECT * FROM fixed_assets WHERE id = ?').get(id);
        if (!row) return null;
        return this.rowToEntity(row);
    }

    async findByCompany(companyId: string): Promise<FixedAsset[]> {
        const rows = this.db.prepare('SELECT * FROM fixed_assets WHERE company_id = ? ORDER BY code').all(companyId);
        return (rows || []).map((r: any) => this.rowToEntity(r));
    }

    async delete(id: string): Promise<void> {
        this.db.prepare('DELETE FROM fixed_assets WHERE id = ?').run(id);
    }

    async saveDepreciationSchedule(entry: DepreciationSchedule): Promise<void> {
        const sql = `
            INSERT INTO fixed_asset_depreciations (id, asset_id, period_date, amount, journal_entry_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        this.db.prepare(sql).run(
            entry.id,
            entry.assetId,
            entry.periodDate,
            entry.amount,
            entry.journalEntryId,
            entry.createdAt
        );
    }

    async findSchedulesByAsset(assetId: string): Promise<DepreciationSchedule[]> {
        const rows = this.db
            .prepare('SELECT * FROM fixed_asset_depreciations WHERE asset_id = ? ORDER BY period_date')
            .all(assetId);

        return (rows || []).map((r: any) => new DepreciationSchedule(
            r.id,
            r.asset_id,
            r.period_date,
            Number(r.amount),
            r.journal_entry_id,
            r.created_at
        ));
    }

    private rowToEntity(row: any): FixedAsset {
        return new FixedAsset(
            row.id,
            row.company_id,
            row.code,
            row.name,
            row.category_id,
            row.asset_account_id,
            row.accumulated_dep_account_id,
            row.dep_expense_account_id,
            row.purchase_date,
            Number(row.purchase_cost),
            Number(row.salvage_value),
            Number(row.life_years),
            (row.depreciation_method as DepreciationMethod) || 'StraightLine',
            (row.status as AssetStatus) || 'Active',
            Number(row.book_value),
            Number(row.accumulated_depreciation),
            row.supplier_id,
            row.supplier_account_id,
            row.supplier_invoice_no,
            Number(row.supplier_invoice_amount ?? row.purchase_cost),
            Number(row.clearance_cost || 0),
            row.clearance_account_id,
            row.purchase_journal_id,
            row.purchase_journal_no,
            row.clearance_journal_id,
            row.clearance_journal_no,
            row.created_at
        );
    }
}
