import Database from 'better-sqlite3';
import { PermissionSnapshotService } from '../application/services/PermissionSnapshotService';

type SessionContext = {
    userId: string;
    companyId: string;
    branchId: string;
};

let db: Database.Database | null = null;
let snapshotService: PermissionSnapshotService | null = null;
const sessions = new Map<number, SessionContext>();

export function configureAuthContext(params: {
    database: Database.Database;
    permissionSnapshotService: PermissionSnapshotService;
}) {
    db = params.database;
    snapshotService = params.permissionSnapshotService;
}

export function bindAuthSession(event: Electron.IpcMainInvokeEvent, user: any) {
    const webContentsId = event?.sender?.id;
    if (!webContentsId) return;
    sessions.set(webContentsId, {
        userId: String(user?.id || user?.userId || '').trim(),
        companyId: String(user?.company_id || user?.companyId || 'COMP_01').trim() || 'COMP_01',
        branchId: String(user?.branch_id || user?.branchId || 'BR_01').trim() || 'BR_01',
    });
}

export function clearAuthSession(event: Electron.IpcMainInvokeEvent) {
    const webContentsId = event?.sender?.id;
    if (!webContentsId) return;
    sessions.delete(webContentsId);
}

export function clearAuthSessionByWebContentsId(webContentsId: number) {
    if (!webContentsId) return;
    sessions.delete(webContentsId);
}

function getFallbackSession(): SessionContext {
    if (!db) {
        return {
            companyId: 'COMP_01',
            branchId: 'BR_01',
            userId: 'USER_123',
        };
    }

    try {
        const row = db.prepare(`
            SELECT id, branch_id
            FROM users
            WHERE is_active = 1
            ORDER BY created_at ASC
            LIMIT 1
        `).get() as any;

        if (row?.id) {
            return {
                companyId: 'COMP_01',
                branchId: String(row.branch_id || 'BR_01'),
                userId: String(row.id),
            };
        }
    } catch (error) {
        console.warn('[AuthContext] Fallback session query failed:', (error as any)?.message || error);
    }

    return {
        companyId: 'COMP_01',
        branchId: 'BR_01',
        userId: 'USER_123',
    };
}

export const getContext = (event: Electron.IpcMainInvokeEvent) => {
    const webContentsId = event?.sender?.id;
    const scoped = webContentsId ? sessions.get(webContentsId) : undefined;
    const session = scoped || getFallbackSession();
    const isAuthenticated = Boolean(scoped?.userId);

    if (!snapshotService) {
        return {
            companyId: session.companyId,
            branchId: session.branchId,
            userId: session.userId,
            isAuthenticated,
            permissions: ['JOURNAL_POST', 'ACCOUNT_CREATE'],
            capabilities: [],
            permissionVersion: 1,
            companyAclVersion: 1,
            branchAclVersion: 1,
            fieldRules: {},
            policyGuards: {},
        };
    }

    const snapshot = snapshotService.getSnapshot(
        session.userId,
        session.companyId,
        session.branchId
    );

    return {
        companyId: snapshot.companyId,
        branchId: snapshot.branchId,
        userId: snapshot.userId,
        isAuthenticated,
        permissions: snapshot.permissions,
        capabilities: snapshot.capabilities,
        permissionVersion: snapshot.version,
        companyAclVersion: snapshot.companyAclVersion,
        branchAclVersion: snapshot.branchAclVersion,
        fieldRules: snapshot.fieldRules,
        policyGuards: snapshot.policyGuards,
    };
};
