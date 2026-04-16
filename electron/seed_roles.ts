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

    // ---- Permissions Engine defaults (EN identifiers) ----
    try {
        const hasRolePermissions = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='role_permissions' LIMIT 1").get();
        const hasUserAssignments = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_role_assignments' LIMIT 1").get();
        if (hasRolePermissions) {
            const defaultCompanyId = 'COMP_01';
            const defaultRoleDefs = [
                {
                    roleKey: 'role.admin',
                    name: 'role.admin',
                    description: 'System administrator with all capabilities',
                    capabilities: ['ALL']
                },
                {
                    roleKey: 'role.accountant',
                    name: 'role.accountant',
                    description: 'Accounting and reporting operations',
                    capabilities: [
                        'ti.gl.journal.post',
                        'core.reporting.view',
                        'core.reporting.export',
                        'core.audit.view',
                        'sales.invoice.read',
                        'sales.invoice.post',
                        'sales.invoice.print',
                        'view.manage'
                    ]
                },
                {
                    roleKey: 'role.sales',
                    name: 'role.sales',
                    description: 'Sales quote to invoice workflow',
                    capabilities: [
                        'ti.sales.invoice.create',
                        'ti.sales.invoice.post',
                        'sales.invoice.create',
                        'sales.invoice.read',
                        'sales.invoice.update',
                        'sales.invoice.post',
                        'sales.invoice.print',
                        'view.manage'
                    ]
                },
                {
                    roleKey: 'role.purchasing',
                    name: 'role.purchasing',
                    description: 'Purchase invoice workflow',
                    capabilities: ['ti.purchase.invoice.create', 'ti.purchase.invoice.post', 'view.manage']
                },
                {
                    roleKey: 'role.inventory',
                    name: 'role.inventory',
                    description: 'Inventory and item operations',
                    capabilities: ['ti.master.item.manage', 'ti.reporting.operational.view', 'view.manage']
                },
                {
                    roleKey: 'role.hr',
                    name: 'role.hr',
                    description: 'HR operations',
                    capabilities: ['prtax.master.employee.manage', 'prtax.payroll.calculate', 'view.manage']
                }
            ];

            const getRoleByKey = db.prepare("SELECT id FROM roles WHERE role_key = ? OR code = ? LIMIT 1");
            const getRoleByName = db.prepare("SELECT id FROM roles WHERE name = ? LIMIT 1");
            const insertDefaultRole = db.prepare(`
                INSERT INTO roles (id, name, description, company_id, code, name_i18n_key, role_key, is_system, is_active, created_at, updated_at)
                VALUES (@id, @name, @description, @companyId, @code, @nameI18nKey, @roleKey, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `);
            const updateDefaultRole = db.prepare(`
                UPDATE roles
                SET description = @description,
                    company_id = @companyId,
                    code = @code,
                    name_i18n_key = @nameI18nKey,
                    role_key = @roleKey,
                    is_system = 1,
                    is_active = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `);
            const clearRolePermissions = db.prepare("DELETE FROM role_permissions WHERE role_id = ?");
            const insertRolePermission = db.prepare(`
                INSERT OR IGNORE INTO role_permissions (id, role_id, capability_key, effect, created_at)
                VALUES (@id, @roleId, @capabilityKey, 'ALLOW', CURRENT_TIMESTAMP)
            `);

            const defaultTx = db.transaction(() => {
                for (const role of defaultRoleDefs) {
                    const existingByKey = getRoleByKey.get(role.roleKey, role.roleKey);
                    const existingByName = getRoleByName.get(role.name);
                    const roleId = existingByKey?.id || existingByName?.id || uuidv4();

                    if (existingByKey?.id || existingByName?.id) {
                        updateDefaultRole.run({
                            id: roleId,
                            description: role.description,
                            companyId: defaultCompanyId,
                            code: role.roleKey,
                            nameI18nKey: `role.${role.roleKey}.name`,
                            roleKey: role.roleKey,
                        });
                    } else {
                        insertDefaultRole.run({
                            id: roleId,
                            name: role.name,
                            description: role.description,
                            companyId: defaultCompanyId,
                            code: role.roleKey,
                            nameI18nKey: `role.${role.roleKey}.name`,
                            roleKey: role.roleKey,
                        });
                    }

                    clearRolePermissions.run(roleId);
                    for (const capabilityKey of role.capabilities) {
                        insertRolePermission.run({
                            id: uuidv4(),
                            roleId,
                            capabilityKey,
                        });
                    }
                }
            });

            defaultTx();

            if (hasUserAssignments) {
                const adminRole = db.prepare("SELECT id FROM roles WHERE role_key = 'role.admin' OR code = 'role.admin' LIMIT 1").get() as any;
                const firstUser = db.prepare(`
                    SELECT id, branch_id
                    FROM users
                    WHERE is_active = 1
                    ORDER BY created_at ASC
                    LIMIT 1
                `).get() as any;

                if (adminRole?.id && firstUser?.id) {
                    const existingCompanyAssignments = db.prepare(`
                        SELECT id
                        FROM user_role_assignments
                        WHERE company_id = @companyId
                          AND user_id = @userId
                          AND role_id = @roleId
                          AND branch_id IS NULL
                        ORDER BY updated_at DESC, created_at DESC
                    `).all({
                        companyId: defaultCompanyId,
                        userId: firstUser.id,
                        roleId: adminRole.id,
                    }) as Array<{ id: string }>;

                    if (existingCompanyAssignments.length > 0) {
                        const primaryAssignment = existingCompanyAssignments[0];
                        db.prepare(`
                            UPDATE user_role_assignments
                            SET scope_level = 'COMPANY',
                                is_active = 1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = @id
                        `).run({ id: primaryAssignment.id });

                        if (existingCompanyAssignments.length > 1) {
                            const duplicateIds = existingCompanyAssignments.slice(1).map((x) => x.id);
                            const placeholders = duplicateIds.map(() => '?').join(', ');
                            db.prepare(`
                                DELETE FROM user_role_assignments
                                WHERE id IN (${placeholders})
                            `).run(...duplicateIds);
                        }
                    } else {
                        db.prepare(`
                            INSERT INTO user_role_assignments (
                                id, company_id, branch_id, user_id, role_id, scope_level, is_active, created_at, updated_at
                            ) VALUES (
                                @id, @companyId, NULL, @userId, @roleId, 'COMPANY', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                            )
                        `).run({
                            id: uuidv4(),
                            companyId: defaultCompanyId,
                            userId: firstUser.id,
                            roleId: adminRole.id,
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.warn('[seed_roles] Permissions engine defaults skipped:', (error as any)?.message || error);
    }

    console.log("Roles seeded (Arabic + permissions engine defaults) successfully.");
};

module.exports = { seedRoles };
