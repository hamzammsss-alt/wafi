-- ================================================================
-- 3. طلبات الشراء (Purchase Requests)
-- ================================================================
CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    request_no TEXT NOT NULL UNIQUE,

    branch_id TEXT NOT NULL,
    warehouse_id TEXT,
    requester_id TEXT,

    date DATE NOT NULL,
    needed_date DATE,

    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SENT','PENDING_APPROVAL','APPROVED','REJECTED','ORDERED')),

    notes TEXT,

    posted_at DATETIME,
    posted_by TEXT,
    approved_at DATETIME,
    approved_by TEXT,
    rejected_at DATETIME,
    rejected_by TEXT,
    rejected_reason TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_branch_date
ON purchase_requests(branch_id, date);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_status
ON purchase_requests(status);

CREATE TABLE IF NOT EXISTS purchase_request_lines (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    
    item_id TEXT NOT NULL,
    description TEXT,
    quantity REAL NOT NULL,
    unit_id TEXT NOT NULL,
    
    notes TEXT,
    
    FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- ================================================================
-- 4. طلبيات الشراء (Purchase Orders)
-- ================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE,

    supplier_id TEXT NOT NULL,
    branch_id TEXT,
    warehouse_id TEXT, -- مهم للاستلام

    date DATE NOT NULL,
    delivery_date DATE,

    currency_id TEXT NOT NULL,
    exchange_rate REAL NOT NULL DEFAULT 1,

    subtotal REAL NOT NULL DEFAULT 0,
    tax_total REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,

    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SENT','PENDING_APPROVAL','APPROVED','REJECTED','CONFIRMED','COMPLETED','CANCELLED')),

    notes TEXT,

    posted_at DATETIME,
    posted_by TEXT,
    approved_at DATETIME,
    approved_by TEXT,
    rejected_at DATETIME,
    rejected_by TEXT,
    rejected_reason TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,

    FOREIGN KEY (supplier_id) REFERENCES business_partners(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_date
ON purchase_orders(supplier_id, date);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,

    item_id TEXT NOT NULL,
    description TEXT,

    quantity REAL NOT NULL,
    unit_id TEXT NOT NULL,

    unit_price REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,

    tax_id TEXT,               -- لو عندك جدول taxes
    tax_rate REAL DEFAULT 0,    -- أو خزّن النسبة هنا
    tax_amount REAL NOT NULL DEFAULT 0,

    total_price REAL NOT NULL, -- بعد الخصم وقبل الضريبة (أو حسب تعريفك)

    received_qty REAL NOT NULL DEFAULT 0, -- تتبع الاستلام الجزئي
    invoiced_qty REAL NOT NULL DEFAULT 0, -- تتبع الفوترة الجزئية

    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE INDEX IF NOT EXISTS idx_po_lines_order
ON purchase_order_lines(order_id);

CREATE INDEX IF NOT EXISTS idx_po_lines_item
ON purchase_order_lines(item_id);
