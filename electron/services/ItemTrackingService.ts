import { ItemBatch } from '../../src/main/domain/entities/ItemBatch';
import { ItemSerial } from '../../src/main/domain/entities/ItemSerial';
import { SqliteItemBatchRepo } from '../../src/main/infrastructure/adapters/SqliteItemBatchRepo';
import { SqliteItemSerialRepo } from '../../src/main/infrastructure/adapters/SqliteItemSerialRepo';
import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../src/main/domain/errors';

export class ItemTrackingService {
    private static batchRepo = new SqliteItemBatchRepo();
    private static serialRepo = new SqliteItemSerialRepo();

    // --- Batches ---

    static async getBatches(itemId: string): Promise<ItemBatch[]> {
        return await this.batchRepo.findByItem(itemId);
    }

    static async getBatch(id: string): Promise<ItemBatch> {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Item Batch not found');
        }
        return batch;
    }

    static async createBatch(data: {
        itemId: string,
        batchNumber: string,
        isActive?: boolean,
        productionDate?: string,
        expiryDate?: string
    }): Promise<string> {
        // Prevent duplicates
        const existing = await this.batchRepo.findByBatchNumber(data.itemId, data.batchNumber);
        if (existing) {
            throw new DomainError('VALIDATION_ERROR', 'Batch number already exists for this item');
        }

        const id = uuidv4();
        const batch = new ItemBatch(
            id,
            data.itemId,
            data.batchNumber,
            data.isActive !== undefined ? data.isActive : true,
            data.productionDate ? new Date(data.productionDate) : undefined,
            data.expiryDate ? new Date(data.expiryDate) : undefined
        );

        await this.batchRepo.create(batch);
        return id;
    }

    static async updateBatch(
        id: string,
        updates: {
            isActive?: boolean;
            productionDate?: string;
            expiryDate?: string;
        }
    ): Promise<{ success: true }> {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Item Batch not found');
        }

        batch.updateDetails(
            updates.isActive !== undefined ? updates.isActive : batch.isActive,
            updates.productionDate ? new Date(updates.productionDate) : undefined,
            updates.expiryDate ? new Date(updates.expiryDate) : undefined
        );

        await this.batchRepo.update(batch);
        return { success: true };
    }

    static async deleteBatch(id: string): Promise<{ success: true }> {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Item Batch not found');
        }
        await this.batchRepo.delete(id);
        return { success: true };
    }

    // --- Serials ---

    static async getSerials(itemId: string): Promise<ItemSerial[]> {
        return await this.serialRepo.findByItem(itemId);
    }

    static async getSerial(id: string): Promise<ItemSerial> {
        const serial = await this.serialRepo.findById(id);
        if (!serial) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Item Serial not found');
        }
        return serial;
    }

    static async createSerial(data: {
        itemId: string,
        serialNumber: string,
        status?: 'Available' | 'Reserved' | 'Sold' | 'Returned' | 'Defective',
        batchId?: string
    }): Promise<string> {
        const existing = await this.serialRepo.findBySerialNumber(data.itemId, data.serialNumber);
        if (existing) {
            throw new DomainError('VALIDATION_ERROR', 'Serial number already exists for this item');
        }

        const id = uuidv4();
        const serial = new ItemSerial(
            id,
            data.itemId,
            data.serialNumber,
            data.status || 'Available',
            data.batchId
        );

        await this.serialRepo.create(serial);
        return id;
    }

    static async updateSerialStatus(id: string, status: 'Available' | 'Reserved' | 'Sold' | 'Returned' | 'Defective'): Promise<{ success: true }> {
        const serial = await this.serialRepo.findById(id);
        if (!serial) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Item Serial not found');
        }

        serial.updateStatus(status);
        await this.serialRepo.update(serial);
        return { success: true };
    }

    static async deleteSerial(id: string): Promise<{ success: true }> {
        const serial = await this.serialRepo.findById(id);
        if (!serial) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Item Serial not found');
        }
        await this.serialRepo.delete(id);
        return { success: true };
    }
}
