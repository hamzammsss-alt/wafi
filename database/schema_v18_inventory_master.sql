-- ================================================================
-- 1. العلامات التجارية (Brands)
-- ================================================================
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    origin_country TEXT, -- بلد المنشأ
    website TEXT,
    logo_path TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Update Items Table to include Brand ID
-- Note: 'items' table created in database.ts or v1.
ALTER TABLE items ADD COLUMN brand_id TEXT;

-- ================================================================
-- 2. تقسيمات المستودعات (Warehouse Bins)
-- رفوف، طوابق، ممرات
-- ================================================================
-- Note: 'warehouses' table should already exist. IF NOT, we define it here loosely just in case.
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS warehouse_bins (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    code TEXT NOT NULL, -- A-01-01 (Aisle-Shelf-Bin)
    name TEXT, -- Optional descriptive name
    type TEXT, -- STORAGE, PICKING, RECEIVING
    max_weight DECIMAL(18,4),
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- ================================================================
-- 3. تحويلات الوحدات (Item UOM Conversions)
-- ================================================================
CREATE TABLE IF NOT EXISTS item_uom_conversions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    from_unit_id TEXT NOT NULL, -- الوحدة الكبيرة (كرتونة)
    to_unit_id TEXT NOT NULL, -- الوحدة الصغيرة (حبة)
    factor DECIMAL(18,4) NOT NULL, -- كم حبة في الكرتونة؟
    barcode TEXT, -- باركود خاص بهذه الوحدة
    sale_price DECIMAL(18,4), -- سعر بيع خاص لهذه الوحدة
    is_base_conversion INTEGER DEFAULT 0, -- هل هي التحويل الأساسي للعرض؟
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (from_unit_id) REFERENCES units(id),
    FOREIGN KEY (to_unit_id) REFERENCES units(id)
);

-- ================================================================
-- 4. سمات الأصناف (Item Attributes)
-- اللون، المقاس، الموديل
-- ================================================================
CREATE TABLE IF NOT EXISTS item_attributes (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL, -- اللون
    name_en TEXT, -- Color
    type TEXT DEFAULT 'TEXT' -- TEXT, NUMBER, SELECT
);

CREATE TABLE IF NOT EXISTS item_attribute_values (
    id TEXT PRIMARY KEY,
    attribute_id TEXT NOT NULL,
    value TEXT NOT NULL, -- أحمر، XL
    FOREIGN KEY (attribute_id) REFERENCES item_attributes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS item_has_attributes (
    item_id TEXT NOT NULL,
    attribute_value_id TEXT NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_value_id) REFERENCES item_attribute_values(id),
    PRIMARY KEY (item_id, attribute_value_id)
);
