"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSalesQuotationIPC = registerSalesQuotationIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const LEGACY_PERMISSIONS = {
    READ: ['sales.view', 'sales.quotation.read', 'ti.sales.quotation.read', 'system.settings'],
    WRITE: ['sales.create', 'sales.edit', 'sales.quotation.write', 'ti.sales.quotation.write', 'system.settings'],
    POST: ['sales.post', 'DOC.POST', 'sales.quotation.post', 'ti.sales.quotation.post', 'system.settings'],
};
function registerSalesQuotationIPC(useCases) {
    electron_1.ipcMain.handle('salesQuotation.create', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesQuotation.create',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.createQuotation(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesQuotation.update', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesQuotation.update',
        legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.updateQuotation(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
    electron_1.ipcMain.handle('salesQuotation.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesQuotation.getById',
        legacyPermissions: [...LEGACY_PERMISSIONS.READ],
    }, async (ctx, _event, documentId) => useCases.getQuotationById(ctx.companyId, ctx.branchId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('salesQuotation.confirm', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesQuotation.confirm',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.confirmQuotation(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('salesQuotation.cancel', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesQuotation.cancel',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, documentId) => useCases.cancelQuotation(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()))));
    electron_1.ipcMain.handle('salesQuotation.convertToOrder', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'salesQuotation.convertToOrder',
        legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
    }, async (ctx, _event, payload) => useCases.convertQuotationToOrder(ctx.companyId, ctx.branchId, ctx.userId, payload || {}))));
}
