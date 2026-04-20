"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFixedAssetIPC = registerFixedAssetIPC;
const electron_1 = require("electron");
const AuthContext_1 = require("./AuthContext");
const toDTO = (a) => ({
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
function registerFixedAssetIPC(useCases) {
    electron_1.ipcMain.handle('fixedAssets:list', async (event) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        const assets = await useCases.getAssets(ctx.companyId);
        return assets.map(toDTO);
    });
    electron_1.ipcMain.handle('fixedAssets:get', async (_event, id) => {
        const asset = await useCases.getAssetById(id);
        if (!asset)
            throw new Error('Fixed asset not found');
        return toDTO(asset);
    });
    electron_1.ipcMain.handle('fixedAssets:create', async (event, data) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        const asset = await useCases.createAsset(ctx.companyId, data);
        return toDTO(asset);
    });
    electron_1.ipcMain.handle('fixedAssets:update', async (_event, id, data) => {
        const asset = await useCases.updateAsset(id, data);
        return toDTO(asset);
    });
    electron_1.ipcMain.handle('fixedAssets:delete', async (_event, id) => {
        await useCases.deleteAsset(id);
        return { success: true };
    });
    electron_1.ipcMain.handle('fixedAssets:calcDepreciation', async (_event, id) => {
        return useCases.calculateDepreciation(id);
    });
    electron_1.ipcMain.handle('fixedAssets:postDepreciation', async (_event, id, amount, date) => {
        const asset = await useCases.postDepreciation(id, amount, date);
        return toDTO(asset);
    });
    electron_1.ipcMain.handle('fixedAssets:getSchedule', async (_event, assetId) => {
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
