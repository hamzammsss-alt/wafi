
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
const db = new Database(dbPath);

export class LogisticsService {
    // --- Drivers ---
    static getDrivers() {
        return db.prepare("SELECT * FROM drivers ORDER BY name").all();
    }

    static saveDriver(driver: any) {
        if (driver.id) {
            db.prepare(`
                UPDATE drivers SET name = @name, license_no = @license_no, license_expiry = @license_expiry, phone = @phone, notes = @notes, is_active = @is_active
                WHERE id = @id
            `).run(driver);
            return db.prepare("SELECT * FROM drivers WHERE id = ?").get(driver.id);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO drivers (id, name, license_no, license_expiry, phone, notes, is_active)
                VALUES (@id, @name, @license_no, @license_expiry, @phone, @notes, @is_active)
            `).run({ ...driver, id, is_active: driver.is_active ?? 1 });
            return db.prepare("SELECT * FROM drivers WHERE id = ?").get(id);
        }
    }

    static deleteDriver(id: string) {
        db.prepare("DELETE FROM drivers WHERE id = ?").run(id);
        return { success: true };
    }

    // --- Vehicles ---
    static getVehicles() {
        return db.prepare(`
            SELECT v.*, d.name as driver_name 
            FROM vehicles v
            LEFT JOIN drivers d ON v.driver_id = d.id 
            ORDER BY v.plate_no
        `).all();
    }

    static saveVehicle(vehicle: any) {
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
            db.prepare(`
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
            return db.prepare("SELECT * FROM vehicles WHERE id = ?").get(vehicle.id);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO vehicles (
                    id, plate_no, vehicle_code, model, brand, type, description, 
                    driver_id, color, insurance_expiry, license_expiry, notes, is_active
                )
                VALUES (
                    @id, @plate_no, @vehicle_code, @model, @brand, @type, @description,
                    @driver_id, @color, @insurance_expiry, @license_expiry, @notes, @is_active
                )
            `).run({ ...safeVehicle, id });
            return db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
        }
    }

    static deleteVehicle(id: string) {
        db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
        return { success: true };
    }
}
