import { ItemBatch } from '../../domain/entities/ItemBatch';
import { ItemBatchRepoPort } from '../../domain/ports/ItemTrackingRepoPort';
import Database from 'better-sqlite3';

export class SqliteItemBatchRepo implements ItemBatchRepoPort {
    private db: Database.Database;

    constructor() {
        this.db = new Database('wafi.db');
        this.ensureTableExists();
    }

    private ensureTableExists() {
        const sql = `
            CREATE TABLE IF NOT EXISTS item_batches (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                batch_number TEXT NOT NULL,
                production_date DATETIME,
                expiry_date DATETIME,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES items(id)
            );

            CREATE INDEX IF NOT EXISTS idx_item_batches_item on item_batches(item_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_item_batches_number on item_batches(item_id, batch_number);
        `;
        this.db.exec(sql);
    }

    async findById(id: string): Promise<ItemBatch | null> {
        const stmt = this.db.prepare('SELECT * FROM item_batches WHERE id = ?');
        const row = stmt.get(id) as any;
        if (!row) return null;
        return this.mapToDomain(row);
    }

    async findByItem(itemId: string): Promise<ItemBatch[]> {
        const stmt = this.db.prepare('SELECT * FROM item_batches WHERE item_id = ? ORDER BY expiry_date ASC');
        const rows = stmt.all(itemId) as any[];
        return rows.map(r => this.mapToDomain(r));
    }

    async findByBatchNumber(itemId: string, batchNumber: string): Promise<ItemBatch | null> {
        const stmt = this.db.prepare('SELECT * FROM item_batches WHERE item_id = ? AND batch_number = ?');
        const row = stmt.get(itemId, batchNumber) as any;
        if (!row) return null;
        return this.mapToDomain(row);
    }

    async create(batch: ItemBatch): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO item_batches (
                id, item_id, batch_number, production_date, expiry_date, is_active
            ) VALUES (
                @id, @itemId, @batchNumber, @productionDate, @expiryDate, @isActive
            )
        `);

        stmt.run({
            id: batch.id,
            itemId: batch.itemId,
            batchNumber: batch.batchNumber,
            productionDate: batch.productionDate ? batch.productionDate.toISOString() : null,
            expiryDate: batch.expiryDate ? batch.expiryDate.toISOString() : null,
            isActive: batch.isActive ? 1 : 0
        });
    }

    async update(batch: ItemBatch): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE item_batches 
            SET is_active = @isActive, production_date = @productionDate, expiry_date = @expiryDate,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `);

        stmt.run({
            id: batch.id,
            isActive: batch.isActive ? 1 : 0,
            productionDate: batch.productionDate ? batch.productionDate.toISOString() : null,
            expiryDate: batch.expiryDate ? batch.expiryDate.toISOString() : null
        });
    }

    async delete(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM item_batches WHERE id = ?');
        stmt.run(id);
    }

    private mapToDomain(row: any): ItemBatch {
        return new ItemBatch(
            row.id,
            row.item_id,
            row.batch_number,
            row.is_active === 1,
            row.production_date ? new Date(row.production_date) : undefined,
            row.expiry_date ? new Date(row.expiry_date) : undefined
        );
    }
}
