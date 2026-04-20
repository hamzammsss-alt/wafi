"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPurchaseOrderIPC = registerPurchaseOrderIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.order.read', 'ti.purchase.order.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.order.write', 'ti.purchase.order.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.order.post', 'ti.purchase.order.post', 'system.settings'],
};
function registerPurchaseOrderIPC(useCases) {
    electron_1.ipcMain.handle('purchaseOrder.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseOrder.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseOrder.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseOrder.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updateOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseOrder.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseOrder.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getOrderById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseOrder.confirm', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseOrder.confirm',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.confirmOrder(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseOrder.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseOrder.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.cancelOrder(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseOrder.convertToReceipt', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseOrder.convertToReceipt',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.convertOrderToReceipt(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseOrder.getFulfillmentStatus', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseOrder.getFulfillmentStatus',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, orderId) => useCases.getOrderFulfillmentStatus(ctx.companyId, ctx.branchId, String(orderId || '').trim()))));
    electron_1.ipcMain.handle('purchaseOrder.prepareInvoice', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseOrder.prepareInvoice',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, orderId) => useCases.orderToInvoicePreparation(ctx.companyId, ctx.branchId, String(orderId || '').trim()))));
}
