"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionSnapshotService = void 0;
const PermissionCacheService_1 = require("./PermissionCacheService");
class PermissionSnapshotService {
    constructor(repo, cache) {
        this.repo = repo;
        this.cache = cache || new PermissionCacheService_1.PermissionCacheService(PermissionCacheService_1.DEFAULT_PERMISSION_CACHE_TTL_MS);
    }
    getSnapshot(userOrInput, companyId = 'COMP_01', branchId = 'BR_01') {
        const raw = typeof userOrInput === 'string'
            ? { userId: userOrInput, companyId, branchId }
            : userOrInput;
        const normalizedCompanyId = this.normalize(raw.companyId, 'COMP_01');
        const normalizedBranchId = this.normalize(raw.branchId, 'BR_01');
        const baseUserId = this.normalize(raw.userId, '');
        const versions = this.repo.getAclVersions(normalizedCompanyId, normalizedBranchId);
        return this.cache.getOrBuildSnapshot({
            userId: baseUserId || 'anonymous',
            companyId: normalizedCompanyId,
            branchId: normalizedBranchId,
            companyAclVersion: versions.companyAclVersion,
            branchAclVersion: versions.branchAclVersion,
        }, () => this.buildSnapshot({
            userId: baseUserId,
            companyId: normalizedCompanyId,
            branchId: normalizedBranchId,
            companyAclVersion: versions.companyAclVersion,
            branchAclVersion: versions.branchAclVersion,
        }));
    }
    refreshSnapshot(input) {
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
    getRoleAssignments(roleId, scope) {
        return this.repo.getRoleAssignments(roleId, scope);
    }
    saveRoleAssignments(input) {
        const companyId = input.companyId || 'COMP_01';
        const branchId = input.branchId || '';
        const newVersion = this.repo.saveRoleAssignments(input);
        if (branchId) {
            this.cache.invalidateByCompanyBranch(companyId, branchId);
        }
        else {
            this.cache.invalidateByCompany(companyId);
        }
        return newVersion;
    }
    onLegacyPermissionsChanged(companyId = 'COMP_01', branchId) {
        if (branchId) {
            this.repo.bumpBranchAclVersion(companyId, branchId);
            this.cache.invalidateByCompanyBranch(companyId, branchId);
        }
        else {
            this.repo.bumpCompanyAclVersion(companyId);
            this.cache.invalidateByCompany(companyId);
        }
        return this.repo.getAclVersions(companyId, branchId || 'BR_01');
    }
    getVersion(companyId = 'COMP_01') {
        return this.repo.getAclVersions(companyId).companyAclVersion;
    }
    getAclVersions(companyId = 'COMP_01', branchId = 'BR_01') {
        return this.repo.getAclVersions(companyId, branchId);
    }
    invalidateAll() {
        this.cache.invalidateAll();
    }
    invalidateUser(userId) {
        this.cache.invalidateByUser(userId);
    }
    buildSnapshot(input) {
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
        const scopedCapabilities = this.repo.getScopedRoleCapabilitiesByRoleIds(allRoleIds, effectiveCompanyId, effectiveBranchId);
        const scopedBundles = this.repo.getScopedRoleBundlesByRoleIds(allRoleIds, effectiveCompanyId, effectiveBranchId);
        const roleCapabilities = this.repo.getRoleCapabilitiesByRoleIds(allRoleIds);
        const bundleCapabilities = this.repo.expandBundleCapabilities(scopedBundles);
        const rolePermissions = this.repo.getRolePermissionsByRoleIds(allRoleIds);
        const inferredCapabilities = this.repo.capabilitiesFromPermissions(rolePermissions);
        const capabilitySet = new Set([
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
        const snapshot = {
            userId: effectiveUserId,
            companyId: effectiveCompanyId,
            branchId: effectiveBranchId,
            version: input.companyAclVersion * 1000000 + input.branchAclVersion,
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
    normalize(value, fallback) {
        const raw = String(value || '').trim();
        return raw || fallback;
    }
}
exports.PermissionSnapshotService = PermissionSnapshotService;
