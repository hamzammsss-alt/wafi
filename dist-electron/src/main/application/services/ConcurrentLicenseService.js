"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrentLicenseService = void 0;
const uuid_1 = require("uuid");
const errors_1 = require("../../domain/errors");
class ConcurrentLicenseService {
    constructor(repo) {
        this.repo = repo;
    }
    acquireSessionOrThrow(ctx) {
        this.repo.expireStaleSessions(30);
        // Re-auth on the same window should replace the previous lease, not consume an extra seat.
        this.repo.releaseSessionByWebContents(ctx.webContentsId);
        const license = this.repo.getConcurrencyLicense(ctx.companyId);
        const active = this.repo.countActiveSessions(ctx.companyId);
        const allowed = Number(license?.total_seats || 1);
        if (active >= allowed) {
            this.repo.appendAuditEvent({
                id: (0, uuid_1.v4)(),
                companyId: ctx.companyId,
                branchId: ctx.branchId,
                actorUserId: ctx.userId,
                actionKey: 'license.concurrent_user.consume.denied',
                entityName: 'sys_concurrency_license',
                entityId: ctx.companyId,
                payloadJson: JSON.stringify({ active, allowed }),
            });
            throw new errors_1.DomainError('PERMISSION_DENIED', 'Concurrent user limit reached for this company');
        }
        this.repo.upsertActiveSession({
            id: (0, uuid_1.v4)(),
            userId: ctx.userId,
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            webContentsId: ctx.webContentsId,
        });
        this.repo.appendAuditEvent({
            id: (0, uuid_1.v4)(),
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            actorUserId: ctx.userId,
            actionKey: 'license.concurrent_user.consume',
            entityName: 'sys_active_sessions',
            entityId: String(ctx.webContentsId),
            payloadJson: JSON.stringify({ active: active + 1, allowed }),
        });
    }
    heartbeat(webContentsId) {
        this.repo.heartbeat(webContentsId);
    }
    releaseSession(webContentsId, actor) {
        this.repo.releaseSessionByWebContents(webContentsId);
        if (actor?.companyId && actor?.branchId && actor?.userId) {
            this.repo.appendAuditEvent({
                id: (0, uuid_1.v4)(),
                companyId: actor.companyId,
                branchId: actor.branchId,
                actorUserId: actor.userId,
                actionKey: 'license.concurrent_user.release',
                entityName: 'sys_active_sessions',
                entityId: String(webContentsId),
            });
        }
    }
    getStatus(companyId) {
        this.repo.expireStaleSessions(30);
        const license = this.repo.getConcurrencyLicense(companyId);
        const active = this.repo.countActiveSessions(companyId);
        return {
            companyId,
            baseSeats: Number(license?.base_seats || 1),
            extraSeats: Number(license?.extra_seats || 0),
            totalSeats: Number(license?.total_seats || 1),
            activeSessions: active,
            availableSeats: Math.max(0, Number(license?.total_seats || 1) - active),
        };
    }
    setExtraSeats(companyId, extraSeats, actor) {
        const updated = this.repo.updateExtraSeats(companyId, extraSeats);
        this.repo.appendAuditEvent({
            id: (0, uuid_1.v4)(),
            companyId,
            branchId: actor.branchId,
            actorUserId: actor.userId,
            actionKey: 'license.concurrent_user.allocate',
            entityName: 'sys_concurrency_license',
            entityId: companyId,
            payloadJson: JSON.stringify(updated),
        });
        return updated;
    }
}
exports.ConcurrentLicenseService = ConcurrentLicenseService;
