"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseService = void 0;
const Warehouse_1 = require("../../src/main/domain/entities/Warehouse");
const SqliteWarehouseRepo_1 = require("../../src/main/infrastructure/adapters/SqliteWarehouseRepo");
const SqliteBinLocationRepo_1 = require("../../src/main/infrastructure/adapters/SqliteBinLocationRepo");
const uuid_1 = require("uuid");
const errors_1 = require("../../src/main/domain/errors");
const database_1 = require("../database");
class WarehouseService {
    static getWarehouseRepo() {
        if (!this.warehouseRepo) {
            if (!database_1.db) {
                throw new Error('Database is not initialized');
            }
            this.warehouseRepo = new SqliteWarehouseRepo_1.SqliteWarehouseRepo(database_1.db);
        }
        return this.warehouseRepo;
    }
    static getBinRepo() {
        if (!this.binRepo) {
            if (!database_1.db) {
                throw new Error('Database is not initialized');
            }
            this.binRepo = new SqliteBinLocationRepo_1.SqliteBinLocationRepo(database_1.db);
        }
        return this.binRepo;
    }
    static async getWarehouses(companyId) {
        return await this.getWarehouseRepo().findAll(companyId);
    }
    static async getWarehouse(id, companyId) {
        const wh = await this.getWarehouseRepo().findById(id, companyId);
        if (!wh) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Warehouse not found');
        }
        return wh;
    }
    static async createWarehouse(data) {
        const id = (0, uuid_1.v4)();
        const wh = new Warehouse_1.Warehouse(id, data.companyId, data.code, data.nameEn, data.isActive !== undefined ? data.isActive : true, data.nameAr, data.location);
        await this.getWarehouseRepo().create(wh);
        return id;
    }
    static async updateWarehouse(id, companyId, updates) {
        const wh = await this.getWarehouseRepo().findById(id, companyId);
        if (!wh) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Warehouse not found');
        }
        wh.updateDetails(updates.nameEn, updates.isActive !== undefined ? updates.isActive : wh.isActive, updates.nameAr, updates.location);
        await this.getWarehouseRepo().update(wh);
        return { success: true };
    }
    static async deleteWarehouse(id, companyId) {
        const wh = await this.getWarehouseRepo().findById(id, companyId);
        if (!wh) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Warehouse not found');
        }
        await this.getWarehouseRepo().delete(id, companyId);
        return { success: true };
    }
    // --- Bin Locations ---
    static async getBinLocations(warehouseId) {
        return await this.getBinRepo().findByWarehouse(warehouseId);
    }
    static async getBinLocation(id) {
        const bin = await this.getBinRepo().findById(id);
        if (!bin) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Bin Location not found');
        }
        return bin;
    }
    static async createBinLocation(data) {
        const id = (0, uuid_1.v4)();
        const bin = new Warehouse_1.BinLocation(id, data.warehouseId, data.code, data.nameEn, data.isActive !== undefined ? data.isActive : true, data.nameAr, data.capacity);
        await this.getBinRepo().create(bin);
        return id;
    }
    static async updateBinLocation(id, updates) {
        const bin = await this.getBinRepo().findById(id);
        if (!bin) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Bin Location not found');
        }
        bin.updateDetails(updates.nameEn, updates.isActive !== undefined ? updates.isActive : bin.isActive, updates.nameAr, updates.capacity);
        await this.getBinRepo().update(bin);
        return { success: true };
    }
    static async deleteBinLocation(id) {
        const bin = await this.getBinRepo().findById(id);
        if (!bin) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Bin Location not found');
        }
        await this.getBinRepo().delete(id);
        return { success: true };
    }
}
exports.WarehouseService = WarehouseService;
WarehouseService.warehouseRepo = null;
WarehouseService.binRepo = null;
