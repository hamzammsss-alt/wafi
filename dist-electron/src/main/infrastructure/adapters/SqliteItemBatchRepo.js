"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteItemBatchRepo = void 0;
const ItemBatch_1 = require("../../domain/entities/ItemBatch");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SqliteItemBatchRepo {
    constructor() {
        this.db = new better_sqlite3_1.default('wafi.db');
        this.ensureTableExists();
    }
    ensureTableExists() {
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
    async findById(id) {
        const stmt = this.db.prepare('SELECT * FROM item_batches WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapToDomain(row);
    }
    async findByItem(itemId) {
        const stmt = this.db.prepare('SELECT * FROM item_batches WHERE item_id = ? ORDER BY expiry_date ASC');
        const rows = stmt.all(itemId);
        return rows.map(r => this.mapToDomain(r));
    }
    async findByBatchNumber(itemId, batchNumber) {
        const stmt = this.db.prepare('SELECT * FROM item_batches WHERE item_id = ? AND batch_number = ?');
        const row = stmt.get(itemId, batchNumber);
        if (!row)
            return null;
        return this.mapToDomain(row);
    }
    async create(batch) {
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
    async update(batch) {
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
    async delete(id) {
        const stmt = this.db.prepare('DELETE FROM item_batches WHERE id = ?');
        stmt.run(id);
    }
    mapToDomain(row) {
        return new ItemBatch_1.ItemBatch(row.id, row.item_id, row.batch_number, row.is_active === 1, row.production_date ? new Date(row.production_date) : undefined, row.expiry_date ? new Date(row.expiry_date) : undefined);
    }
}
exports.SqliteItemBatchRepo = SqliteItemBatchRepo;
