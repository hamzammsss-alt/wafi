import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export class ProductionService {

    // Get daily logs (filtered by date)
    static getLogs(date: string) {
        return db.prepare(`
            SELECT l.*, 
                   e.first_name || ' ' || e.last_name as employee_name,
                   e.employee_code
            FROM hr_employee_production_log l
            JOIN hr_employees e ON l.employee_id = e.id
            WHERE l.production_date = ?
            ORDER BY l.created_at DESC
        `).all(date);
    }

    // Save a log entry
    static saveLog(data: any) {
        if (data.id) {
            db.prepare(`
                UPDATE hr_employee_production_log 
                SET employee_id = @employee_id, 
                    production_date = @production_date,
                    item_name = @item_name,
                    quantity = @quantity,
                    rate = @rate,
                    notes = @notes
                WHERE id = @id
            `).run(data);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO hr_employee_production_log (id, employee_id, production_date, item_name, quantity, rate, notes)
                VALUES (@id, @employee_id, @production_date, @item_name, @quantity, @rate, @notes)
            `).run({ ...data, id });
        }
        return { success: true };
    }

    // Delete a log entry
    static deleteLog(id: string) {
        db.prepare('DELETE FROM hr_employee_production_log WHERE id = ?').run(id);
        return { success: true };
    }
}
