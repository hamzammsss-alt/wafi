import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { ChartOfAccountsUseCases } from '../application/useCases/ChartOfAccountsUseCases';
import {
    AccountQueryInput,
    CreateAccountInput,
    SeedDefaultChartInput,
    UpdateAccountInput,
} from '../application/dtos/ChartOfAccountsDtos';

const CAPABILITY = {
    COA_READ: 'accounting.foundation.coa.read',
    COA_MANAGE: 'accounting.foundation.coa.manage',
} as const;

export function registerChartOfAccountsIPC(useCases: ChartOfAccountsUseCases): void {
    ipcMain.handle(
        'accounting.accounts.seedDefaultChart',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accounts.seedDefaultChart',
                    requiredCapabilities: [CAPABILITY.COA_MANAGE],
                    legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
                },
                async (ctx, _event, payload: SeedDefaultChartInput) => {
                    const input: SeedDefaultChartInput = {
                        companyId: payload?.companyId || ctx.companyId,
                        strategy: payload?.strategy,
                    };
                    return useCases.seedDefaultChart(ctx.companyId, input);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.accounts.listTree',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accounts.listTree',
                    requiredCapabilities: [CAPABILITY.COA_READ],
                    legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
                },
                async (ctx, _event, query?: AccountQueryInput) => {
                    return useCases.listTree(ctx.companyId, query);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.accounts.listFlat',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accounts.listFlat',
                    requiredCapabilities: [CAPABILITY.COA_READ],
                    legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
                },
                async (ctx, _event, query?: AccountQueryInput) => {
                    return useCases.listFlat(ctx.companyId, query);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.accounts.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accounts.create',
                    requiredCapabilities: [CAPABILITY.COA_MANAGE],
                    legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
                },
                async (ctx, _event, payload: CreateAccountInput) => {
                    const input: CreateAccountInput = {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    };
                    return useCases.createAccount(ctx.companyId, input);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.accounts.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accounts.update',
                    requiredCapabilities: [CAPABILITY.COA_MANAGE],
                    legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
                },
                async (ctx, _event, payload: UpdateAccountInput) => {
                    const input: UpdateAccountInput = {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    };
                    return useCases.updateAccount(ctx.companyId, input);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.accounts.findByCode',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accounts.findByCode',
                    requiredCapabilities: [CAPABILITY.COA_READ],
                    legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
                },
                async (ctx, _event, code: string) => {
                    return useCases.findByCode(ctx.companyId, String(code || '').trim());
                },
            ),
        ),
    );
}
