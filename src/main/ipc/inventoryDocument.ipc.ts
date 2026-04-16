import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { InventoryDocumentUseCases } from '../application/useCases/InventoryDocumentUseCases';
import {
    CreateInventoryDocumentInput,
    ReverseInventoryDocumentCommand,
    UpdateInventoryDocumentInput,
} from '../domain/inventoryDocuments/types/InventoryDocumentTypes';

const CAPABILITY = {
    READ: 'inventory.stock_transfer.read',
    CREATE: 'inventory.stock_transfer.create',
    UPDATE: 'inventory.stock_transfer.update',
    POST: 'inventory.stock_transfer.post',
} as const;

export function registerInventoryDocumentIPC(useCases: InventoryDocumentUseCases): void {
    ipcMain.handle(
        'inventoryDocument.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'inventoryDocument.create',
                    requiredCapabilities: [CAPABILITY.CREATE, CAPABILITY.UPDATE],
                    legacyPermissions: ['inventory.create', 'inventory.edit', 'inventory.transfer.create'],
                },
                async (ctx, _event, payload: CreateInventoryDocumentInput) =>
                    useCases.create(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateInventoryDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'inventoryDocument.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'inventoryDocument.update',
                    requiredCapabilities: [CAPABILITY.UPDATE],
                    legacyPermissions: ['inventory.edit', 'inventory.transfer.update'],
                },
                async (ctx, _event, payload: UpdateInventoryDocumentInput) =>
                    useCases.update(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateInventoryDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'inventoryDocument.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'inventoryDocument.getById',
                    requiredCapabilities: [CAPABILITY.READ],
                    legacyPermissions: ['inventory.view', 'inventory.transfer.read'],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'inventoryDocument.post',
        ipcWrap(
            withGuards(
                {
                    eventName: 'inventoryDocument.post',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['inventory.post', 'DOC.POST', 'inventory.transfer.post'],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.post(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'inventoryDocument.reverse',
        ipcWrap(
            withGuards(
                {
                    eventName: 'inventoryDocument.reverse',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['inventory.post', 'DOC.POST', 'inventory.transfer.post'],
                },
                async (ctx, _event, payload: ReverseInventoryDocumentCommand) =>
                    useCases.reverse(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ReverseInventoryDocumentCommand)),
            ),
        ),
    );

    ipcMain.handle(
        'inventoryDocument.getPostingStatus',
        ipcWrap(
            withGuards(
                {
                    eventName: 'inventoryDocument.getPostingStatus',
                    requiredCapabilities: [CAPABILITY.READ],
                    legacyPermissions: ['inventory.view', 'inventory.transfer.read'],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getPostingStatus(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );
}
