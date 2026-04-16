import { AccountId } from '../valueObjects/AccountId';

export class BudgetLine {
    constructor(
        public readonly id: string,
        public readonly budgetId: string,
        public readonly accountId: AccountId,
        public readonly costCenterId: string | null,
        public readonly monthlyAllocations: number[] // Array of 12 numbers
    ) {
        if (monthlyAllocations.length !== 12) {
            throw new Error('BudgetLine must have exactly 12 monthly allocations.');
        }
    }

    public getTotalAllocation(): number {
        return this.monthlyAllocations.reduce((sum, val) => sum + val, 0);
    }
}
