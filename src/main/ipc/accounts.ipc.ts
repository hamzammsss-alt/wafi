import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { AccountUseCases } from '../application/useCases/AccountUseCases';
import { getContext } from './AuthContext';

export function registerAccountIPC(useCases: AccountUseCases) {
    const toDTO = (a: any) => ({
        id: a.id.value,
        companyId: a.companyId,
        branchId: a.branchId,
        number: a.number,
        name: a.name,
        type: a.type,
        nature: a.nature,
        parentId: a.parentId?.value || null,
        isActive: a.isActive,
        isGroup: a.isGroup
    });

    ipcMain.handle('accounts:create', ipcWrap(async (event, data: any) => {
        const ctx = getContext(event as any);
        const account = await useCases.createAccount(ctx.companyId, ctx.branchId, data);
        return toDTO(account);
    }));

    ipcMain.handle('accounts:list', ipcWrap(async (event) => {
        const ctx = getContext(event as any);
        const accounts = await useCases.listAccounts(ctx.companyId);
        return accounts.map(toDTO);
    }));
}
