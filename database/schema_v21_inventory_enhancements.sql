-- ================================================================
-- 1. صور الأصناف (Item Images)
-- ================================================================
CREATE TABLE IF NOT EXISTS item_images (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    image_path TEXT NOT NULL, -- مسار الصورة محلياً
    is_main INTEGER DEFAULT 0, -- هل هي الصورة الرئيسية؟
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
