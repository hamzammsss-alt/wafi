-- ================================================================
-- Schema v19: Partners Master Data (تعاريف الشركاء)
-- ================================================================

-- 1. Regions (المناطق)
CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    parent_id TEXT, -- للمناطق الفرعية (مدينة -> حي)
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES regions(id)
);

-- 2. Customer Groups (مجموعات العملاء)
-- تصنيف العملاء: جملة، تجزئة، VIP
CREATE TABLE IF NOT EXISTS customer_groups (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    is_active INTEGER DEFAULT 1
);

-- 3. Sales Reps (مندوبين المبيعات)
CREATE TABLE IF NOT EXISTS sales_reps (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    phone TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 0, -- نسبة العمولة
    target_amount DECIMAL(18,4) DEFAULT 0, -- الهدف البيعي
    is_active INTEGER DEFAULT 1
);

-- 4. Price Lists (قوائم الأسعار)
CREATE TABLE IF NOT EXISTS price_lists (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    currency_id TEXT, -- العملة
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS price_list_items (
    id TEXT PRIMARY KEY,
    price_list_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    price DECIMAL(18,4) NOT NULL,
    min_quantity DECIMAL(18,4) DEFAULT 1,
    FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- 5. Updates to Business Partners (تحديث جدول الشركاء)
-- Note: SQLite doesn't support adding multiple columns in one ALTER TABLE statement easily in older versions,
-- but standard SQLite supports it. If fails, we do one by one. Or we just create a mental note that these cols need to exist.
-- We will use "ALTER TABLE ADD COLUMN" for each if not exists check logic usually done in app, 
-- but here we just define the expectations.
-- In our system, we might need to manually run migration or just ensure these columns are added.

ALTER TABLE business_partners ADD COLUMN region_id TEXT REFERENCES regions(id);
ALTER TABLE business_partners ADD COLUMN group_id TEXT REFERENCES customer_groups(id);
ALTER TABLE business_partners ADD COLUMN sales_rep_id TEXT REFERENCES sales_reps(id);
ALTER TABLE business_partners ADD COLUMN website TEXT;
ALTER TABLE business_partners ADD COLUMN credit_days INTEGER;
