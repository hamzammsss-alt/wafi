CREATE TABLE IF NOT EXISTS analysis_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    parent_id TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES analysis_codes (id) ON DELETE CASCADE
);
