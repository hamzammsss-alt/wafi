"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuditIPC = registerAuditIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const AUDIT_VIEW_CAPABILITY = 'core.audit.view';
const AUDIT_ADMIN_CAPABILITY = 'core.security.permissions.manage';
function registerAuditIPC(service) {
    electron_1.ipcMain.handle('audit.list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'audit.list',
        requiredCapabilities: [AUDIT_VIEW_CAPABILITY],
        legacyPermissions: ['audit.view', 'system.logs'],
    }, async (ctx, _event, payload) => {
        const input = payload || {};
        return service.listEvents({
            companyId: ctx.companyId,
            branchId: input?.branchId || ctx.branchId,
            userId: input?.userId,
            entityType: input?.entityType,
            entityId: input?.entityId,
            docType: input?.docType,
            docId: input?.docId,
            eventType: input?.eventType,
            limit: input?.limit,
            cursor: input?.cursor || null,
        });
    })));
    electron_1.ipcMain.handle('audit.record', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'audit.record',
        requiredCapabilities: [AUDIT_ADMIN_CAPABILITY],
        legacyPermissions: ['security.permissions.manage', 'system.settings'],
    }, async (ctx, _event, payload) => {
        const event = payload?.event || {};
        const fieldChanges = Array.isArray(payload?.fieldChanges)
            ? payload.fieldChanges
            : [];
        return service.recordEvent({
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            userId: ctx.userId,
            sessionId: ctx.sessionId,
            correlationId: ctx.correlationId,
            ipcid: ctx.ipcid,
        }, event, fieldChanges);
    })));
}
