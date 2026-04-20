"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class BudgetService {
    // --- CRUD Operations ---
    static getAllBudgets() {
        return database_1.db.prepare(`
            SELECT * FROM gl_budget_headers ORDER BY fiscal_year DESC, created_at DESC
        `).all();
    }
    static getBudgetById(id) {
        const header = database_1.db.prepare('SELECT * FROM gl_budget_headers WHERE id = ?').get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT bl.*, a.code as account_code, a.name as account_name 
            FROM gl_budget_lines bl
            JOIN accounts a ON bl.account_id = a.id
            WHERE bl.header_id = ?
            ORDER BY a.code, bl.period
        `).all(id);
        return { ...header, lines };
    }
    static createBudget(data) {
        const id = (0, uuid_1.v4)();
        const insertHeader = database_1.db.prepare(`
            INSERT INTO gl_budget_headers (id, name, fiscal_year, description, status)
            VALUES (?, ?, ?, ?, 'DRAFT')
        `);
        const insertLine = database_1.db.prepare(`
            INSERT INTO gl_budget_lines (id, header_id, account_id, period, amount, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const transaction = database_1.db.transaction(() => {
            insertHeader.run(id, data.name, data.fiscal_year, data.description || '');
            for (const line of data.lines) {
                insertLine.run((0, uuid_1.v4)(), id, line.account_id, line.period || 0, line.amount || 0, line.notes || '');
            }
        });
        transaction();
        return { id, message: 'Budget created successfully' };
    }
    static updateBudgetStatus(id, status, userId) {
        if (status === 'APPROVED') {
            database_1.db.prepare(`
                UPDATE gl_budget_headers 
                SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(status, userId, id);
        }
        else {
            database_1.db.prepare('UPDATE gl_budget_headers SET status = ? WHERE id = ?').run(status, id);
        }
        return { success: true };
    }
    // --- Reporting: Budget vs Actual ---
    static getBudgetVsActual(budgetId, period) {
        // 1. Get Budget Header info
        const budget = database_1.db.prepare('SELECT * FROM gl_budget_headers WHERE id = ?').get(budgetId);
        if (!budget)
            throw new Error('Budget not found');
        // 2. Build the query
        // We need to join Accounts (All relevant) -> Budget Lines -> Actual Transactions
        // Actuals are in transaction_lines (linked to transactions header for date filtering)
        let periodFilter = '';
        let budgetLineFilter = '';
        const params = [budgetId];
        if (period) {
            // If checking specific month
            // Budget Lines: period = ?
            // Actuals: strftime('%m', date) = ? AND strftime('%Y', date) = ?
            // Note: Date in transactions is stored as YYYY-MM-DD text usually, but check schema. 
            // In schema V1 it is TEXT.
            budgetLineFilter = ' AND bl.period = ? ';
            // For Actuals, we filter by the budget's fiscal_year AND the specific month
            // assuming sqlite date functions work on the text field.
            params.push(period); // For budget line
            params.push(budget.fiscal_year.toString()); // For Actual Year
            // Pad period with 0 if single digit: '01', '02'...
            const monthStr = period.toString().padStart(2, '0');
            params.push(monthStr); // For Actual Month
        }
        else {
            // Annual Report
            // Budget Lines: sum all periods
            // Actuals: filter by year only
            params.push(budget.fiscal_year.toString());
        }
        /*
           Query Strategy:
           Select Account,
           Sum(Budget_Amount),
           Sum(Actual_Debit - Actual_Credit) (For Expenses, Debit is positive. For Revenue, Credit is positive.
           Let's just get Net Balance and handle sign based on Account Type in UI or here)
        */
        const sql = `
            SELECT 
                a.id as account_id,
                a.code as account_code,
                a.name as account_name,
                a.type as account_type,
                
                -- Budget Amount
                COALESCE(SUM(distinct bl.amount), 0) as budget_amount,
                
                -- Actual Amount (Net movement in the period)
                COALESCE(SUM(
                    CASE 
                        WHEN t.status = 'Posted' THEN (CAST(tl.debit AS REAL) - CAST(tl.credit AS REAL))
                        ELSE 0 
                    END
                ), 0) as actual_amount

            FROM accounts a
            
            -- Join Budget Lines
            LEFT JOIN gl_budget_lines bl ON a.id = bl.account_id AND bl.header_id = ? ${period ? 'AND bl.period = ?' : ''}
            
            -- Join Actual Transactions
            LEFT JOIN transaction_lines tl ON a.id = tl.account_id
            LEFT JOIN transactions t ON tl.transaction_id = t.id 
                AND strftime('%Y', t.date) = ? 
                ${period ? "AND strftime('%m', t.date) = ?" : ''}

            WHERE 
                (bl.id IS NOT NULL OR tl.id IS NOT NULL)
                AND a.type IN ('Revenue', 'Expense', 'Cost of Goods Sold', 'Operating Expense') -- Usually we budget P&L accounts

            GROUP BY a.id
            ORDER BY a.code
        `;
        // Wait, the above query sum(distinct bl.amount) is risky if multiple budget lines match (e.g. if we don't filter safely). 
        // Also mixing aggregate of TL with BL in one query can reuse BL rows for every TL row -> Cartesian product.
        // Better approach: CTEs or Subqueries.
        const safeSql = `
            WITH BudgetData AS (
                SELECT account_id, SUM(amount) as total_budget
                FROM gl_budget_lines
                WHERE header_id = ? ${period ? 'AND period = ?' : ''}
                GROUP BY account_id
            ),
            ActualData AS (
                SELECT tl.account_id, SUM(CAST(tl.debit AS REAL) - CAST(tl.credit AS REAL)) as net_actual
                FROM transaction_lines tl
                JOIN transactions t ON tl.transaction_id = t.id
                WHERE t.status = 'Posted'
                  AND strftime('%Y', t.date) = ?
                  ${period ? "AND strftime('%m', t.date) = ?" : ''}
                GROUP BY tl.account_id
            )
            SELECT 
                a.id, a.code, a.name, a.type,
                COALESCE(bd.total_budget, 0) as budget_amount,
                COALESCE(ad.net_actual, 0) as actual_amount
            FROM accounts a
            LEFT JOIN BudgetData bd ON a.id = bd.account_id
            LEFT JOIN ActualData ad ON a.id = ad.account_id
            WHERE 
               (bd.total_budget IS NOT NULL OR ad.net_actual IS NOT NULL)
               AND a.type IN ('Revenue', 'Expense')
            ORDER BY a.code
        `;
        // Prepare params for Safe SQL
        // 1. Budget Header ID
        // 2. [Optional] Period for Budget
        // 3. Year for Actual
        // 4. [Optional] Month for Actual
        const validParams = [budgetId];
        if (period)
            validParams.push(period);
        validParams.push(budget.fiscal_year.toString());
        if (period)
            validParams.push(period.toString().padStart(2, '0'));
        const results = database_1.db.prepare(safeSql).all(...validParams);
        // Post-calculate Variance
        return results.map((r) => {
            // For Expense: Variance = Budget - Actual (Positive is Good i.e. under budget)
            // For Revenue: Variance = Actual - Budget (Positive is Good i.e. over target)
            // Actual Amount from query is (Debit - Credit).
            // Expense Debits are positive. Revenue Credits are positive (so Actual Net will be negative).
            let actual = r.actual_amount;
            const budget = r.budget_amount;
            // Normalize Logic: Make Revenue Positive for display
            if (r.type === 'Revenue') {
                actual = actual * -1;
            }
            const variance = (r.type === 'Revenue') ? (actual - budget) : (budget - actual);
            const variancePercent = (budget !== 0) ? (variance / budget) * 100 : 0;
            return {
                ...r,
                actual_amount: actual, // Return positive for display
                budget_amount: budget,
                variance: variance,
                variance_percent: variancePercent.toFixed(2)
            };
        });
    }
}
exports.BudgetService = BudgetService;
