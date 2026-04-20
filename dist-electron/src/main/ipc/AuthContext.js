"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContext = void 0;
exports.configureAuthContext = configureAuthContext;
exports.bindAuthSession = bindAuthSession;
exports.clearAuthSession = clearAuthSession;
exports.clearAuthSessionByWebContentsId = clearAuthSessionByWebContentsId;
let db = null;
let snapshotService = null;
const sessions = new Map();
function configureAuthContext(params) {
    db = params.database;
    snapshotService = params.permissionSnapshotService;
}
function bindAuthSession(event, user) {
    const webContentsId = event?.sender?.id;
    if (!webContentsId)
        return;
    sessions.set(webContentsId, {
        userId: String(user?.id || user?.userId || '').trim(),
        companyId: String(user?.company_id || user?.companyId || 'COMP_01').trim() || 'COMP_01',
        branchId: String(user?.branch_id || user?.branchId || 'BR_01').trim() || 'BR_01',
    });
}
function clearAuthSession(event) {
    const webContentsId = event?.sender?.id;
    if (!webContentsId)
        return;
    sessions.delete(webContentsId);
}
function clearAuthSessionByWebContentsId(webContentsId) {
    if (!webContentsId)
        return;
    sessions.delete(webContentsId);
}
function getFallbackSession() {
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
        `).get();
        if (row?.id) {
            return {
                companyId: 'COMP_01',
                branchId: String(row.branch_id || 'BR_01'),
                userId: String(row.id),
            };
        }
    }
    catch (error) {
        console.warn('[AuthContext] Fallback session query failed:', error?.message || error);
    }
    return {
        companyId: 'COMP_01',
        branchId: 'BR_01',
        userId: 'USER_123',
    };
}
const getContext = (event) => {
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
    const snapshot = snapshotService.getSnapshot(session.userId, session.companyId, session.branchId);
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
exports.getContext = getContext;
