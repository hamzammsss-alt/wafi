import { PermissionSnapshot, RoleSecurityAssignments } from '../../domain/security/SecurityTypes';
import { SqlitePermissionEngineRepo } from '../../infrastructure/adapters/SqlitePermissionEngineRepo';
import { DEFAULT_PERMISSION_CACHE_TTL_MS, PermissionCacheService } from './PermissionCacheService';

type SnapshotInput = {
    userId: string;
    companyId?: string;
    branchId?: string;
};

export class PermissionSnapshotService {
    private readonly repo: SqlitePermissionEngineRepo;
    private readonly cache: PermissionCacheService;

    constructor(repo: SqlitePermissionEngineRepo, cache?: PermissionCacheService) {
        this.repo = repo;
        this.cache = cache || new PermissionCacheService(DEFAULT_PERMISSION_CACHE_TTL_MS);
    }

    getSnapshot(input: SnapshotInput): PermissionSnapshot;
    getSnapshot(userId: string, companyId?: string, branchId?: string): PermissionSnapshot;
    getSnapshot(
        userOrInput: string | SnapshotInput,
        companyId = 'COMP_01',
        branchId = 'BR_01'
    ): PermissionSnapshot {
        const raw =
            typeof userOrInput === 'string'
                ? { userId: userOrInput, companyId, branchId }
                : userOrInput;

        const normalizedCompanyId = this.normalize(raw.companyId, 'COMP_01');
        const normalizedBranchId = this.normalize(raw.branchId, 'BR_01');
        const baseUserId = this.normalize(raw.userId, '');

        const versions = this.repo.getAclVersions(normalizedCompanyId, normalizedBranchId);
        return this.cache.getOrBuildSnapshot(
            {
                userId: baseUserId || 'anonymous',
                companyId: normalizedCompanyId,
                branchId: normalizedBranchId,
                companyAclVersion: versions.companyAclVersion,
                branchAclVersion: versions.branchAclVersion,
            },
            () => this.buildSnapshot({
                userId: baseUserId,
                companyId: normalizedCompanyId,
                branchId: normalizedBranchId,
                companyAclVersion: versions.companyAclVersion,
                branchAclVersion: versions.branchAclVersion,
            })
        );
    }

    refreshSnapshot(input: SnapshotInput): PermissionSnapshot {
        const normalizedCompanyId = this.normalize(input.companyId, 'COMP_01');
        const normalizedBranchId = this.normalize(input.branchId, 'BR_01');
        const normalizedUserId = this.normalize(input.userId, '');
        this.cache.invalidateByUser(normalizedUserId || 'anonymous');
        return this.getSnapshot({
            userId: normalizedUserId,
            companyId: normalizedCompanyId,
            branchId: normalizedBranchId,
        });
    }

    getCatalog() {
        return this.repo.getCatalog();
    }

    getRoleAssignments(roleId: string, scope?: { companyId?: string; branchId?: string }) {
        return this.repo.getRoleAssignments(roleId, scope);
    }

    saveRoleAssignments(input: RoleSecurityAssignments): number {
        const companyId = input.companyId || 'COMP_01';
        const branchId = input.branchId || '';
        const newVersion = this.repo.saveRoleAssignments(input);
        if (branchId) {
            this.cache.invalidateByCompanyBranch(companyId, branchId);
        } else {
            this.cache.invalidateByCompany(companyId);
        }
        return newVersion;
    }

    onLegacyPermissionsChanged(companyId = 'COMP_01', branchId?: string): { companyAclVersion: number; branchAclVersion: number } {
        if (branchId) {
            this.repo.bumpBranchAclVersion(companyId, branchId);
            this.cache.invalidateByCompanyBranch(companyId, branchId);
        } else {
            this.repo.bumpCompanyAclVersion(companyId);
            this.cache.invalidateByCompany(companyId);
        }
        return this.repo.getAclVersions(companyId, branchId || 'BR_01');
    }

    getVersion(companyId = 'COMP_01'): number {
        return this.repo.getAclVersions(companyId).companyAclVersion;
    }

    getAclVersions(companyId = 'COMP_01', branchId = 'BR_01'): { companyAclVersion: number; branchAclVersion: number } {
        return this.repo.getAclVersions(companyId, branchId);
    }

    invalidateAll() {
        this.cache.invalidateAll();
    }

    invalidateUser(userId: string) {
        this.cache.invalidateByUser(userId);
    }

    private buildSnapshot(input: {
        userId: string;
        companyId: string;
        branchId: string;
        companyAclVersion: number;
        branchAclVersion: number;
    }): PermissionSnapshot {
        const user = this.repo.getUserById(input.userId) || this.repo.getFallbackUser();
        const effectiveUserId = this.normalize(user?.id, input.userId || 'anonymous');
        const effectiveCompanyId = this.normalize(input.companyId, 'COMP_01');
        const effectiveBranchId = this.normalize(input.branchId, this.normalize(user?.branch_id, 'BR_01'));

        const assignmentRoleIds = this.repo.getUserAssignedRoleIds({
            userId: effectiveUserId,
            companyId: effectiveCompanyId,
            branchId: effectiveBranchId,
        });

        const fallbackRoleId = this.normalize(user?.role_id, '');
        const allRoleIds = Array.from(new Set([
            ...assignmentRoleIds,
            ...(fallbackRoleId ? [fallbackRoleId] : []),
        ]));

        const scopedCapabilities = this.repo.getScopedRoleCapabilitiesByRoleIds(
            allRoleIds,
            effectiveCompanyId,
            effectiveBranchId
        );
        const scopedBundles = this.repo.getScopedRoleBundlesByRoleIds(
            allRoleIds,
            effectiveCompanyId,
            effectiveBranchId
        );

        const roleCapabilities = this.repo.getRoleCapabilitiesByRoleIds(allRoleIds);
        const bundleCapabilities = this.repo.expandBundleCapabilities(scopedBundles);
        const rolePermissions = this.repo.getRolePermissionsByRoleIds(allRoleIds);
        const inferredCapabilities = this.repo.capabilitiesFromPermissions(rolePermissions);

        const capabilitySet = new Set<string>([
            ...roleCapabilities,
            ...rolePermissions,
            ...scopedCapabilities,
            ...bundleCapabilities,
            ...inferredCapabilities,
        ]);

        if (capabilitySet.has('ALL') || capabilitySet.has('*.*')) {
            for (const capability of this.repo.getAllCapabilityKeys()) {
                capabilitySet.add(capability);
            }
            capabilitySet.delete('ALL');
            capabilitySet.delete('*.*');
        }

        const capabilityList = Array.from(capabilitySet).sort();
        const criteriaRules = this.repo.getCriteriaRulesByCapabilities({
            companyId: effectiveCompanyId,
            branchId: effectiveBranchId,
            capabilityKeys: capabilityList,
        });

        const snapshot: PermissionSnapshot = {
            userId: effectiveUserId,
            companyId: effectiveCompanyId,
            branchId: effectiveBranchId,
            version: input.companyAclVersion * 1_000_000 + input.branchAclVersion,
            companyAclVersion: input.companyAclVersion,
            branchAclVersion: input.branchAclVersion,
            generatedAt: new Date().toISOString(),
            permissions: capabilityList,
            capabilities: capabilityList,
            criteriaRules,
            fieldRules: this.repo.getFieldRules(capabilityList),
            policyGuards: this.repo.getPolicyGuards(capabilityList),
        };

        return snapshot;
    }

    private normalize(value: any, fallback: string): string {
        const raw = String(value || '').trim();
        return raw || fallback;
    }
}
