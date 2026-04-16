import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { SalesOperationsUseCases } from '../application/useCases/SalesOperationsUseCases';
import {
    ConvertQuotationToOrderInput,
    CreateSalesOperationDocumentInput,
    UpdateSalesOperationDocumentInput,
} from '../domain/salesOperations/types/SalesOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['sales.view', 'sales.quotation.read', 'ti.sales.quotation.read', 'system.settings'],
    WRITE: ['sales.create', 'sales.edit', 'sales.quotation.write', 'ti.sales.quotation.write', 'system.settings'],
    POST: ['sales.post', 'DOC.POST', 'sales.quotation.post', 'ti.sales.quotation.post', 'system.settings'],
} as const;

export function registerSalesQuotationIPC(useCases: SalesOperationsUseCases): void {
    ipcMain.handle(
        'salesQuotation.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesQuotation.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreateSalesOperationDocumentInput) =>
                    useCases.createQuotation(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateSalesOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'salesQuotation.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesQuotation.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdateSalesOperationDocumentInput) =>
                    useCases.updateQuotation(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateSalesOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'salesQuotation.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesQuotation.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getQuotationById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'salesQuotation.confirm',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesQuotation.confirm',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.confirmQuotation(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'salesQuotation.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesQuotation.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.cancelQuotation(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'salesQuotation.convertToOrder',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesQuotation.convertToOrder',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ConvertQuotationToOrderInput) =>
                    useCases.convertQuotationToOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ConvertQuotationToOrderInput)),
            ),
        ),
    );
}
