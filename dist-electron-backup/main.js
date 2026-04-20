const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { db, initDB } = require('./database');
// Register all IPC Handlers
const registerIPCHandlers = () => {
    // Get Accounts
    ipcMain.handle('get-accounts', () => {
        return db.prepare('SELECT * FROM accounts ORDER BY code').all();
    });
    // Get Transactional Accounts Only (for dropdowns in vouchers)
    ipcMain.handle('get-transactional-accounts', () => {
        return db.prepare('SELECT * FROM accounts WHERE is_transactional = 1 ORDER BY code').all();
    });
    // Get Account Tree (hierarchical structure)
    ipcMain.handle('get-account-tree', () => {
        const accounts = db.prepare('SELECT * FROM accounts ORDER BY code').all();
        // Build tree structure
        const buildTree = (parentId) => {
            return accounts
                .filter((acc) => acc.parent_id === parentId)
                .map((acc) => ({
                ...acc,
                children: buildTree(acc.id)
            }));
        };
        return buildTree(null);
    });
    // Get Account Children
    ipcMain.handle('get-account-children', (event, parentId) => {
        return db.prepare('SELECT * FROM accounts WHERE parent_id = ? ORDER BY code').all(parentId);
    });
    // Get Account Path (breadcrumb from root to account)
    ipcMain.handle('get-account-path', (event, accountId) => {
        const path = [];
        let currentId = accountId;
        while (currentId) {
            const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(currentId);
            if (!account)
                break;
            path.unshift(account);
            currentId = account.parent_id;
        }
        return path;
    });
    // Add Account
    ipcMain.handle('add-account', (event, account) => {
        const stmt = db.prepare(`
    INSERT INTO accounts (code, name, type, balance, parent_id, account_level, is_transactional, is_active) 
    VALUES (@code, @name, @type, @balance, @parent_id, @account_level, @is_transactional, @is_active)
  `);
        return stmt.run({
            code: account.code,
            name: account.name,
            type: account.type,
            balance: account.balance || 0,
            parent_id: account.parent_id || null,
            account_level: account.account_level || account.code.length,
            is_transactional: account.is_transactional ? 1 : 0,
            is_active: account.is_active !== false ? 1 : 0
        });
    });
    // Get Next Voucher No
    ipcMain.handle('get-next-voucher-no', (event, type) => {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE type = ?');
        const result = stmt.get(type);
        return `${type}-${1000 + (result).count + 1}`;
    });
    // --- Generic CRUD Handler ---
    ipcMain.handle('crud-operation', (event, { operation, table, data, id }) => {
        const allowedTables = [
            'units', 'brands', 'countries', 'asset_families', 'item_families',
            'item_groups', 'item_categories', 'cost_centers', 'manual_books',
            'expense_types', 'areas', 'payment_terms', 'salesmen', 'check_books',
            'warehouses', 'currencies'
        ];
        if (!allowedTables.includes(table))
            throw new Error(`Table ${table} not allowed via Generic CRUD.`);
        try {
            if (operation === 'READ') {
                return db.prepare(`SELECT * FROM ${table}`).all();
            }
            else if (operation === 'CREATE') {
                const keys = Object.keys(data).join(', ');
                const placeholders = Object.keys(data).map(k => '@' + k).join(', ');
                const stmt = db.prepare(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`);
                const info = stmt.run(data);
                return { success: true, id: info.lastInsertRowid };
            }
            else if (operation === 'UPDATE') {
                const sets = Object.keys(data).filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ');
                const stmt = db.prepare(`UPDATE ${table} SET ${sets} WHERE id = @id`);
                stmt.run({ ...data, id });
                return { success: true };
            }
            else if (operation === 'DELETE') {
                db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
                return { success: true };
            }
        }
        catch (err) {
            console.error(`CRUD Error on ${table}:`, err);
            throw new Error(err.message);
        }
    });
    // Save Transaction
    ipcMain.handle('save-transaction', (event, data) => {
        const { header, lines } = data;
        // Validate that all accounts are transactional
        for (const line of lines) {
            if (!line.accountId)
                continue;
            const account = db.prepare('SELECT is_transactional, name, code FROM accounts WHERE id = ?').get(line.accountId);
            if (!account) {
                throw new Error(`الحساب غير موجود (ID: ${line.accountId})`);
            }
            if (!account.is_transactional) {
                throw new Error(`لا يمكن الترحيل على الحساب "${account.name}" (${account.code}). يجب اختيار حساب فرعي نهائي (المستوى 4).`);
            }
        }
        // Check Balance
        const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
        const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error("القيد غير متوازن! مجموع المدين لا يساوي الدائن.");
        }
        // Transaction
        const insertTransaction = db.transaction(() => {
            // 1. Save Header
            const stmtHeader = db.prepare(`
      INSERT INTO transactions(type, ref_no, date, description)
      VALUES(@type, @ref_no, @date, @description)
    `);
            const info = stmtHeader.run(header);
            const transactionId = info.lastInsertRowid;
            // 2. Save Lines
            const stmtLine = db.prepare(`
      INSERT INTO transaction_lines(transaction_id, account_id, debit, credit, description)
      VALUES(@transactionId, @accountId, @debit, @credit, @description)
    `);
            // 3. Update Balance
            const updateBalance = db.prepare(`
        UPDATE accounts 
        SET balance = balance + (@debit - @credit)
        WHERE id = @accountId
    `);
            for (const line of lines) {
                if (!line.accountId)
                    continue;
                const lineData = {
                    transactionId,
                    accountId: line.accountId,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    description: line.description || header.description
                };
                stmtLine.run(lineData);
                // Update Account Balance
                updateBalance.run({
                    accountId: line.accountId,
                    debit: line.debit || 0,
                    credit: line.credit || 0
                });
            }
        });
        try {
            insertTransaction();
            return { success: true };
        }
        catch (error) {
            console.error(error);
            throw new Error(error.message);
        }
    });
    // --- Sales Invoice Handlers ---
    // Get Products
    ipcMain.handle('get-products', (event, search) => {
        if (!search)
            return db.prepare('SELECT * FROM products LIMIT 50').all();
        return db.prepare(`
    SELECT * FROM products 
    WHERE name LIKE @val OR barcode LIKE @val
  `).all({ val: `%${search}%` });
    });
    // Save Sales Invoice
    ipcMain.handle('save-invoice', (event, data) => {
        const { header, items, customerId, totalAmount } = data;
        // Validation
        if (!customerId || items.length === 0)
            throw new Error("بيانات الفاتورة ناقصة");
        const runInvoice = db.transaction(() => {
            // 1. Save Header
            const stmtHeader = db.prepare(`
      INSERT INTO transactions(type, ref_no, date, description)
      VALUES('INV', @ref_no, @date, @description)
    `);
            const info = stmtHeader.run(header);
            const invoiceId = info.lastInsertRowid;
            // 2. Financial Entry
            // Debit Customer
            db.prepare(`
      INSERT INTO transaction_lines(transaction_id, account_id, debit, credit, description)
      VALUES(?, ?, ?, 0, ?)
    `).run(invoiceId, customerId, totalAmount, 'فاتورة مبيعات رقم ' + header.ref_no);
            // Update Customer Balance
            db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')
                .run(totalAmount, customerId);
            // Credit Sales Account (Assume 4101 exists OR create fallback)
            let salesAccountId;
            const salesAccount = db.prepare("SELECT id FROM accounts WHERE code = '4101'").get();
            if (salesAccount) {
                salesAccountId = salesAccount.id;
            }
            else {
                // Fallback: Create Sales Account if not exists (for stability in this demo)
                const newSales = db.prepare("INSERT INTO accounts (code, name, type, balance) VALUES ('4101', 'Sales Revenue', 'Revenue', 0)").run();
                salesAccountId = newSales.lastInsertRowid;
            }
            db.prepare(`
      INSERT INTO transaction_lines(transaction_id, account_id, debit, credit, description)
      VALUES(?, ?, 0, ?, ?)
    `).run(invoiceId, salesAccountId, totalAmount, 'مبيعات فاتورة ' + header.ref_no);
            db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')
                .run(totalAmount, salesAccountId);
            // 3. Save Invoice Items & Update Stock
            const stmtItem = db.prepare(`
      INSERT INTO invoice_items(transaction_id, product_id, quantity, unit_price, total, cost_at_sale)
      VALUES(@invoiceId, @productId, @quantity, @price, @total, @cost)
    `);
            const stmtUpdateStock = db.prepare(`
      UPDATE products SET quantity = quantity - @qty WHERE id = @id
    `);
            for (const item of items) {
                stmtItem.run({
                    invoiceId,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total,
                    cost: item.cost || 0
                });
                // Update Stock
                stmtUpdateStock.run({ qty: item.quantity, id: item.productId });
            }
        });
        try {
            runInvoice();
            return { success: true };
        }
        catch (err) {
            console.error(err);
            throw new Error("فشل حفظ الفاتورة: " + err.message);
        }
    });
    // --- Purchase Invoice Handlers ---
    // Save Purchase Invoice
    ipcMain.handle('save-purchase', (event, data) => {
        const { header, items, supplierId, totalAmount } = data;
        if (!supplierId || items.length === 0)
            throw new Error("بيانات الفاتورة ناقصة");
        const runPurchase = db.transaction(() => {
            // 1. Save Header (PINV = Purchase Invoice)
            const stmtHeader = db.prepare(`
      INSERT INTO transactions (type, ref_no, date, description)
      VALUES ('PINV', @ref_no, @date, @description)
    `);
            const info = stmtHeader.run(header);
            const invoiceId = info.lastInsertRowid;
            // 2. Financial Entry
            // Credit Supplier (Liability)
            db.prepare(`
      INSERT INTO transaction_lines (transaction_id, account_id, debit, credit, description)
      VALUES (?, ?, 0, ?, ?)
    `).run(invoiceId, supplierId, totalAmount, 'فاتورة مشتريات رقم ' + header.ref_no);
            // Update Supplier Balance (Credit increases Balance for Liab/Equity)
            // Note: In our system Balance = Debit - Credit. So Liability balance will be Negative.
            // Buying more increases Liability (Credit). So Balance becomes more negative.
            // balance = balance - amount.
            db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')
                .run(totalAmount, supplierId);
            // Debit Inventory (Asset) or Purchases (Expense)
            // Assume Inventory Account code is '1131'
            const inventoryAcc = db.prepare("SELECT id FROM accounts WHERE code = '1131'").get();
            if (inventoryAcc) {
                db.prepare(`
        INSERT INTO transaction_lines (transaction_id, account_id, debit, credit, description)
        VALUES (?, ?, ?, 0, ?)
      `).run(invoiceId, inventoryAcc.id, totalAmount, 'واردات مشتريات ' + header.ref_no);
                // Asset increases with Debit. Balance = D - C.
                db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')
                    .run(totalAmount, inventoryAcc.id);
            }
            // 3. Invoice Items & Stock Update
            const stmtItem = db.prepare(`
      INSERT INTO invoice_items (transaction_id, product_id, quantity, unit_price, total)
      VALUES (@invoiceId, @productId, @quantity, @price, @total)
    `);
            // Weighted Average Cost Calculation
            const stmtUpdateStock = db.prepare(`
      UPDATE products 
      SET quantity = quantity + @qty, 
          cost_price = ((cost_price * quantity) + (@qty * @price)) / (quantity + @qty)
      WHERE id = @id
    `);
            for (const item of items) {
                stmtItem.run({
                    invoiceId,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price, // Cost Price
                    total: item.total
                });
                stmtUpdateStock.run({ qty: item.quantity, price: item.price, id: item.productId });
            }
        });
        try {
            runPurchase();
            return { success: true };
        }
        catch (err) {
            console.error(err);
            throw new Error("فشل حفظ المشتريات: " + err.message);
        }
    });
    // --- Account Statement Handlers ---
    ipcMain.handle('get-account-statement', (event, { accountId, fromDate, toDate }) => {
        // 1. Opening Balance
        const opening = db.prepare(`
    SELECT SUM(debit - credit) as balance 
    FROM transaction_lines 
    JOIN transactions ON transaction_lines.transaction_id = transactions.id
    WHERE account_id = ? AND date < ?
  `).get(accountId, fromDate);
        const openingBalance = opening ? opening.balance : 0;
        // 2. Moves
        const moves = db.prepare(`
    SELECT 
      t.date, 
      t.type, 
      t.ref_no, 
      tl.description, 
      tl.debit, 
      tl.credit
    FROM transaction_lines tl
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE tl.account_id = ? AND t.date BETWEEN ? AND ?
    ORDER BY t.date ASC, t.id ASC
  `).all(accountId, fromDate, toDate);
        return { openingBalance, moves };
    });
    // --- Check Cycle Handlers (Refined) ---
    // 1. Get Checks (with customer name)
    ipcMain.handle('get-checks', (event, status) => {
        return db.prepare(`
    SELECT c.*, a.name as customer_name 
    FROM checks c
    LEFT JOIN accounts a ON c.received_from_id = a.id
    WHERE c.status = ?
    ORDER BY c.due_date ASC
  `).all(status);
    });
    // 2. Update Check Status (The Accounting Engine)
    ipcMain.handle('update-check-status', (event, { checkId, newStatus, bankAccountId, date }) => {
        const check = db.prepare('SELECT * FROM checks WHERE id = ?').get(checkId);
        if (!check)
            throw new Error("الشيك غير موجود");
        const runUpdate = db.transaction(() => {
            // A. Update Check Status
            db.prepare('UPDATE checks SET status = ?, current_location_id = ? WHERE id = ?')
                .run(newStatus, bankAccountId || null, checkId);
            // B. Automated Accounting Entry (JV)
            let debitAcc, creditAcc, desc;
            // Logic for finding accounts (In a real app, these should be settings)
            const getAccountByName = (pattern) => db.prepare(`SELECT id FROM accounts WHERE name LIKE ?`).get(`%${pattern}%`);
            // We need to ensure these accounts exist or fallback to known IDs
            // For this prototype, we'll try to find them, or use placeholders if setup isn't perfect
            if (newStatus === 'Deposited') {
                // Action: Deposit (Holding -> Deposited)
                // Dr Checks Under Collection / Cr Checks Box
                debitAcc = getAccountByName('شيكات برسم التحصيل');
                creditAcc = getAccountByName('شيكات الصندوق') || getAccountByName('Box'); // Fallback
                desc = `إيداع شيك رقم ${check.check_number || check.check_no} في البنك`; // check_number from new schema
            }
            else if (newStatus === 'Cleared') {
                // Action: Collect/Clear (Deposited -> Cleared)
                // Dr Bank / Cr Checks Under Collection
                debitAcc = { id: bankAccountId }; // The bank selected by user
                creditAcc = getAccountByName('شيكات برسم التحصيل');
                desc = `تحصيل شيك رقم ${check.check_number || check.check_no}`;
            }
            else if (newStatus === 'Bounced') {
                // Action: Bounce (Deposited -> Bounced)
                // Dr Customer / Cr Checks Under Collection
                debitAcc = { id: check.received_from_id }; // Charge back to customer
                creditAcc = getAccountByName('شيكات برسم التحصيل');
                desc = `شيك راجع رقم ${check.check_number || check.check_no}`;
            }
            // Execute Entry if accounts are resolved
            if (debitAcc && creditAcc) {
                // 1. Create Transaction Header
                const stmtHeader = db.prepare(`INSERT INTO transactions (type, ref_no, date, description) VALUES ('JV', ?, ?, ?)`);
                const ref = 'SYS-' + Date.now();
                const info = stmtHeader.run(ref, date, desc);
                const transId = info.lastInsertRowid;
                // 2. Create Lines & Update Balances
                const stmtLine = db.prepare(`INSERT INTO transaction_lines (transaction_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)`);
                const updateBal = db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?');
                // Debit Leg
                stmtLine.run(transId, debitAcc.id, check.amount, 0, desc);
                updateBal.run(check.amount, debitAcc.id); // Debit increases asset/expense (Wait, our logic: Balance = Debit - Credit)
                // If Asset (Bank), Debit increases balance. If Liability, Debit decreases negative balance (makes it less negative).
                // Standard: balance += (debit - credit)
                // Credit Leg
                stmtLine.run(transId, creditAcc.id, 0, check.amount, desc);
                updateBal.run(-check.amount, creditAcc.id); // Credit decreases balance
            }
        });
        try {
            runUpdate();
            return { success: true };
        }
        catch (err) {
            console.error(err);
            throw new Error(err.message);
        }
    });
    // --- Manufacturing Handlers ---
    // 1. Save BOM
    ipcMain.handle('save-bom', (event, { finishedProductId, name, items }) => {
        const run = db.transaction(() => {
            const stmt = db.prepare('INSERT INTO boms (finished_product_id, name) VALUES (?, ?)');
            const info = stmt.run(finishedProductId, name);
            const bomId = info.lastInsertRowid;
            const stmtItem = db.prepare('INSERT INTO bom_items (bom_id, raw_product_id, quantity) VALUES (?, ?, ?)');
            for (const item of items) {
                stmtItem.run(bomId, item.rawProductId, item.quantity);
            }
        });
        run();
        return { success: true };
    });
    // 2. Get BOMs
    ipcMain.handle('get-boms', () => {
        return db.prepare(`
    SELECT b.id, b.name, p.name as product_name 
    FROM boms b
    JOIN products p ON b.finished_product_id = p.id
  `).all();
    });
    // 3. Execute Production (The Industrial Engine)
    ipcMain.handle('execute-production', (event, { bomId, quantity, date, refNo }) => {
        const runProduction = db.transaction(() => {
            // A. Get BOM Details
            const bom = db.prepare('SELECT * FROM boms WHERE id = ?').get(bomId);
            const ingredients = db.prepare('SELECT * FROM bom_items WHERE bom_id = ?').all(bomId);
            let totalCost = 0;
            // B. Deduct Raw Materials & Calculate Cost
            for (const item of ingredients) {
                const requiredQty = item.quantity * quantity; // Total needed for this batch
                // Get current weighted average cost of raw material
                const rawProduct = db.prepare('SELECT cost_price FROM products WHERE id = ?').get(item.raw_product_id);
                const currentCost = rawProduct ? rawProduct.cost_price : 0;
                totalCost += (currentCost * requiredQty);
                // Deduct from Stock
                db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?')
                    .run(requiredQty, item.raw_product_id);
            }
            // C. Add Finished Goods & Update Cost
            const costPerUnit = quantity > 0 ? totalCost / quantity : 0;
            // Update Finished Product Stock (Weighted Average Cost)
            // New Cost = ((OldCost * OldQty) + (NewCost * NewQty)) / (OldQty + NewQty)
            db.prepare(`
      UPDATE products 
      SET quantity = quantity + @qty,
          cost_price = ((cost_price * quantity) + (@qty * @cost)) / (quantity + @qty)
      WHERE id = @id
    `).run({ qty: quantity, cost: costPerUnit, id: bom.finished_product_id });
            // D. Log Production Order
            db.prepare(`
      INSERT INTO production_orders (ref_no, date, bom_id, quantity)
      VALUES (?, ?, ?, ?)
    `).run(refNo, date, bomId, quantity);
            // E. Accounting Entry (Inventory Transfer)
            // Dr Type: Finished Goods / Cr Type: Raw Materials
            // For now we skip specific Account IDs as we need a setup/mapping table, 
            // but logic is ready to be plugged in similar to update-check-status
        });
        try {
            runProduction();
            return { success: true };
        }
        catch (err) {
            console.error(err);
            throw new Error(err.message);
        }
    });
    // --- Dashboard Handlers ---
    // 1. Get KPIs (The Cockpit Data)
    ipcMain.handle('get-dashboard-kpis', () => {
        const today = new Date().toISOString().split('T')[0];
        // A. Today's Sales
        const sales = db.prepare(`SELECT SUM(total) as total FROM transactions t JOIN invoice_items i ON t.id = i.transaction_id WHERE t.type = 'INV' AND t.date = ?`).get(today);
        // B. Cash on Hand (Box Accounts)
        // Assuming 'Box' has a specific type or we match by name pattern for simplicity
        const cash = db.prepare(`SELECT SUM(balance) as total FROM accounts WHERE name LIKE '%(نقد)%' OR name LIKE '%الصندوق%'`).get();
        // C. Checks Under Collection
        const checks = db.prepare(`SELECT SUM(amount) as total FROM checks WHERE status = 'Deposited'`).get();
        // D. Low Stock Alerts
        const stock = db.prepare(`SELECT COUNT(*) as count FROM products WHERE quantity <= min_quantity`).get();
        return {
            sales: sales?.total || 0,
            cash: cash?.total || 0,
            checks: checks?.total || 0,
            lowStock: stock?.count || 0
        };
    });
    // 2. Get Charts Data
    ipcMain.handle('get-dashboard-charts', () => {
        // A. Cash Flow (Last 30 Days)
        // Aggregate separate Debits and Credits per day for cash accounts
        const cashFlow = db.prepare(`
    SELECT 
      t.date,
      SUM(tl.debit) as out_flow,
      SUM(tl.credit) as in_flow
    FROM transactions t
    JOIN transaction_lines tl ON t.id = tl.transaction_id
    JOIN accounts a ON tl.account_id = a.id
    WHERE (a.name LIKE '%الصندوق%' OR a.name LIKE '%البنك%')
    AND t.date >= date('now', '-30 days')
    GROUP BY t.date
    ORDER BY t.date ASC
  `).all();
        // B. Top 5 Products
        const topProducts = db.prepare(`
    SELECT p.name, SUM(ii.quantity) as qty
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    JOIN transactions t ON ii.transaction_id = t.id
    WHERE t.date >= date('now', '-30 days')
    GROUP BY p.id
    ORDER BY qty DESC
    LIMIT 5
  `).all();
        return { cashFlow, topProducts };
    });
    // --- Advanced Reports Handlers ---
    // 1. Profit & Loss (Income Statement)
    ipcMain.handle('get-report-pnl', (event, { startDate, endDate }) => {
        // Revenue: Sum of Sales Invoices
        const revenue = db.prepare(`
    SELECT SUM(total) as total 
    FROM transactions 
    WHERE type = 'INV' AND date BETWEEN @start AND @end
  `).get({ start: startDate, end: endDate })?.total || 0;
        // COGS: Sum of (Quantity * Cost) for all sold items
        // Note: This relies on cost_at_sale being captured, or we use current cost as approximation
        const cogs = db.prepare(`
    SELECT SUM(ii.quantity * p.cost_price) as total
    FROM invoice_items ii
    JOIN transactions t ON ii.transaction_id = t.id
    JOIN products p ON ii.product_id = p.id
    WHERE t.type = 'INV' AND t.date BETWEEN @start AND @end
  `).get({ start: startDate, end: endDate })?.total || 0;
        // Expenses: Sum of debits to Expense accounts (Type = 'EXPENSE')
        // We need to ensure account types are correct. For now, we assume Account Type 'Masroufat'
        const expenses = db.prepare(`
    SELECT SUM(tl.debit) as total
    FROM transaction_lines tl
    JOIN accounts a ON tl.account_id = a.id
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE a.type = 'EXPENSE' AND t.date BETWEEN @start AND @end
  `).get({ start: startDate, end: endDate })?.total || 0;
        return {
            revenue: Number(revenue),
            cogs: Number(cogs),
            grossProfit: Number(revenue) - Number(cogs),
            expenses: Number(expenses),
            netProfit: (Number(revenue) - Number(cogs)) - Number(expenses)
        };
    });
    // 2. Balance Sheet
    ipcMain.handle('get-report-balance-sheet', () => {
        // Simple aggregation by Account Type
        const assets = db.prepare("SELECT * FROM accounts WHERE type = 'ASSET'").all();
        const liabilities = db.prepare("SELECT * FROM accounts WHERE type = 'LIABILITY'").all();
        const equity = db.prepare("SELECT * FROM accounts WHERE type = 'EQUITY'").all();
        // Calculate totals
        const totalAssets = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
        const totalLiabilities = liabilities.reduce((sum, a) => sum + (a.balance || 0), 0);
        const totalEquity = equity.reduce((sum, a) => sum + (a.balance || 0), 0);
        return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
    });
    // 3. Debt Aging Report (The Collection List)
    ipcMain.handle('get-report-aging', () => {
        // Find all customers with negative balance (Debtors)
        // In our system, Debit is positive balance for assets. Wait. 
        // If Customer is Asset: Debit increases balance. So Positive Balance = Debt.
        const debtors = db.prepare("SELECT id, name, balance FROM accounts WHERE type = 'ASSET' AND name LIKE '%Customer%' AND balance > 0").all();
        // If we don't have types set up perfectly, we might need a better query.
        // Fallback: Get all accounts with positive balance that are NOT Banks/Cash.
        // For proper aging, we need to look at OPEN Invoices. 
        // Simplified Logic: We will take the total balance and try to match it against recent invoices to guess the "age".
        // Real "FIFO" allocation is complex. 
        // Hack: We'll fetch the last few invoices for each debtor to see when they bought stuff.
        const report = debtors.map(customer => {
            const invoices = db.prepare(`
      SELECT date, total 
      FROM transactions 
      WHERE description LIKE ? AND type = 'INV'
      ORDER BY date DESC
    `).all(`%${customer.name}%`); // Loose link by name if ID link missing
            // Allocate balance to buckets
            let remainingDebt = customer.balance;
            const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
            const today = new Date();
            // Iterate invoices (newest first) to match debt
            for (const inv of invoices) {
                if (remainingDebt <= 0)
                    break;
                const invDate = new Date(inv.date);
                const diffTime = Math.abs(today.getTime() - invDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const amount = Math.min(remainingDebt, inv.total);
                if (diffDays <= 30)
                    buckets['0-30'] += amount;
                else if (diffDays <= 60)
                    buckets['31-60'] += amount;
                else if (diffDays <= 90)
                    buckets['61-90'] += amount;
                else
                    buckets['90+'] += amount;
                remainingDebt -= amount;
            }
            // If there is still debt not matched to invoices (e.g. Opening Balance), put it in 90+
            if (remainingDebt > 0)
                buckets['90+'] += remainingDebt;
            return { ...customer, buckets };
        });
        return report;
    });
    // --- Licensing & Security Handlers ---
    // 1. Get Machine Fingerprint
    ipcMain.handle('get-machine-id', async () => {
        return new Promise((resolve) => {
            // Windows command to get UUID
            require('child_process').exec('wmic csproduct get uuid', (err, stdout) => {
                if (err) {
                    resolve('UNKNOWN-ID');
                }
                else {
                    // Parse output: "UUID \n E442... "
                    const lines = stdout.toString().split('\n');
                    const uuid = lines[1] ? lines[1].trim() : 'UNKNOWN-ID';
                    resolve(uuid);
                }
            });
        });
    });
    // 2. Validate License
    ipcMain.handle('validate-license', () => {
        const license = db.prepare("SELECT value FROM settings WHERE key = 'license_key'").get();
        if (!license)
            return { status: 'unlicensed' };
        // In a real app, verify the hash. Here we just check if it exists.
        return { status: 'active', key: license.value };
    });
    // 3. Activate Product
    ipcMain.handle('activate-product', (event, key) => {
        // Simple check: Key must start with "WAFI-"
        if (!key.startsWith("WAFI-"))
            throw new Error("مفتاح غير صالح");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_key', ?)").run(key);
        return { success: true };
    });
    // 4. Get System Settings
    ipcMain.handle('get-settings', () => {
        const rows = db.prepare("SELECT * FROM settings").all();
        // Convert to object
        return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    });
    // 5. Save Settings
    ipcMain.handle('save-settings', (event, settings) => {
        const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        const runTransaction = db.transaction((settingsObj) => {
            for (const [key, value] of Object.entries(settingsObj)) {
                insert.run(key, String(value));
            }
        });
        runTransaction(settings);
        return { success: true };
    });
    // --- Receipt Voucher Handler ---
    ipcMain.handle('save-receipt-voucher', (event, data) => {
        const { header, details, checks } = data;
        const runTransaction = db.transaction(() => {
            // 1. Insert Header
            const stmtHeader = db.prepare(`
      INSERT INTO receipt_vouchers (voucher_number, date, payer_account_id, description, total_amount)
      VALUES (@voucher_number, @date, @payer_account_id, @description, @total_amount)
    `);
            const info = stmtHeader.run({
                voucher_number: header.voucher_number || `RV-${Date.now()}`,
                date: header.date,
                payer_account_id: header.payer_account_id,
                description: header.description,
                total_amount: header.total_amount
            });
            const voucherId = info.lastInsertRowid;
            // 2. Insert Details & Prepare JE Debits
            const stmtDetail = db.prepare(`
      INSERT INTO receipt_voucher_details (voucher_id, payment_method, account_id, amount, reference)
      VALUES (@voucher_id, @payment_method, @account_id, @amount, @reference)
    `);
            let jeLines = [];
            let totalDebit = 0;
            // Process Cash/Bank Details
            for (const detail of details) {
                stmtDetail.run({
                    voucher_id: voucherId,
                    payment_method: detail.payment_method,
                    account_id: detail.account_id,
                    amount: detail.amount,
                    reference: detail.reference || ''
                });
                // Add to JE (Debit the Fund/Bank)
                jeLines.push({
                    account_id: detail.account_id,
                    debit: detail.amount,
                    credit: 0
                });
                totalDebit += detail.amount;
            }
            // Process Checks
            if (checks && checks.length > 0) {
                // Find "Checks Under Collection" Account ID. For now assuming a code or passing it. 
                // In a real app we'd look it up. Let's assume code '1141' (Checks in Box) from COA we just seeded.
                const checksAccount = db.prepare("SELECT id FROM accounts WHERE code = '1141'").get();
                const checksAccountId = checksAccount ? checksAccount.id : 0; // Fallback?
                const stmtCheck = db.prepare(`
        INSERT INTO checks (check_number, bank_name, amount, due_date, status, type, voucher_id, drawer_name, currency)
        VALUES (@check_number, @bank_name, @amount, @due_date, 'IN_FUND', 'IN', @voucher_id, @drawer_name, 'ILS')
      `);
                let totalChecks = 0;
                for (const check of checks) {
                    stmtCheck.run({
                        check_number: check.check_number,
                        bank_name: check.bank_name,
                        amount: check.amount,
                        due_date: check.due_date,
                        voucher_id: voucherId,
                        drawer_name: header.payer_name // Assuming drawer is payer
                    });
                    // Add Detail record for check too
                    stmtDetail.run({
                        voucher_id: voucherId,
                        payment_method: 'CHECK',
                        account_id: checksAccountId,
                        amount: check.amount,
                        reference: check.check_number
                    });
                    totalChecks += check.amount;
                }
                if (totalChecks > 0 && checksAccountId) {
                    jeLines.push({
                        account_id: checksAccountId,
                        debit: totalChecks,
                        credit: 0
                    });
                    totalDebit += totalChecks;
                }
            }
            // 3. Create Journal Entry (Full)
            // Credit the Payer (Customer)
            jeLines.push({
                account_id: header.payer_account_id,
                debit: 0,
                credit: totalDebit // Should match header.total_amount
            });
            const jeStmtHeader = db.prepare(`
      INSERT INTO transactions (type, ref_no, date, description)
      VALUES ('RECEIPT', @ref_no, @date, @description)
    `);
            const jeInfo = jeStmtHeader.run({
                ref_no: header.voucher_number || `RV-${Date.now()}`,
                date: header.date,
                description: `سند قبض: ${header.description}`
            });
            const transactionId = jeInfo.lastInsertRowid;
            const jeStmtLine = db.prepare(`
      INSERT INTO transaction_lines (transaction_id, account_id, debit, credit)
      VALUES (@transaction_id, @account_id, @debit, @credit)
    `);
            for (const line of jeLines) {
                jeStmtLine.run({
                    transaction_id: transactionId,
                    account_id: line.account_id,
                    debit: line.debit,
                    credit: line.credit
                });
                // Update Account Balance
                db.prepare(`
        UPDATE accounts 
        SET balance = balance + (@debit - @credit) 
        WHERE id = @id
      `).run({ debit: line.debit, credit: line.credit, id: line.account_id });
            }
        });
        try {
            runTransaction();
            return { success: true };
        }
        catch (err) {
            throw new Error("فشل حفظ السند: " + err.message);
        }
    });
    // --- Data Migration Handlers ---
    // 1. Bulk Import (The Bridge)
    ipcMain.handle('import-data', (event, { type, data }) => {
        // data is an array of objects from Excel/CSV
        const runImport = db.transaction(() => {
            if (type === 'products') {
                const stmt = db.prepare(`
        INSERT OR IGNORE INTO products (barcode, name, cost_price, sell_price, quantity) 
        VALUES (@barcode, @name, @cost_price, @sell_price, @quantity)
      `);
                for (const row of data) {
                    if (row.name)
                        stmt.run({
                            barcode: row.barcode || `GEN-${Date.now()}-${Math.random()}`,
                            name: row.name,
                            cost_price: row.cost || 0,
                            sell_price: row.price || 0,
                            quantity: row.quantity || 0
                        });
                }
            }
            else if (type === 'customers') {
                const stmt = db.prepare(`
        INSERT OR IGNORE INTO accounts (code, name, type, balance) 
        VALUES (@code, @name, 'ASSET', @balance)
      `);
                for (const row of data) {
                    if (row.name)
                        stmt.run({
                            code: row.code || `CUST-${Date.now()}-${Math.random()}`,
                            name: row.name,
                            balance: row.balance || 0
                        });
                }
            }
        });
        try {
            runImport();
            return { success: true, count: data.length };
        }
        catch (err) {
            throw new Error("فشل الاستيراد: " + err.message);
        }
    });
}; // End of registerIPCHandlers
const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    // Load the app
    mainWindow.loadURL('http://localhost:4567');
};
app.on('ready', () => {
    // Initialize DB schema
    const dbPath = path.join(app.getPath('userData'), 'wafi.db');
    initDB(dbPath);
    // Register IPC handlers
    registerIPCHandlers();
    createWindow();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
