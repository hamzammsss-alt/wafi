import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { JournalService } from './JournalService';
import { InventoryService } from './InventoryService';

export class SalesService {

    // --- Invoice Operations ---
    // --- Invoice Operations ---
    static createInvoice(invoice: any) {
        // Invoice Data Structure:
        // { header: { customer_id, branch_id, manual_ref, cost_center_id, ... }, lines: [ ... ] }

        const { header, lines } = invoice;
        const invoiceId = uuidv4();

        // 0. Self-Heal Schema (Add missing columns)
        try {
            const cols = db.prepare("PRAGMA table_info(sales_invoices)").all();
            if (!cols.some((c: any) => c.name === 'manual_ref')) {
                db.prepare("ALTER TABLE sales_invoices ADD COLUMN manual_ref TEXT").run();
            }
            if (!cols.some((c: any) => c.name === 'cost_center_id')) {
                db.prepare("ALTER TABLE sales_invoices ADD COLUMN cost_center_id TEXT").run();
            }
        } catch (e) {
            console.error("Schema heal failed", e);
        }

        // Generate unique Invoice No (Self-Healing)
        let invoiceNo = header.invoice_no;
        if (!invoiceNo || invoiceNo === 'NEW') {
            invoiceNo = JournalService.getNextVoucherNo('INV');
            let retries = 0;
            while (db.prepare('SELECT 1 FROM sales_invoices WHERE invoice_no = ?').get(invoiceNo)) {
                JournalService.incrementVoucherNo('INV');
                invoiceNo = JournalService.getNextVoucherNo('INV');
                retries++;
                if (retries > 1000) throw new Error("Failed to generate unique Invoice No after 1000 attempts");
            }
        }

        // Resolve Branch (Fallback logic)
        let branchId = header.branch_id;
        if (!branchId || branchId === 'MAIN') {
            const main = db.prepare("SELECT id FROM branches WHERE is_main = 1").get();
            if (main) branchId = main.id;
            else {
                const any = db.prepare("SELECT id FROM branches LIMIT 1").get();
                if (any) branchId = any.id;
                else {
                    const newId = uuidv4();
                    db.prepare("INSERT INTO branches (id, name, is_main) VALUES (?, 'Main Branch', 1)").run(newId);
                    branchId = newId;
                }
            }
        }

        // 1. Validate
        if (!header.customer_id || lines.length === 0) throw new Error("Invalid invoice data");

        // Start Transaction
        const runTx = db.transaction(() => {

            // 2. Create Journal Entry (Financial Impact)
            // Debit: Customer (AR)
            // Credit: Sales Revenue
            // Credit: VAT Out

            // We need to fetch Customer's Linked Account
            const customer = db.prepare('SELECT linked_account_id, name_ar FROM business_partners WHERE id = ?').get(header.customer_id);
            if (!customer || !customer.linked_account_id) throw new Error("Customer has no linked account");

            // Calculate Totals for Journal
            const subtotal = lines.reduce((sum: number, l: any) => sum + (l.quantity * l.unit_price), 0);
            const vatTotal = lines.reduce((sum: number, l: any) => sum + (l.tax_amount || 0), 0);
            const grandTotal = subtotal + vatTotal; // Logic simplification (ignoring discount for now)

            // Create Journal Header
            const journalResult = JournalService.createJournalEntry({
                voucher_type: 'Sales Invoice',
                date: header.date,
                reference_no: invoiceNo,
                description: `فاتورة مبيعات - ${customer.name_ar} ${header.manual_ref ? `(${header.manual_ref})` : ''}`,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                status: 'POSTED',
                branch_id: branchId
            }, [
                // DEBIT: Customer
                {
                    account_id: customer.linked_account_id,
                    debit: grandTotal,
                    credit: 0,
                    line_description: `فاتورة مبيعات رقم ${invoiceNo}`,
                    cost_center_id: header.cost_center_id
                },
                // CREDIT: Sales (Account 4101 - General Sales - Should effectively be dynamic per item or global setting)
                // For prototype: Hardcoded or Fetched helper
                {
                    account_id: SalesService.getSalesAccount(),
                    debit: 0,
                    credit: subtotal,
                    line_description: `مبيعات`,
                    cost_center_id: header.cost_center_id
                },
                // CREDIT: VAT (Account 213 - Output VAT)
                ...(vatTotal > 0 ? [{
                    account_id: SalesService.getVATAccount(),
                    debit: 0,
                    credit: vatTotal,
                    line_description: `ضريبة مبيعات`,
                    cost_center_id: header.cost_center_id
                }] : [])
            ]);

            if (!journalResult.success) throw new Error("Failed to create journal entry");

            // 3. Save Invoice Header
            db.prepare(`
                INSERT INTO sales_invoices (
                    id, invoice_no, customer_id, branch_id, warehouse_id, date, due_date,
                    subtotal, tax_total, grand_total, currency_id, exchange_rate,
                    status, payment_status, journal_header_id, created_by,
                    manual_ref, cost_center_id
                ) VALUES (
                    @id, @no, @custId, @branchId, @whId, @date, @dueDate,
                    @sub, @tax, @grand, @curr, @rate,
                    'POSTED', 'UNPAID', @journalId, @user,
                    @manual_ref, @cost_center_id
                )
            `).run({
                id: invoiceId, no: invoiceNo, custId: header.customer_id, branchId: branchId, whId: header.warehouse_id,
                date: header.date, dueDate: header.due_date,
                sub: subtotal, tax: vatTotal, grand: grandTotal,
                curr: header.currency_id, rate: header.exchange_rate,
                journalId: journalResult.id, user: 'System',
                manual_ref: header.manual_ref || null,
                cost_center_id: header.cost_center_id || null
            });

            // 4. Save Lines & Update Stock
            const insertLine = db.prepare(`
                INSERT INTO sales_invoice_lines (
                    id, invoice_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, tax_amount, net_total
                ) VALUES (
                    @id, @invId, @itemId, @desc, @qty, @unitId,
                    @price, @total, @tax, @net
                )
            `);

            for (const line of lines) {
                // Insert Line
                insertLine.run({
                    id: uuidv4(),
                    invId: invoiceId,
                    itemId: line.item_id,
                    desc: line.description,
                    qty: line.quantity,
                    unitId: line.unit_id,
                    price: line.unit_price,
                    total: line.quantity * line.unit_price,
                    tax: line.tax_amount || 0,
                    net: (line.quantity * line.unit_price) + (line.tax_amount || 0)
                });

                // Get current stock cost (Weighted Average or Standard)
                const stockInfo = InventoryService.getStock(line.item_id, header.warehouse_id);
                // @ts-ignore
                const cost = stockInfo.avg_cost || 0;

                // Update Stock (OUT) with Cost for History
                InventoryService.updateStock(
                    line.item_id,
                    line.quantity,
                    'OUT',
                    invoiceNo,
                    `Sales Invoice`,
                    cost, // Pass the cost to inventory transaction
                    header.warehouse_id
                );
            }
        });

        runTx();
        return { success: true, id: invoiceId, invoice_no: invoiceNo };
    }

    // --- Helpers (Mocking Configuration) ---
    static getSalesAccount() {
        // In real app, fetch from Settings or Item Category
        const acc = db.prepare("SELECT id FROM accounts WHERE code = '4101'").get(); // General Sales
        return acc ? acc.id : 'UNKNOWN_SALES_ACC';
    }

    static getVATAccount() {
        // Output VAT
        // We'll search for it or fallback
        const acc = db.prepare("SELECT id FROM accounts WHERE name LIKE '%مخرجات%' OR name LIKE '%Output%'").get();
        return acc ? acc.id : '';
    }

    static getNextInvoiceNumber() {
        // Use JournalService Counter Logic or custom
        return JournalService.getNextVoucherNo('INV');
    }

    static getInvoice(idOrNo: string) {
        // Try searching by ID first, then by No
        let header = db.prepare(`
            SELECT i.*, c.name_ar as customer_name, c.payment_term_days
            FROM sales_invoices i
            LEFT JOIN business_partners c ON i.customer_id = c.id
            WHERE i.id = ?
        `).get(idOrNo);

        if (!header) {
            header = db.prepare(`
                SELECT i.*, c.name_ar as customer_name, c.payment_term_days
                FROM sales_invoices i
                LEFT JOIN business_partners c ON i.customer_id = c.id
                WHERE i.invoice_no = ?
            `).get(idOrNo);
        }

        if (!header) return null;

        const lines = db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code
            FROM sales_invoice_lines l
            LEFT JOIN items i ON l.item_id = i.id
            WHERE l.invoice_id = ?
        `).all(header.id);

        return { header, lines };
    }

    static getInvoices() {
        return db.prepare(`
            SELECT i.*, c.name_ar as customer_name 
            FROM sales_invoices i
            LEFT JOIN business_partners c ON i.customer_id = c.id
            ORDER BY i.created_at DESC
        `).all();
    }
    // --- Quotations ---
    static createQuotation(data: any) {
        const { header, lines } = data;
        const id = uuidv4();
        // Generate unique Quotation No (Self-Healing)
        let no = header.quotation_no;
        if (!no) {
            no = JournalService.getNextVoucherNo('QT');
            let retries = 0;
            // Loop until we find a gap or synchronization
            while (db.prepare('SELECT 1 FROM sales_quotations WHERE quotation_no = ?').get(no)) {
                // Counter is lagging behind actual data, force push it forward
                JournalService.incrementVoucherNo('QT');
                no = JournalService.getNextVoucherNo('QT');
                retries++;
                if (retries > 1000) throw new Error("Failed to generate unique Quotation No after 1000 attempts");
            }
        }

        // Resolve Branch (Fallback logic)
        let branchId = header.branch_id;
        if (!branchId || branchId === 'MAIN') {
            // Try getting Main branch
            const main = db.prepare("SELECT id FROM branches WHERE is_main = 1").get();
            if (main) branchId = main.id;
            else {
                const any = db.prepare("SELECT id FROM branches LIMIT 1").get();
                if (any) branchId = any.id;
                else {
                    // Create a default branch if absolutely none exist
                    const newId = uuidv4();
                    db.prepare("INSERT INTO branches (id, name, is_main) VALUES (?, 'Main Branch', 1)").run(newId);
                    branchId = newId;
                }
            }
        }

        const runTx = db.transaction(() => {
            db.prepare(`
                INSERT INTO sales_quotations (
                    id, quotation_no, customer_id, branch_id, date, expiry_date,
                    subtotal, tax_total, discount_total, grand_total,
                    currency_id, exchange_rate, status, notes
                ) VALUES (
                    @id, @no, @custId, @branchId, @date, @expiry,
                    @sub, @tax, @disc, @grand,
                    @curr, @rate, 'DRAFT', @notes
                )
            `).run({
                id, no, custId: header.customer_id, branchId: branchId,
                date: header.date, expiry: header.expiry_date || header.due_date,
                sub: header.subtotal || 0, tax: header.tax_total || 0,
                disc: header.discount_total || 0, grand: header.grand_total || 0,
                curr: header.currency_id, rate: header.exchange_rate, notes: header.notes
            });

            const insertLine = db.prepare(`
                INSERT INTO sales_quotation_lines (
                    id, quotation_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, discount_amount, tax_amount, net_total
                ) VALUES (
                    @id, @qid, @itemId, @desc, @qty, @unitId,
                    @price, @total, @disc, @tax, @net
                )
            `);

            for (const line of lines) {
                insertLine.run({
                    id: uuidv4(), qid: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id,
                    price: line.unit_price, total: line.total_price,
                    disc: line.discount_amount || 0, tax: line.tax_amount || 0, net: line.net_total
                });
            }

            // Increment Counter
            JournalService.incrementVoucherNo('QT');
        });

        runTx();
        return { success: true, id, quotation_no: no };
    }

    static getQuotations() {
        return db.prepare(`
            SELECT q.*, c.name_ar as customer_name 
            FROM sales_quotations q
            LEFT JOIN business_partners c ON q.customer_id = c.id
            ORDER BY q.created_at DESC
        `).all();
    }

    static getQuotation(id: string) {
        const header = db.prepare(`
            SELECT q.*, c.name_ar as customer_name, c.payment_term_days 
            FROM sales_quotations q
            LEFT JOIN business_partners c ON q.customer_id = c.id
            WHERE q.id = ?
        `).get(id);

        if (!header) return null;

        const lines = db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code
            FROM sales_quotation_lines l
            LEFT JOIN items i ON l.item_id = i.id
            WHERE l.quotation_id = ?
        `).all(id);

        return { header, lines };
    }

    static updateQuotationStatus(id: string, status: string) {
        return db.prepare('UPDATE sales_quotations SET status = ? WHERE id = ?').run(status, id);
    }

    static deleteQuotation(id: string) {
        // Only allow delete if DRAFT
        const q = db.prepare('SELECT status FROM sales_quotations WHERE id = ?').get(id);
        if (q && q.status !== 'DRAFT') throw new Error("Cannot delete non-draft quotation");

        db.prepare('DELETE FROM sales_quotations WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Sales Orders ---
    static createOrder(data: any) {
        const { header, lines } = data;
        const id = uuidv4();
        // Generate unique Order No (Self-Healing)
        let no = header.order_no;
        if (!no) {
            no = JournalService.getNextVoucherNo('SO');
            let retries = 0;
            // Loop until we find a gap or synchronization
            while (db.prepare('SELECT 1 FROM sales_orders WHERE order_no = ?').get(no)) {
                // Counter is lagging behind actual data, force push it forward
                JournalService.incrementVoucherNo('SO');
                no = JournalService.getNextVoucherNo('SO');
                retries++;
                if (retries > 1000) throw new Error("Failed to generate unique Order No after 1000 attempts");
            }
        }

        // Resolve Branch (Fallback logic)
        let branchId = header.branch_id;
        if (!branchId || branchId === 'MAIN') {
            // Try getting Main branch
            const main = db.prepare("SELECT id FROM branches WHERE is_main = 1").get();
            if (main) branchId = main.id;
            else {
                const any = db.prepare("SELECT id FROM branches LIMIT 1").get();
                if (any) branchId = any.id;
                else {
                    // Create a default branch if absolutely none exist
                    const newId = uuidv4();
                    db.prepare("INSERT INTO branches (id, name, is_main) VALUES (?, 'Main Branch', 1)").run(newId);
                    branchId = newId;
                }
            }
        }

        const runTx = db.transaction(() => {
            db.prepare(`
                INSERT INTO sales_orders (
                    id, order_no, quotation_id, customer_id, branch_id, warehouse_id,
                    date, delivery_date, subtotal, tax_total, discount_total, grand_total,
                    currency_id, status, notes
                ) VALUES (
                    @id, @no, @qid, @custId, @branchId, @whId,
                    @date, @delDate, @sub, @tax, @disc, @grand,
                    @curr, @status, @notes
                )
            `).run({
                id, no, qid: header.quotation_id, custId: header.customer_id,
                branchId: header.branch_id, whId: header.warehouse_id,
                date: header.date, delDate: header.delivery_date,
                sub: header.subtotal || 0, tax: header.tax_total || 0,
                disc: header.discount_total || 0, grand: header.grand_total || 0,
                curr: header.currency_id, status: header.status || 'CONFIRMED', notes: header.notes
            });

            const insertLine = db.prepare(`
                INSERT INTO sales_order_lines (
                    id, order_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, discount_amount, tax_amount, net_total
                ) VALUES (
                    @id, @oid, @itemId, @desc, @qty, @unitId,
                    @price, @total, @disc, @tax, @net
                )
            `);

            for (const line of lines) {
                insertLine.run({
                    id: uuidv4(), oid: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id,
                    price: line.unit_price, total: line.total_price,
                    disc: line.discount_amount || 0, tax: line.tax_amount || 0, net: line.net_total
                });
            }

            // Increment Counter
            JournalService.incrementVoucherNo('SO');

            // If linked to quotation, update status
            if (header.quotation_id) {
                db.prepare("UPDATE sales_quotations SET status = 'CONVERTED' WHERE id = ?").run(header.quotation_id);
            }
        });

        runTx();
        return { success: true, id, order_no: no };
    }

    static getOrders() {
        return db.prepare(`
            SELECT o.*, c.name_ar as customer_name 
            FROM sales_orders o
            LEFT JOIN business_partners c ON o.customer_id = c.id
            ORDER BY o.created_at DESC
        `).all();
    }

    static getOrder(id: string) {
        const header = db.prepare(`
            SELECT o.*, c.name_ar as customer_name 
            FROM sales_orders o
            LEFT JOIN business_partners c ON o.customer_id = c.id
            WHERE o.id = ?
        `).get(id);

        if (!header) return null;

        const lines = db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code
            FROM sales_order_lines l
            LEFT JOIN items i ON l.item_id = i.id
            WHERE l.order_id = ?
        `).all(id);

        return { header, lines };
    }

    static updateOrderStatus(id: string, status: string) {
        return db.prepare('UPDATE sales_orders SET status = ? WHERE id = ?').run(status, id);
    }

    static deleteOrder(id: string) {
        const o = db.prepare('SELECT status FROM sales_orders WHERE id = ?').get(id);
        if (o && o.status !== 'DRAFT' && o.status !== 'CONFIRMED') throw new Error("Cannot delete processed order");
        db.prepare('DELETE FROM sales_orders WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Sales Returns ---
    static createReturn(data: any) {
        const { header, lines } = data;
        const id = uuidv4();

        // Generate unique Return No (Self-Healing)
        let no = header.return_no;
        if (!no) {
            no = JournalService.getNextVoucherNo('SR');
            let retries = 0;
            while (db.prepare('SELECT 1 FROM sales_returns WHERE return_no = ?').get(no)) {
                JournalService.incrementVoucherNo('SR');
                no = JournalService.getNextVoucherNo('SR');
                retries++;
                if (retries > 1000) throw new Error("Failed to generate unique Return No after 1000 attempts");
            }
        }

        // 1. Validate
        if (!header.customer_id || lines.length === 0) throw new Error("Invalid return data");

        const runTx = db.transaction(() => {
            // 2. Create Journal Entry (Financial Impact)
            // Debit: Sales Returns (Contra Revenue)
            // Debit: VAT Output (Decrease Liability)
            // Credit: Customer (Decrease AR)

            const customer = db.prepare('SELECT linked_account_id, name_ar FROM business_partners WHERE id = ?').get(header.customer_id);
            // Relaxed check for linked_account_id failure in prototype? No, strict is better.
            const customerAccountId = customer?.linked_account_id;

            if (!customerAccountId) throw new Error("Customer has no linked account");

            // Calculate Totals
            const subtotal = lines.reduce((sum: number, l: any) => sum + (l.quantity * l.unit_price), 0);
            const vatTotal = lines.reduce((sum: number, l: any) => sum + (l.tax_amount || 0), 0);
            const grandTotal = subtotal + vatTotal;

            const journalResult = JournalService.createJournalEntry({
                voucher_type: 'Sales Return',
                date: header.date,
                reference_no: no,
                description: `مردودات مبيعات - ${customer.name_ar}`,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                status: 'POSTED',
                branch_id: header.branch_id
            }, [
                // DEBIT: Sales Returns (Use Sales Account for now or find specific)
                {
                    account_id: this.getSalesReturnAccount(),
                    debit: subtotal,
                    credit: 0,
                    line_description: `مردودات مبيعات`
                },
                // DEBIT: VAT (Account 213 - Output VAT) - Reducing Liability
                ...(vatTotal > 0 ? [{
                    account_id: this.getVATAccount(),
                    debit: vatTotal,
                    credit: 0,
                    line_description: `ضريبة مبيعات (مردود)`
                }] : []),
                // CREDIT: Customer
                {
                    account_id: customerAccountId,
                    debit: 0,
                    credit: grandTotal,
                    line_description: `مردود مبيعات رقم ${no}`
                }
            ]);

            if (!journalResult.success) throw new Error("Failed to create journal entry");

            // 3. Save Header
            db.prepare(`
                INSERT INTO sales_returns (
                    id, return_no, invoice_id, customer_id, branch_id, warehouse_id, date,
                    subtotal, tax_total, grand_total, currency_id, exchange_rate,
                    status, journal_header_id, notes
                ) VALUES (
                    @id, @no, @invId, @custId, @branchId, @whId, @date,
                    @sub, @tax, @grand, @curr, @rate,
                    'POSTED', @journalId, @notes
                )
            `).run({
                id, no, invId: header.invoice_id || null, custId: header.customer_id,
                branchId: header.branch_id, whId: header.warehouse_id, date: header.date,
                sub: subtotal, tax: vatTotal, grand: grandTotal,
                curr: header.currency_id, rate: header.exchange_rate || 1,
                journalId: journalResult.id, notes: header.notes
            });

            // 4. Save Lines & Update Stock (IN)
            const insertLine = db.prepare(`
                INSERT INTO sales_return_lines (
                    id, return_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, tax_amount, net_total
                ) VALUES (
                    @id, @rid, @itemId, @desc, @qty, @unitId,
                    @price, @total, @tax, @net
                )
            `);

            for (const line of lines) {
                insertLine.run({
                    id: uuidv4(), rid: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id,
                    price: line.unit_price, total: line.quantity * line.unit_price,
                    tax: line.tax_amount || 0, net: (line.quantity * line.unit_price) + (line.tax_amount || 0)
                });

                // Update Stock (IN)
                InventoryService.updateStock(
                    line.item_id,
                    line.quantity,
                    'IN', // Return brings stock back
                    no,
                    `Sales Return`,
                    0, // Cost irrelevant for IN update logic usually unless Weighted Avg
                    header.warehouse_id
                );
            }
        });

        runTx();
        return { success: true, id, return_no: no };
    }

    static getReturns() {
        return db.prepare(`
            SELECT r.*, c.name_ar as customer_name 
            FROM sales_returns r
            LEFT JOIN business_partners c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        `).all();
    }

    static getReturn(id: string) {
        const header = db.prepare(`
            SELECT r.*, c.name_ar as customer_name, c.address, c.phone
            FROM sales_returns r
            LEFT JOIN business_partners c ON r.customer_id = c.id
            WHERE r.id = ?
        `).get(id);

        if (!header) return null;

        const lines = db.prepare(`
            SELECT l.*, i.name_ar as item_name, u.name_ar as unit_name
            FROM sales_return_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON l.unit_id = u.id
            WHERE l.return_id = ?
        `).all(id);

        return { header, lines };
    }

    static getSalesReturnAccount() {
        // Ideally distinct account. Fallback to Sales (4101) but mocked here.
        // We'll try to find 'Sales Returns' or use 4101
        const acc = db.prepare("SELECT id FROM accounts WHERE name LIKE '%Returns%' AND type = 'Revenue'").get();
        if (acc) return acc.id;
        return this.getSalesAccount(); // Fallback
    }
}
