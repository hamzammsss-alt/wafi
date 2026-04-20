"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSecurityIPC = registerSecurityIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const SECURITY_ADMIN_CAPABILITY = 'core.security.permissions.manage';
const SECURITY_ADMIN_LEGACY = ['security.permissions.manage', 'system.users', 'system.settings'];
function registerSecurityIPC(service) {
    const getMySnapshot = (ctx) => service.getSnapshot({
        userId: ctx.userId,
        companyId: ctx.companyId,
        branchId: ctx.branchId,
    });
    const refreshMySnapshot = (ctx) => service.refreshSnapshot({
        userId: ctx.userId,
        companyId: ctx.companyId,
        branchId: ctx.branchId,
    });
    electron_1.ipcMain.handle('security:getMyPermissions', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'security.getMyPermissions' }, async (ctx) => {
        const snapshot = getMySnapshot(ctx);
        return snapshot.capabilities;
    })));
    electron_1.ipcMain.handle('security:getMySnapshot', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'security.getMySnapshot' }, async (ctx) => {
        return getMySnapshot(ctx);
    })));
    electron_1.ipcMain.handle('permissions:getSnapshot', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'permissions.getSnapshot' }, async (ctx) => getMySnapshot(ctx))));
    electron_1.ipcMain.handle('permissions.getSnapshot', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'permissions.getSnapshot' }, async (ctx) => getMySnapshot(ctx))));
    electron_1.ipcMain.handle('security:refreshSnapshot', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'security.refreshSnapshot' }, async (ctx) => refreshMySnapshot(ctx))));
    electron_1.ipcMain.handle('permissions:refreshSnapshot', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'permissions.refreshSnapshot' }, async (ctx) => refreshMySnapshot(ctx))));
    electron_1.ipcMain.handle('permissions.refreshSnapshot', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'permissions.refreshSnapshot' }, async (ctx) => refreshMySnapshot(ctx))));
    electron_1.ipcMain.handle('security:getAuthContext', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'security.getAuthContext' }, async (ctx) => ({
        userId: ctx.userId,
        companyId: ctx.companyId,
        branchId: ctx.branchId,
        companyAclVersion: ctx.companyAclVersion || 1,
        branchAclVersion: ctx.branchAclVersion || 1,
    }))));
    electron_1.ipcMain.handle('security:getCapabilityCatalog', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({ eventName: 'security.getCapabilityCatalog' }, async () => {
        return service.getCatalog();
    })));
    electron_1.ipcMain.handle('security:getRoleAssignments', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'security.getRoleAssignments',
        requiredCapabilities: [SECURITY_ADMIN_CAPABILITY],
        legacyPermissions: SECURITY_ADMIN_LEGACY,
    }, async (_ctx, _event, roleId, scope) => {
        return service.getRoleAssignments(roleId, scope);
    })));
    electron_1.ipcMain.handle('security:saveRoleAssignments', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'security.saveRoleAssignments',
        requiredCapabilities: [SECURITY_ADMIN_CAPABILITY],
        legacyPermissions: SECURITY_ADMIN_LEGACY,
        extractExpectedVersions: (args) => {
            const input = args?.[0];
            return input?.expectedVersions || null;
        },
    }, async (ctx, _event, input) => {
        const normalizedInput = {
            ...input,
            companyId: input?.companyId || ctx.companyId,
            branchId: input?.branchId || undefined,
        };
        const version = service.saveRoleAssignments(normalizedInput);
        return { success: true, version };
    })));
    electron_1.ipcMain.handle('security:bumpVersion', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'security.bumpVersion',
        requiredCapabilities: [SECURITY_ADMIN_CAPABILITY],
        legacyPermissions: SECURITY_ADMIN_LEGACY,
    }, async (ctx, _event, payload) => {
        const companyId = payload?.companyId || ctx.companyId || 'COMP_01';
        const branchId = payload?.branchId;
        const versions = service.onLegacyPermissionsChanged(companyId, branchId);
        return { success: true, ...versions };
    })));
}
