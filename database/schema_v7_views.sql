-- ================================================================
-- 1. كشف حساب الشركاء (Partner Ledger View)
-- يجمع كل الفواتير والسندات والشيكات في جدول واحد مرتب زمنياً
-- ================================================================
DROP VIEW IF EXISTS view_partner_ledger;
CREATE VIEW view_partner_ledger AS
SELECT 
    tl.account_id,
    p.id as partner_id,
    p.name_ar as partner_name,
    t.date as transaction_date,
    t.voucher_type as voucher_type, -- INV, PINV, RV, PV, JV
    t.voucher_no as voucher_no,
    tl.line_description as description,
    tl.debit,
    tl.credit,
    (CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL)) as balance_change,
    t.created_at
FROM journal_entry_lines tl
JOIN journal_entries t ON tl.journal_entry_id = t.id
-- We link to partners via account_id. 
-- Assuming business_partners table has linked_account_id
JOIN business_partners p ON p.linked_account_id = tl.account_id
WHERE t.status = 'POSTED'
ORDER BY t.date, t.created_at;

-- ================================================================
-- 2. حركة الأصناف (Item Card View)
-- DISABLED: invoice_items table does not exist in current schema (replaced by inventory_transactions in v26)
-- ================================================================
DROP VIEW IF EXISTS view_item_movement;
CREATE VIEW view_item_movement AS
SELECT 
    NULL as type,
    NULL as date,
    NULL as ref_no,
    NULL as item_id,
    NULL as item_name,
    0 as quantity_change,
    NULL as unit_name
WHERE 1=0;

-- ================================================================
-- 3. ميزان المراجعة (Trial Balance View)
-- يظهر أرصدة جميع الحسابات في لحظة معينة
-- ================================================================
DROP VIEW IF EXISTS view_trial_balance;
CREATE VIEW view_trial_balance AS
SELECT 
    a.id as account_id,
    a.account_code as account_code,
    a.name_ar as name_ar,
    a.account_type as account_type,
    
    SUM(CASE WHEN CAST(tl.debit AS DECIMAL) > 0 THEN CAST(tl.debit AS DECIMAL) ELSE 0 END) as total_debit,
    SUM(CASE WHEN CAST(tl.credit AS DECIMAL) > 0 THEN CAST(tl.credit AS DECIMAL) ELSE 0 END) as total_credit,
    
    SUM(CAST(tl.debit AS DECIMAL) - CAST(tl.credit AS DECIMAL)) as net_balance
    
FROM gl_chart_of_accounts a
LEFT JOIN journal_entry_lines tl ON a.id = tl.account_id
LEFT JOIN journal_entries t ON tl.journal_entry_id = t.id
WHERE (t.status = 'POSTED' OR t.status IS NULL)
GROUP BY a.id
ORDER BY a.account_code;

-- ================================================================
-- 4. تقرير الرواتب المفصل (Payroll Details View)
-- يظهر تفاصيل قسائم الرواتب مع بيانات الموظف والقسم
-- ================================================================
DROP VIEW IF EXISTS view_hr_payroll_details;
CREATE VIEW view_hr_payroll_details AS
SELECT 
    s.id as slip_id,
    p.month,
    p.year,
    
    e.employee_code,
    e.first_name || ' ' || e.last_name as employee_name,
    d.name as department_name,
    j.title as job_title,
    
    s.basic_salary,
    s.total_allowances,
    s.overtime_amount,
    s.absent_days_deduction,
    s.advance_deduction,
    s.penalty_deduction,
    s.net_salary,
    
    s.payment_status
    
FROM hr_salary_slips s
JOIN hr_payroll_periods p ON s.payroll_period_id = p.id
JOIN hr_employees e ON s.employee_id = e.id
LEFT JOIN hr_employee_contracts c ON c.employee_id = e.id AND c.is_active = 1
LEFT JOIN hr_departments d ON c.department_id = d.id
LEFT JOIN hr_job_titles j ON c.job_title_id = j.id;
