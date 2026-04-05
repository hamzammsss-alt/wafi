
-- ================================================================
-- 1. عروض الأسعار (Quotations)
-- ================================================================
CREATE TABLE IF NOT EXISTS sales_quotations (
    id TEXT PRIMARY KEY,
    quotation_no TEXT NOT NULL UNIQUE, -- QT-2026-001
    
    customer_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    
    date DATE NOT NULL,
    expiry_date DATE, -- تاريخ انتهاء العرض
    
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    discount_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    
    currency_id TEXT NOT NULL,
    exchange_rate REAL DEFAULT 1,
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, CONVERTED (تحول لفاتورة), EXPIRED
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES business_partners(id)
);

CREATE TABLE IF NOT EXISTS sales_quotation_lines (
    id TEXT PRIMARY KEY,
    quotation_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    description TEXT,
    quantity REAL NOT NULL,
    unit_id TEXT NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    net_total REAL NOT NULL,
    FOREIGN KEY (quotation_id) REFERENCES sales_quotations(id) ON DELETE CASCADE
);

-- ================================================================
-- 2. طلبيات المبيعات (Sales Orders)
-- ================================================================
CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE, -- SO-2026-001
    quotation_id TEXT, -- إذا نتجت عن عرض سعر
    
    customer_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    warehouse_id TEXT, 
    
    date DATE NOT NULL,
    delivery_date DATE,
    
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    discount_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    
    currency_id TEXT NOT NULL,
    
    status TEXT DEFAULT 'CONFIRMED', -- DRAFT, CONFIRMED, COMPLETED (تحول لفاتورة), CANCELLED
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES business_partners(id)
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    description TEXT,
    quantity REAL NOT NULL,
    unit_id TEXT NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    net_total REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
);
