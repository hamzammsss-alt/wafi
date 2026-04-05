-- ================================================================
-- 1. سندات الخزينة (Receipt & Payment Vouchers)
-- يقبض أو يصرف أموالاً (نقد/شيكات) ويؤثر على الحسابات
-- ================================================================
CREATE TABLE IF NOT EXISTS treasury_vouchers (
    id TEXT PRIMARY KEY, -- UUID
    voucher_no TEXT NOT NULL UNIQUE, -- REC-2026-001 or PAY-2026-001
    voucher_type TEXT NOT NULL, -- RECEIPT (قبض), PAYMENT (صرف)
    
    date DATE NOT NULL,
    
    partner_id TEXT, -- العميل أو المورد (اختياري، قد يكون مصاريف نثرية)
    branch_id TEXT NOT NULL,
    
    amount REAL NOT NULL, -- المبلغ الإجمالي
    currency_id TEXT NOT NULL,
    exchange_rate REAL DEFAULT 1,
    
    description TEXT,
    
    status TEXT DEFAULT 'POSTED',
    journal_header_id TEXT, -- القيد المحاسبي المولد
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    FOREIGN KEY (partner_id) REFERENCES business_partners(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (journal_header_id) REFERENCES gl_journal_headers(id)
);

-- ================================================================
-- 2. الشيكات (Cheques)
-- هذا الجدول هو أخطر جدول في النظام الفلسطيني
-- ================================================================
CREATE TABLE IF NOT EXISTS cheques (
    id TEXT PRIMARY KEY, -- UUID
    cheque_no TEXT NOT NULL, -- رقم الشيك المطبوع
    bank_name TEXT NOT NULL, -- اسم البنك المسحوب عليه
    
    amount REAL NOT NULL,
    currency_id TEXT NOT NULL,
    
    due_date DATE NOT NULL, -- تاريخ الاستحقاق (أهم حقل)
    received_date DATE DEFAULT CURRENT_DATE, -- تاريخ الاستلام
    
    type TEXT NOT NULL, -- INCOMING (وارد من زبون), OUTGOING (صادر لمورد)
    
    status TEXT NOT NULL DEFAULT 'ON_HAND', 
    -- حالات الشيك الوارد: ON_HAND (بالصندوق), UNDER_COLLECTION (برسم التحصيل), COLLECTED (محصل), BOUNCED (راجع), ENDORSED (مجير)
    -- حالات الشيك الصادر: ISSUED (مصدر), CLEARED (مصروف من البنك), RETURNED (راجع)
    
    partner_id TEXT, -- صاحب الشيك (الزبون) أو المستفيد (المورد)
    voucher_id TEXT, -- السند الذي أنشأ هذا الشيك
    
    drawer_name TEXT, -- اسم الساحب (المكتوب على الشيك)
    image_path TEXT, -- صورة ضوئية للشيك
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (partner_id) REFERENCES business_partners(id),
    FOREIGN KEY (voucher_id) REFERENCES treasury_vouchers(id) ON DELETE CASCADE
);

-- Index for searching cheques
CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON cheques(due_date);
CREATE INDEX IF NOT EXISTS idx_cheques_status ON cheques(status);
