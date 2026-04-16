import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { PurchaseInvoiceAccountingUseCases } from '../application/useCases/PurchaseInvoiceAccountingUseCases';

const CAPABILITY = {
    READ: 'purchase.invoice.read',
    POST: 'purchase.invoice.post',
    UPDATE: 'purchase.invoice.update',
} as const;

export function registerPurchaseInvoiceAccountingIPC(useCases: PurchaseInvoiceAccountingUseCases): void {
    ipcMain.handle(
        'purchaseInvoice.postAccounting',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseInvoice.postAccounting',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['ti.purchase.invoice.post', 'purchase.invoice.post', 'purchases.post', 'DOC.POST'],
                },
                async (ctx, _event, invoiceId: string) =>
                    useCases.postAccounting(ctx.companyId, ctx.branchId, ctx.userId, invoiceId),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseInvoice.reverseAccounting',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseInvoice.reverseAccounting',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['ti.purchase.invoice.post', 'purchase.invoice.post', 'purchases.post', 'DOC.POST'],
                },
                async (
                    ctx,
                    _event,
                    payload: {
                        invoiceId: string;
                        reverseDate: string;
                        reason?: string | null;
                    },
                ) =>
                    useCases.reverseAccounting(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as any)),
            ),
        ),
    );

    ipcMain.handle(
        'purchaseInvoice.getPostingStatus',
        ipcWrap(
            withGuards(
                {
                    eventName: 'purchaseInvoice.getPostingStatus',
                    requiredCapabilities: [CAPABILITY.READ],
                    legacyPermissions: ['purchase.invoice.read', 'purchases.view', 'ti.purchase.invoice.create'],
                },
                async (ctx, _event, invoiceId: string) =>
                    useCases.getPostingStatus(ctx.companyId, ctx.branchId, invoiceId),
            ),
        ),
    );
}
