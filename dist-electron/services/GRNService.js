"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRNService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
const InventoryService_1 = require("./InventoryService");
const JournalService_1 = require("./JournalService");
class GRNService {
    // ================================================================
    // SAVE: Create or update a GRN (status = SAVED)
    // ================================================================
    static save(data) {
        const { header, lines } = data;
        // Self-heal: ensure goods_receipts table has needed columns
        try {
            const cols = database_1.db.prepare("PRAGMA table_info(goods_receipts)").all();
            if (!cols.some((c) => c.name === 'source_type')) {
                database_1.db.prepare("ALTER TABLE goods_receipts ADD COLUMN source_type TEXT").run();
            }
            if (!cols.some((c) => c.name === 'source_id')) {
                database_1.db.prepare("ALTER TABLE goods_receipts ADD COLUMN source_id TEXT").run();
            }
            if (!cols.some((c) => c.name === 'status')) {
                database_1.db.prepare("ALTER TABLE goods_receipts ADD COLUMN status TEXT DEFAULT 'SAVED'").run();
            }
            if (!cols.some((c) => c.name === 'invoice_id')) {
                database_1.db.prepare("ALTER TABLE goods_receipts ADD COLUMN invoice_id TEXT").run();
            }
            if (!cols.some((c) => c.name === 'posted_at')) {
                database_1.db.prepare("ALTER TABLE goods_receipts ADD COLUMN posted_at TEXT").run();
            }
            if (!cols.some((c) => c.name === 'invoiced_at')) {
                database_1.db.prepare("ALTER TABLE goods_receipts ADD COLUMN invoiced_at TEXT").run();
            }
        }
        catch (e) {
            console.warn('[GRNService] Self-heal schema warn:', e);
        }
        // Self-heal GRN lines table
        try {
            const lineCols = database_1.db.prepare("PRAGMA table_info(goods_receipt_lines)").all();
            if (!lineCols.some((c) => c.name === 'source_line_id')) {
                database_1.db.prepare("ALTER TABLE goods_receipt_lines ADD COLUMN source_line_id TEXT").run();
            }
        }
        catch (e) {
            console.warn('[GRNService] Self-heal lines warn:', e);
        }
        return database_1.db.transaction(() => {
            let grnId = header.id || null;
            if (grnId) {
                // Update existing
                const existing = database_1.db.prepare("SELECT status FROM goods_receipts WHERE id = ?").get(grnId);
                if (!existing)
                    throw new Error("سند الاستلام غير موجود");
                if (existing.status === 'POSTED')
                    throw new Error("لا يمكن تعديل سند مرحّل");
                if (existing.status === 'PENDING')
                    throw new Error("السند معلق بانتظار الفاتورة ولا يمكن تعديله");
                database_1.db.prepare(`
                    UPDATE goods_receipts
                    SET date = @date, warehouse_id = @warehouse_id, supplier_id = @supplier_id,
                        notes = @notes, source_type = @source_type, source_id = @source_id,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id
                `).run({
                    id: grnId,
                    date: header.date,
                    warehouse_id: header.warehouseId || header.warehouse_id || null,
                    supplier_id: header.supplier_id || null,
                    notes: header.notes || null,
                    source_type: header.source_type || null,
                    source_id: header.source_id || null,
                });
                database_1.db.prepare("DELETE FROM goods_receipt_lines WHERE grn_id = ?").run(grnId);
            }
            else {
                // Create new
                grnId = (0, uuid_1.v4)();
                // Generate GRN number
                const countRow = database_1.db.prepare("SELECT COUNT(*) as cnt FROM goods_receipts").get();
                const nextNo = (countRow.cnt || 0) + 1;
                const year = new Date().getFullYear();
                const grnNo = header.ref_no && header.ref_no !== 'RCP-NEW'
                    ? header.ref_no
                    : `GRN-${year}-${String(nextNo).padStart(4, '0')}`;
                database_1.db.prepare(`
                    INSERT INTO goods_receipts (
                        id, ref_no, date, warehouse_id, supplier_id,
                        notes, status, source_type, source_id, created_at, updated_at
                    ) VALUES (
                        @id, @ref_no, @date, @warehouse_id, @supplier_id,
                        @notes, 'SAVED', @source_type, @source_id,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                `).run({
                    id: grnId,
                    ref_no: grnNo,
                    date: header.date,
                    warehouse_id: header.warehouseId || header.warehouse_id || null,
                    supplier_id: header.supplier_id || null,
                    notes: header.notes || null,
                    source_type: header.source_type || null,
                    source_id: header.source_id || null,
                });
            }
            // Insert lines
            const insertLine = database_1.db.prepare(`
                INSERT INTO goods_receipt_lines (id, grn_id, item_id, item_code, item_name, quantity, notes, source_line_id)
                VALUES (@id, @grn_id, @item_id, @item_code, @item_name, @quantity, @notes, @source_line_id)
            `);
            const validLines = (lines || []).filter((l) => l.itemId || l.item_id);
            for (const l of validLines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(),
                    grn_id: grnId,
                    item_id: l.itemId || l.item_id || '',
                    item_code: l.itemCode || l.item_code || '',
                    item_name: l.name || l.item_name || '',
                    quantity: Number(l.quantity || 0),
                    notes: l.notes || null,
                    source_line_id: l.source_line_id || null,
                });
            }
            const grn = database_1.db.prepare("SELECT * FROM goods_receipts WHERE id = ?").get(grnId);
            return { success: true, id: grnId, ref_no: grn?.ref_no };
        })();
    }
    // ================================================================
    // POST TO PENDING: SAVED → PENDING + stock IN + AP accrual journal
    // ================================================================
    static postToPending(id) {
        return database_1.db.transaction(() => {
            const grn = database_1.db.prepare("SELECT * FROM goods_receipts WHERE id = ?").get(id);
            if (!grn)
                throw new Error("سند الاستلام غير موجود");
            if (grn.status === 'POSTED')
                throw new Error("السند مرحّل نهائياً");
            if (grn.status === 'PENDING')
                throw new Error("السند معلق مسبقاً");
            const lines = database_1.db.prepare("SELECT * FROM goods_receipt_lines WHERE grn_id = ?").all(id);
            if (lines.length === 0)
                throw new Error("لا يمكن ترحيل سند بدون أصناف");
            // 1. Update stock (IN)
            for (const l of lines) {
                if (!l.item_id || Number(l.quantity) <= 0)
                    continue;
                InventoryService_1.InventoryService.updateStock(l.item_id, Number(l.quantity), 'IN', grn.ref_no, `استلام بضاعة ${grn.ref_no}`, 0, // cost unknown until invoice
                grn.warehouse_id);
            }
            // 2. Update linked PO received quantities
            if (grn.source_type === 'PURCHASE_ORDER' && grn.source_id) {
                const updatePOLine = database_1.db.prepare(`
                    UPDATE purchase_order_lines
                    SET received_qty = COALESCE(received_qty, 0) + ?
                    WHERE id = ?
                `);
                for (const l of lines) {
                    if (l.source_line_id) {
                        try {
                            updatePOLine.run(l.quantity, l.source_line_id);
                        }
                        catch (e) { /* column may not exist */ }
                    }
                }
                // Check if fully received
                try {
                    const poLines = database_1.db.prepare("SELECT quantity, received_qty FROM purchase_order_lines WHERE order_id = ?").all(grn.source_id);
                    const allReceived = poLines.every((pl) => (pl.received_qty || 0) >= pl.quantity);
                    database_1.db.prepare("UPDATE purchase_orders SET delivery_status = ? WHERE id = ?")
                        .run(allReceived ? 'RECEIVED' : 'PARTIAL', grn.source_id);
                }
                catch (e) { /* ignore */ }
            }
            // 3. AP Accrual journal (Goods Received Not Invoiced - GRNI)
            const grniAccount = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%بضاعة مستلمة%' OR name LIKE '%GRNI%' OR name LIKE '%Goods Received%'").get();
            const inventoryAccount = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%مخزون%' OR name LIKE '%Inventory%'").get();
            if (grniAccount && inventoryAccount) {
                JournalService_1.JournalService.createJournalEntry({
                    voucher_type: 'GRN',
                    date: grn.date || new Date().toISOString().split('T')[0],
                    reference_no: grn.ref_no,
                    description: `قيد استلام بضاعة - ${grn.ref_no} (في انتظار الفاتورة)`,
                    currency_id: 'ILS',
                    exchange_rate: 1,
                    status: 'POSTED',
                    branch_id: database_1.db.prepare("SELECT id FROM branches WHERE is_main = 1").get()?.id || null
                }, [
                    { account_id: inventoryAccount.id, debit: 0, credit: 0, line_description: `بضاعة مستلمة ${grn.ref_no}` },
                    { account_id: grniAccount.id, debit: 0, credit: 0, line_description: `GRNI - ${grn.ref_no}` }
                ]);
            }
            // 4. Set status → PENDING
            database_1.db.prepare(`
                UPDATE goods_receipts
                SET status = 'PENDING', posted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(id);
            return { success: true };
        })();
    }
    // ================================================================
    // INVOICE FROM GRN: PENDING → POSTED + creates purchase invoice skeleton
    // ================================================================
    static invoiceFromGRN(grnId) {
        return database_1.db.transaction(() => {
            const grn = database_1.db.prepare("SELECT * FROM goods_receipts WHERE id = ?").get(grnId);
            if (!grn)
                throw new Error("سند الاستلام غير موجود");
            if (grn.status !== 'PENDING')
                throw new Error("لا يمكن إنشاء فاتورة إلا من سند حالته معلق");
            const lines = database_1.db.prepare("SELECT * FROM goods_receipt_lines WHERE grn_id = ?").all(grnId);
            if (lines.length === 0)
                throw new Error("السند لا يحتوي أصناف");
            const invoiceId = (0, uuid_1.v4)();
            const invoiceNo = JournalService_1.JournalService.getNextVoucherNo('PINV');
            const today = new Date().toISOString().split('T')[0];
            // Create purchase invoice header (DRAFT - user will fill prices)
            database_1.db.prepare(`
                INSERT INTO purchase_invoices (
                    id, invoice_no, supplier_id, branch_id, warehouse_id,
                    date, due_date, currency_id, exchange_rate,
                    subtotal, tax_total, grand_total,
                    status, created_by, grn_id
                ) VALUES (
                    @id, @invoice_no, @supplier_id, @branch_id, @warehouse_id,
                    @date, @due_date, 'ILS', 1,
                    0, 0, 0,
                    'DRAFT', 'System', @grn_id
                )
            `).run({
                id: invoiceId,
                invoice_no: invoiceNo,
                supplier_id: grn.supplier_id || null,
                branch_id: database_1.db.prepare("SELECT id FROM branches WHERE is_main = 1").get()?.id || null,
                warehouse_id: grn.warehouse_id || null,
                date: today,
                due_date: today,
                grn_id: grnId,
            });
            // Add invoice lines from GRN lines (qty copied, prices = 0 for user to fill)
            const insertLine = database_1.db.prepare(`
                INSERT INTO purchase_invoice_lines (
                    id, invoice_id, item_id, quantity, unit_id,
                    unit_price, total_price, tax_amount, net_total
                ) VALUES (
                    @id, @invoice_id, @item_id, @quantity, @unit_id,
                    0, 0, 0, 0
                )
            `);
            for (const l of lines) {
                const item = database_1.db.prepare("SELECT base_unit_id FROM items WHERE id = ?").get(l.item_id);
                insertLine.run({
                    id: (0, uuid_1.v4)(),
                    invoice_id: invoiceId,
                    item_id: l.item_id,
                    quantity: l.quantity,
                    unit_id: item?.base_unit_id || null,
                });
            }
            // Mark GRN as POSTED
            database_1.db.prepare(`
                UPDATE goods_receipts
                SET status = 'POSTED', invoice_id = ?, invoiced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(invoiceId, grnId);
            return { success: true, invoiceId, invoice_no: invoiceNo };
        })();
    }
    // ================================================================
    // GET / LIST
    // ================================================================
    static get(id) {
        const grn = database_1.db.prepare("SELECT * FROM goods_receipts WHERE id = ?").get(id);
        if (!grn)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name_ar, i.code as item_code_db
            FROM goods_receipt_lines l
            LEFT JOIN items i ON l.item_id = i.id
            WHERE l.grn_id = ?
        `).all(id);
        return { header: grn, lines };
    }
    static list() {
        return database_1.db.prepare(`
            SELECT g.*, s.name_ar as supplier_name
            FROM goods_receipts g
            LEFT JOIN business_partners s ON g.supplier_id = s.id
            ORDER BY g.created_at DESC
        `).all();
    }
}
exports.GRNService = GRNService;
