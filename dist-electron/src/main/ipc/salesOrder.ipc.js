"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSalesOrderIPC = registerSalesOrderIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['sales.view', 'sales.order.read', 'ti.sales.order.read', 'system.settings'],
    WRITE: ['sales.create', 'sales.edit', 'sales.order.write', 'ti.sales.order.write', 'system.settings'],
    POST: ['sales.post', 'DOC.POST', 'sales.order.post', 'ti.sales.order.post', 'system.settings'],
};
function registerSalesOrderIPC(useCases) {
    electron_1.ipcMain.handle('salesOrder.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesOrder.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesOrder.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesOrder.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updateOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesOrder.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesOrder.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getOrderById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('salesOrder.confirm', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesOrder.confirm',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.confirmOrder(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('salesOrder.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesOrder.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.cancelOrder(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('salesOrder.convertToDelivery', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesOrder.convertToDelivery',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.convertOrderToDelivery(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesOrder.getFulfillmentStatus', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesOrder.getFulfillmentStatus',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, orderId) => useCases.getOrderFulfillmentStatus(ctx.companyId, ctx.branchId, String(orderId || '').trim()))));
    electron_1.ipcMain.handle('salesOrder.prepareInvoice', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesOrder.prepareInvoice',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, orderId) => useCases.orderToInvoicePreparation(ctx.companyId, ctx.branchId, String(orderId || '').trim()))));
}
