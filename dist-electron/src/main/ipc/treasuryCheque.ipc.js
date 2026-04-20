"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTreasuryChequeIPC = registerTreasuryChequeIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    WRITE: ['treasury.update', 'ti.treasury.write', 'system.settings'],
    POST: ['treasury.post', 'DOC.POST', 'ti.treasury.post', 'system.settings'],
};
function registerTreasuryChequeIPC(useCases) {
    electron_1.ipcMain.handle('treasuryCheque.deposit', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryCheque.deposit',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.deposit(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('treasuryCheque.clearReceived', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryCheque.clearReceived',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.clearReceived(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('treasuryCheque.returnReceived', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryCheque.returnReceived',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.returnReceived(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('treasuryCheque.clearIssued', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryCheque.clearIssued',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.clearIssued(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('treasuryCheque.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'treasuryCheque.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.cancel(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
}
