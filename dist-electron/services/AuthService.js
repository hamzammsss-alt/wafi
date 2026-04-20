"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class AuthService {
    static tableExists(tableName) {
        try {
            const row = database_1.db.prepare(`
                SELECT name FROM sqlite_master
                WHERE type = 'table' AND name = ?
                LIMIT 1
            `).get(tableName);
            return Boolean(row);
        }
        catch {
            return false;
        }
    }
    static syncUserRoleAssignment(userId, roleId, branchId, companyId = 'COMP_01') {
        if (!userId || !roleId)
            return;
        if (!AuthService.tableExists('user_role_assignments'))
            return;
        const normalizedBranchId = String(branchId || '').trim() || null;
        const existing = database_1.db.prepare(`
            SELECT id
            FROM user_role_assignments
            WHERE company_id = @companyId
              AND user_id = @userId
              AND COALESCE(branch_id, '') = COALESCE(@branchId, '')
              AND role_id = @roleId
            LIMIT 1
        `).get({
            companyId,
            userId,
            branchId: normalizedBranchId,
            roleId,
        });
        if (existing?.id) {
            database_1.db.prepare(`
                UPDATE user_role_assignments
                SET is_active = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(existing.id);
            return;
        }
        database_1.db.prepare(`
            INSERT INTO user_role_assignments (
                id, company_id, branch_id, user_id, role_id, scope_level, is_active, created_at, updated_at
            ) VALUES (
                @id, @companyId, @branchId, @userId, @roleId, @scopeLevel, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        `).run({
            id: (0, uuid_1.v4)(),
            companyId,
            branchId: normalizedBranchId,
            userId,
            roleId,
            scopeLevel: normalizedBranchId ? 'BRANCH' : 'COMPANY',
        });
    }
    // --- Authentication ---
    static login(username, password) {
        const user = database_1.db.prepare(`
      SELECT u.*, r.name as role_name, b.name_ar as branch_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.username = ?
    `).get(username);
        if (!user) {
            throw new Error('User not found');
        }
        // In a real app, use bcrypt.compareSync(password, user.password_hash)
        if (user.password_hash !== password) {
            throw new Error('Invalid password');
        }
        if (!user.is_active) {
            throw new Error('User account is inactive');
        }
        // Log the login action
        // AuthService.logAudit(user.id, 'LOGIN', 'users', user.id, 'Login Success');
        // Return user info sans password
        const { password_hash, ...userInfo } = user;
        return userInfo;
    }
    static changePassword(userId, oldPass, newPass) {
        const user = database_1.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
        if (user.password_hash !== oldPass) {
            throw new Error('Old password is incorrect');
        }
        database_1.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPass, userId);
        return { success: true };
    }
    // --- User Management ---
    static getUsers() {
        return database_1.db.prepare(`
      SELECT u.id, u.username, u.full_name, u.role_id, u.branch_id, u.is_active, r.name as role_name, b.name_ar as branch_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.username
    `).all();
    }
    static createUser(user) {
        const id = (0, uuid_1.v4)();
        database_1.db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, role_id, branch_id, is_active)
      VALUES (@id, @username, @password, @full_name, @role_id, @branch_id, @is_active)
    `).run({
            id,
            username: user.username,
            password: user.password,
            full_name: user.full_name,
            role_id: user.role_id,
            branch_id: user.branch_id,
            is_active: user.is_active ? 1 : 0
        });
        AuthService.syncUserRoleAssignment(id, String(user.role_id || ''), String(user.branch_id || ''), 'COMP_01');
        return { success: true, id };
    }
    static updateUser(user) {
        // Only update password if provided
        if (user.password) {
            database_1.db.prepare(`
            UPDATE users SET username=@username, password_hash=@password, full_name=@full_name, role_id=@role_id, branch_id=@branch_id, is_active=@is_active
            WHERE id=@id
        `).run({ ...user, is_active: user.is_active ? 1 : 0 });
        }
        else {
            database_1.db.prepare(`
            UPDATE users SET username=@username, full_name=@full_name, role_id=@role_id, branch_id=@branch_id, is_active=@is_active
            WHERE id=@id
        `).run({ ...user, is_active: user.is_active ? 1 : 0 });
        }
        AuthService.syncUserRoleAssignment(String(user.id || ''), String(user.role_id || ''), String(user.branch_id || ''), 'COMP_01');
        return { success: true };
    }
    static deleteUser(id) {
        // Prevent deleting the last admin or self (logic should be in UI or here)
        const count = database_1.db.prepare('SELECT count(*) as count FROM users').get().count;
        if (count <= 1)
            throw new Error('Cannot delete the last user');
        database_1.db.prepare('DELETE FROM users WHERE id = ?').run(id);
        if (AuthService.tableExists('user_role_assignments')) {
            database_1.db.prepare('DELETE FROM user_role_assignments WHERE user_id = ?').run(id);
        }
        return { success: true };
    }
    // --- Roles & Branches Helpers ---
    static getRoles() {
        return database_1.db.prepare('SELECT * FROM roles ORDER BY name').all();
    }
    static getBranches() {
        return database_1.db.prepare('SELECT * FROM branches ORDER BY name_ar').all();
    }
    static createBranch(branch) {
        const id = (0, uuid_1.v4)();
        // Updated to use name_ar
        database_1.db.prepare('INSERT INTO branches (id, name_ar, address, phone, is_main, type) VALUES (@id, @name_ar, @address, @phone, @is_main, @type)').run({
            id,
            name_ar: branch.name, // Mapping UI 'name' to DB 'name_ar'
            address: branch.address,
            phone: branch.phone,
            is_main: branch.is_main ? 1 : 0,
            type: branch.is_main ? 'MAIN' : 'BRANCH'
        });
        return { success: true, id };
    }
    static updateBranch(branch) {
        database_1.db.prepare('UPDATE branches SET name_ar = @name_ar, address = @address, phone = @phone, is_main = @is_main WHERE id = @id').run({
            ...branch,
            name_ar: branch.name, // Mapping UI 'name' to DB 'name_ar'
            is_main: branch.is_main ? 1 : 0
        });
        return { success: true };
    }
    static deleteBranch(id) {
        const count = database_1.db.prepare('SELECT count(*) as count FROM users WHERE branch_id = ?').get(id).count;
        if (count > 0)
            throw new Error('Cannot delete branch: Users are assigned to this branch.');
        database_1.db.prepare('DELETE FROM branches WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Role Management (New) ---
    static createRole(role) {
        const id = (0, uuid_1.v4)();
        database_1.db.prepare('INSERT INTO roles (id, name, description) VALUES (@id, @name, @description)').run({
            id,
            name: role.name,
            description: role.description
        });
        return { success: true, id };
    }
    static updateRole(role) {
        database_1.db.prepare('UPDATE roles SET name = @name, description = @description WHERE id = @id').run(role);
        return { success: true };
    }
    static deleteRole(id) {
        // Validation: Don't delete if users are assigned
        const count = database_1.db.prepare('SELECT count(*) as count FROM users WHERE role_id = ?').get(id).count;
        if (count > 0)
            throw new Error('Cannot delete role: Users are currently assigned to this role.');
        database_1.db.prepare('DELETE FROM roles WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Permission Management (New) ---
    static getPermissions(roleId) {
        const rows = database_1.db.prepare('SELECT permission_key FROM permissions WHERE role_id = ?').all(roleId);
        return rows.map((r) => r.permission_key);
    }
    static getUserPermissions(userId) {
        // Find role_id for user
        const user = database_1.db.prepare('SELECT role_id FROM users WHERE id = ?').get(userId);
        if (!user || !user.role_id)
            return [];
        return AuthService.getPermissions(user.role_id);
    }
    static savePermissions(roleId, permissions) {
        const transaction = database_1.db.transaction(() => {
            // 1. Clear existing
            database_1.db.prepare('DELETE FROM permissions WHERE role_id = ?').run(roleId);
            if (AuthService.tableExists('role_permissions')) {
                database_1.db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
            }
            // 2. Insert new
            const insert = database_1.db.prepare('INSERT INTO permissions (id, role_id, permission_key) VALUES (@id, @role_id, @key)');
            const insertRolePermission = AuthService.tableExists('role_permissions')
                ? database_1.db.prepare(`
                    INSERT OR IGNORE INTO role_permissions (id, role_id, capability_key, effect, created_at)
                    VALUES (@id, @roleId, @capabilityKey, 'ALLOW', CURRENT_TIMESTAMP)
                `)
                : null;
            for (const key of permissions) {
                insert.run({
                    id: (0, uuid_1.v4)(),
                    role_id: roleId,
                    key: key
                });
                if (insertRolePermission) {
                    insertRolePermission.run({
                        id: (0, uuid_1.v4)(),
                        roleId,
                        capabilityKey: key,
                    });
                }
            }
        });
        transaction();
        return { success: true };
    }
}
exports.AuthService = AuthService;
