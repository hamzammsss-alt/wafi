import { Budget } from '../aggregates/Budget';

export interface IBudgetRepository {
    nextIdentity(): string;
    save(budget: Budget): Promise<void>;
    findById(id: string): Promise<Budget | null>;
    findByCompanyAndYear(companyId: string, year: number): Promise<Budget[]>;
    delete(id: string): Promise<void>;
}
