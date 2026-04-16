"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountResolutionRanker = void 0;
class AccountResolutionRanker {
    rank(candidates) {
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
    hasSameBusinessRank(left, right) {
        return (left.rank.ownerTypeOrder === right.rank.ownerTypeOrder &&
            left.rank.ownerIdOrder === right.rank.ownerIdOrder &&
            left.rank.updatedAtEpoch === right.rank.updatedAtEpoch);
    }
    compareByDeterministicOrder(left, right) {
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
    toEpoch(value) {
        const epoch = Date.parse(String(value || '').trim());
        return Number.isFinite(epoch) ? epoch : 0;
    }
}
exports.AccountResolutionRanker = AccountResolutionRanker;
