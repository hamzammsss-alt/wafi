-- ================================================================
-- 1. الموظفين (Employees)
-- ================================================================
CREATE TABLE IF NOT EXISTS hr_employees (
    id TEXT PRIMARY KEY, -- UUID
    employee_code TEXT NOT NULL UNIQUE, -- EMP-001
    
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    
    position TEXT, -- المسمى الوظيفي
    department TEXT, -- القسم
    branch_id TEXT, -- يتبع لأي فرع
    
    -- البيانات المالية
    basic_salary REAL DEFAULT 0, -- الراتب الأساسي
    currency_id TEXT NOT NULL, -- عملة الراتب
    
    join_date DATE,
    
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, RESIGNED, TERMINATED
    
    user_id TEXT, -- ربط مع مستخدم النظام (اختياري)
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

-- ================================================================
-- 2. سجل الدوام (Attendance Log)
-- ================================================================
CREATE TABLE IF NOT EXISTS hr_attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    
    check_in TIME,
    check_out TIME,
    
    status TEXT DEFAULT 'PRESENT', -- PRESENT, ABSENT, LEAVE, HOLIDAY
    
    overtime_hours REAL DEFAULT 0, -- ساعات الإضافي
    late_minutes INTEGER DEFAULT 0, -- دقائق التأخير
    
    notes TEXT,
    
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

-- ================================================================
-- 3. السلف والقروض (Loans & Advances)
-- ================================================================
CREATE TABLE IF NOT EXISTS hr_loans (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    
    amount REAL NOT NULL,
    reason TEXT,
    
    is_deducted INTEGER DEFAULT 0, -- هل تم خصمها من الراتب؟
    deduction_date DATE, -- تاريخ الخصم (مع أي راتب)
    
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

-- ================================================================
-- 4. مسير الرواتب (Payroll / Salary Slips)
-- الكشف النهائي للراتب الشهري
-- ================================================================
CREATE TABLE IF NOT EXISTS hr_salary_slips (
    id TEXT PRIMARY KEY,
    slip_no TEXT NOT NULL UNIQUE, -- PAY-2026-01-EMP001
    
    employee_id TEXT NOT NULL,
    
    month INTEGER NOT NULL, -- 1
    year INTEGER NOT NULL, -- 2026
    
    -- التفاصيل المالية
    basic_salary REAL DEFAULT 0,
    
    total_allowances REAL DEFAULT 0, -- بدلات ومكافآت
    total_overtime_amount REAL DEFAULT 0, -- قيمة الإضافي
    
    total_deductions REAL DEFAULT 0, -- خصومات غياب
    loan_deduction REAL DEFAULT 0, -- خصم السلف
    
    net_salary REAL NOT NULL, -- الصافي للدفع
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, POSTED (تم الدفع)
    payment_date DATE,
    
    journal_header_id TEXT, -- القيد المحاسبي
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
    FOREIGN KEY (journal_header_id) REFERENCES gl_journal_headers(id)
);
