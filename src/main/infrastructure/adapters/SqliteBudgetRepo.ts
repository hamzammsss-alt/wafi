import { randomUUID } from 'crypto';
import { IBudgetRepository } from '../../domain/repositories/IBudgetRepository';
import { Budget } from '../../domain/aggregates/Budget';
import { BudgetLine } from '../../domain/entities/BudgetLine';
import { AccountId } from '../../domain/valueObjects/AccountId';

export class SqliteBudgetRepo implements IBudgetRepository {
    constructor(private db: any) {
        this.ensureTableExists();
    }

    private ensureTableExists() {
        const sql = `
            CREATE TABLE IF NOT EXISTS budgets (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                year INTEGER NOT NULL,
                name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS budget_lines (
                id TEXT PRIMARY KEY,
                budget_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                cost_center_id TEXT,
                m1 REAL DEFAULT 0,
                m2 REAL DEFAULT 0,
                m3 REAL DEFAULT 0,
                m4 REAL DEFAULT 0,
                m5 REAL DEFAULT 0,
                m6 REAL DEFAULT 0,
                m7 REAL DEFAULT 0,
                m8 REAL DEFAULT 0,
                m9 REAL DEFAULT 0,
                m10 REAL DEFAULT 0,
                m11 REAL DEFAULT 0,
                m12 REAL DEFAULT 0,
                FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_budgets_company_year on budgets(company_id, year);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_lines_unique on budget_lines(budget_id, account_id, cost_center_id);
        `;
        this.db.exec(sql);
    }

    nextIdentity(): string {
        return randomUUID();
    }

    async save(budget: Budget): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                // Upsert Budget
                const stmt = this.db.prepare(`
                    INSERT INTO budgets (id, company_id, year, name, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        is_active = excluded.is_active
                `);
                stmt.run(
                    budget.id,
                    budget.companyId,
                    budget.year,
                    budget.name,
                    budget.isActive ? 1 : 0,
                    budget.createdAt,
                    function (err: Error) {
                        if (err) {
                            stmt.finalize();
                            reject(err);
                            return;
                        }
                        stmt.finalize();

                        // Upsert lines
                        const delStmt = this.db.prepare('DELETE FROM budget_lines WHERE budget_id = ?');
                        delStmt.run(budget.id, (err2: Error) => {
                            if (err2) {
                                delStmt.finalize();
                                reject(err2);
                                return;
                            }
                            delStmt.finalize();

                            if (budget.lines.length === 0) {
                                this.db.run('COMMIT', (err3: Error) => {
                                    if (err3) reject(err3);
                                    else resolve();
                                });
                                return;
                            }

                            const lineStmt = this.db.prepare(`
                                INSERT INTO budget_lines (
                                    id, budget_id, account_id, cost_center_id,
                                    m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `);

                            let completed = 0;
                            let hasError = false;

                            budget.lines.forEach(line => {
                                lineStmt.run(
                                    line.id,
                                    line.budgetId,
                                    line.accountId.value,
                                    line.costCenterId,
                                    ...line.monthlyAllocations,
                                    (err4: Error) => {
                                        if (hasError) return;
                                        if (err4) {
                                            hasError = true;
                                            lineStmt.finalize();
                                            this.db.run('ROLLBACK');
                                            reject(err4);
                                        } else {
                                            completed++;
                                            if (completed === budget.lines.length) {
                                                lineStmt.finalize();
                                                this.db.run('COMMIT', (err5: Error) => {
                                                    if (err5) reject(err5);
                                                    else resolve();
                                                });
                                            }
                                        }
                                    }
                                );
                            });
                        });
                    }
                );
            });
        });
    }

    async findById(id: string): Promise<Budget | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM budgets WHERE id = ?', [id], (err: Error, bRow: any) => {
                if (err) return reject(err);
                if (!bRow) return resolve(null);

                this.db.all('SELECT * FROM budget_lines WHERE budget_id = ?', [id], (err2: Error, lRows: any[]) => {
                    if (err2) return reject(err2);

                    const lines = lRows.map(l => new BudgetLine(
                        l.id,
                        l.budget_id,
                        new AccountId(l.account_id),
                        l.cost_center_id,
                        [l.m1, l.m2, l.m3, l.m4, l.m5, l.m6, l.m7, l.m8, l.m9, l.m10, l.m11, l.m12]
                    ));

                    resolve(new Budget(
                        bRow.id,
                        bRow.company_id,
                        bRow.year,
                        bRow.name,
                        lines,
                        bRow.is_active === 1,
                        bRow.created_at
                    ));
                });
            });
        });
    }

    async findByCompanyAndYear(companyId: string, year: number): Promise<Budget[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM budgets WHERE company_id = ? AND year = ?', [companyId, year], async (err: Error, bRows: any[]) => {
                if (err) return reject(err);
                if (!bRows.length) return resolve([]);

                try {
                    const budgets: Budget[] = [];
                    for (const bRow of bRows) { // Inefficient n+1 but simple for now
                        const budget = await this.findById(bRow.id);
                        if (budget) budgets.push(budget);
                    }
                    resolve(budgets);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    async delete(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM budgets WHERE id = ?', [id], (err: Error) => {
                if (err) reject(err);
                else resolve();
            }); // Cascade delete lines handled by FK IF configured, else should add delete budget_lines. Let's do explicit delete to be safe.
        });
    }
}
