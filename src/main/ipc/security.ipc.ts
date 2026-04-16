import { ipcMain } from 'electron';
import { PermissionSnapshotService } from '../application/services/PermissionSnapshotService';
import { ipcWrap } from '../core/ipcWrap';
import { RoleSecurityAssignments } from '../domain/security/SecurityTypes';
import { withGuards } from './withGuards';

const SECURITY_ADMIN_CAPABILITY = 'core.security.permissions.manage';
const SECURITY_ADMIN_LEGACY = ['security.permissions.manage', 'system.users', 'system.settings'];

export function registerSecurityIPC(service: PermissionSnapshotService) {
    const getMySnapshot = (ctx: any) =>
        service.getSnapshot({
            userId: ctx.userId,
            companyId: ctx.companyId,
            branchId: ctx.branchId,
        });

    const refreshMySnapshot = (ctx: any) =>
        service.refreshSnapshot({
            userId: ctx.userId,
            companyId: ctx.companyId,
            branchId: ctx.branchId,
        });

    ipcMain.handle(
        'security:getMyPermissions',
        ipcWrap(
            withGuards(
                { eventName: 'security.getMyPermissions' },
                async (ctx) => {
                    const snapshot = getMySnapshot(ctx);
                    return snapshot.capabilities;
                }
            )
        )
    );

    ipcMain.handle(
        'security:getMySnapshot',
        ipcWrap(
            withGuards(
                { eventName: 'security.getMySnapshot' },
                async (ctx) => {
                    return getMySnapshot(ctx);
                }
            )
        )
    );

    ipcMain.handle(
        'permissions:getSnapshot',
        ipcWrap(
            withGuards(
                { eventName: 'permissions.getSnapshot' },
                async (ctx) => getMySnapshot(ctx)
            )
        )
    );

    ipcMain.handle(
        'permissions.getSnapshot',
        ipcWrap(
            withGuards(
                { eventName: 'permissions.getSnapshot' },
                async (ctx) => getMySnapshot(ctx)
            )
        )
    );

    ipcMain.handle(
        'security:refreshSnapshot',
        ipcWrap(
            withGuards(
                { eventName: 'security.refreshSnapshot' },
                async (ctx) => refreshMySnapshot(ctx)
            )
        )
    );

    ipcMain.handle(
        'permissions:refreshSnapshot',
        ipcWrap(
            withGuards(
                { eventName: 'permissions.refreshSnapshot' },
                async (ctx) => refreshMySnapshot(ctx)
            )
        )
    );

    ipcMain.handle(
        'permissions.refreshSnapshot',
        ipcWrap(
            withGuards(
                { eventName: 'permissions.refreshSnapshot' },
                async (ctx) => refreshMySnapshot(ctx)
            )
        )
    );

    ipcMain.handle(
        'security:getAuthContext',
        ipcWrap(
            withGuards(
                { eventName: 'security.getAuthContext' },
                async (ctx) => ({
                    userId: ctx.userId,
                    companyId: ctx.companyId,
                    branchId: ctx.branchId,
                    companyAclVersion: ctx.companyAclVersion || 1,
                    branchAclVersion: ctx.branchAclVersion || 1,
                })
            )
        )
    );

    ipcMain.handle(
        'security:getCapabilityCatalog',
        ipcWrap(
            withGuards(
                { eventName: 'security.getCapabilityCatalog' },
                async () => {
                    return service.getCatalog();
                }
            )
        )
    );

    ipcMain.handle(
        'security:getRoleAssignments',
        ipcWrap(
            withGuards(
                {
                    eventName: 'security.getRoleAssignments',
                    requiredCapabilities: [SECURITY_ADMIN_CAPABILITY],
                    legacyPermissions: SECURITY_ADMIN_LEGACY,
                },
                async (_ctx, _event, roleId: string, scope?: { companyId?: string; branchId?: string }) => {
                    return service.getRoleAssignments(roleId, scope);
                }
            )
        )
    );

    ipcMain.handle(
        'security:saveRoleAssignments',
        ipcWrap(
            withGuards(
                {
                    eventName: 'security.saveRoleAssignments',
                    requiredCapabilities: [SECURITY_ADMIN_CAPABILITY],
                    legacyPermissions: SECURITY_ADMIN_LEGACY,
                    extractExpectedVersions: (args) => {
                        const input = args?.[0] as any;
                        return input?.expectedVersions || null;
                    },
                },
                async (ctx, _event, input: RoleSecurityAssignments) => {
                    const normalizedInput: RoleSecurityAssignments = {
                        ...input,
                        companyId: input?.companyId || ctx.companyId,
                        branchId: input?.branchId || undefined,
                    };
                    const version = service.saveRoleAssignments(normalizedInput);
                    return { success: true, version };
                }
            )
        )
    );

    ipcMain.handle(
        'security:bumpVersion',
        ipcWrap(
            withGuards(
                {
                    eventName: 'security.bumpVersion',
                    requiredCapabilities: [SECURITY_ADMIN_CAPABILITY],
                    legacyPermissions: SECURITY_ADMIN_LEGACY,
                },
                async (ctx, _event, payload?: { companyId?: string; branchId?: string }) => {
                    const companyId = payload?.companyId || ctx.companyId || 'COMP_01';
                    const branchId = payload?.branchId;
                    const versions = service.onLegacyPermissionsChanged(companyId, branchId);
                    return { success: true, ...versions };
                }
            )
        )
    );
}
