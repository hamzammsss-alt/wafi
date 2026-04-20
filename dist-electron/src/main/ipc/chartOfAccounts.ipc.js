"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChartOfAccountsIPC = registerChartOfAccountsIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const CAPABILITY = {
    COA_READ: 'accounting.foundation.coa.read',
    COA_MANAGE: 'accounting.foundation.coa.manage',
};
function registerChartOfAccountsIPC(useCases) {
    electron_1.ipcMain.handle('accounting.accounts.seedDefaultChart', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accounts.seedDefaultChart',
        requiredCapabilities: [CAPABILITY.COA_MANAGE],
        legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
    }, async (ctx, _event, payload) => {
        const input = {
            companyId: payload?.companyId || ctx.companyId,
            strategy: payload?.strategy,
        };
        return useCases.seedDefaultChart(ctx.companyId, input);
    })));
    electron_1.ipcMain.handle('accounting.accounts.listTree', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accounts.listTree',
        requiredCapabilities: [CAPABILITY.COA_READ],
        legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
    }, async (ctx, _event, query) => {
        return useCases.listTree(ctx.companyId, query);
    })));
    electron_1.ipcMain.handle('accounting.accounts.listFlat', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accounts.listFlat',
        requiredCapabilities: [CAPABILITY.COA_READ],
        legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
    }, async (ctx, _event, query) => {
        return useCases.listFlat(ctx.companyId, query);
    })));
    electron_1.ipcMain.handle('accounting.accounts.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accounts.create',
        requiredCapabilities: [CAPABILITY.COA_MANAGE],
        legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
    }, async (ctx, _event, payload) => {
        const input = {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        };
        return useCases.createAccount(ctx.companyId, input);
    })));
    electron_1.ipcMain.handle('accounting.accounts.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accounts.update',
        requiredCapabilities: [CAPABILITY.COA_MANAGE],
        legacyPermissions: ['gl.edit', 'ACCOUNT_CREATE', 'system.settings'],
    }, async (ctx, _event, payload) => {
        const input = {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        };
        return useCases.updateAccount(ctx.companyId, input);
    })));
    electron_1.ipcMain.handle('accounting.accounts.findByCode', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accounts.findByCode',
        requiredCapabilities: [CAPABILITY.COA_READ],
        legacyPermissions: ['gl.view', 'ti.gl.journal.post', 'ACCOUNT_CREATE'],
    }, async (ctx, _event, code) => {
        return useCases.findByCode(ctx.companyId, String(code || '').trim());
    })));
}
