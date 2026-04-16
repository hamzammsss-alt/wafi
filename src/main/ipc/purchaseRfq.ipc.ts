import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { PurchaseOperationsUseCases } from '../application/useCases/PurchaseOperationsUseCases';
import {
    ConvertRfqToOrderInput,
    CreatePurchaseOperationDocumentInput,
    UpdatePurchaseOperationDocumentInput,
} from '../domain/purchaseOperations/types/PurchaseOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.rfq.read', 'ti.purchase.rfq.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.rfq.write', 'ti.purchase.rfq.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.rfq.post', 'ti.purchase.rfq.post', 'system.settings'],
} as const;

export function registerPurchaseRfqIPC(useCases: PurchaseOperationsUseCases): void {
    ipcMain.handle(
        'purchaseRfq.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRfq.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreatePurchaseOperationDocumentInput) =>
                    useCases.createRfq(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRfq.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRfq.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdatePurchaseOperationDocumentInput) =>
                    useCases.updateRfq(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRfq.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRfq.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getRfqById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRfq.confirm',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRfq.confirm',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.confirmRfq(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRfq.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRfq.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.cancelRfq(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseRfq.convertToOrder',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseRfq.convertToOrder',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ConvertRfqToOrderInput) =>
                    useCases.convertRfqToOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ConvertRfqToOrderInput)),
            ),
        ),
    );
}
