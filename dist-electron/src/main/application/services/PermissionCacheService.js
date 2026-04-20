"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionCacheService = exports.DEFAULT_PERMISSION_CACHE_TTL_MS = void 0;
exports.DEFAULT_PERMISSION_CACHE_TTL_MS = 10 * 60000;
class PermissionCacheService {
    constructor(ttlMs = exports.DEFAULT_PERMISSION_CACHE_TTL_MS) {
        this.entries = new Map();
        this.ttlMs = ttlMs;
    }
    buildKey(identity) {
        return [
            'perm',
            this.normalize(identity.userId, 'anonymous'),
            this.normalize(identity.companyId, 'COMP_01'),
            this.normalize(identity.branchId, 'BR_01'),
            String(Number(identity.companyAclVersion || 1)),
            String(Number(identity.branchAclVersion || 1)),
        ].join(':');
    }
    get(key) {
        const entry = this.entries.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt <= Date.now()) {
            this.entries.delete(key);
            return null;
        }
        return entry.value;
    }
    set(key, value) {
        this.entries.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs,
        });
    }
    getOrBuildSnapshot(identity, build) {
        this.sweepExpired();
        const key = this.buildKey(identity);
        const cached = this.get(key);
        if (cached)
            return cached;
        const snapshot = build();
        this.set(key, snapshot);
        return snapshot;
    }
    invalidateAll() {
        this.entries.clear();
    }
    invalidateByCompany(companyId) {
        const normalizedCompany = this.normalize(companyId, 'COMP_01');
        for (const key of this.entries.keys()) {
            const parsed = this.parseKey(key);
            if (parsed && parsed.companyId === normalizedCompany) {
                this.entries.delete(key);
            }
        }
    }
    invalidateByCompanyBranch(companyId, branchId) {
        const normalizedCompany = this.normalize(companyId, 'COMP_01');
        const normalizedBranch = this.normalize(branchId, 'BR_01');
        for (const key of this.entries.keys()) {
            const parsed = this.parseKey(key);
            if (parsed && parsed.companyId === normalizedCompany && parsed.branchId === normalizedBranch) {
                this.entries.delete(key);
            }
        }
    }
    invalidateByUser(userId) {
        const normalizedUser = this.normalize(userId, 'anonymous');
        for (const key of this.entries.keys()) {
            const parsed = this.parseKey(key);
            if (parsed && parsed.userId === normalizedUser) {
                this.entries.delete(key);
            }
        }
    }
    getTtlMs() {
        return this.ttlMs;
    }
    sweepExpired() {
        const now = Date.now();
        for (const [key, entry] of this.entries.entries()) {
            if (entry.expiresAt <= now) {
                this.entries.delete(key);
            }
        }
    }
    normalize(value, fallback) {
        const raw = String(value || '').trim();
        return raw || fallback;
    }
    parseKey(key) {
        const parts = String(key || '').split(':');
        if (parts.length < 6)
            return null;
        if (parts[0] !== 'perm')
            return null;
        return {
            userId: String(parts[1] || ''),
            companyId: String(parts[2] || ''),
            branchId: String(parts[3] || ''),
        };
    }
}
exports.PermissionCacheService = PermissionCacheService;
