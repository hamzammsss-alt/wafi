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
        const asset = new FixedAsset_1.FixedAsset(id, companyId, data.code, data.name, data.categoryId || null, data.assetAccountId || null, data.accumulatedDepAccountId || null, data.depExpenseAccountId || null, data.purchaseDate, cost, Number(data.salvageValue) || 0, Number(data.lifeYears) || 1, data.depreciationMethod || 'StraightLine', 'Active', cost, // initial book value = purchase cost
        0 // no accumulated depreciation yet
        );
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
        if (data.salvageValue !== undefined)
            asset.salvageValue = Number(data.salvageValue);
        if (data.lifeYears !== undefined)
            asset.lifeYears = Number(data.lifeYears);
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
