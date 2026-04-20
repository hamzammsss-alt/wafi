"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class BranchService {
    static getBranches() {
        return database_1.db.prepare('SELECT * FROM branches ORDER BY name_ar').all();
    }
    static getBranch(id) {
        return database_1.db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
    }
    static createBranch(data) {
        if (!data.name_ar)
            throw new Error("Branch Name (AR) is required");
        const id = (0, uuid_1.v4)();
        const stmt = database_1.db.prepare(`
        INSERT INTO branches (id, name_ar, name_en, type, address, phone, is_active, sync_status)
        VALUES (@id, @name_ar, @name_en, @type, @address, @phone, @is_active, 0)
    `);
        stmt.run({
            id,
            name_ar: data.name_ar,
            name_en: data.name_en || null,
            type: data.type || 'BRANCH',
            address: data.address || null,
            phone: data.phone || null,
            is_active: data.is_active !== undefined ? data.is_active : 1
        });
        return id;
    }
    static updateBranch(branch) {
        const stmt = database_1.db.prepare(`
        UPDATE branches
        SET name_ar = @name_ar, name_en = @name_en, type = @type, 
            address = @address, phone = @phone, is_active = @is_active
        WHERE id = @id
    `);
        stmt.run(branch);
        return { success: true };
    }
    static deleteBranch(id) {
        // Check constraints? Users?
        // For now check if it's MAIN
        const branch = this.getBranch(id);
        if (branch && branch.type === 'MAIN') {
            throw new Error("Cannot delete Main Branch");
        }
        database_1.db.prepare('DELETE FROM branches WHERE id = ?').run(id);
        return { success: true };
    }
}
exports.BranchService = BranchService;
