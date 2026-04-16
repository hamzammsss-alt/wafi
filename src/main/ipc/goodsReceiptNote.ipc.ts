import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { PurchaseOperationsUseCases } from '../application/useCases/PurchaseOperationsUseCases';
import {
    CancelGoodsReceiptNoteInput,
    CreatePurchaseOperationDocumentInput,
    PostGoodsReceiptNoteInput,
    UpdatePurchaseOperationDocumentInput,
} from '../domain/purchaseOperations/types/PurchaseOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.receipt.read', 'ti.purchase.receipt.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.receipt.write', 'ti.purchase.receipt.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.receipt.post', 'ti.purchase.receipt.post', 'system.settings'],
} as const;

export function registerGoodsReceiptNoteIPC(useCases: PurchaseOperationsUseCases): void {
    ipcMain.handle(
        'goodsReceiptNote.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'goodsReceiptNote.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreatePurchaseOperationDocumentInput) =>
                    useCases.createGoodsReceiptNote(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'goodsReceiptNote.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'goodsReceiptNote.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdatePurchaseOperationDocumentInput) =>
                    useCases.updateGoodsReceiptNote(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'goodsReceiptNote.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'goodsReceiptNote.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getGoodsReceiptNoteById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'goodsReceiptNote.post',
        ipcWrap(
            withGuards(
                {
                    eventName: 'goodsReceiptNote.post',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: PostGoodsReceiptNoteInput | string) => {
                    const command = typeof payload === 'string'
                        ? ({ documentId: payload } satisfies PostGoodsReceiptNoteInput)
                        : (payload || ({} as PostGoodsReceiptNoteInput));
                    return useCases.postGoodsReceiptNote(ctx.companyId, ctx.branchId, ctx.userId, command);
                },
            ),
        ),
    );

    ipcMain.handle(
        'goodsReceiptNote.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'goodsReceiptNote.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CancelGoodsReceiptNoteInput) =>
                    useCases.cancelGoodsReceiptNote(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelGoodsReceiptNoteInput)),
            ),
        ),
    );

    ipcMain.handle(
        'goodsReceiptNote.prepareInvoice',
        ipcWrap(
            withGuards(
                {
                    eventName: 'goodsReceiptNote.prepareInvoice',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.receiptToInvoicePreparation(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );
}
