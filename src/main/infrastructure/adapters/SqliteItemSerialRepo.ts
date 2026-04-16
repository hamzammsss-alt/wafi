import { ItemSerial } from '../../domain/entities/ItemSerial';
import { ItemSerialRepoPort } from '../../domain/ports/ItemTrackingRepoPort';
import Database from 'better-sqlite3';

export class SqliteItemSerialRepo implements ItemSerialRepoPort {
    private db: Database.Database;

    constructor() {
        this.db = new Database('wafi.db');
        this.ensureTableExists();
    }

    private ensureTableExists() {
        const sql = `
            CREATE TABLE IF NOT EXISTS item_serials (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                serial_number TEXT NOT NULL,
                status TEXT DEFAULT 'Available',
                batch_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES items(id),
                FOREIGN KEY (batch_id) REFERENCES item_batches(id)
            );

            CREATE INDEX IF NOT EXISTS idx_item_serials_item on item_serials(item_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_item_serials_number on item_serials(item_id, serial_number);
        `;
        this.db.exec(sql);
    }

    async findById(id: string): Promise<ItemSerial | null> {
        const stmt = this.db.prepare('SELECT * FROM item_serials WHERE id = ?');
        const row = stmt.get(id) as any;
        if (!row) return null;
        return this.mapToDomain(row);
    }

    async findByItem(itemId: string): Promise<ItemSerial[]> {
        const stmt = this.db.prepare('SELECT * FROM item_serials WHERE item_id = ? ORDER BY serial_number ASC');
        const rows = stmt.all(itemId) as any[];
        return rows.map(r => this.mapToDomain(r));
    }

    async findBySerialNumber(itemId: string, serialNumber: string): Promise<ItemSerial | null> {
        const stmt = this.db.prepare('SELECT * FROM item_serials WHERE item_id = ? AND serial_number = ?');
        const row = stmt.get(itemId, serialNumber) as any;
        if (!row) return null;
        return this.mapToDomain(row);
    }

    async create(serial: ItemSerial): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO item_serials (
                id, item_id, serial_number, status, batch_id
            ) VALUES (
                @id, @itemId, @serialNumber, @status, @batchId
            )
        `);

        stmt.run({
            id: serial.id,
            itemId: serial.itemId,
            serialNumber: serial.serialNumber,
            status: serial.status,
            batchId: serial.batchId || null
        });
    }

    async update(serial: ItemSerial): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE item_serials 
            SET status = @status, batch_id = @batchId,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `);

        stmt.run({
            id: serial.id,
            status: serial.status,
            batchId: serial.batchId || null
        });
    }

    async delete(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM item_serials WHERE id = ?');
        stmt.run(id);
    }

    private mapToDomain(row: any): ItemSerial {
        return new ItemSerial(
            row.id,
            row.item_id,
            row.serial_number,
            row.status,
            row.batch_id
        );
    }
}
