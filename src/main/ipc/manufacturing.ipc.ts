import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { ManufacturingUseCases } from '../application/useCases/ManufacturingUseCases';
import {
    CancelProductionIssueInput,
    CancelProductionReceiptInput,
    CreateBomInput,
    CreateProductionIssueInput,
    CreateProductionOrderFromBomInput,
    CreateProductionOrderInput,
    CreateProductionReceiptInput,
    CreateRoutingInput,
    UpdateBomInput,
    UpdateProductionOrderInput,
    UpdateRoutingInput,
} from '../domain/manufacturing/types/ManufacturingTypes';

const LEGACY_PERMISSIONS = {
    READ: ['manufacturing.view', 'production.manage', 'system.settings'],
    WRITE: ['manufacturing.create', 'manufacturing.edit', 'production.manage', 'system.settings'],
    POST: ['manufacturing.post', 'DOC.POST', 'production.manage', 'system.settings'],
} as const;

export function registerManufacturingIPC(useCases: ManufacturingUseCases): void {
    ipcMain.handle(
        'bom.create',
        ipcWrap(
            withGuards(
                { eventName: 'bom.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateBomInput) =>
                    useCases.bomCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateBomInput)),
            ),
        ),
    );

    ipcMain.handle(
        'bom.update',
        ipcWrap(
            withGuards(
                { eventName: 'bom.update', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: UpdateBomInput) =>
                    useCases.bomUpdate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateBomInput)),
            ),
        ),
    );

    ipcMain.handle(
        'bom.getById',
        ipcWrap(
            withGuards(
                { eventName: 'bom.getById', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, bomId: string) => useCases.bomGetById(ctx.companyId, String(bomId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'bom.getDefaultForItem',
        ipcWrap(
            withGuards(
                { eventName: 'bom.getDefaultForItem', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, itemId: string, asOfDate?: string | null) =>
                    useCases.bomGetDefaultForItem(ctx.companyId, String(itemId || '').trim(), asOfDate || null),
            ),
        ),
    );

    ipcMain.handle(
        'bom.setDefault',
        ipcWrap(
            withGuards(
                { eventName: 'bom.setDefault', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, bomId: string) =>
                    useCases.bomSetDefault(ctx.companyId, ctx.branchId, ctx.userId, String(bomId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'bom.confirm',
        ipcWrap(
            withGuards(
                { eventName: 'bom.confirm', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, bomId: string) =>
                    useCases.bomConfirm(ctx.companyId, ctx.branchId, ctx.userId, String(bomId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'bom.cancel',
        ipcWrap(
            withGuards(
                { eventName: 'bom.cancel', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, bomId: string) =>
                    useCases.bomCancel(ctx.companyId, ctx.branchId, ctx.userId, String(bomId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'routing.create',
        ipcWrap(
            withGuards(
                { eventName: 'routing.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateRoutingInput) =>
                    useCases.routingCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateRoutingInput)),
            ),
        ),
    );

    ipcMain.handle(
        'routing.update',
        ipcWrap(
            withGuards(
                { eventName: 'routing.update', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: UpdateRoutingInput) =>
                    useCases.routingUpdate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateRoutingInput)),
            ),
        ),
    );

    ipcMain.handle(
        'routing.getById',
        ipcWrap(
            withGuards(
                { eventName: 'routing.getById', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, routingId: string) =>
                    useCases.routingGetById(ctx.companyId, String(routingId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'routing.getDefaultForItem',
        ipcWrap(
            withGuards(
                { eventName: 'routing.getDefaultForItem', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, itemId: string) => useCases.routingGetDefaultForItem(ctx.companyId, String(itemId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'routing.setDefault',
        ipcWrap(
            withGuards(
                { eventName: 'routing.setDefault', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, routingId: string) =>
                    useCases.routingSetDefault(ctx.companyId, ctx.branchId, ctx.userId, String(routingId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'routing.confirm',
        ipcWrap(
            withGuards(
                { eventName: 'routing.confirm', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, routingId: string) =>
                    useCases.routingConfirm(ctx.companyId, ctx.branchId, ctx.userId, String(routingId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'routing.cancel',
        ipcWrap(
            withGuards(
                { eventName: 'routing.cancel', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, routingId: string) =>
                    useCases.routingCancel(ctx.companyId, ctx.branchId, ctx.userId, String(routingId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'productionOrder.create',
        ipcWrap(
            withGuards(
                { eventName: 'productionOrder.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateProductionOrderInput) =>
                    useCases.productionOrderCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateProductionOrderInput)),
            ),
        ),
    );

    ipcMain.handle(
        'productionOrder.createFromBom',
        ipcWrap(
            withGuards(
                { eventName: 'productionOrder.createFromBom', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateProductionOrderFromBomInput) =>
                    useCases.productionOrderCreateFromBom(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateProductionOrderFromBomInput)),
            ),
        ),
    );

    ipcMain.handle(
        'productionOrder.update',
        ipcWrap(
            withGuards(
                { eventName: 'productionOrder.update', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: UpdateProductionOrderInput) =>
                    useCases.productionOrderUpdate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateProductionOrderInput)),
            ),
        ),
    );

    ipcMain.handle(
        'productionOrder.getById',
        ipcWrap(
            withGuards(
                { eventName: 'productionOrder.getById', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, orderId: string) =>
                    useCases.productionOrderGetById(ctx.companyId, ctx.branchId, String(orderId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'productionOrder.release',
        ipcWrap(
            withGuards(
                { eventName: 'productionOrder.release', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, orderId: string) =>
                    useCases.productionOrderRelease(ctx.companyId, ctx.branchId, ctx.userId, String(orderId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'productionOrder.cancel',
        ipcWrap(
            withGuards(
                { eventName: 'productionOrder.cancel', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, orderId: string) =>
                    useCases.productionOrderCancel(ctx.companyId, ctx.branchId, ctx.userId, String(orderId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'productionOrder.getStatusSummary',
        ipcWrap(
            withGuards(
                { eventName: 'productionOrder.getStatusSummary', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, orderId: string) =>
                    useCases.productionOrderGetStatusSummary(ctx.companyId, ctx.branchId, String(orderId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'productionOrder.getCostSummary',
        ipcWrap(
            withGuards(
                { eventName: 'productionOrder.getCostSummary', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, orderId: string) =>
                    useCases.productionOrderGetCostSummary(ctx.companyId, ctx.branchId, String(orderId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'productionIssue.create',
        ipcWrap(
            withGuards(
                { eventName: 'productionIssue.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateProductionIssueInput) =>
                    useCases.productionIssueCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateProductionIssueInput)),
            ),
        ),
    );

    ipcMain.handle(
        'productionIssue.getById',
        ipcWrap(
            withGuards(
                { eventName: 'productionIssue.getById', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, issueId: string) =>
                    useCases.productionIssueGetById(ctx.companyId, ctx.branchId, String(issueId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'productionIssue.post',
        ipcWrap(
            withGuards(
                { eventName: 'productionIssue.post', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: { issueId: string; allowOverIssue?: boolean | null }) =>
                    useCases.productionIssuePost(ctx.companyId, ctx.branchId, ctx.userId, payload || { issueId: '' }),
            ),
        ),
    );

    ipcMain.handle(
        'productionIssue.cancel',
        ipcWrap(
            withGuards(
                { eventName: 'productionIssue.cancel', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CancelProductionIssueInput) =>
                    useCases.productionIssueCancel(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelProductionIssueInput)),
            ),
        ),
    );

    ipcMain.handle(
        'productionReceipt.create',
        ipcWrap(
            withGuards(
                { eventName: 'productionReceipt.create', legacyPermissions: [...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CreateProductionReceiptInput) =>
                    useCases.productionReceiptCreate(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateProductionReceiptInput)),
            ),
        ),
    );

    ipcMain.handle(
        'productionReceipt.getById',
        ipcWrap(
            withGuards(
                { eventName: 'productionReceipt.getById', legacyPermissions: [...LEGACY_PERMISSIONS.READ] },
                async (ctx, _event, receiptId: string) =>
                    useCases.productionReceiptGetById(ctx.companyId, ctx.branchId, String(receiptId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'productionReceipt.post',
        ipcWrap(
            withGuards(
                { eventName: 'productionReceipt.post', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: { receiptId: string; allowOverReceipt?: boolean | null }) =>
                    useCases.productionReceiptPost(ctx.companyId, ctx.branchId, ctx.userId, payload || { receiptId: '' }),
            ),
        ),
    );

    ipcMain.handle(
        'productionReceipt.cancel',
        ipcWrap(
            withGuards(
                { eventName: 'productionReceipt.cancel', legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE] },
                async (ctx, _event, payload: CancelProductionReceiptInput) =>
                    useCases.productionReceiptCancel(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelProductionReceiptInput)),
            ),
        ),
    );
}
