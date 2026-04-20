"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountResolutionEngine = void 0;
const errors_1 = require("../../errors");
const FinancialAccountRole_1 = require("../enums/FinancialAccountRole");
const FinancialDefinitionOwnerType_1 = require("../enums/FinancialDefinitionOwnerType");
const AccountResolutionPrecedence_1 = require("./AccountResolutionPrecedence");
const AccountResolutionRanker_1 = require("./AccountResolutionRanker");
class AccountResolutionEngine {
    constructor(ranker = new AccountResolutionRanker_1.AccountResolutionRanker()) {
        this.ranker = ranker;
    }
    resolve(input) {
        const requiredRoles = this.normalizeRoles(input.needs.requiredRoles || []);
        const optionalRoles = this.normalizeRoles(input.needs.optionalRoles || []);
        const rolesInOrder = [...requiredRoles, ...optionalRoles.filter((role) => !requiredRoles.includes(role))];
        const trace = [];
        const missingRoles = [];
        const resolvedAccounts = {};
        for (const role of rolesInOrder) {
            const required = requiredRoles.includes(role);
            const precedence = (0, AccountResolutionPrecedence_1.getPrecedenceForRole)(role);
            const steps = [];
            const rankableCandidates = [];
            for (let ownerTypeOrder = 0; ownerTypeOrder < precedence.length; ownerTypeOrder += 1) {
                const ownerType = precedence[ownerTypeOrder];
                const ownerIds = this.buildOwnerCandidateIds(input.context, ownerType);
                if (!ownerIds.length) {
                    steps.push({
                        ownerType,
                        ownerId: '',
                        matched: false,
                        reason: 'CONTEXT_MISSING',
                        rule: 'OWNER_SCOPE_REQUIRES_CONTEXT',
                    });
                    continue;
                }
                for (let ownerIdOrder = 0; ownerIdOrder < ownerIds.length; ownerIdOrder += 1) {
                    const ownerId = ownerIds[ownerIdOrder];
                    const candidates = input.definitions.filter((definition) => definition.isActive &&
                        definition.accountRole === role &&
                        definition.ownerType === ownerType &&
                        definition.ownerId === ownerId);
                    const step = {
                        ownerType,
                        ownerId,
                        matched: false,
                        reason: 'NO_DEFINITION',
                        rule: 'ROLE_SCOPE_PRECEDENCE',
                        candidateCount: candidates.length,
                    };
                    if (!candidates.length) {
                        steps.push(step);
                        continue;
                    }
                    for (const candidate of candidates) {
                        rankableCandidates.push({
                            definition: candidate,
                            ownerType,
                            ownerId,
                            ownerTypeOrder,
                            ownerIdOrder,
                        });
                    }
                    steps.push(step);
                }
            }
            if (!rankableCandidates.length) {
                trace.push({
                    role,
                    required,
                    steps,
                });
                if (required) {
                    missingRoles.push(this.buildMissingRole(role, required, steps, input.context, 'ROLE_NOT_RESOLVED', {
                        candidateCount: 0,
                        selectedDefinitionId: null,
                        conflictingDefinitionIds: [],
                    }));
                }
                continue;
            }
            const ranked = this.ranker.rank(rankableCandidates);
            this.attachCandidateDiagnostics(steps, ranked);
            const selected = ranked[0];
            const conflictingCandidates = ranked.filter((candidate, index) => index > 0 &&
                this.ranker.hasSameBusinessRank(candidate, selected) &&
                candidate.definition.accountId !== selected.definition.accountId);
            if (conflictingCandidates.length > 0) {
                this.markStepAsAmbiguous(steps, selected, conflictingCandidates);
                trace.push({
                    role,
                    required,
                    steps,
                    resolutionOrder: this.toResolutionOrderKey(selected),
                });
                if (required) {
                    missingRoles.push(this.buildMissingRole(role, required, steps, input.context, 'AMBIGUOUS_DEFINITION', {
                        candidateCount: ranked.length,
                        selectedDefinitionId: selected.definition.id,
                        conflictingDefinitionIds: conflictingCandidates.map((candidate) => candidate.definition.id),
                    }));
                }
                continue;
            }
            const account = input.accountsById.get(selected.definition.accountId);
            if (!account) {
                this.markStepFailure(steps, selected, 'ACCOUNT_NOT_FOUND');
                trace.push({
                    role,
                    required,
                    steps,
                    resolutionOrder: this.toResolutionOrderKey(selected),
                });
                if (required) {
                    missingRoles.push(this.buildMissingRole(role, required, steps, input.context, 'ACCOUNT_NOT_FOUND', {
                        candidateCount: ranked.length,
                        selectedDefinitionId: selected.definition.id,
                        conflictingDefinitionIds: [],
                    }));
                }
                continue;
            }
            if (!account.isActive) {
                this.markStepFailure(steps, selected, 'ACCOUNT_INACTIVE', account.id);
                trace.push({
                    role,
                    required,
                    steps,
                    resolutionOrder: this.toResolutionOrderKey(selected),
                });
                if (required) {
                    missingRoles.push(this.buildMissingRole(role, required, steps, input.context, 'ACCOUNT_INACTIVE', {
                        candidateCount: ranked.length,
                        selectedDefinitionId: selected.definition.id,
                        conflictingDefinitionIds: [],
                    }));
                }
                continue;
            }
            if (!account.isPosting) {
                this.markStepFailure(steps, selected, 'ACCOUNT_NOT_POSTING', account.id);
                trace.push({
                    role,
                    required,
                    steps,
                    resolutionOrder: this.toResolutionOrderKey(selected),
                });
                if (required) {
                    missingRoles.push(this.buildMissingRole(role, required, steps, input.context, 'ACCOUNT_NOT_POSTING', {
                        candidateCount: ranked.length,
                        selectedDefinitionId: selected.definition.id,
                        conflictingDefinitionIds: [],
                    }));
                }
                continue;
            }
            const selectedStep = this.findStep(steps, selected.ownerType, selected.ownerId);
            if (selectedStep) {
                selectedStep.matched = true;
                selectedStep.definitionId = selected.definition.id;
                selectedStep.accountId = account.id;
                selectedStep.reason = 'SELECTED_BY_RANK';
                selectedStep.rule = 'DETERMINISTIC_RANKING';
                selectedStep.selectedCandidate = this.toCandidateTrace(selected);
            }
            resolvedAccounts[role] = {
                accountId: account.id,
                code: account.code,
                name: account.name,
            };
            trace.push({
                role,
                required,
                steps,
                resolutionOrder: this.toResolutionOrderKey(selected),
                resolvedFrom: {
                    ownerType: selected.ownerType,
                    ownerId: selected.ownerId,
                    definitionId: selected.definition.id,
                },
            });
        }
        return {
            success: missingRoles.length === 0,
            resolvedAccounts,
            missingRoles,
            trace,
            deterministicSignature: this.buildDeterministicSignature(rolesInOrder, resolvedAccounts, trace),
        };
    }
    normalizeRoles(roles) {
        const unique = new Set();
        for (const role of roles) {
            if (!Object.values(FinancialAccountRole_1.FinancialAccountRole).includes(role)) {
                throw new errors_1.DomainError('ERR_RESOLUTION_ROLE_INVALID', `Unsupported financial role: ${String(role)}`, {
                    messageKey: 'error.account_resolution.role.invalid',
                    details: { role },
                });
            }
            unique.add(role);
        }
        return Array.from(unique);
    }
    attachCandidateDiagnostics(steps, ranked) {
        const grouped = new Map();
        for (const candidate of ranked) {
            const key = this.stepKey(candidate.ownerType, candidate.ownerId);
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            const bucket = grouped.get(key);
            if (!bucket)
                continue;
            bucket.push(this.toCandidateTrace(candidate));
        }
        for (const step of steps) {
            if (!step.ownerId)
                continue;
            const traces = grouped.get(this.stepKey(step.ownerType, step.ownerId)) || [];
            if (!traces.length)
                continue;
            step.candidateCount = traces.length;
            step.evaluatedCandidates = traces;
            step.rule = 'DETERMINISTIC_RANKING';
            step.reason = step.reason === 'NO_DEFINITION' ? 'CANDIDATES_FOUND' : step.reason;
        }
    }
    markStepAsAmbiguous(steps, selected, conflictingCandidates) {
        const target = this.findStep(steps, selected.ownerType, selected.ownerId);
        if (!target)
            return;
        target.matched = false;
        target.definitionId = selected.definition.id;
        target.accountId = selected.definition.accountId;
        target.reason = 'AMBIGUOUS_DEFINITION';
        target.rule = 'BUSINESS_RANK_TIE';
        target.selectedCandidate = this.toCandidateTrace(selected);
        if (!target.evaluatedCandidates) {
            target.evaluatedCandidates = [this.toCandidateTrace(selected)];
        }
        const existingDefinitionIds = new Set(target.evaluatedCandidates.map((candidate) => candidate.definitionId));
        for (const conflicting of conflictingCandidates) {
            if (existingDefinitionIds.has(conflicting.definition.id))
                continue;
            target.evaluatedCandidates.push(this.toCandidateTrace(conflicting));
        }
        target.candidateCount = target.evaluatedCandidates.length;
    }
    markStepFailure(steps, selected, reason, accountId) {
        const target = this.findStep(steps, selected.ownerType, selected.ownerId);
        if (!target)
            return;
        target.matched = false;
        target.definitionId = selected.definition.id;
        target.accountId = accountId || selected.definition.accountId;
        target.reason = reason;
        target.rule = 'SELECTED_DEFINITION_VALIDATION';
        target.selectedCandidate = this.toCandidateTrace(selected);
    }
    findStep(steps, ownerType, ownerId) {
        for (const step of steps) {
            if (step.ownerType === ownerType && step.ownerId === ownerId) {
                return step;
            }
        }
        return null;
    }
    toCandidateTrace(candidate) {
        return {
            definitionId: candidate.definition.id,
            accountId: candidate.definition.accountId,
            ownerType: candidate.ownerType,
            ownerId: candidate.ownerId,
            rank: candidate.rank,
        };
    }
    toResolutionOrderKey(candidate) {
        return `${candidate.rank.ownerTypeOrder}:${candidate.rank.ownerIdOrder}:${candidate.rank.updatedAtEpoch}:${candidate.rank.tieBreakerId}`;
    }
    stepKey(ownerType, ownerId) {
        return `${ownerType}::${ownerId}`;
    }
    buildOwnerCandidateIds(context, ownerType) {
        switch (ownerType) {
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.ITEM:
                return this.single(context.itemId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.ITEM_GROUP:
                return this.single(context.itemGroupId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.WAREHOUSE:
                return this.single(context.warehouseId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.PARTNER:
                return this.single(context.partnerId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.TAX_PROFILE:
                return this.single(context.taxProfileId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.BRANCH:
                return this.single(context.branchId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT: {
                const docType = String(context.documentType || '').trim().toUpperCase();
                const lineType = String(context.lineType || '').trim().toUpperCase();
                const values = [];
                if (docType && lineType)
                    values.push(`${docType}:${lineType}`);
                if (docType)
                    values.push(docType);
                return values;
            }
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY: {
                const company = String(context.companyId || '').trim();
                if (!company)
                    return ['DEFAULT'];
                return ['DEFAULT', company];
            }
            default:
                return [];
        }
    }
    single(value) {
        const normalized = String(value || '').trim();
        return normalized ? [normalized] : [];
    }
    buildMissingRole(role, required, steps, context, reason, diagnostics) {
        const uniqueOwnerScopes = new Set();
        const attemptedOwnerScopes = steps
            .filter((step) => step.ownerId)
            .filter((step) => {
            const key = `${step.ownerType}::${step.ownerId}`;
            if (uniqueOwnerScopes.has(key))
                return false;
            uniqueOwnerScopes.add(key);
            return true;
        })
            .map((step) => ({ ownerType: step.ownerType, ownerId: step.ownerId }));
        return {
            role,
            required,
            reason,
            attemptedOwnerScopes,
            diagnostics,
            contextSummary: {
                companyId: context.companyId,
                branchId: context.branchId || null,
                documentType: context.documentType,
                itemId: context.itemId || null,
                itemGroupId: context.itemGroupId || null,
                warehouseId: context.warehouseId || null,
                partnerId: context.partnerId || null,
                taxProfileId: context.taxProfileId || null,
                lineType: context.lineType || null,
            },
        };
    }
    buildDeterministicSignature(rolesInOrder, resolvedAccounts, trace) {
        const traceByRole = new Map();
        for (const traceItem of trace) {
            traceByRole.set(traceItem.role, traceItem);
        }
        return rolesInOrder
            .map((role) => {
            const resolved = resolvedAccounts[role];
            const traceItem = traceByRole.get(role);
            if (!resolved || !traceItem?.resolvedFrom) {
                return `${role}=UNRESOLVED`;
            }
            return `${role}=${resolved.accountId}@${traceItem.resolvedFrom.ownerType}:${traceItem.resolvedFrom.ownerId}#${traceItem.resolvedFrom.definitionId}`;
        })
            .join('|');
    }
}
exports.AccountResolutionEngine = AccountResolutionEngine;
