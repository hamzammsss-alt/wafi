import { IBudgetRepository } from '../../domain/repositories/IBudgetRepository';
import { Budget } from '../../domain/aggregates/Budget';
import { BudgetLine } from '../../domain/entities/BudgetLine';
import { AccountId } from '../../domain/valueObjects/AccountId';

export class BudgetUseCases {
    constructor(private budgetRepo: IBudgetRepository) { }

    async createBudget(companyId: string, year: number, name: string): Promise<Budget> {
        const id = this.budgetRepo.nextIdentity();
        const budget = new Budget(id, companyId, year, name);
        await this.budgetRepo.save(budget);
        return budget;
    }

    async getBudgets(companyId: string, year: number): Promise<Budget[]> {
        return this.budgetRepo.findByCompanyAndYear(companyId, year);
    }

    async getBudgetDetails(id: string): Promise<Budget | null> {
        return this.budgetRepo.findById(id);
    }

    async updateBudgetLines(id: string, linesData: any[]): Promise<Budget> {
        const budget = await this.budgetRepo.findById(id);
        if (!budget) throw new Error('Budget not found');

        // Clear lines and re-add for simplicity of update
        budget.lines.length = 0;

        for (const ld of linesData) {
            const line = new BudgetLine(
                this.budgetRepo.nextIdentity(),
                id,
                new AccountId(ld.accountId),
                ld.costCenterId || null,
                ld.monthlyAllocations || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            );
            budget.addLine(line);
        }

        await this.budgetRepo.save(budget);
        return budget;
    }
}
