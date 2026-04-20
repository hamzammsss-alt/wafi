"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPurchaseRfqIPC = registerPurchaseRfqIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.rfq.read', 'ti.purchase.rfq.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.rfq.write', 'ti.purchase.rfq.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.rfq.post', 'ti.purchase.rfq.post', 'system.settings'],
};
function registerPurchaseRfqIPC(useCases) {
    electron_1.ipcMain.handle('purchaseRfq.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRfq.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createRfq(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseRfq.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRfq.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updateRfq(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseRfq.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRfq.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getRfqById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseRfq.confirm', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRfq.confirm',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.confirmRfq(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseRfq.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRfq.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.cancelRfq(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseRfq.convertToOrder', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRfq.convertToOrder',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.convertRfqToOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
}
