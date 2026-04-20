"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class LeaveService {
    // =================================================================================================
    // 1. LEAVE CONFIGURATION (TYPES & RULES)
    // =================================================================================================
    static getLeaveTypes() {
        return database_1.db.prepare('SELECT * FROM hr_leave_types ORDER BY name').all();
    }
    static saveLeaveType(data) {
        // Sanitize input to ensure all named parameters exist
        const sanitized = {
            id: data.id,
            name: data.name,
            description: data.description || '', // Default to empty string if missing
            days_per_year: data.days_per_year || 30,
            is_paid: data.is_paid !== undefined ? data.is_paid : 1, // Handle boolean/integer 0 correctly
            carry_forward: data.carry_forward !== undefined ? data.carry_forward : 0,
            require_attachment: data.require_attachment !== undefined ? data.require_attachment : 0
        };
        if (sanitized.id) {
            database_1.db.prepare(`
                UPDATE hr_leave_types SET 
                    name = @name, description = @description, 
                    days_per_year = @days_per_year, is_paid = @is_paid,
                    carry_forward = @carry_forward, require_attachment = @require_attachment
                WHERE id = @id
            `).run(sanitized);
            return { success: true };
        }
        else {
            const id = (0, uuid_1.v4)();
            database_1.db.prepare(`
                INSERT INTO hr_leave_types (
                    id, name, description, days_per_year, is_paid, 
                    carry_forward, require_attachment
                ) VALUES (
                    @id, @name, @description, @days_per_year, @is_paid, 
                    @carry_forward, @require_attachment
                )
            `).run({ ...sanitized, id });
            return { success: true, id };
        }
    }
    static deleteLeaveType(id) {
        database_1.db.prepare('DELETE FROM hr_leave_types WHERE id = ?').run(id);
        return { success: true };
    }
    // =================================================================================================
    // 2. LEAVE REQUESTS
    // =================================================================================================
    static getLeaveRequests(filter = {}) {
        let query = `
            SELECT r.*, 
                   e.first_name || ' ' || e.last_name as employee_name,
                   e.employee_code,
                   t.name as leave_type_name
            FROM hr_leave_requests r
            JOIN hr_employees e ON r.employee_id = e.id
            LEFT JOIN hr_leave_types t ON r.leave_type_id = t.id
            WHERE 1=1
        `;
        const params = [];
        if (filter.status) {
            query += ' AND r.status = ?';
            params.push(filter.status);
        }
        if (filter.employee_id) {
            query += ' AND r.employee_id = ?';
            params.push(filter.employee_id);
        }
        query += ' ORDER BY r.start_date DESC';
        return database_1.db.prepare(query).all(...params);
    }
    static saveLeaveRequest(data) {
        // Calculate days duration
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
        const record = { ...data, days_count: days, status: data.status || 'PENDING' };
        if (data.id) {
            database_1.db.prepare(`
                UPDATE hr_leave_requests SET 
                    leave_type_id = @leave_type_id, start_date = @start_date, end_date = @end_date,
                    reason = @reason, days_count = @days_count
                WHERE id = @id
            `).run(record);
            return { success: true };
        }
        else {
            const id = (0, uuid_1.v4)();
            database_1.db.prepare(`
                INSERT INTO hr_leave_requests (
                    id, employee_id, leave_type_id, start_date, end_date, 
                    days_count, reason, status, submission_date
                ) VALUES (
                    @id, @employee_id, @leave_type_id, @start_date, @end_date, 
                    @days_count, @reason, @status, CURRENT_DATE
                )
            `).run({ ...record, id });
            return { success: true, id };
        }
    }
    static updateRequestStatus(id, status, rejection_reason = '') {
        database_1.db.prepare('UPDATE hr_leave_requests SET status = ?, rejection_reason = ? WHERE id = ?').run(status, rejection_reason, id);
        return { success: true };
    }
    // =================================================================================================
    // 3. BALANCES
    // =================================================================================================
    static getEmployeeBalances(employeeId, year) {
        // 1. Get all configured Leave Types
        const types = database_1.db.prepare('SELECT * FROM hr_leave_types').all();
        // 2. Get used balances for this year (Approved requests)
        const used = database_1.db.prepare(`
            SELECT leave_type_id, SUM(days_count) as used_days
            FROM hr_leave_requests
            WHERE employee_id = ? AND status = 'APPROVED'
            AND strftime('%Y', start_date) = ?
            GROUP BY leave_type_id
        `).all(employeeId, String(year));
        const resultMap = new Map();
        types.forEach((t) => resultMap.set(t.id, {
            type_id: t.id,
            type_name: t.name,
            total_allowed: t.days_per_year,
            used: 0,
            remaining: t.days_per_year
        }));
        used.forEach((u) => {
            const item = resultMap.get(u.leave_type_id);
            if (item) {
                item.used = u.used_days;
                item.remaining = item.total_allowed - u.used_days;
            }
        });
        return Array.from(resultMap.values());
    }
}
exports.LeaveService = LeaveService;
