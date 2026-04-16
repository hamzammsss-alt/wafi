import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { SalesOperationsUseCases } from '../application/useCases/SalesOperationsUseCases';
import {
    CancelDeliveryNoteInput,
    CreateSalesOperationDocumentInput,
    PostDeliveryNoteInput,
    UpdateSalesOperationDocumentInput,
} from '../domain/salesOperations/types/SalesOperationsTypes';

const LEGACY_PERMISSIONS = {
    READ: ['sales.view', 'sales.delivery.read', 'ti.sales.delivery.read', 'system.settings'],
    WRITE: ['sales.create', 'sales.edit', 'sales.delivery.write', 'ti.sales.delivery.write', 'system.settings'],
    POST: ['sales.post', 'DOC.POST', 'sales.delivery.post', 'ti.sales.delivery.post', 'system.settings'],
} as const;

export function registerDeliveryNoteIPC(useCases: SalesOperationsUseCases): void {
    ipcMain.handle(
        'deliveryNote.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'deliveryNote.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreateSalesOperationDocumentInput) =>
                    useCases.createDeliveryNote(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateSalesOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'deliveryNote.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'deliveryNote.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdateSalesOperationDocumentInput) =>
                    useCases.updateDeliveryNote(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateSalesOperationDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'deliveryNote.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'deliveryNote.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getDeliveryNoteById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'deliveryNote.post',
        ipcWrap(
            withGuards(
                {
                    eventName: 'deliveryNote.post',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: PostDeliveryNoteInput | string) => {
                    const command = typeof payload === 'string'
                        ? ({ documentId: payload } satisfies PostDeliveryNoteInput)
                        : (payload || ({} as PostDeliveryNoteInput));
                    return useCases.postDeliveryNote(ctx.companyId, ctx.branchId, ctx.userId, command);
                },
            ),
        ),
    );

    ipcMain.handle(
        'deliveryNote.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'deliveryNote.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CancelDeliveryNoteInput) =>
                    useCases.cancelDeliveryNote(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelDeliveryNoteInput)),
            ),
        ),
    );

    ipcMain.handle(
        'deliveryNote.prepareInvoice',
        ipcWrap(
            withGuards(
                {
                    eventName: 'deliveryNote.prepareInvoice',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.deliveryToInvoicePreparation(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );
}
