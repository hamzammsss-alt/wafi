"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class ProductionService {
    // Get daily logs (filtered by date)
    static getLogs(date) {
        return database_1.db.prepare(`
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
    static saveLog(data) {
        if (data.id) {
            database_1.db.prepare(`
                UPDATE hr_employee_production_log 
                SET employee_id = @employee_id, 
                    production_date = @production_date,
                    item_name = @item_name,
                    quantity = @quantity,
                    rate = @rate,
                    notes = @notes
                WHERE id = @id
            `).run(data);
        }
        else {
            const id = (0, uuid_1.v4)();
            database_1.db.prepare(`
                INSERT INTO hr_employee_production_log (id, employee_id, production_date, item_name, quantity, rate, notes)
                VALUES (@id, @employee_id, @production_date, @item_name, @quantity, @rate, @notes)
            `).run({ ...data, id });
        }
        return { success: true };
    }
    // Delete a log entry
    static deleteLog(id) {
        database_1.db.prepare('DELETE FROM hr_employee_production_log WHERE id = ?').run(id);
        return { success: true };
    }
}
exports.ProductionService = ProductionService;
