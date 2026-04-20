"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPurchaseReturnIPC = registerPurchaseReturnIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.return.read', 'ti.purchase.return.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.return.write', 'ti.purchase.return.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.return.post', 'ti.purchase.return.post', 'system.settings'],
};
function registerPurchaseReturnIPC(useCases) {
    electron_1.ipcMain.handle('purchaseReturn.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseReturn.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createPurchaseReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseReturn.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseReturn.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updatePurchaseReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseReturn.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseReturn.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getPurchaseReturnById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseReturn.post', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseReturn.post',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => {
        const command = typeof payload === 'string'
            ? { documentId: payload }
            : (payload || {});
        return useCases.postPurchaseReturn(ctx.companyId, ctx.branchId, ctx.userId, command);
    })));
    electron_1.ipcMain.handle('purchaseReturn.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseReturn.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.cancelPurchaseReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseReturn.getPostingStatus', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseReturn.getPostingStatus',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getPurchaseReturnPostingStatus(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
}
