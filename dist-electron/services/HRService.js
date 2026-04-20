"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HRService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class HRService {
    // =================================================================================================
    // 1. ORGANIZATION (Departments & Job Titles)
    // =================================================================================================
    static getDepartments() {
        return database_1.db.prepare(`
            SELECT d.*, m.first_name || ' ' || m.last_name as manager_name,
                   p.name as parent_name
            FROM hr_departments d
            LEFT JOIN hr_employees m ON d.manager_id = m.id
            LEFT JOIN hr_departments p ON d.parent_id = p.id
            ORDER BY d.name
        `).all();
    }
    static saveDepartment(data) {
        if (data.id) {
            database_1.db.prepare(`
                UPDATE hr_departments SET name = @name, parent_id = @parent_id, manager_id = @manager_id
                WHERE id = @id
            `).run(data);
            return { success: true };
        }
        else {
            const id = (0, uuid_1.v4)();
            database_1.db.prepare(`
                INSERT INTO hr_departments (id, name, parent_id, manager_id)
                VALUES (@id, @name, @parent_id, @manager_id)
            `).run({ ...data, id });
            return { success: true, id };
        }
    }
    static deleteDepartment(id) {
        database_1.db.prepare('DELETE FROM hr_departments WHERE id = ?').run(id);
        return { success: true };
    }
    static getJobTitles() {
        return database_1.db.prepare('SELECT * FROM hr_job_titles ORDER BY title').all();
    }
    static saveJobTitle(data) {
        if (data.id) {
            database_1.db.prepare('UPDATE hr_job_titles SET title = @title, description = @description WHERE id = @id').run({ ...data, description: data.description || null });
            return { success: true };
        }
        else {
            const id = (0, uuid_1.v4)();
            database_1.db.prepare('INSERT INTO hr_job_titles (id, title, description) VALUES (@id, @title, @description)').run({ ...data, id, description: data.description || null });
            return { success: true, id };
        }
    }
    static deleteJobTitle(id) {
        database_1.db.prepare('DELETE FROM hr_job_titles WHERE id = ?').run(id);
        return { success: true };
    }
    // =================================================================================================
    // 2. EMPLOYEE MANAGEMENT
    // =================================================================================================
    static getEmployees() {
        return database_1.db.prepare(`
            SELECT e.*, 
                   j.title as job_title_name,
                   d.name as department_name,
                   (e.first_name || ' ' || e.father_name || ' ' || e.grandfather_name || ' ' || e.last_name) as full_name
            FROM hr_employees e
            LEFT JOIN hr_employee_contracts c ON c.employee_id = e.id AND c.is_active = 1
            LEFT JOIN hr_job_titles j ON c.job_title_id = j.id
            LEFT JOIN hr_departments d ON c.department_id = d.id
            ORDER BY e.employee_code
        `).all();
    }
    static getEmployee(id) {
        const employee = database_1.db.prepare('SELECT * FROM hr_employees WHERE id = ?').get(id);
        if (!employee)
            return null;
        const contract = database_1.db.prepare('SELECT * FROM hr_employee_contracts WHERE employee_id = ? AND is_active = 1').get(id);
        const relatives = database_1.db.prepare('SELECT * FROM hr_employee_relatives WHERE employee_id = ?').all(id);
        return { ...employee, contract, relatives };
    }
    static saveEmployee(data) {
        const { personal, contract, relatives } = data; // Expecting nested object from UI
        // 1. Validate National ID Uniqueness
        if (personal && personal.national_id && personal.national_id.trim() !== '') {
            const existing = database_1.db.prepare('SELECT id FROM hr_employees WHERE national_id = ?').get(personal.national_id);
            if (existing) {
                // If it's a new employee (no id) OR editing a different employee
                if (!personal.id || (personal.id && existing.id !== personal.id)) {
                    throw new Error(`مشكلة: رقم الهوية ${personal.national_id} مسجل مسبقاً لموظف آخر.`);
                }
            }
        }
        // 2. Validate Employee Code Uniqueness
        if (personal && personal.employee_code) {
            const existing = database_1.db.prepare('SELECT id FROM hr_employees WHERE employee_code = ?').get(personal.employee_code);
            if (existing) {
                if (!personal.id || (personal.id && existing.id !== personal.id)) {
                    throw new Error(`مشكلة: الرقم الوظيفي ${personal.employee_code} مستخدم مسبقاً لموظف آخر.`);
                }
            }
        }
        const tx = database_1.db.transaction(() => {
            // 1. Save Personal Info
            let empId = personal.id;
            // Prepare personal data with null fallbacks for optional fields
            const personalData = {
                ...personal,
                father_name: personal.father_name || null,
                grandfather_name: personal.grandfather_name || null,
                national_id: personal.national_id || null,
                date_of_birth: personal.date_of_birth || null,
                mobile_phone: personal.mobile_phone || null,
                emergency_phone: personal.emergency_phone || null,
                email: personal.email || null,
                address_city: personal.address_city || null,
                address_street: personal.address_street || null,
                photo_url: personal.photo_url || null,
                status: personal.status || 'ACTIVE'
            };
            if (empId) {
                database_1.db.prepare(`
                    UPDATE hr_employees SET 
                        employee_code = @employee_code,
                        first_name = @first_name, father_name = @father_name, grandfather_name = @grandfather_name, last_name = @last_name,
                        national_id = @national_id, date_of_birth = @date_of_birth, gender = @gender, marital_status = @marital_status,
                        mobile_phone = @mobile_phone, emergency_phone = @emergency_phone, email = @email,
                        address_city = @address_city, address_street = @address_street, photo_url = @photo_url, status = @status,
                        linked_account_id = @linked_account_id
                    WHERE id = @id
                `).run({ ...personalData, linked_account_id: personal.linked_account_id || null });
            }
            else {
                empId = (0, uuid_1.v4)();
                database_1.db.prepare(`
                    INSERT INTO hr_employees (
                        id, employee_code, first_name, father_name, grandfather_name, last_name,
                        national_id, date_of_birth, gender, marital_status,
                        mobile_phone, emergency_phone, email,
                        address_city, address_street, photo_url, status, linked_account_id
                    ) VALUES (
                        @id, @employee_code, @first_name, @father_name, @grandfather_name, @last_name,
                        @national_id, @date_of_birth, @gender, @marital_status,
                        @mobile_phone, @emergency_phone, @email,
                        @address_city, @address_street, @photo_url, @status, @linked_account_id
                    )
                `).run({ ...personalData, id: empId, linked_account_id: personal.linked_account_id || null });
            }
            // 2. Save Contract (If provided)
            if (contract) {
                // Prepare contract data with null fallbacks for optional fields
                const contractData = {
                    ...contract,
                    // Required fields with defaults
                    contract_type: contract.contract_type || 'PERMANENT',
                    start_date: contract.start_date || new Date().toISOString().split('T')[0],
                    department_id: contract.department_id || null,
                    job_title_id: contract.job_title_id || null,
                    basic_salary: contract.basic_salary || 0,
                    currency: contract.currency || 'ILS',
                    payment_method: contract.payment_method || 'BANK_TRANSFER',
                    // Optional fields
                    end_date: contract.end_date || null,
                    manager_id: contract.manager_id || null,
                    bank_name: contract.bank_name || null,
                    bank_branch: contract.bank_branch || null,
                    bank_account_number: contract.bank_account_number || null,
                    transport_allowance: contract.transport_allowance || 0,
                    communication_allowance: contract.communication_allowance || 0,
                    cost_of_living_allowance: contract.cost_of_living_allowance || 0,
                    salary_type: contract.salary_type || 'FIXED',
                    commission_rate: contract.commission_rate || 0,
                    commission_target: contract.commission_target || 0,
                    piece_rate_default: contract.piece_rate_default || 0,
                    hourly_rate: contract.hourly_rate || 0
                };
                // Deactivate old active contracts if this is a new one? 
                // For simplicity, we assume one active contract. Update it or insert new.
                if (contract.id) {
                    database_1.db.prepare(`
                        UPDATE hr_employee_contracts SET
                            contract_type = @contract_type, start_date = @start_date, end_date = @end_date,
                            department_id = @department_id, job_title_id = @job_title_id, manager_id = @manager_id,
                            basic_salary = @basic_salary, currency = @currency, payment_method = @payment_method,
                            salary_type = @salary_type, commission_rate = @commission_rate, 
                            commission_target = @commission_target, piece_rate_default = @piece_rate_default,
                            hourly_rate = @hourly_rate,
                            bank_name = @bank_name, bank_branch = @bank_branch, bank_account_number = @bank_account_number,
                            transport_allowance = @transport_allowance, communication_allowance = @communication_allowance, 
                            cost_of_living_allowance = @cost_of_living_allowance
                        WHERE id = @id
                     `).run(contractData);
                }
                else {
                    database_1.db.prepare('UPDATE hr_employee_contracts SET is_active = 0 WHERE employee_id = ?').run(empId);
                    database_1.db.prepare(`
                        INSERT INTO hr_employee_contracts (
                            id, employee_id, contract_type, start_date, end_date,
                            department_id, job_title_id, manager_id,
                            basic_salary, currency, payment_method,
                            salary_type, commission_rate, commission_target, piece_rate_default, hourly_rate,
                            bank_name, bank_branch, bank_account_number,
                            transport_allowance, communication_allowance, cost_of_living_allowance,
                            is_active
                        ) VALUES (
                            @id, @employee_id, @contract_type, @start_date, @end_date,
                            @department_id, @job_title_id, @manager_id,
                            @basic_salary, @currency, @payment_method,
                            @salary_type, @commission_rate, @commission_target, @piece_rate_default, @hourly_rate,
                            @bank_name, @bank_branch, @bank_account_number,
                            @transport_allowance, @communication_allowance, @cost_of_living_allowance,
                            1
                        )
                    `).run({
                        ...contractData,
                        id: (0, uuid_1.v4)(),
                        employee_id: empId
                    });
                }
            }
            // 3. Save Relatives
            if (relatives && Array.isArray(relatives)) {
                // Naive approach: Delete all and recreate, or upsert. 
                // Let's use upsert logic if ID exists.
                for (const r of relatives) {
                    if (r.deleted) {
                        database_1.db.prepare('DELETE FROM hr_employee_relatives WHERE id = ?').run(r.id);
                        continue;
                    }
                    if (r.id) {
                        database_1.db.prepare(`
                            UPDATE hr_employee_relatives SET name = @name, relation = @relation, date_of_birth = @date_of_birth, national_id = @national_id, note = @note
                            WHERE id = @id
                        `).run({ ...r, note: r.phone });
                    }
                    else {
                        database_1.db.prepare(`
                            INSERT INTO hr_employee_relatives (id, employee_id, name, relation, date_of_birth, national_id, note)
                            VALUES (@id, @employee_id, @name, @relation, @date_of_birth, @national_id, @note)
                        `).run({ ...r, id: (0, uuid_1.v4)(), employee_id: empId, note: r.phone });
                    }
                }
            }
        });
        tx();
        return { success: true };
    }
    static getNextEmployeeCode() {
        // Fetch all codes to find max numeric value
        const employees = database_1.db.prepare('SELECT employee_code FROM hr_employees').all();
        let maxCode = 1000;
        employees.forEach((emp) => {
            // Robustly extract the numeric part (e.g., "1001" from "EMP-1001" or "1001")
            const match = emp.employee_code.match(/\d+/);
            if (match) {
                const code = parseInt(match[0], 10);
                if (code > maxCode) {
                    maxCode = code;
                }
            }
        });
        let nextValue = maxCode + 1;
        // Safety check to ensure the generated code is truly unique (in case of non-numeric collisions)
        const codeExists = (val) => database_1.db.prepare('SELECT id FROM hr_employees WHERE employee_code = ?').get(val);
        while (codeExists(String(nextValue))) {
            nextValue++;
        }
        return String(nextValue);
    }
    static async saveEmployeePhoto(buffer, originalName) {
        try {
            const { app } = require('electron'); // Dynamic import if needed or assume imported at top if this was a module. 
            // Better to use fs and path imported at top. Note: app is electron only.
            // If HRService is imported in main, 'app' is available. 
            // To be safe and clean, we will rely on passed paths or imports. 
            // In main.ts, we import { app } from 'electron'. But HRService is separate file.
            // We need 'path' and 'fs'.
            const path = require('path');
            const fs = require('fs');
            // We need userData path. Since we can't easily import 'app' here without potential issues if this runs in a context where app isn't fully ready (unlikely in main process service),
            // we will stick to standard electron import behavior implicitly or use a helper. 
            // 'electron' module is main-process capable.
            const { app: electronApp } = require('electron');
            const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            const uploadsDir = path.join(electronApp.getPath('userData'), 'uploads', 'employees');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const ext = path.extname(originalName);
            const fileName = `emp-${Date.now()}${ext}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, buf);
            // Return wafi:// URL
            return { success: true, path: `wafi://employees/${fileName}` };
        }
        catch (err) {
            console.error("Save Photo Failed:", err);
            throw new Error("فشل حفظ الصورة: " + err.message);
        }
    }
}
exports.HRService = HRService;
