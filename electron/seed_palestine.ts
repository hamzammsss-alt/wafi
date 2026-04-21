import { v4 as uuidv4 } from 'uuid';

export const seedPalestinianData = (db: any) => {
    console.log('[Seed] Starting Palestinian Data Seeding (Standard COA)...');

    // --- 1. Currencies ---
    const currenciesMap = new Map<string, string>(); // Code -> ID
    const currencyCount = db.prepare('SELECT COUNT(*) as count FROM currencies').get().count;

    if (currencyCount === 0) {
        console.log('[Seed] Seeding Currencies...');
        const currencies = [
            { code: 'ILS', name_ar: 'شيكل إسرائيلي جديد', name_en: 'New Israeli Shekel', symbol: '₪', is_base: 1, rate: 1.0 },
            { code: 'USD', name_ar: 'دولار أمريكي', name_en: 'US Dollar', symbol: '$', is_base: 0, rate: 3.65 },
            { code: 'JOD', name_ar: 'دينار أردني', name_en: 'Jordanian Dinar', symbol: 'JD', is_base: 0, rate: 5.15 },
            { code: 'EUR', name_ar: 'يورو', name_en: 'Euro', symbol: '€', is_base: 0, rate: 4.02 }
        ];

        const insertCurrency = db.prepare(`
            INSERT INTO currencies (id, code, name_ar, name_en, symbol, is_base, exchange_rate)
            VALUES (@id, @code, @name_ar, @name_en, @symbol, @is_base, @rate)
        `);

        currencies.forEach(curr => {
            const id = uuidv4();
            insertCurrency.run({ ...curr, id });
            currenciesMap.set(curr.code, id);
        });
    } else {
        console.log('[Seed] Currencies exist. Fetching IDs...');
        const rows = db.prepare('SELECT id, code FROM currencies').all();
        rows.forEach((r: any) => currenciesMap.set(r.code, r.id));
    }

    // --- 2. Taxes ---
    const taxCount = db.prepare('SELECT COUNT(*) as count FROM taxes').get().count;
    if (taxCount === 0) {
        console.log('[Seed] Seeding Taxes...');
        db.prepare(`INSERT INTO taxes (id, name_ar, name_en, rate, type, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run(uuidv4(), 'ضريبة القيمة المضافة', 'VAT', 0.16, 'VAT', 1);
        db.prepare(`INSERT INTO taxes (id, name_ar, name_en, rate, type, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run(uuidv4(), 'ضريبة الشراء', 'Purchase Tax', 0.00, 'PURCHASE', 1);
    }

    // --- 3. Chart of Accounts ---
    const coaCount = db.prepare('SELECT COUNT(*) as count FROM gl_chart_of_accounts').get().count;
    if (coaCount === 0) {
        console.log('[Seed] Seeding Chart of Accounts (Tree Structure)...');

        const insertAccount = db.prepare(`
            INSERT INTO gl_chart_of_accounts (id, account_code, name_ar, name_en, parent_id, account_type, is_transactional, currency_id, requires_cost_center)
            VALUES (@id, @code, @name_ar, @name_en, @parent_id, @type, @is_trans, @currency, @cc)
        `);

        const codeToIdMap = new Map<string, string>();

        // Data Definition
        // Type: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
        const accounts = [
            // 1. ASSETS
            { code: '1', name: 'الأصول', type: 'ASSET', trans: 0 },
            { code: '11', name: 'الأصول المتداولة', type: 'ASSET', trans: 0 },
            { code: '111', name: 'النقدية وما في حكمها', type: 'ASSET', trans: 0 },
            { code: '1111', name: 'الصندوق الرئيسي (شيكل)', type: 'ASSET', trans: 1, currency: 'ILS' },
            { code: '1112', name: 'الصندوق الرئيسي (دولار)', type: 'ASSET', trans: 1, currency: 'USD' },
            { code: '1113', name: 'الصندوق الرئيسي (دينار)', type: 'ASSET', trans: 1, currency: 'JOD' },
            { code: '1114', name: 'العهد النقدية', type: 'ASSET', trans: 1 },
            { code: '112', name: 'البنوك', type: 'ASSET', trans: 0 },
            { code: '1121', name: 'بنك فلسطين - جاري شيكل', type: 'ASSET', trans: 1, currency: 'ILS' },
            { code: '1122', name: 'بنك فلسطين - جاري دولار', type: 'ASSET', trans: 1, currency: 'USD' },
            { code: '1123', name: 'البنك العربي - جاري دينار', type: 'ASSET', trans: 1, currency: 'JOD' },
            { code: '113', name: 'الذمم المدينة (العملاء)', type: 'ASSET', trans: 0 },
            { code: '1131', name: 'عملاء تجاريون', type: 'ASSET', trans: 0 }, // Control Account
            { code: '1132', name: 'ذمم موظفين', type: 'ASSET', trans: 1 },
            { code: '114', name: 'أوراق القبض (الشيكات)', type: 'ASSET', trans: 0 },
            { code: '1141', name: 'شيكات برسم التحصيل (صندوق)', type: 'ASSET', trans: 1 },
            { code: '1142', name: 'شيكات برسم التحصيل (بنك)', type: 'ASSET', trans: 1 },
            { code: '1143', name: 'شيكات تأمين/كفالة', type: 'ASSET', trans: 1 },
            { code: '1144', name: 'شيكات ذمم - مرتجعة', type: 'ASSET', trans: 1 },
            { code: '115', name: 'المخزون', type: 'ASSET', trans: 0 },
            { code: '1151', name: 'مخزون بضاعة تامة الصنع', type: 'ASSET', trans: 1 },
            { code: '1152', name: 'مخزون مواد خام', type: 'ASSET', trans: 1 },
            { code: '1153', name: 'مخزون تحت التشغيل', type: 'ASSET', trans: 1 },
            { code: '1154', name: 'مخزون مواد تعبئة وتغليف', type: 'ASSET', trans: 1 },
            { code: '1155', name: 'بضاعة بالطريق', type: 'ASSET', trans: 1 },
            { code: '116', name: 'أرصدة مدينة أخرى', type: 'ASSET', trans: 0 },
            { code: '1161', name: 'مصاريف مدفوعة مقدماً', type: 'ASSET', trans: 1 },
            { code: '1162', name: 'إيرادات مستحقة غير مقبوضة', type: 'ASSET', trans: 1 },
            { code: '1163', name: 'أمانات ضريبة القيمة المضافة (مشتريات)', type: 'ASSET', trans: 1 },
            { code: '1164', name: 'سلف موظفين', type: 'ASSET', trans: 1 },

            { code: '12', name: 'الأصول غير المتداولة', type: 'ASSET', trans: 0 },
            { code: '121', name: 'الأصول الملموسة', type: 'ASSET', trans: 0 },
            { code: '1211', name: 'الأراضي', type: 'ASSET', trans: 1 },
            { code: '1212', name: 'المباني والإنشاءات', type: 'ASSET', trans: 1 },
            { code: '1213', name: 'الآلات والمعدات', type: 'ASSET', trans: 1 },
            { code: '1214', name: 'السيارات والمركبات', type: 'ASSET', trans: 1 },
            { code: '1215', name: 'الأثاث والمفروشات', type: 'ASSET', trans: 1 },
            { code: '1216', name: 'أجهزة كمبيوتر وبرمجيات', type: 'ASSET', trans: 1 },
            { code: '122', name: 'مجمع الإهلاك', type: 'ASSET', trans: 0 },
            { code: '1221', name: 'مجمع إهلاك المباني', type: 'ASSET', trans: 1 },
            { code: '1222', name: 'مجمع إهلاك الآلات', type: 'ASSET', trans: 1 },
            { code: '1223', name: 'مجمع إهلاك السيارات', type: 'ASSET', trans: 1 },
            { code: '1224', name: 'مجمع إهلاك الأثاث', type: 'ASSET', trans: 1 },

            // 2. LIABILITIES
            { code: '2', name: 'الخصوم', type: 'LIABILITY', trans: 0 },
            { code: '21', name: 'الخصوم المتداولة', type: 'LIABILITY', trans: 0 },
            { code: '211', name: 'الذمم الدائنة (الموردين)', type: 'LIABILITY', trans: 0 },
            { code: '2111', name: 'موردون محليون', type: 'LIABILITY', trans: 0 }, // Control
            { code: '2112', name: 'موردون خارجيون', type: 'LIABILITY', trans: 0 }, // Control
            { code: '212', name: 'أوراق الدفع', type: 'LIABILITY', trans: 0 },
            { code: '2121', name: 'شيكات صادرة مؤجلة', type: 'LIABILITY', trans: 1 },
            { code: '213', name: 'أرصدة دائنة أخرى', type: 'LIABILITY', trans: 0 },
            { code: '2131', name: 'أمانات ضريبة القيمة المضافة (مبيعات)', type: 'LIABILITY', trans: 1 },
            { code: '2132', name: 'ضريبة الدخل المستحقة', type: 'LIABILITY', trans: 1 },
            { code: '2133', name: 'خصم المصدر الدائن', type: 'LIABILITY', trans: 1 },
            { code: '2134', name: 'رواتب مستحقة الدفع', type: 'LIABILITY', trans: 1 },
            { code: '214', name: 'قروض قصيرة الأجل', type: 'LIABILITY', trans: 0 },
            { code: '2141', name: 'جاري مدين (Overdraft)', type: 'LIABILITY', trans: 1 },
            { code: '22', name: 'الخصوم غير المتداولة', type: 'LIABILITY', trans: 0 },
            { code: '221', name: 'قروض طويلة الأجل', type: 'LIABILITY', trans: 1 },
            { code: '222', name: 'مخصص مكافأة نهاية الخدمة', type: 'LIABILITY', trans: 1 },

            // 3. EQUITY
            { code: '3', name: 'حقوق الملكية', type: 'EQUITY', trans: 0 },
            { code: '31', name: 'رأس المال', type: 'EQUITY', trans: 0 },
            { code: '311', name: 'رأس المال المصرح به', type: 'EQUITY', trans: 1 },
            { code: '312', name: 'رأس المال المدفوع', type: 'EQUITY', trans: 1 },
            { code: '32', name: 'الاحتياطيات', type: 'EQUITY', trans: 0 },
            { code: '321', name: 'احتياطي قانوني', type: 'EQUITY', trans: 1 },
            { code: '322', name: 'احتياطي اختياري', type: 'EQUITY', trans: 1 },
            { code: '33', name: 'الأرباح والخسائر', type: 'EQUITY', trans: 0 },
            { code: '331', name: 'أرباح مدورة', type: 'EQUITY', trans: 1 },
            { code: '332', name: 'أرباح/خسائر العام الحالي', type: 'EQUITY', trans: 1 },
            { code: '34', name: 'جاري الشركاء', type: 'EQUITY', trans: 0 },
            { code: '341', name: 'جاري الشريك (أ)', type: 'EQUITY', trans: 1 },
            { code: '342', name: 'جاري الشريك (ب)', type: 'EQUITY', trans: 1 },
            { code: '343', name: 'المسحوبات الشخصية', type: 'EQUITY', trans: 1 },

            // 4. REVENUE
            { code: '4', name: 'الإيرادات', type: 'REVENUE', trans: 0, cc: 1 },
            { code: '41', name: 'المبيعات', type: 'REVENUE', trans: 0, cc: 1 },
            { code: '411', name: 'مبيعات محلية', type: 'REVENUE', trans: 1, cc: 1 },
            { code: '412', name: 'مبيعات تصدير', type: 'REVENUE', trans: 1, cc: 1 },
            { code: '413', name: 'إيرادات خدمات', type: 'REVENUE', trans: 1, cc: 1 },
            { code: '42', name: 'خصومات ومردودات المبيعات', type: 'REVENUE', trans: 0, cc: 1 },
            { code: '421', name: 'مردودات المبيعات', type: 'REVENUE', trans: 1, cc: 1 },
            { code: '422', name: 'خصم مسموح به', type: 'REVENUE', trans: 1, cc: 1 },
            { code: '43', name: 'إيرادات أخرى', type: 'REVENUE', trans: 0, cc: 1 },
            { code: '431', name: 'أرباح فروقات عملة', type: 'REVENUE', trans: 1, cc: 1 },
            { code: '432', name: 'أرباح رأسمالية', type: 'REVENUE', trans: 1, cc: 1 },
            { code: '433', name: 'إيرادات متنوعة', type: 'REVENUE', trans: 1, cc: 1 },

            // 5. EXPENSES
            { code: '5', name: 'المصروفات', type: 'EXPENSE', trans: 0, cc: 1 },
            { code: '51', name: 'تكلفة البضاعة المباعة', type: 'EXPENSE', trans: 0, cc: 1 },
            { code: '511', name: 'تكلفة بضاعة أول المدة', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '512', name: 'المشتريات', type: 'EXPENSE', trans: 0, cc: 1 },
            { code: '5121', name: 'مشتريات محلية', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '5122', name: 'مشتريات خارجية', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '513', name: 'مصاريف الشراء والاستيراد', type: 'EXPENSE', trans: 0, cc: 1 },
            { code: '5131', name: 'جمارك ورسوم استيراد', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '5132', name: 'شحن ونقل وارد', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '5133', name: 'تخليص وتأمين', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '514', name: 'مردودات المشتريات', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '515', name: 'الخصم المكتسب', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '516', name: 'تكاليف التصنيع المباشرة', type: 'EXPENSE', trans: 0, cc: 1 },
            { code: '5161', name: 'أجور عمال الإنتاج', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '5162', name: 'كهرباء وطاقة المصنع', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '5163', name: 'صيانة آلات المصنع', type: 'EXPENSE', trans: 1, cc: 1 },

            { code: '52', name: 'المصاريف الإدارية والعمومية', type: 'EXPENSE', trans: 0, cc: 1 },
            { code: '521', name: 'الرواتب والأجور', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '522', name: 'الإيجارات', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '523', name: 'كهرباء وماء', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '524', name: 'اتصالات وإنترنت', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '525', name: 'قرطاسية ومطبوعات', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '526', name: 'ضيافة ونظافة', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '527', name: 'رسوم حكومية وتراخيص', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '528', name: 'استشارات وتدقيق', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '529', name: 'إهلاكات أصول ثابتة', type: 'EXPENSE', trans: 1, cc: 1 },

            { code: '53', name: 'مصاريف البيع والتوزيع', type: 'EXPENSE', trans: 0, cc: 1 },
            { code: '531', name: 'دعاية وإعلان', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '532', name: 'عمولات البيع', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '533', name: 'مصاريف سيارات التوزيع', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '534', name: 'مصاريف نقل المبيعات', type: 'EXPENSE', trans: 1, cc: 1 },

            { code: '54', name: 'المصاريف المالية', type: 'EXPENSE', trans: 0, cc: 1 },
            { code: '541', name: 'فوائد بنكية', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '542', name: 'عمولات بنكية', type: 'EXPENSE', trans: 1, cc: 1 },
            { code: '543', name: 'خسائر فروقات عملة', type: 'EXPENSE', trans: 1, cc: 1 }
        ];

        const insertAccountLegacy = db.prepare(`
            INSERT INTO accounts (id, code, name, type, balance, parent_id, account_level, is_transactional, currency, is_active)
            VALUES (@id, @code, @name, @type, @balance, @parent_id, @level, @is_trans, @currency, 1)
        `);

        db.transaction(() => {
            for (const acc of accounts) {
                const id = uuidv4();
                codeToIdMap.set(acc.code, id);

                // Parent Resolution (Prefix based)
                let parentId = null;
                for (let i = acc.code.length - 1; i > 0; i--) {
                    const prefix = acc.code.substring(0, i);
                    if (codeToIdMap.has(prefix)) {
                        parentId = codeToIdMap.get(prefix);
                        break;
                    }
                }

                // Currency Resolution
                let currencyId = null;
                if (acc.currency && currenciesMap.has(acc.currency)) {
                    currencyId = currenciesMap.get(acc.currency);
                }

                // 1. Insert into gl_chart_of_accounts (New Standard)
                insertAccount.run({
                    id: id,
                    code: acc.code,
                    name_ar: acc.name,
                    name_en: acc.name,
                    parent_id: parentId,
                    type: acc.type, // ASSET
                    is_trans: acc.trans,
                    currency: currencyId,
                    cc: acc.cc ? 1 : 0
                });

                // 2. Insert into accounts (Legacy/Current UI Support)
                // Normalize Type: ASSET -> Asset
                const typeCase = acc.type.charAt(0) + acc.type.slice(1).toLowerCase();

                insertAccountLegacy.run({
                    id: id,
                    code: acc.code,
                    name: acc.name,
                    type: typeCase,
                    balance: '0',
                    parent_id: parentId,
                    level: acc.code.length,
                    is_trans: acc.trans,
                    currency: acc.currency || 'ILS'
                });
            }
        })();
        console.log('[Seed] Chart of Accounts seeded successfully (Synced Both Tables).');
    } else {
        console.log('[Seed] COA already exists.');
    }

    console.log('[Seed] Completed.');
};
