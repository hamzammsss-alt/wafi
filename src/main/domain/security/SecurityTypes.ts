export type ScopeLevel = 'GLOBAL' | 'COMPANY' | 'BRANCH';

export interface FieldRuleDefinition {
    fieldKey: string;
    criteria: string;
    effect: 'ALLOW' | 'DENY' | 'MASK' | 'READONLY';
}

export interface PolicyGuardDefinition {
    guardKey: string;
    config?: Record<string, unknown>;
}

export interface CapabilityDefinition {
    key: string;
    productKey: string;
    moduleKey: string;
    permissions: string[];
    labelI18nKey: string;
    denyI18nKey: string;
    defaultScope: ScopeLevel;
    fieldRules?: FieldRuleDefinition[];
    policyGuards?: PolicyGuardDefinition[];
}

export interface CapabilityBundleDefinition {
    key: string;
    productKey: string;
    labelI18nKey: string;
    capabilityKeys: string[];
}

export interface SectorPackDefinition {
    key: string;
    labelI18nKey: string;
    bundleKeys: string[];
    capabilityKeys: string[];
    reportTemplateKeys?: string[];
    printTemplateKeys?: string[];
    policyTemplateKeys?: string[];
}

export interface CapabilityCatalog {
    capabilities: CapabilityDefinition[];
    bundles: CapabilityBundleDefinition[];
    sectorPacks: SectorPackDefinition[];
}

export interface PermissionSnapshot {
    userId: string;
    companyId: string;
    branchId: string;
    version: number;
    companyAclVersion: number;
    branchAclVersion: number;
    generatedAt: string;
    permissions: string[];
    capabilities: string[];
    criteriaRules?: Record<string, any[]>;
    fieldRules: Record<string, FieldRuleDefinition[]>;
    policyGuards: Record<string, PolicyGuardDefinition[]>;
}

export interface RoleSecurityAssignments {
    roleId: string;
    companyId?: string;
    branchId?: string;
    capabilities: string[];
    bundles: string[];
    criteriaByCapability?: Record<string, string>;
}
