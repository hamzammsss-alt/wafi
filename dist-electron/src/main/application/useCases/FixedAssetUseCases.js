"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedAssetUseCases = void 0;
const FixedAsset_1 = require("../../domain/entities/FixedAsset");
const DepreciationSchedule_1 = require("../../domain/entities/DepreciationSchedule");
class FixedAssetUseCases {
    constructor(repo) {
        this.repo = repo;
    }
    async createAsset(companyId, data) {
        const id = this.repo.nextIdentity();
        const cost = Number(data.purchaseCost) || 0;
        const asset = new FixedAsset_1.FixedAsset(id, companyId, data.code, data.name, data.categoryId || null, data.assetAccountId || null, data.accumulatedDepAccountId || null, data.depExpenseAccountId || null, data.purchaseDate, cost, Number(data.salvageValue) || 0, Math.max(0, Number(data.lifeYears) || 0), data.depreciationMethod || 'StraightLine', 'Active', cost, // initial book value = purchase cost
        0, // no accumulated depreciation yet
        data.supplierId || null, data.supplierAccountId || null, data.supplierInvoiceNo || null, Number(data.supplierInvoiceAmount ?? cost) || 0, Number(data.clearanceCost) || 0, data.clearanceAccountId || null, data.purchaseJournalId || null, data.purchaseJournalNo || null, data.clearanceJournalId || null, data.clearanceJournalNo || null);
        await this.repo.save(asset);
        return asset;
    }
    async getAssets(companyId) {
        return this.repo.findByCompany(companyId);
    }
    async getAssetById(id) {
        return this.repo.findById(id);
    }
    async updateAsset(id, data) {
        const asset = await this.repo.findById(id);
        if (!asset)
            throw new Error(`FixedAsset not found: ${id}`);
        if (data.code !== undefined)
            asset.code = data.code;
        if (data.name !== undefined)
            asset.name = data.name;
        if (data.categoryId !== undefined)
            asset.categoryId = data.categoryId;
        if (data.assetAccountId !== undefined)
            asset.assetAccountId = data.assetAccountId;
        if (data.accumulatedDepAccountId !== undefined)
            asset.accumulatedDepAccountId = data.accumulatedDepAccountId;
        if (data.depExpenseAccountId !== undefined)
            asset.depExpenseAccountId = data.depExpenseAccountId;
        if (data.purchaseDate !== undefined)
            asset.purchaseDate = data.purchaseDate;
        if (data.purchaseCost !== undefined)
            asset.purchaseCost = Number(data.purchaseCost);
        if (data.supplierId !== undefined)
            asset.supplierId = data.supplierId || null;
        if (data.supplierAccountId !== undefined)
            asset.supplierAccountId = data.supplierAccountId || null;
        if (data.supplierInvoiceNo !== undefined)
            asset.supplierInvoiceNo = data.supplierInvoiceNo || null;
        if (data.supplierInvoiceAmount !== undefined)
            asset.supplierInvoiceAmount = Number(data.supplierInvoiceAmount) || 0;
        if (data.clearanceCost !== undefined)
            asset.clearanceCost = Number(data.clearanceCost) || 0;
        if (data.clearanceAccountId !== undefined)
            asset.clearanceAccountId = data.clearanceAccountId || null;
        if (data.purchaseJournalId !== undefined)
            asset.purchaseJournalId = data.purchaseJournalId || null;
        if (data.purchaseJournalNo !== undefined)
            asset.purchaseJournalNo = data.purchaseJournalNo || null;
        if (data.clearanceJournalId !== undefined)
            asset.clearanceJournalId = data.clearanceJournalId || null;
        if (data.clearanceJournalNo !== undefined)
            asset.clearanceJournalNo = data.clearanceJournalNo || null;
        if (data.salvageValue !== undefined)
            asset.salvageValue = Number(data.salvageValue);
        if (data.lifeYears !== undefined)
            asset.lifeYears = Math.max(0, Number(data.lifeYears) || 0);
        if (data.depreciationMethod !== undefined)
            asset.depreciationMethod = data.depreciationMethod;
        if (data.status !== undefined)
            asset.status = data.status;
        await this.repo.save(asset);
        return asset;
    }
    async deleteAsset(id) {
        return this.repo.delete(id);
    }
    calculateDepreciation(id) {
        return this.repo.findById(id).then(asset => {
            if (!asset)
                throw new Error(`FixedAsset not found: ${id}`);
            return {
                yearly: asset.annualDepreciation().toFixed(2),
                monthly: asset.monthlyDepreciation().toFixed(2),
            };
        });
    }
    async postDepreciation(id, amount, date) {
        const asset = await this.repo.findById(id);
        if (!asset)
            throw new Error(`FixedAsset not found: ${id}`);
        asset.postDepreciation(amount);
        await this.repo.save(asset);
        const entry = new DepreciationSchedule_1.DepreciationSchedule(this.repo.nextIdentity(), id, date, amount, null);
        await this.repo.saveDepreciationSchedule(entry);
        return asset;
    }
    async getDepreciationSchedule(assetId) {
        return this.repo.findSchedulesByAsset(assetId);
    }
}
exports.FixedAssetUseCases = FixedAssetUseCases;
