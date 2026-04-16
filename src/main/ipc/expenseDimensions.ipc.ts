import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import {
    CostCenterExpenseReportInput,
    ExpenseTypeReportInput,
    ListCostCentersInput,
    ListExpenseTypesInput,
    ListVehiclesInput,
    ValidateJournalLineDimensionsInput,
    VehicleExpenseReportInput,
} from '../application/dtos/ExpenseDimensionsDtos';
import { ExpenseDimensionsUseCases } from '../application/useCases/ExpenseDimensionsUseCases';
import { withGuards } from './withGuards';

const CAPABILITY = {
    DIMENSION_READ: 'accounting.dimensions.read',
    DIMENSION_VALIDATE: 'accounting.journal_voucher.update',
    REPORT_READ: 'accounting.reports.read',
} as const;

export function registerExpenseDimensionsIPC(useCases: ExpenseDimensionsUseCases): void {
    ipcMain.handle(
        'accounting.expenseTypes.list',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.expenseTypes.list',
                    requiredCapabilities: [CAPABILITY.DIMENSION_READ],
                    legacyPermissions: ['gl.view', 'accounting.view', 'system.settings'],
                },
                async (ctx, _event, payload?: ListExpenseTypesInput) =>
                    useCases.listExpenseTypes(ctx.companyId, payload || {}),
            ),
        ),
    );

    ipcMain.handle(
        'accounting.costCenters.list',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.costCenters.list',
                    requiredCapabilities: [CAPABILITY.DIMENSION_READ],
                    legacyPermissions: ['gl.view', 'accounting.view', 'system.settings'],
                },
                async (ctx, _event, payload?: ListCostCentersInput) =>
                    useCases.listCostCenters(ctx.companyId, payload || {}),
            ),
        ),
    );

    ipcMain.handle(
        'fleet.vehicles.list',
        ipcWrap(
            withGuards(
                {
                    eventName: 'fleet.vehicles.list',
                    requiredCapabilities: [CAPABILITY.DIMENSION_READ],
                    legacyPermissions: ['inventory.view', 'gl.view', 'system.settings'],
                },
                async (ctx, _event, payload?: ListVehiclesInput) =>
                    useCases.listVehicles(ctx.companyId, payload || {}),
            ),
        ),
    );

    ipcMain.handle(
        'accounting.journalDimensions.validate',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.journalDimensions.validate',
                    requiredCapabilities: [CAPABILITY.DIMENSION_VALIDATE],
                    legacyPermissions: ['gl.edit', 'accounting.edit', 'system.settings'],
                },
                async (ctx, _event, payload: ValidateJournalLineDimensionsInput) => {
                    await useCases.validateJournalLineDimensions(ctx.companyId, payload);
                    return { valid: true };
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.expenseReports.vehicle',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.expenseReports.vehicle',
                    requiredCapabilities: [CAPABILITY.REPORT_READ],
                    legacyPermissions: ['gl.view', 'accounting.view', 'reports.view'],
                },
                async (ctx, _event, payload?: VehicleExpenseReportInput) =>
                    useCases.getVehicleExpenseReport(ctx.companyId, payload || {}),
            ),
        ),
    );

    ipcMain.handle(
        'accounting.expenseReports.expenseType',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.expenseReports.expenseType',
                    requiredCapabilities: [CAPABILITY.REPORT_READ],
                    legacyPermissions: ['gl.view', 'accounting.view', 'reports.view'],
                },
                async (ctx, _event, payload?: ExpenseTypeReportInput) =>
                    useCases.getExpenseTypeReport(ctx.companyId, payload || {}),
            ),
        ),
    );

    ipcMain.handle(
        'accounting.expenseReports.costCenter',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.expenseReports.costCenter',
                    requiredCapabilities: [CAPABILITY.REPORT_READ],
                    legacyPermissions: ['gl.view', 'accounting.view', 'reports.view'],
                },
                async (ctx, _event, payload?: CostCenterExpenseReportInput) =>
                    useCases.getCostCenterExpenseReport(ctx.companyId, payload || {}),
            ),
        ),
    );
}
