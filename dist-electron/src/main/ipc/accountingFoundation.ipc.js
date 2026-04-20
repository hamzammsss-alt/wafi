"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAccountingFoundationIPC = registerAccountingFoundationIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const Account_1 = require("../domain/accountingFoundation/entities/Account");
const CAPABILITY = {
    COA_READ: 'accounting.foundation.coa.read',
    COA_MANAGE: 'accounting.foundation.coa.manage',
    DEFINITIONS_READ: 'accounting.foundation.definitions.read',
    DEFINITIONS_MANAGE: 'accounting.foundation.definitions.manage',
    RESOLUTION_EXECUTE: 'accounting.foundation.resolution.execute',
};
function registerAccountingFoundationIPC(useCases) {
    electron_1.ipcMain.handle('accountingFoundation:accounts:list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:accounts:list',
        requiredCapabilities: [CAPABILITY.COA_READ],
        legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
    }, async (ctx, _event, includeInactive) => {
        return useCases.listAccounts(ctx.companyId, Boolean(includeInactive));
    })));
    electron_1.ipcMain.handle('accountingFoundation:accounts:tree', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:accounts:tree',
        requiredCapabilities: [CAPABILITY.COA_READ],
        legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
    }, async (ctx, _event, includeInactive) => {
        return useCases.getAccountTree(ctx.companyId, Boolean(includeInactive));
    })));
    electron_1.ipcMain.handle('accountingFoundation:accounts:postable', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:accounts:postable',
        requiredCapabilities: [CAPABILITY.COA_READ],
        legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
    }, async (ctx) => {
        return useCases.listPostableAccounts(ctx.companyId);
    })));
    electron_1.ipcMain.handle('accountingFoundation:accounts:save', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:accounts:save',
        requiredCapabilities: [CAPABILITY.COA_MANAGE],
        legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
    }, async (ctx, _event, payload) => {
        return useCases.saveAccount(ctx.companyId, ctx.branchId, payload);
    })));
    electron_1.ipcMain.handle('accountingFoundation:accounts:delete', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:accounts:delete',
        requiredCapabilities: [CAPABILITY.COA_MANAGE],
        legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
    }, async (ctx, _event, accountId) => {
        await useCases.deleteAccount(ctx.companyId, String(accountId || '').trim());
        return { success: true };
    })));
    electron_1.ipcMain.handle('accountingFoundation:accounts:activate', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:accounts:activate',
        requiredCapabilities: [CAPABILITY.COA_MANAGE],
        legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
    }, async (ctx, _event, accountId) => {
        return useCases.setAccountStatus(ctx.companyId, String(accountId || '').trim(), Account_1.AccountStatus.ACTIVE);
    })));
    electron_1.ipcMain.handle('accountingFoundation:accounts:deactivate', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:accounts:deactivate',
        requiredCapabilities: [CAPABILITY.COA_MANAGE],
        legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
    }, async (ctx, _event, accountId) => {
        return useCases.setAccountStatus(ctx.companyId, String(accountId || '').trim(), Account_1.AccountStatus.INACTIVE);
    })));
    electron_1.ipcMain.handle('accountingFoundation:definitions:list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:definitions:list',
        requiredCapabilities: [CAPABILITY.DEFINITIONS_READ],
        legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'system.settings'],
    }, async (ctx, _event, includeInactive) => {
        return useCases.listFinancialDefinitions(ctx.companyId, Boolean(includeInactive));
    })));
    electron_1.ipcMain.handle('accountingFoundation:definitions:save', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:definitions:save',
        requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
        legacyPermissions: ['gl.edit', 'system.settings'],
    }, async (ctx, _event, payload) => {
        return useCases.saveFinancialDefinition(ctx.companyId, ctx.branchId, payload);
    })));
    electron_1.ipcMain.handle('accountingFoundation:definitions:delete', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:definitions:delete',
        requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
        legacyPermissions: ['gl.edit', 'system.settings'],
    }, async (ctx, _event, definitionId) => {
        await useCases.deleteFinancialDefinition(ctx.companyId, String(definitionId || '').trim());
        return { success: true };
    })));
    electron_1.ipcMain.handle('accountingFoundation:resolution:resolve', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:resolution:resolve',
        requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
        legacyPermissions: ['gl.post', 'JOURNAL_POST', 'DOC.POST', 'ti.gl.journal.post'],
    }, async (ctx, _event, payload) => {
        return useCases.resolveAccounts(ctx.companyId, ctx.branchId, payload);
    })));
    electron_1.ipcMain.handle('accountingFoundation:resolution:debug', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accountingFoundation:resolution:debug',
        requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
        legacyPermissions: ['gl.post', 'JOURNAL_POST', 'DOC.POST', 'ti.gl.journal.post'],
    }, async (ctx, _event, payload) => {
        return useCases.resolveAccounts(ctx.companyId, ctx.branchId, payload);
    })));
}
