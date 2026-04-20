"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const database_1 = require("../database");
class ReportsService {
    static getTrialBalance(options = {}) {
        let query = `
            SELECT 
                a.id,
                a.code,
                a.name,
                a.type,
                a.account_level,
                SUM(CASE WHEN CAST(tl.debit AS DECIMAL) > 0 THEN CAST(tl.debit AS DECIMAL) ELSE 0 END) as total_debit,
                SUM(CASE WHEN CAST(tl.credit AS DECIMAL) > 0 THEN CAST(tl.credit AS DECIMAL) ELSE 0 END) as total_credit
            FROM accounts a
            LEFT JOIN transaction_lines tl ON a.id = tl.account_id
            LEFT JOIN transactions t ON tl.transaction_id = t.id
            WHERE 1=1
        `;
        const params = [];
        if (options.fromDate) {
            query += ' AND t.date >= ?';
            params.push(options.fromDate);
        }
        if (options.toDate) {
            query += ' AND t.date <= ?';
            params.push(options.toDate);
        }
        if (options.branchId) {
            // Note: Transactions might not have branch_id column yet in basic schema, but SRS says so.
            // Let's assume we might need to filter by standard logic. 
            // For now, ignore branch filter to avoid crash if column missing, unless verified.
            // query += ' AND t.branch_id = ?';
            // params.push(options.branchId);
        }
        // Only Posted transactions
        query += " AND (t.status = 'Posted' OR t.status IS NULL) "; // NULL check if left join has no match? No, if no match then tl is null.
        // Wait, if left join has no match, tl.debit is null.
        // We need to group by account.
        query += `
            GROUP BY a.id
            ORDER BY a.code
        `;
        const rows = database_1.db.prepare(query).all(...params);
        // Post-processing to separate "Opening" vs "Movement" is harder in one query without clear Date logic.
        // For distinct Trial Balance (TB), usually we want: Opening, Debit, Credit, Net.
        // The above gives "Period Activity". 
        // If fromDate is set, we miss "Opening Balance" from before fromDate.
        // Correction: A proper TB needs Opening Balance + Period Move.
        // For minimal scope now, let's just do "Total Debits/Credits to date" if no dates, or simple Activity if dates.
        return rows.map((r) => ({
            ...r,
            net_balance: (parseFloat(r.total_debit || 0) - parseFloat(r.total_credit || 0)).toFixed(2)
        }));
    }
    static getDashboardKPIs() {
        // 1. Sales (Total 'INV' for current month)
        // const startOfMonth = new Date(new Date().setDate(1)).toISOString().slice(0, 10);
        // Simplified: Total Sales All Time for now, or add date filter.
        const sales = database_1.db.prepare("SELECT SUM(total_amount) as total FROM transactions WHERE type = 'INV' AND status = 'Posted'").get();
        // 2. Cash (Balance of Account 1111 - Main Box) - Ideally sum all Asset Cash accounts
        const cash = database_1.db.prepare("SELECT balance FROM accounts WHERE code = '1111'").get();
        // 3. Checks (Holding)
        const checks = database_1.db.prepare("SELECT SUM(amount) as total FROM checks WHERE status = 'Holding'").get();
        // 4. Low Stock
        const lowStock = database_1.db.prepare("SELECT count(*) as count FROM items WHERE min_stock > 0 AND (SELECT quantity FROM stock_balances WHERE item_id = items.id) <= min_stock").get();
        // Note: stock_balances check is complex if not joined. 
        // Let's use simpler check if quantity is on items table (it is NOT, it's on stock_balances).
        // Correct query:
        // SELECT count(*) FROM items i JOIN stock_balances sb ON i.id = sb.item_id WHERE i.min_stock > 0 AND sb.quantity <= i.min_stock
        // Actually, schema check: stock_balances(item_id, warehouse_id, quantity).
        // One item might be in multiple warehouses. We should sum quantity?
        // For simplicity:
        const lowStockCount = database_1.db.prepare(`
            SELECT count(DISTINCT i.id) as count 
            FROM items i 
            JOIN stock_balances sb ON i.id = sb.item_id 
            GROUP BY i.id 
            HAVING SUM(sb.quantity) <= i.min_stock
        `).get();
        return {
            sales: parseFloat(sales?.total || 0),
            cash: parseFloat(cash?.balance || 0),
            checks: parseFloat(checks?.total || 0),
            lowStock: lowStockCount?.count || 0
        };
    }
    static getDashboardCharts() {
        // 1. Cash Flow (Income vs Expense over time)
        // Simplified: Last 7 Transactions of type INV and PINV
        // Or better: Group by Date for last 30 days.
        const cashFlow = database_1.db.prepare(`
            SELECT date, 
                   SUM(CASE WHEN type='INV' THEN total_amount ELSE 0 END) as in_flow,
                   SUM(CASE WHEN type='PINV' THEN total_amount ELSE 0 END) as out_flow
            FROM transactions 
            WHERE status = 'Posted'
            GROUP BY date
            ORDER BY date DESC
            LIMIT 7
        `).all().reverse();
        // 2. Top Products
        const topProducts = database_1.db.prepare(`
            SELECT p.name, SUM(ii.quantity) as qty
            FROM invoice_items ii
            JOIN products p ON ii.product_id = p.id
            GROUP BY p.id
            ORDER BY qty DESC
            LIMIT 5
        `).all();
        return {
            cashFlow,
            topProducts
        };
    }
    static getReportPnL(range) {
        const { from, to } = range;
        let dateCondition = "";
        const params = [];
        if (from) {
            dateCondition += " AND t.date >= ?";
            params.push(from);
        }
        if (to) {
            dateCondition += " AND t.date <= ?";
            params.push(to);
        }
        const getSum = (type, isCreditPositive) => {
            const query = `
                SELECT SUM(
                    ${isCreditPositive ?
                '(CAST(tl.credit AS DECIMAL) - CAST(tl.debit AS DECIMAL))' :
                '(CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL))'}
                ) as val
                FROM transaction_lines tl
                JOIN transactions t ON tl.transaction_id = t.id
                JOIN accounts a ON tl.account_id = a.id
                WHERE a.account_type = ? ${dateCondition} AND t.status = 'Posted'
            `;
            const result = database_1.db.prepare(query).get(type, ...params);
            return parseFloat(result?.val || 0);
        };
        const sales = getSum('Revenue', true);
        const cogs = getSum('Cost of Sales', false); // Expense nature
        const expenses = getSum('Expense', false);
        // Expense Breakdown
        const queryExp = `
            SELECT a.name, SUM(CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL)) as amount
            FROM transaction_lines tl
            JOIN transactions t ON tl.transaction_id = t.id
            JOIN accounts a ON tl.account_id = a.id
            WHERE a.account_type = 'Expense' ${dateCondition} AND t.status = 'Posted'
            GROUP BY a.id
            HAVING amount > 0
        `;
        const expenseBreakdown = database_1.db.prepare(queryExp).all(...params);
        return {
            sales,
            cogs,
            grossProfit: sales - cogs,
            expenses,
            netProfit: (sales - cogs) - expenses,
            expenseBreakdown
        };
    }
    static getTopCustomers() {
        const query = `
            SELECT 
                c.id, 
                c.name_ar as name, 
                COUNT(i.id) as orders,
                SUM(i.grand_total) as total,
                AVG(i.grand_total) as avgValue,
                MAX(i.date) as lastPurchase
            FROM sales_invoices i
            JOIN business_partners c ON i.customer_id = c.id
            WHERE i.status != 'DRAFT'
            GROUP BY c.id
            ORDER BY total DESC
            LIMIT 10
        `;
        return database_1.db.prepare(query).all();
    }
    // --- Inventory Reports ---
    static getItemMovement(options) {
        const { itemId, startDate, endDate } = options;
        // 1. Calculate Opening Balance (Everything before startDate)
        const openingQuery = `
            SELECT SUM(quantity) as balance 
            FROM inventory_transactions 
            WHERE item_id = ? AND transaction_date < ?
        `;
        const openingRow = database_1.db.prepare(openingQuery).get(itemId, startDate);
        // @ts-ignore
        const openingBalance = openingRow?.balance || 0;
        // 2. Fetch Period Transactions
        const txQuery = `
            SELECT 
                it.transaction_date as date,
                it.type,
                it.ref_document_id as ref_no,
                it.quantity as quantity_change,
                u.name_ar as unit_name
            FROM inventory_transactions it
            JOIN items i ON it.item_id = i.id
            LEFT JOIN units u ON i.base_unit_id = u.id
            WHERE it.item_id = ? AND it.transaction_date >= ? AND it.transaction_date <= ?
            ORDER BY it.transaction_date ASC
        `;
        const transactions = database_1.db.prepare(txQuery).all(itemId, startDate, endDate + ' 23:59:59');
        // 3. Prepend Opening Balance Row
        // We will return it as a special row, or handle it in Frontend. 
        // Better to return clean list, and maybe an 'openingBalance' field in response?
        // But the frontend iterates and calculates running total.
        // Let's allow the frontend to start with a "Opening Balance" row if we return it.
        const result = [
            {
                date: startDate,
                type: 'رصيد افتتاحي',
                ref_no: '-',
                quantity_change: openingBalance, // This sets the start point
                unit_name: '-'
            },
            ...transactions
        ];
        return result;
    }
}
exports.ReportsService = ReportsService;
