-- Schema V43: Dispatch Tables
-- Describes the tables used for warehouse dispatch operations (سندات الإرسال)

CREATE TABLE IF NOT EXISTS dispatch_header (
    id TEXT PRIMARY KEY, -- UUID
    serial_no TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'محفوظ',
    dispatch_type TEXT DEFAULT 'تحويل داخلي',
    dispatch_date TEXT NOT NULL,
    dispatch_time TEXT NOT NULL,

    from_warehouse_id TEXT NOT NULL, -- UUID
    to_type TEXT NOT NULL,
    to_id TEXT NOT NULL, -- UUID

    ledger_id TEXT, -- UUID
    sales_rep_id TEXT, -- UUID
    truck_id TEXT, -- UUID

    -- UI matching fields
    carrier_id TEXT,
    tracking_no TEXT,
    is_sent INTEGER DEFAULT 0,
    is_maintenance INTEGER DEFAULT 0,
    customer_ref TEXT,
    send_to TEXT,
    shipment_no TEXT,
    receiver_name TEXT,
    receiver_phone TEXT,
    delivery_date TEXT,
    delivery_address TEXT,
    delivery_instructions TEXT,
    invoice_id TEXT, -- Added for invoice linkage
    posted_at TEXT, -- Time posted
    invoiced_at TEXT, -- Time invoiced
    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    
    FOREIGN KEY(from_warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS dispatch_lines (
    id TEXT PRIMARY KEY, -- UUID
    header_id TEXT, -- UUID
    line_no INTEGER,
    item_id TEXT, -- UUID
    uom TEXT,
    qty REAL DEFAULT 0,
    bin_id TEXT,
    batch_no TEXT,
    expiry_date TEXT,
    ref TEXT,
    line_note TEXT,
    
    FOREIGN KEY(header_id) REFERENCES dispatch_header(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);
