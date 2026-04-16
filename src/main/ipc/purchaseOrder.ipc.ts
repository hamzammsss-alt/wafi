import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { PurchaseOperationsUseCases } from '../application/useCases/PurchaseOperationsUseCases';
import {
    ConvertOrderToReceiptInput,
    CreatePurchaseOperationDocumentInput,
    UpdatePurchaseOperationDocumentInput,
} from '../domain/purchaseOperations/types/PurchaseOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.order.read', 'ti.purchase.order.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.order.write', 'ti.purchase.order.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.order.post', 'ti.purchase.order.post', 'system.settings'],
} as const;

export function registerPurchaseOrderIPC(useCases: PurchaseOperationsUseCases): void {
    ipcMain.handle(
        'purchaseOrder.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseOrder.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreatePurchaseOperationDocumentInput) =>
                    useCases.createOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseOrder.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseOrder.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdatePurchaseOperationDocumentInput) =>
                    useCases.updateOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdatePurchaseOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseOrder.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseOrder.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getOrderById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseOrder.confirm',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseOrder.confirm',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.confirmOrder(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseOrder.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseOrder.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.cancelOrder(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseOrder.convertToReceipt',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseOrder.convertToReceipt',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ConvertOrderToReceiptInput) =>
                    useCases.convertOrderToReceipt(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ConvertOrderToReceiptInput)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseOrder.getFulfillmentStatus',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseOrder.getFulfillmentStatus',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, orderId: string) =>
                    useCases.getOrderFulfillmentStatus(ctx.companyId, ctx.branchId, String(orderId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseOrder.prepareInvoice',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseOrder.prepareInvoice',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, orderId: string) =>
                    useCases.orderToInvoicePreparation(ctx.companyId, ctx.branchId, String(orderId || '').trim()),
            ),
        ),
    );
}
