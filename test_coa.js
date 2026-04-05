const Database = require('better-sqlite3');
const db = new Database('test_coa.db');

// Mock Schema
db.exec(`
  DROP TABLE IF EXISTS accounts;
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT,
    type TEXT,
    balance REAL DEFAULT 0,
    parent_id INTEGER
  );
`);

// COA Data (Copied from implementation)
const getParentId = (code, insertedMap) => {
    if (code.length === 1) return null;
    const parentCode = code.substring(0, code.length - 1);
    return insertedMap.get(parentCode) || null;
};

const accounts = [
    // 1. ASSETS
    { code: '1', name: 'الأصول', type: 'ASSET' },
    { code: '11', name: 'الأصول المتداولة', type: 'ASSET' },

    // 111. Cash
    { code: '111', name: 'النقدية وما في حكمها', type: 'ASSET' },
    { code: '1111', name: 'الصندوق الرئيسي (الخزينة)', type: 'ASSET' },
    { code: '1112', name: 'صندوق الكاشير (نقاط البيع)', type: 'ASSET' },
    { code: '1113', name: 'العهد النقدية (نثرية)', type: 'ASSET' },
    { code: '1114', name: 'البنك (الحساب الجاري - شيكل)', type: 'ASSET' },
    { code: '1115', name: 'البنك (الحساب الجاري - دولار)', type: 'ASSET' },
    { code: '1116', name: 'البنك (الحساب الجاري - دينار)', type: 'ASSET' },

    // 112. Receivables
    { code: '112', name: 'الذمم المدينة (العملاء)', type: 'ASSET' },
    { code: '1121', name: 'عملاء تجارة الجملة', type: 'ASSET' },
    { code: '1122', name: 'عملاء تجارة المفرق', type: 'ASSET' },
    { code: '1123', name: 'عملاء المتجر الإلكتروني', type: 'ASSET' },
    { code: '1124', name: 'ذمم الموظفين (سلف)', type: 'ASSET' },

    // 113. Inventory
    { code: '113', name: 'المخزون', type: 'ASSET' },
    { code: '1131', name: 'مخزون بضاعة أول المدة', type: 'ASSET' },
    { code: '1132', name: 'مخزون بضاعة آخر المدة', type: 'ASSET' },
    { code: '1133', name: 'بضاعة بالطريق', type: 'ASSET' },

    // 114. Papers
    { code: '114', name: 'أوراق القبض (الشيكات)', type: 'ASSET' },
    { code: '1141', name: 'شيكات برسم التحصيل (في الصندوق)', type: 'ASSET' },
    { code: '1142', name: 'شيكات برسم التحصيل (في البنك)', type: 'ASSET' },
    { code: '1143', name: 'شيكات مرتجعة', type: 'ASSET' },

    // 12. Fixed Assets
    { code: '12', name: 'الأصول غير المتداولة', type: 'ASSET' },

    // 121. Buildings
    { code: '121', name: 'العقارات والمباني', type: 'ASSET' },
    { code: '1211', name: 'تكلفة المباني', type: 'ASSET' },
    { code: '1212', name: 'مجمع إهلاك المباني', type: 'ASSET' }, // Credit

    // 122. Equipment
    { code: '122', name: 'الآلات والمعدات', type: 'ASSET' },
    { code: '1221', name: 'تكلفة المعدات', type: 'ASSET' },
    { code: '1222', name: 'مجمع إهلاك المعدات', type: 'ASSET' }, // Credit

    // 123. Vehicles
    { code: '123', name: 'السيارات ووسائل النقل', type: 'ASSET' },
    { code: '1231', name: 'تكلفة السيارات', type: 'ASSET' },
    { code: '1232', name: 'مجمع إهلاك السيارات', type: 'ASSET' }, // Credit

    // 124. Furniture
    { code: '124', name: 'الأثاث والمفروشات', type: 'ASSET' },
    { code: '1241', name: 'تكلفة الأثاث', type: 'ASSET' },
    { code: '1242', name: 'مجمع إهلاك الأثاث', type: 'ASSET' }, // Credit

    // 125. Computers
    { code: '125', name: 'أجهزة الكمبيوتر والبرمجيات', type: 'ASSET' },
    { code: '1251', name: 'تكلفة الأجهزة', type: 'ASSET' },
    { code: '1252', name: 'مجمع إهلاك الأجهزة', type: 'ASSET' }, // Credit

    // 2. LIABILITIES
    { code: '2', name: 'الخصوم / الالتزامات', type: 'LIABILITY' },
    { code: '21', name: 'الخصوم المتداولة', type: 'LIABILITY' },

    // 211. Payables
    { code: '211', name: 'الذمم الدائنة (الموردين)', type: 'LIABILITY' },
    { code: '2111', name: 'موردون محليون', type: 'LIABILITY' },
    { code: '2112', name: 'موردون خارجيون', type: 'LIABILITY' },

    // 212. Notes Payable
    { code: '212', name: 'أوراق الدفع (شيكات صادرة)', type: 'LIABILITY' },
    { code: '2121', name: 'شيكات صادرة مؤجلة', type: 'LIABILITY' },

    // 213. Taxes
    { code: '213', name: 'الضرائب والرسوم المستحقة', type: 'LIABILITY' },
    { code: '2131', name: 'ضريبة القيمة المضافة (المحصلة)', type: 'LIABILITY' },
    { code: '2132', name: 'ضريبة الدخل المستحقة', type: 'LIABILITY' },

    // 214. Accrued Expenses
    { code: '214', name: 'مصاريف مستحقة الدفع', type: 'LIABILITY' },
    { code: '2141', name: 'رواتب مستحقة الدفع', type: 'LIABILITY' },
    { code: '2142', name: 'إيجارات مستحقة', type: 'LIABILITY' },

    // 22. Long Term
    { code: '22', name: 'الخصوم طويلة الأجل', type: 'LIABILITY' },
    { code: '221', name: 'القروض البنكية', type: 'LIABILITY' },
    { code: '2211', name: 'قروض بنكية طويلة الأجل', type: 'LIABILITY' },

    // 3. EQUITY
    { code: '3', name: 'حقوق الملكية', type: 'EQUITY' },

    // 31. Capital (Header inserted to match hierarchy)
    { code: '31', name: 'رأس المال', type: 'EQUITY' },
    { code: '311', name: 'رأس المال', type: 'EQUITY' }, // Sub-header
    { code: '3111', name: 'رأس المال المدفوع', type: 'EQUITY' },

    // 32. P&L
    { code: '32', name: 'الأرباح والخسائر', type: 'EQUITY' },
    { code: '321', name: 'الأرباح والخسائر', type: 'EQUITY' },
    { code: '3211', name: 'الأرباح المبقاة', type: 'EQUITY' },
    { code: '3212', name: 'أرباح/خسائر العام الحالي', type: 'EQUITY' },

    // 33. Withdrawals
    { code: '33', name: 'المسحوبات الشخصية', type: 'EQUITY' },
    { code: '331', name: 'المسحوبات', type: 'EQUITY' },
    { code: '3311', name: 'مسحوبات الشركاء/المالك', type: 'EQUITY' },

    // 4. REVENUE
    { code: '4', name: 'الإيرادات', type: 'REVENUE' },
    { code: '41', name: 'إيرادات العمليات', type: 'REVENUE' },

    // 411. Sales
    { code: '411', name: 'المبيعات', type: 'REVENUE' },
    { code: '4111', name: 'مبيعات نقدية - مفرق', type: 'REVENUE' },
    { code: '4112', name: 'مبيعات آجلة - جملة', type: 'REVENUE' },
    { code: '4113', name: 'مبيعات المتجر الإلكتروني', type: 'REVENUE' },

    // 412. Returns
    { code: '412', name: 'مردودات ومسموحات المبيعات', type: 'REVENUE' },
    { code: '4121', name: 'مردودات المبيعات', type: 'REVENUE' }, // Debit
    { code: '4122', name: 'خصم مسموح به', type: 'REVENUE' }, // Debit

    // 42. Other Income
    { code: '42', name: 'إيرادات أخرى', type: 'REVENUE' },
    { code: '421', name: 'إيرادات متنوعة', type: 'REVENUE' },
    { code: '4211', name: 'أرباح رأسمالية', type: 'REVENUE' },
    { code: '4212', name: 'إيرادات خدمات وتوصيل', type: 'REVENUE' },

    // 5. EXPENSES
    { code: '5', name: 'المصروفات', type: 'EXPENSE' },

    // 51. COGS
    { code: '51', name: 'تكلفة البضاعة المباعة', type: 'EXPENSE' },
    { code: '511', name: 'تكلفة المبيعات', type: 'EXPENSE' },
    { code: '5111', name: 'تكلفة البضاعة المباعة', type: 'EXPENSE' },
    { code: '5112', name: 'خصم مكتسب', type: 'EXPENSE' }, // Credit

    // 52. OpEx
    { code: '52', name: 'المصاريف التشغيلية والإدارية', type: 'EXPENSE' },

    // 521. Salaries
    { code: '521', name: 'الرواتب والأجور', type: 'EXPENSE' },
    { code: '5211', name: 'الرواتب الأساسية', type: 'EXPENSE' },
    { code: '5212', name: 'الحوافز والمكافآت', type: 'EXPENSE' },
    { code: '5213', name: 'مساهمة الشركة في التأمين', type: 'EXPENSE' },

    // 522. Rent/Utilities
    { code: '522', name: 'مصاريف الإيجار والمرافق', type: 'EXPENSE' },
    { code: '5221', name: 'إيجار المحل/المكتب', type: 'EXPENSE' },
    { code: '5222', name: 'الكهرباء', type: 'EXPENSE' },
    { code: '5223', name: 'المياه', type: 'EXPENSE' },
    { code: '5224', name: 'رسوم البلدية والنفايات', type: 'EXPENSE' },

    // 523. Telecom
    { code: '523', name: 'مصاريف الاتصالات والتكنولوجيا', type: 'EXPENSE' },
    { code: '5231', name: 'الهاتف والجوال', type: 'EXPENSE' },
    { code: '5232', name: 'اشتراك الإنترنت', type: 'EXPENSE' },
    { code: '5233', name: 'استضافة الموقع والسيرفرات', type: 'EXPENSE' },

    // 524. Marketing
    { code: '524', name: 'مصاريف التسويق والبيع', type: 'EXPENSE' },
    { code: '5241', name: 'إعلانات فيسبوك وجوجل', type: 'EXPENSE' },
    { code: '5242', name: 'مطبوعات وبروشورات', type: 'EXPENSE' },
    { code: '5243', name: 'عمولات مندوبي المبيعات', type: 'EXPENSE' },
    { code: '5244', name: 'مصاريف تغليف وشحن', type: 'EXPENSE' },

    // 525. G&A
    { code: '525', name: 'مصاريف عمومية وإدارية', type: 'EXPENSE' },
    { code: '5251', name: 'قرطاسية ومطبوعات مكتبية', type: 'EXPENSE' },
    { code: '5252', name: 'ضيافة ونظافة', type: 'EXPENSE' },
    { code: '5253', name: 'صيانة وإصلاحات', type: 'EXPENSE' },
    { code: '5254', name: 'رسوم قانونية واستشارات', type: 'EXPENSE' },
    { code: '5255', name: 'تراخيص حكومية', type: 'EXPENSE' },
    { code: '5256', name: 'مصاريف بنكية وعمولات', type: 'EXPENSE' },

    // 526. Depreciation
    { code: '526', name: 'الإهلاكات', type: 'EXPENSE' },
    { code: '5261', name: 'مصروف إهلاك الأثاث', type: 'EXPENSE' },
    { code: '5262', name: 'مصروف إهلاك الأجهزة', type: 'EXPENSE' },
    { code: '5263', name: 'مصروف إهلاك السيارات', type: 'EXPENSE' },

    // 527. Bad Debts
    { code: '527', name: 'ديون معدومة', type: 'EXPENSE' },
    { code: '5271', name: 'مصروف ديون معدومة', type: 'EXPENSE' }
];

const insert = db.prepare('INSERT INTO accounts (code, name, type, balance, parent_id) VALUES (@code, @name, @type, @balance, @parent_id)');

const insertMany = db.transaction((rows) => {
    const codeToIdMap = new Map();
    // Sort by code length to ensure parents are inserted first
    rows.sort((a, b) => a.code.length - b.code.length);

    for (const row of rows) {
        const parentId = getParentId(row.code, codeToIdMap);

        const info = insert.run({
            code: row.code,
            name: row.name,
            type: row.type,
            balance: 0,
            parent_id: parentId
        });

        codeToIdMap.set(row.code, info.lastInsertRowid);
    }
});

insertMany(accounts);

// Verification Steps
const verify = () => {
    const all = db.prepare('SELECT * FROM accounts').all();
    console.log(`Total Accounts: ${all.length}`);

    // Check specific hierarchy
    const box = all.find(a => a.code === '1111');
    const cash = all.find(a => a.code === '111');
    const currentAssets = all.find(a => a.code === '11');
    const assets = all.find(a => a.code === '1');

    console.log(`Box Parent ID: ${box.parent_id} (Expected: ${cash.id})`);
    console.log(`Cash Parent ID: ${cash.parent_id} (Expected: ${currentAssets.id})`);
    console.log(`Current Assets Parent ID: ${currentAssets.parent_id} (Expected: ${assets.id})`);
    console.log(`Assets Parent ID: ${assets.parent_id} (Expected: null)`);

    if (box.parent_id === cash.id && cash.parent_id === currentAssets.id && currentAssets.parent_id === assets.id) {
        console.log("SUCCESS: Hierarchy is correct.");
    } else {
        console.log("FAILURE: Hierarchy mismatch.");
    }
};

verify();
