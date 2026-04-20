"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchService = void 0;
const database_1 = require("../database");
const JournalService_1 = require("./JournalService");
const InventoryService_1 = require("./InventoryService");
function calcDispatchStatus(header, lines) {
    // Preserve existing status if it is already posted or pending.
    // Otherwise, saving always keeps it as 'محفوظ' until the user explicitly Posts to pending.
    if (header.status === "مرحل")
        return "مرحل";
    if (header.status === "عالق")
        return "عالق";
    return "محفوظ";
}
class DispatchService {
    // =========================
    // GET: Fetch all dispatch records for the list view
    // =========================
    static async getAll() {
        return database_1.db.prepare(`
            SELECT 
                d.*, 
                w.name_ar as from_warehouse_name,
                p.name_ar as ledger_name,
                p2.name_ar as sales_rep_name,
                t.plate_no as truck_plate
            FROM dispatch_header d
            LEFT JOIN warehouses w ON d.from_warehouse_id = w.id
            LEFT JOIN business_partners p ON d.ledger_id = p.id
            LEFT JOIN business_partners p2 ON d.sales_rep_id = p2.id
            LEFT JOIN vehicles t ON d.truck_id = t.id
            ORDER BY d.created_at DESC
        `).all();
    }
    // =========================
    // GET: Fetch single dispatch record by ID
    // =========================
    static async getById(id) {
        const header = database_1.db.prepare(`
            SELECT 
                d.*, 
                w.name_ar as from_warehouse_name,
                p.name_ar as ledger_name,
                p2.name_ar as sales_rep_name,
                t.plate_no as truck_plate
            FROM dispatch_header d
            LEFT JOIN warehouses w ON d.from_warehouse_id = w.id
            LEFT JOIN business_partners p ON d.ledger_id = p.id
            LEFT JOIN business_partners p2 ON d.sales_rep_id = p2.id
            LEFT JOIN vehicles t ON d.truck_id = t.id
            WHERE d.id = ?
        `).get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT 
                l.*,
                i.code as item_code,
                i.name_ar as item_name,
                u.name_ar as unit_name,
                (SELECT quantity FROM stock_balances sb WHERE sb.item_id = l.item_id AND sb.warehouse_id = ?) as available_qty
            FROM dispatch_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON i.base_unit_id = u.id
            WHERE l.header_id = ?
            ORDER BY l.line_no ASC
        `).all(header.from_warehouse_id, id);
        return { header, lines };
    }
    // =========================
    // UPDATE OR CREATE: مسموح فقط لمحفوظ
    // =========================
    static async update(id, payload) {
        return database_1.db.transaction(() => {
            const { v4: uuidv4 } = require('uuid');
            let currentId = id;
            const header = payload.header || {};
            const lines = payload.lines || [];
            const status = calcDispatchStatus(header, lines);
            if (currentId) {
                // Update
                const existing = database_1.db.prepare(`SELECT status FROM dispatch_header WHERE id = ?`).get(currentId);
                if (!existing)
                    throw new Error("السند غير موجود");
                if (existing.status === "مرحل")
                    throw new Error("لا يمكن تعديل سند مرحّل");
                if (existing.status === "عالق")
                    throw new Error("السند عالق بانتظار الفاتورة ولا يمكن تعديله");
                database_1.db.prepare(`
                    UPDATE dispatch_header
                    SET dispatch_date=@dispatch_date, dispatch_time=@dispatch_time,
                        from_warehouse_id=@from_warehouse_id, to_type=@to_type, to_id=@to_id,
                        ledger_id=@ledger_id, sales_rep_id=@sales_rep_id, truck_id=@truck_id,
                        carrier_id=@carrier_id, tracking_no=@tracking_no, 
                        is_sent=@is_sent, is_maintenance=@is_maintenance, 
                        customer_ref=@customer_ref, send_to=@send_to, shipment_no=@shipment_no, 
                        receiver_name=@receiver_name, receiver_phone=@receiver_phone, 
                        delivery_date=@delivery_date, delivery_address=@delivery_address, 
                        delivery_instructions=@delivery_instructions, notes=@notes, status=@status, updated_at=CURRENT_TIMESTAMP
                    WHERE id=@id
                `).run({
                    ...header,
                    delivery_date: header.delivery_date || null,
                    status: status,
                    id: currentId,
                    is_sent: header.is_sent ? 1 : 0,
                    is_maintenance: header.is_maintenance ? 1 : 0
                });
                // replace lines...
                database_1.db.prepare(`DELETE FROM dispatch_lines WHERE header_id=?`).run(currentId);
            }
            else {
                // Create
                currentId = uuidv4();
                // Gen serial
                const countQuery = database_1.db.prepare(`SELECT COUNT(*) as count FROM dispatch_header`).get();
                const nextNo = (countQuery.count || 0) + 1;
                const year = new Date().getFullYear();
                const serial = `DSP-${year}-${String(nextNo).padStart(4, '0')}`;
                database_1.db.prepare(`
                    INSERT INTO dispatch_header (
                        id, serial_no, status, dispatch_type, dispatch_date, dispatch_time,
                        from_warehouse_id, to_type, to_id, ledger_id, sales_rep_id, truck_id,
                        carrier_id, tracking_no, is_sent, is_maintenance, customer_ref, send_to,
                        shipment_no, receiver_name, receiver_phone, delivery_date, delivery_address,
                        delivery_instructions, source_type, source_id, notes
                    ) VALUES (
                        @id, @serial_no, @status, @dispatch_type, @dispatch_date, @dispatch_time,
                        @from_warehouse_id, @to_type, @to_id, @ledger_id, @sales_rep_id, @truck_id,
                        @carrier_id, @tracking_no, @is_sent, @is_maintenance, @customer_ref, @send_to,
                        @shipment_no, @receiver_name, @receiver_phone, @delivery_date, @delivery_address,
                        @delivery_instructions, @source_type, @source_id, @notes
                    )
                `).run({
                    ...header,
                    id: currentId,
                    serial_no: header.serial_no === 'جديد' || !header.serial_no ? serial : header.serial_no,
                    status: status,
                    dispatch_type: header.dispatch_type || 'تحويل داخلي',
                    to_type: header.to_type || 'Warehouse',
                    to_id: header.to_id || header.from_warehouse_id,
                    ledger_id: header.ledger_id || null,
                    sales_rep_id: header.sales_rep_id || null,
                    truck_id: header.truck_id || null,
                    carrier_id: header.carrier_id || null,
                    is_sent: header.is_sent ? 1 : 0,
                    is_maintenance: header.is_maintenance ? 1 : 0,
                    delivery_date: header.delivery_date || null,
                    source_type: header.source_type || null,
                    source_id: header.source_id || null,
                    notes: header.notes || null,
                });
            }
            const insertLine = database_1.db.prepare(`
                INSERT INTO dispatch_lines (id, header_id, line_no, item_id, uom, qty, ref, line_note, source_line_id)
                VALUES (@id, @header_id, @line_no, @item_id, @uom, @qty, @ref, @line_note, @source_line_id)
            `);
            let lineNo = 1;
            for (const l of lines) {
                if (!l.item_id)
                    continue;
                insertLine.run({
                    id: uuidv4(),
                    header_id: currentId,
                    line_no: lineNo++,
                    item_id: l.item_id,
                    uom: l.uom || 'PCS',
                    qty: Number(l.qty || 0),
                    ref: l.ref || null,
                    line_note: l.line_note || null,
                    source_line_id: l.source_line_id || null
                });
            }
            return currentId;
        })();
    }
    // ==========================================================
    // POST: ترحيل أولي => يحول من محفوظ إلى عالق (Waiting Invoice)
    // ==========================================================
    static async postToPending(id) {
        return database_1.db.transaction(() => {
            const header = database_1.db.prepare(`SELECT * FROM dispatch_header WHERE id=?`).get(id);
            if (!header)
                throw new Error("السند غير موجود");
            if (header.status === "مرحل")
                throw new Error("السند مرحّل نهائياً");
            if (header.status === "عالق")
                throw new Error("السند عالق مسبقاً");
            const lines = database_1.db.prepare(`SELECT * FROM dispatch_lines WHERE header_id=?`).all(id);
            // Validate required data before allowing post
            if (!header.ledger_id || !header.truck_id || lines.length === 0) {
                throw new Error("لا يمكن ترحيل هذا السند. يُرجى استكمال البيانات (تحديد الشاحنة والعميل وإضافة أصناف)");
            }
            database_1.db.prepare(`
                UPDATE dispatch_header
                SET status='عالق', posted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
            `).run(id);
            // Update Sales Order if linked
            if (header.source_type === 'SALES_ORDER' && header.source_id) {
                // Determine if order is fully or partially dispatched
                // First, record dispatched quantities on lines
                const updateOrderLine = database_1.db.prepare(`
                    UPDATE sales_order_lines
                    SET dispatched_qty = COALESCE(dispatched_qty, 0) + ?
                    WHERE id = ?
                `);
                for (const l of lines) {
                    if (l.source_line_id) {
                        updateOrderLine.run(l.qty, l.source_line_id);
                    }
                }
                // Check overall order status
                const orderLines = database_1.db.prepare(`SELECT quantity, dispatched_qty FROM sales_order_lines WHERE order_id = ?`).all(header.source_id);
                let allDelivered = true;
                for (const ol of orderLines) {
                    if ((ol.dispatched_qty || 0) < ol.quantity) {
                        allDelivered = false;
                        break;
                    }
                }
                database_1.db.prepare(`
                    UPDATE sales_orders
                    SET delivery_status = ?
                    WHERE id = ?
                `).run(allDelivered ? 'DELIVERED' : 'PARTIAL', header.source_id);
            }
            // --- Physical Inventory Reduction & COGS ---
            let totalCogs = 0;
            const refNo = header.serial_no;
            // First check availability
            for (const l of lines) {
                const stock = database_1.db.prepare(`SELECT quantity FROM stock_balances WHERE item_id = ? AND warehouse_id = ?`).get(l.item_id, header.from_warehouse_id);
                const available = stock ? stock.quantity : 0;
                if (Number(l.qty) > Number(available)) {
                    throw new Error(`المخزون غير كافي للصنف ${l.item_id} (المتوفر: ${available} - السند يطلب: ${l.qty})`);
                }
            }
            // Deduct from DB
            for (const l of lines) {
                const qtyToIssue = Math.abs(Number(l.qty));
                // Get current stock avg_cost BEFORE reduction
                const stockInfo = InventoryService_1.InventoryService.getStock(l.item_id, header.from_warehouse_id);
                // @ts-ignore
                const cost = stockInfo.avg_cost || 0;
                const lineCogs = cost * qtyToIssue;
                totalCogs += lineCogs;
                // InventoryService handles the stock_balances and inventory_transactions!
                InventoryService_1.InventoryService.updateStock(l.item_id, qtyToIssue, // positive number is out
                'OUT', refNo, 'Dispatch (Delivery)', cost, header.from_warehouse_id);
            }
            // --- COGS Journal Entry (Perpetual Inventory) ---
            if (totalCogs > 0) {
                const cogsAccount = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%تكلفة البضاعة المباعة%' OR name LIKE '%COGS%'").get();
                const invAccount = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%مخزون%' OR name LIKE '%Inventory%'").get();
                if (cogsAccount && invAccount) {
                    JournalService_1.JournalService.createJournalEntry({
                        voucher_type: 'Dispatch',
                        date: new Date().toISOString().split('T')[0],
                        reference_no: refNo,
                        description: `قيد إثبات تكلفة البضاعة المباعة - سند إرسال ${refNo}`,
                        currency_id: 'ILS', // fallback
                        exchange_rate: 1,
                        status: 'POSTED',
                        branch_id: database_1.db.prepare("SELECT id FROM branches WHERE is_main = 1").get()?.id || null
                    }, [
                        { account_id: cogsAccount.id, debit: totalCogs, credit: 0, line_description: `تكلفة مبيعات الإرسالية ${refNo}` },
                        { account_id: invAccount.id, debit: 0, credit: totalCogs, line_description: `نقص مخزون إرسالية ${refNo}` }
                    ]);
                }
            }
        })();
    }
    // ============================================================================
    // INVOICE: ترحيل الإرسال إلى فاتورة => ينقل من عالق إلى مرحل + ينفذ مخزون/قيود
    // ============================================================================
    static async invoiceFromDispatch(dispatchId) {
        return database_1.db.transaction(() => {
            const header = database_1.db.prepare(`SELECT * FROM dispatch_header WHERE id=?`).get(dispatchId);
            if (!header)
                throw new Error("السند غير موجود");
            if (header.status !== "عالق") {
                throw new Error("لا يمكن إنشاء فاتورة إلا من سند حالته عالق");
            }
            const lines = database_1.db.prepare(`SELECT * FROM dispatch_lines WHERE header_id=?`).all(dispatchId);
            if (lines.length === 0)
                throw new Error("السند لا يحتوي أصناف");
            const { v4: uuidv4 } = require('uuid');
            const invoiceId = uuidv4();
            // 1) إنشاء الفاتورة 
            database_1.db.prepare(`
                INSERT INTO sales_invoices (
                    id, invoice_no, customer_id, branch_id, warehouse_id, 
                    date, due_date, subtotal, tax_total, grand_total, 
                    currency_id, exchange_rate, status, payment_status,
                    notes, dispatch_id, order_id
                )
                VALUES (
                    @id, @invoice_number, @customer_id, @branch_id, @warehouse_id, 
                    DATE('now'), DATE('now'), 0, 0, 0,
                    'ILS', 1, 'POSTED', 'UNPAID', 
                    @notes, @dispatch_id, @order_id
                )
            `).run({
                id: invoiceId,
                invoice_number: `INV-${header.serial_no}`,
                customer_id: header.ledger_id || header.to_id, // Fallback map
                branch_id: database_1.db.prepare("SELECT id FROM branches WHERE is_main = 1").get()?.id || 'MAIN',
                warehouse_id: header.from_warehouse_id,
                notes: `فاتورة من سند إرسال ${header.serial_no}`,
                dispatch_id: dispatchId,
                order_id: header.source_id || null
            });
            // 2) إضافة خطوط الفاتورة
            const insertInvLine = database_1.db.prepare(`
                INSERT INTO sales_invoice_lines (
                    id, invoice_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, tax_amount, net_total, dispatch_line_id
                )
                VALUES (
                    @id, @invoice_id, @item_id, @description, @qty, @unit_id,
                    0, 0, 0, 0, @dispatch_line_id
                )
            `);
            for (const l of lines) {
                // Get unit
                const item = database_1.db.prepare("SELECT name_ar, base_unit_id FROM items WHERE id = ?").get(l.item_id);
                insertInvLine.run({
                    id: uuidv4(),
                    invoice_id: invoiceId,
                    item_id: l.item_id,
                    description: item ? item.name_ar : '',
                    unit_id: item?.base_unit_id || 'UNKNOWN',
                    qty: Number(l.qty),
                    dispatch_line_id: l.id
                });
            }
            // 3) لا تقوم بخصم المخزون هنا، لأنه تم خصمه مسبقاً في postToPending !
            // 4) تحديث سند الإرسال إلى مرحل وربطه بالفاتورة
            database_1.db.prepare(`
                UPDATE dispatch_header
                SET status='مرحل', invoice_id=?, invoiced_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
            `).run(invoiceId, dispatchId);
            return invoiceId;
        })();
    }
}
exports.DispatchService = DispatchService;
