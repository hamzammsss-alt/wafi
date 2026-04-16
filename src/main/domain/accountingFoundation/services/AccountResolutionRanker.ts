import { FinancialDefinition } from '../entities/FinancialDefinition';
import { FinancialDefinitionScopeType } from '../enums/FinancialDefinitionScopeType';
import { AccountResolutionContext } from '../types/AccountResolutionContext';

export interface RankedResolutionCandidate {
    definition: FinancialDefinition;
    scopePrecedence: number;
    branchSpecificity: number;
    qualifierScore: number;
}

export class AccountResolutionRanker {
    private static readonly SCOPE_PRECEDENCE: Record<FinancialDefinitionScopeType, number> = {
        [FinancialDefinitionScopeType.ITEM]: 6,
        [FinancialDefinitionScopeType.ITEM_GROUP]: 5,
        [FinancialDefinitionScopeType.WAREHOUSE]: 4,
        [FinancialDefinitionScopeType.PARTNER]: 3,
        [FinancialDefinitionScopeType.BRANCH]: 2,
        [FinancialDefinitionScopeType.COMPANY]: 1,
    };

    static rank(definition: FinancialDefinition, context: AccountResolutionContext): RankedResolutionCandidate {
        const scopePrecedence = AccountResolutionRanker.SCOPE_PRECEDENCE[definition.scopeType] || 0;
        const branchSpecificity =
            definition.branchId && context.branchId && definition.branchId === context.branchId ? 1 : 0;

        let qualifierScore = 0;
        if (definition.documentType && definition.documentType === context.documentType) qualifierScore += 1;
        if (definition.lineType && definition.lineType === context.lineType) qualifierScore += 1;
        if (definition.taxProfileId && definition.taxProfileId === context.taxProfileId) qualifierScore += 1;

        return {
            definition,
            scopePrecedence,
            branchSpecificity,
            qualifierScore,
        };
    }

    static compare(left: RankedResolutionCandidate, right: RankedResolutionCandidate): number {
        if (left.scopePrecedence !== right.scopePrecedence) {
            return right.scopePrecedence - left.scopePrecedence;
        }
        if (left.branchSpecificity !== right.branchSpecificity) {
            return right.branchSpecificity - left.branchSpecificity;
        }
        if (left.qualifierScore !== right.qualifierScore) {
            return right.qualifierScore - left.qualifierScore;
        }
        if (left.definition.priority !== right.definition.priority) {
            return left.definition.priority - right.definition.priority;
        }
        const leftUpdatedAt = String(left.definition.updatedAt || '');
        const rightUpdatedAt = String(right.definition.updatedAt || '');
        if (leftUpdatedAt !== rightUpdatedAt) {
            return rightUpdatedAt.localeCompare(leftUpdatedAt);
        }
        return left.definition.id.localeCompare(right.definition.id);
    }

    static hasSameBusinessRank(left: RankedResolutionCandidate, right: RankedResolutionCandidate): boolean {
        return (
            left.scopePrecedence === right.scopePrecedence &&
            left.branchSpecificity === right.branchSpecificity &&
            left.qualifierScore === right.qualifierScore &&
            left.definition.priority === right.definition.priority
        );
    }
}
