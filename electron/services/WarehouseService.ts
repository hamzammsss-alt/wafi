import { Warehouse, BinLocation } from '../../src/main/domain/entities/Warehouse';
import { SqliteWarehouseRepo } from '../../src/main/infrastructure/adapters/SqliteWarehouseRepo';
import { SqliteBinLocationRepo } from '../../src/main/infrastructure/adapters/SqliteBinLocationRepo';
import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../../src/main/domain/errors';
import { db } from '../database';

export class WarehouseService {
    private static warehouseRepo: SqliteWarehouseRepo | null = null;
    private static binRepo: SqliteBinLocationRepo | null = null;

    private static getWarehouseRepo(): SqliteWarehouseRepo {
        if (!this.warehouseRepo) {
            if (!db) {
                throw new Error('Database is not initialized');
            }
            this.warehouseRepo = new SqliteWarehouseRepo(db);
        }
        return this.warehouseRepo;
    }

    private static getBinRepo(): SqliteBinLocationRepo {
        if (!this.binRepo) {
            if (!db) {
                throw new Error('Database is not initialized');
            }
            this.binRepo = new SqliteBinLocationRepo(db);
        }
        return this.binRepo;
    }

    static async getWarehouses(companyId: string): Promise<Warehouse[]> {
        return await this.getWarehouseRepo().findAll(companyId);
    }

    static async getWarehouse(id: string, companyId: string): Promise<Warehouse> {
        const wh = await this.getWarehouseRepo().findById(id, companyId);
        if (!wh) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Warehouse not found');
        }
        return wh;
    }

    static async createWarehouse(data: {
        companyId: string,
        code: string,
        nameEn: string,
        nameAr?: string,
        location?: string,
        isActive?: boolean
    }): Promise<string> {
        const id = uuidv4();
        const wh = new Warehouse(
            id,
            data.companyId,
            data.code,
            data.nameEn,
            data.isActive !== undefined ? data.isActive : true,
            data.nameAr,
            data.location
        );

        await this.getWarehouseRepo().create(wh);
        return id;
    }

    static async updateWarehouse(
        id: string,
        companyId: string,
        updates: {
            nameEn: string;
            nameAr?: string;
            location?: string;
            isActive?: boolean;
        }
    ): Promise<{ success: true }> {
        const wh = await this.getWarehouseRepo().findById(id, companyId);
        if (!wh) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Warehouse not found');
        }

        wh.updateDetails(
            updates.nameEn,
            updates.isActive !== undefined ? updates.isActive : wh.isActive,
            updates.nameAr,
            updates.location
        );

        await this.getWarehouseRepo().update(wh);
        return { success: true };
    }

    static async deleteWarehouse(id: string, companyId: string): Promise<{ success: true }> {
        const wh = await this.getWarehouseRepo().findById(id, companyId);
        if (!wh) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Warehouse not found');
        }
        await this.getWarehouseRepo().delete(id, companyId);
        return { success: true };
    }

    // --- Bin Locations ---

    static async getBinLocations(warehouseId: string): Promise<BinLocation[]> {
        return await this.getBinRepo().findByWarehouse(warehouseId);
    }

    static async getBinLocation(id: string): Promise<BinLocation> {
        const bin = await this.getBinRepo().findById(id);
        if (!bin) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Bin Location not found');
        }
        return bin;
    }

    static async createBinLocation(data: {
        warehouseId: string,
        code: string,
        nameEn: string,
        nameAr?: string,
        capacity?: number,
        isActive?: boolean
    }): Promise<string> {
        const id = uuidv4();
        const bin = new BinLocation(
            id,
            data.warehouseId,
            data.code,
            data.nameEn,
            data.isActive !== undefined ? data.isActive : true,
            data.nameAr,
            data.capacity
        );

        await this.getBinRepo().create(bin);
        return id;
    }

    static async updateBinLocation(
        id: string,
        updates: {
            nameEn: string;
            nameAr?: string;
            capacity?: number;
            isActive?: boolean;
        }
    ): Promise<{ success: true }> {
        const bin = await this.getBinRepo().findById(id);
        if (!bin) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Bin Location not found');
        }

        bin.updateDetails(
            updates.nameEn,
            updates.isActive !== undefined ? updates.isActive : bin.isActive,
            updates.nameAr,
            updates.capacity
        );

        await this.getBinRepo().update(bin);
        return { success: true };
    }

    static async deleteBinLocation(id: string): Promise<{ success: true }> {
        const bin = await this.getBinRepo().findById(id);
        if (!bin) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Bin Location not found');
        }
        await this.getBinRepo().delete(id);
        return { success: true };
    }
}
