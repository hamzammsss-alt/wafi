"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountResolutionRanker = void 0;
const FinancialDefinitionScopeType_1 = require("../enums/FinancialDefinitionScopeType");
class AccountResolutionRanker {
    static rank(definition, context) {
        const scopePrecedence = AccountResolutionRanker.SCOPE_PRECEDENCE[definition.scopeType] || 0;
        const branchSpecificity = definition.branchId && context.branchId && definition.branchId === context.branchId ? 1 : 0;
        let qualifierScore = 0;
        if (definition.documentType && definition.documentType === context.documentType)
            qualifierScore += 1;
        if (definition.lineType && definition.lineType === context.lineType)
            qualifierScore += 1;
        if (definition.taxProfileId && definition.taxProfileId === context.taxProfileId)
            qualifierScore += 1;
        return {
            definition,
            scopePrecedence,
            branchSpecificity,
            qualifierScore,
        };
    }
    static compare(left, right) {
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
    static hasSameBusinessRank(left, right) {
        return (left.scopePrecedence === right.scopePrecedence &&
            left.branchSpecificity === right.branchSpecificity &&
            left.qualifierScore === right.qualifierScore &&
            left.definition.priority === right.definition.priority);
    }
}
exports.AccountResolutionRanker = AccountResolutionRanker;
AccountResolutionRanker.SCOPE_PRECEDENCE = {
    [FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.ITEM]: 6,
    [FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.ITEM_GROUP]: 5,
    [FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.WAREHOUSE]: 4,
    [FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.PARTNER]: 3,
    [FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.BRANCH]: 2,
    [FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.COMPANY]: 1,
};
