-- Schema V65: Vendor + Payables Foundation

CREATE TABLE IF NOT EXISTS crm_vendors (
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
    payable_account_id TEXT,
    price_list_id TEXT,
    buyer_id TEXT,
    territory_id TEXT,
    payment_hold INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_vendor_contacts (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    job_title TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_vendor_addresses (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
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
    FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_vendor_payment_profiles (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL UNIQUE,
    payment_limit REAL NOT NULL DEFAULT 0,
    overdue_limit REAL NOT NULL DEFAULT 0,
    max_bill_age_days INTEGER,
    risk_level TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    requires_approval_on_hold INTEGER NOT NULL DEFAULT 1,
    auto_hold_on_overdue INTEGER NOT NULL DEFAULT 0,
    auto_hold_on_payment_limit INTEGER NOT NULL DEFAULT 0,
    hold_reason TEXT,
    last_review_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_vendor_price_profiles (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    price_list_id TEXT NOT NULL,
    discount_percent REAL NOT NULL DEFAULT 0,
    effective_from TEXT,
    effective_to TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_vendor_follow_ups (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    follow_up_date TEXT NOT NULL,
    follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('CALL', 'EMAIL', 'VISIT', 'REMINDER', 'COMMITMENT', 'DISPUTE')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DONE', 'CANCELLED')),
    assigned_to TEXT,
    subject TEXT,
    note_text TEXT,
    expected_payment_amount REAL,
    expected_payment_date TEXT,
    related_source_type TEXT,
    related_source_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_vendor_hold_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('PLACE_HOLD', 'RELEASE_HOLD')),
    reason TEXT NOT NULL,
    manual INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES crm_vendors(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_vendors_company_code_v65
    ON crm_vendors(company_id, code);
CREATE INDEX IF NOT EXISTS idx_crm_vendors_company_status_v65
    ON crm_vendors(company_id, status, is_active, name, code);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_vendor_v65
    ON crm_vendor_contacts(vendor_id, is_primary, full_name);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_contacts_primary_vendor_v65
    ON crm_vendor_contacts(vendor_id)
    WHERE is_primary = 1;
CREATE INDEX IF NOT EXISTS idx_crm_addresses_vendor_v65
    ON crm_vendor_addresses(vendor_id, address_type, is_primary);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_addresses_primary_vendor_type_v65
    ON crm_vendor_addresses(vendor_id, address_type)
    WHERE is_primary = 1;
CREATE INDEX IF NOT EXISTS idx_crm_payment_profile_vendor_v65
    ON crm_vendor_payment_profiles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_crm_price_profiles_vendor_v65
    ON crm_vendor_price_profiles(vendor_id, price_list_id);
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_vendor_v65
    ON crm_vendor_follow_ups(company_id, vendor_id, status, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_crm_hold_logs_vendor_v65
    ON crm_vendor_hold_logs(company_id, vendor_id, created_at);

ALTER TABLE business_partners ADD COLUMN vendor_enabled INTEGER DEFAULT 1;
ALTER TABLE business_partners ADD COLUMN vendor_code TEXT;
ALTER TABLE business_partners ADD COLUMN vendor_name_ar TEXT;
ALTER TABLE business_partners ADD COLUMN vendor_name_en TEXT;
ALTER TABLE business_partners ADD COLUMN vendor_currency_id TEXT;
ALTER TABLE business_partners ADD COLUMN vendor_account_id TEXT;
ALTER TABLE business_partners ADD COLUMN buyer_id TEXT;
ALTER TABLE business_partners ADD COLUMN payment_term_days INTEGER DEFAULT 0;

INSERT OR IGNORE INTO crm_vendors (
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
    payable_account_id,
    price_list_id,
    buyer_id,
    territory_id,
    payment_hold,
    is_active,
    remarks,
    created_at,
    updated_at
)
SELECT
    bp.id,
    'COMP_01',
    COALESCE(NULLIF(TRIM(bp.vendor_code), ''), NULLIF(TRIM(bp.code), ''), bp.id),
    COALESCE(NULLIF(TRIM(bp.vendor_name_en), ''), NULLIF(TRIM(bp.name_en), ''), NULLIF(TRIM(bp.name_ar), ''), bp.id),
    COALESCE(NULLIF(TRIM(bp.vendor_name_ar), ''), NULLIF(TRIM(bp.name_ar), ''), NULL),
    NULLIF(TRIM(bp.tax_number), ''),
    NULL,
    NULLIF(TRIM(bp.phone), ''),
    NULLIF(TRIM(bp.email), ''),
    NULLIF(TRIM(bp.mobile), ''),
    CASE
        WHEN COALESCE(bp.is_active, 1) = 0 THEN 'INACTIVE'
        ELSE 'ACTIVE'
    END,
    NULLIF(TRIM(bp.vendor_currency_id), ''),
    NULL,
    NULLIF(TRIM(bp.vendor_account_id), ''),
    NULLIF(TRIM(bp.price_list_id), ''),
    COALESCE(NULLIF(TRIM(bp.buyer_id), ''), NULLIF(TRIM(bp.sales_rep_id), '')),
    NULLIF(TRIM(bp.region_id), ''),
    0,
    COALESCE(bp.is_active, 1),
    NULLIF(TRIM(bp.notes), ''),
    COALESCE(bp.created_at, CURRENT_TIMESTAMP),
    COALESCE(bp.created_at, CURRENT_TIMESTAMP)
FROM business_partners bp
WHERE UPPER(COALESCE(bp.type, 'SUPPLIER')) IN ('SUPPLIER', 'BOTH');
