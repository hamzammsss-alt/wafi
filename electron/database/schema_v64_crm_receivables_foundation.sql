-- Schema V64: CRM + Receivables Foundation

CREATE TABLE IF NOT EXISTS crm_customers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    tax_no TEXT,
    registration_no TEXT,
    phone TEXT,
    email TEXT,
    mobile TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_HOLD', 'INACTIVE')),
    currency_code TEXT,
    payment_terms_id TEXT,
    receivable_account_id TEXT,
    price_list_id TEXT,
    sales_person_id TEXT,
    territory_id TEXT,
    credit_hold INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_customer_contacts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    job_title TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_customer_addresses (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    address_type TEXT NOT NULL CHECK (address_type IN ('BILLING', 'SHIPPING', 'OTHER')),
    label TEXT,
    country_code TEXT,
    city TEXT,
    region TEXT,
    street TEXT,
    postal_code TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_customer_credit_profiles (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE,
    credit_limit REAL NOT NULL DEFAULT 0,
    overdue_limit REAL NOT NULL DEFAULT 0,
    max_invoice_age_days INTEGER,
    risk_level TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    requires_approval_on_hold INTEGER NOT NULL DEFAULT 1,
    auto_hold_on_overdue INTEGER NOT NULL DEFAULT 1,
    auto_hold_on_credit_limit INTEGER NOT NULL DEFAULT 1,
    hold_reason TEXT,
    last_review_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_customer_price_profiles (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    price_list_id TEXT NOT NULL,
    discount_percent REAL NOT NULL DEFAULT 0,
    effective_from TEXT,
    effective_to TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_customer_follow_ups (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    follow_up_date TEXT NOT NULL,
    follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('CALL', 'EMAIL', 'VISIT', 'PROMISE', 'REMINDER')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DONE', 'CANCELLED')),
    assigned_to TEXT,
    subject TEXT,
    note_text TEXT,
    promise_amount REAL,
    promise_date TEXT,
    related_source_type TEXT,
    related_source_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_customer_hold_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('PLACE_HOLD', 'RELEASE_HOLD')),
    reason TEXT NOT NULL,
    manual INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_customers_company_code_v64
    ON crm_customers(company_id, code);
CREATE INDEX IF NOT EXISTS idx_crm_customers_company_status_v64
    ON crm_customers(company_id, status, is_active, name, code);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_customer_v64
    ON crm_customer_contacts(customer_id, is_primary, full_name);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_contacts_primary_customer_v64
    ON crm_customer_contacts(customer_id)
    WHERE is_primary = 1;
CREATE INDEX IF NOT EXISTS idx_crm_addresses_customer_v64
    ON crm_customer_addresses(customer_id, address_type, is_primary);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_addresses_primary_type_v64
    ON crm_customer_addresses(customer_id, address_type)
    WHERE is_primary = 1;
CREATE INDEX IF NOT EXISTS idx_crm_credit_profile_customer_v64
    ON crm_customer_credit_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_price_profiles_customer_v64
    ON crm_customer_price_profiles(customer_id, price_list_id);
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_customer_v64
    ON crm_customer_follow_ups(company_id, customer_id, status, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_crm_hold_logs_customer_v64
    ON crm_customer_hold_logs(company_id, customer_id, created_at);

ALTER TABLE business_partners ADD COLUMN customer_enabled INTEGER DEFAULT 1;
ALTER TABLE business_partners ADD COLUMN customer_code TEXT;
ALTER TABLE business_partners ADD COLUMN customer_name_ar TEXT;
ALTER TABLE business_partners ADD COLUMN customer_name_en TEXT;
ALTER TABLE business_partners ADD COLUMN customer_currency_id TEXT;
ALTER TABLE business_partners ADD COLUMN customer_account_id TEXT;
ALTER TABLE business_partners ADD COLUMN sales_rep_id TEXT;
ALTER TABLE business_partners ADD COLUMN payment_term_days INTEGER DEFAULT 0;

INSERT OR IGNORE INTO crm_customers (
    id,
    company_id,
    code,
    name,
    name_ar,
    tax_no,
    registration_no,
    phone,
    email,
    mobile,
    status,
    currency_code,
    payment_terms_id,
    receivable_account_id,
    price_list_id,
    sales_person_id,
    territory_id,
    credit_hold,
    is_active,
    remarks,
    created_at,
    updated_at
)
SELECT
    bp.id,
    'COMP_01',
    COALESCE(NULLIF(TRIM(bp.customer_code), ''), NULLIF(TRIM(bp.code), ''), bp.id),
    COALESCE(NULLIF(TRIM(bp.customer_name_en), ''), NULLIF(TRIM(bp.name_en), ''), NULLIF(TRIM(bp.name_ar), ''), bp.id),
    COALESCE(NULLIF(TRIM(bp.customer_name_ar), ''), NULLIF(TRIM(bp.name_ar), ''), NULL),
    NULLIF(TRIM(bp.tax_number), ''),
    NULL,
    NULLIF(TRIM(bp.phone), ''),
    NULLIF(TRIM(bp.email), ''),
    NULLIF(TRIM(bp.mobile), ''),
    CASE
        WHEN COALESCE(bp.is_active, 1) = 0 THEN 'INACTIVE'
        ELSE 'ACTIVE'
    END,
    NULLIF(TRIM(bp.customer_currency_id), ''),
    NULL,
    NULLIF(TRIM(bp.customer_account_id), ''),
    NULLIF(TRIM(bp.price_list_id), ''),
    NULLIF(TRIM(bp.sales_rep_id), ''),
    NULLIF(TRIM(bp.region_id), ''),
    0,
    COALESCE(bp.is_active, 1),
    NULLIF(TRIM(bp.notes), ''),
    COALESCE(bp.created_at, CURRENT_TIMESTAMP),
    COALESCE(bp.created_at, CURRENT_TIMESTAMP)
FROM business_partners bp
WHERE UPPER(COALESCE(bp.type, 'CUSTOMER')) IN ('CUSTOMER', 'BOTH');
