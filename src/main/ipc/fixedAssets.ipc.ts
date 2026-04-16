import { ipcMain } from 'electron';
import { FixedAssetUseCases } from '../application/useCases/FixedAssetUseCases';
import { getContext } from './AuthContext';

const toDTO = (a: any) => ({
    id: a.id,
    companyId: a.companyId,
    code: a.code,
    name: a.name,
    categoryId: a.categoryId,
    assetAccountId: a.assetAccountId,
    accumulatedDepAccountId: a.accumulatedDepAccountId,
    depExpenseAccountId: a.depExpenseAccountId,
    purchaseDate: a.purchaseDate,
    purchaseCost: a.purchaseCost,
    salvageValue: a.salvageValue,
    lifeYears: a.lifeYears,
    depreciationMethod: a.depreciationMethod,
    status: a.status,
    bookValue: a.bookValue,
    accumulatedDepreciation: a.accumulatedDepreciation,
    createdAt: a.createdAt,
});

export function registerFixedAssetIPC(useCases: FixedAssetUseCases) {
    ipcMain.handle('fixedAssets:list', async (event) => {
        const ctx = getContext(event as any);
        const assets = await useCases.getAssets(ctx.companyId);
        return assets.map(toDTO);
    });

    ipcMain.handle('fixedAssets:get', async (_event, id: string) => {
        const asset = await useCases.getAssetById(id);
        if (!asset) throw new Error('Fixed asset not found');
        return toDTO(asset);
    });

    ipcMain.handle('fixedAssets:create', async (event, data: any) => {
        const ctx = getContext(event as any);
        const asset = await useCases.createAsset(ctx.companyId, data);
        return toDTO(asset);
    });

    ipcMain.handle('fixedAssets:update', async (_event, id: string, data: any) => {
        const asset = await useCases.updateAsset(id, data);
        return toDTO(asset);
    });

    ipcMain.handle('fixedAssets:delete', async (_event, id: string) => {
        await useCases.deleteAsset(id);
        return { success: true };
    });

    ipcMain.handle('fixedAssets:calcDepreciation', async (_event, id: string) => {
        return useCases.calculateDepreciation(id);
    });

    ipcMain.handle('fixedAssets:postDepreciation', async (_event, id: string, amount: number, date: string) => {
        const asset = await useCases.postDepreciation(id, amount, date);
        return toDTO(asset);
    });

    ipcMain.handle('fixedAssets:getSchedule', async (_event, assetId: string) => {
        const schedules = await useCases.getDepreciationSchedule(assetId);
        return schedules.map(s => ({
            id: s.id,
            assetId: s.assetId,
            periodDate: s.periodDate,
            amount: s.amount,
            journalEntryId: s.journalEntryId,
            createdAt: s.createdAt,
        }));
    });
}
