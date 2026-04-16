"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeliveryNoteIPC = registerDeliveryNoteIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['sales.view', 'sales.delivery.read', 'ti.sales.delivery.read', 'system.settings'],
    WRITE: ['sales.create', 'sales.edit', 'sales.delivery.write', 'ti.sales.delivery.write', 'system.settings'],
    POST: ['sales.post', 'DOC.POST', 'sales.delivery.post', 'ti.sales.delivery.post', 'system.settings'],
};
function registerDeliveryNoteIPC(useCases) {
    electron_1.ipcMain.handle('deliveryNote.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'deliveryNote.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createDeliveryNote(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('deliveryNote.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'deliveryNote.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updateDeliveryNote(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('deliveryNote.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'deliveryNote.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getDeliveryNoteById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('deliveryNote.post', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'deliveryNote.post',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => {
        const command = typeof payload === 'string'
            ? { documentId: payload }
            : (payload || {});
        return useCases.postDeliveryNote(ctx.companyId, ctx.branchId, ctx.userId, command);
    })));
    electron_1.ipcMain.handle('deliveryNote.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'deliveryNote.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.cancelDeliveryNote(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('deliveryNote.prepareInvoice', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'deliveryNote.prepareInvoice',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.deliveryToInvoicePreparation(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
}
