"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogisticsService = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../database");
class LogisticsService {
    static getDB() {
        if (!database_1.db) {
            throw new Error('Database is not initialized');
        }
        return database_1.db;
    }
    // --- Drivers ---
    static getDrivers() {
        const conn = this.getDB();
        return conn.prepare("SELECT * FROM drivers ORDER BY name").all();
    }
    static saveDriver(driver) {
        const conn = this.getDB();
        if (driver.id) {
            conn.prepare(`
                UPDATE drivers SET name = @name, license_no = @license_no, license_expiry = @license_expiry, phone = @phone, notes = @notes, is_active = @is_active
                WHERE id = @id
            `).run(driver);
            return conn.prepare("SELECT * FROM drivers WHERE id = ?").get(driver.id);
        }
        else {
            const id = (0, uuid_1.v4)();
            conn.prepare(`
                INSERT INTO drivers (id, name, license_no, license_expiry, phone, notes, is_active)
                VALUES (@id, @name, @license_no, @license_expiry, @phone, @notes, @is_active)
            `).run({ ...driver, id, is_active: driver.is_active ?? 1 });
            return conn.prepare("SELECT * FROM drivers WHERE id = ?").get(id);
        }
    }
    static deleteDriver(id) {
        const conn = this.getDB();
        conn.prepare("DELETE FROM drivers WHERE id = ?").run(id);
        return { success: true };
    }
    // --- Vehicles ---
    static getVehicles() {
        const conn = this.getDB();
        return conn.prepare(`
            SELECT v.*, d.name as driver_name 
            FROM vehicles v
            LEFT JOIN drivers d ON v.driver_id = d.id 
            ORDER BY v.plate_no
        `).all();
    }
    static saveVehicle(vehicle) {
        const conn = this.getDB();
        // Sanitize undefined numeric/optional fields
        const safeVehicle = {
            ...vehicle,
            vehicle_code: vehicle.vehicle_code || null,
            description: vehicle.description || null,
            driver_id: vehicle.driver_id || null,
            color: vehicle.color || null,
            insurance_expiry: vehicle.insurance_expiry || null,
            license_expiry: vehicle.license_expiry || null,
            notes: vehicle.notes || null,
            is_active: vehicle.is_active ?? 1
        };
        if (vehicle.id) {
            conn.prepare(`
                UPDATE vehicles SET 
                    plate_no = @plate_no, 
                    vehicle_code = @vehicle_code,
                    model = @model, 
                    brand = @brand, 
                    type = @type, 
                    description = @description,
                    driver_id = @driver_id,
                    color = @color,
                    insurance_expiry = @insurance_expiry,
                    license_expiry = @license_expiry,
                    notes = @notes, 
                    is_active = @is_active
                WHERE id = @id
            `).run(safeVehicle);
            return conn.prepare("SELECT * FROM vehicles WHERE id = ?").get(vehicle.id);
        }
        else {
            const id = (0, uuid_1.v4)();
            conn.prepare(`
                INSERT INTO vehicles (
                    id, plate_no, vehicle_code, model, brand, type, description, 
                    driver_id, color, insurance_expiry, license_expiry, notes, is_active
                )
                VALUES (
                    @id, @plate_no, @vehicle_code, @model, @brand, @type, @description,
                    @driver_id, @color, @insurance_expiry, @license_expiry, @notes, @is_active
                )
            `).run({ ...safeVehicle, id });
            return conn.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
        }
    }
    static deleteVehicle(id) {
        const conn = this.getDB();
        conn.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
        return { success: true };
    }
}
exports.LogisticsService = LogisticsService;
