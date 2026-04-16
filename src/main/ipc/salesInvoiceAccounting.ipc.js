"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSalesInvoiceAccountingIPC = registerSalesInvoiceAccountingIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const CAPABILITY = {
    READ: 'sales.invoice.read',
    POST: 'sales.invoice.post',
    UPDATE: 'sales.invoice.update',
};
function registerSalesInvoiceAccountingIPC(useCases) {
    electron_1.ipcMain.handle('salesInvoice.postAccounting', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesInvoice.postAccounting',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['ti.sales.invoice.post', 'sales.invoice.post', 'sales.post', 'DOC.POST'],
    }, async (ctx, _event, invoiceId) => useCases.postAccounting(ctx.companyId, ctx.branchId, ctx.userId, invoiceId))));
    electron_1.ipcMain.handle('salesInvoice.reverseAccounting', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesInvoice.reverseAccounting',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['ti.sales.invoice.post', 'sales.invoice.post', 'sales.post', 'DOC.POST'],
    }, async (ctx, _event, payload) => useCases.reverseAccounting(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesInvoice.getPostingStatus', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesInvoice.getPostingStatus',
        requiredCapabilities: [CAPABILITY.READ],
        legacyPermissions: ['sales.invoice.read', 'sales.view', 'ti.sales.invoice.create'],
    }, async (ctx, _event, invoiceId) => useCases.getPostingStatus(ctx.companyId, ctx.branchId, invoiceId))));
}
