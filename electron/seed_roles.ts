const { v4: uuidv4 } = require('uuid');

const seedRoles = (db: any) => {
    console.log("Seeding/Updating Standard Organizational Roles (Arabic)...");

    // Map of English Name -> Arabic Data
    const roleMappings: any = {
        'CEO': { name: 'المدير العام', desc: 'صلاحيات كاملة للتقارير، عرض فقط للقوائم المالية' },
        'CFO': { name: 'المدير المالي', desc: 'صلاحيات مالية كاملة (بنوك، شيكات، موازنات، إغلاق)' },
        'Audit Manager': { name: 'مدير التدقيق', desc: 'ترحيل القيود، اعتماد السندات، إدارة دليل الحسابات' },
        'Senior Accountant': { name: 'محاسب رئيسي', desc: 'قيود يومية، فواتير، سندات (لا حذف/ترحيل)' },
        'Cashier': { name: 'أمين الصندوق', desc: 'نقاط البيع، سندات القبض فقط' },
        'Sales Manager': { name: 'مدير المبيعات', desc: 'قوائم الأسعار، حدود الائتمان، الموافقات' },
        'Sales Rep': { name: 'مندوب مبيعات', desc: 'إنشاء طلبيات، عرض العملاء الخاصين به' },
        'Procurement Manager': { name: 'مدير المشتريات', desc: 'أوامر الشراء، إدارة الموردين' },
        'Store Keeper': { name: 'أمين المستودع', desc: 'سندات إدخال، تحويلات، جرد مخزني' },
        'HR Manager': { name: 'مدير الموارد البشرية', desc: 'صلاحيات الموارد البشرية كاملة، الرواتب' },
        'Production Manager': { name: 'مدير الإنتاج', desc: 'أوامر التصنيع، فواتير المواد' },
        'IT Admin': { name: 'مسؤول النظام', desc: 'إدارة المستخدمين، النسخ الاحتياطي (بدون عمليات مالية)' }
    };

    // 1. Define Roles and their Permissions
    const standardRoles = [
        {
            name: 'المدير العام',
            description: 'صلاحيات كاملة للتقارير، عرض فقط للقوائم المالية',
            permissions: [
                'dashboard.view',
                'reports.view_all',
                'gl.view', 'gl.reports',
                'sales.view', 'sales.reports',
                'inventory.view', 'inventory.reports',
                'hr.view_summary'
            ]
        },
        {
            name: 'المدير المالي',
            description: 'صلاحيات مالية كاملة (بنوك، شيكات، موازنات، إغلاق)',
            permissions: [
                'gl.view', 'gl.create', 'gl.edit', 'gl.post', 'gl.reports',
                'gl.banks', 'gl.checks', 'gl.budgets', 'gl.closing',
                'reports.financial',
                'master.view'
            ]
        },
        {
            name: 'مدير التدقيق',
            description: 'ترحيل القيود، اعتماد السندات، إدارة دليل الحسابات',
            permissions: [
                'gl.view', 'gl.create', 'gl.edit', 'gl.post',
                'gl.coa_manage',
                'sales.post', 'purchases.post'
            ]
        },
        {
            name: 'محاسب رئيسي',
            description: 'قيود يومية، فواتير، سندات (لا حذف/ترحيل)',
            permissions: [
                'gl.view', 'gl.create',
                'sales.create', 'sales.view',
                'purchases.create', 'purchases.view',
                'basic.reports'
            ]
        },
        {
            name: 'أمين الصندوق',
            description: 'نقاط البيع، سندات القبض فقط',
            permissions: [
                'pos.access',
                'sales.create_cash_invoice',
                'treasury.receipt',
                'treasury.payment'
            ]
        },
        {
            name: 'مدير المبيعات',
            description: 'قوائم الأسعار، حدود الائتمان، الموافقات',
            permissions: [
                'sales.view', 'sales.create', 'sales.edit', 'sales.reports',
                'sales.price_list', 'sales.credit_limit', 'sales.approve_discount',
                'customers.manage'
            ]
        },
        {
            name: 'مندوب مبيعات',
            description: 'إنشاء طلبيات، عرض العملاء الخاصين به',
            permissions: [
                'sales.create_order',
                'sales.view_own',
                'customers.view'
            ]
        },
        {
            name: 'مدير المشتريات',
            description: 'أوامر الشراء، إدارة الموردين',
            permissions: [
                'purchases.view', 'purchases.create', 'purchases.approve',
                'suppliers.manage',
                'inventory.view'
            ]
        },
        {
            name: 'أمين المستودع',
            description: 'سندات إدخال، تحويلات، جرد مخزني',
            permissions: [
                'inventory.view', 'inventory.trans', 'inventory.stocktake',
                'inventory.view_qty'
            ]
        },
        {
            name: 'مدير الموارد البشرية',
            description: 'صلاحيات الموارد البشرية كاملة، الرواتب',
            permissions: [
                'hr.view', 'hr.manage', 'hr.salaries', 'hr.contracts'
            ]
        },
        {
            name: 'مدير الإنتاج',
            description: 'أوامر التصنيع، فواتير المواد',
            permissions: [
                'production.view', 'production.manage', 'production.bom',
                'inventory.view'
            ]
        },
        {
            name: 'مسؤول النظام',
            description: 'إدارة المستخدمين، النسخ الاحتياطي (بدون عمليات مالية)',
            permissions: [
                'system.users', 'system.backup', 'system.settings',
                'system.logs'
            ]
        }
    ];

    const insertRole = db.prepare(`
        INSERT INTO roles (id, name, description) 
        VALUES (@id, @name, @description)
        ON CONFLICT(name) DO UPDATE SET description = @description
    `);

    const updateRoleName = db.prepare(`
        UPDATE roles SET name = @newName, description = @newDesc WHERE name = @oldName
    `);

    const insertPerm = db.prepare(`
        INSERT INTO permissions (id, role_id, permission_key)
        VALUES (@id, @role_id, @key)
    `);

    const getRoleId = db.prepare("SELECT id FROM roles WHERE name = ?");
    const clearPerms = db.prepare("DELETE FROM permissions WHERE role_id = ?");

    const transaction = db.transaction(() => {

        // 1. Migration: Rename English roles to Arabic if they exist
        for (const [engName, arData] of Object.entries(roleMappings)) {
            const hasEnglish = getRoleId.get(engName);
            if (hasEnglish) {
                console.log(`Migrating Role: ${engName} -> ${(arData as any).name}`);
                updateRoleName.run({
                    newName: (arData as any).name,
                    newDesc: (arData as any).desc,
                    oldName: engName
                });
            }
        }

        // 2. Standard Seed / Update
        for (const role of standardRoles) {
            let roleId;
            const existing = getRoleId.get(role.name);

            if (existing) {
                roleId = existing.id;
                clearPerms.run(roleId);
            } else {
                roleId = uuidv4();
                insertRole.run({
                    id: roleId,
                    name: role.name,
                    description: role.description
                });
            }

            for (const key of role.permissions) {
                insertPerm.run({
                    id: uuidv4(),
                    role_id: roleId,
                    key: key
                });
            }
        }
    });

    transaction();
    console.log("Roles seeded (Arabic) successfully.");
};

module.exports = { seedRoles };
