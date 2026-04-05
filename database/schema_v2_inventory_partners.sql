-- ================================================================
-- 1. الوحدات (Units of Measure - UOM)
-- حبة، كرتونة، متر، كغم
-- ================================================================
CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    code TEXT, -- PCS, BOX, KG
    is_active INTEGER DEFAULT 1
);

-- ================================================================
-- 2. مجموعات الأصناف (Item Categories) - شجري
-- إلكترونيات -> جوالات -> سامسونج
-- ================================================================
CREATE TABLE IF NOT EXISTS item_categories (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    parent_id TEXT,
    description TEXT,
    FOREIGN KEY (parent_id) REFERENCES item_categories(id)
);

-- ================================================================
-- 3. بطاقة الصنف (Items)
-- الجدول المركزي للمخزون
-- ================================================================
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE, -- Item Code / SKU
    barcode TEXT UNIQUE, -- International Barcode
    name_ar TEXT NOT NULL,
    name_en TEXT,
    category_id TEXT,
    type TEXT DEFAULT 'STOCK', -- STOCK (مخزني), SERVICE (خدمي), KIT (مجمع)
    
    -- Units
    base_unit_id TEXT NOT NULL, -- الوحدة الأساسية (حبة)
    sale_unit_id TEXT, -- وحدة البيع الافتراضية
    purchase_unit_id TEXT, -- وحدة الشراء الافتراضية
    conversion_factor DECIMAL(18,4) DEFAULT 1, -- معامل التحويل للوحدة الثانية (للمستقبل)

    -- Financial Links (للتوجيه المحاسبي الآلي)
    sales_account_id TEXT, -- حساب الإيرادات
    cogs_account_id TEXT, -- حساب تكلفة البضاعة المباعة
    inventory_account_id TEXT, -- حساب المخزون
    
    -- Stock Info
    min_stock_level DECIMAL(18,4) DEFAULT 0, -- حد الطلب
    reorder_point DECIMAL(18,4) DEFAULT 0,
    
    -- Pricing
    cost_price DECIMAL(18,4) DEFAULT 0, -- متوسط التكلفة (يحدث آلياً)
    sale_price DECIMAL(18,4) DEFAULT 0, -- سعر بيع الجمهور
    wholesale_price DECIMAL(18,4) DEFAULT 0, -- سعر الجملة
    
    tax_id TEXT, -- ضريبة القيمة المضافة المرتبطة
    image_path TEXT,
    is_active INTEGER DEFAULT 1,
    
    FOREIGN KEY (category_id) REFERENCES item_categories(id),
    FOREIGN KEY (base_unit_id) REFERENCES units(id),
    FOREIGN KEY (tax_id) REFERENCES taxes(id)
);

-- ================================================================
-- 4. الشركاء (Business Partners)
-- يجمع العملاء والموردين في جدول واحد لتسهيل التقارير
-- ================================================================
CREATE TABLE IF NOT EXISTS business_partners (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE, -- C-001, S-001
    name_ar TEXT NOT NULL,
    name_en TEXT,
    type TEXT NOT NULL, -- CUSTOMER, SUPPLIER, BOTH
    
    -- Contact Info
    phone TEXT,
    mobile TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    tax_number TEXT, -- رقم المشتغل المرخص
    
    -- Financial Setup
    linked_account_id TEXT, -- حساب الذمة في شجرة الحسابات (مهم جداً)
    credit_limit DECIMAL(18,4) DEFAULT 0, -- سقف الدين
    payment_term_days INTEGER DEFAULT 0, -- فترة السداد (30 يوم مثلاً)
    price_list_id TEXT, -- قائمة الأسعار المربوطة (جملة/مفرق)
    
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (linked_account_id) REFERENCES gl_chart_of_accounts(id)
);

-- ================================================================
-- 5. تصنيفات الشركاء (Partner Types/Classes)
-- ================================================================
CREATE TABLE IF NOT EXISTS customer_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    discount DECIMAL(18,4) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
