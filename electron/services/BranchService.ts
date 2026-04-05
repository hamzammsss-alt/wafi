import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Branch {
    id: string;
    name_ar: string;
    name_en?: string;
    type: 'MAIN' | 'BRANCH' | 'WAREHOUSE';
    address?: string;
    phone?: string;
    is_active: number; // 0 or 1
    sync_status: number;
}

export class BranchService {

    static getBranches(): Branch[] {
        return db.prepare('SELECT * FROM branches ORDER BY name_ar').all() as Branch[];
    }

    static getBranch(id: string): Branch {
        return db.prepare('SELECT * FROM branches WHERE id = ?').get(id) as Branch;
    }

    static createBranch(data: Omit<Branch, 'id' | 'sync_status'>) {
        if (!data.name_ar) throw new Error("Branch Name (AR) is required");

        const id = uuidv4();
        const stmt = db.prepare(`
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

    static updateBranch(branch: Branch) {
        const stmt = db.prepare(`
        UPDATE branches
        SET name_ar = @name_ar, name_en = @name_en, type = @type, 
            address = @address, phone = @phone, is_active = @is_active
        WHERE id = @id
    `);
        stmt.run(branch);
        return { success: true };
    }

    static deleteBranch(id: string) {
        // Check constraints? Users?
        // For now check if it's MAIN
        const branch = this.getBranch(id);
        if (branch && branch.type === 'MAIN') {
            throw new Error("Cannot delete Main Branch");
        }

        db.prepare('DELETE FROM branches WHERE id = ?').run(id);
        return { success: true };
    }
}
