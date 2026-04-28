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
        supplierId?: string | null;
        supplierAccountId?: string | null;
        supplierInvoiceNo?: string | null;
        supplierInvoiceAmount?: number | null;
        clearanceCost?: number | null;
        clearanceAccountId?: string | null;
        purchaseJournalId?: string | null;
        purchaseJournalNo?: string | null;
        clearanceJournalId?: string | null;
        clearanceJournalNo?: string | null;
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
            Math.max(0, Number(data.lifeYears) || 0),
            data.depreciationMethod || 'StraightLine',
            'Active',
            cost,         // initial book value = purchase cost
            0,            // no accumulated depreciation yet
            data.supplierId || null,
            data.supplierAccountId || null,
            data.supplierInvoiceNo || null,
            Number(data.supplierInvoiceAmount ?? cost) || 0,
            Number(data.clearanceCost) || 0,
            data.clearanceAccountId || null,
            data.purchaseJournalId || null,
            data.purchaseJournalNo || null,
            data.clearanceJournalId || null,
            data.clearanceJournalNo || null
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
        supplierId: string | null;
        supplierAccountId: string | null;
        supplierInvoiceNo: string | null;
        supplierInvoiceAmount: number;
        clearanceCost: number;
        clearanceAccountId: string | null;
        purchaseJournalId: string | null;
        purchaseJournalNo: string | null;
        clearanceJournalId: string | null;
        clearanceJournalNo: string | null;
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
        if (data.supplierId !== undefined) asset.supplierId = data.supplierId || null;
        if (data.supplierAccountId !== undefined) asset.supplierAccountId = data.supplierAccountId || null;
        if (data.supplierInvoiceNo !== undefined) asset.supplierInvoiceNo = data.supplierInvoiceNo || null;
        if (data.supplierInvoiceAmount !== undefined) asset.supplierInvoiceAmount = Number(data.supplierInvoiceAmount) || 0;
        if (data.clearanceCost !== undefined) asset.clearanceCost = Number(data.clearanceCost) || 0;
        if (data.clearanceAccountId !== undefined) asset.clearanceAccountId = data.clearanceAccountId || null;
        if (data.purchaseJournalId !== undefined) asset.purchaseJournalId = data.purchaseJournalId || null;
        if (data.purchaseJournalNo !== undefined) asset.purchaseJournalNo = data.purchaseJournalNo || null;
        if (data.clearanceJournalId !== undefined) asset.clearanceJournalId = data.clearanceJournalId || null;
        if (data.clearanceJournalNo !== undefined) asset.clearanceJournalNo = data.clearanceJournalNo || null;
        if (data.salvageValue !== undefined) asset.salvageValue = Number(data.salvageValue);
        if (data.lifeYears !== undefined) asset.lifeYears = Math.max(0, Number(data.lifeYears) || 0);
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
