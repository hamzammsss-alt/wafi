import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { FinancialPlatformUseCases } from '../application/useCases/FinancialPlatformUseCases';
import { withGuards } from './withGuards';

export function registerFinancialPlatformIPC(useCases: FinancialPlatformUseCases) {
    ipcMain.handle('financialPlatform:startCloseCycle', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.startCloseCycle',
            requiredCapabilities: ['accounting.period.close'],
            legacyPermissions: ['gl.closing'],
        },
        async (ctx, _event, period: string) => useCases.startCloseCycle(ctx, period)
    )));

    ipcMain.handle('financialPlatform:startConsolidation', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.startConsolidation',
            requiredCapabilities: ['consolidation.run.start'],
            legacyPermissions: ['gl.reports'],
        },
        async (ctx, _event, data: any) => useCases.createConsolidationRun(ctx, data)
    )));

    ipcMain.handle('financialPlatform:upsertCashPosition', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.upsertCashPosition',
            requiredCapabilities: ['treasury.cash_position.update'],
            legacyPermissions: ['gl.banks', 'treasury.payment'],
        },
        async (ctx, _event, data: any) => useCases.upsertCashPosition(ctx, data)
    )));

    ipcMain.handle('financialPlatform:createPaymentRun', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.createPaymentRun',
            requiredCapabilities: ['treasury.payment.run.execute'],
            legacyPermissions: ['treasury.payment'],
        },
        async (ctx, _event, data: any) => useCases.createPaymentRun(ctx, data)
    )));

    ipcMain.handle('financialPlatform:submitRiskAssessment', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.submitRiskAssessment',
            requiredCapabilities: ['grc.risk.assess'],
            legacyPermissions: ['system.logs', 'system.settings'],
        },
        async (ctx, _event, data: any) => useCases.submitRiskAssessment(ctx, data)
    )));

    ipcMain.handle('financialPlatform:createRevenueContract', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.createRevenueContract',
            requiredCapabilities: ['revenue.contract.create'],
            legacyPermissions: ['sales.create'],
        },
        async (ctx, _event, data: any) => useCases.createRevenueContract(ctx, data)
    )));

    ipcMain.handle('financialPlatform:runRevenueRecognition', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.runRevenueRecognition',
            requiredCapabilities: ['revenue.recognition.run'],
            legacyPermissions: ['gl.post'],
        },
        async (ctx, _event, data: any) => useCases.runRevenueRecognition(ctx, data)
    )));

    ipcMain.handle('financialPlatform:postCarbonEntry', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.postCarbonEntry',
            requiredCapabilities: ['sustainability.carbon.entry.post'],
            legacyPermissions: ['gl.post'],
        },
        async (ctx, _event, data: any) => useCases.postCarbonEntry(ctx, data)
    )));

    ipcMain.handle('financialPlatform:runAnalyticsForecast', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.runAnalyticsForecast',
            requiredCapabilities: ['analytics.forecast.generate'],
            legacyPermissions: ['reports.financial', 'reports.view_all'],
        },
        async (ctx, _event, data: any) => useCases.runAnalyticsForecast(ctx, data)
    )));

    ipcMain.handle('financialPlatform:getExecutiveSnapshot', ipcWrap(withGuards(
        {
            eventName: 'financialPlatform.getExecutiveSnapshot',
            requiredCapabilities: ['analytics.dashboard.financial.view'],
            legacyPermissions: ['reports.financial', 'reports.view_all'],
        },
        async (ctx) => useCases.getExecutiveSnapshot(ctx)
    )));
}
