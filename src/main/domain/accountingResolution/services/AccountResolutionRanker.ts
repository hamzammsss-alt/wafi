import { FinancialDefinitionEntity } from '../entities/FinancialDefinitionEntity';
import { FinancialDefinitionOwnerType } from '../enums/FinancialDefinitionOwnerType';
import { ResolutionCandidateRank } from '../types/AccountResolutionResult';

export interface RankableResolutionCandidate {
    definition: FinancialDefinitionEntity;
    ownerType: FinancialDefinitionOwnerType;
    ownerId: string;
    ownerTypeOrder: number;
    ownerIdOrder: number;
}

export interface RankedResolutionCandidate extends RankableResolutionCandidate {
    rank: ResolutionCandidateRank;
}

export class AccountResolutionRanker {
    rank(candidates: RankableResolutionCandidate[]): RankedResolutionCandidate[] {
        const ranked = candidates.map((candidate) => ({
            ...candidate,
            rank: {
                globalOrder: Number.MAX_SAFE_INTEGER,
                ownerTypeOrder: candidate.ownerTypeOrder,
                ownerIdOrder: candidate.ownerIdOrder,
                updatedAtEpoch: this.toEpoch(candidate.definition.updatedAt),
                tieBreakerId: candidate.definition.id,
            },
        }));

        ranked.sort((left, right) => this.compareByDeterministicOrder(left, right));

        for (let index = 0; index < ranked.length; index += 1) {
            ranked[index] = {
                ...ranked[index],
                rank: {
                    ...ranked[index].rank,
                    globalOrder: index,
                },
            };
        }

        return ranked;
    }

    hasSameBusinessRank(
        left: Pick<RankedResolutionCandidate, 'rank'>,
        right: Pick<RankedResolutionCandidate, 'rank'>,
    ): boolean {
        return (
            left.rank.ownerTypeOrder === right.rank.ownerTypeOrder &&
            left.rank.ownerIdOrder === right.rank.ownerIdOrder &&
            left.rank.updatedAtEpoch === right.rank.updatedAtEpoch
        );
    }

    private compareByDeterministicOrder(left: RankedResolutionCandidate, right: RankedResolutionCandidate): number {
        if (left.rank.ownerTypeOrder !== right.rank.ownerTypeOrder) {
            return left.rank.ownerTypeOrder - right.rank.ownerTypeOrder;
        }
        if (left.rank.ownerIdOrder !== right.rank.ownerIdOrder) {
            return left.rank.ownerIdOrder - right.rank.ownerIdOrder;
        }
        if (left.rank.updatedAtEpoch !== right.rank.updatedAtEpoch) {
            return right.rank.updatedAtEpoch - left.rank.updatedAtEpoch;
        }
        return left.rank.tieBreakerId.localeCompare(right.rank.tieBreakerId);
    }

    private toEpoch(value: string): number {
        const epoch = Date.parse(String(value || '').trim());
        return Number.isFinite(epoch) ? epoch : 0;
    }
}
