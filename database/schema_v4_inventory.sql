-- ================================================================
-- 1. جدول حركات المخزون (Inventory Movements)
-- هذا الجدول هو سجل аудиторский (audit log) لكل حركة تتم على المخزون.
-- يضمن تتبع كل زيادة أو نقصان في الكميات والتكاليف.
-- ================================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY, -- UUID
    item_id TEXT NOT NULL, -- الصنف المتأثر
    
    movement_date DATETIME DEFAULT CURRENT_TIMESTAMP, -- تاريخ ووقت الحركة
    
    document_type TEXT NOT NULL, -- نوع المستند المسبب للحركة (PURCHASE_INVOICE, SALES_INVOICE, ADJUSTMENT)
    document_id TEXT NOT NULL, -- معرّف المستند
    
    quantity_change DECIMAL(18, 4) NOT NULL, -- التغير في الكمية (+ للشراء, - للبيع)
    new_quantity DECIMAL(18, 4) NOT NULL, -- الكمية الجديدة في المستودع بعد الحركة
    
    new_average_cost DECIMAL(18, 4) NOT NULL, -- متوسط التكلفة الجديد بعد الحركة
    
    user_id TEXT, -- المستخدم الذي قام بالعملية
    branch_id TEXT, -- الفرع/المستودع الذي تمت فيه الحركة
    
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- فهارس لسرعة البحث في كشف حركة صنف
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_document ON inventory_movements(document_type, document_id);

-- ================================================================
-- 2. جدول دفعات المخزون (Inventory Batches)
-- يُستخدم لتتبع دفعات الشراء وتكلفتها لدعم طرق تقييم FIFO و LIFO
-- ================================================================
CREATE TABLE IF NOT EXISTS inventory_batches (
    id TEXT PRIMARY KEY, -- UUID
    item_id TEXT NOT NULL, -- الصنف المتأثر
    
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP, -- تاريخ الشراء (يُستخدم للترتيب لاستخراج الدفعة الأقدم/الأحدث)
    expiry_date DATE, -- تاريخ الصلاحية (لتطبيق طريقة FEFO للصيدليات والأغذية)
    
    original_quantity DECIMAL(18, 4) NOT NULL, -- الكمية الأصلية التي تم شراؤها في هذه الدفعة
    remaining_quantity DECIMAL(18, 4) NOT NULL, -- الكمية المتبقية في المستودع من هذه الدفعة
    
    unit_cost DECIMAL(18, 4) NOT NULL, -- تكلفة الوحدة الواحدة لهذه الدفعة تحديداً
    
    document_type TEXT NOT NULL, -- نوع المستند المسبب للحركة (غالباً PURCHASE_INVOICE)
    document_id TEXT NOT NULL, -- معرّف المستند للرجوع إليه
    
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- فهارس لسرعة استرجاع الدفعات التي بها رصيد متبقٍ وترتيبها زمنياً
CREATE INDEX IF NOT EXISTS idx_inventory_batches_item_remaining ON inventory_batches(item_id, remaining_quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_date ON inventory_batches(purchase_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);