-- ================================================================
-- 1. جدول العدادات التسلسلية (Document Counters)
-- هذا الجدول يضمن أننا نحصل على أرقام متسلسلة نظيفة (1, 2, 3)
-- لكل نوع سند وللسنة المالية، بعيداً عن تعقيدات الـ UUID
-- ================================================================
CREATE TABLE IF NOT EXISTS document_counters (
    prefix TEXT NOT NULL, -- مثلاً 'JV', 'INV', 'REC'
    year INTEGER NOT NULL, -- 2026
    current_value INTEGER DEFAULT 0, -- آخر رقم وصلنا له
    PRIMARY KEY (prefix, year)
);

-- ================================================================
-- 2. رأس السند المالي (Journal Voucher Header)
-- هذا الجدول هو "الأب" لأي حركة مالية في النظام
-- سواء كانت فاتورة، سند قبض، أو قيد يومية، كلها تصب هنا
-- ================================================================
-- ================================================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY, -- UUID
    voucher_no TEXT NOT NULL, -- الرقم التسلسلي الظاهر (JV-2026-0001)
    
    voucher_type TEXT NOT NULL, -- JV (قيد), SINV (فاتورة مبيعات), PINV (مشتريات), RV (قبض), PV (صرف)
    date DATE NOT NULL,
    
    reference_no TEXT, -- رقم مرجع خارجي (مثلاً رقم فاتورة المورد الورقية)
    description TEXT, -- الشرح العام للسند
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT (مسودة), POSTED (مرحل), VOID (ملغي)
    
    branch_id TEXT NOT NULL, -- الفرع المالك للسند
    currency_id TEXT NOT NULL, -- عملة السند
    exchange_rate DECIMAL(18,4) DEFAULT 1, -- سعر الصرف وقت الإنشاء
    
    created_by TEXT, -- User UUID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    posted_by TEXT,
    posted_at DATETIME,
    
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

-- ================================================================
-- 3. تفاصيل السند (Journal Voucher Lines)
-- الأسطر الدقيقة (من ح/ ... إلى ح/ ...)
-- ================================================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY, -- UUID
    journal_entry_id TEXT NOT NULL,
    
    account_id TEXT NOT NULL, -- الحساب المحاسبي المتأثر
    
    debit DECIMAL(18,4) DEFAULT 0, -- مدين
    credit DECIMAL(18,4) DEFAULT 0, -- دائن
    
    line_description TEXT, -- شرح السطر (مثلاً: ثمن ثلاجة سامسونج)
    
    cost_center_id TEXT, -- مركز التكلفة (للمشاريع)
    
    -- Enhanced Grid Fields
    invoice_ref TEXT, -- رقم الفاتورة / الشيك
    tax_ref TEXT, -- مرجع ضريبي
    sub_account_id TEXT, -- حساب فرعي
    due_date DATE, -- تاريخ الاستحقاق (للشيكات)
    customer_id TEXT, -- للعميل في حالة الشيكات
    is_returned INTEGER DEFAULT 0, -- مرتجع (للشيكات)

    -- للحفاظ على العملة الأجنبية والمحلية معاً
    fc_amount DECIMAL(18,4) DEFAULT 0, -- المبلغ بالعملة الأجنبية
    fc_currency_id TEXT, -- العملة الأجنبية
    exchange_rate DECIMAL(18,4) DEFAULT 1, -- سعر التحويل المستخدم لهذا السطر
    
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (cost_center_id) REFERENCES branches(id), -- أو جدول منفصل لمراكز التكلفة
    FOREIGN KEY (customer_id) REFERENCES business_partners(id)
);

-- فهرس لسرعة البحث في كشف الحساب
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);
