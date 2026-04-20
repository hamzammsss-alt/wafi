"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostCenterService = void 0;
const CostCenter_1 = require("../../src/main/domain/entities/CostCenter");
const SqliteCostCenterRepo_1 = require("../../src/main/infrastructure/adapters/SqliteCostCenterRepo");
const uuid_1 = require("uuid");
const errors_1 = require("../../src/main/domain/errors");
const database_1 = require("../database");
class CostCenterService {
    static getRepo() {
        if (!this.repo) {
            if (!database_1.db) {
                throw new Error('Database is not initialized');
            }
            this.repo = new SqliteCostCenterRepo_1.SqliteCostCenterRepo(database_1.db);
        }
        return this.repo;
    }
    static async getCostCenters(companyId) {
        return await this.getRepo().findAll(companyId);
    }
    static async getCostCenter(id, companyId) {
        const cc = await this.getRepo().findById(id, companyId);
        if (!cc) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Cost Center not found');
        }
        return cc;
    }
    static async createCostCenter(data) {
        const id = (0, uuid_1.v4)();
        const costCenter = new CostCenter_1.CostCenter(id, data.companyId, data.code, data.nameEn, data.isActive !== undefined ? data.isActive : true, data.isParent || false, data.nameAr, data.description, data.parentId);
        await this.getRepo().create(costCenter);
        return id;
    }
    static async updateCostCenter(id, companyId, updates) {
        const cc = await this.getRepo().findById(id, companyId);
        if (!cc) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Cost Center not found');
        }
        cc.updateDetails(updates.nameEn, updates.nameAr, updates.description, updates.isActive, updates.isParent, updates.parentId);
        await this.getRepo().update(cc);
        return { success: true };
    }
    static async deleteCostCenter(id, companyId) {
        const cc = await this.getRepo().findById(id, companyId);
        if (!cc) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Cost Center not found');
        }
        // Must check if it is being used by any transaction or as a parent...
        // For now, let's keep it simple and just delete using Repo bounds.
        await this.getRepo().delete(id, companyId);
        return { success: true };
    }
}
exports.CostCenterService = CostCenterService;
CostCenterService.repo = null;
