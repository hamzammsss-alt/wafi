import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { AccountingFoundationUseCases } from '../application/useCases/AccountingFoundationUseCases';
import { withGuards } from './withGuards';
import {
    ResolveAccountsInput,
    SaveAccountInput,
    SaveFinancialDefinitionInput,
} from '../application/dtos/AccountingFoundationDtos';
import { AccountStatus } from '../domain/accountingFoundation/entities/Account';

const CAPABILITY = {
    COA_READ: 'accounting.foundation.coa.read',
    COA_MANAGE: 'accounting.foundation.coa.manage',
    DEFINITIONS_READ: 'accounting.foundation.definitions.read',
    DEFINITIONS_MANAGE: 'accounting.foundation.definitions.manage',
    RESOLUTION_EXECUTE: 'accounting.foundation.resolution.execute',
} as const;

export function registerAccountingFoundationIPC(useCases: AccountingFoundationUseCases): void {
    ipcMain.handle(
        'accountingFoundation:accounts:list',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:accounts:list',
                    requiredCapabilities: [CAPABILITY.COA_READ],
                    legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
                },
                async (ctx, _event, includeInactive?: boolean) => {
                    return useCases.listAccounts(ctx.companyId, Boolean(includeInactive));
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:accounts:tree',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:accounts:tree',
                    requiredCapabilities: [CAPABILITY.COA_READ],
                    legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
                },
                async (ctx, _event, includeInactive?: boolean) => {
                    return useCases.getAccountTree(ctx.companyId, Boolean(includeInactive));
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:accounts:postable',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:accounts:postable',
                    requiredCapabilities: [CAPABILITY.COA_READ],
                    legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
                },
                async (ctx) => {
                    return useCases.listPostableAccounts(ctx.companyId);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:accounts:save',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:accounts:save',
                    requiredCapabilities: [CAPABILITY.COA_MANAGE],
                    legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
                },
                async (ctx, _event, payload: SaveAccountInput) => {
                    return useCases.saveAccount(ctx.companyId, ctx.branchId, payload);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:accounts:delete',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:accounts:delete',
                    requiredCapabilities: [CAPABILITY.COA_MANAGE],
                    legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
                },
                async (ctx, _event, accountId: string) => {
                    await useCases.deleteAccount(ctx.companyId, String(accountId || '').trim());
                    return { success: true };
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:accounts:activate',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:accounts:activate',
                    requiredCapabilities: [CAPABILITY.COA_MANAGE],
                    legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
                },
                async (ctx, _event, accountId: string) => {
                    return useCases.setAccountStatus(ctx.companyId, String(accountId || '').trim(), AccountStatus.ACTIVE);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:accounts:deactivate',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:accounts:deactivate',
                    requiredCapabilities: [CAPABILITY.COA_MANAGE],
                    legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
                },
                async (ctx, _event, accountId: string) => {
                    return useCases.setAccountStatus(ctx.companyId, String(accountId || '').trim(), AccountStatus.INACTIVE);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:definitions:list',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:definitions:list',
                    requiredCapabilities: [CAPABILITY.DEFINITIONS_READ],
                    legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'system.settings'],
                },
                async (ctx, _event, includeInactive?: boolean) => {
                    return useCases.listFinancialDefinitions(ctx.companyId, Boolean(includeInactive));
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:definitions:save',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:definitions:save',
                    requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
                    legacyPermissions: ['gl.edit', 'system.settings'],
                },
                async (ctx, _event, payload: SaveFinancialDefinitionInput) => {
                    return useCases.saveFinancialDefinition(ctx.companyId, ctx.branchId, payload);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:definitions:delete',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:definitions:delete',
                    requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
                    legacyPermissions: ['gl.edit', 'system.settings'],
                },
                async (ctx, _event, definitionId: string) => {
                    await useCases.deleteFinancialDefinition(ctx.companyId, String(definitionId || '').trim());
                    return { success: true };
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:resolution:resolve',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:resolution:resolve',
                    requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
                    legacyPermissions: ['gl.post', 'JOURNAL_POST', 'DOC.POST', 'ti.gl.journal.post'],
                },
                async (ctx, _event, payload: ResolveAccountsInput) => {
                    return useCases.resolveAccounts(ctx.companyId, ctx.branchId, payload);
                },
            ),
        ),
    );

    ipcMain.handle(
        'accountingFoundation:resolution:debug',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accountingFoundation:resolution:debug',
                    requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
                    legacyPermissions: ['gl.post', 'JOURNAL_POST', 'DOC.POST', 'ti.gl.journal.post'],
                },
                async (ctx, _event, payload: ResolveAccountsInput) => {
                    return useCases.resolveAccounts(ctx.companyId, ctx.branchId, payload);
                },
            ),
        ),
    );
}
