import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { PurchaseOperationsUseCases } from '../application/useCases/PurchaseOperationsUseCases';
import {
    ConvertRequestToOrderInput,
    ConvertRequestToRfqInput,
    CreatePurchaseOperationDocumentInput,
    UpdatePurchaseOperationDocumentInput,
} from '../domain/purchaseOperations/types/PurchaseOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.request.read', 'ti.purchase.request.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.request.write', 'ti.purchase.request.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.request.post', 'ti.purchase.request.post', 'system.settings'],
} as const;

export function registerPurchaseRequestIPC(useCases: PurchaseOperationsUseCases): void {
    ipcMain.handle(
        'purchaseRequest.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRequest.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreatePurchaseOperationDocumentInput) =>
                    useCases.createRequest(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRequest.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRequest.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdatePurchaseOperationDocumentInput) =>
                    useCases.updateRequest(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRequest.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRequest.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getRequestById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRequest.confirm',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRequest.confirm',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.confirmRequest(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRequest.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRequest.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.cancelRequest(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRequest.convertToRfq',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRequest.convertToRfq',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ConvertRequestToRfqInput) =>
                    useCases.convertRequestToRfq(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ConvertRequestToRfqInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRequest.convertToOrder',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRequest.convertToOrder',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ConvertRequestToOrderInput) =>
                    useCases.convertRequestToOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ConvertRequestToOrderInput)),
            ),
        ),
    );
}
