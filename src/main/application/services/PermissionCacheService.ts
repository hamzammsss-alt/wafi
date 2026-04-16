import { PermissionSnapshot } from '../../domain/security/SecurityTypes';

type CacheEntry = {
    value: PermissionSnapshot;
    expiresAt: number;
};

export type SnapshotCacheIdentity = {
    userId: string;
    companyId: string;
    branchId: string;
    companyAclVersion: number;
    branchAclVersion: number;
};

export const DEFAULT_PERMISSION_CACHE_TTL_MS = 10 * 60_000;

export class PermissionCacheService {
    private readonly entries = new Map<string, CacheEntry>();
    private readonly ttlMs: number;

    constructor(ttlMs = DEFAULT_PERMISSION_CACHE_TTL_MS) {
        this.ttlMs = ttlMs;
    }

    buildKey(identity: SnapshotCacheIdentity): string {
        return [
            'perm',
            this.normalize(identity.userId, 'anonymous'),
            this.normalize(identity.companyId, 'COMP_01'),
            this.normalize(identity.branchId, 'BR_01'),
            String(Number(identity.companyAclVersion || 1)),
            String(Number(identity.branchAclVersion || 1)),
        ].join(':');
    }

    get(key: string): PermissionSnapshot | null {
        const entry = this.entries.get(key);
        if (!entry) return null;
        if (entry.expiresAt <= Date.now()) {
            this.entries.delete(key);
            return null;
        }
        return entry.value;
    }

    set(key: string, value: PermissionSnapshot): void {
        this.entries.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs,
        });
    }

    getOrBuildSnapshot(
        identity: SnapshotCacheIdentity,
        build: () => PermissionSnapshot
    ): PermissionSnapshot {
        this.sweepExpired();
        const key = this.buildKey(identity);
        const cached = this.get(key);
        if (cached) return cached;
        const snapshot = build();
        this.set(key, snapshot);
        return snapshot;
    }

    invalidateAll(): void {
        this.entries.clear();
    }

    invalidateByCompany(companyId: string): void {
        const normalizedCompany = this.normalize(companyId, 'COMP_01');
        for (const key of this.entries.keys()) {
            const parsed = this.parseKey(key);
            if (parsed && parsed.companyId === normalizedCompany) {
                this.entries.delete(key);
            }
        }
    }

    invalidateByCompanyBranch(companyId: string, branchId: string): void {
        const normalizedCompany = this.normalize(companyId, 'COMP_01');
        const normalizedBranch = this.normalize(branchId, 'BR_01');
        for (const key of this.entries.keys()) {
            const parsed = this.parseKey(key);
            if (parsed && parsed.companyId === normalizedCompany && parsed.branchId === normalizedBranch) {
                this.entries.delete(key);
            }
        }
    }

    invalidateByUser(userId: string): void {
        const normalizedUser = this.normalize(userId, 'anonymous');
        for (const key of this.entries.keys()) {
            const parsed = this.parseKey(key);
            if (parsed && parsed.userId === normalizedUser) {
                this.entries.delete(key);
            }
        }
    }

    getTtlMs(): number {
        return this.ttlMs;
    }

    private sweepExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.entries.entries()) {
            if (entry.expiresAt <= now) {
                this.entries.delete(key);
            }
        }
    }

    private normalize(value: any, fallback: string): string {
        const raw = String(value || '').trim();
        return raw || fallback;
    }

    private parseKey(key: string): { userId: string; companyId: string; branchId: string } | null {
        const parts = String(key || '').split(':');
        if (parts.length < 6) return null;
        if (parts[0] !== 'perm') return null;
        return {
            userId: String(parts[1] || ''),
            companyId: String(parts[2] || ''),
            branchId: String(parts[3] || ''),
        };
    }
}
