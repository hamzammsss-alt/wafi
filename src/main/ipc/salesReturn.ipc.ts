import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { SalesOperationsUseCases } from '../application/useCases/SalesOperationsUseCases';
import {
    CancelSalesReturnInput,
    CreateSalesOperationDocumentInput,
    PostSalesReturnInput,
    UpdateSalesOperationDocumentInput,
} from '../domain/salesOperations/types/SalesOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['sales.view', 'sales.return.read', 'ti.sales.return.read', 'system.settings'],
    WRITE: ['sales.create', 'sales.edit', 'sales.return.write', 'ti.sales.return.write', 'system.settings'],
    POST: ['sales.post', 'DOC.POST', 'sales.return.post', 'ti.sales.return.post', 'system.settings'],
} as const;

export function registerSalesReturnIPC(useCases: SalesOperationsUseCases): void {
    ipcMain.handle(
        'salesReturn.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesReturn.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreateSalesOperationDocumentInput) =>
                    useCases.createSalesReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateSalesOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'salesReturn.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesReturn.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdateSalesOperationDocumentInput) =>
                    useCases.updateSalesReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateSalesOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'salesReturn.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesReturn.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getSalesReturnById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'salesReturn.post',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesReturn.post',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: PostSalesReturnInput | string) => {
                    const command = typeof payload === 'string'
                        ? ({ documentId: payload } satisfies PostSalesReturnInput)
                        : (payload || ({} as PostSalesReturnInput));
                    return useCases.postSalesReturn(ctx.companyId, ctx.branchId, ctx.userId, command);
                },
            ),
        ),
    );

    ipcMain.handle(
        'salesReturn.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesReturn.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CancelSalesReturnInput) =>
                    useCases.cancelSalesReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelSalesReturnInput)),
            ),
        ),
    );

    ipcMain.handle(
        'salesReturn.getPostingStatus',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesReturn.getPostingStatus',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getSalesReturnPostingStatus(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );
}
