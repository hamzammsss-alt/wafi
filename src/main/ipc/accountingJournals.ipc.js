"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAccountingJournalsIPC = registerAccountingJournalsIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const CAPABILITY = {
    READ: 'accounting.journal_voucher.read',
    POST: 'accounting.journal_voucher.post',
    UPDATE: 'accounting.journal_voucher.update',
};
function registerAccountingJournalsIPC(useCases) {
    electron_1.ipcMain.handle('accounting.journals.post', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.journals.post',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['JOURNAL_POST', 'gl.post', 'DOC.POST', 'ti.gl.journal.post'],
    }, async (ctx, _event, payload) => {
        return useCases.postJournal(ctx.companyId, ctx.branchId, ctx.userId, payload || {});
    })));
    electron_1.ipcMain.handle('accounting.journals.reverse', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.journals.reverse',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['JOURNAL_POST', 'gl.post', 'DOC.POST', 'ti.gl.journal.post'],
    }, async (ctx, _event, payload) => {
        return useCases.reverseJournal(ctx.companyId, ctx.userId, payload || {});
    })));
    electron_1.ipcMain.handle('accounting.journals.getBySource', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.journals.getBySource',
        requiredCapabilities: [CAPABILITY.READ],
        legacyPermissions: ['accounting.journal.read', 'gl.view', 'accounting.view', 'JOURNAL_POST'],
    }, async (ctx, _event, payload) => {
        return useCases.getBySource(ctx.companyId, payload || {});
    })));
    electron_1.ipcMain.handle('accounting.journals.getById', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.journals.getById',
        requiredCapabilities: [CAPABILITY.READ],
        legacyPermissions: ['accounting.journal.read', 'gl.view', 'accounting.view', 'JOURNAL_POST'],
    }, async (ctx, _event, journalId) => {
        return useCases.getById(ctx.companyId, String(journalId || '').trim());
    })));
    electron_1.ipcMain.handle('accounting.journals.previewValidation', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'accounting.journals.previewValidation',
        requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
        legacyPermissions: ['JOURNAL_POST', 'gl.post', 'DOC.POST', 'ti.gl.journal.post'],
    }, async (ctx, _event, payload) => {
        return useCases.previewValidation(ctx.companyId, ctx.branchId, ctx.userId, payload || {});
    })));
}
