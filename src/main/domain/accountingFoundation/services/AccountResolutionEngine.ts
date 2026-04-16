import { AccountStatus } from '../entities/Account';
import { FinancialDefinition } from '../entities/FinancialDefinition';
import { AccountMappingKey } from '../enums/AccountMappingKey';
import { AccountingErrorCode } from '../enums/AccountingErrorCode';
import { AccountScopeType } from '../enums/AccountScopeType';
import { FinancialDefinitionScopeType } from '../enums/FinancialDefinitionScopeType';
import { AccountResolutionContext } from '../types/AccountResolutionContext';
import {
    AccountResolutionFailure,
    AccountResolutionResult,
    ResolvedAccountEntry,
} from '../types/AccountResolutionResult';
import { AccountResolutionRanker, RankedResolutionCandidate } from './AccountResolutionRanker';

interface ResolutionScope {
    scopeType: FinancialDefinitionScopeType;
    scopeId: string;
}

export interface AccountResolutionAccountState {
    id: string;
    companyId: string;
    branchId: string | null;
    accountCode: string;
    accountName: string;
    status: AccountStatus;
    postingAllowed: boolean;
    scopeType: AccountScopeType;
}

export interface AccountResolutionEngineInput {
    context: AccountResolutionContext;
    definitions: FinancialDefinition[];
    accountsById: Map<string, AccountResolutionAccountState>;
}

export class AccountResolutionEngine {
    resolve(input: AccountResolutionEngineInput): AccountResolutionResult {
        const entries: ResolvedAccountEntry[] = [];
        const failures: AccountResolutionFailure[] = [];
        const scopeChain = this.buildScopeChain(input.context);

        for (const mappingKey of input.context.mappingKeys) {
            const trace: string[] = [];
            let resolvedEntry: ResolvedAccountEntry | null = null;
            let failed = false;

            for (const scope of scopeChain) {
                trace.push(`SCOPE:${scope.scopeType}:${scope.scopeId}`);
                const rankedCandidates = this.findRankedCandidates(
                    input.definitions,
                    mappingKey,
                    scope,
                    input.context,
                );
                if (!rankedCandidates.length) {
                    continue;
                }
                trace.push(`CANDIDATES:${scope.scopeType}:${rankedCandidates.length}`);
                trace.push(`RANKED:${this.buildRankedTrace(rankedCandidates)}`);

                if (
                    rankedCandidates.length > 1 &&
                    AccountResolutionRanker.hasSameBusinessRank(rankedCandidates[0], rankedCandidates[1]) &&
                    rankedCandidates[0].definition.accountId !== rankedCandidates[1].definition.accountId
                ) {
                    failures.push({
                        mappingKey,
                        errorCode: AccountingErrorCode.ERR_ACCOUNT_MAPPING_AMBIGUOUS,
                        messageKey: 'error.account_resolution.mapping_ambiguous',
                        trace: [...trace, `AMBIGUOUS:${scope.scopeType}:${scope.scopeId}`],
                    });
                    failed = true;
                    break;
                }

                const selected = rankedCandidates[0];
                const definition = selected.definition;
                trace.push(
                    `SELECTED:${definition.id}:ACCOUNT:${definition.accountId}:SCOPE:${definition.scopeType}:QUAL:${selected.qualifierScore}`,
                );
                const account = input.accountsById.get(definition.accountId);
                if (!account) {
                    failures.push({
                        mappingKey,
                        errorCode: AccountingErrorCode.ERR_ACCOUNT_MAPPING_NOT_FOUND,
                        messageKey: 'error.account_resolution.account_not_found',
                        trace: [...trace, `MISSING_ACCOUNT:${definition.accountId}`],
                    });
                    failed = true;
                    break;
                }

                if (account.status !== AccountStatus.ACTIVE) {
                    failures.push({
                        mappingKey,
                        errorCode: AccountingErrorCode.ERR_ACCOUNT_INACTIVE,
                        messageKey: 'error.account_resolution.account_inactive',
                        trace: [...trace, `INACTIVE:${account.id}`],
                    });
                    failed = true;
                    break;
                }

                if (!account.postingAllowed) {
                    failures.push({
                        mappingKey,
                        errorCode: AccountingErrorCode.ERR_ACCOUNT_NOT_POSTABLE,
                        messageKey: 'error.account_resolution.account_not_postable',
                        trace: [...trace, `NOT_POSTABLE:${account.id}`],
                    });
                    failed = true;
                    break;
                }

                if (account.scopeType === AccountScopeType.BRANCH && account.branchId !== input.context.branchId) {
                    failures.push({
                        mappingKey,
                        errorCode: AccountingErrorCode.ERR_ACCOUNT_MAPPING_SCOPE_MISMATCH,
                        messageKey: 'error.account_resolution.scope_mismatch',
                        trace: [...trace, `SCOPE_MISMATCH:${account.id}`],
                    });
                    failed = true;
                    break;
                }

                resolvedEntry = {
                    mappingKey,
                    accountId: account.id,
                    accountCode: account.accountCode,
                    accountName: account.accountName,
                    definitionId: definition.id,
                    sourceScopeType: definition.scopeType,
                    sourceScopeId: definition.scopeId,
                    sourceBranchId: definition.branchId,
                    qualifierScore: selected.qualifierScore,
                    trace: [...trace, `RESOLVED:${account.id}`],
                };
                break;
            }

            if (resolvedEntry) {
                entries.push(resolvedEntry);
                continue;
            }

            if (!failed) {
                failures.push({
                    mappingKey,
                    errorCode: AccountingErrorCode.ERR_ACCOUNT_MAPPING_NOT_FOUND,
                    messageKey: 'error.account_resolution.mapping_not_found',
                    trace: [...trace, 'NOT_FOUND'],
                });
            }
        }

        return {
            isSuccessful: failures.length === 0,
            entries,
            failures,
        };
    }

    private buildScopeChain(context: AccountResolutionContext): ResolutionScope[] {
        const chain: ResolutionScope[] = [];
        if (context.itemId) {
            chain.push({ scopeType: FinancialDefinitionScopeType.ITEM, scopeId: context.itemId });
        }
        if (context.itemGroupId) {
            chain.push({ scopeType: FinancialDefinitionScopeType.ITEM_GROUP, scopeId: context.itemGroupId });
        }
        if (context.warehouseId) {
            chain.push({ scopeType: FinancialDefinitionScopeType.WAREHOUSE, scopeId: context.warehouseId });
        }
        if (context.partnerId) {
            chain.push({ scopeType: FinancialDefinitionScopeType.PARTNER, scopeId: context.partnerId });
        }
        if (context.branchId) {
            chain.push({ scopeType: FinancialDefinitionScopeType.BRANCH, scopeId: context.branchId });
        }
        chain.push({ scopeType: FinancialDefinitionScopeType.COMPANY, scopeId: 'DEFAULT' });
        return chain;
    }

    private findRankedCandidates(
        definitions: FinancialDefinition[],
        mappingKey: AccountMappingKey,
        scope: ResolutionScope,
        context: AccountResolutionContext,
    ): RankedResolutionCandidate[] {
        const filtered = definitions.filter((definition) => {
            if (!definition.isActive) return false;
            if (definition.mappingKey !== mappingKey) return false;
            if (definition.scopeType !== scope.scopeType) return false;
            if (String(definition.scopeId) !== String(scope.scopeId)) return false;
            if (definition.validFrom && definition.validFrom > context.postingDate) return false;
            if (definition.validTo && definition.validTo < context.postingDate) return false;
            if (definition.branchId && definition.branchId !== context.branchId) return false;
            if (definition.documentType && definition.documentType !== context.documentType) return false;
            if (definition.lineType && definition.lineType !== context.lineType) return false;
            if (definition.taxProfileId && definition.taxProfileId !== context.taxProfileId) return false;
            return true;
        });

        return filtered
            .map((definition) => AccountResolutionRanker.rank(definition, context))
            .sort((left, right) => AccountResolutionRanker.compare(left, right));
    }

    private buildRankedTrace(candidates: RankedResolutionCandidate[]): string {
        return candidates
            .slice(0, 3)
            .map((candidate) => {
                const definition = candidate.definition;
                return [
                    definition.id,
                    definition.accountId,
                    `S${candidate.scopePrecedence}`,
                    `B${candidate.branchSpecificity}`,
                    `Q${candidate.qualifierScore}`,
                    `P${definition.priority}`,
                ].join(',');
            })
            .join('|');
    }
}
