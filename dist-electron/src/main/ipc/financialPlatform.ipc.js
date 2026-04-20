"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFinancialPlatformIPC = registerFinancialPlatformIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
function registerFinancialPlatformIPC(useCases) {
    electron_1.ipcMain.handle('financialPlatform:startCloseCycle', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.startCloseCycle',
        requiredCapabilities: ['accounting.period.close'],
        legacyPermissions: ['gl.closing'],
    }, async (ctx, _event, period) => useCases.startCloseCycle(ctx, period))));
    electron_1.ipcMain.handle('financialPlatform:startConsolidation', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.startConsolidation',
        requiredCapabilities: ['consolidation.run.start'],
        legacyPermissions: ['gl.reports'],
    }, async (ctx, _event, data) => useCases.createConsolidationRun(ctx, data))));
    electron_1.ipcMain.handle('financialPlatform:upsertCashPosition', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.upsertCashPosition',
        requiredCapabilities: ['treasury.cash_position.update'],
        legacyPermissions: ['gl.banks', 'treasury.payment'],
    }, async (ctx, _event, data) => useCases.upsertCashPosition(ctx, data))));
    electron_1.ipcMain.handle('financialPlatform:createPaymentRun', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.createPaymentRun',
        requiredCapabilities: ['treasury.payment.run.execute'],
        legacyPermissions: ['treasury.payment'],
    }, async (ctx, _event, data) => useCases.createPaymentRun(ctx, data))));
    electron_1.ipcMain.handle('financialPlatform:submitRiskAssessment', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.submitRiskAssessment',
        requiredCapabilities: ['grc.risk.assess'],
        legacyPermissions: ['system.logs', 'system.settings'],
    }, async (ctx, _event, data) => useCases.submitRiskAssessment(ctx, data))));
    electron_1.ipcMain.handle('financialPlatform:createRevenueContract', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.createRevenueContract',
        requiredCapabilities: ['revenue.contract.create'],
        legacyPermissions: ['sales.create'],
    }, async (ctx, _event, data) => useCases.createRevenueContract(ctx, data))));
    electron_1.ipcMain.handle('financialPlatform:runRevenueRecognition', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.runRevenueRecognition',
        requiredCapabilities: ['revenue.recognition.run'],
        legacyPermissions: ['gl.post'],
    }, async (ctx, _event, data) => useCases.runRevenueRecognition(ctx, data))));
    electron_1.ipcMain.handle('financialPlatform:postCarbonEntry', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.postCarbonEntry',
        requiredCapabilities: ['sustainability.carbon.entry.post'],
        legacyPermissions: ['gl.post'],
    }, async (ctx, _event, data) => useCases.postCarbonEntry(ctx, data))));
    electron_1.ipcMain.handle('financialPlatform:runAnalyticsForecast', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.runAnalyticsForecast',
        requiredCapabilities: ['analytics.forecast.generate'],
        legacyPermissions: ['reports.financial', 'reports.view_all'],
    }, async (ctx, _event, data) => useCases.runAnalyticsForecast(ctx, data))));
    electron_1.ipcMain.handle('financialPlatform:getExecutiveSnapshot', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'financialPlatform.getExecutiveSnapshot',
        requiredCapabilities: ['analytics.dashboard.financial.view'],
        legacyPermissions: ['reports.financial', 'reports.view_all'],
    }, async (ctx) => useCases.getExecutiveSnapshot(ctx))));
}
