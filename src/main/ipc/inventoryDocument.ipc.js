"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInventoryDocumentIPC = registerInventoryDocumentIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const CAPABILITY = {
    READ: 'inventory.stock_transfer.read',
    CREATE: 'inventory.stock_transfer.create',
    UPDATE: 'inventory.stock_transfer.update',
    POST: 'inventory.stock_transfer.post',
};
function registerInventoryDocumentIPC(useCases) {
    electron_1.ipcMain.handle('inventoryDocument.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'inventoryDocument.create',
        requiredCapabilities: [CAPABILITY.CREATE, CAPABILITY.UPDATE],
        legacyPermissions: ['inventory.create', 'inventory.edit', 'inventory.transfer.create'],
    }, async (ctx, _event, payload) => useCases.create(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('inventoryDocument.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'inventoryDocument.update',
        requiredCapabilities: [CAPABILITY.UPDATE],
        legacyPermissions: ['inventory.edit', 'inventory.transfer.update'],
    }, async (ctx, _event, payload) => useCases.update(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('inventoryDocument.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'inventoryDocument.getById',
        requiredCapabilities: [CAPABILITY.READ],
        legacyPermissions: ['inventory.view', 'inventory.transfer.read'],
    }, async (ctx, _event, documentId) => useCases.getById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('inventoryDocument.post', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'inventoryDocument.post',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['inventory.post', 'DOC.POST', 'inventory.transfer.post'],
    }, async (ctx, _event, documentId) => useCases.post(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('inventoryDocument.reverse', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'inventoryDocument.reverse',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['inventory.post', 'DOC.POST', 'inventory.transfer.post'],
    }, async (ctx, _event, payload) => useCases.reverse(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('inventoryDocument.getPostingStatus', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'inventoryDocument.getPostingStatus',
        requiredCapabilities: [CAPABILITY.READ],
        legacyPermissions: ['inventory.view', 'inventory.transfer.read'],
    }, async (ctx, _event, documentId) => useCases.getPostingStatus(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
}
