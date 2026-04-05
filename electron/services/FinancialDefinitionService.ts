import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { Tax, AnalysisCode } from '../../types';

export class FinancialDefinitionService {

    // --- Taxes ---

    static getTaxes(): Tax[] {
        return db.prepare('SELECT * FROM taxes ORDER BY name_ar').all() as Tax[];
    }

    static saveTax(data: Partial<Tax>) {
        if (!data.name_ar) throw new Error("Name (AR) is required");
        if (data.rate === undefined) throw new Error("Rate is required");

        if (data.id) {
            db.prepare(`
                UPDATE taxes 
                SET name_ar=@name_ar, name_en=@name_en, rate=@rate, account_id=@account_id, is_active=@is_active 
                WHERE id=@id
            `).run({ ...data, is_active: data.is_active ?? 1 });
        } else {
            db.prepare(`
                INSERT INTO taxes (id, name_ar, name_en, rate, account_id, is_active) 
                VALUES (@id, @name_ar, @name_en, @rate, @account_id, @is_active)
            `).run({ id: uuidv4(), ...data, is_active: data.is_active ?? 1 });
        }
        return { success: true };
    }

    static deleteTax(id: string) {
        // Check usage before delete (future improvement)
        db.prepare('DELETE FROM taxes WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Analysis Codes (Tree) ---

    static getAnalysisCodes(): AnalysisCode[] {
        const codes = db.prepare('SELECT * FROM analysis_codes ORDER BY code').all() as AnalysisCode[];
        return this.buildTree(codes);
    }

    static getAnalysisCodesFlat(): AnalysisCode[] {
        return db.prepare('SELECT * FROM analysis_codes ORDER BY code').all() as AnalysisCode[];
    }

    static saveAnalysisCode(data: Partial<AnalysisCode>) {
        if (!data.code || !data.name_ar) throw new Error("Code and Name (AR) are required");

        const params = {
            id: data.id || uuidv4(),
            code: data.code,
            name_ar: data.name_ar,
            name_en: data.name_en || '',
            parent_id: data.parent_id || null,
            is_active: data.is_active ?? 1
        };

        if (data.id) {
            db.prepare(`
                UPDATE analysis_codes 
                SET code=@code, name_ar=@name_ar, name_en=@name_en, parent_id=@parent_id, is_active=@is_active 
                WHERE id=@id
            `).run(params);
        } else {
            db.prepare(`
                INSERT INTO analysis_codes (id, code, name_ar, name_en, parent_id, is_active) 
                VALUES (@id, @code, @name_ar, @name_en, @parent_id, @is_active)
            `).run(params);
        }
        return { success: true };
    }

    static deleteAnalysisCode(id: string) {
        // Check children
        const children = db.prepare('SELECT count(*) as count FROM analysis_codes WHERE parent_id = ?').get(id) as any;
        if (children.count > 0) throw new Error("Cannot delete code with sub-codes");

        db.prepare('DELETE FROM analysis_codes WHERE id = ?').run(id);
        return { success: true };
    }

    private static buildTree(items: AnalysisCode[]): AnalysisCode[] {
        const map = new Map<string, AnalysisCode>();
        const roots: AnalysisCode[] = [];

        items.forEach(item => {
            map.set(item.id, { ...item, children: [] });
        });

        items.forEach(item => {
            const node = map.get(item.id)!;
            if (item.parent_id) {
                const parent = map.get(item.parent_id);
                if (parent) {
                    parent.children?.push(node);
                } else {
                    roots.push(node); // Orphan or root
                }
            } else {
                roots.push(node);
            }
        });

        return roots;
    }
}
