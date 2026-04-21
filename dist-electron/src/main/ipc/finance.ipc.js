"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFinanceIPC = registerFinanceIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const AuthContext_1 = require("./AuthContext");
function registerFinanceIPC(useCases) {
    // --- Currencies ---
    electron_1.ipcMain.handle('finance:listCurrencies', (0, ipcWrap_1.ipcWrap)(async (event) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return await useCases.listCurrencies(ctx.companyId);
    }));
    electron_1.ipcMain.handle('finance:saveCurrency', (0, ipcWrap_1.ipcWrap)(async (event, data) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        await useCases.saveCurrency(data, ctx.companyId);
        return { success: true };
    }));
    electron_1.ipcMain.handle('finance:getCurrencyHistory', (0, ipcWrap_1.ipcWrap)(async (event, code, days) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return await useCases.listCurrencyHistory(code, ctx.companyId, days);
    }));
    electron_1.ipcMain.handle('finance:getCurrencyTimeline', (0, ipcWrap_1.ipcWrap)(async (event, code, limit) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return await useCases.listCurrencyTimeline(code, ctx.companyId, limit);
    }));
    electron_1.ipcMain.handle('finance:deleteCurrency', (0, ipcWrap_1.ipcWrap)(async (event, id) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        await useCases.deleteCurrency(id, ctx.companyId);
        return { success: true };
    }));
    // --- Cost Centers ---
    electron_1.ipcMain.handle('finance:listCostCenters', (0, ipcWrap_1.ipcWrap)(async (event) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return await useCases.listCostCenters(ctx.companyId);
    }));
    electron_1.ipcMain.handle('finance:saveCostCenter', (0, ipcWrap_1.ipcWrap)(async (event, data) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        await useCases.saveCostCenter(data, ctx.companyId);
        return { success: true };
    }));
    electron_1.ipcMain.handle('finance:deleteCostCenter', (0, ipcWrap_1.ipcWrap)(async (event, id) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        await useCases.deleteCostCenter(id, ctx.companyId);
        return { success: true };
    }));
    // --- Tax Groups ---
    electron_1.ipcMain.handle('finance:listTaxGroups', (0, ipcWrap_1.ipcWrap)(async (event) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return await useCases.listTaxGroups(ctx.companyId);
    }));
    electron_1.ipcMain.handle('finance:saveTaxGroup', (0, ipcWrap_1.ipcWrap)(async (event, data) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        await useCases.saveTaxGroup(data, ctx.companyId);
        return { success: true };
    }));
    electron_1.ipcMain.handle('finance:deleteTaxGroup', (0, ipcWrap_1.ipcWrap)(async (event, id) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        await useCases.deleteTaxGroup(id, ctx.companyId);
        return { success: true };
    }));
}
