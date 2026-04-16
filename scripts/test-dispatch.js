const sqlite3 = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = sqlite3('database.sqlite', { verbose: console.log });
db.pragma('foreign_keys = ON');

try {
    const fromWarehouseId = db.prepare('SELECT id FROM warehouses LIMIT 1').get()?.id;
    if (!fromWarehouseId) throw new Error("No warehouse found");

    const header = {
        serial_no: 'جديد',
        status: 'محفوظ',
        dispatch_type: 'تحويل داخلي',
        dispatch_date: '2026-02-23',
        dispatch_time: '08:00',
        from_warehouse_id: fromWarehouseId,
        to_type: 'Warehouse',
        to_id: fromWarehouseId,
        ledger_id: '',
        sales_rep_id: '',
        truck_id: '',
        carrier_id: null,
        tracking_no: '',
        is_sent: false,
        is_maintenance: false,
        customer_ref: '',
        send_to: '',
        shipment_no: '',
        receiver_name: '',
        receiver_phone: '',
        delivery_date: '',
        delivery_address: '',
        delivery_instructions: '',
        notes: '',
        source_type: '',
        source_id: ''
    };

    const item = db.prepare('SELECT id FROM items LIMIT 1').get()?.id || 'demo-item';

    const lines = [{
        item_id: item,
        uom: 'PCS',
        qty: 1,
        ref: '',
        line_note: '',
        source_line_id: ''
    }];

    // Simulate update
    let currentId = null;
    const status = 'محفوظ';

    const countQuery = db.prepare(`SELECT COUNT(*) as count FROM dispatch_header`).get();
    const nextNo = (countQuery.count || 0) + 1;
    const serial = `DSP-2026-${String(nextNo).padStart(4, '0')}`;

    console.log("Attempting INSERT...");
    db.prepare(`
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
        id: uuidv4(),
        serial_no: serial,
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
    console.log("INSERT successful");

} catch (e) {
    console.error("FAILED:", e.message);
}
