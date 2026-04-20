"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTreasuryDocumentIPC = registerTreasuryDocumentIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['treasury.view', 'ti.treasury.read', 'system.settings'],
    WRITE: ['treasury.create', 'treasury.update', 'ti.treasury.write', 'system.settings'],
    POST: ['treasury.post', 'DOC.POST', 'ti.treasury.post', 'system.settings'],
};
function registerTreasuryDocumentIPC(useCases) {
    electron_1.ipcMain.handle('treasuryDocument.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryDocument.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.create(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('treasuryDocument.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryDocument.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.update(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('treasuryDocument.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryDocument.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('treasuryDocument.post', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryDocument.post',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.post(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('treasuryDocument.reverse', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryDocument.reverse',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.reverse(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('treasuryDocument.getPostingStatus', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryDocument.getPostingStatus',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getPostingStatus(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
}
