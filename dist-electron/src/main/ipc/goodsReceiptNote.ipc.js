"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGoodsReceiptNoteIPC = registerGoodsReceiptNoteIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['purchase.view', 'purchase.receipt.read', 'ti.purchase.receipt.read', 'system.settings'],
    WRITE: ['purchase.create', 'purchase.edit', 'purchase.receipt.write', 'ti.purchase.receipt.write', 'system.settings'],
    POST: ['purchase.post', 'DOC.POST', 'purchase.receipt.post', 'ti.purchase.receipt.post', 'system.settings'],
};
function registerGoodsReceiptNoteIPC(useCases) {
    electron_1.ipcMain.handle('goodsReceiptNote.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'goodsReceiptNote.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createGoodsReceiptNote(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('goodsReceiptNote.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'goodsReceiptNote.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updateGoodsReceiptNote(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('goodsReceiptNote.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'goodsReceiptNote.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getGoodsReceiptNoteById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('goodsReceiptNote.post', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'goodsReceiptNote.post',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => {
        const command = typeof payload === 'string'
            ? { documentId: payload }
            : (payload || {});
        return useCases.postGoodsReceiptNote(ctx.companyId, ctx.branchId, ctx.userId, command);
    })));
    electron_1.ipcMain.handle('goodsReceiptNote.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'goodsReceiptNote.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.cancelGoodsReceiptNote(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('goodsReceiptNote.prepareInvoice', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'goodsReceiptNote.prepareInvoice',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.receiptToInvoicePreparation(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
}
