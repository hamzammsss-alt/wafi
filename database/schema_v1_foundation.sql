-- تفعيل مفاتيح الربط (Foreign Keys) في SQLite
-- PRAGMA foreign_keys = ON;

-- ================================================================
-- 1. جدول إعدادات الشركة (System Info)
-- يحتوي على بيانات الشركة التي تظهر في ترويسة الفواتير
-- ================================================================
CREATE TABLE IF NOT EXISTS system_info (
    id TEXT PRIMARY KEY, -- UUID
    company_name_ar TEXT NOT NULL,
    company_name_en TEXT,
    tax_number TEXT, -- الرقم الضريبي (المشتغل المرخص)
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_path TEXT,
    base_currency_id TEXT, -- عملة الأساس (عادة الشيكل)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 2. جدول العملات (Currencies)
-- ضروري جداً للنظام متعدد العملات (شيكل، دولار، دينار)
-- ================================================================
CREATE TABLE IF NOT EXISTS currencies (
    id TEXT PRIMARY KEY, -- UUID
    code TEXT NOT NULL UNIQUE, -- NIS, USD, JOD
    name_ar TEXT NOT NULL,
    name_en TEXT,
    symbol TEXT, -- ₪, $, JD
    is_base INTEGER DEFAULT 0, -- 1 = العملة الأساسية، 0 = عملة أجنبية
    exchange_rate DECIMAL(18,4) DEFAULT 1.0, -- سعر الصرف مقابل العملة الأساسية
    last_update DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 3. جدول أسعار الصرف التاريخية (Exchange Rates History)
-- لحفظ تاريخ تغير العملات (مهم للتقارير المالية السابقة)
-- ================================================================
CREATE TABLE IF NOT EXISTS currency_rates_history (
    id TEXT PRIMARY KEY, -- UUID
    currency_id TEXT NOT NULL,
    rate REAL NOT NULL,
    rate_date DATE NOT NULL,
    FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

-- ================================================================
-- 4. جدول الفروع والمستودعات (Branches & Warehouses)
-- ================================================================
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    type TEXT DEFAULT 'BRANCH', -- MAIN, BRANCH, WAREHOUSE
    is_main INTEGER DEFAULT 0, -- Legacy (kept for safety, or we can use type='MAIN')
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active INTEGER DEFAULT 1,
    sync_status INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 5. جدول المستخدمين (Users)
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role_id TEXT DEFAULT 'admin', -- تمت إضافة هذا العمود الناقص
    branch_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ================================================================
-- 6. جدول الضرائب (Taxes)
-- يدعم ضريبة القيمة المضافة وغيرها
-- ================================================================
CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY, -- UUID
    name_ar TEXT NOT NULL, -- ضريبة القيمة المضافة
    name_en TEXT,
    percentage DECIMAL(18,4) NOT NULL, -- 0.16
    type TEXT DEFAULT 'VAT', -- VAT, PURCHASE_TAX
    is_active INTEGER DEFAULT 1
);

-- ================================================================
-- 7. دليل الحسابات (Chart of Accounts) - العمود الفقري
-- ================================================================
CREATE TABLE IF NOT EXISTS gl_chart_of_accounts (
    id TEXT PRIMARY KEY, -- UUID
    account_code TEXT NOT NULL UNIQUE, -- 1, 11, 1101 (الترميز الشجري)
    name_ar TEXT NOT NULL,
    name_en TEXT,
    parent_id TEXT, -- الحساب الأب (لإبناء الشجرة)
    account_type TEXT, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    is_transactional INTEGER DEFAULT 1, -- 1=يقبل حركات، 0=حساب تجميعي (رئيسي)
    currency_id TEXT, -- NULL = يقبل كل العملات، أو ID لعملة محددة
    requires_cost_center INTEGER DEFAULT 0, -- هل يتطلب مركز تكلفة؟
    balance DECIMAL(18,4) DEFAULT 0.0, -- الرصيد الحالي (للعرض السريع)
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES gl_chart_of_accounts(id),
    FOREIGN KEY (currency_id) REFERENCES currencies(id)
);
