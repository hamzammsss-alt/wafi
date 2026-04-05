-- ================================================================
-- V28 INVENTORY PERIOD CLOSING
-- Tables to manage inventory periods and lock dates
-- ================================================================

-- Stores the global closing date. No transaction allowed before this date.
CREATE TABLE IF NOT EXISTS inventory_closing (
    id TEXT PRIMARY KEY,
    closing_date DATE NOT NULL,
    closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_by TEXT,
    notes TEXT
);

-- We only need the latest date, but we keep history in this table.
-- The effective lock date is MAX(closing_date).
