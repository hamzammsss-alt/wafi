-- ================================================================
-- 1. رأس فاتورة المبيعات (Sales Invoice Header)
-- هذا الجدول يحفظ البيانات التجارية للفاتورة (من اشترى، متى، أين)
-- ================================================================
CREATE TABLE IF NOT EXISTS sales_invoices (
    id TEXT PRIMARY KEY, -- UUID
    invoice_no TEXT NOT NULL UNIQUE, -- INV-2026-0001 (Human Readable)
    
    customer_id TEXT NOT NULL, -- الزبون
    branch_id TEXT NOT NULL, -- الفرع/المعرض
    warehouse_id TEXT NOT NULL, -- المستودع الذي ستخرج منه البضاعة
    
    date DATE NOT NULL,
    due_date DATE, -- تاريخ الاستحقاق
    
    -- Financial Totals
    subtotal REAL DEFAULT 0, -- المجموع قبل الضريبة
    tax_total REAL DEFAULT 0, -- مجموع الضريبة
    discount_total REAL DEFAULT 0, -- مجموع الخصم
    grand_total REAL DEFAULT 0, -- الصافي للدفع
    
    currency_id TEXT NOT NULL,
    exchange_rate REAL DEFAULT 1,
    
    status TEXT DEFAULT 'POSTED', -- DRAFT, POSTED, VOID
    payment_status TEXT DEFAULT 'UNPAID', -- PAID, PARTIAL, UNPAID
    
    notes TEXT,
    
    -- Linking to GL (الرابط مع المحاسبة)
    journal_header_id TEXT, 
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    FOREIGN KEY (customer_id) REFERENCES business_partners(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_id) REFERENCES branches(id), -- Assuming warehouses are in branches table or warehouse table? Using generic logic for now.
    FOREIGN KEY (journal_header_id) REFERENCES gl_journal_headers(id)
);

-- ================================================================
-- 2. تفاصيل فاتورة المبيعات (Sales Invoice Lines)
-- الأصناف والكميات
-- ================================================================
CREATE TABLE IF NOT EXISTS sales_invoice_lines (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    
    item_id TEXT NOT NULL,
    description TEXT, -- وصف الصنف (يمكن تعديله)
    
    quantity REAL NOT NULL,
    unit_id TEXT NOT NULL, -- الوحدة المستخدمة (حبة/كرتونة)
    
    unit_price REAL NOT NULL, -- السعر الإفرادي
    total_price REAL NOT NULL, -- (Quantity * Price)
    
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_id TEXT, -- نوع الضريبة المطبقة
    
    net_total REAL NOT NULL, -- (Total - Discount + Tax)
    
    FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- Index for speed
CREATE INDEX IF NOT EXISTS idx_sales_inv_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_date ON sales_invoices(date);

-- ================================================================
-- 3. رأس مرتجعات المبيعات (Sales Returns Header)
-- ================================================================
CREATE TABLE IF NOT EXISTS sales_returns (
    id TEXT PRIMARY KEY,
    return_no TEXT NOT NULL UNIQUE, -- مثلاً: SR-2026-0001
    
    original_invoice_id TEXT, -- الرابط الداخلي مع الفاتورة الأصلية
    original_invoice_no TEXT, -- رقم الفاتورة الأصلية (للسهولة والبحث)
    
    customer_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL, -- المستودع الذي ستعود إليه البضاعة
    
    date DATE NOT NULL,
    
    -- Financial Totals
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    discount_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    
    currency_id TEXT NOT NULL DEFAULT 'ILS',
    exchange_rate REAL DEFAULT 1,
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, PENDING, POSTED, VOID
    
    notes TEXT,
    journal_header_id TEXT, -- الرابط المحاسبي (قيد الإرجاع)
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    FOREIGN KEY (original_invoice_id) REFERENCES sales_invoices(id),
    FOREIGN KEY (customer_id) REFERENCES business_partners(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_id) REFERENCES branches(id)
);

-- ================================================================
-- 4. تفاصيل مرتجعات المبيعات (Sales Return Lines)
-- ================================================================
CREATE TABLE IF NOT EXISTS sales_return_lines (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL,
    
    original_line_id TEXT, -- لمعرفة أي سطر تحديداً تم إرجاعه من الفاتورة الأصلية
    
    item_id TEXT NOT NULL,
    description TEXT,
    
    quantity REAL NOT NULL,
    unit_id TEXT NOT NULL,
    
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    tax_id TEXT,
    
    net_total REAL NOT NULL,
    return_reason TEXT, -- سبب الإرجاع (تالف، خطأ، إلخ)
    
    FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
    FOREIGN KEY (original_line_id) REFERENCES sales_invoice_lines(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- Indexes for speed
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON sales_returns(original_invoice_no);
