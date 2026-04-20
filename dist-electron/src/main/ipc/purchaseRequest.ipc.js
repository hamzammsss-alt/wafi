"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPurchaseRequestIPC = registerPurchaseRequestIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.request.read', 'ti.purchase.request.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.request.write', 'ti.purchase.request.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.request.post', 'ti.purchase.request.post', 'system.settings'],
};
function registerPurchaseRequestIPC(useCases) {
    electron_1.ipcMain.handle('purchaseRequest.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRequest.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createRequest(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseRequest.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRequest.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updateRequest(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseRequest.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRequest.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getRequestById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseRequest.confirm', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRequest.confirm',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.confirmRequest(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseRequest.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRequest.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.cancelRequest(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('purchaseRequest.convertToRfq', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRequest.convertToRfq',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.convertRequestToRfq(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('purchaseRequest.convertToOrder', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'purchaseRequest.convertToOrder',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.convertRequestToOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
}
