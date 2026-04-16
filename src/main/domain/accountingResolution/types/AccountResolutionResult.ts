import { FinancialAccountRole } from '../enums/FinancialAccountRole';
import { FinancialDefinitionOwnerType } from '../enums/FinancialDefinitionOwnerType';

export interface ResolvedAccountSummary {
    accountId: string;
    code: string;
    name: string;
}

export interface ResolutionCandidateRank {
    globalOrder: number;
    ownerTypeOrder: number;
    ownerIdOrder: number;
    updatedAtEpoch: number;
    tieBreakerId: string;
}

export interface ResolutionCandidateTrace {
    definitionId: string;
    accountId: string;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    rank: ResolutionCandidateRank;
}

export interface ResolutionTraceStep {
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    matched: boolean;
    definitionId?: string;
    accountId?: string;
    reason?: string;
    rule?: string;
    candidateCount?: number;
    evaluatedCandidates?: ResolutionCandidateTrace[];
    selectedCandidate?: ResolutionCandidateTrace;
}

export interface ResolutionTrace {
    role: FinancialAccountRole;
    required: boolean;
    steps: ResolutionTraceStep[];
    resolutionOrder?: string;
    resolvedFrom?: {
        ownerType: FinancialDefinitionOwnerType;
        ownerId: string;
        definitionId: string;
    };
}

export interface MissingRoleDetail {
    role: FinancialAccountRole;
    required: boolean;
    reason: string;
    attemptedOwnerScopes: Array<{
        ownerType: FinancialDefinitionOwnerType;
        ownerId: string;
    }>;
    diagnostics?: {
        candidateCount: number;
        selectedDefinitionId: string | null;
        conflictingDefinitionIds: string[];
    };
    contextSummary: {
        companyId: string;
        branchId: string | null;
        documentType: string;
        itemId: string | null;
        itemGroupId: string | null;
        warehouseId: string | null;
        partnerId: string | null;
        taxProfileId: string | null;
        lineType: string | null;
    };
}

export interface AccountResolutionResult {
    success: boolean;
    resolvedAccounts: Partial<Record<FinancialAccountRole, ResolvedAccountSummary>>;
    missingRoles: MissingRoleDetail[];
    trace: ResolutionTrace[];
    deterministicSignature: string;
}
