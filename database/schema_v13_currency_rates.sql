-- ================================================================
-- جدول أسعار العملات التاريخية (Currency Rates)
-- يخزن سجل أسعار العملات مع التاريخ والمصدر
-- ================================================================
CREATE TABLE IF NOT EXISTS currency_rates (
    id TEXT PRIMARY KEY, -- UUID
    currency_code TEXT NOT NULL, -- USD, EUR, JOD
    rate DECIMAL(18,6) NOT NULL, -- Exchange rate relative to Base Currency (ILS)
    date DATE DEFAULT CURRENT_DATE, -- The date of the rate
    source TEXT DEFAULT 'MANUAL', -- PMA, MANUAL, SYSTEM
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_currency_rates_date ON currency_rates(date);
CREATE INDEX IF NOT EXISTS idx_currency_rates_code ON currency_rates(currency_code);
