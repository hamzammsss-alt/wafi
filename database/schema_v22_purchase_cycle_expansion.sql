-- ================================================================
-- 3. طلبات الشراء (Purchase Requests)
-- ================================================================
CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    request_no TEXT NOT NULL UNIQUE, -- PRQ-2026-001
    
    branch_id TEXT NOT NULL,
    warehouse_id TEXT, -- للمستودع الطالب
    requester_id TEXT, -- الموظف الطالب
    
    date DATE NOT NULL,
    needed_date DATE, -- تاريخ الحاجة
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, APPROVED, REJECTED, ORDERED
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

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
-- 4. طلبيات الشراء (Purchase Orders) - إذا لم تكن موجودة
-- ================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE, -- PO-2026-001
    
    supplier_id TEXT NOT NULL,
    branch_id TEXT,
    
    date DATE NOT NULL,
    delivery_date DATE,
    
    currency_id TEXT NOT NULL,
    exchange_rate REAL DEFAULT 1,
    
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, CONFIRMED, COMPLETED (استلمت), CANCELLED
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    FOREIGN KEY (supplier_id) REFERENCES business_partners(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    
    item_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_id TEXT NOT NULL,
    
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    tax_amount REAL DEFAULT 0,
    
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);
