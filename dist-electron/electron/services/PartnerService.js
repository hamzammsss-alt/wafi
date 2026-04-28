"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
const HRService_1 = require("./HRService");
const AccountService_1 = require("./AccountService");
const SystemService_1 = require("./SystemService");
class PartnerService {
    static toInt(value, defaultValue = 0) {
        if (value === null || value === undefined || value === '')
            return defaultValue;
        const num = Number(value);
        if (!Number.isFinite(num))
            return defaultValue;
        return Math.trunc(num);
    }
    static toNumber(value, defaultValue = 0) {
        if (value === null || value === undefined || value === '')
            return defaultValue;
        const num = Number(value);
        return Number.isFinite(num) ? num : defaultValue;
    }
    static toFlag(value, defaultValue = 0) {
        if (value === null || value === undefined || value === '')
            return defaultValue;
        if (value === true || value === 1 || value === '1')
            return 1;
        return 0;
    }
    static toNull(value) {
        if (value === undefined || value === null)
            return null;
        if (typeof value === 'string' && value.trim() === '')
            return null;
        return value;
    }
    static toJsonText(value) {
        if (value === undefined || value === null || value === '')
            return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }
        try {
            return JSON.stringify(value);
        }
        catch {
            return null;
        }
    }
    static ensurePriceListSchema() {
        database_1.db.exec(`
            CREATE TABLE IF NOT EXISTS price_lists (
                id TEXT PRIMARY KEY,
                name_ar TEXT NOT NULL,
                name_en TEXT,
                currency_id TEXT,
                is_active INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS price_list_items (
                id TEXT PRIMARY KEY,
                price_list_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                unit_id TEXT NOT NULL,
                price REAL NOT NULL DEFAULT 0,
                min_quantity REAL DEFAULT 1,
                FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS item_prices (
                id TEXT PRIMARY KEY,
                price_list_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                unit_id TEXT NOT NULL,
                price REAL DEFAULT 0,
                FOREIGN KEY (price_list_id) REFERENCES price_lists(id),
                FOREIGN KEY (item_id) REFERENCES items(id)
            );
        `);
        const insertList = database_1.db.prepare(`
            INSERT OR IGNORE INTO price_lists (id, name_ar, name_en, currency_id, is_active)
            VALUES (@id, @name_ar, @name_en, @currency_id, 1)
        `);
        for (const list of PartnerService.DEFAULT_PRICE_LISTS) {
            insertList.run(list);
        }
    }
    static removeMirroredItemPrice(row) {
        if (!row?.price_list_id || !row?.item_id || !row?.unit_id)
            return;
        database_1.db.prepare(`
            DELETE FROM item_prices
            WHERE price_list_id = ? AND item_id = ? AND unit_id = ?
        `).run(row.price_list_id, row.item_id, row.unit_id);
    }
    static saveMirroredItemPrice(row) {
        if (!row?.price_list_id || !row?.item_id || !row?.unit_id)
            return;
        PartnerService.removeMirroredItemPrice(row);
        database_1.db.prepare(`
            INSERT INTO item_prices (id, price_list_id, item_id, unit_id, price)
            VALUES (@id, @price_list_id, @item_id, @unit_id, @price)
        `).run({
            id: (0, uuid_1.v4)(),
            price_list_id: row.price_list_id,
            item_id: row.item_id,
            unit_id: row.unit_id,
            price: PartnerService.toNumber(row.price, 0),
        });
    }
    static sanitizeBusinessPartnerPayload(data) {
        return {
            ...data,
            code: this.toNull(data.code),
            name_en: this.toNull(data.name_en),
            name_he: this.toNull(data.name_he),
            phone: this.toNull(data.phone),
            mobile: this.toNull(data.mobile),
            email: this.toNull(data.email),
            address: this.toNull(data.address),
            address_en: this.toNull(data.address_en),
            address_he: this.toNull(data.address_he),
            city: this.toNull(data.city),
            street_ar: this.toNull(data.street_ar),
            street_en: this.toNull(data.street_en),
            street_he: this.toNull(data.street_he),
            country_code: this.toNull(data.country_code),
            timezone: this.toNull(data.timezone),
            po_box: this.toNull(data.po_box),
            gps_location: this.toNull(data.gps_location),
            tax_number: this.toNull(data.tax_number),
            linked_account_id: this.toNull(data.linked_account_id),
            credit_limit: this.toNumber(data.credit_limit, 0),
            payment_term_days: this.toInt(data.payment_term_days, 0),
            price_list_id: this.toNull(data.price_list_id),
            is_active: this.toFlag(data.is_active, 1),
            region_id: this.toNull(data.region_id),
            group_id: this.toNull(data.group_id),
            sales_rep_id: this.toNull(data.sales_rep_id),
            website: this.toNull(data.website),
            credit_days: this.toInt(data.credit_days, 0),
            parent_partner_id: this.toNull(data.parent_partner_id),
            partner_language: this.toNull(data.partner_language),
            registration_date: this.toNull(data.registration_date),
            birth_date: this.toNull(data.birth_date),
            nationality: this.toNull(data.nationality),
            is_company: this.toFlag(data.is_company, 0),
            print_prices_on_docs: this.toFlag(data.print_prices_on_docs, 0),
            print_balance_on_docs: this.toFlag(data.print_balance_on_docs, 0),
            membership_id: this.toNull(data.membership_id),
            sector_id: this.toNull(data.sector_id),
            customer_type_id: this.toNull(data.customer_type_id),
            vendor_type_id: this.toNull(data.vendor_type_id),
            notes: this.toNull(data.notes),
            contact_methods_json: this.toJsonText(data.contact_methods_json),
            bank_accounts_json: this.toJsonText(data.bank_accounts_json),
            customer_enabled: this.toFlag(data.customer_enabled, data.type === 'SUPPLIER' ? 0 : 1),
            customer_name_ar: this.toNull(data.customer_name_ar),
            customer_name_en: this.toNull(data.customer_name_en),
            customer_name_he: this.toNull(data.customer_name_he),
            customer_code: this.toNull(data.customer_code),
            customer_currency_id: this.toNull(data.customer_currency_id),
            customer_account_id: this.toNull(data.customer_account_id || data.linked_account_id),
            customer_discount_percent: this.toNumber(data.customer_discount_percent, 0),
            customer_previous_balance: this.toNumber(data.customer_previous_balance, 0),
            customer_tax_mode: this.toNull(data.customer_tax_mode),
            customer_end_deal_date: this.toNull(data.customer_end_deal_date),
            customer_item_rules_json: this.toJsonText(data.customer_item_rules_json),
            credit_policy_id: this.toNull(data.credit_policy_id),
            max_credit_limit: this.toNumber(data.max_credit_limit, 0),
            max_checks_limit: this.toNumber(data.max_checks_limit, 0),
            personal_check_limit: this.toNumber(data.personal_check_limit, 0),
            facilitation_days: this.toInt(data.facilitation_days, 0),
            facilitation_from_month_end: this.toFlag(data.facilitation_from_month_end, 0),
            allow_over_limit: this.toFlag(data.allow_over_limit, 0),
            overdue_unpaid_days: this.toInt(data.overdue_unpaid_days, 0),
            validation_type: this.toNull(data.validation_type),
            include_collection_checks: this.toFlag(data.include_collection_checks, 0),
            include_sales_orders_posting: this.toFlag(data.include_sales_orders_posting, 0),
            allowed_check_due_days: this.toInt(data.allowed_check_due_days, 0),
            supplier_enabled: this.toFlag(data.supplier_enabled, data.type === 'SUPPLIER' || data.type === 'BOTH' ? 1 : 0),
            supplier_name_ar: this.toNull(data.supplier_name_ar),
            supplier_name_en: this.toNull(data.supplier_name_en),
            supplier_name_he: this.toNull(data.supplier_name_he),
            supplier_price_list_id: this.toNull(data.supplier_price_list_id),
            supplier_currency_id: this.toNull(data.supplier_currency_id),
            supplier_account_id: this.toNull(data.supplier_account_id || data.linked_account_id),
            supplier_tax_mode: this.toNull(data.supplier_tax_mode),
            supplier_items_only: this.toFlag(data.supplier_items_only, 0),
            supplier_item_rules_json: this.toJsonText(data.supplier_item_rules_json),
            supplier_source_discount_percent: this.toNumber(data.supplier_source_discount_percent, 0),
            supplier_source_discount_until: this.toNull(data.supplier_source_discount_until),
            employee_enabled: this.toFlag(data.employee_enabled, data.type === 'EMPLOYEE' ? 1 : 0),
            employee_title_ar: this.toNull(data.employee_title_ar),
            employee_title_en: this.toNull(data.employee_title_en),
            employee_title_he: this.toNull(data.employee_title_he),
            employee_gender: this.toNull(data.employee_gender),
            employee_doc_type: this.toNull(data.employee_doc_type),
            employee_id_number: this.toNull(data.employee_id_number),
            employee_is_resident: this.toFlag(data.employee_is_resident, 0),
            employee_social_status: this.toNull(data.employee_social_status),
            employee_account_id: this.toNull(data.employee_account_id),
            employee_currency_id: this.toNull(data.employee_currency_id),
            employee_children_count: this.toInt(data.employee_children_count, 0),
            employee_students_count: this.toInt(data.employee_students_count, 0),
            employee_dependents_count: this.toInt(data.employee_dependents_count, 0),
            employee_education: this.toNull(data.employee_education),
            employee_group: this.toNull(data.employee_group),
            employee_number: this.toNull(data.employee_number),
            employee_hire_date: this.toNull(data.employee_hire_date),
            employee_end_date: this.toNull(data.employee_end_date)
        };
    }
    static getPartners(type) {
        // Self-heal: ensure all newer columns exist (for older databases)
        const bpCols = database_1.db.prepare("PRAGMA table_info(business_partners)").all().map((c) => c.name);
        const missingCols = [
            ['membership_id', 'TEXT'],
            ['sector_id', 'TEXT'],
            ['customer_type_id', 'TEXT'],
            ['vendor_type_id', 'TEXT'],
            ['credit_policy_id', 'TEXT'],
            ['max_credit_limit', 'REAL DEFAULT 0'],
            ['max_checks_limit', 'REAL DEFAULT 0'],
            ['personal_check_limit', 'REAL DEFAULT 0'],
            ['facilitation_days', 'INTEGER DEFAULT 0'],
            ['facilitation_from_month_end', 'INTEGER DEFAULT 0'],
            ['allow_over_limit', 'INTEGER DEFAULT 0'],
            ['overdue_unpaid_days', 'INTEGER DEFAULT 0'],
            ['validation_type', 'TEXT'],
            ['include_collection_checks', 'INTEGER DEFAULT 0'],
            ['include_sales_orders_posting', 'INTEGER DEFAULT 0'],
            ['allowed_check_due_days', 'INTEGER DEFAULT 0'],
            ['is_company', 'INTEGER DEFAULT 0'],
            ['print_prices_on_docs', 'INTEGER DEFAULT 0'],
            ['print_balance_on_docs', 'INTEGER DEFAULT 0'],
            ['credit_days', 'INTEGER DEFAULT 0'],
            ['parent_partner_id', 'TEXT'],
            ['partner_language', 'TEXT'],
            ['registration_date', 'TEXT'],
            ['birth_date', 'TEXT'],
            ['nationality', 'TEXT'],
            ['street_ar', 'TEXT'],
            ['street_en', 'TEXT'],
            ['street_he', 'TEXT'],
            ['po_box', 'TEXT'],
            ['gps_location', 'TEXT'],
            ['timezone', 'TEXT'],
            ['website', 'TEXT'],
            ['customer_enabled', 'INTEGER DEFAULT 1'],
            ['customer_name_ar', 'TEXT'],
            ['customer_name_en', 'TEXT'],
            ['customer_name_he', 'TEXT'],
            ['customer_code', 'TEXT'],
            ['customer_currency_id', 'TEXT'],
            ['customer_account_id', 'TEXT'],
            ['customer_discount_percent', 'REAL DEFAULT 0'],
            ['customer_previous_balance', 'REAL DEFAULT 0'],
            ['customer_tax_mode', 'TEXT'],
            ['customer_end_deal_date', 'TEXT'],
            ['customer_item_rules_json', 'TEXT'],
            ['supplier_enabled', 'INTEGER DEFAULT 0'],
            ['supplier_name_ar', 'TEXT'],
            ['supplier_name_en', 'TEXT'],
            ['supplier_name_he', 'TEXT'],
            ['supplier_price_list_id', 'TEXT'],
            ['supplier_currency_id', 'TEXT'],
            ['supplier_account_id', 'TEXT'],
            ['supplier_tax_mode', 'TEXT'],
            ['supplier_items_only', 'INTEGER DEFAULT 0'],
            ['supplier_item_rules_json', 'TEXT'],
            ['supplier_source_discount_percent', 'REAL DEFAULT 0'],
            ['supplier_source_discount_until', 'TEXT'],
            ['employee_enabled', 'INTEGER DEFAULT 0'],
            ['employee_title_ar', 'TEXT'],
            ['employee_title_en', 'TEXT'],
            ['employee_title_he', 'TEXT'],
            ['employee_gender', 'TEXT'],
            ['employee_doc_type', 'TEXT'],
            ['employee_id_number', 'TEXT'],
            ['employee_is_resident', 'INTEGER DEFAULT 0'],
            ['employee_social_status', 'TEXT'],
            ['employee_account_id', 'TEXT'],
            ['employee_currency_id', 'TEXT'],
            ['employee_children_count', 'INTEGER DEFAULT 0'],
            ['employee_students_count', 'INTEGER DEFAULT 0'],
            ['employee_dependents_count', 'INTEGER DEFAULT 0'],
            ['employee_education', 'TEXT'],
            ['employee_group', 'TEXT'],
            ['employee_number', 'TEXT'],
            ['employee_hire_date', 'TEXT'],
            ['employee_end_date', 'TEXT'],
            ['contact_methods_json', 'TEXT'],
            ['bank_accounts_json', 'TEXT'],
            ['price_list_id', 'TEXT'],
        ];
        for (const [col, def] of missingCols) {
            if (!bpCols.includes(col)) {
                try {
                    database_1.db.prepare(`ALTER TABLE business_partners ADD COLUMN ${col} ${def}`).run();
                    console.log(`[PartnerService] Self-heal: added column business_partners.${col}`);
                }
                catch (e) {
                    // column may exist already in a race, ignore
                }
            }
        }
        // 1. Fetch Business Partners (Customers/Suppliers)
        let bpQuery = `
            SELECT 
                p.*,
                r.name_ar as region_name,
                g.name_ar as group_name,
                sr.name_ar as sales_rep_name,
                pm.name_ar as membership_name,
                ps.name_ar as sector_name,
                cp.name_ar as credit_policy_name,
                'bp' as source
            FROM business_partners p 
            LEFT JOIN regions r ON p.region_id = r.id 
            LEFT JOIN customer_groups g ON p.group_id = g.id
            LEFT JOIN sales_reps sr ON p.sales_rep_id = sr.id
            LEFT JOIN partner_memberships pm ON p.membership_id = pm.id
            LEFT JOIN partner_sectors ps ON p.sector_id = ps.id
            LEFT JOIN credit_policies cp ON p.credit_policy_id = cp.id
        `;
        const bpParams = [];
        if (type && type !== 'EMPLOYEE') {
            bpQuery += ` WHERE p.type = ? OR p.type = 'BOTH'`;
            bpParams.push(type);
        }
        const partners = database_1.db.prepare(bpQuery).all(...bpParams);
        // 2. Fetch Employees (if requested or if no type specified)
        let employees = [];
        if (!type || type === 'EMPLOYEE') {
            const empQuery = `
                SELECT e.id, e.employee_code as code, 
                       (e.first_name || ' ' || e.last_name) as name_ar,
                       e.first_name as name_en,
                       'EMPLOYEE' as type,
                       e.mobile_phone as mobile,
                       e.email,
                       e.address_city as city,
                       e.linked_account_id,
                       1 as is_active,
                       j.title as job_title_name,
                       d.name as department_name,
                       'hr' as source
                FROM hr_employees e
                LEFT JOIN hr_employee_contracts c ON c.employee_id = e.id AND c.is_active = 1
                LEFT JOIN hr_job_titles j ON c.job_title_id = j.id
                LEFT JOIN hr_departments d ON c.department_id = d.id
            `;
            employees = database_1.db.prepare(empQuery).all();
        }
        // 3. Merge
        return [...partners, ...employees].sort((a, b) => a.name_ar.localeCompare(b.name_ar));
    }
    static getPartner(id) {
        // Try Business Partner first
        const partner = database_1.db.prepare('SELECT * FROM business_partners WHERE id = ?').get(id);
        if (partner)
            return partner;
        // Try Employee
        const emp = database_1.db.prepare('SELECT * FROM hr_employees WHERE id = ?').get(id);
        if (emp) {
            // Map to BusinessPartner interface
            const contract = database_1.db.prepare('SELECT * FROM hr_employee_contracts WHERE employee_id = ? AND is_active = 1').get(id);
            return {
                id: emp.id,
                code: emp.employee_code,
                name_ar: `${emp.first_name} ${emp.last_name}`,
                type: 'EMPLOYEE',
                mobile: emp.mobile_phone,
                email: emp.email,
                linked_account_id: emp.linked_account_id,
                is_active: 1,
                job_title_id: contract?.job_title_id,
                department_id: contract?.department_id,
                basic_salary: contract?.basic_salary
            };
        }
        return null;
    }
    // Unified Save Method (Routing)
    static savePartner(data) {
        if (data.type === 'EMPLOYEE') {
            // Route to HR Service
            const nameParts = String(data.name_ar || '').trim().split(/\s+/).filter(Boolean);
            const firstName = nameParts[0] || 'موظف';
            const fatherName = nameParts[1] || firstName;
            const grandfatherName = nameParts[2] || fatherName;
            const lastName = nameParts.slice(3).join(' ') || nameParts.slice(1).join(' ') || fatherName;
            const employeePayload = {
                personal: {
                    id: data.id,
                    employee_code: data.code,
                    first_name: firstName,
                    father_name: fatherName,
                    grandfather_name: grandfatherName,
                    last_name: lastName,
                    mobile_phone: data.mobile,
                    email: data.email,
                    national_id: data.employee_id_number || data.tax_number || null,
                    date_of_birth: data.birth_date || null,
                    gender: data.employee_gender === 'FEMALE' ? 'FEMALE' : 'MALE',
                    marital_status: data.employee_social_status || null,
                    nationality: data.nationality || 'Palestinian',
                    address_city: data.city || null,
                    address_street: data.address || null,
                    linked_account_id: data.linked_account_id || data.employee_account_id || null,
                    status: data.is_active ? 'ACTIVE' : 'TERMINATED'
                },
                contract: {
                    job_title_id: data.job_title_id,
                    department_id: data.department_id,
                    basic_salary: data.basic_salary || 0,
                    currency: data.employee_currency_id || 'ILS',
                    start_date: data.employee_hire_date || data.registration_date || new Date().toISOString().slice(0, 10),
                    end_date: data.employee_end_date || null
                }
            };
            return HRService_1.HRService.saveEmployee(employeePayload);
        }
        else {
            // Route to Business Partner Logic
            if (data.id)
                return this.updatePartner(data);
            return this.createPartner(data);
        }
    }
    static createPartner(data) {
        if (!data.name_ar)
            throw new Error("Name (AR) is required");
        const normalizedName = String(data.name_ar || '').trim().replace(/\s+/g, ' ').toUpperCase();
        if (data.type === 'CUSTOMER' || data.type === 'BOTH') {
            const duplicateCustomer = database_1.db.prepare(`
                SELECT id
                FROM business_partners
                WHERE type IN ('CUSTOMER', 'BOTH')
                  AND UPPER(TRIM(COALESCE(name_ar, ''))) = ?
                LIMIT 1
            `).get(normalizedName);
            if (duplicateCustomer) {
                throw new Error('اسم الزبون موجود مسبقاً في الدليل');
            }
        }
        const maxRetries = 5;
        let attempts = 0;
        let lastError = null;
        while (attempts < maxRetries) {
            let code = data.code;
            // Auto-generate code if missing or if this is a retry (implying collision)
            // If the USER provided a code, we only try once (no retry with different code).
            if (!data.code || attempts > 0) {
                if (attempts === 0) {
                    // First attempt: Standard UUID prefix
                    code = (0, uuid_1.v4)().substring(0, 8).toUpperCase();
                }
                else {
                    // Fallback strategy: Timestamp + Random to ensure uniqueness
                    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    const timestamp = Date.now().toString(36).toUpperCase().substring(3); // Shortened timestamp
                    code = `P-${timestamp}${randomSuffix}`;
                }
            }
            else {
                code = code.trim();
            }
            const id = (0, uuid_1.v4)();
            // Resolve the linked account by role-specific field first.
            // This keeps the main linked_account_id aligned with the selected role account.
            let resolvedLinkedAccountId = data.linked_account_id || null;
            if (data.type === 'CUSTOMER' && data.customer_account_id) {
                resolvedLinkedAccountId = data.customer_account_id;
            }
            else if (data.type === 'SUPPLIER' && data.supplier_account_id) {
                resolvedLinkedAccountId = data.supplier_account_id;
            }
            else if (data.type === 'EMPLOYEE' && data.employee_account_id) {
                resolvedLinkedAccountId = data.employee_account_id;
            }
            else if (data.type === 'BOTH') {
                resolvedLinkedAccountId = data.customer_account_id || data.supplier_account_id || data.linked_account_id || null;
            }
            data.linked_account_id = resolvedLinkedAccountId || undefined;
            // --- Auto GL Account Creation ---
            // If linked_account_id is provided, check if it is a TRANSACTIONAL account or a PARENT (Header).
            // If it is a PARENT, we use it as the base to create a new sub-account.
            // If it is TRANSACTIONAL, we just link it.
            let autoCreate = !resolvedLinkedAccountId;
            let explicitParentId = null;
            if (resolvedLinkedAccountId) {
                const linkedAcc = database_1.db.prepare('SELECT id, is_transactional FROM gl_chart_of_accounts WHERE id = ?').get(resolvedLinkedAccountId);
                if (linkedAcc && linkedAcc.is_transactional === 0) {
                    // It is a Header/Parent. User wants to create a sub-account HERE.
                    autoCreate = true;
                    explicitParentId = linkedAcc.id;
                    // We clear linked_account_id so the logic below runs, but we use explicitParentId
                    // Note: We need to set data.linked_account_id back to the NEW id later.
                }
            }
            if (autoCreate) {
                try {
                    const settings = SystemService_1.SystemService.getSettings();
                    let parentId = explicitParentId;
                    let systemType = 'CUSTOMER'; // Default
                    if (data.type === 'CUSTOMER' && settings['default_customer_parent']) {
                        parentId = settings['default_customer_parent'];
                        systemType = 'CUSTOMER';
                    }
                    else if (data.type === 'SUPPLIER' && settings['default_supplier_parent']) {
                        parentId = settings['default_supplier_parent'];
                        systemType = 'SUPPLIER';
                    }
                    else if (data.type === 'EMPLOYEE' && settings['default_employee_parent']) {
                        parentId = settings['default_employee_parent'];
                        systemType = 'EMPLOYEE';
                    }
                    else if (data.type === 'BOTH' && settings['default_partner_parent']) {
                        parentId = settings['default_partner_parent'];
                        systemType = 'PARTNER';
                    }
                    else if (data.type === 'BOTH' && settings['default_customer_parent']) {
                        // Default to customer parent for BOTH
                        parentId = settings['default_customer_parent'];
                        systemType = 'CUSTOMER';
                    }
                    if (parentId) {
                        // Generate Code
                        // Find max code under this parent
                        const siblings = database_1.db.prepare('SELECT account_code FROM gl_chart_of_accounts WHERE parent_id = ?').all(parentId);
                        let nextCode = '';
                        // Simple logic: If parent is 112, children are 1120001 etc?
                        // Or Just Max + 1.
                        // Let's assume numeric sort works or we do simple max.
                        // Safe approach: Get parent code first.
                        const parentAcc = database_1.db.prepare('SELECT account_code FROM gl_chart_of_accounts WHERE id = ?').get(parentId);
                        if (parentAcc) {
                            // Assuming standard structure PPPP-CCCC or PPPPCCCC
                            // Let's just try to parse integer
                            let maxSuffix = 0;
                            siblings.forEach((s) => {
                                // Try to remove parent prefix
                                if (s.account_code.startsWith(parentAcc.account_code)) {
                                    const suffix = s.account_code.slice(parentAcc.account_code.length);
                                    const val = parseInt(suffix);
                                    if (!isNaN(val) && val > maxSuffix)
                                        maxSuffix = val;
                                }
                            });
                            nextCode = parentAcc.account_code + (maxSuffix + 1).toString().padStart(4, '0');
                            const parentTypeInfo = database_1.db.prepare("SELECT account_type FROM gl_chart_of_accounts WHERE id = ?").get(parentId);
                            // But createAccount inside AccountService doesn't allow overriding ID? 
                            // Wait, AccountService.createAccount GENERATES the ID and returns it.
                            const createdId = AccountService_1.AccountService.createAccount({
                                account_code: nextCode,
                                name_ar: data.name_ar,
                                name_en: data.name_en || null,
                                parent_id: parentId,
                                account_type: parentTypeInfo ? parentTypeInfo.account_type : 'ASSET', // Fallback
                                is_transactional: 1, // Leaf
                                currency_id: null,
                                requires_cost_center: 0,
                                system_type: systemType
                            });
                            console.log(`[PartnerService] Auto-created GL Account '${nextCode}' for '${data.name_ar}'`);
                            // Link it (mutate data before insert)
                            // Warning: We need to make sure we don't modify the 'data' argument if it's reused, but here it's passed by value/ref? object ref.
                            // TS Error: linked_account_id is readonly? Interface? No.
                            // But we need to update the INSERT statement params. 
                            // We can just set data.linked_account_id = createdId;
                            // But wait, createPartner takes Omit<BusinessPartner, 'id'>.
                            // We should update the variable used in insert.
                            data.linked_account_id = createdId;
                            if (data.type === 'CUSTOMER')
                                data.customer_account_id = data.customer_account_id || createdId;
                            if (data.type === 'SUPPLIER')
                                data.supplier_account_id = data.supplier_account_id || createdId;
                            if (data.type === 'EMPLOYEE')
                                data.employee_account_id = data.employee_account_id || createdId;
                            if (data.type === 'BOTH') {
                                data.customer_account_id = data.customer_account_id || createdId;
                                data.supplier_account_id = data.supplier_account_id || createdId;
                            }
                        }
                    }
                }
                catch (err) {
                    console.error("[PartnerService] Auto-GL Creation Failed:", err);
                    // Do not fail the Partner Creation, just log error.
                }
            }
            try {
                const stmt = database_1.db.prepare(`
                    INSERT INTO business_partners (
                        id, code, name_ar, name_en, name_he, type,
                        phone, mobile, email, address, address_en, address_he, city,
                        street_ar, street_en, street_he, country_code, timezone, po_box, gps_location, tax_number,
                        linked_account_id, credit_limit, payment_term_days, price_list_id, is_active,
                        region_id, group_id, sales_rep_id, website, credit_days,
                        parent_partner_id, partner_language, registration_date, birth_date, nationality,
                        is_company, print_prices_on_docs, print_balance_on_docs, membership_id, sector_id, customer_type_id, vendor_type_id,
                        notes, contact_methods_json, bank_accounts_json,
                        customer_enabled, customer_name_ar, customer_name_en, customer_name_he, customer_code,
                        customer_currency_id, customer_account_id, customer_discount_percent, customer_previous_balance,
                        customer_tax_mode, customer_end_deal_date, customer_item_rules_json,
                        credit_policy_id, max_credit_limit, max_checks_limit, personal_check_limit, facilitation_days,
                        facilitation_from_month_end, allow_over_limit, overdue_unpaid_days, validation_type,
                        include_collection_checks, include_sales_orders_posting, allowed_check_due_days,
                        supplier_enabled, supplier_name_ar, supplier_name_en, supplier_name_he,
                        supplier_price_list_id, supplier_currency_id, supplier_account_id, supplier_tax_mode, supplier_items_only,
                        supplier_item_rules_json, supplier_source_discount_percent, supplier_source_discount_until,
                        employee_enabled, employee_title_ar, employee_title_en, employee_title_he, employee_gender,
                        employee_doc_type, employee_id_number, employee_is_resident, employee_social_status,
                        employee_account_id, employee_currency_id, employee_children_count, employee_students_count,
                        employee_dependents_count, employee_education, employee_group, employee_number,
                        employee_hire_date, employee_end_date
                    ) VALUES (
                        @id, @code, @name_ar, @name_en, @name_he, @type,
                        @phone, @mobile, @email, @address, @address_en, @address_he, @city,
                        @street_ar, @street_en, @street_he, @country_code, @timezone, @po_box, @gps_location, @tax_number,
                        @linked_account_id, @credit_limit, @payment_term_days, @price_list_id, @is_active,
                        @region_id, @group_id, @sales_rep_id, @website, @credit_days,
                        @parent_partner_id, @partner_language, @registration_date, @birth_date, @nationality,
                        @is_company, @print_prices_on_docs, @print_balance_on_docs, @membership_id, @sector_id, @customer_type_id, @vendor_type_id,
                        @notes, @contact_methods_json, @bank_accounts_json,
                        @customer_enabled, @customer_name_ar, @customer_name_en, @customer_name_he, @customer_code,
                        @customer_currency_id, @customer_account_id, @customer_discount_percent, @customer_previous_balance,
                        @customer_tax_mode, @customer_end_deal_date, @customer_item_rules_json,
                        @credit_policy_id, @max_credit_limit, @max_checks_limit, @personal_check_limit, @facilitation_days,
                        @facilitation_from_month_end, @allow_over_limit, @overdue_unpaid_days, @validation_type,
                        @include_collection_checks, @include_sales_orders_posting, @allowed_check_due_days,
                        @supplier_enabled, @supplier_name_ar, @supplier_name_en, @supplier_name_he,
                        @supplier_price_list_id, @supplier_currency_id, @supplier_account_id, @supplier_tax_mode, @supplier_items_only,
                        @supplier_item_rules_json, @supplier_source_discount_percent, @supplier_source_discount_until,
                        @employee_enabled, @employee_title_ar, @employee_title_en, @employee_title_he, @employee_gender,
                        @employee_doc_type, @employee_id_number, @employee_is_resident, @employee_social_status,
                        @employee_account_id, @employee_currency_id, @employee_children_count, @employee_students_count,
                        @employee_dependents_count, @employee_education, @employee_group, @employee_number,
                        @employee_hire_date, @employee_end_date
                    )
                `);
                const payload = this.sanitizeBusinessPartnerPayload({
                    ...data,
                    id,
                    code
                });
                stmt.run(payload);
                return id; // Success!
            }
            catch (error) {
                console.error(`Attempt ${attempts + 1} failed for code '${code}':`, error.message);
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    // Check specifically if it's the CODE constraint
                    // SQLite error message usually contains the column name
                    const isCodeConstraint = error.message && error.message.toLowerCase().includes('code');
                    if (!isCodeConstraint) {
                        // It's likely name_ar, tax_number, etc. Fail immediately.
                        console.error("Unique constraint failed but NOT on code:", error.message);
                        throw error;
                    }
                    // If user provided a specific code, we CANNOT retry with a new one. Fail immediately.
                    if (data.code && attempts === 0) {
                        throw new Error(`Partner code '${code}' already exists`);
                    }
                    // Otherwise, it was auto-generated. Retry loop will generate a NEW code.
                    lastError = error;
                    attempts++;
                    continue;
                }
                throw error; // Other errors (not unique constraint) -> fail
            }
        }
        console.error("Failed to generate unique code after retries. Last Error:", lastError);
        throw new Error(`Failed to generate unique Partner Code. Last error: ${lastError?.message || 'Unknown'}`);
    }
    static updatePartner(data) {
        // Uniqueness check for update (excluding self)
        if (data.code) {
            data.code = data.code.trim();
            const exists = database_1.db.prepare('SELECT 1 FROM business_partners WHERE code = ? AND id != ?').get(data.code, data.id);
            if (exists)
                throw new Error(`Product code '${data.code}' already exists`);
        }
        const normalizedName = String(data.name_ar || '').trim().replace(/\s+/g, ' ').toUpperCase();
        if (data.type === 'CUSTOMER' || data.type === 'BOTH') {
            const duplicateCustomer = database_1.db.prepare(`
                SELECT id
                FROM business_partners
                WHERE type IN ('CUSTOMER', 'BOTH')
                  AND UPPER(TRIM(COALESCE(name_ar, ''))) = ?
                  AND id != ?
                LIMIT 1
            `).get(normalizedName, data.id);
            if (duplicateCustomer) {
                throw new Error('اسم الزبون موجود مسبقاً في الدليل');
            }
        }
        try {
            const stmt = database_1.db.prepare(`
                UPDATE business_partners 
                SET code = @code, name_ar = @name_ar, name_en = @name_en, name_he = @name_he, type = @type,
                    phone = @phone, mobile = @mobile, email = @email,
                    address = @address, address_en = @address_en, address_he = @address_he, city = @city,
                    street_ar = @street_ar, street_en = @street_en, street_he = @street_he,
                    country_code = @country_code, timezone = @timezone, po_box = @po_box, gps_location = @gps_location,
                    tax_number = @tax_number,
                    linked_account_id = @linked_account_id, credit_limit = @credit_limit, payment_term_days = @payment_term_days, price_list_id = @price_list_id,
                    is_active = @is_active, region_id = @region_id, group_id = @group_id, sales_rep_id = @sales_rep_id, website = @website, credit_days = @credit_days,
                    parent_partner_id = @parent_partner_id, partner_language = @partner_language, registration_date = @registration_date, birth_date = @birth_date,
                    nationality = @nationality, is_company = @is_company, print_prices_on_docs = @print_prices_on_docs, print_balance_on_docs = @print_balance_on_docs,
                    membership_id = @membership_id, sector_id = @sector_id, customer_type_id = @customer_type_id, vendor_type_id = @vendor_type_id,
                    notes = @notes, contact_methods_json = @contact_methods_json, bank_accounts_json = @bank_accounts_json,
                    customer_enabled = @customer_enabled, customer_name_ar = @customer_name_ar, customer_name_en = @customer_name_en,
                    customer_name_he = @customer_name_he, customer_code = @customer_code, customer_currency_id = @customer_currency_id,
                    customer_account_id = @customer_account_id, customer_discount_percent = @customer_discount_percent,
                    customer_previous_balance = @customer_previous_balance, customer_tax_mode = @customer_tax_mode,
                    customer_end_deal_date = @customer_end_deal_date, customer_item_rules_json = @customer_item_rules_json,
                    credit_policy_id = @credit_policy_id, max_credit_limit = @max_credit_limit, max_checks_limit = @max_checks_limit,
                    personal_check_limit = @personal_check_limit, facilitation_days = @facilitation_days,
                    facilitation_from_month_end = @facilitation_from_month_end, allow_over_limit = @allow_over_limit,
                    overdue_unpaid_days = @overdue_unpaid_days, validation_type = @validation_type,
                    include_collection_checks = @include_collection_checks, include_sales_orders_posting = @include_sales_orders_posting,
                    allowed_check_due_days = @allowed_check_due_days,
                    supplier_enabled = @supplier_enabled, supplier_name_ar = @supplier_name_ar, supplier_name_en = @supplier_name_en,
                    supplier_name_he = @supplier_name_he, supplier_price_list_id = @supplier_price_list_id, supplier_currency_id = @supplier_currency_id,
                    supplier_account_id = @supplier_account_id, supplier_tax_mode = @supplier_tax_mode, supplier_items_only = @supplier_items_only,
                    supplier_item_rules_json = @supplier_item_rules_json, supplier_source_discount_percent = @supplier_source_discount_percent,
                    supplier_source_discount_until = @supplier_source_discount_until,
                    employee_enabled = @employee_enabled, employee_title_ar = @employee_title_ar, employee_title_en = @employee_title_en,
                    employee_title_he = @employee_title_he, employee_gender = @employee_gender, employee_doc_type = @employee_doc_type,
                    employee_id_number = @employee_id_number, employee_is_resident = @employee_is_resident, employee_social_status = @employee_social_status,
                    employee_account_id = @employee_account_id, employee_currency_id = @employee_currency_id, employee_children_count = @employee_children_count,
                    employee_students_count = @employee_students_count, employee_dependents_count = @employee_dependents_count,
                    employee_education = @employee_education, employee_group = @employee_group, employee_number = @employee_number,
                    employee_hire_date = @employee_hire_date, employee_end_date = @employee_end_date
                WHERE id = @id
            `);
            const payload = this.sanitizeBusinessPartnerPayload(data);
            stmt.run(payload);
            return { success: true };
        }
        catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error(`Partner code '${data.code}' already exists`);
            }
            throw error;
        }
    }
    static deletePartner(id) {
        // Check type first
        const isEmployee = database_1.db.prepare('SELECT id FROM hr_employees WHERE id = ?').get(id);
        if (isEmployee) {
            // For safety, we just allow deleting if no dependencies, 
            // but usually we terminate. For now, hard delete to match request.
            database_1.db.prepare('DELETE FROM hr_employees WHERE id = ?').run(id);
            return { success: true };
        }
        database_1.db.prepare('DELETE FROM business_partners WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Regions ---
    static getRegions() { return database_1.db.prepare('SELECT * FROM regions ORDER BY name_ar').all(); }
    static createRegion(data) {
        const id = (0, uuid_1.v4)();
        database_1.db.prepare(`INSERT INTO regions (id, code, name_ar, name_en, parent_id, is_active) VALUES (@id, @code, @name_ar, @name_en, @parent_id, @is_active)`).run({
            id,
            code: data.code || null,
            name_ar: data.name_ar,
            name_en: data.name_en || null,
            parent_id: data.parent_id || null,
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        });
        return id;
    }
    static updateRegion(data) {
        database_1.db.prepare(`UPDATE regions SET code=@code, name_ar=@name_ar, name_en=@name_en, parent_id=@parent_id, is_active=@is_active WHERE id=@id`).run({
            ...data,
            code: data.code || null,
            name_en: data.name_en || null,
            parent_id: data.parent_id || null,
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        });
        return { success: true };
    }
    // Kept for backward compat if needed, but we should switch to explicit create/update
    static saveRegion(data) {
        if (data.id)
            return this.updateRegion(data);
        return this.createRegion(data);
    }
    static deleteRegion(id) { database_1.db.prepare('DELETE FROM regions WHERE id = ?').run(id); return { success: true }; }
    // --- Customer Types ---
    static getCustomerTypes() { return database_1.db.prepare('SELECT * FROM customer_types ORDER BY name_ar').all(); }
    static saveCustomerType(data) {
        // ID is INTEGER AUTOINCREMENT for legacy reasons, but we can treat as string/number
        if (data.id) {
            database_1.db.prepare(`UPDATE customer_types SET code=@code, name=@name, name_ar=@name_ar, name_en=@name_en, discount=@discount, description=@description, is_active=@is_active WHERE id=@id`).run({
                ...data,
                name: data.name_ar, // Legacy map
                name_en: data.name_en || null,
                discount: data.discount || 0,
                description: data.description || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        }
        else {
            database_1.db.prepare(`INSERT INTO customer_types (code, name, name_ar, name_en, discount, description, is_active) VALUES (@code, @name, @name_ar, @name_en, @discount, @description, @is_active)`).run({
                code: data.code || null,
                name: data.name_ar, // Legacy map
                name_ar: data.name_ar,
                name_en: data.name_en || null,
                discount: data.discount || 0,
                description: data.description || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        }
        return { success: true };
    }
    static deleteCustomerType(id) { database_1.db.prepare('DELETE FROM customer_types WHERE id = ?').run(id); return { success: true }; }
    // --- Vendor Types ---
    static getVendorTypes() { return database_1.db.prepare('SELECT * FROM vendor_types ORDER BY name_ar').all(); }
    static saveVendorType(data) {
        if (data.id) {
            database_1.db.prepare(`UPDATE vendor_types SET code=@code, name=@name, name_ar=@name_ar, name_en=@name_en, description=@description, is_active=@is_active WHERE id=@id`).run({
                ...data,
                name: data.name_ar, // Legacy map
                name_en: data.name_en || null,
                description: data.description || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        }
        else {
            database_1.db.prepare(`INSERT INTO vendor_types (code, name, name_ar, name_en, description, is_active) VALUES (@code, @name, @name_ar, @name_en, @description, @is_active)`).run({
                code: data.code || null,
                name: data.name_ar, // Legacy map
                name_ar: data.name_ar,
                name_en: data.name_en || null,
                description: data.description || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        }
        return { success: true };
    }
    static deleteVendorType(id) { database_1.db.prepare('DELETE FROM vendor_types WHERE id = ?').run(id); return { success: true }; }
    // --- Contact Types ---
    static getContactTypes() {
        return database_1.db.prepare(`
            SELECT code, name_ar, name_en, sort_order, is_active
            FROM partner_contact_types
            WHERE is_active = 1
            ORDER BY sort_order, name_ar
        `).all();
    }
    // --- Memberships ---
    static getMemberships() {
        return database_1.db.prepare('SELECT * FROM partner_memberships ORDER BY name_ar').all();
    }
    static saveMembership(data) {
        if (data.id) {
            database_1.db.prepare(`
                UPDATE partner_memberships
                SET code = @code, name_ar = @name_ar, name_en = @name_en, is_active = @is_active
                WHERE id = @id
            `).run({
                ...data,
                code: data.code || null,
                name_en: data.name_en || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        }
        else {
            database_1.db.prepare(`
                INSERT INTO partner_memberships (id, code, name_ar, name_en, is_active)
                VALUES (@id, @code, @name_ar, @name_en, @is_active)
            `).run({
                id: (0, uuid_1.v4)(),
                code: data.code || null,
                name_ar: data.name_ar,
                name_en: data.name_en || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        }
        return { success: true };
    }
    static deleteMembership(id) {
        database_1.db.prepare('DELETE FROM partner_memberships WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Sectors ---
    static getSectors() {
        return database_1.db.prepare('SELECT * FROM partner_sectors ORDER BY name_ar').all();
    }
    static saveSector(data) {
        if (data.id) {
            database_1.db.prepare(`
                UPDATE partner_sectors
                SET code = @code, name_ar = @name_ar, name_en = @name_en, is_active = @is_active
                WHERE id = @id
            `).run({
                ...data,
                code: data.code || null,
                name_en: data.name_en || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        }
        else {
            database_1.db.prepare(`
                INSERT INTO partner_sectors (id, code, name_ar, name_en, is_active)
                VALUES (@id, @code, @name_ar, @name_en, @is_active)
            `).run({
                id: (0, uuid_1.v4)(),
                code: data.code || null,
                name_ar: data.name_ar,
                name_en: data.name_en || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        }
        return { success: true };
    }
    static deleteSector(id) {
        database_1.db.prepare('DELETE FROM partner_sectors WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Credit Policies ---
    static getCreditPolicies() {
        return database_1.db.prepare('SELECT * FROM credit_policies ORDER BY name_ar').all();
    }
    static saveCreditPolicy(data) {
        const payload = {
            ...data,
            code: data.code || null,
            name_en: data.name_en || null,
            name_he: data.name_he || null,
            currency_id: data.currency_id || null,
            max_credit_limit: this.toNumber(data.max_credit_limit, 0),
            max_checks_limit: this.toNumber(data.max_checks_limit, 0),
            personal_check_limit: this.toNumber(data.personal_check_limit, 0),
            facilitation_days: this.toInt(data.facilitation_days, 0),
            facilitation_from_month_end: this.toFlag(data.facilitation_from_month_end, 0),
            allow_over_limit: this.toFlag(data.allow_over_limit, 0),
            overdue_check_days: this.toInt(data.overdue_check_days, 0),
            check_validation_type: data.check_validation_type || 'NONE',
            include_collection_checks: this.toFlag(data.include_collection_checks, 0),
            include_open_sales_orders: this.toFlag(data.include_open_sales_orders, 0),
            allowed_check_due_days: this.toInt(data.allowed_check_due_days, 0),
            override_max_credit_limit: this.toFlag(data.override_max_credit_limit, 1),
            override_max_checks_limit: this.toFlag(data.override_max_checks_limit, 1),
            override_personal_check_limit: this.toFlag(data.override_personal_check_limit, 1),
            override_facilitation_days: this.toFlag(data.override_facilitation_days, 1),
            override_facilitation_from_month_end: this.toFlag(data.override_facilitation_from_month_end, 1),
            override_allow_over_limit: this.toFlag(data.override_allow_over_limit, 1),
            override_overdue_check_days: this.toFlag(data.override_overdue_check_days, 1),
            override_check_validation_type: this.toFlag(data.override_check_validation_type, 1),
            override_include_collection_checks: this.toFlag(data.override_include_collection_checks, 1),
            override_include_open_sales_orders: this.toFlag(data.override_include_open_sales_orders, 1),
            override_allowed_check_due_days: this.toFlag(data.override_allowed_check_due_days, 1),
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        };
        if (data.id) {
            database_1.db.prepare(`
                UPDATE credit_policies
                SET code = @code, name_ar = @name_ar, name_en = @name_en, name_he = @name_he,
                    currency_id = @currency_id, max_credit_limit = @max_credit_limit, max_checks_limit = @max_checks_limit,
                    personal_check_limit = @personal_check_limit, facilitation_days = @facilitation_days,
                    facilitation_from_month_end = @facilitation_from_month_end, allow_over_limit = @allow_over_limit,
                    overdue_check_days = @overdue_check_days, check_validation_type = @check_validation_type,
                    include_collection_checks = @include_collection_checks, include_open_sales_orders = @include_open_sales_orders,
                    allowed_check_due_days = @allowed_check_due_days,
                    override_max_credit_limit = @override_max_credit_limit,
                    override_max_checks_limit = @override_max_checks_limit,
                    override_personal_check_limit = @override_personal_check_limit,
                    override_facilitation_days = @override_facilitation_days,
                    override_facilitation_from_month_end = @override_facilitation_from_month_end,
                    override_allow_over_limit = @override_allow_over_limit,
                    override_overdue_check_days = @override_overdue_check_days,
                    override_check_validation_type = @override_check_validation_type,
                    override_include_collection_checks = @override_include_collection_checks,
                    override_include_open_sales_orders = @override_include_open_sales_orders,
                    override_allowed_check_due_days = @override_allowed_check_due_days,
                    is_active = @is_active
                WHERE id = @id
            `).run(payload);
        }
        else {
            database_1.db.prepare(`
                INSERT INTO credit_policies (
                    id, code, name_ar, name_en, name_he, currency_id,
                    max_credit_limit, max_checks_limit, personal_check_limit, facilitation_days,
                    facilitation_from_month_end, allow_over_limit, overdue_check_days, check_validation_type,
                    include_collection_checks, include_open_sales_orders, allowed_check_due_days,
                    override_max_credit_limit, override_max_checks_limit, override_personal_check_limit,
                    override_facilitation_days, override_facilitation_from_month_end, override_allow_over_limit,
                    override_overdue_check_days, override_check_validation_type,
                    override_include_collection_checks, override_include_open_sales_orders, override_allowed_check_due_days,
                    is_active
                ) VALUES (
                    @id, @code, @name_ar, @name_en, @name_he, @currency_id,
                    @max_credit_limit, @max_checks_limit, @personal_check_limit, @facilitation_days,
                    @facilitation_from_month_end, @allow_over_limit, @overdue_check_days, @check_validation_type,
                    @include_collection_checks, @include_open_sales_orders, @allowed_check_due_days,
                    @override_max_credit_limit, @override_max_checks_limit, @override_personal_check_limit,
                    @override_facilitation_days, @override_facilitation_from_month_end, @override_allow_over_limit,
                    @override_overdue_check_days, @override_check_validation_type,
                    @override_include_collection_checks, @override_include_open_sales_orders, @override_allowed_check_due_days,
                    @is_active
                )
            `).run({
                ...payload,
                id: (0, uuid_1.v4)()
            });
        }
        return { success: true };
    }
    static deleteCreditPolicy(id) {
        database_1.db.prepare('DELETE FROM credit_policies WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Groups (Existing logic) ---
    static getGroups() { return database_1.db.prepare('SELECT * FROM customer_groups ORDER BY name_ar').all(); }
    static saveGroup(data) {
        if (data.id) {
            database_1.db.prepare('UPDATE customer_groups SET name_ar=@name_ar, name_en=@name_en, is_active=@is_active WHERE id=@id').run({ ...data, is_active: data.is_active ? 1 : 0 });
        }
        else {
            database_1.db.prepare('INSERT INTO customer_groups (id, name_ar, name_en, is_active) VALUES (?, ?, ?, ?)').run((0, uuid_1.v4)(), data.name_ar, data.name_en, data.is_active ? 1 : 0);
        }
        return { success: true };
    }
    static deleteGroup(id) { database_1.db.prepare('DELETE FROM customer_groups WHERE id = ?').run(id); return { success: true }; }
    // --- Sales Reps (Existing logic) ---
    static getSalesReps() { return database_1.db.prepare('SELECT * FROM sales_reps ORDER BY name_ar').all(); }
    static saveSalesRep(data) {
        if (data.id) {
            database_1.db.prepare('UPDATE sales_reps SET name_ar=@name_ar, name_en=@name_en, phone=@phone, commission_rate=@commission_rate, target_amount=@target_amount, is_active=@is_active WHERE id=@id').run({
                ...data,
                name_en: data.name_en || null,
                phone: data.phone || null,
                commission_rate: data.commission_rate || 0,
                target_amount: data.target_amount || 0,
                is_active: data.is_active ? 1 : 0
            });
        }
        else {
            database_1.db.prepare('INSERT INTO sales_reps (id, name_ar, name_en, phone, commission_rate, target_amount, is_active) VALUES (@id, @name_ar, @name_en, @phone, @commission_rate, @target_amount, @is_active)').run({
                id: (0, uuid_1.v4)(),
                ...data,
                name_en: data.name_en || null,
                phone: data.phone || null,
                commission_rate: data.commission_rate || 0,
                target_amount: data.target_amount || 0,
                is_active: data.is_active ? 1 : 0
            });
        }
        return { success: true };
    }
    static deleteSalesRep(id) { database_1.db.prepare('DELETE FROM sales_reps WHERE id = ?').run(id); return { success: true }; }
    // --- Price Lists (Existing logic) ---
    static getPriceLists() {
        PartnerService.ensurePriceListSchema();
        return database_1.db.prepare(`
            SELECT
                pl.*,
                COALESCE(c.items_count, 0) AS items_count
            FROM price_lists pl
            LEFT JOIN (
                SELECT price_list_id, COUNT(DISTINCT item_id) AS items_count
                FROM (
                    SELECT price_list_id, item_id FROM price_list_items
                    UNION ALL
                    SELECT price_list_id, item_id FROM item_prices
                )
                GROUP BY price_list_id
            ) c ON c.price_list_id = pl.id
            ORDER BY pl.name_ar
        `).all();
    }
    static savePriceList(data) {
        PartnerService.ensurePriceListSchema();
        if (data.id) {
            database_1.db.prepare('UPDATE price_lists SET name_ar=@name_ar, name_en=@name_en, currency_id=@currency_id, is_active=@is_active WHERE id=@id').run({ ...data, is_active: data.is_active ? 1 : 0 });
        }
        else {
            database_1.db.prepare('INSERT INTO price_lists (id, name_ar, name_en, currency_id, is_active) VALUES (@id, @name_ar, @name_en, @currency_id, @is_active)').run({ id: (0, uuid_1.v4)(), ...data, is_active: data.is_active ? 1 : 0 });
        }
        return { success: true };
    }
    static deletePriceList(id) {
        PartnerService.ensurePriceListSchema();
        database_1.db.transaction(() => {
            database_1.db.prepare('DELETE FROM price_list_items WHERE price_list_id = ?').run(id);
            database_1.db.prepare('DELETE FROM item_prices WHERE price_list_id = ?').run(id);
            database_1.db.prepare('DELETE FROM price_lists WHERE id = ?').run(id);
        })();
        return { success: true };
    }
    static getPriceListItems(priceListId) {
        PartnerService.ensurePriceListSchema();
        return database_1.db.prepare(`
            SELECT rows.*, i.name_ar as item_name, u.name_ar as unit_name, i.code as item_code
            FROM (
                SELECT pli.id, pli.price_list_id, pli.item_id, pli.unit_id, pli.price, COALESCE(pli.min_quantity, 1) AS min_quantity
                FROM price_list_items pli
                WHERE pli.price_list_id = ?

                UNION ALL

                SELECT ip.id, ip.price_list_id, ip.item_id, ip.unit_id, ip.price, 1 AS min_quantity
                FROM item_prices ip
                WHERE ip.price_list_id = ?
                  AND NOT EXISTS (
                      SELECT 1
                      FROM price_list_items pli
                      WHERE pli.price_list_id = ip.price_list_id
                        AND pli.item_id = ip.item_id
                        AND pli.unit_id = ip.unit_id
                  )
            ) rows
            JOIN items i ON rows.item_id = i.id
            JOIN units u ON rows.unit_id = u.id
            ORDER BY i.code, rows.min_quantity
        `).all(priceListId, priceListId);
    }
    static savePriceListItem(data) {
        PartnerService.ensurePriceListSchema();
        database_1.db.transaction(() => {
            const oldRow = data.id
                ? database_1.db.prepare('SELECT * FROM price_list_items WHERE id = ?').get(data.id)
                : null;
            if (oldRow)
                PartnerService.removeMirroredItemPrice(oldRow);
            const payload = {
                ...data,
                id: data.id || (0, uuid_1.v4)(),
                min_quantity: PartnerService.toNumber(data.min_quantity, 1) || 1,
                price: PartnerService.toNumber(data.price, 0),
            };
            if (data.id && oldRow) {
                database_1.db.prepare(`
                    UPDATE price_list_items
                    SET item_id=@item_id, unit_id=@unit_id, price=@price, min_quantity=@min_quantity
                    WHERE id=@id
                `).run(payload);
            }
            else {
                database_1.db.prepare(`
                    INSERT INTO price_list_items (id, price_list_id, item_id, unit_id, price, min_quantity)
                    VALUES (@id, @price_list_id, @item_id, @unit_id, @price, @min_quantity)
                `).run(payload);
            }
            PartnerService.saveMirroredItemPrice(payload);
        })();
        return { success: true };
    }
    static deletePriceListItem(id) {
        PartnerService.ensurePriceListSchema();
        database_1.db.transaction(() => {
            const row = database_1.db.prepare('SELECT * FROM price_list_items WHERE id = ?').get(id);
            if (row)
                PartnerService.removeMirroredItemPrice(row);
            database_1.db.prepare('DELETE FROM price_list_items WHERE id = ?').run(id);
            database_1.db.prepare('DELETE FROM item_prices WHERE id = ?').run(id);
        })();
        return { success: true };
    }
}
exports.PartnerService = PartnerService;
PartnerService.DEFAULT_PRICE_LISTS = [
    { id: 'PL_PURCHASE', name_ar: 'سعر الشراء', name_en: 'Purchase Price', currency_id: 'ILS' },
    { id: 'PL_WHOLESALE', name_ar: 'سعر البيع جملة', name_en: 'Wholesale Sale Price', currency_id: 'ILS' },
    { id: 'PL_RETAIL', name_ar: 'سعر البيع مفرق', name_en: 'Retail Sale Price', currency_id: 'ILS' },
];
