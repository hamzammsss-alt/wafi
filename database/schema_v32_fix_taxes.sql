DROP TABLE IF EXISTS taxes;

CREATE TABLE taxes (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    rate REAL DEFAULT 0,
    type TEXT, -- 'Add' / 'Deduct'
    is_active INTEGER DEFAULT 1
);
