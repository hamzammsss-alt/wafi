"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxGroupService = void 0;
const TaxGroup_1 = require("../../src/main/domain/entities/TaxGroup");
const SqliteTaxGroupRepo_1 = require("../../src/main/infrastructure/adapters/SqliteTaxGroupRepo");
const uuid_1 = require("uuid");
const errors_1 = require("../../src/main/domain/errors");
class TaxGroupService {
    static async getTaxGroups(companyId) {
        return await this.repo.findAll(companyId);
    }
    static async getTaxGroup(id, companyId) {
        const taxGroup = await this.repo.findById(id, companyId);
        if (!taxGroup) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Tax Group not found');
        }
        return taxGroup;
    }
    static async createTaxGroup(data) {
        const id = (0, uuid_1.v4)();
        const taxGroup = new TaxGroup_1.TaxGroup(id, data.companyId, data.code, data.nameEn, data.ratePercent, data.isActive !== undefined ? data.isActive : true, data.nameAr);
        await this.repo.create(taxGroup);
        return id;
    }
    static async updateTaxGroup(id, companyId, updates) {
        const taxGroup = await this.repo.findById(id, companyId);
        if (!taxGroup) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Tax Group not found');
        }
        taxGroup.updateDetails(updates.nameEn, updates.ratePercent, updates.isActive !== undefined ? updates.isActive : taxGroup.isActive, updates.nameAr);
        await this.repo.update(taxGroup);
        return { success: true };
    }
    static async deleteTaxGroup(id, companyId) {
        const taxGroup = await this.repo.findById(id, companyId);
        if (!taxGroup) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Tax Group not found');
        }
        await this.repo.delete(id, companyId);
        return { success: true };
    }
}
exports.TaxGroupService = TaxGroupService;
TaxGroupService.repo = new SqliteTaxGroupRepo_1.SqliteTaxGroupRepo();
