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
