import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export class CommissionService {

    // Get commissions for a period
    static getCommissions(month: number, year: number) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        return db.prepare(`
            SELECT c.*, 
                   e.first_name || ' ' || e.last_name as employee_name,
                   e.employee_code
            FROM hr_employee_commissions c
            JOIN hr_employees e ON c.employee_id = e.id
            WHERE c.period_start = ?
        `).all(startDate);
    }

    // Save commissions (Batch or Single)
    static saveCommissions(data: any[]) {
        const tx = db.transaction(() => {
            const insert = db.prepare(`
                INSERT INTO hr_employee_commissions (id, employee_id, period_start, period_end, total_sales, commission_rate, commission_amount, status)
                VALUES (@id, @employee_id, @period_start, @period_end, @total_sales, @commission_rate, @commission_amount, 'PENDING')
                ON CONFLICT(id) DO UPDATE SET
                    total_sales = excluded.total_sales,
                    commission_amount = excluded.commission_amount
            `);

            for (const item of data) {
                if (!item.id) item.id = uuidv4();
                insert.run(item);
            }
        });
        tx();
        return { success: true };
    }
}
