import { IFixedAssetRepository } from '../../domain/repositories/IFixedAssetRepository';
import { FixedAsset, DepreciationMethod } from '../../domain/entities/FixedAsset';
import { DepreciationSchedule } from '../../domain/entities/DepreciationSchedule';

export class FixedAssetUseCases {
    constructor(private repo: IFixedAssetRepository) { }

    async createAsset(companyId: string, data: {
        code: string;
        name: string;
        categoryId?: string;
        assetAccountId?: string;
        accumulatedDepAccountId?: string;
        depExpenseAccountId?: string;
        purchaseDate: string;
        purchaseCost: number;
        salvageValue?: number;
        lifeYears: number;
        depreciationMethod?: DepreciationMethod;
    }): Promise<FixedAsset> {
        const id = this.repo.nextIdentity();
        const cost = Number(data.purchaseCost) || 0;
        const asset = new FixedAsset(
            id,
            companyId,
            data.code,
            data.name,
            data.categoryId || null,
            data.assetAccountId || null,
            data.accumulatedDepAccountId || null,
            data.depExpenseAccountId || null,
            data.purchaseDate,
            cost,
            Number(data.salvageValue) || 0,
            Number(data.lifeYears) || 1,
            data.depreciationMethod || 'StraightLine',
            'Active',
            cost,         // initial book value = purchase cost
            0             // no accumulated depreciation yet
        );
        await this.repo.save(asset);
        return asset;
    }

    async getAssets(companyId: string): Promise<FixedAsset[]> {
        return this.repo.findByCompany(companyId);
    }

    async getAssetById(id: string): Promise<FixedAsset | null> {
        return this.repo.findById(id);
    }

    async updateAsset(id: string, data: Partial<{
        code: string;
        name: string;
        categoryId: string;
        assetAccountId: string;
        accumulatedDepAccountId: string;
        depExpenseAccountId: string;
        purchaseDate: string;
        purchaseCost: number;
        salvageValue: number;
        lifeYears: number;
        depreciationMethod: DepreciationMethod;
        status: 'Active' | 'Disposed' | 'FullyDepreciated';
    }>): Promise<FixedAsset> {
        const asset = await this.repo.findById(id);
        if (!asset) throw new Error(`FixedAsset not found: ${id}`);

        if (data.code !== undefined) asset.code = data.code;
        if (data.name !== undefined) asset.name = data.name;
        if (data.categoryId !== undefined) asset.categoryId = data.categoryId;
        if (data.assetAccountId !== undefined) asset.assetAccountId = data.assetAccountId;
        if (data.accumulatedDepAccountId !== undefined) asset.accumulatedDepAccountId = data.accumulatedDepAccountId;
        if (data.depExpenseAccountId !== undefined) asset.depExpenseAccountId = data.depExpenseAccountId;
        if (data.purchaseDate !== undefined) asset.purchaseDate = data.purchaseDate;
        if (data.purchaseCost !== undefined) asset.purchaseCost = Number(data.purchaseCost);
        if (data.salvageValue !== undefined) asset.salvageValue = Number(data.salvageValue);
        if (data.lifeYears !== undefined) asset.lifeYears = Number(data.lifeYears);
        if (data.depreciationMethod !== undefined) asset.depreciationMethod = data.depreciationMethod;
        if (data.status !== undefined) asset.status = data.status;

        await this.repo.save(asset);
        return asset;
    }

    async deleteAsset(id: string): Promise<void> {
        return this.repo.delete(id);
    }

    calculateDepreciation(id: string): Promise<{ yearly: string; monthly: string }> {
        return this.repo.findById(id).then(asset => {
            if (!asset) throw new Error(`FixedAsset not found: ${id}`);
            return {
                yearly: asset.annualDepreciation().toFixed(2),
                monthly: asset.monthlyDepreciation().toFixed(2),
            };
        });
    }

    async postDepreciation(id: string, amount: number, date: string): Promise<FixedAsset> {
        const asset = await this.repo.findById(id);
        if (!asset) throw new Error(`FixedAsset not found: ${id}`);

        asset.postDepreciation(amount);
        await this.repo.save(asset);

        const entry = new DepreciationSchedule(
            this.repo.nextIdentity(),
            id,
            date,
            amount,
            null
        );
        await this.repo.saveDepreciationSchedule(entry);
        return asset;
    }

    async getDepreciationSchedule(assetId: string): Promise<DepreciationSchedule[]> {
        return this.repo.findSchedulesByAsset(assetId);
    }
}
