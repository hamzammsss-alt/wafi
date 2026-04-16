import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { AccountingResolutionUseCases } from '../application/useCases/AccountingResolutionUseCases';
import {
    BulkSaveFinancialDefinitionsForOwnerInput,
    DeactivateFinancialDefinitionInput,
    ListFinancialDefinitionsByOwnerInput,
    ResolveAccountsInput,
    ResolutionPreviewInput,
    UpsertFinancialDefinitionInput,
} from '../application/dtos/AccountingResolutionDtos';

const CAPABILITY = {
    DEFINITIONS_READ: 'accounting.foundation.definitions.read',
    DEFINITIONS_MANAGE: 'accounting.foundation.definitions.manage',
    RESOLUTION_EXECUTE: 'accounting.foundation.resolution.execute',
} as const;

export function registerAccountingResolutionIPC(useCases: AccountingResolutionUseCases): void {
    ipcMain.handle(
        'accounting.financialDefinitions.listByOwner',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.financialDefinitions.listByOwner',
                    requiredCapabilities: [CAPABILITY.DEFINITIONS_READ],
                    legacyPermissions: ['gl.view', 'system.settings'],
                },
                async (ctx, _event, payload: ListFinancialDefinitionsByOwnerInput) => {
                    return useCases.listFinancialDefinitionsByOwner(ctx.companyId, {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    });
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.financialDefinitions.upsert',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.financialDefinitions.upsert',
                    requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
                    legacyPermissions: ['gl.edit', 'system.settings'],
                },
                async (ctx, _event, payload: UpsertFinancialDefinitionInput) => {
                    return useCases.upsertFinancialDefinition(ctx.companyId, {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    });
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.financialDefinitions.bulkSaveForOwner',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.financialDefinitions.bulkSaveForOwner',
                    requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
                    legacyPermissions: ['gl.edit', 'system.settings'],
                },
                async (ctx, _event, payload: BulkSaveFinancialDefinitionsForOwnerInput) => {
                    return useCases.bulkSaveFinancialDefinitionsForOwner(ctx.companyId, {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    });
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.financialDefinitions.deactivate',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.financialDefinitions.deactivate',
                    requiredCapabilities: [CAPABILITY.DEFINITIONS_MANAGE],
                    legacyPermissions: ['gl.edit', 'system.settings'],
                },
                async (ctx, _event, payload: DeactivateFinancialDefinitionInput) => {
                    return useCases.deactivateFinancialDefinition(ctx.companyId, {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    });
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.accountResolution.resolve',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accountResolution.resolve',
                    requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
                    legacyPermissions: ['gl.post', 'DOC.POST', 'ti.gl.journal.post'],
                },
                async (ctx, _event, payload: ResolveAccountsInput) => {
                    return useCases.resolveRequiredAccounts(ctx.companyId, {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    });
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.accountResolution.previewSalesInvoice',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accountResolution.previewSalesInvoice',
                    requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
                    legacyPermissions: ['gl.post', 'DOC.POST', 'ti.gl.journal.post'],
                },
                async (ctx, _event, payload: ResolutionPreviewInput) => {
                    return useCases.previewSalesInvoice(ctx.companyId, {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    });
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.accountResolution.previewPurchaseInvoice',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.accountResolution.previewPurchaseInvoice',
                    requiredCapabilities: [CAPABILITY.RESOLUTION_EXECUTE],
                    legacyPermissions: ['gl.post', 'DOC.POST', 'ti.gl.journal.post'],
                },
                async (ctx, _event, payload: ResolutionPreviewInput) => {
                    return useCases.previewPurchaseInvoice(ctx.companyId, {
                        ...payload,
                        companyId: payload?.companyId || ctx.companyId,
                    });
                },
            ),
        ),
    );
}
