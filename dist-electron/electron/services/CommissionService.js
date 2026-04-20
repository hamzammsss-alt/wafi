"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class CommissionService {
    // Get commissions for a period
    static getCommissions(month, year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        return database_1.db.prepare(`
            SELECT c.*, 
                   e.first_name || ' ' || e.last_name as employee_name,
                   e.employee_code
            FROM hr_employee_commissions c
            JOIN hr_employees e ON c.employee_id = e.id
            WHERE c.period_start = ?
        `).all(startDate);
    }
    // Save commissions (Batch or Single)
    static saveCommissions(data) {
        const tx = database_1.db.transaction(() => {
            const insert = database_1.db.prepare(`
                INSERT INTO hr_employee_commissions (id, employee_id, period_start, period_end, total_sales, commission_rate, commission_amount, status)
                VALUES (@id, @employee_id, @period_start, @period_end, @total_sales, @commission_rate, @commission_amount, 'PENDING')
                ON CONFLICT(id) DO UPDATE SET
                    total_sales = excluded.total_sales,
                    commission_amount = excluded.commission_amount
            `);
            for (const item of data) {
                if (!item.id)
                    item.id = (0, uuid_1.v4)();
                insert.run(item);
            }
        });
        tx();
        return { success: true };
    }
}
exports.CommissionService = CommissionService;
