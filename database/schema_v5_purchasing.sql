-- ================================================================
-- 1. رأس فاتورة المشتريات (Purchase Invoice Header)
-- ================================================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id TEXT PRIMARY KEY, -- UUID
    invoice_no TEXT NOT NULL UNIQUE, -- PINV-2026-0001
    vendor_invoice_no TEXT, -- رقم فاتورة المورد الورقية (مهم جداً للمطابقة)
    
    supplier_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL, -- المستودع المستقبل للبضاعة
    
    date DATE NOT NULL,
    due_date DATE,
    
    -- Financial Totals
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    discount_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    
    -- Import & Currency Info (للاستيراد)
    currency_id TEXT NOT NULL,
    exchange_rate REAL DEFAULT 1,
    is_import INTEGER DEFAULT 0, -- 0=محلي، 1=استيراد خارجي
    
    status TEXT DEFAULT 'POSTED',
    payment_status TEXT DEFAULT 'UNPAID',
    
    notes TEXT,
    journal_header_id TEXT, -- الرابط المحاسبي
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    -- New Fields for Clearing Invoices (Import)
    is_clearing_invoice INTEGER DEFAULT 0,
    clearing_dealer_number TEXT,
    clearing_hebrew_name TEXT,
    clearing_original_date DATE,
    shipment_id TEXT,

    FOREIGN KEY (supplier_id) REFERENCES business_partners(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_id) REFERENCES branches(id),
    FOREIGN KEY (journal_header_id) REFERENCES gl_journal_headers(id)
);

-- ================================================================
-- 2. تفاصيل فاتورة المشتريات (Purchase Invoice Lines)
-- ================================================================
CREATE TABLE IF NOT EXISTS purchase_invoice_lines (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    
    item_id TEXT NOT NULL,
    description TEXT,
    
    quantity REAL NOT NULL,
    unit_id TEXT NOT NULL,
    
    unit_price REAL NOT NULL, -- تكلفة الشراء المباشرة
    total_price REAL NOT NULL,
    
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_id TEXT,
    
    net_total REAL NOT NULL,
    
    -- Landed Cost Fields (للمستقبل: لتخزين نصيب القطعة من الجمارك والشحن)
    landed_cost_share REAL DEFAULT 0, 
    final_cost_price REAL DEFAULT 0, -- السعر النهائي بعد تحميل المصاريف
    
    FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_purch_inv_supplier ON purchase_invoices(supplier_id);

-- ================================================================
-- 3. طلبيات الشراء (Purchase Orders)
-- ================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE,
    supplier_id TEXT NOT NULL,
    branch_id TEXT,
    date DATE NOT NULL,
    delivery_date DATE,
    
    currency_id TEXT DEFAULT 'ILS',
    exchange_rate REAL DEFAULT 1,
    
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, COMPLETED, CANCELLED
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES business_partners(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
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

-- Indexes for PO
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);


-- ================================================================
-- 4. طلبات الشراء (Purchase Requests) - Internal
-- ================================================================
CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    request_no TEXT NOT NULL UNIQUE,
    branch_id TEXT,
    warehouse_id TEXT, -- Requested for this warehouse
    requester_id TEXT, -- Employee or User
    
    date DATE NOT NULL,
    needed_date DATE,
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, APPROVED, REJECTED, ORDERED
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
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

-- Indexes for PR
CREATE INDEX IF NOT EXISTS idx_pr_warehouse ON purchase_requests(warehouse_id);
