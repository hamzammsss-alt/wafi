"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialDefinitionService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
class FinancialDefinitionService {
    // --- Taxes ---
    static getTaxes() {
        return database_1.db.prepare('SELECT * FROM taxes ORDER BY name_ar').all();
    }
    static saveTax(data) {
        if (!data.name_ar)
            throw new Error("Name (AR) is required");
        if (data.rate === undefined)
            throw new Error("Rate is required");
        if (data.id) {
            database_1.db.prepare(`
                UPDATE taxes 
                SET name_ar=@name_ar, name_en=@name_en, rate=@rate, account_id=@account_id, is_active=@is_active 
                WHERE id=@id
            `).run({ ...data, is_active: data.is_active ?? 1 });
        }
        else {
            database_1.db.prepare(`
                INSERT INTO taxes (id, name_ar, name_en, rate, account_id, is_active) 
                VALUES (@id, @name_ar, @name_en, @rate, @account_id, @is_active)
            `).run({ id: (0, uuid_1.v4)(), ...data, is_active: data.is_active ?? 1 });
        }
        return { success: true };
    }
    static deleteTax(id) {
        // Check usage before delete (future improvement)
        database_1.db.prepare('DELETE FROM taxes WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Analysis Codes (Tree) ---
    static getAnalysisCodes() {
        const codes = database_1.db.prepare('SELECT * FROM analysis_codes ORDER BY code').all();
        return this.buildTree(codes);
    }
    static getAnalysisCodesFlat() {
        return database_1.db.prepare('SELECT * FROM analysis_codes ORDER BY code').all();
    }
    static saveAnalysisCode(data) {
        if (!data.code || !data.name_ar)
            throw new Error("Code and Name (AR) are required");
        const params = {
            id: data.id || (0, uuid_1.v4)(),
            code: data.code,
            name_ar: data.name_ar,
            name_en: data.name_en || '',
            parent_id: data.parent_id || null,
            is_active: data.is_active ?? 1
        };
        if (data.id) {
            database_1.db.prepare(`
                UPDATE analysis_codes 
                SET code=@code, name_ar=@name_ar, name_en=@name_en, parent_id=@parent_id, is_active=@is_active 
                WHERE id=@id
            `).run(params);
        }
        else {
            database_1.db.prepare(`
                INSERT INTO analysis_codes (id, code, name_ar, name_en, parent_id, is_active) 
                VALUES (@id, @code, @name_ar, @name_en, @parent_id, @is_active)
            `).run(params);
        }
        return { success: true };
    }
    static deleteAnalysisCode(id) {
        // Check children
        const children = database_1.db.prepare('SELECT count(*) as count FROM analysis_codes WHERE parent_id = ?').get(id);
        if (children.count > 0)
            throw new Error("Cannot delete code with sub-codes");
        database_1.db.prepare('DELETE FROM analysis_codes WHERE id = ?').run(id);
        return { success: true };
    }
    static buildTree(items) {
        const map = new Map();
        const roots = [];
        items.forEach(item => {
            map.set(item.id, { ...item, children: [] });
        });
        items.forEach(item => {
            const node = map.get(item.id);
            if (item.parent_id) {
                const parent = map.get(item.parent_id);
                if (parent) {
                    parent.children?.push(node);
                }
                else {
                    roots.push(node); // Orphan or root
                }
            }
            else {
                roots.push(node);
            }
        });
        return roots;
    }
}
exports.FinancialDefinitionService = FinancialDefinitionService;
