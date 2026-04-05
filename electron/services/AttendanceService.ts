import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
// import xlsx from 'xlsx'; // Assuming we might add this later for Excel import. For now simulating.

export class AttendanceService {

    // =================================================================================================
    // 1. SHIFT MANAGEMENT
    // =================================================================================================

    static getShifts() {
        return db.prepare('SELECT * FROM hr_shifts ORDER BY is_default DESC, name').all();
    }

    static saveShift(data: any) {
        // Ensure weekend_days is stringified
        const shiftData = {
            ...data,
            weekend_days: JSON.stringify(data.weekend_days || [])
        };

        if (data.id) {
            db.prepare(`
                UPDATE hr_shifts SET 
                    name = @name, start_time = @start_time, end_time = @end_time,
                    weekend_days = @weekend_days, late_grace_minutes = @late_grace_minutes,
                    overtime_multiplier = @overtime_multiplier, is_default = @is_default
                WHERE id = @id
            `).run(shiftData);
            return { success: true };
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO hr_shifts (
                    id, name, start_time, end_time, weekend_days, 
                    late_grace_minutes, overtime_multiplier, is_default
                ) VALUES (
                    @id, @name, @start_time, @end_time, @weekend_days, 
                    @late_grace_minutes, @overtime_multiplier, @is_default
                )
            `).run({ ...shiftData, id });
            return { success: true, id };
        }
    }

    // =================================================================================================
    // 2. ATTENDANCE LOGS & DAILY PROCESSING
    // =================================================================================================

    static getDailyAttendance(date: string) { // YYYY-MM-DD
        return db.prepare(`
            SELECT d.*, 
                   e.first_name || ' ' || e.last_name as employee_name,
                   e.employee_code,
                   s.name as shift_name
            FROM hr_attendance_daily d
            JOIN hr_employees e ON d.employee_id = e.id
            LEFT JOIN hr_shifts s ON d.shift_id = s.id
            WHERE d.date = ?
            ORDER BY e.employee_code
        `).all(date);
    }

    static importAttendanceRaw(records: any[]) { // { employee_code, timestamp, source }
        const stmt = db.prepare(`
            INSERT INTO hr_attendance_raw (id, employee_code, timestamp, source)
            VALUES (@id, @employee_code, @timestamp, @source)
        `);

        const tx = db.transaction(() => {
            for (const r of records) {
                stmt.run({
                    id: uuidv4(),
                    employee_code: r.employee_code,
                    timestamp: r.timestamp,
                    source: r.source || 'IMPORT'
                });
            }
        });
        tx();
        return { success: true, count: records.length };
    }

    static processDayAttendance(date: string) { // The core logic
        // 1. Get all active employees
        const employees = db.prepare("SELECT * FROM hr_employees WHERE status = 'ACTIVE'").all();

        // 2. Get Default Shift (Fallback)
        const defaultShift = db.prepare("SELECT * FROM hr_shifts WHERE is_default = 1").get();
        if (!defaultShift) throw new Error("Please define a default shift first.");

        // 3. For each employee, look for Raw Logs on that date
        // Note: SQLite string comparison for date part of timestamp
        const tx = db.transaction(() => {
            const deleteOld = db.prepare("DELETE FROM hr_attendance_daily WHERE date = ?").run(date);

            const insertDaily = db.prepare(`
                INSERT INTO hr_attendance_daily (
                    id, employee_id, date, shift_id, check_in, check_out, 
                    status, late_minutes, overtime_hours, work_hours
                ) VALUES (
                    @id, @employee_id, @date, @shift_id, @check_in, @check_out, 
                    @status, @late_minutes, @overtime_hours, @work_hours
                )
            `);

            for (const emp of employees) {
                // Find Raw Logs
                const logs = db.prepare(`
                    SELECT * FROM hr_attendance_raw 
                    WHERE employee_code = ? 
                    AND date(timestamp) = ?
                    ORDER BY timestamp ASC
                `).all(emp.employee_code, date);

                let checkIn = null;
                let checkOut = null;
                let status = 'ABSENT';
                let lateMins = 0;
                let otHours = 0;
                let workHours = 0;
                let shift = defaultShift; // Could be overridden by Employee Contract later

                if (logs.length > 0) {
                    checkIn = logs[0].timestamp.split(' ')[1]; // Extract HH:MM:SS
                    checkOut = logs[logs.length - 1].timestamp.split(' ')[1];

                    if (logs.length === 1) checkOut = null; // Only one punch

                    status = (checkIn && checkOut) ? 'PRESENT' : 'INCOMPLETE';

                    // Parse Times
                    const shiftStart = new Date(`${date}T${shift.start_time}`);
                    const shiftEnd = new Date(`${date}T${shift.end_time}`);
                    const checkInTime = new Date(`${date}T${checkIn}`);
                    const checkOutTime = checkOut ? new Date(`${date}T${checkOut}`) : null;

                    // Late Calculation
                    const gracePeriod = shift.late_grace_minutes * 60000;
                    if (checkInTime.getTime() > (shiftStart.getTime() + gracePeriod)) {
                        lateMins = Math.floor((checkInTime.getTime() - shiftStart.getTime()) / 60000);
                        status = 'LATE';
                    }

                    // Work Hours & OT
                    if (checkOutTime) {
                        workHours = (checkOutTime.getTime() - checkInTime.getTime()) / 3600000; // Hours

                        if (checkOutTime.getTime() > shiftEnd.getTime()) {
                            otHours = (checkOutTime.getTime() - shiftEnd.getTime()) / 3600000;
                        }
                    }
                } else {
                    // Check if Weekend
                    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                    const weekends = JSON.parse(shift.weekend_days || '[]');
                    if (weekends.includes(dayName)) {
                        status = 'REST_DAY';
                    }
                    // Check Holidays (TODO)
                }

                insertDaily.run({
                    id: uuidv4(),
                    employee_id: emp.id,
                    date: date,
                    shift_id: shift.id,
                    check_in: checkIn,
                    check_out: checkOut,
                    status: status,
                    late_minutes: lateMins,
                    overtime_hours: otHours.toFixed(2),
                    work_hours: workHours.toFixed(2)
                });
            }
        });

        tx();
        return { success: true };
    }
}
