import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { FinanceUseCases } from '../application/useCases/FinanceUseCases';
import { getContext } from './AuthContext';

export function registerFinanceIPC(useCases: FinanceUseCases) {
    // --- Currencies ---
    ipcMain.handle('finance:listCurrencies', ipcWrap(async (event) => {
        const ctx = getContext(event as any);
        return await useCases.listCurrencies(ctx.companyId);
    }));

    ipcMain.handle('finance:saveCurrency', ipcWrap(async (event, data: any) => {
        const ctx = getContext(event as any);
        await useCases.saveCurrency(data, ctx.companyId);
        return { success: true };
    }));

    ipcMain.handle('finance:deleteCurrency', ipcWrap(async (event, id: string) => {
        const ctx = getContext(event as any);
        await useCases.deleteCurrency(id, ctx.companyId);
        return { success: true };
    }));

    // --- Cost Centers ---
    ipcMain.handle('finance:listCostCenters', ipcWrap(async (event) => {
        const ctx = getContext(event as any);
        return await useCases.listCostCenters(ctx.companyId);
    }));

    ipcMain.handle('finance:saveCostCenter', ipcWrap(async (event, data: any) => {
        const ctx = getContext(event as any);
        await useCases.saveCostCenter(data, ctx.companyId);
        return { success: true };
    }));

    ipcMain.handle('finance:deleteCostCenter', ipcWrap(async (event, id: string) => {
        const ctx = getContext(event as any);
        await useCases.deleteCostCenter(id, ctx.companyId);
        return { success: true };
    }));

    // --- Tax Groups ---
    ipcMain.handle('finance:listTaxGroups', ipcWrap(async (event) => {
        const ctx = getContext(event as any);
        return await useCases.listTaxGroups(ctx.companyId);
    }));

    ipcMain.handle('finance:saveTaxGroup', ipcWrap(async (event, data: any) => {
        const ctx = getContext(event as any);
        await useCases.saveTaxGroup(data, ctx.companyId);
        return { success: true };
    }));

    ipcMain.handle('finance:deleteTaxGroup', ipcWrap(async (event, id: string) => {
        const ctx = getContext(event as any);
        await useCases.deleteTaxGroup(id, ctx.companyId);
        return { success: true };
    }));
}
