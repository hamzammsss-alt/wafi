"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExpenseDimensionsIPC = registerExpenseDimensionsIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const CAPABILITY = {
    DIMENSION_READ: 'accounting.dimensions.read',
    DIMENSION_VALIDATE: 'accounting.journal_voucher.update',
    REPORT_READ: 'accounting.reports.read',
};
function registerExpenseDimensionsIPC(useCases) {
    electron_1.ipcMain.handle('accounting.expenseTypes.list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.expenseTypes.list',
        requiredCapabilities: [CAPABILITY.DIMENSION_READ],
        legacyPermissions: ['gl.view', 'accounting.view', 'system.settings'],
    }, async (ctx, _event, payload) => useCases.listExpenseTypes(ctx.companyId, payload || {}))));
    electron_1.ipcMain.handle('accounting.costCenters.list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.costCenters.list',
        requiredCapabilities: [CAPABILITY.DIMENSION_READ],
        legacyPermissions: ['gl.view', 'accounting.view', 'system.settings'],
    }, async (ctx, _event, payload) => useCases.listCostCenters(ctx.companyId, payload || {}))));
    electron_1.ipcMain.handle('fleet.vehicles.list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'fleet.vehicles.list',
        requiredCapabilities: [CAPABILITY.DIMENSION_READ],
        legacyPermissions: ['inventory.view', 'gl.view', 'system.settings'],
    }, async (ctx, _event, payload) => useCases.listVehicles(ctx.companyId, payload || {}))));
    electron_1.ipcMain.handle('accounting.journalDimensions.validate', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.journalDimensions.validate',
        requiredCapabilities: [CAPABILITY.DIMENSION_VALIDATE],
        legacyPermissions: ['gl.edit', 'accounting.edit', 'system.settings'],
    }, async (ctx, _event, payload) => {
        await useCases.validateJournalLineDimensions(ctx.companyId, payload);
        return { valid: true };
    })));
    electron_1.ipcMain.handle('accounting.expenseReports.vehicle', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.expenseReports.vehicle',
        requiredCapabilities: [CAPABILITY.REPORT_READ],
        legacyPermissions: ['gl.view', 'accounting.view', 'reports.view'],
    }, async (ctx, _event, payload) => useCases.getVehicleExpenseReport(ctx.companyId, payload || {}))));
    electron_1.ipcMain.handle('accounting.expenseReports.expenseType', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.expenseReports.expenseType',
        requiredCapabilities: [CAPABILITY.REPORT_READ],
        legacyPermissions: ['gl.view', 'accounting.view', 'reports.view'],
    }, async (ctx, _event, payload) => useCases.getExpenseTypeReport(ctx.companyId, payload || {}))));
    electron_1.ipcMain.handle('accounting.expenseReports.costCenter', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.expenseReports.costCenter',
        requiredCapabilities: [CAPABILITY.REPORT_READ],
        legacyPermissions: ['gl.view', 'accounting.view', 'reports.view'],
    }, async (ctx, _event, payload) => useCases.getCostCenterExpenseReport(ctx.companyId, payload || {}))));
}
