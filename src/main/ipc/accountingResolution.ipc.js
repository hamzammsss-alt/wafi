"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAccountingResolutionIPC = registerAccountingResolutionIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const CAPABILITY = {
    DEFINITIONS_READ: 'accounting.foundation.definitions.read',
    DEFINITIONS_MANAGE: 'accounting.foundation.definitions.manage',
    RESOLUTION_EXECUTE: 'accounting.foundation.resolution.execute',
};
function registerAccountingResolutionIPC(useCases) {
    electron_1.ipcMain.handle('accounting.financialDefinitions.listByOwner', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.financialDefinitions.listByOwner',
        requiredCapabilities: [CAPABILITY.DEFINITIONS_READ],
        legacyPermissions: ['gl.view', 'system.settings'],
    }, async (ctx, _event, payload) => {
        return useCases.listFinancialDefinitionsByOwner(ctx.companyId, {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        });
    })));
    electron_1.ipcMain.handle('accounting.financialDefinitions.upsert', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.financialDefinitions.upsert',
        requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
        legacyPermissions: ['gl.edit', 'system.settings'],
    }, async (ctx, _event, payload) => {
        return useCases.upsertFinancialDefinition(ctx.companyId, {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        });
    })));
    electron_1.ipcMain.handle('accounting.financialDefinitions.bulkSaveForOwner', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.financialDefinitions.bulkSaveForOwner',
        requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
        legacyPermissions: ['gl.edit', 'system.settings'],
    }, async (ctx, _event, payload) => {
        return useCases.bulkSaveFinancialDefinitionsForOwner(ctx.companyId, {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        });
    })));
    electron_1.ipcMain.handle('accounting.financialDefinitions.deactivate', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.financialDefinitions.deactivate',
        requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
        legacyPermissions: ['gl.edit', 'system.settings'],
    }, async (ctx, _event, payload) => {
        return useCases.deactivateFinancialDefinition(ctx.companyId, {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        });
    })));
    electron_1.ipcMain.handle('accounting.accountResolution.resolve', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accountResolution.resolve',
        requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
        legacyPermissions: ['gl.post', 'DOC.POST', 'ti.gl.journal.post'],
    }, async (ctx, _event, payload) => {
        return useCases.resolveRequiredAccounts(ctx.companyId, {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        });
    })));
    electron_1.ipcMain.handle('accounting.accountResolution.previewSalesInvoice', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accountResolution.previewSalesInvoice',
        requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
        legacyPermissions: ['gl.post', 'DOC.POST', 'ti.gl.journal.post'],
    }, async (ctx, _event, payload) => {
        return useCases.previewSalesInvoice(ctx.companyId, {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        });
    })));
    electron_1.ipcMain.handle('accounting.accountResolution.previewPurchaseInvoice', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.accountResolution.previewPurchaseInvoice',
        requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
        legacyPermissions: ['gl.post', 'DOC.POST', 'ti.gl.journal.post'],
    }, async (ctx, _event, payload) => {
        return useCases.previewPurchaseInvoice(ctx.companyId, {
            ...payload,
            companyId: payload?.companyId || ctx.companyId,
        });
    })));
}
