import { db } from '../database';

export class ReportService {


    // 1. Partner Ledger
    static getPartnerLedger(filters: { partnerId: string, startDate?: string, endDate?: string }) {
        let query = `
            SELECT 
                tl.account_id,
                p.id as partner_id,
                p.name_ar as partner_name,
                t.date as transaction_date,
                t.type as voucher_type,
                t.voucher_no,
                tl.description as description,
                tl.debit,
                tl.credit,
                (CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL)) as balance_change,
                t.created_at
            FROM transaction_lines tl
            JOIN transactions t ON tl.transaction_id = t.id
            JOIN business_partners p ON p.linked_account_id = tl.account_id
            WHERE t.status = 'Posted' AND p.id = ?
        `;
        const params: any[] = [filters.partnerId];

        if (filters.startDate) {
            query += ` AND t.date >= ?`;
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND t.date <= ?`;
            params.push(filters.endDate);
        }

        query += ` ORDER BY t.date, t.created_at`;

        return db.prepare(query).all(...params);
    }

    // 2. Item Movement (Stock Card)
    static getItemMovement(filters: { itemId: string, startDate?: string, endDate?: string }) {
        const { itemId, startDate, endDate } = filters;
        if (!startDate) return []; // Should require date range for opening balance calculation logic

        // 1. Opening Balance
        const openingQuery = `
            SELECT SUM(quantity) as balance 
            FROM inventory_transactions 
            WHERE item_id = ? AND transaction_date < ?
        `;
        const openingRow = db.prepare(openingQuery).get(itemId, startDate);
        // @ts-ignore
        const openingBalance = openingRow?.balance || 0;

        // 2. Movements
        let query = `
            SELECT 
                it.type,
                it.transaction_date as date, -- Aliased to date for consistency
                it.ref_document_id as ref_no, -- Use ref_document_id
                i.id as item_id,
                i.name_ar as item_name,
                it.quantity as quantity_change,
                u.name_ar as unit_name
            FROM inventory_transactions it
            JOIN items i ON it.item_id = i.id
            LEFT JOIN units u ON i.base_unit_id = u.id
            WHERE it.item_id = ?
        `;
        const params: any[] = [filters.itemId];

        if (filters.startDate) {
            query += ` AND it.transaction_date >= ?`;
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND it.transaction_date <= ?`;
            params.push(filters.endDate);
        }

        query += ` ORDER BY it.transaction_date, it.created_at`;

        const transactions = db.prepare(query).all(...params);

        return [
            {
                date: startDate,
                type: 'رصيد افتتاحي',
                ref_no: '-',
                quantity_change: openingBalance,
                unit_name: '-'
            },
            ...transactions
        ];
    }

    // --- Dashboard ---
    static getDashboardKPIs() {
        try {
            const sales = db.prepare("SELECT SUM(grand_total) as total FROM sales_invoices WHERE status = 'POSTED'").get();
            // Cash from GL accounts seems safer if available, otherwise just mock or use simple account check
            // Using a simple fallback for now if GL structure acts up
            let cash = { balance: 0 };
            try {
                cash = db.prepare("SELECT SUM(balance) as balance FROM gl_chart_of_accounts WHERE account_code LIKE '111%'").get() || { balance: 0 };
            } catch (e) {
                // If column balance doesn't exist on gl_chart_of_accounts, try fetching from journal lines
                // or just ignore for now to prevent crash
            }

            let checks = { total: 0 };
            try {
                checks = db.prepare("SELECT SUM(amount) as total FROM cheques WHERE status = 'Pending'").get() || { total: 0 };
            } catch (e) { }

            let lowStockCount = { count: 0 };
            try {
                lowStockCount = db.prepare("SELECT count(*) as count FROM items WHERE quantity_on_hand <= min_stock").get() || { count: 0 };
            } catch (e) { }

            return {
                // @ts-ignore
                sales: parseFloat(sales?.total || 0),
                // @ts-ignore
                cash: parseFloat(cash?.balance || 0),
                // @ts-ignore
                checks: parseFloat(checks?.total || 0),
                // @ts-ignore
                lowStock: lowStockCount?.count || 0
            };
        } catch (e) {
            console.error("Dashboard KPI Error:", e);
            return { sales: 0, cash: 0, checks: 0, lowStock: 0 };
        }
    }

    static getDashboardCharts() {
        try {
            // Using Sales vs Purchases for "Cash Flow" chart proxy
            const cashFlow = db.prepare(`
                SELECT 
                    date,
                    SUM(grand_total) as in_flow
                FROM sales_invoices
                WHERE status = 'POSTED'
                GROUP BY date
                ORDER BY date DESC
                LIMIT 7
            `).all().reverse();

            // We can add purchase_invoices for out_flow if needed, for now just sales

            const topProducts = db.prepare(`
                SELECT 
                    i.name_ar as name, 
                    SUM(l.quantity) as qty
                FROM sales_invoice_lines l
                JOIN items i ON l.item_id = i.id
                JOIN sales_invoices inv ON l.invoice_id = inv.id
                WHERE inv.status = 'POSTED'
                GROUP BY i.id
                ORDER BY qty DESC
                LIMIT 5
            `).all();

            return { cashFlow, topProducts };
        } catch (e) {
            console.error("Dashboard Charts Error:", e);
            return { cashFlow: [], topProducts: [] };
        }
    }

    // Financial PnL
    static getReportPnL(range: { from?: string, to?: string }) {
        const { from, to } = range;
        let dateCondition = "";
        const params: any[] = [];

        if (from) { dateCondition += " AND t.date >= ?"; params.push(from); }
        if (to) { dateCondition += " AND t.date <= ?"; params.push(to); }

        const getSum = (type: string, isCreditPositive: boolean) => {
            const query = `
                SELECT SUM(
                    ${isCreditPositive ?
                    '(CAST(tl.credit AS DECIMAL) - CAST(tl.debit AS DECIMAL))' :
                    '(CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL))'}
                ) as val
                FROM transaction_lines tl
                JOIN transactions t ON tl.transaction_id = t.id
                JOIN accounts a ON tl.account_id = a.id
                WHERE a.type = ? ${dateCondition} AND t.status = 'Posted'
            `;
            const result = db.prepare(query).get(type, ...params);
            // @ts-ignore
            return parseFloat(result?.val || 0);
        };

        const sales = getSum('Revenue', true);
        const cogs = getSum('Cost of Sales', false);
        const expenses = getSum('Expense', false);

        const queryExp = `
            SELECT a.name, SUM(CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL)) as amount
            FROM transaction_lines tl
            JOIN transactions t ON tl.transaction_id = t.id
            JOIN accounts a ON tl.account_id = a.id
            WHERE a.type = 'Expense' ${dateCondition} AND t.status = 'Posted'
            GROUP BY a.id
            HAVING amount > 0
        `;
        const expenseBreakdown = db.prepare(queryExp).all(...params);

        return {
            sales,
            cogs,
            grossProfit: sales - cogs,
            expenses,
            netProfit: (sales - cogs) - expenses,
            expenseBreakdown
        };
    }

    // 3. Trial Balance
    static getTrialBalance() {
        // Direct calculation without View
        const query = `
            SELECT 
                a.id as account_id,
                a.code as account_code,
                a.name as name_ar,
                a.type as account_type,
                
                SUM(CASE WHEN CAST(tl.debit AS DECIMAL) > 0 THEN CAST(tl.debit AS DECIMAL) ELSE 0 END) as total_debit,
                SUM(CASE WHEN CAST(tl.credit AS DECIMAL) > 0 THEN CAST(tl.credit AS DECIMAL) ELSE 0 END) as total_credit,
                
                SUM(CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL)) as net_balance
                
            FROM accounts a
            LEFT JOIN transaction_lines tl ON a.id = tl.account_id
            LEFT JOIN transactions t ON tl.transaction_id = t.id
            WHERE (t.status = 'Posted' OR t.status IS NULL)
            GROUP BY a.id
            ORDER BY a.code
        `;
        return db.prepare(query).all();
    }

    // 4. Balance Sheet
    static getBalanceSheet() {
        const assets = db.prepare("SELECT * FROM accounts WHERE type = 'Asset' OR type = 'ASSET'").all(); // Handle case sensitivity
        const liabilities = db.prepare("SELECT * FROM accounts WHERE type = 'Liability' OR type = 'LIABILITY'").all();
        const equity = db.prepare("SELECT * FROM accounts WHERE type = 'Equity' OR type = 'EQUITY'").all();

        // Calculate totals (balance is string)
        const totalAssets = assets.reduce((sum: number, a: any) => sum + (parseFloat(a.balance) || 0), 0);
        const totalLiabilities = liabilities.reduce((sum: number, a: any) => sum + (parseFloat(a.balance) || 0), 0);
        const totalEquity = equity.reduce((sum: number, a: any) => sum + (parseFloat(a.balance) || 0), 0);

        return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
    }

    // 5. Inventory Status
    static getInventoryStatus() {
        const query = `
            SELECT 
                i.id, i.code, i.name_ar, 
                u.name_ar as unit_name,
                COALESCE(SUM(sb.quantity), 0) as total_quantity,
                COALESCE(SUM(sb.quantity * sb.avg_cost), 0) as total_value
            FROM items i
            LEFT JOIN stock_balances sb ON i.id = sb.item_id
            LEFT JOIN units u ON i.base_unit_id = u.id
            GROUP BY i.id
            ORDER BY i.code
        `;
        return db.prepare(query).all();
    }

    // 6. Sales Analytics
    static getSalesAnalytics(range: { startDate?: string, endDate?: string }) {
        let dateFilter = '';
        const params: any[] = [];

        if (range.startDate) {
            dateFilter += ' AND i.date >= ?';
            params.push(range.startDate);
        }
        if (range.endDate) {
            dateFilter += ' AND i.date <= ?';
            params.push(range.endDate);
        }

        // Total Sales & Count
        const totals = db.prepare(`
            SELECT COUNT(*) as count, SUM(grand_total) as value 
            FROM sales_invoices i 
            WHERE i.status = 'POSTED' ${dateFilter}
        `).get(...params);

        // Sales by Branch (Region)
        const byRegion = db.prepare(`
            SELECT b.name_ar as name, SUM(i.grand_total) as value
            FROM sales_invoices i
            JOIN branches b ON i.branch_id = b.id
            WHERE i.status = 'POSTED' ${dateFilter}
            GROUP BY b.id
        `).all(...params);

        // Top Sales Reps (Assuming Linked to Invoice via CreatedBy or SalesmanID - Using CreatedBy for now)
        const topReps = db.prepare(`
            SELECT i.created_by as name, SUM(i.grand_total) as value
            FROM sales_invoices i
            WHERE i.status = 'POSTED' ${dateFilter}
            GROUP BY i.created_by
            ORDER BY value DESC
            LIMIT 5
        `).all(...params);

        return { totals, byRegion, topReps };
    }

    // 7. Profitability Report
    static getProfitabilityReport(range: { startDate?: string, endDate?: string }) {
        let dateFilter = '';
        const params: any[] = [];

        if (range.startDate) {
            dateFilter += ' AND i.date >= ?';
            params.push(range.startDate);
        }
        if (range.endDate) {
            dateFilter += ' AND i.date <= ?';
            params.push(range.endDate);
        }

        // We join invoice lines with inventory transactions to get the COST recorded at time of sale?
        // Or simpler: We use the cost recorded in inventory_transactions for the SAME invoice ref.

        // Strategy: Join Invoice Line -> Item. 
        // Cost: Get from Inventory Transactions for this Invoice Ref (OUT).

        const query = `
            SELECT 
                it.code, it.name_ar as item_name,
                SUM(l.quantity) as quantity_sold,
                SUM(l.total_price) as total_sales,
                -- Cost Calculation: Sum of Cost recorded in Inventory Transactions for this Ref
                (
                    SELECT ABS(SUM(inv_tr.cost_price * inv_tr.quantity))
                    FROM inventory_transactions inv_tr
                    WHERE inv_tr.ref_no = i.invoice_no AND inv_tr.item_id = l.item_id
                ) as total_cost
            FROM sales_invoice_lines l
            JOIN sales_invoices i ON l.invoice_id = i.id
            JOIN items it ON l.item_id = it.id
            WHERE i.status = 'POSTED' ${dateFilter}
            GROUP BY l.item_id
            ORDER BY total_sales DESC
        `;

        const data = db.prepare(query).all(...params);

        // Calculate Profit & Margin
        return data.map((row: any) => {
            const cost = row.total_cost || 0; // Fallback if no cost found
            const profit = row.total_sales - cost;
            const margin = row.total_sales > 0 ? (profit / row.total_sales) * 100 : 0;
            return { ...row, total_cost: cost, profit, margin };
        });
    }

    // 8. Purchasing Analysis
    static getPurchasingAnalysis(range: { startDate?: string, endDate?: string }) {
        let dateFilter = '';
        const params: any[] = [];

        if (range.startDate) {
            dateFilter += ' AND date >= ?';
            params.push(range.startDate);
        }
        if (range.endDate) {
            dateFilter += ' AND date <= ?';
            params.push(range.endDate);
        }

        // Total Purchases & Count
        const totals = db.prepare(`
            SELECT COUNT(*) as count, SUM(grand_total) as value 
            FROM purchase_invoices 
            WHERE status = 'POSTED' ${dateFilter}
        `).get(...params);

        // Top Suppliers
        const topSuppliers = db.prepare(`
            SELECT p.name_ar as name, SUM(i.grand_total) as value
            FROM purchase_invoices i
            JOIN business_partners p ON i.supplier_id = p.id
            WHERE i.status = 'POSTED' ${dateFilter}
            GROUP BY p.id
            ORDER BY value DESC
            LIMIT 5
        `).all(...params);

        // Local vs Import (Based on is_import flag)
        const typeBreakdown = db.prepare(`
            SELECT 
                CASE WHEN is_import = 1 THEN 'Global Import' ELSE 'Local Purchase' END as name,
                SUM(grand_total) as value
            FROM purchase_invoices
            WHERE status = 'POSTED' ${dateFilter}
            GROUP BY is_import
        `).all(...params);

        return { totals, topSuppliers, typeBreakdown };
    }

    // 8.1 Purchases By Vendor (Detailed)
    static getPurchasesByVendor(range: { startDate?: string, endDate?: string }) {
        let dateFilter = '';
        const params: any[] = [];

        if (range.startDate) {
            dateFilter += ' AND i.date >= ?';
            params.push(range.startDate);
        }
        if (range.endDate) {
            dateFilter += ' AND i.date <= ?';
            params.push(range.endDate);
        }

        const query = `
            SELECT 
                p.name_ar as vendor_name,
                COUNT(i.id) as bill_count,
                SUM(i.grand_total) as total_amount,
                0 as total_paid, -- Placeholder until payment linkage logic confirmed
                SUM(i.grand_total) as balance_due
            FROM purchase_invoices i
            JOIN business_partners p ON i.supplier_id = p.id
            WHERE i.status = 'POSTED' ${dateFilter}
            GROUP BY p.id
            ORDER BY total_amount DESC
        `;
        return db.prepare(query).all(...params);
    }

    // 9. Import Reports
    static getImportReports() {
        const query = `
            SELECT 
                s.shipment_no as file_no,
                s.opening_date as date,
                s.status,
                bp.name_ar as supplier_name,
                
                -- Calculate Invoice Value (FOB) from linked Purchase Invoices
                (SELECT SUM(subtotal * exchange_rate) FROM purchase_invoices WHERE shipment_id = s.id) as invoice_value,

                -- Calculate Clearance Expenses
                (SELECT SUM(amount_local) FROM clearance_expenses WHERE shipment_id = s.id) as expenses_value

            FROM import_shipments s
            LEFT JOIN business_partners bp ON s.supplier_id = bp.id
            ORDER BY s.opening_date DESC
        `;

        const rows = db.prepare(query).all();

        return rows.map((r: any) => ({
            ...r,
            invoice_value: r.invoice_value || 0,
            // Total Cost (CIF) = FOB + Expenses
            total_cost: (r.invoice_value || 0) + (r.expenses_value || 0)
        }));
    }

    // 10. Cheques Report
    static getChequesReport(filters: { status?: string, type?: string, startDate?: string, endDate?: string }) {
        let query = `
            SELECT 
                c.id, c.cheque_no, c.bank_name, c.amount, c.due_date, c.status, c.type,
                p.name_ar as partner_name,
                c.drawer_name
            FROM cheques c
            LEFT JOIN business_partners p ON c.partner_id = p.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (filters.status && filters.status !== 'All') {
            query += ` AND c.status = ?`;
            params.push(filters.status);
        }
        if (filters.type) {
            query += ` AND c.type = ?`;
            params.push(filters.type);
        }
        if (filters.startDate) {
            query += ` AND c.due_date >= ?`;
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND c.due_date <= ?`;
            params.push(filters.endDate);
        }

        query += ` ORDER BY c.due_date ASC`;

        return db.prepare(query).all(...params);
    }

    // 11. Account Statement (Detailed General Ledger)
    static getAccountStatement(filters: { accountId: string, fromDate: string, toDate: string }) {
        // 1. Opening Balance (Before fromDate)
        const openingBalanceQuery = `
            SELECT SUM(CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL)) as balance
            FROM transaction_lines tl
            JOIN transactions t ON tl.transaction_id = t.id
            WHERE tl.account_id = ? AND t.date < ? AND t.status = 'Posted'
        `;
        const openingBalance = db.prepare(openingBalanceQuery).get(filters.accountId, filters.fromDate)?.balance || 0;

        // 2. Movements (Within Range)
        const movesQuery = `
            SELECT 
                t.date, t.type, t.ref_no, tl.description, 
                tl.debit, tl.credit, t.created_at
            FROM transaction_lines tl
            JOIN transactions t ON tl.transaction_id = t.id
            WHERE tl.account_id = ? AND t.date BETWEEN ? AND ? AND t.status = 'Posted'
            ORDER BY t.date, t.created_at
        `;
        const moves = db.prepare(movesQuery).all(filters.accountId, filters.fromDate, filters.toDate);

        return { openingBalance, moves };
    }

    // 12. Aging Report (Receivables)
    static getAgingReport() {
        // Simple logic: Fetch unpaid sales invoices and categorize by age
        // Requires: sales_invoices with due_date or date, and payment_status != 'PAID'
        // Ideally we track remaining balance per invoice, but for now we assume unpaid = full amount if no partial payment tracking.

        // This query groups by Customer and sums up buckets
        const query = `
            SELECT 
                p.name_ar as partner_name,
                SUM(i.grand_total) as total_due,
                SUM(CASE WHEN (julianday('now') - julianday(i.date)) <= 30 THEN i.grand_total ELSE 0 END) as 'd_0_30',
                SUM(CASE WHEN (julianday('now') - julianday(i.date)) BETWEEN 31 AND 60 THEN i.grand_total ELSE 0 END) as 'd_31_60',
                SUM(CASE WHEN (julianday('now') - julianday(i.date)) BETWEEN 61 AND 90 THEN i.grand_total ELSE 0 END) as 'd_61_90',
                SUM(CASE WHEN (julianday('now') - julianday(i.date)) > 90 THEN i.grand_total ELSE 0 END) as 'd_90_plus'
            FROM sales_invoices i
            JOIN business_partners p ON i.customer_id = p.id
            WHERE i.status = 'POSTED' AND i.payment_status != 'PAID'
            GROUP BY p.id
        `;

        // Note: 'now' in SQLite might need adjustment for timezone or use passed date.
        // Also this assumes sales_invoices tracks all receivables.

        // Currently we don't have partial payments fully integrated in invoices table (paid_amount column missing in schema_v4 check).
        // So we just sum unpaid invoices.

        return db.prepare(query).all();
    }

    // 13. Tax Report
    static getTaxReport(range: { startDate?: string, endDate?: string }) {
        let salesFilter = '';
        let purchaseFilter = '';
        const salesParams: any[] = [];
        const purchaseParams: any[] = [];

        if (range.startDate) {
            salesFilter += ' AND date >= ?';
            purchaseFilter += ' AND date >= ?';
            salesParams.push(range.startDate);
            purchaseParams.push(range.startDate);
        }
        if (range.endDate) {
            salesFilter += ' AND date <= ?';
            purchaseFilter += ' AND date <= ?';
            salesParams.push(range.endDate);
            purchaseParams.push(range.endDate);
        }

        // 1. Output Tax (From Sales) - Convert to Base Currency
        const outputTaxRaw = db.prepare(`
            SELECT 
                SUM(subtotal * exchange_rate) as total_sales_base,
                SUM(tax_total * exchange_rate) as total_tax_base
            FROM sales_invoices
            WHERE status = 'POSTED' ${salesFilter}
        `).get(...salesParams);

        // 2. Input Tax (From Purchases) - Convert to Base Currency
        const inputTaxRaw = db.prepare(`
             SELECT 
                SUM(subtotal * exchange_rate) as total_purchases_base,
                SUM(tax_total * exchange_rate) as total_tax_base
            FROM purchase_invoices
            WHERE status = 'POSTED' ${purchaseFilter}
        `).get(...purchaseParams);

        const outputTax = outputTaxRaw?.total_tax_base || 0;
        const inputTax = inputTaxRaw?.total_tax_base || 0;

        return {
            outputTax: outputTax,
            inputTax: inputTax,
            netTax: outputTax - inputTax,
            details: {
                totalSales: outputTaxRaw?.total_sales_base || 0,
                totalPurchases: inputTaxRaw?.total_purchases_base || 0
            }
        };
    }

    // 14. Top Customers
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
        return db.prepare(query).all();
    }

    // 15. Slow Moving Items
    static getSlowMovingItems(days: number = 90) {
        // Items with stock > 0 but NO OUT/In movements in last X days
        // Or strictly: No Sales Invoices in last X days.
        // Let's check inventory_transactions of type 'INV' (Sales) or 'SI' (Stock Issue)

        // Calculate the cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const query = `
            SELECT 
                i.id, i.code, i.name_ar, 
                COALESCE(SUM(sb.quantity), 0) as current_stock,
                MAX(it.transaction_date) as last_movement_date
            FROM items i
            JOIN stock_balances sb ON i.id = sb.item_id
            LEFT JOIN inventory_transactions it ON i.id = it.item_id 
            WHERE sb.quantity > 0
            GROUP BY i.id
            HAVING (last_movement_date < ? OR last_movement_date IS NULL)
        `;

        return db.prepare(query).all(cutoffStr);
    }

    // 16. Expiry Report (Simulated as we don't have batch details on main items table, needing batch join)
    static getExpiryReport(days: number = 30) {
        // Find batches expiring within X days
        // Join item_batches -> items

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + days); // Future date
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                b.batch_no, b.expiry_date, b.quantity,
                i.code as item_code, i.name_ar as item_name
            FROM item_batches b
            JOIN items i ON b.item_id = i.id
            WHERE b.quantity > 0 
              AND b.expiry_date <= ? 
              AND b.expiry_date >= ? -- Optional: Don't show already expired long ago? Or show all expired?
            ORDER BY b.expiry_date ASC
        `;

        // For now show all expiring soon or already expired
        return db.prepare(query).all(cutoffStr, '1900-01-01');
    }
}
