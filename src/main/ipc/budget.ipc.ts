import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { BudgetUseCases } from '../application/useCases/BudgetUseCases';
import { getContext } from './AuthContext';

export function registerBudgetIPC(useCases: BudgetUseCases) {
    const toDTO = (b: any) => ({
        id: b.id,
        companyId: b.companyId,
        year: b.year,
        name: b.name,
        isActive: b.isActive,
        lines: b.lines?.map((l: any) => ({
            id: l.id,
            accountId: l.accountId.value,
            costCenterId: l.costCenterId,
            monthlyAllocations: l.monthlyAllocations,
            totalAllocation: l.getTotalAllocation()
        })),
        totalBudget: b.getTotalBudget()
    });

    ipcMain.handle('budgets:create', ipcWrap(async (event, data: any) => {
        const ctx = getContext(event as any);
        const budget = await useCases.createBudget(ctx.companyId, data.year, data.name);
        return toDTO(budget);
    }));

    ipcMain.handle('budgets:list', ipcWrap(async (event, year: number) => {
        const ctx = getContext(event as any);
        const budgets = await useCases.getBudgets(ctx.companyId, year);
        return budgets.map(toDTO);
    }));

    ipcMain.handle('budgets:get', ipcWrap(async (event, id: string) => {
        const budget = await useCases.getBudgetDetails(id);
        if (!budget) throw new Error('Not found');
        return toDTO(budget);
    }));

    ipcMain.handle('budgets:updateLines', ipcWrap(async (event, data: any) => {
        const budget = await useCases.updateBudgetLines(data.id, data.lines);
        return toDTO(budget);
    }));
}
