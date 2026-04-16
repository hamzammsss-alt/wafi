import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { InventoryService } from './InventoryService';
import { JournalService } from './JournalService';

export class GRNService {

    // ================================================================
    // SAVE: Create or update a GRN (status = SAVED)
    // ================================================================
    static save(data: any) {
        const { header, lines } = data;

        // Self-heal: ensure goods_receipts table has needed columns
        try {
            const cols = db.prepare("PRAGMA table_info(goods_receipts)").all() as any[];
            if (!cols.some((c: any) => c.name === 'source_type')) {
                db.prepare("ALTER TABLE goods_receipts ADD COLUMN source_type TEXT").run();
            }
            if (!cols.some((c: any) => c.name === 'source_id')) {
                db.prepare("ALTER TABLE goods_receipts ADD COLUMN source_id TEXT").run();
            }
            if (!cols.some((c: any) => c.name === 'status')) {
                db.prepare("ALTER TABLE goods_receipts ADD COLUMN status TEXT DEFAULT 'SAVED'").run();
            }
            if (!cols.some((c: any) => c.name === 'invoice_id')) {
                db.prepare("ALTER TABLE goods_receipts ADD COLUMN invoice_id TEXT").run();
            }
            if (!cols.some((c: any) => c.name === 'posted_at')) {
                db.prepare("ALTER TABLE goods_receipts ADD COLUMN posted_at TEXT").run();
            }
            if (!cols.some((c: any) => c.name === 'invoiced_at')) {
                db.prepare("ALTER TABLE goods_receipts ADD COLUMN invoiced_at TEXT").run();
            }
        } catch (e) {
            console.warn('[GRNService] Self-heal schema warn:', e);
        }

        // Self-heal GRN lines table
        try {
            const lineCols = db.prepare("PRAGMA table_info(goods_receipt_lines)").all() as any[];
            if (!lineCols.some((c: any) => c.name === 'source_line_id')) {
                db.prepare("ALTER TABLE goods_receipt_lines ADD COLUMN source_line_id TEXT").run();
            }
        } catch (e) {
            console.warn('[GRNService] Self-heal lines warn:', e);
        }

        return db.transaction(() => {
            let grnId = header.id || null;

            if (grnId) {
                // Update existing
                const existing = db.prepare("SELECT status FROM goods_receipts WHERE id = ?").get(grnId) as any;
                if (!existing) throw new Error("سند الاستلام غير موجود");
                if (existing.status === 'POSTED') throw new Error("لا يمكن تعديل سند مرحّل");
                if (existing.status === 'PENDING') throw new Error("السند معلق بانتظار الفاتورة ولا يمكن تعديله");

                db.prepare(`
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

                db.prepare("DELETE FROM goods_receipt_lines WHERE grn_id = ?").run(grnId);

            } else {
                // Create new
                grnId = uuidv4();

                // Generate GRN number
                const countRow = db.prepare("SELECT COUNT(*) as cnt FROM goods_receipts").get() as any;
                const nextNo = (countRow.cnt || 0) + 1;
                const year = new Date().getFullYear();
                const grnNo = header.ref_no && header.ref_no !== 'RCP-NEW'
                    ? header.ref_no
                    : `GRN-${year}-${String(nextNo).padStart(4, '0')}`;

                db.prepare(`
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
            const insertLine = db.prepare(`
                INSERT INTO goods_receipt_lines (id, grn_id, item_id, item_code, item_name, quantity, notes, source_line_id)
                VALUES (@id, @grn_id, @item_id, @item_code, @item_name, @quantity, @notes, @source_line_id)
            `);

            const validLines = (lines || []).filter((l: any) => l.itemId || l.item_id);
            for (const l of validLines) {
                insertLine.run({
                    id: uuidv4(),
                    grn_id: grnId,
                    item_id: l.itemId || l.item_id || '',
                    item_code: l.itemCode || l.item_code || '',
                    item_name: l.name || l.item_name || '',
                    quantity: Number(l.quantity || 0),
                    notes: l.notes || null,
                    source_line_id: l.source_line_id || null,
                });
            }

            const grn = db.prepare("SELECT * FROM goods_receipts WHERE id = ?").get(grnId) as any;
            return { success: true, id: grnId, ref_no: grn?.ref_no };
        })();
    }

    // ================================================================
    // POST TO PENDING: SAVED → PENDING + stock IN + AP accrual journal
    // ================================================================
    static postToPending(id: string) {
        return db.transaction(() => {
            const grn = db.prepare("SELECT * FROM goods_receipts WHERE id = ?").get(id) as any;
            if (!grn) throw new Error("سند الاستلام غير موجود");
            if (grn.status === 'POSTED') throw new Error("السند مرحّل نهائياً");
            if (grn.status === 'PENDING') throw new Error("السند معلق مسبقاً");

            const lines = db.prepare("SELECT * FROM goods_receipt_lines WHERE grn_id = ?").all(id) as any[];
            if (lines.length === 0) throw new Error("لا يمكن ترحيل سند بدون أصناف");

            // 1. Update stock (IN)
            for (const l of lines) {
                if (!l.item_id || Number(l.quantity) <= 0) continue;
                InventoryService.updateStock(
                    l.item_id,
                    Number(l.quantity),
                    'IN',
                    grn.ref_no,
                    `استلام بضاعة ${grn.ref_no}`,
                    0, // cost unknown until invoice
                    grn.warehouse_id
                );
            }

            // 2. Update linked PO received quantities
            if (grn.source_type === 'PURCHASE_ORDER' && grn.source_id) {
                const updatePOLine = db.prepare(`
                    UPDATE purchase_order_lines
                    SET received_qty = COALESCE(received_qty, 0) + ?
                    WHERE id = ?
                `);
                for (const l of lines) {
                    if (l.source_line_id) {
                        try { updatePOLine.run(l.quantity, l.source_line_id); } catch (e) { /* column may not exist */ }
                    }
                }

                // Check if fully received
                try {
                    const poLines = db.prepare(
                        "SELECT quantity, received_qty FROM purchase_order_lines WHERE order_id = ?"
                    ).all(grn.source_id) as any[];
                    const allReceived = poLines.every((pl: any) => (pl.received_qty || 0) >= pl.quantity);
                    db.prepare("UPDATE purchase_orders SET delivery_status = ? WHERE id = ?")
                        .run(allReceived ? 'RECEIVED' : 'PARTIAL', grn.source_id);
                } catch (e) { /* ignore */ }
            }

            // 3. AP Accrual journal (Goods Received Not Invoiced - GRNI)
            const grniAccount = db.prepare(
                "SELECT id FROM accounts WHERE name LIKE '%بضاعة مستلمة%' OR name LIKE '%GRNI%' OR name LIKE '%Goods Received%'"
            ).get() as any;

            const inventoryAccount = db.prepare(
                "SELECT id FROM accounts WHERE name LIKE '%مخزون%' OR name LIKE '%Inventory%'"
            ).get() as any;

            if (grniAccount && inventoryAccount) {
                JournalService.createJournalEntry({
                    voucher_type: 'GRN',
                    date: grn.date || new Date().toISOString().split('T')[0],
                    reference_no: grn.ref_no,
                    description: `قيد استلام بضاعة - ${grn.ref_no} (في انتظار الفاتورة)`,
                    currency_id: 'ILS',
                    exchange_rate: 1,
                    status: 'POSTED',
                    branch_id: db.prepare("SELECT id FROM branches WHERE is_main = 1").get()?.id || null
                }, [
                    { account_id: inventoryAccount.id, debit: 0, credit: 0, line_description: `بضاعة مستلمة ${grn.ref_no}` },
                    { account_id: grniAccount.id, debit: 0, credit: 0, line_description: `GRNI - ${grn.ref_no}` }
                ]);
            }

            // 4. Set status → PENDING
            db.prepare(`
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
    static invoiceFromGRN(grnId: string) {
        return db.transaction(() => {
            const grn = db.prepare("SELECT * FROM goods_receipts WHERE id = ?").get(grnId) as any;
            if (!grn) throw new Error("سند الاستلام غير موجود");
            if (grn.status !== 'PENDING') throw new Error("لا يمكن إنشاء فاتورة إلا من سند حالته معلق");

            const lines = db.prepare("SELECT * FROM goods_receipt_lines WHERE grn_id = ?").all(grnId) as any[];
            if (lines.length === 0) throw new Error("السند لا يحتوي أصناف");

            const invoiceId = uuidv4();
            const invoiceNo = JournalService.getNextVoucherNo('PINV');
            const today = new Date().toISOString().split('T')[0];

            // Create purchase invoice header (DRAFT - user will fill prices)
            db.prepare(`
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
                branch_id: db.prepare("SELECT id FROM branches WHERE is_main = 1").get()?.id || null,
                warehouse_id: grn.warehouse_id || null,
                date: today,
                due_date: today,
                grn_id: grnId,
            });

            // Add invoice lines from GRN lines (qty copied, prices = 0 for user to fill)
            const insertLine = db.prepare(`
                INSERT INTO purchase_invoice_lines (
                    id, invoice_id, item_id, quantity, unit_id,
                    unit_price, total_price, tax_amount, net_total
                ) VALUES (
                    @id, @invoice_id, @item_id, @quantity, @unit_id,
                    0, 0, 0, 0
                )
            `);

            for (const l of lines) {
                const item = db.prepare("SELECT base_unit_id FROM items WHERE id = ?").get(l.item_id) as any;
                insertLine.run({
                    id: uuidv4(),
                    invoice_id: invoiceId,
                    item_id: l.item_id,
                    quantity: l.quantity,
                    unit_id: item?.base_unit_id || null,
                });
            }

            // Mark GRN as POSTED
            db.prepare(`
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
    static get(id: string) {
        const grn = db.prepare("SELECT * FROM goods_receipts WHERE id = ?").get(id) as any;
        if (!grn) return null;

        const lines = db.prepare(`
            SELECT l.*, i.name_ar as item_name_ar, i.code as item_code_db
            FROM goods_receipt_lines l
            LEFT JOIN items i ON l.item_id = i.id
            WHERE l.grn_id = ?
        `).all(id);

        return { header: grn, lines };
    }

    static list() {
        return db.prepare(`
            SELECT g.*, s.name_ar as supplier_name
            FROM goods_receipts g
            LEFT JOIN business_partners s ON g.supplier_id = s.id
            ORDER BY g.created_at DESC
        `).all();
    }
}
