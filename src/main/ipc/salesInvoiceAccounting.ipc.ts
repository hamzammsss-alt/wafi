import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { SalesInvoiceAccountingUseCases } from '../application/useCases/SalesInvoiceAccountingUseCases';

const CAPABILITY = {
    READ: 'sales.invoice.read',
    POST: 'sales.invoice.post',
    UPDATE: 'sales.invoice.update',
} as const;

export function registerSalesInvoiceAccountingIPC(useCases: SalesInvoiceAccountingUseCases): void {
    ipcMain.handle(
        'salesInvoice.postAccounting',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesInvoice.postAccounting',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['ti.sales.invoice.post', 'sales.invoice.post', 'sales.post', 'DOC.POST'],
                },
                async (ctx, _event, invoiceId: string) =>
                    useCases.postAccounting(ctx.companyId, ctx.branchId, ctx.userId, invoiceId),
            ),
        ),
    );

    ipcMain.handle(
        'salesInvoice.reverseAccounting',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesInvoice.reverseAccounting',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['ti.sales.invoice.post', 'sales.invoice.post', 'sales.post', 'DOC.POST'],
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
        'salesInvoice.getPostingStatus',
        ipcWrap(
            withGuards(
                {
                    eventName: 'salesInvoice.getPostingStatus',
                    requiredCapabilities: [CAPABILITY.READ],
                    legacyPermissions: ['sales.invoice.read', 'sales.view', 'ti.sales.invoice.create'],
                },
                async (ctx, _event, invoiceId: string) =>
                    useCases.getPostingStatus(ctx.companyId, ctx.branchId, invoiceId),
            ),
        ),
    );
}
