import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { HRService } from './HRService';
import { AccountService } from './AccountService';
import { SystemService } from './SystemService';

export interface BusinessPartner {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH' | 'EMPLOYEE'; // Added EMPLOYEE
    phone?: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;
    tax_number?: string;
    linked_account_id?: string;
    credit_limit?: number;
    payment_term_days?: number;
    region_id?: string;
    group_id?: string;
    sales_rep_id?: string;
    website?: string;
    price_list_id?: string;
    is_active: number;
    // HR Specific Fields (Optional)
    job_title_id?: string;
    department_id?: string;
    basic_salary?: number;
}

export class PartnerService {

    static getPartners(type?: string): BusinessPartner[] {
        // 1. Fetch Business Partners (Customers/Suppliers)
        let bpQuery = `
            SELECT p.*, r.name_ar as region_name, g.name_ar as group_name, 'bp' as source
            FROM business_partners p 
            LEFT JOIN regions r ON p.region_id = r.id 
            LEFT JOIN customer_groups g ON p.group_id = g.id
        `;

        if (type && type !== 'EMPLOYEE') {
            bpQuery += ` WHERE p.type = '${type}' OR p.type = 'BOTH'`;
        }

        const partners = db.prepare(bpQuery).all();

        // 2. Fetch Employees (if requested or if no type specified)
        let employees: any[] = [];
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
            employees = db.prepare(empQuery).all();
        }

        // 3. Merge
        return [...partners, ...employees].sort((a, b) => a.name_ar.localeCompare(b.name_ar));
    }

    static getPartner(id: string): BusinessPartner | null {
        // Try Business Partner first
        const partner = db.prepare('SELECT * FROM business_partners WHERE id = ?').get(id) as BusinessPartner;
        if (partner) return partner;

        // Try Employee
        const emp = db.prepare('SELECT * FROM hr_employees WHERE id = ?').get(id);
        if (emp) {
            // Map to BusinessPartner interface
            const contract = db.prepare('SELECT * FROM hr_employee_contracts WHERE employee_id = ? AND is_active = 1').get(id);
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
            } as BusinessPartner;
        }
        return null;
    }

    // Unified Save Method (Routing)
    static savePartner(data: BusinessPartner) {
        if (data.type === 'EMPLOYEE') {
            // Route to HR Service
            const employeePayload = {
                personal: {
                    id: data.id,
                    employee_code: data.code,
                    first_name: data.name_ar.split(' ')[0], // Simple split for now
                    last_name: data.name_ar.split(' ').slice(1).join(' '),
                    mobile_phone: data.mobile,
                    email: data.email,
                    linked_account_id: data.linked_account_id,
                    status: data.is_active ? 'ACTIVE' : 'TERMINATED'
                },
                contract: {
                    job_title_id: data.job_title_id,
                    department_id: data.department_id,
                    basic_salary: data.basic_salary || 0
                }
            };
            return HRService.saveEmployee(employeePayload);
        } else {
            // Route to Business Partner Logic
            if (data.id) return this.updatePartner(data);
            return this.createPartner(data);
        }
    }

    static createPartner(data: Omit<BusinessPartner, 'id'>) {
        if (!data.name_ar) throw new Error("Name (AR) is required");

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
                    code = uuidv4().substring(0, 8).toUpperCase();
                } else {
                    // Fallback strategy: Timestamp + Random to ensure uniqueness
                    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    const timestamp = Date.now().toString(36).toUpperCase().substring(3); // Shortened timestamp
                    code = `P-${timestamp}${randomSuffix}`;
                }
            } else {
                code = code!.trim();
            }

            const id = uuidv4();

            // --- Auto GL Account Creation ---
            // If linked_account_id is provided, check if it is a TRANSACTIONAL account or a PARENT (Header).
            // If it is a PARENT, we use it as the base to create a new sub-account.
            // If it is TRANSACTIONAL, we just link it.
            let autoCreate = !data.linked_account_id;
            let explicitParentId = null;

            if (data.linked_account_id) {
                const linkedAcc = db.prepare('SELECT id, is_transactional FROM gl_chart_of_accounts WHERE id = ?').get(data.linked_account_id);
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
                    const settings = SystemService.getSettings();
                    let parentId = explicitParentId;
                    let systemType = 'CUSTOMER'; // Default


                    if (data.type === 'CUSTOMER' && settings['default_customer_parent']) {
                        parentId = settings['default_customer_parent'];
                        systemType = 'CUSTOMER';
                    } else if (data.type === 'SUPPLIER' && settings['default_supplier_parent']) {
                        parentId = settings['default_supplier_parent'];
                        systemType = 'SUPPLIER';
                    } else if (data.type === 'EMPLOYEE' && settings['default_employee_parent']) {
                        parentId = settings['default_employee_parent'];
                        systemType = 'EMPLOYEE';
                    } else if (data.type === 'BOTH' && settings['default_customer_parent']) {
                        // Default to customer parent for BOTH
                        parentId = settings['default_customer_parent'];
                        systemType = 'CUSTOMER';
                    }

                    if (parentId) {
                        // Generate Code
                        // Find max code under this parent
                        const siblings = db.prepare('SELECT account_code FROM gl_chart_of_accounts WHERE parent_id = ?').all(parentId);
                        let nextCode = '';

                        // Simple logic: If parent is 112, children are 1120001 etc?
                        // Or Just Max + 1.
                        // Let's assume numeric sort works or we do simple max.
                        // Safe approach: Get parent code first.
                        const parentAcc = db.prepare('SELECT account_code FROM gl_chart_of_accounts WHERE id = ?').get(parentId);
                        if (parentAcc) {
                            // Assuming standard structure PPPP-CCCC or PPPPCCCC
                            // Let's just try to parse integer
                            let maxSuffix = 0;
                            siblings.forEach((s: any) => {
                                // Try to remove parent prefix
                                if (s.account_code.startsWith(parentAcc.account_code)) {
                                    const suffix = s.account_code.slice(parentAcc.account_code.length);
                                    const val = parseInt(suffix);
                                    if (!isNaN(val) && val > maxSuffix) maxSuffix = val;
                                }
                            });

                            nextCode = parentAcc.account_code + (maxSuffix + 1).toString().padStart(4, '0');

                            // Create Account
                            const newAccountId = AccountService.createAccount({
                                account_code: nextCode,
                                name_ar: data.name_ar,
                                name_en: data.name_en || data.name_ar, // Fallback
                                parent_id: parentId,
                                account_type: 'ASSET', // Default? Or Liability? 
                                // Ideally we infer from parent. 
                                // Let's copy parent type or just standard.
                                // For now, let's assume parent type.
                                // Wait, createAccount defaults? No.
                                // Let's fetch parent type.

                                // We need to pass account_type.
                            });

                            // We need to UPDATE the createAccount logic slightly or just fetch parent type here.
                            const parentTypeInfo = db.prepare("SELECT account_type FROM gl_chart_of_accounts WHERE id = ?").get(parentId);

                            // But createAccount inside AccountService doesn't allow overriding ID? 
                            // Wait, AccountService.createAccount GENERATES the ID and returns it.

                            const createdId = AccountService.createAccount({
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
                            data.linked_account_id = createdId as string;
                        }
                    }
                } catch (err: any) {
                    console.error("[PartnerService] Auto-GL Creation Failed:", err);
                    // Do not fail the Partner Creation, just log error.
                }
            }

            try {
                const stmt = db.prepare(`
                    INSERT INTO business_partners (
                        id, code, name_ar, name_en, type, phone, mobile, email, address, city, tax_number,
                        linked_account_id, credit_limit, payment_term_days, is_active,
                        region_id, group_id, sales_rep_id, website
                    ) VALUES (
                        @id, @code, @name_ar, @name_en, @type, @phone, @mobile, @email, @address, @city, @tax_number,
                        @linked_account_id, @credit_limit, @payment_term_days, @is_active,
                        @region_id, @group_id, @sales_rep_id, @website
                    )
                `);

                stmt.run({
                    ...data,
                    id,
                    code,
                    is_active: data.is_active !== undefined ? data.is_active : 1,
                    linked_account_id: data.linked_account_id || null,
                    credit_limit: data.credit_limit || 0,
                    payment_term_days: data.payment_term_days || 0,
                    region_id: data.region_id || null,
                    group_id: data.group_id || null,
                    sales_rep_id: data.sales_rep_id || null,
                    website: data.website || null
                });

                return id; // Success!

            } catch (error: any) {
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

    static updatePartner(data: BusinessPartner) {
        // Uniqueness check for update (excluding self)
        if (data.code) {
            data.code = data.code.trim();
            const exists = db.prepare('SELECT 1 FROM business_partners WHERE code = ? AND id != ?').get(data.code, data.id);
            if (exists) throw new Error(`Product code '${data.code}' already exists`);
        }

        try {
            const stmt = db.prepare(`
                UPDATE business_partners 
                SET code = @code, name_ar = @name_ar, name_en = @name_en, type = @type,
                    phone = @phone, mobile = @mobile, email = @email, address = @address, city = @city, tax_number = @tax_number,
                    linked_account_id = @linked_account_id, credit_limit = @credit_limit, payment_term_days = @payment_term_days,
                    is_active = @is_active, region_id = @region_id, group_id = @group_id, sales_rep_id = @sales_rep_id, website = @website
                WHERE id = @id
            `);
            stmt.run({
                ...data,
                region_id: data.region_id || null,
                group_id: data.group_id || null,
                sales_rep_id: data.sales_rep_id || null,
                website: data.website || null
            });
            return { success: true };
        } catch (error: any) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error(`Partner code '${data.code}' already exists`);
            }
            throw error;
        }
    }

    static deletePartner(id: string) {
        // Check type first
        const isEmployee = db.prepare('SELECT id FROM hr_employees WHERE id = ?').get(id);
        if (isEmployee) {
            // For safety, we just allow deleting if no dependencies, 
            // but usually we terminate. For now, hard delete to match request.
            db.prepare('DELETE FROM hr_employees WHERE id = ?').run(id);
            return { success: true };
        }

        db.prepare('DELETE FROM business_partners WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Regions ---
    static getRegions() { return db.prepare('SELECT * FROM regions ORDER BY name_ar').all(); }

    static createRegion(data: any) {
        const id = uuidv4();
        db.prepare(`INSERT INTO regions (id, code, name_ar, name_en, parent_id, is_active) VALUES (@id, @code, @name_ar, @name_en, @parent_id, @is_active)`).run({
            id,
            code: data.code || null,
            name_ar: data.name_ar,
            name_en: data.name_en || null,
            parent_id: data.parent_id || null,
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        });
        return id;
    }

    static updateRegion(data: any) {
        db.prepare(`UPDATE regions SET code=@code, name_ar=@name_ar, name_en=@name_en, parent_id=@parent_id, is_active=@is_active WHERE id=@id`).run({
            ...data,
            code: data.code || null,
            name_en: data.name_en || null,
            parent_id: data.parent_id || null,
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        });
        return { success: true };
    }

    // Kept for backward compat if needed, but we should switch to explicit create/update
    static saveRegion(data: any) {
        if (data.id) return this.updateRegion(data);
        return this.createRegion(data);
    }

    static deleteRegion(id: string) { db.prepare('DELETE FROM regions WHERE id = ?').run(id); return { success: true }; }

    // --- Customer Types ---
    static getCustomerTypes() { return db.prepare('SELECT * FROM customer_types ORDER BY name_ar').all(); }

    static saveCustomerType(data: any) {
        // ID is INTEGER AUTOINCREMENT for legacy reasons, but we can treat as string/number
        if (data.id) {
            db.prepare(`UPDATE customer_types SET code=@code, name=@name, name_ar=@name_ar, name_en=@name_en, discount=@discount, description=@description, is_active=@is_active WHERE id=@id`).run({
                ...data,
                name: data.name_ar, // Legacy map
                name_en: data.name_en || null,
                discount: data.discount || 0,
                description: data.description || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        } else {
            db.prepare(`INSERT INTO customer_types (code, name, name_ar, name_en, discount, description, is_active) VALUES (@code, @name, @name_ar, @name_en, @discount, @description, @is_active)`).run({
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

    static deleteCustomerType(id: string | number) { db.prepare('DELETE FROM customer_types WHERE id = ?').run(id); return { success: true }; }

    // --- Vendor Types ---
    static getVendorTypes() { return db.prepare('SELECT * FROM vendor_types ORDER BY name_ar').all(); }

    static saveVendorType(data: any) {
        if (data.id) {
            db.prepare(`UPDATE vendor_types SET code=@code, name=@name, name_ar=@name_ar, name_en=@name_en, description=@description, is_active=@is_active WHERE id=@id`).run({
                ...data,
                name: data.name_ar, // Legacy map
                name_en: data.name_en || null,
                description: data.description || null,
                is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
            });
        } else {
            db.prepare(`INSERT INTO vendor_types (code, name, name_ar, name_en, description, is_active) VALUES (@code, @name, @name_ar, @name_en, @description, @is_active)`).run({
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

    static deleteVendorType(id: string | number) { db.prepare('DELETE FROM vendor_types WHERE id = ?').run(id); return { success: true }; }


    // --- Groups (Existing logic) ---
    static getGroups() { return db.prepare('SELECT * FROM customer_groups ORDER BY name_ar').all(); }
    static saveGroup(data: any) {
        if (data.id) {
            db.prepare('UPDATE customer_groups SET name_ar=@name_ar, name_en=@name_en, is_active=@is_active WHERE id=@id').run({ ...data, is_active: data.is_active ? 1 : 0 });
        } else {
            db.prepare('INSERT INTO customer_groups (id, name_ar, name_en, is_active) VALUES (?, ?, ?, ?)').run(uuidv4(), data.name_ar, data.name_en, data.is_active ? 1 : 0);
        }
        return { success: true };
    }
    static deleteGroup(id: string) { db.prepare('DELETE FROM customer_groups WHERE id = ?').run(id); return { success: true }; }

    // --- Sales Reps (Existing logic) ---
    static getSalesReps() { return db.prepare('SELECT * FROM sales_reps ORDER BY name_ar').all(); }
    static saveSalesRep(data: any) {
        if (data.id) {
            db.prepare('UPDATE sales_reps SET name_ar=@name_ar, name_en=@name_en, phone=@phone, commission_rate=@commission_rate, target_amount=@target_amount, is_active=@is_active WHERE id=@id').run({
                ...data,
                name_en: data.name_en || null,
                phone: data.phone || null,
                commission_rate: data.commission_rate || 0,
                target_amount: data.target_amount || 0,
                is_active: data.is_active ? 1 : 0
            });
        } else {
            db.prepare('INSERT INTO sales_reps (id, name_ar, name_en, phone, commission_rate, target_amount, is_active) VALUES (@id, @name_ar, @name_en, @phone, @commission_rate, @target_amount, @is_active)').run({
                id: uuidv4(),
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
    static deleteSalesRep(id: string) { db.prepare('DELETE FROM sales_reps WHERE id = ?').run(id); return { success: true }; }

    // --- Price Lists (Existing logic) ---
    static getPriceLists() { return db.prepare('SELECT * FROM price_lists ORDER BY name_ar').all(); }
    static savePriceList(data: any) {
        if (data.id) {
            db.prepare('UPDATE price_lists SET name_ar=@name_ar, name_en=@name_en, currency_id=@currency_id, is_active=@is_active WHERE id=@id').run({ ...data, is_active: data.is_active ? 1 : 0 });
        } else {
            db.prepare('INSERT INTO price_lists (id, name_ar, name_en, currency_id, is_active) VALUES (@id, @name_ar, @name_en, @currency_id, @is_active)').run({ id: uuidv4(), ...data, is_active: data.is_active ? 1 : 0 });
        }
        return { success: true };
    }
    static deletePriceList(id: string) { db.prepare('DELETE FROM price_lists WHERE id = ?').run(id); return { success: true }; }

    static getPriceListItems(priceListId: string) {
        return db.prepare(`
            SELECT pli.*, i.name_ar as item_name, u.name_ar as unit_name, i.code as item_code
            FROM price_list_items pli
            JOIN items i ON pli.item_id = i.id
            JOIN units u ON pli.unit_id = u.id
            WHERE pli.price_list_id = ?
        `).all(priceListId);
    }

    static savePriceListItem(data: any) {
        if (data.id) {
            db.prepare('UPDATE price_list_items SET item_id=@item_id, unit_id=@unit_id, price=@price, min_quantity=@min_quantity WHERE id=@id').run(data);
        } else {
            db.prepare('INSERT INTO price_list_items (id, price_list_id, item_id, unit_id, price, min_quantity) VALUES (@id, @price_list_id, @item_id, @unit_id, @price, @min_quantity)').run({ id: uuidv4(), ...data });
        }
        return { success: true };
    }

    static deletePriceListItem(id: string) { db.prepare('DELETE FROM price_list_items WHERE id = ?').run(id); return { success: true }; }
}
