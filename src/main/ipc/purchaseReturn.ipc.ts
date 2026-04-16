import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { PurchaseOperationsUseCases } from '../application/useCases/PurchaseOperationsUseCases';
import {
    CancelPurchaseReturnInput,
    CreatePurchaseOperationDocumentInput,
    PostPurchaseReturnInput,
    UpdatePurchaseOperationDocumentInput,
} from '../domain/purchaseOperations/types/PurchaseOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.return.read', 'ti.purchase.return.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.return.write', 'ti.purchase.return.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.return.post', 'ti.purchase.return.post', 'system.settings'],
} as const;

export function registerPurchaseReturnIPC(useCases: PurchaseOperationsUseCases): void {
    ipcMain.handle(
        'purchaseReturn.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseReturn.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreatePurchaseOperationDocumentInput) =>
                    useCases.createPurchaseReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseReturn.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseReturn.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdatePurchaseOperationDocumentInput) =>
                    useCases.updatePurchaseReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseReturn.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseReturn.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getPurchaseReturnById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseReturn.post',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseReturn.post',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: PostPurchaseReturnInput | string) => {
                    const command = typeof payload === 'string'
                        ? ({ documentId: payload } satisfies PostPurchaseReturnInput)
                        : (payload || ({} as PostPurchaseReturnInput));
                    return useCases.postPurchaseReturn(ctx.companyId, ctx.branchId, ctx.userId, command);
                },
            ),
        ),
    );

    ipcMain.handle(
        'purchaseReturn.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseReturn.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CancelPurchaseReturnInput) =>
                    useCases.cancelPurchaseReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelPurchaseReturnInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseReturn.getPostingStatus',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseReturn.getPostingStatus',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getPurchaseReturnPostingStatus(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );
}
