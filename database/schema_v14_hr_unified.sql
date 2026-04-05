-- ================================================================
-- V14 Unified HR Schema (Supercedes previous partial HR schemas)
-- Compliant with Palestinian Labor Law
-- ================================================================

-- 1. ORGANIZATION STRUCTURE
-- ==========================

CREATE TABLE IF NOT EXISTS hr_departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT, -- For hierarchy (e.g. Finance -> Accounting)
    manager_id TEXT, -- Head of department
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES hr_departments(id)
);

CREATE TABLE IF NOT EXISTS hr_job_titles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. EMPLOYEE MANAGEMENT
-- =======================

CREATE TABLE IF NOT EXISTS hr_employees (
    id TEXT PRIMARY KEY,
    employee_code TEXT NOT NULL UNIQUE, -- e.g. EMP-2026-001
    
    -- Personal Info (4-part name for local convention)
    first_name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    grandfather_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    
    national_id TEXT UNIQUE, -- 9 digits
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK(gender IN ('MALE', 'FEMALE')), 
    marital_status TEXT, -- SINGLE, MARRIED, DIVORCED, WIDOWED
    nationality TEXT DEFAULT 'Palestinian',
    
    -- Contact
    mobile_phone TEXT NOT NULL,
    emergency_phone TEXT,
    email TEXT,
    address_city TEXT,
    address_street TEXT,
    
    -- Status
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, RESIGNED, TERMINATED, ON_LEAVE
    photo_url TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_employee_contracts (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    
    contract_type TEXT NOT NULL, -- LIMITED, UNLIMITED, PART_TIME
    start_date DATE NOT NULL,
    end_date DATE, -- Null for unlimited
    
    department_id TEXT,
    job_title_id TEXT,
    manager_id TEXT, -- Direct report
    
    -- Confirmation (Probation)
    probation_period_months INTEGER DEFAULT 3,
    confirmation_date DATE, -- Auto-calc or manual
    
    -- Financials
    basic_salary DECIMAL(18, 4) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'ILS', -- ILS, JOD, USD
    payment_method TEXT DEFAULT 'CASH', -- CASH, CHEQUE, BANK_TRANSFER
    
    -- Bank Details
    bank_name TEXT,
    bank_branch TEXT,
    bank_account_number TEXT,
    
    -- Allowances (Fixed)
    transport_allowance DECIMAL(18, 4) DEFAULT 0,
    communication_allowance DECIMAL(18, 4) DEFAULT 0,
    cost_of_living_allowance DECIMAL(18, 4) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (department_id) REFERENCES hr_departments(id),
    FOREIGN KEY (job_title_id) REFERENCES hr_job_titles(id),
    FOREIGN KEY (manager_id) REFERENCES hr_employees(id)
);

CREATE TABLE IF NOT EXISTS hr_employee_relatives (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relation TEXT NOT NULL, -- SPOUSE, CHILD, FATHER, MOTHER, SIBLING
    date_of_birth DATE, -- Important for children
    national_id TEXT, -- For insurance
    note TEXT,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

-- 3. LEAVE MANAGEMENT
-- ====================

CREATE TABLE IF NOT EXISTS hr_leave_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- Annual, Sick, Maternity, Bereavement
    default_days_per_year INTEGER,
    is_paid BOOLEAN DEFAULT 1,
    requires_approval BOOLEAN DEFAULT 1,
    requires_attachment BOOLEAN DEFAULT 0, -- e.g. Sick report > 2 days
    gender_restricted TEXT, -- 'MALE', 'FEMALE', or NULL for both
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_leave_balances (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    leave_type_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    
    total_days DECIMAL(5, 2) DEFAULT 0,
    used_days DECIMAL(5, 2) DEFAULT 0,
    remaining_days DECIMAL(5, 2) GENERATED ALWAYS AS (total_days - used_days) VIRTUAL,
    
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id)
);

CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    leave_type_id TEXT NOT NULL,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(5, 2) NOT NULL, -- Excludes holidays/weekends
    
    reason TEXT,
    attachment_url TEXT,
    
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approved_by TEXT,
    rejection_reason TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id),
    FOREIGN KEY (approved_by) REFERENCES hr_employees(id)
);

CREATE TABLE IF NOT EXISTS hr_public_holidays (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    days_duration INTEGER DEFAULT 1,
    is_recurring BOOLEAN DEFAULT 1, -- e.g. Labor Day vs Special One-off
    year INTEGER -- If not recurring
);

-- 4. TIME & ATTENDANCE
-- =====================

CREATE TABLE IF NOT EXISTS hr_shifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- e.g. Admin Shift, Night Shift
    start_time TIME NOT NULL, -- 08:00
    end_time TIME NOT NULL, -- 16:00
    
    weekend_days TEXT, -- JSON array e.g. ["FRIDAY", "SATURDAY"]
    
    late_grace_minutes INTEGER DEFAULT 15,
    overtime_multiplier DECIMAL(3, 2) DEFAULT 1.5,
    
    is_default BOOLEAN DEFAULT 0
);

-- Raw logs from Biometric Devices / Excel Import
CREATE TABLE IF NOT EXISTS hr_attendance_raw (
    id TEXT PRIMARY KEY,
    employee_code TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    source TEXT DEFAULT 'MANUAL', -- DEVICE_IP, EXCEL_UPLOAD
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Processed Daily Record
CREATE TABLE IF NOT EXISTS hr_attendance_daily (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    shift_id TEXT,
    
    check_in TIME,
    check_out TIME,
    
    status TEXT, -- PRESENT, ABSENT, LATE, LEAVE, HOLIDAY, REST_DAY
    
    late_minutes INTEGER DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    work_hours DECIMAL(5, 2) DEFAULT 0,
    
    is_manual_adjustment BOOLEAN DEFAULT 0,
    adjustment_reason TEXT,
    
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (shift_id) REFERENCES hr_shifts(id)
);

-- 5. PAYROLL & FINANCIALS
-- =======================

CREATE TABLE IF NOT EXISTS hr_advances (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    request_date DATE DEFAULT CURRENT_DATE,
    
    amount DECIMAL(18, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ILS', 
    
    repayment_start_date DATE, -- Which salary month to start deducting
    installments_count INTEGER DEFAULT 1,
    installment_amount DECIMAL(18, 4), -- Auto-calc
    
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, ACTIVE, PAID
    
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

CREATE TABLE IF NOT EXISTS hr_penalties (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    
    amount DECIMAL(18, 4) NOT NULL,
    currency TEXT DEFAULT 'ILS',
    reason TEXT,
    
    is_deducted BOOLEAN DEFAULT 0,
    deduction_payroll_id TEXT, -- Link to payroll when deducted
    
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

CREATE TABLE IF NOT EXISTS hr_payroll_periods (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    
    start_date DATE,
    end_date DATE,
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, LOCKED, POSTED
    generated_at DATETIME,
    generated_by TEXT,
    
    UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS hr_salary_slips (
    id TEXT PRIMARY KEY,
    payroll_period_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    
    -- Snapshots
    currency TEXT NOT NULL,
    exchange_rate_to_main DECIMAL(10, 4) DEFAULT 1,
    
    -- Earnings
    basic_salary DECIMAL(18, 4) DEFAULT 0,
    total_allowances DECIMAL(18, 4) DEFAULT 0,
    overtime_amount DECIMAL(18, 4) DEFAULT 0,
    
    -- Deductions
    absent_days_deduction DECIMAL(18, 4) DEFAULT 0,
    advance_deduction DECIMAL(18, 4) DEFAULT 0,
    penalty_deduction DECIMAL(18, 4) DEFAULT 0,
    tax_deduction DECIMAL(18, 4) DEFAULT 0,
    
    net_salary DECIMAL(18, 4) NOT NULL,
    
    payment_status TEXT DEFAULT 'UNPAID',
    
    FOREIGN KEY (payroll_period_id) REFERENCES hr_payroll_periods(id),
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);
