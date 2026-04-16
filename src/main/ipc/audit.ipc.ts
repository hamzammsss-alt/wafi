import { ipcMain } from 'electron';
import { AuditService } from '../application/services/AuditService';
import { AuditFieldChangeInput, AuditEventInput } from '../domain/audit/AuditTypes';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';

const AUDIT_VIEW_CAPABILITY = 'core.audit.view';
const AUDIT_ADMIN_CAPABILITY = 'core.security.permissions.manage';

export function registerAuditIPC(service: AuditService) {
    ipcMain.handle(
        'audit.list',
        ipcWrap(
            withGuards(
                {
                    eventName: 'audit.list',
                    requiredCapabilities: [AUDIT_VIEW_CAPABILITY],
                    legacyPermissions: ['audit.view', 'system.logs'],
                },
                async (ctx, _event, payload: any) => {
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
                },
            ),
        ),
    );

    ipcMain.handle(
        'audit.record',
        ipcWrap(
            withGuards(
                {
                    eventName: 'audit.record',
                    requiredCapabilities: [AUDIT_ADMIN_CAPABILITY],
                    legacyPermissions: ['security.permissions.manage', 'system.settings'],
                },
                async (ctx, _event, payload: {
                    event: AuditEventInput;
                    fieldChanges?: AuditFieldChangeInput[];
                }) => {
                    const event = payload?.event || ({} as AuditEventInput);
                    const fieldChanges = Array.isArray(payload?.fieldChanges)
                        ? payload!.fieldChanges!
                        : [];

                    return service.recordEvent(
                        {
                            companyId: ctx.companyId,
                            branchId: ctx.branchId,
                            userId: ctx.userId,
                            sessionId: ctx.sessionId,
                            correlationId: ctx.correlationId,
                            ipcid: ctx.ipcid,
                        },
                        event,
                        fieldChanges,
                    );
                },
            ),
        ),
    );
}
