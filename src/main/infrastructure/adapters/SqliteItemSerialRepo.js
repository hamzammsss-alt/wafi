"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteItemSerialRepo = void 0;
const ItemSerial_1 = require("../../domain/entities/ItemSerial");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SqliteItemSerialRepo {
    constructor() {
        this.db = new better_sqlite3_1.default('wafi.db');
        this.ensureTableExists();
    }
    ensureTableExists() {
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
    async findById(id) {
        const stmt = this.db.prepare('SELECT * FROM item_serials WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapToDomain(row);
    }
    async findByItem(itemId) {
        const stmt = this.db.prepare('SELECT * FROM item_serials WHERE item_id = ? ORDER BY serial_number ASC');
        const rows = stmt.all(itemId);
        return rows.map(r => this.mapToDomain(r));
    }
    async findBySerialNumber(itemId, serialNumber) {
        const stmt = this.db.prepare('SELECT * FROM item_serials WHERE item_id = ? AND serial_number = ?');
        const row = stmt.get(itemId, serialNumber);
        if (!row)
            return null;
        return this.mapToDomain(row);
    }
    async create(serial) {
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
    async update(serial) {
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
    async delete(id) {
        const stmt = this.db.prepare('DELETE FROM item_serials WHERE id = ?');
        stmt.run(id);
    }
    mapToDomain(row) {
        return new ItemSerial_1.ItemSerial(row.id, row.item_id, row.serial_number, row.status, row.batch_id);
    }
}
exports.SqliteItemSerialRepo = SqliteItemSerialRepo;
