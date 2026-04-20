"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
// import xlsx from 'xlsx'; // Assuming we might add this later for Excel import. For now simulating.
class AttendanceService {
    // =================================================================================================
    // 1. SHIFT MANAGEMENT
    // =================================================================================================
    static getShifts() {
        return database_1.db.prepare('SELECT * FROM hr_shifts ORDER BY is_default DESC, name').all();
    }
    static saveShift(data) {
        // Ensure weekend_days is stringified
        const shiftData = {
            ...data,
            weekend_days: JSON.stringify(data.weekend_days || [])
        };
        if (data.id) {
            database_1.db.prepare(`
                UPDATE hr_shifts SET 
                    name = @name, start_time = @start_time, end_time = @end_time,
                    weekend_days = @weekend_days, late_grace_minutes = @late_grace_minutes,
                    overtime_multiplier = @overtime_multiplier, is_default = @is_default
                WHERE id = @id
            `).run(shiftData);
            return { success: true };
        }
        else {
            const id = (0, uuid_1.v4)();
            database_1.db.prepare(`
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
    static getDailyAttendance(date) {
        return database_1.db.prepare(`
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
    static importAttendanceRaw(records) {
        const stmt = database_1.db.prepare(`
            INSERT INTO hr_attendance_raw (id, employee_code, timestamp, source)
            VALUES (@id, @employee_code, @timestamp, @source)
        `);
        const tx = database_1.db.transaction(() => {
            for (const r of records) {
                stmt.run({
                    id: (0, uuid_1.v4)(),
                    employee_code: r.employee_code,
                    timestamp: r.timestamp,
                    source: r.source || 'IMPORT'
                });
            }
        });
        tx();
        return { success: true, count: records.length };
    }
    static processDayAttendance(date) {
        // 1. Get all active employees
        const employees = database_1.db.prepare("SELECT * FROM hr_employees WHERE status = 'ACTIVE'").all();
        const hasHolidayTable = !!database_1.db
            .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='hr_public_holidays'")
            .get();
        // 2. Get Default Shift (Fallback)
        const defaultShift = database_1.db.prepare("SELECT * FROM hr_shifts WHERE is_default = 1").get();
        if (!defaultShift)
            throw new Error("Please define a default shift first.");
        // 3. For each employee, look for Raw Logs on that date
        // Note: SQLite string comparison for date part of timestamp
        const tx = database_1.db.transaction(() => {
            const deleteOld = database_1.db.prepare("DELETE FROM hr_attendance_daily WHERE date = ?").run(date);
            const insertDaily = database_1.db.prepare(`
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
                const logs = database_1.db.prepare(`
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
                    if (logs.length === 1)
                        checkOut = null; // Only one punch
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
                }
                else {
                    let isHoliday = false;
                    if (hasHolidayTable) {
                        const holiday = database_1.db.prepare(`
                            SELECT id
                            FROM hr_public_holidays
                            WHERE
                                (COALESCE(is_recurring, 0) = 1 AND strftime('%m-%d', date) = strftime('%m-%d', ?))
                                OR
                                (COALESCE(is_recurring, 0) = 0 AND date = ?)
                            LIMIT 1
                        `).get(date, date);
                        isHoliday = !!holiday;
                    }
                    if (isHoliday) {
                        status = 'HOLIDAY';
                    }
                    else {
                        // Check if Weekend
                        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                        const weekends = JSON.parse(shift.weekend_days || '[]');
                        if (weekends.includes(dayName)) {
                            status = 'REST_DAY';
                        }
                    }
                }
                insertDaily.run({
                    id: (0, uuid_1.v4)(),
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
exports.AttendanceService = AttendanceService;
