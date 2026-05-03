"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
const InventoryService_1 = require("./InventoryService");
const JournalService_1 = require("./JournalService");
class PurchaseService {
    static ensureWorkflowColumns() {
        try {
            // Apply PR workflow columns
            const prCols = database_1.db.prepare("PRAGMA table_info(purchase_requests)").all();
            if (!prCols.some(c => c.name === 'posted_at')) {
                database_1.db.prepare("ALTER TABLE purchase_requests ADD COLUMN posted_at DATETIME").run();
                database_1.db.prepare("ALTER TABLE purchase_requests ADD COLUMN posted_by TEXT").run();
                database_1.db.prepare("ALTER TABLE purchase_requests ADD COLUMN approved_at DATETIME").run();
                database_1.db.prepare("ALTER TABLE purchase_requests ADD COLUMN approved_by TEXT").run();
                database_1.db.prepare("ALTER TABLE purchase_requests ADD COLUMN rejected_at DATETIME").run();
                database_1.db.prepare("ALTER TABLE purchase_requests ADD COLUMN rejected_by TEXT").run();
                database_1.db.prepare("ALTER TABLE purchase_requests ADD COLUMN rejected_reason TEXT").run();
            }
            // Apply PO workflow columns
            const poCols = database_1.db.prepare("PRAGMA table_info(purchase_orders)").all();
            if (!poCols.some(c => c.name === 'posted_at')) {
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN posted_at DATETIME").run();
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN posted_by TEXT").run();
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN approved_at DATETIME").run();
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN approved_by TEXT").run();
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN rejected_at DATETIME").run();
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN rejected_by TEXT").run();
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN rejected_reason TEXT").run();
            }
            if (!poCols.some(c => c.name === 'warehouse_id')) {
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN warehouse_id TEXT").run();
            }
            if (!poCols.some(c => c.name === 'request_id')) {
                database_1.db.prepare("ALTER TABLE purchase_orders ADD COLUMN request_id TEXT").run();
            }
            // Apply PO Lines expansions
            const poLineCols = database_1.db.prepare("PRAGMA table_info(purchase_order_lines)").all();
            if (!poLineCols.some(c => c.name === 'description')) {
                database_1.db.prepare("ALTER TABLE purchase_order_lines ADD COLUMN description TEXT").run();
                database_1.db.prepare("ALTER TABLE purchase_order_lines ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0").run();
                database_1.db.prepare("ALTER TABLE purchase_order_lines ADD COLUMN received_qty REAL NOT NULL DEFAULT 0").run();
                database_1.db.prepare("ALTER TABLE purchase_order_lines ADD COLUMN invoiced_qty REAL NOT NULL DEFAULT 0").run();
            }
        }
        catch (e) {
            console.error("Purchase Workflow Schema heal failed", e);
        }
    }
    static createInvoice(data) {
        const { header, lines } = data;
        // 0. Self-Heal Schema (Add missing columns)
        try {
            const cols = database_1.db.prepare("PRAGMA table_info(purchase_invoices)").all();
            if (!cols.some((c) => c.name === 'manual_ref')) {
                database_1.db.prepare("ALTER TABLE purchase_invoices ADD COLUMN manual_ref TEXT").run();
            }
            if (!cols.some((c) => c.name === 'cost_center_id')) {
                database_1.db.prepare("ALTER TABLE purchase_invoices ADD COLUMN cost_center_id TEXT").run();
            }
        }
        catch (e) {
            console.error("Schema heal failed", e);
        }
        if (!header.supplier_id || lines.length === 0) {
            throw new Error("بيانات الفاتورة غير مكتملة");
        }
        if (header.is_clearing_invoice) {
            if (!header.clearing_dealer_number || !header.clearing_hebrew_name) {
                throw new Error("بيانات فاتورة المقاصة ناقصة (رقم المشتغل أو الاسم العبري)");
            }
        }
        // 1. Prepare Data
        const invoiceId = (0, uuid_1.v4)();
        let invoiceNo = header.invoice_no;
        if (invoiceNo === 'NEW' || !invoiceNo) {
            invoiceNo = JournalService_1.JournalService.getNextVoucherNo('PINV');
        }
        const transaction = database_1.db.transaction(() => {
            // 2. Financial Entry (Journal)
            // Determine Purchase Account Type
            let purchaseAccount = '';
            if (header.shipment_id) {
                // Import Invoice -> Goods In Transit
                purchaseAccount = this.getGoodsInTransitAccount();
            }
            else {
                // Local/Clearing -> Standard Purchases/Inventory
                purchaseAccount = this.getPurchaseAccount();
            }
            const vatAccount = this.getInputVATAccount();
            // Fetch Supplier Name for Description
            const supplier = database_1.db.prepare('SELECT name_ar, linked_account_id FROM business_partners WHERE id = ?').get(header.supplier_id);
            const supplierAccount = supplier?.linked_account_id || this.getSupplierAccount(header.supplier_id);
            const totalAmount = header.grand_total || 0; // Credit Supplier
            const vatAmount = header.tax_total || 0; // Debit VAT
            const netAmount = header.subtotal || 0; // Debit Purchases/GIT
            const journalLines = [
                // Debit: Purchases or Goods In Transit
                {
                    account_id: purchaseAccount,
                    debit: netAmount,
                    credit: 0,
                    line_description: header.shipment_id
                        ? `Import Goods - Shipment #${header.shipment_id}`
                        : `Purchase Invoice #${invoiceNo} - Net`,
                    cost_center_id: header.cost_center_id
                },
                // Debit: VAT (if any)
                ...(vatAmount > 0 ? [{
                        account_id: vatAccount,
                        debit: vatAmount,
                        credit: 0,
                        line_description: `VAT Input - Inv #${invoiceNo}`,
                        cost_center_id: header.cost_center_id
                    }] : []),
                // Credit: Supplier
                {
                    account_id: supplierAccount,
                    debit: 0,
                    credit: totalAmount,
                    line_description: `Purchase Invoice #${invoiceNo}`,
                    cost_center_id: header.cost_center_id
                }
            ];
            const journalResult = JournalService_1.JournalService.createJournalEntry({
                voucher_type: 'Purchase Invoice',
                date: header.date,
                reference_no: invoiceNo,
                description: `فاتورة مشتريات - ${supplier?.name_ar || ''} ${header.manual_ref ? `(${header.manual_ref})` : ''}`,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                status: 'POSTED',
                branch_id: header.branch_id
            }, journalLines);
            // 3. Save Header
            database_1.db.prepare(`
                INSERT INTO purchase_invoices (
                    id, invoice_no, vendor_invoice_no, supplier_id, branch_id, warehouse_id,
                    date, due_date, currency_id, exchange_rate, 
                    subtotal, tax_total, discount_total, grand_total,
                    status, journal_header_id, created_by,
                    is_clearing_invoice, clearing_dealer_number, clearing_hebrew_name, clearing_original_date,
                    shipment_id, manual_ref, cost_center_id
                ) VALUES (
                    @id, @invoice_no, @vendor_invoice_no, @supplier_id, @branch_id, @warehouse_id,
                    @date, @due_date, @currency_id, @exchange_rate,
                    @subtotal, @tax_total, @discount_total, @grand_total,
                    'POSTED', @journal_header_id, 'System',
                    @is_clearing_invoice, @clearing_dealer_number, @clearing_hebrew_name, @clearing_original_date,
                    @shipment_id, @manual_ref, @cost_center_id
                )
            `).run({
                id: invoiceId,
                invoice_no: invoiceNo,
                vendor_invoice_no: header.vendor_invoice_no || null,
                supplier_id: header.supplier_id,
                branch_id: header.branch_id,
                warehouse_id: header.warehouse_id,
                date: header.date,
                due_date: header.due_date,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                subtotal: header.subtotal,
                tax_total: header.tax_total,
                discount_total: header.discount_total,
                grand_total: header.grand_total,
                journal_header_id: journalResult.id,
                // New Fields
                is_clearing_invoice: header.is_clearing_invoice || 0,
                clearing_dealer_number: header.clearing_dealer_number || null,
                clearing_hebrew_name: header.clearing_hebrew_name || null,
                clearing_original_date: header.clearing_original_date || null,
                shipment_id: header.shipment_id || null,
                manual_ref: header.manual_ref || null,
                cost_center_id: header.cost_center_id || null
            });
            // 4. Save Lines & Update Stock (IN)
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_invoice_lines (
                    id, invoice_id, item_id, quantity, unit_id, 
                    unit_price, total_price, tax_amount, net_total
                ) VALUES (
                    @id, @invoice_id, @item_id, @quantity, @unit_id,
                    @unit_price, @total_price, @tax_amount, @net_total
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(),
                    invoice_id: invoiceId,
                    item_id: line.item_id,
                    quantity: line.quantity,
                    unit_id: line.unit_id,
                    unit_price: line.unit_price,
                    total_price: line.total || 0,
                    tax_amount: line.tax_amount || 0,
                    net_total: (line.total || 0) + (line.tax_amount || 0) // Simplified
                });
                // STOCK INCREASE
                InventoryService_1.InventoryService.updateStock(line.item_id, // itemId
                line.quantity, // quantity (Positive for IN)
                'IN', // type
                invoiceNo, // ref
                'Purchase Invoice', // description
                line.unit_price, // cost (important for AVG Cost)
                header.warehouse_id // warehouseId
                );
            }
            // 5. Sync with Clearance Expenses (for Landed Cost)
            // If this is a Clearing Invoice linked to a Shipment, we treat the Subtotal as an allocatable expense.
            if (header.shipment_id && header.is_clearing_invoice) {
                const expenseAmount = (header.subtotal || 0) * (header.exchange_rate || 1);
                database_1.db.prepare(`
                    INSERT INTO clearance_expenses (
                        id, shipment_id, expense_type, reference_doc, vendor_id,
                        amount_local, tax_amount, is_allocatable, allocation_method, notes
                    ) VALUES (
                        @id, @shipment_id, 'Clearing Invoice', @reference_doc, @vendor_id,
                        @amount_local, @tax_amount, 1, 'value', 'Auto-generated from Clearing Invoice'
                    )
                `).run({
                    id: (0, uuid_1.v4)(),
                    shipment_id: header.shipment_id,
                    reference_doc: invoiceNo,
                    vendor_id: header.supplier_id,
                    amount_local: expenseAmount,
                    tax_amount: (header.tax_total || 0) * (header.exchange_rate || 1)
                });
            }
        });
        transaction();
        return { success: true, invoice_no: invoiceNo, id: invoiceId };
    }
    // --- Helpers (Mocked/Simplified for now) ---
    static getPurchaseAccount() {
        // Purchases Account (5-Expense or 1-Inventory depending on method)
        // Searching for "Purchases" or returning a default expense account
        const acc = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%مشتريات%' OR name LIKE '%Purchases%'").get();
        return acc ? acc.id : '';
    }
    static getGoodsInTransitAccount() {
        // Goods In Transit ( Asset )
        const acc = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%بضاعة بالطريق%' OR name LIKE '%Transit%'").get();
        // Fallback to Purchases if not found (for prototype)
        return acc ? acc.id : this.getPurchaseAccount();
    }
    static getInputVATAccount() {
        // Input VAT
        const acc = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%مدخلات%' OR name LIKE '%Input%'").get();
        return acc ? acc.id : '';
    }
    static getSupplierAccount(supplierId) {
        // Get linked account from partner
        const partner = database_1.db.prepare("SELECT linked_account_id FROM business_partners WHERE id = ?").get(supplierId);
        if (partner && partner.linked_account_id)
            return partner.linked_account_id;
        // Fallback: Suppliers Control Account
        const acc = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%موردين%' OR name LIKE '%Suppliers%'").get();
        return acc ? acc.id : '';
    }
    static getNextInvoiceNo() {
        return JournalService_1.JournalService.getNextVoucherNo('PINV');
    }
    // --- Purchase Orders ---
    static createOrder(data) {
        const { header, lines } = data;
        const orderId = (0, uuid_1.v4)();
        let orderNo = header.order_no;
        if (!orderNo || orderNo === 'NEW') {
            orderNo = JournalService_1.JournalService.getNextVoucherNo('PO');
        }
        if (header.request_id) {
            const pr = database_1.db.prepare("SELECT status FROM purchase_requests WHERE id = ?").get(header.request_id);
            if (!pr)
                throw new Error("طلب الشراء المرتبط غير موجود");
            if (pr.status !== 'APPROVED') {
                throw new Error("لا يمكن إنشاء طلبية شراء إلا بناءً على طلب شراء معتمد (APPROVED)");
            }
        }
        const transaction = database_1.db.transaction(() => {
            // Save Header
            database_1.db.prepare(`
                INSERT INTO purchase_orders (
                    id, order_no, supplier_id, branch_id, date, delivery_date,
                    currency_id, exchange_rate, subtotal, tax_total, grand_total,
                    status, notes, created_by, request_id
                ) VALUES (
                    @id, @order_no, @supplier_id, @branch_id, @date, @delivery_date,
                    @currency_id, @exchange_rate, @subtotal, @tax_total, @grand_total,
                    'DRAFT', @notes, 'System', @request_id
                )
            `).run({
                id: orderId,
                order_no: orderNo,
                supplier_id: header.supplier_id,
                branch_id: header.branch_id || null,
                date: header.date,
                delivery_date: header.delivery_date || null,
                currency_id: header.currency_id || 'ILS',
                exchange_rate: header.exchange_rate || 1,
                subtotal: header.subtotal || 0,
                tax_total: header.tax_total || 0,
                grand_total: header.grand_total || 0,
                notes: header.notes || '',
                request_id: header.request_id || null
            });
            // Save Lines
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_order_lines (
                    id, order_id, item_id, quantity, unit_id,
                    unit_price, total_price, tax_amount
                ) VALUES (
                    @id, @order_id, @item_id, @quantity, @unit_id,
                    @unit_price, @total_price, @tax_amount
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(),
                    order_id: orderId,
                    item_id: line.item_id,
                    quantity: line.quantity,
                    unit_id: line.unit_id,
                    unit_price: line.unit_price,
                    total_price: line.total || 0,
                    tax_amount: line.tax_amount || 0
                });
            }
        });
        transaction();
        return { success: true, order_no: orderNo, id: orderId };
    }
    static getOrders() {
        return database_1.db.prepare(`
            SELECT po.*, s.name_ar as supplier_name 
            FROM purchase_orders po
            LEFT JOIN business_partners s ON po.supplier_id = s.id
            ORDER BY po.created_at DESC
        `).all();
    }
    static getOrder(id) {
        const header = database_1.db.prepare(`
            SELECT po.*, s.name_ar as supplier_name, s.address, s.phone 
            FROM purchase_orders po
            LEFT JOIN business_partners s ON po.supplier_id = s.id
            WHERE po.id = ?
        `).get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code, u.name_ar as unit_name
            FROM purchase_order_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON l.unit_id = u.id
            WHERE l.order_id = ?
        `).all(id);
        return { header, lines };
    }
    static deleteOrder(id) {
        const order = database_1.db.prepare('SELECT status, request_id FROM purchase_orders WHERE id = ?').get(id);
        if (!order)
            throw new Error("Order not found");
        if (order.status !== 'DRAFT')
            throw new Error("Cannot delete processed order");
        const runTx = database_1.db.transaction(() => {
            // 1. Revert Linked PR Status
            if (order.request_id) {
                database_1.db.prepare("UPDATE purchase_requests SET status = 'DRAFT' WHERE id = ?").run(order.request_id);
            }
            // 2. Delete Order
            database_1.db.prepare('DELETE FROM purchase_order_lines WHERE order_id = ?').run(id);
            database_1.db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
        });
        runTx();
        return { success: true };
    }
    static updateOrder(data) {
        const { header, lines } = data;
        const id = header.id;
        if (!id)
            throw new Error("Order ID is required for update");
        // Validate Status
        const current = database_1.db.prepare('SELECT status FROM purchase_orders WHERE id = ?').get(id);
        if (!current)
            throw new Error("Order not found");
        if (current.status !== 'DRAFT')
            throw new Error("Cannot update processed order");
        const runTx = database_1.db.transaction(() => {
            database_1.db.prepare(`
                UPDATE purchase_orders
                SET supplier_id = @supplier_id,
                    branch_id = @branch_id,
                    date = @date,
                    delivery_date = @delivery_date,
                    currency_id = @currency_id,
                    exchange_rate = @exchange_rate,
                    subtotal = @subtotal,
                    tax_total = @tax_total,
                    grand_total = @grand_total,
                    notes = @notes
                WHERE id = @id
            `).run({
                id: id,
                supplier_id: header.supplier_id,
                branch_id: header.branch_id || null,
                date: header.date,
                delivery_date: header.delivery_date || null,
                currency_id: header.currency_id || 'ILS',
                exchange_rate: header.exchange_rate || 1,
                subtotal: header.subtotal || 0,
                tax_total: header.tax_total || 0,
                grand_total: header.grand_total || 0,
                notes: header.notes || ''
            });
            // Delete old lines
            database_1.db.prepare('DELETE FROM purchase_order_lines WHERE order_id = ?').run(id);
            // Insert new lines
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_order_lines (
                    id, order_id, item_id, quantity, unit_id,
                    unit_price, total_price, tax_amount
                ) VALUES (
                    @id, @order_id, @item_id, @quantity, @unit_id,
                    @unit_price, @total_price, @tax_amount
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(),
                    order_id: id,
                    item_id: line.item_id,
                    quantity: line.quantity,
                    unit_id: line.unit_id,
                    unit_price: line.unit_price,
                    total_price: line.total || 0,
                    tax_amount: line.tax_amount || 0
                });
            }
        });
        runTx();
        return { success: true, id, order_no: header.order_no };
    }
    static checkPermission(userId, targetPermission) {
        const user = database_1.db.prepare('SELECT role_id FROM sys_users WHERE id = ?').get(userId);
        if (!user || !user.role_id)
            return false;
        const perm = database_1.db.prepare(`
            SELECT 1 FROM sys_role_permissions 
            WHERE role_id = ? AND permission_key = ?
        `).get(user.role_id, targetPermission);
        return !!perm;
    }
    static postOrder(id, userId) {
        const order = database_1.db.prepare('SELECT status FROM purchase_orders WHERE id = ?').get(id);
        if (!order)
            throw new Error("لم يتم العثور على الطلبية");
        if (order.status !== 'DRAFT')
            throw new Error("يمكن ترحيل الطلبيات المسودة فقط");
        const lines = database_1.db.prepare('SELECT COUNT(*) as count, SUM(quantity) as total_qty FROM purchase_order_lines WHERE order_id = ?').get(id);
        if (!lines || lines.count === 0)
            throw new Error("لا يمكن ترحيل طلبية فارغة. الرجاء إضافة أصناف.");
        if (lines.total_qty <= 0)
            throw new Error("إجمالي الكميات يجب أن يكون أكبر من صفر.");
        database_1.db.prepare(`
            UPDATE purchase_orders 
            SET status = 'PENDING_APPROVAL', posted_at = CURRENT_TIMESTAMP, posted_by = ? 
            WHERE id = ?
        `).run(userId, id);
        return { success: true };
    }
    static approveOrder(id, userId) {
        if (!this.checkPermission(userId, 'PURCHASE_PO_APPROVE')) {
            throw new Error("عفواً، لا تملك صلاحية اعتماد طلبيات الشراء.");
        }
        const order = database_1.db.prepare('SELECT status, request_id FROM purchase_orders WHERE id = ?').get(id);
        if (!order)
            throw new Error("لم يتم العثور على الطلبية");
        if (order.status !== 'PENDING_APPROVAL')
            throw new Error("الطلبية ليست بانتظار الاعتماد");
        database_1.db.prepare(`
            UPDATE purchase_orders 
            SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP, approved_by = ? 
            WHERE id = ?
        `).run(userId, id);
        if (order.request_id) {
            database_1.db.prepare("UPDATE purchase_requests SET status = 'ORDERED' WHERE id = ?").run(order.request_id);
        }
        return { success: true };
    }
    static rejectOrder(id, userId, reason) {
        if (!this.checkPermission(userId, 'PURCHASE_PO_APPROVE')) {
            throw new Error("عفواً، لا تملك صلاحية رفض طلبيات الشراء.");
        }
        const order = database_1.db.prepare('SELECT status FROM purchase_orders WHERE id = ?').get(id);
        if (!order)
            throw new Error("لم يتم العثور على الطلبية");
        if (order.status !== 'PENDING_APPROVAL')
            throw new Error("الطلبية ليست بانتظار الاعتماد");
        database_1.db.prepare(`
            UPDATE purchase_orders 
            SET status = 'REJECTED', rejected_at = CURRENT_TIMESTAMP, rejected_by = ?, rejected_reason = ? 
            WHERE id = ?
        `).run(userId, reason || null, id);
        return { success: true };
    }
    static getInvoice(id) {
        const header = database_1.db.prepare(`
            SELECT pi.*, s.name_ar as supplier_name, s.address, s.phone 
            FROM purchase_invoices pi
            LEFT JOIN business_partners s ON pi.supplier_id = s.id
            WHERE pi.id = ?
        `).get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code, u.name_ar as unit_name
            FROM purchase_invoice_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON l.unit_id = u.id
            WHERE l.invoice_id = ?
        `).all(id);
        return { header, lines };
    }
    static getInvoices() {
        return database_1.db.prepare(`
            SELECT pi.*, s.name_ar as supplier_name 
            FROM purchase_invoices pi
            LEFT JOIN business_partners s ON pi.supplier_id = s.id
            ORDER BY pi.date DESC, pi.created_at DESC
        `).all();
    }
    // --- Purchase Requests ---
    static createRequest(data) {
        const { header, lines } = data;
        const id = (0, uuid_1.v4)();
        let no = header.request_no;
        if (!no || no === 'NEW') {
            no = JournalService_1.JournalService.getNextVoucherNo('PRQ');
        }
        const runTx = database_1.db.transaction(() => {
            database_1.db.prepare(`
                INSERT INTO purchase_requests (
                    id, request_no, branch_id, warehouse_id, requester_id,
                    date, needed_date, status, notes
                ) VALUES (
                    @id, @no, @branchId, @whId, @reqId,
                    @date, @needed, 'DRAFT', @notes
                )
            `).run({
                id, no, branchId: header.branch_id || 'MAIN', whId: header.warehouse_id,
                reqId: header.requester_id, date: header.date, needed: header.needed_date,
                notes: header.notes
            });
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_request_lines (
                    id, request_id, item_id, description, quantity, unit_id, notes
                ) VALUES (
                    @id, @rid, @itemId, @desc, @qty, @unitId, @notes
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(), rid: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id, notes: line.notes || ''
                });
            }
        });
        runTx();
        return { success: true, id, request_no: no };
    }
    static getRequests() {
        return database_1.db.prepare(`
            SELECT r.*, w.name as warehouse_name, e.name as requester_name
            FROM purchase_requests r
            LEFT JOIN warehouses w ON r.warehouse_id = w.id
            LEFT JOIN employees e ON r.requester_id = e.id
            ORDER BY r.created_at DESC
        `).all();
    }
    static getRequest(id) {
        const header = database_1.db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code, u.name_ar as unit_name
            FROM purchase_request_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON l.unit_id = u.id
            WHERE l.request_id = ?
        `).all(id);
        return { header, lines };
    }
    static updateRequest(data) {
        const { header, lines } = data;
        const id = header.id;
        if (!id)
            throw new Error("Request ID missing for update");
        const runTx = database_1.db.transaction(() => {
            database_1.db.prepare(`
                UPDATE purchase_requests 
                SET warehouse_id = @whId, 
                    requester_id = @reqId,
                    date = @date, 
                    needed_date = @needed, 
                    notes = @notes
                WHERE id = @id
            `).run({
                id, whId: header.warehouse_id,
                reqId: header.requester_id,
                date: header.date, needed: header.needed_date,
                notes: header.notes
            });
            // Delete old lines
            database_1.db.prepare('DELETE FROM purchase_request_lines WHERE request_id = ?').run(id);
            // Insert new lines
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_request_lines (
                    id, request_id, item_id, description, quantity, unit_id, notes
                ) VALUES (
                    @id, @rid, @itemId, @desc, @qty, @unitId, @notes
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(), rid: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id, notes: line.notes || ''
                });
            }
        });
        runTx();
        return { success: true, id, request_no: header.request_no };
    }
    static postRequest(id, userId) {
        const req = database_1.db.prepare('SELECT status FROM purchase_requests WHERE id = ?').get(id);
        if (!req)
            throw new Error("لم يتم العثور على طلب الشراء");
        if (req.status !== 'DRAFT')
            throw new Error("يمكن ترحيل طلبات الشراء المسودة فقط");
        const lines = database_1.db.prepare('SELECT COUNT(*) as count, SUM(quantity) as total_qty FROM purchase_request_lines WHERE request_id = ?').get(id);
        if (!lines || lines.count === 0)
            throw new Error("لا يمكن ترحيل طلب فارغ. الرجاء إضافة أصناف.");
        if (lines.total_qty <= 0)
            throw new Error("إجمالي الكميات يجب أن يكون أكبر من صفر.");
        database_1.db.prepare(`
            UPDATE purchase_requests 
            SET status = 'PENDING_APPROVAL', posted_at = CURRENT_TIMESTAMP, posted_by = ? 
            WHERE id = ?
        `).run(userId, id);
        return { success: true, status: 'PENDING_APPROVAL' };
    }
    static approveRequest(id, userId) {
        if (!this.checkPermission(userId, 'PURCHASE_PR_APPROVE')) {
            throw new Error("عفواً، لا تملك صلاحية اعتماد طلبات الشراء المتفرقة.");
        }
        const req = database_1.db.prepare('SELECT status FROM purchase_requests WHERE id = ?').get(id);
        if (!req)
            throw new Error("لم يتم العثور على طلب الشراء");
        if (req.status !== 'PENDING_APPROVAL')
            throw new Error("الطلب ليس بانتظار الاعتماد");
        database_1.db.prepare(`
            UPDATE purchase_requests 
            SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP, approved_by = ? 
            WHERE id = ?
        `).run(userId, id);
        return { success: true, status: 'APPROVED' };
    }
    static rejectRequest(id, userId, reason) {
        if (!this.checkPermission(userId, 'PURCHASE_PR_APPROVE')) {
            throw new Error("عفواً، لا تملك صلاحية رفض طلبات الشراء المتفرقة.");
        }
        const req = database_1.db.prepare('SELECT status FROM purchase_requests WHERE id = ?').get(id);
        if (!req)
            throw new Error("لم يتم العثور على طلب الشراء");
        if (req.status !== 'PENDING_APPROVAL')
            throw new Error("الطلب ليس بانتظار الاعتماد");
        database_1.db.prepare(`
            UPDATE purchase_requests 
            SET status = 'REJECTED', rejected_at = CURRENT_TIMESTAMP, rejected_by = ?, rejected_reason = ? 
            WHERE id = ?
        `).run(userId, reason || null, id);
        return { success: true, status: 'REJECTED' };
    }
    static deleteRequest(id) {
        const r = database_1.db.prepare('SELECT status FROM purchase_requests WHERE id = ?').get(id);
        if (r && r.status !== 'DRAFT')
            throw new Error("Cannot delete processed request");
        database_1.db.prepare('DELETE FROM purchase_requests WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Purchase Returns ---
    static createReturn(data) {
        const { header, lines } = data;
        if (!header.supplier_id || lines.length === 0) {
            throw new Error("بيانات المردود غير مكتملة");
        }
        const returnId = (0, uuid_1.v4)();
        let returnNo = header.return_no;
        if (!returnNo || returnNo === 'NEW') {
            returnNo = JournalService_1.JournalService.getNextVoucherNo('PR');
        }
        const transaction = database_1.db.transaction(() => {
            // 1. Financial Entry (Journal)
            // Debit: Supplier (Decrease Liability)
            // Credit: Purchases/Inventory + VAT (Decrease Expense/Asset)
            const supplierAccount = this.getSupplierAccount(header.supplier_id);
            const purchaseAccount = this.getPurchaseAccount(); // Or Inventory Account
            const vatAccount = this.getInputVATAccount();
            const totalAmount = header.grand_total || 0; // Debit Supplier
            const vatAmount = header.tax_total || 0; // Credit VAT
            const netAmount = header.subtotal || 0; // Credit Purchases
            const journalLines = [
                // Debit: Supplier
                {
                    account_id: supplierAccount,
                    debit: totalAmount,
                    credit: 0,
                    line_description: `Purchase Return #${returnNo}`
                },
                // Credit: Purchases
                {
                    account_id: purchaseAccount,
                    debit: 0,
                    credit: netAmount,
                    line_description: `Purchase Return #${returnNo} - Net`
                },
                // Credit: VAT (if any)
                ...(vatAmount > 0 ? [{
                        account_id: vatAccount,
                        debit: 0,
                        credit: vatAmount,
                        line_description: `VAT Return - PR #${returnNo}`
                    }] : [])
            ];
            const journalResult = JournalService_1.JournalService.createJournalEntry({
                voucher_type: 'Purchase Return',
                date: header.date,
                reference_no: returnNo,
                description: `مردود مشتريات - ${returnNo}`,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                status: 'POSTED',
                branch_id: header.branch_id
            }, journalLines);
            // 2. Save Header
            database_1.db.prepare(`
                INSERT INTO purchase_returns (
                    id, return_no, invoice_id, supplier_id, branch_id, warehouse_id,
                    date, currency_id, exchange_rate, 
                    subtotal, tax_total, grand_total, notes,
                    status, journal_header_id, created_by
                ) VALUES (
                    @id, @return_no, @invoice_id, @supplier_id, @branch_id, @warehouse_id,
                    @date, @currency_id, @exchange_rate,
                    @subtotal, @tax_total, @grand_total, @notes,
                    'POSTED', @journal_header_id, 'System'
                )
            `).run({
                id: returnId,
                return_no: returnNo,
                invoice_id: header.invoice_id || null,
                supplier_id: header.supplier_id,
                branch_id: header.branch_id,
                warehouse_id: header.warehouse_id,
                date: header.date,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                subtotal: header.subtotal,
                tax_total: header.tax_total,
                grand_total: header.grand_total,
                notes: header.notes || '',
                journal_header_id: journalResult.id
            });
            // 3. Save Lines & Update Stock (OUT)
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_return_lines (
                    id, return_id, item_id, quantity, unit_id, 
                    unit_price, total_price, tax_amount
                ) VALUES (
                    @id, @return_id, @item_id, @quantity, @unit_id,
                    @unit_price, @total_price, @tax_amount
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(),
                    return_id: returnId,
                    item_id: line.item_id,
                    quantity: line.quantity,
                    unit_id: line.unit_id,
                    unit_price: line.unit_price,
                    total_price: line.total || 0,
                    tax_amount: line.tax_amount || 0
                });
                // STOCK DECREASE (OUT)
                InventoryService_1.InventoryService.updateStock(line.item_id, line.quantity, // Quantity
                'OUT', // Type
                returnNo, // Ref
                'Purchase Return', // Description
                line.unit_price, // Cost
                header.warehouse_id);
            }
        });
        transaction();
        return { success: true, return_no: returnNo, id: returnId };
    }
    static getReturns() {
        return database_1.db.prepare(`
            SELECT
                pr.*,
                COALESCE(s.name_ar, s.name_en, s.code, '') as supplier_name,
                COALESCE(
                    (SELECT c.code FROM currencies c WHERE c.id = pr.currency_id LIMIT 1),
                    (SELECT c.code FROM currencies c WHERE UPPER(c.code) = UPPER(pr.currency_id) LIMIT 1),
                    CASE
                        WHEN LENGTH(TRIM(COALESCE(pr.currency_id, ''))) = 3 THEN UPPER(TRIM(pr.currency_id))
                        ELSE 'ILS'
                    END
                ) as currency_code
            FROM purchase_returns pr
            LEFT JOIN business_partners s ON pr.supplier_id = s.id
            ORDER BY pr.created_at DESC
        `).all();
    }
    static getReturn(id) {
        const header = database_1.db.prepare(`
            SELECT pr.*, s.name_ar as supplier_name, s.address, s.phone 
            FROM purchase_returns pr
            LEFT JOIN business_partners s ON pr.supplier_id = s.id
            WHERE pr.id = ?
        `).get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code, u.name_ar as unit_name
            FROM purchase_return_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON l.unit_id = u.id
            WHERE l.return_id = ?
        `).all(id);
        return { header, lines };
    }
    // --- RFQ Methods ---
    static createRFQ(data) {
        const { header, lines } = data;
        const id = (0, uuid_1.v4)();
        let no = header.request_no;
        if (!no || no === 'NEW') {
            no = JournalService_1.JournalService.getNextVoucherNo('RFQ');
        }
        const runTx = database_1.db.transaction(() => {
            database_1.db.prepare(`
                INSERT INTO purchase_rfqs (
                    id, request_no, requester_id, branch_id,
                    date, needed_date, status, notes, created_by
                ) VALUES (
                    @id, @no, @reqId, @branchId,
                    @date, @needed, 'OPEN', @notes, 'System'
                )
            `).run({
                id, no, reqId: header.requester_id, branchId: header.branch_id || 'MAIN',
                date: header.date, needed: header.needed_date, notes: header.notes
            });
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_rfq_lines (
                    id, rfq_id, item_id, description, quantity, unit_id, notes
                ) VALUES (
                    @id, @rfqId, @itemId, @desc, @qty, @unitId, @notes
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(), rfqId: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id, notes: line.notes || ''
                });
            }
        });
        runTx();
        return { success: true, id, request_no: no };
    }
    static getRFQs() {
        return database_1.db.prepare(`
            SELECT r.*, e.name as requester_name
            FROM purchase_rfqs r
            LEFT JOIN employees e ON r.requester_id = e.id
            ORDER BY r.created_at DESC
        `).all();
    }
    static getRFQ(id) {
        const header = database_1.db.prepare('SELECT * FROM purchase_rfqs WHERE id = ?').get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code, u.name_ar as unit_name
            FROM purchase_rfq_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON l.unit_id = u.id
            WHERE l.rfq_id = ?
        `).all(id);
        return { header, lines };
    }
    static updateRFQ(data) {
        const { header, lines } = data;
        const id = header.id;
        if (!id)
            throw new Error("RFQ ID missing for update");
        const runTx = database_1.db.transaction(() => {
            database_1.db.prepare(`
                UPDATE purchase_rfqs 
                SET requester_id = @reqId,
                    date = @date, 
                    needed_date = @needed, 
                    notes = @notes
                WHERE id = @id
            `).run({
                id, reqId: header.requester_id,
                date: header.date, needed: header.needed_date,
                notes: header.notes
            });
            // Delete old lines
            database_1.db.prepare('DELETE FROM purchase_rfq_lines WHERE rfq_id = ?').run(id);
            // Insert new lines
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_rfq_lines (
                    id, rfq_id, item_id, description, quantity, unit_id, notes
                ) VALUES (
                    @id, @rfqId, @itemId, @desc, @qty, @unitId, @notes
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(), rfqId: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id, notes: line.notes || ''
                });
            }
        });
        runTx();
        return { success: true, id, request_no: header.request_no };
    }
}
exports.PurchaseService = PurchaseService;
