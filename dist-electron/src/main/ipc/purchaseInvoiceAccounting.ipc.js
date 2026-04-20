"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPurchaseInvoiceAccountingIPC = registerPurchaseInvoiceAccountingIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const CAPABILITY = {
    READ: 'purchase.invoice.read',
    POST: 'purchase.invoice.post',
    UPDATE: 'purchase.invoice.update',
};
function registerPurchaseInvoiceAccountingIPC(useCases) {
    electron_1.ipcMain.handle('purchaseInvoice.postAccounting', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseInvoice.postAccounting',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['ti.purchase.invoice.post', 'purchase.invoice.post', 'purchases.post', 'DOC.POST'],
    }, async (ctx, _event, invoiceId) => useCases.postAccounting(ctx.companyId, ctx.branchId, ctx.userId, invoiceId))));
    electron_1.ipcMain.handle('purchaseInvoice.reverseAccounting', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseInvoice.reverseAccounting',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['ti.purchase.invoice.post', 'purchase.invoice.post', 'purchases.post', 'DOC.POST'],
    }, async (ctx, _event, payload) => useCases.reverseAccounting(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseInvoice.getPostingStatus', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseInvoice.getPostingStatus',
        requiredCapabilities: [CAPABILITY.READ],
        legacyPermissions: ['purchase.invoice.read', 'purchases.view', 'ti.purchase.invoice.create'],
    }, async (ctx, _event, invoiceId) => useCases.getPostingStatus(ctx.companyId, ctx.branchId, invoiceId))));
}
