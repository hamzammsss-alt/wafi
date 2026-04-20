"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemTrackingService = void 0;
const ItemBatch_1 = require("../../src/main/domain/entities/ItemBatch");
const ItemSerial_1 = require("../../src/main/domain/entities/ItemSerial");
const SqliteItemBatchRepo_1 = require("../../src/main/infrastructure/adapters/SqliteItemBatchRepo");
const SqliteItemSerialRepo_1 = require("../../src/main/infrastructure/adapters/SqliteItemSerialRepo");
const uuid_1 = require("uuid");
const errors_1 = require("../../src/main/domain/errors");
class ItemTrackingService {
    // --- Batches ---
    static async getBatches(itemId) {
        return await this.batchRepo.findByItem(itemId);
    }
    static async getBatch(id) {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Item Batch not found');
        }
        return batch;
    }
    static async createBatch(data) {
        // Prevent duplicates
        const existing = await this.batchRepo.findByBatchNumber(data.itemId, data.batchNumber);
        if (existing) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Batch number already exists for this item');
        }
        const id = (0, uuid_1.v4)();
        const batch = new ItemBatch_1.ItemBatch(id, data.itemId, data.batchNumber, data.isActive !== undefined ? data.isActive : true, data.productionDate ? new Date(data.productionDate) : undefined, data.expiryDate ? new Date(data.expiryDate) : undefined);
        await this.batchRepo.create(batch);
        return id;
    }
    static async updateBatch(id, updates) {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Item Batch not found');
        }
        batch.updateDetails(updates.isActive !== undefined ? updates.isActive : batch.isActive, updates.productionDate ? new Date(updates.productionDate) : undefined, updates.expiryDate ? new Date(updates.expiryDate) : undefined);
        await this.batchRepo.update(batch);
        return { success: true };
    }
    static async deleteBatch(id) {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Item Batch not found');
        }
        await this.batchRepo.delete(id);
        return { success: true };
    }
    // --- Serials ---
    static async getSerials(itemId) {
        return await this.serialRepo.findByItem(itemId);
    }
    static async getSerial(id) {
        const serial = await this.serialRepo.findById(id);
        if (!serial) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Item Serial not found');
        }
        return serial;
    }
    static async createSerial(data) {
        const existing = await this.serialRepo.findBySerialNumber(data.itemId, data.serialNumber);
        if (existing) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Serial number already exists for this item');
        }
        const id = (0, uuid_1.v4)();
        const serial = new ItemSerial_1.ItemSerial(id, data.itemId, data.serialNumber, data.status || 'Available', data.batchId);
        await this.serialRepo.create(serial);
        return id;
    }
    static async updateSerialStatus(id, status) {
        const serial = await this.serialRepo.findById(id);
        if (!serial) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Item Serial not found');
        }
        serial.updateStatus(status);
        await this.serialRepo.update(serial);
        return { success: true };
    }
    static async deleteSerial(id) {
        const serial = await this.serialRepo.findById(id);
        if (!serial) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Item Serial not found');
        }
        await this.serialRepo.delete(id);
        return { success: true };
    }
}
exports.ItemTrackingService = ItemTrackingService;
ItemTrackingService.batchRepo = new SqliteItemBatchRepo_1.SqliteItemBatchRepo();
ItemTrackingService.serialRepo = new SqliteItemSerialRepo_1.SqliteItemSerialRepo();
