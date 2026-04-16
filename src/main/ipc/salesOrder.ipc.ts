import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { SalesOperationsUseCases } from '../application/useCases/SalesOperationsUseCases';
import {
    ConvertOrderToDeliveryInput,
    CreateSalesOperationDocumentInput,
    UpdateSalesOperationDocumentInput,
} from '../domain/salesOperations/types/SalesOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['sales.view', 'sales.order.read', 'ti.sales.order.read', 'system.settings'],
    WRITE: ['sales.create', 'sales.edit', 'sales.order.write', 'ti.sales.order.write', 'system.settings'],
    POST: ['sales.post', 'DOC.POST', 'sales.order.post', 'ti.sales.order.post', 'system.settings'],
} as const;

export function registerSalesOrderIPC(useCases: SalesOperationsUseCases): void {
    ipcMain.handle(
        'salesOrder.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesOrder.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreateSalesOperationDocumentInput) =>
                    useCases.createOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateSalesOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'salesOrder.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesOrder.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdateSalesOperationDocumentInput) =>
                    useCases.updateOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateSalesOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'salesOrder.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesOrder.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getOrderById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'salesOrder.confirm',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesOrder.confirm',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.confirmOrder(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'salesOrder.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesOrder.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.cancelOrder(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'salesOrder.convertToDelivery',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesOrder.convertToDelivery',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ConvertOrderToDeliveryInput) =>
                    useCases.convertOrderToDelivery(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ConvertOrderToDeliveryInput)),
            ),
        ),
    );

    ipcMain.handle(
        'salesOrder.getFulfillmentStatus',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesOrder.getFulfillmentStatus',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, orderId: string) =>
                    useCases.getOrderFulfillmentStatus(ctx.companyId, ctx.branchId, String(orderId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'salesOrder.prepareInvoice',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesOrder.prepareInvoice',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, orderId: string) =>
                    useCases.orderToInvoicePreparation(ctx.companyId, ctx.branchId, String(orderId || '').trim()),
            ),
        ),
    );
}
