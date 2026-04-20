"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSalesReturnIPC = registerSalesReturnIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['sales.view', 'sales.return.read', 'ti.sales.return.read', 'system.settings'],
    WRITE: ['sales.create', 'sales.edit', 'sales.return.write', 'ti.sales.return.write', 'system.settings'],
    POST: ['sales.post', 'DOC.POST', 'sales.return.post', 'ti.sales.return.post', 'system.settings'],
};
function registerSalesReturnIPC(useCases) {
    electron_1.ipcMain.handle('salesReturn.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesReturn.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createSalesReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesReturn.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesReturn.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updateSalesReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesReturn.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesReturn.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getSalesReturnById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('salesReturn.post', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesReturn.post',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => {
        const command = typeof payload === 'string'
            ? { documentId: payload }
            : (payload || {});
        return useCases.postSalesReturn(ctx.companyId, ctx.branchId, ctx.userId, command);
    })));
    electron_1.ipcMain.handle('salesReturn.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesReturn.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.cancelSalesReturn(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesReturn.getPostingStatus', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesReturn.getPostingStatus',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getSalesReturnPostingStatus(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
}
