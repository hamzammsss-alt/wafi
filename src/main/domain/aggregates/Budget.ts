import { BudgetLine } from '../entities/BudgetLine';
import { DomainError } from '../errors';

export class Budget {
    constructor(
        public readonly id: string,
        public readonly companyId: string,
        public readonly year: number,
        public name: string,
        public readonly lines: BudgetLine[] = [],
        public isActive: boolean = true,
        public readonly createdAt: string = new Date().toISOString()
    ) { }

    public addLine(line: BudgetLine): void {
        const index = this.lines.findIndex(
            l => l.accountId.value === line.accountId.value && l.costCenterId === line.costCenterId
        );
        if (index >= 0) {
            throw new DomainError(
                'BUDGET_LINE_DUPLICATE',
                'A budget line for this account and cost center already exists.',
            );
        }
        this.lines.push(line);
    }

    public getTotalBudget(): number {
        return this.lines.reduce((sum, line) => sum + line.getTotalAllocation(), 0);
    }
}
