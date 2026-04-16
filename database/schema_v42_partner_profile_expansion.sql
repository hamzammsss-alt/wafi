-- ================================================================
-- V42 Partner Profile Expansion
-- Adds rich customer/supplier/employee profile fields and masters.
-- ================================================================

-- 1) New Partner Master Tables
CREATE TABLE IF NOT EXISTS partner_memberships (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS partner_sectors (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS credit_policies (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    name_he TEXT,
    currency_id TEXT,
    max_credit_limit DECIMAL(18,4) DEFAULT 0,
    max_checks_limit DECIMAL(18,4) DEFAULT 0,
    personal_check_limit DECIMAL(18,4) DEFAULT 0,
    facilitation_days INTEGER DEFAULT 0,
    facilitation_from_month_end INTEGER DEFAULT 0,
    allow_over_limit INTEGER DEFAULT 0,
    overdue_check_days INTEGER DEFAULT 0,
    check_validation_type TEXT DEFAULT 'NONE',
    include_collection_checks INTEGER DEFAULT 0,
    include_open_sales_orders INTEGER DEFAULT 0,
    allowed_check_due_days INTEGER DEFAULT 0,
    override_max_credit_limit INTEGER DEFAULT 1,
    override_max_checks_limit INTEGER DEFAULT 1,
    override_personal_check_limit INTEGER DEFAULT 1,
    override_facilitation_days INTEGER DEFAULT 1,
    override_facilitation_from_month_end INTEGER DEFAULT 1,
    override_allow_over_limit INTEGER DEFAULT 1,
    override_overdue_check_days INTEGER DEFAULT 1,
    override_check_validation_type INTEGER DEFAULT 1,
    override_include_collection_checks INTEGER DEFAULT 1,
    override_include_open_sales_orders INTEGER DEFAULT 1,
    override_allowed_check_due_days INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS partner_contact_types (
    code TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO partner_contact_types (code, name_ar, name_en, sort_order) VALUES
('WORK_PHONE', 'هاتف العمل', 'Work Phone', 1),
('HOME_PHONE', 'هاتف المنزل', 'Home Phone', 2),
('MOBILE', 'هاتف خلوي', 'Mobile Phone', 3),
('FAX', 'فاكس', 'Fax', 4),
('EMAIL', 'بريد إلكتروني', 'Email', 5),
('WEBSITE', 'موقع إلكتروني', 'Website', 6),
('GPS', 'موقع GPS', 'GPS Location', 7),
('STREET', 'شارع', 'Street', 8),
('PO_BOX', 'ص.ب.', 'P.O. Box', 9),
('SKYPE', 'سكايب', 'Skype', 10),
('OTHER', 'أخرى', 'Other', 11);

-- 2) business_partners extensions (General)
ALTER TABLE business_partners ADD COLUMN name_he TEXT;
ALTER TABLE business_partners ADD COLUMN parent_partner_id TEXT;
ALTER TABLE business_partners ADD COLUMN partner_language TEXT;
ALTER TABLE business_partners ADD COLUMN registration_date DATE;
ALTER TABLE business_partners ADD COLUMN birth_date DATE;
ALTER TABLE business_partners ADD COLUMN nationality TEXT;
ALTER TABLE business_partners ADD COLUMN is_company INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN print_prices_on_docs INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN print_balance_on_docs INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN membership_id TEXT;
ALTER TABLE business_partners ADD COLUMN sector_id TEXT;
ALTER TABLE business_partners ADD COLUMN customer_type_id TEXT;
ALTER TABLE business_partners ADD COLUMN vendor_type_id TEXT;
ALTER TABLE business_partners ADD COLUMN notes TEXT;

-- 3) business_partners extensions (Address + Contacts + Banking)
ALTER TABLE business_partners ADD COLUMN address_en TEXT;
ALTER TABLE business_partners ADD COLUMN address_he TEXT;
ALTER TABLE business_partners ADD COLUMN street_ar TEXT;
ALTER TABLE business_partners ADD COLUMN street_en TEXT;
ALTER TABLE business_partners ADD COLUMN street_he TEXT;
ALTER TABLE business_partners ADD COLUMN country_code TEXT;
ALTER TABLE business_partners ADD COLUMN timezone TEXT;
ALTER TABLE business_partners ADD COLUMN po_box TEXT;
ALTER TABLE business_partners ADD COLUMN gps_location TEXT;
ALTER TABLE business_partners ADD COLUMN contact_methods_json TEXT;
ALTER TABLE business_partners ADD COLUMN bank_accounts_json TEXT;

-- 4) business_partners extensions (Customer Tab)
ALTER TABLE business_partners ADD COLUMN customer_enabled INTEGER DEFAULT 1;
ALTER TABLE business_partners ADD COLUMN customer_name_ar TEXT;
ALTER TABLE business_partners ADD COLUMN customer_name_en TEXT;
ALTER TABLE business_partners ADD COLUMN customer_name_he TEXT;
ALTER TABLE business_partners ADD COLUMN customer_code TEXT;
ALTER TABLE business_partners ADD COLUMN customer_currency_id TEXT;
ALTER TABLE business_partners ADD COLUMN customer_account_id TEXT;
ALTER TABLE business_partners ADD COLUMN customer_discount_percent DECIMAL(9,4) DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN customer_previous_balance DECIMAL(18,4) DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN customer_tax_mode TEXT;
ALTER TABLE business_partners ADD COLUMN customer_end_deal_date DATE;
ALTER TABLE business_partners ADD COLUMN customer_item_rules_json TEXT;

-- 5) business_partners extensions (Credit Policy Tab)
ALTER TABLE business_partners ADD COLUMN credit_policy_id TEXT;
ALTER TABLE business_partners ADD COLUMN max_credit_limit DECIMAL(18,4) DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN max_checks_limit DECIMAL(18,4) DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN personal_check_limit DECIMAL(18,4) DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN facilitation_days INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN facilitation_from_month_end INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN allow_over_limit INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN overdue_unpaid_days INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN validation_type TEXT;
ALTER TABLE business_partners ADD COLUMN include_collection_checks INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN include_sales_orders_posting INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN allowed_check_due_days INTEGER DEFAULT 0;

-- 6) business_partners extensions (Supplier Tab)
ALTER TABLE business_partners ADD COLUMN supplier_enabled INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN supplier_name_ar TEXT;
ALTER TABLE business_partners ADD COLUMN supplier_name_en TEXT;
ALTER TABLE business_partners ADD COLUMN supplier_name_he TEXT;
ALTER TABLE business_partners ADD COLUMN supplier_price_list_id TEXT;
ALTER TABLE business_partners ADD COLUMN supplier_currency_id TEXT;
ALTER TABLE business_partners ADD COLUMN supplier_account_id TEXT;
ALTER TABLE business_partners ADD COLUMN supplier_tax_mode TEXT;
ALTER TABLE business_partners ADD COLUMN supplier_items_only INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN supplier_item_rules_json TEXT;
ALTER TABLE business_partners ADD COLUMN supplier_source_discount_percent DECIMAL(9,4) DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN supplier_source_discount_until DATE;

-- 7) business_partners extensions (Employee Tab)
ALTER TABLE business_partners ADD COLUMN employee_enabled INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN employee_title_ar TEXT;
ALTER TABLE business_partners ADD COLUMN employee_title_en TEXT;
ALTER TABLE business_partners ADD COLUMN employee_title_he TEXT;
ALTER TABLE business_partners ADD COLUMN employee_gender TEXT;
ALTER TABLE business_partners ADD COLUMN employee_doc_type TEXT;
ALTER TABLE business_partners ADD COLUMN employee_id_number TEXT;
ALTER TABLE business_partners ADD COLUMN employee_is_resident INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN employee_social_status TEXT;
ALTER TABLE business_partners ADD COLUMN employee_account_id TEXT;
ALTER TABLE business_partners ADD COLUMN employee_currency_id TEXT;
ALTER TABLE business_partners ADD COLUMN employee_children_count INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN employee_students_count INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN employee_dependents_count INTEGER DEFAULT 0;
ALTER TABLE business_partners ADD COLUMN employee_education TEXT;
ALTER TABLE business_partners ADD COLUMN employee_group TEXT;
ALTER TABLE business_partners ADD COLUMN employee_number TEXT;
ALTER TABLE business_partners ADD COLUMN employee_hire_date DATE;
ALTER TABLE business_partners ADD COLUMN employee_end_date DATE;

