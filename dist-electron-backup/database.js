const path = require('path');
const Database = require('better-sqlite3');
// Database instance (initialized in initDB)
let db;
const initDB = (dbPath) => {
    // Initialize Database
    db = new Database(dbPath);
    // 1. Accounts Table
    db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT,
      type TEXT,
      balance REAL DEFAULT 0,
      parent_id INTEGER,
      account_level INTEGER DEFAULT 1,
      is_transactional INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY(parent_id) REFERENCES accounts(id)
    );
  `);
    // Add indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_transactional ON accounts(is_transactional);`);
    // 2. Transactions Header
    db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      ref_no TEXT,
      date TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // 3. Transaction Lines
    db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      account_id INTEGER,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      description TEXT,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id),
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
  `);
    // 4. Products Table (Inventory)
    db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      unit TEXT DEFAULT 'PCS', 
      cost_price REAL DEFAULT 0,
      sell_price REAL DEFAULT 0,
      quantity REAL DEFAULT 0, 
      min_quantity REAL DEFAULT 0, 
      is_active INTEGER DEFAULT 1
    );
  `);
    // 5. Invoice Items Table
    db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      cost_at_sale REAL, 
      FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);
    // 6. Checks Table (Checks Cycle) - Palestinian Workflow
    db.exec(`DROP TABLE IF EXISTS checks`); // Reset for schema update
    db.exec(`
    CREATE TABLE IF NOT EXISTS checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_number TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'ILS',
      due_date TEXT NOT NULL, -- Maturation Date
      status TEXT DEFAULT 'Holding', -- Holding, Deposited, Cleared, Bounced, Returned
      
      -- Relations
      received_from_id INTEGER, -- Customer Account ID
      current_location_id INTEGER, -- Where is it? (Box or Bank Account ID)
      original_voucher_id INTEGER,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(received_from_id) REFERENCES accounts(id)
    );
  `);
    // 7. BOM Headers (Formulas)
    db.exec(`
    CREATE TABLE IF NOT EXISTS boms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      finished_product_id INTEGER NOT NULL, -- The product to produce
      name TEXT NOT NULL, -- Formula Name
      notes TEXT,
      FOREIGN KEY(finished_product_id) REFERENCES products(id)
    );
  `);
    // 8. BOM Items (Ingredients)
    db.exec(`
    CREATE TABLE IF NOT EXISTS bom_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bom_id INTEGER NOT NULL,
      raw_product_id INTEGER NOT NULL, -- Raw Material
      quantity REAL NOT NULL, -- Qty required for 1 unit of finished product
      FOREIGN KEY(bom_id) REFERENCES boms(id) ON DELETE CASCADE,
      FOREIGN KEY(raw_product_id) REFERENCES products(id)
    );
  `);
    // 9. Production Orders
    db.exec(`
    CREATE TABLE IF NOT EXISTS production_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      bom_id INTEGER NOT NULL,
      quantity REAL NOT NULL, -- Qty produced
      status TEXT DEFAULT 'Completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bom_id) REFERENCES boms(id)
    );
  `);
    // Seed Dummy Products
    const checkProd = db.prepare('SELECT count(*) as count FROM products').get();
    if (checkProd.count === 0) {
        const insertProd = db.prepare(`
      INSERT INTO products (barcode, name, sell_price, cost_price, quantity) 
      VALUES (?, ?, ?, ?, ?)
    `);
        insertProd.run('1001', 'Cola Can 330ml', 2.5, 1.8, 1000);
        insertProd.run('1002', 'Family Chips', 5.0, 3.5, 500);
        insertProd.run('1003', 'Mineral Water', 1.0, 0.6, 2000);
    }
    // 10. Settings Table (Configuration)
    db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
    // 11. Audit Log (Security)
    db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // 12. Receipt Vouchers (Header)
    db.exec(`
    CREATE TABLE IF NOT EXISTS receipt_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_number TEXT UNIQUE,
      date TEXT,
      payer_account_id INTEGER,
      description TEXT,
      total_amount REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // 13. Receipt Voucher Details (Payment Allocations)
    db.exec(`
    CREATE TABLE IF NOT EXISTS receipt_voucher_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER,
      payment_method TEXT, -- 'CASH', 'CHECK', 'BANK_TRANSFER'
      account_id INTEGER, -- Fund Box or Bank Account
      amount REAL,
      reference TEXT -- Check ID or Trans ID
    );
  `);
    // Ensure checks table has voucher_id for linking if not exists
    try {
        db.prepare("ALTER TABLE checks ADD COLUMN voucher_id INTEGER").run();
    }
    catch (e) {
        // Column might already exist
    }
    // --- New Constitution Master Data Tables ---
    // Units
    db.exec("CREATE TABLE IF NOT EXISTS units (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, symbol TEXT)");
    // Brands
    db.exec("CREATE TABLE IF NOT EXISTS brands (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, origin TEXT)");
    // Countries
    db.exec("CREATE TABLE IF NOT EXISTS countries (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT)");
    // Asset Families
    db.exec("CREATE TABLE IF NOT EXISTS asset_families (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, depreciation REAL)");
    // Item Families
    db.exec("CREATE TABLE IF NOT EXISTS item_families (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
    // Item Groups
    db.exec("CREATE TABLE IF NOT EXISTS item_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, family TEXT, name TEXT)");
    // Item Categories
    db.exec("CREATE TABLE IF NOT EXISTS item_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT)");
    // Cost Centers
    db.exec("CREATE TABLE IF NOT EXISTS cost_centers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT)");
    // Manual Books
    db.exec("CREATE TABLE IF NOT EXISTS manual_books (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, number TEXT)");
    // Expense Types
    db.exec("CREATE TABLE IF NOT EXISTS expense_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, category TEXT)");
    // Areas
    db.exec("CREATE TABLE IF NOT EXISTS areas (id INTEGER PRIMARY KEY AUTOINCREMENT, city TEXT, area TEXT, rep TEXT)");
    // Payment Terms
    db.exec("CREATE TABLE IF NOT EXISTS payment_terms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, days INTEGER)");
    // Salesmen
    db.exec("CREATE TABLE IF NOT EXISTS salesmen (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, commission REAL)");
    // Check Books
    db.exec("CREATE TABLE IF NOT EXISTS check_books (id INTEGER PRIMARY KEY AUTOINCREMENT, bank TEXT, serial_start TEXT, serial_end TEXT, status TEXT)");
    // Warehouses
    db.exec("CREATE TABLE IF NOT EXISTS warehouses (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, address TEXT, keeper TEXT)");
    // Currencies (if not exists)
    db.exec("CREATE TABLE IF NOT EXISTS currencies (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, rate REAL, symbol TEXT)");
    seedCOA();
    console.log("Database initialized.");
};
const seedCOA = () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM accounts').get().c;
    if (count > 0)
        return; // Already seeded
    console.log("Seeding Comprehensive Chart of Accounts...");
    // Helper to determine parent from code
    const getParentId = (code, insertedMap) => {
        if (code.length === 1)
            return null;
        const parentCode = code.substring(0, code.length - 1);
        return insertedMap.get(parentCode) || null;
    };
    // Helper to determine if account is transactional (only level 4)
    const isTransactional = (code) => {
        return code.length === 4;
    };
    const accounts = [
        // ============================================
        // 1. ASSETS (الأصول)
        // ============================================
        { code: '1', name: 'الأصول', type: 'ASSET' },
        // 11. Current Assets
        { code: '11', name: 'الأصول المتداولة', type: 'ASSET' },
        // 111. Cash & Cash Equivalents
        { code: '111', name: 'النقدية وما في حكمها', type: 'ASSET' },
        { code: '1111', name: 'الصندوق الرئيسي (الخزينة)', type: 'ASSET' },
        { code: '1112', name: 'صندوق الكاشير (نقاط البيع)', type: 'ASSET' },
        { code: '1113', name: 'العهد النقدية (نثرية)', type: 'ASSET' },
        { code: '1114', name: 'البنك (الحساب الجاري - شيكل)', type: 'ASSET' },
        { code: '1115', name: 'البنك (الحساب الجاري - دولار)', type: 'ASSET' },
        { code: '1116', name: 'البنك (الحساب الجاري - دينار)', type: 'ASSET' },
        // 112. Accounts Receivable
        { code: '112', name: 'الذمم المدينة (العملاء)', type: 'ASSET' },
        { code: '1121', name: 'عملاء تجارة الجملة', type: 'ASSET' },
        { code: '1122', name: 'عملاء تجارة المفرق', type: 'ASSET' },
        { code: '1123', name: 'عملاء المتجر الإلكتروني', type: 'ASSET' },
        { code: '1124', name: 'ذمم الموظفين (سلف)', type: 'ASSET' },
        // 113. Inventory
        { code: '113', name: 'المخزون', type: 'ASSET' },
        { code: '1131', name: 'مخزون بضاعة أول المدة', type: 'ASSET' },
        { code: '1132', name: 'مخزون بضاعة آخر المدة', type: 'ASSET' },
        { code: '1133', name: 'بضاعة بالطريق (مشتريات مستوردة)', type: 'ASSET' },
        // 114. Notes Receivable (Checks)
        { code: '114', name: 'أوراق القبض (الشيكات)', type: 'ASSET' },
        { code: '1141', name: 'شيكات برسم التحصيل (في الصندوق)', type: 'ASSET' },
        { code: '1142', name: 'شيكات برسم التحصيل (في البنك)', type: 'ASSET' },
        { code: '1143', name: 'شيكات مرتجعة', type: 'ASSET' },
        // 12. Fixed Assets (Non-Current)
        { code: '12', name: 'الأصول غير المتداولة (الثابتة)', type: 'ASSET' },
        // 121. Buildings & Real Estate
        { code: '121', name: 'العقارات والمباني', type: 'ASSET' },
        { code: '1211', name: 'تكلفة المباني', type: 'ASSET' },
        { code: '1212', name: 'مجمع إهلاك المباني', type: 'ASSET' },
        // 122. Machinery & Equipment
        { code: '122', name: 'الآلات والمعدات', type: 'ASSET' },
        { code: '1221', name: 'تكلفة المعدات', type: 'ASSET' },
        { code: '1222', name: 'مجمع إهلاك المعدات', type: 'ASSET' },
        // 123. Vehicles
        { code: '123', name: 'السيارات ووسائل النقل', type: 'ASSET' },
        { code: '1231', name: 'تكلفة السيارات', type: 'ASSET' },
        { code: '1232', name: 'مجمع إهلاك السيارات', type: 'ASSET' },
        // 124. Furniture & Fixtures
        { code: '124', name: 'الأثاث والمفروشات', type: 'ASSET' },
        { code: '1241', name: 'تكلفة الأثاث', type: 'ASSET' },
        { code: '1242', name: 'مجمع إهلاك الأثاث', type: 'ASSET' },
        // 125. Computers & Software
        { code: '125', name: 'أجهزة الكمبيوتر والبرمجيات', type: 'ASSET' },
        { code: '1251', name: 'تكلفة الأجهزة', type: 'ASSET' },
        { code: '1252', name: 'مجمع إهلاك الأجهزة', type: 'ASSET' },
        // ============================================
        // 2. LIABILITIES (الخصوم)
        // ============================================
        { code: '2', name: 'الخصوم / الالتزامات', type: 'LIABILITY' },
        // 21. Current Liabilities
        { code: '21', name: 'الخصوم المتداولة', type: 'LIABILITY' },
        // 211. Accounts Payable
        { code: '211', name: 'الذمم الدائنة (الموردين)', type: 'LIABILITY' },
        { code: '2111', name: 'موردون محليون', type: 'LIABILITY' },
        { code: '2112', name: 'موردون خارجيون', type: 'LIABILITY' },
        // 212. Notes Payable
        { code: '212', name: 'أوراق الدفع (شيكات صادرة)', type: 'LIABILITY' },
        { code: '2121', name: 'شيكات صادرة مؤجلة', type: 'LIABILITY' },
        // 213. Taxes Payable
        { code: '213', name: 'الضرائب والرسوم المستحقة', type: 'LIABILITY' },
        { code: '2131', name: 'ضريبة القيمة المضافة (المحصلة - مخرجات)', type: 'LIABILITY' },
        { code: '2132', name: 'ضريبة الدخل المستحقة', type: 'LIABILITY' },
        // 214. Accrued Expenses
        { code: '214', name: 'مصاريف مستحقة الدفع', type: 'LIABILITY' },
        { code: '2141', name: 'رواتب مستحقة الدفع', type: 'LIABILITY' },
        { code: '2142', name: 'إيجارات مستحقة', type: 'LIABILITY' },
        // 22. Long-Term Liabilities
        { code: '22', name: 'الخصوم طويلة الأجل', type: 'LIABILITY' },
        // 221. Bank Loans
        { code: '221', name: 'القروض البنكية', type: 'LIABILITY' },
        { code: '2211', name: 'قروض بنكية طويلة الأجل', type: 'LIABILITY' },
        // ============================================
        // 3. EQUITY (حقوق الملكية)
        // ============================================
        { code: '3', name: 'حقوق الملكية', type: 'EQUITY' },
        // 31. Capital
        { code: '31', name: 'رأس المال', type: 'EQUITY' },
        { code: '311', name: 'رأس المال', type: 'EQUITY' },
        { code: '3111', name: 'رأس المال المدفوع', type: 'EQUITY' },
        // 32. Retained Earnings
        { code: '32', name: 'الأرباح والخسائر', type: 'EQUITY' },
        { code: '321', name: 'الأرباح المبقاة', type: 'EQUITY' },
        { code: '3211', name: 'الأرباح المبقاة (سنوات سابقة)', type: 'EQUITY' },
        { code: '3212', name: 'أرباح/خسائر العام الحالي', type: 'EQUITY' },
        // 33. Withdrawals
        { code: '33', name: 'المسحوبات الشخصية', type: 'EQUITY' },
        { code: '331', name: 'المسحوبات', type: 'EQUITY' },
        { code: '3311', name: 'مسحوبات الشركاء/المالك', type: 'EQUITY' },
        // ============================================
        // 4. REVENUE (الإيرادات)
        // ============================================
        { code: '4', name: 'الإيرادات', type: 'REVENUE' },
        // 41. Operating Revenue
        { code: '41', name: 'إيرادات العمليات', type: 'REVENUE' },
        // 411. Sales
        { code: '411', name: 'المبيعات', type: 'REVENUE' },
        { code: '4111', name: 'مبيعات نقدية - مفرق', type: 'REVENUE' },
        { code: '4112', name: 'مبيعات آجلة - جملة', type: 'REVENUE' },
        { code: '4113', name: 'مبيعات المتجر الإلكتروني', type: 'REVENUE' },
        // 412. Sales Returns & Allowances
        { code: '412', name: 'مردودات ومسموحات المبيعات', type: 'REVENUE' },
        { code: '4121', name: 'مردودات المبيعات', type: 'REVENUE' },
        { code: '4122', name: 'خصم مسموح به', type: 'REVENUE' },
        // 42. Other Income
        { code: '42', name: 'إيرادات أخرى', type: 'REVENUE' },
        { code: '421', name: 'إيرادات متنوعة', type: 'REVENUE' },
        { code: '4211', name: 'أرباح رأسمالية (بيع أصل ثابت)', type: 'REVENUE' },
        { code: '4212', name: 'إيرادات خدمات وتوصيل', type: 'REVENUE' },
        // ============================================
        // 5. EXPENSES (المصروفات)
        // ============================================
        { code: '5', name: 'المصروفات', type: 'EXPENSE' },
        // 51. Cost of Goods Sold
        { code: '51', name: 'تكلفة البضاعة المباعة', type: 'EXPENSE' },
        { code: '511', name: 'تكلفة المبيعات', type: 'EXPENSE' },
        { code: '5111', name: 'تكلفة البضاعة المباعة', type: 'EXPENSE' },
        { code: '5112', name: 'خصم مكتسب', type: 'EXPENSE' },
        // 52. Operating Expenses
        { code: '52', name: 'المصاريف التشغيلية والإدارية', type: 'EXPENSE' },
        // 521. Salaries & Wages
        { code: '521', name: 'الرواتب والأجور', type: 'EXPENSE' },
        { code: '5211', name: 'الرواتب الأساسية', type: 'EXPENSE' },
        { code: '5212', name: 'الحوافز والمكافآت', type: 'EXPENSE' },
        { code: '5213', name: 'مساهمة الشركة في التأمين', type: 'EXPENSE' },
        // 522. Rent & Utilities
        { code: '522', name: 'مصاريف الإيجار والمرافق', type: 'EXPENSE' },
        { code: '5221', name: 'إيجار المحل/المكتب', type: 'EXPENSE' },
        { code: '5222', name: 'الكهرباء', type: 'EXPENSE' },
        { code: '5223', name: 'المياه', type: 'EXPENSE' },
        { code: '5224', name: 'رسوم البلدية والنفايات', type: 'EXPENSE' },
        // 523. Telecommunications & IT
        { code: '523', name: 'مصاريف الاتصالات والتكنولوجيا', type: 'EXPENSE' },
        { code: '5231', name: 'الهاتف والجوال', type: 'EXPENSE' },
        { code: '5232', name: 'اشتراك الإنترنت', type: 'EXPENSE' },
        { code: '5233', name: 'استضافة الموقع والسيرفرات', type: 'EXPENSE' },
        // 524. Marketing & Sales
        { code: '524', name: 'مصاريف التسويق والبيع', type: 'EXPENSE' },
        { code: '5241', name: 'إعلانات فيسبوك وجوجل', type: 'EXPENSE' },
        { code: '5242', name: 'مطبوعات وبروشورات', type: 'EXPENSE' },
        { code: '5243', name: 'عمولات مندوبي المبيعات', type: 'EXPENSE' },
        { code: '5244', name: 'مصاريف تغليف وشحن', type: 'EXPENSE' },
        // 525. General & Administrative
        { code: '525', name: 'مصاريف عمومية وإدارية', type: 'EXPENSE' },
        { code: '5251', name: 'قرطاسية ومطبوعات مكتبية', type: 'EXPENSE' },
        { code: '5252', name: 'ضيافة ونظافة', type: 'EXPENSE' },
        { code: '5253', name: 'صيانة وإصلاحات', type: 'EXPENSE' },
        { code: '5254', name: 'رسوم قانونية واستشارات', type: 'EXPENSE' },
        { code: '5255', name: 'تراخيص حكومية', type: 'EXPENSE' },
        { code: '5256', name: 'مصاريف بنكية وعمولات', type: 'EXPENSE' },
        // 526. Depreciation
        { code: '526', name: 'الإهلاكات (مصروف سنوي)', type: 'EXPENSE' },
        { code: '5261', name: 'مصروف إهلاك الأثاث', type: 'EXPENSE' },
        { code: '5262', name: 'مصروف إهلاك الأجهزة', type: 'EXPENSE' },
        { code: '5263', name: 'مصروف إهلاك السيارات', type: 'EXPENSE' },
        { code: '5264', name: 'مصروف إهلاك المباني', type: 'EXPENSE' },
        { code: '5265', name: 'مصروف إهلاك المعدات', type: 'EXPENSE' },
        // 527. Bad Debts
        { code: '527', name: 'ديون معدومة', type: 'EXPENSE' },
        { code: '5271', name: 'مصروف ديون معدومة', type: 'EXPENSE' }
    ];
    const insert = db.prepare(`
    INSERT INTO accounts (code, name, type, balance, parent_id, account_level, is_transactional) 
    VALUES (@code, @name, @type, @balance, @parent_id, @account_level, @is_transactional)
  `);
    const insertMany = db.transaction((rows) => {
        const codeToIdMap = new Map();
        // Sort by code length to ensure parents are inserted first
        rows.sort((a, b) => a.code.length - b.code.length);
        for (const row of rows) {
            const parentId = getParentId(row.code, codeToIdMap);
            const accountLevel = row.code.length;
            const transactional = isTransactional(row.code);
            const info = insert.run({
                code: row.code,
                name: row.name,
                type: row.type,
                balance: 0,
                parent_id: parentId,
                account_level: accountLevel,
                is_transactional: transactional ? 1 : 0
            });
            codeToIdMap.set(row.code, info.lastInsertRowid);
        }
    });
    insertMany(accounts);
    console.log(`✓ Chart of Accounts Seeded: ${accounts.length} accounts created`);
    console.log(`  - Level 1 (Main Categories): ${accounts.filter(a => a.code.length === 1).length}`);
    console.log(`  - Level 2 (Sub-Categories): ${accounts.filter(a => a.code.length === 2).length}`);
    console.log(`  - Level 3 (Account Groups): ${accounts.filter(a => a.code.length === 3).length}`);
    console.log(`  - Level 4 (Transactional): ${accounts.filter(a => a.code.length === 4).length}`);
};
module.exports = { db, initDB };
