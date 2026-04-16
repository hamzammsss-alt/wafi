import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

import { Item } from '../../types';

// Extend Item interface for local usage if needed, or just use the imported one
export interface ExtendedItem extends Item {
    brand_name?: string;
    current_stock?: number;
    uom_conversions?: any[];
    images?: any[];
    attributes?: any[];
}

export class ItemService {

    private static searchItemProfilesInternal(search: string, limit = 50, onlyActive = true) {
        const s = String(search || '').trim();
        const q = `%${s}%`;

        try {
            return db.prepare(`
                SELECT
                    i.id,
                    i.code,
                    i.barcode,
                    COALESCE(i.name_ar, i.name_en, i.name, i.code, '') AS name,
                    i.name_ar,
                    i.name_en,
                    i.type,
                    i.base_unit_id,
                    COALESCE(u.name_ar, u.name_en, u.code, '') AS base_unit_name,
                    COALESCE(i.costing_method, 'WEIGHTED_AVG') AS costing_method,
                    CAST(COALESCE(i.standard_cost, i.cost_price, 0) AS REAL) AS standard_cost,
                    CAST(COALESCE(i.cost_price, 0) AS REAL) AS cost_price,
                    CAST(COALESCE(i.sale_price, 0) AS REAL) AS sale_price,
                    CAST(COALESCE(i.sale_price, 0) AS REAL) AS price,
                    COALESCE(i.tax_included, 0) AS tax_included,
                    COALESCE(i.tax_rate, 0) AS tax_rate,
                    i.inventory_account_id,
                    i.sales_account_id,
                    i.cogs_account_id,
                    COALESCE(ai.name_ar, ai.name, gai.name_ar, gai.name_en, '') AS inventory_account_name,
                    COALESCE(asl.name_ar, asl.name, gas.name_ar, gas.name_en, '') AS sales_account_name,
                    COALESCE(acg.name_ar, acg.name, gac.name_ar, gac.name_en, '') AS cogs_account_name
                FROM items i
                LEFT JOIN units u ON u.id = i.base_unit_id
                LEFT JOIN accounts ai ON ai.id = i.inventory_account_id
                LEFT JOIN accounts asl ON asl.id = i.sales_account_id
                LEFT JOIN accounts acg ON acg.id = i.cogs_account_id
                LEFT JOIN gl_chart_of_accounts gai ON gai.id = i.inventory_account_id
                LEFT JOIN gl_chart_of_accounts gas ON gas.id = i.sales_account_id
                LEFT JOIN gl_chart_of_accounts gac ON gac.id = i.cogs_account_id
                WHERE (${onlyActive ? 'COALESCE(i.is_active, 1) = 1 AND' : ''} (
                    COALESCE(i.name_ar, '') LIKE ? OR
                    COALESCE(i.name_en, '') LIKE ? OR
                    COALESCE(i.name, '') LIKE ? OR
                    COALESCE(i.code, '') LIKE ? OR
                    COALESCE(i.barcode, '') LIKE ?
                ))
                ORDER BY COALESCE(i.name_ar, i.name_en, i.name, i.code)
                LIMIT ?
            `).all(q, q, q, q, q, limit) as any[];
        } catch (_error) {
            // Fallback for partial schemas.
            return db.prepare(`
                SELECT
                    id,
                    code,
                    barcode,
                    COALESCE(name_ar, name_en, name, code, '') AS name,
                    name_ar,
                    name_en,
                    type,
                    base_unit_id,
                    COALESCE(costing_method, 'WEIGHTED_AVG') AS costing_method,
                    CAST(COALESCE(standard_cost, cost_price, 0) AS REAL) AS standard_cost,
                    CAST(COALESCE(cost_price, 0) AS REAL) AS cost_price,
                    CAST(COALESCE(sale_price, 0) AS REAL) AS sale_price,
                    CAST(COALESCE(sale_price, 0) AS REAL) AS price,
                    COALESCE(tax_included, 0) AS tax_included,
                    COALESCE(tax_rate, 0) AS tax_rate,
                    inventory_account_id,
                    sales_account_id,
                    cogs_account_id,
                    '' AS base_unit_name,
                    '' AS inventory_account_name,
                    '' AS sales_account_name,
                    '' AS cogs_account_name
                FROM items
                WHERE (${onlyActive ? 'COALESCE(is_active, 1) = 1 AND' : ''} (
                    COALESCE(name_ar, '') LIKE ? OR
                    COALESCE(name_en, '') LIKE ? OR
                    COALESCE(name, '') LIKE ? OR
                    COALESCE(code, '') LIKE ? OR
                    COALESCE(barcode, '') LIKE ?
                ))
                ORDER BY COALESCE(name_ar, name_en, name, code)
                LIMIT ?
            `).all(q, q, q, q, q, limit) as any[];
        }
    }

    static searchItemProfiles(search: string, limit = 50) {
        return ItemService.searchItemProfilesInternal(search, limit, true);
    }

    // --- Items ---

    static getItems(): ExtendedItem[] {
        const items = db.prepare(`
            SELECT i.*, 
                   COALESCE(SUM(sb.quantity), 0) as current_stock,
                   b.name_ar as brand_name
            FROM items i
            LEFT JOIN stock_balances sb ON i.id = sb.item_id
            LEFT JOIN brands b ON i.brand_id = b.id
            GROUP BY i.id
            ORDER BY i.name_ar
        `).all() as ExtendedItem[];

        // Fetch conversions for all items (optimized)
        // For now, let's fetch conversions on demand or fetch all and map?
        // Fetching all might be heavy if many items. 
        // Let's attach conversions only when getting single item, 
        // OR just fetch them. Ideally UI needs proper "Item Detail" fetch.
        // For list view, we don't need conversions.
        return items;
    }

    static getItem(id: string): ExtendedItem {
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as ExtendedItem;
        if (item) {
            item.uom_conversions = db.prepare('SELECT * FROM item_uom_conversions WHERE item_id = ?').all(id) as any[];
            item.images = db.prepare('SELECT * FROM item_images WHERE item_id = ?').all(id) as any[];

            // Fetch Attributes
            const attrs = db.prepare(`
                SELECT a.id as attribute_id, a.name_ar as attribute_name, v.id as value_id, v.value
                FROM item_has_attributes iha
                JOIN item_attribute_values v ON iha.attribute_value_id = v.id
                JOIN item_attributes a ON v.attribute_id = a.id
                WHERE iha.item_id = ?
            `).all(id) as any[];
            item.attributes = attrs;
        }
        return item;
    }

    static saveItem(data: Partial<ExtendedItem>) {
        if (!data.code || !data.name_ar) throw new Error("Code and Name (AR) are required");
        if (!data.base_unit_id) throw new Error("Base Unit is required");

        const update = db.transaction(() => {
            let id = data.id;

            if (id) {
                // Update
                db.prepare(`
                    UPDATE items 
                    SET code=@code, barcode=@barcode, name_ar=@name_ar, name_en=@name_en, category_id=@category_id, type=@type, brand_id=@brand_id,
                        base_unit_id=@base_unit_id, sale_unit_id=@sale_unit_id, purchase_unit_id=@purchase_unit_id, conversion_factor=@conversion_factor,
                        sales_account_id=@sales_account_id, cogs_account_id=@cogs_account_id, inventory_account_id=@inventory_account_id,
                        min_stock_level=@min_stock_level, reorder_point=@reorder_point, cost_price=@cost_price, sale_price=@sale_price, wholesale_price=@wholesale_price,
                        tax_id=@tax_id, is_active=@is_active, min_price=@min_price, tax_included=@tax_included
                    WHERE id=@id
                `).run({
                    ...data,
                    is_active: data.is_active ?? 1,
                    brand_id: data.brand_id || null, // Ensure brand_id is handled
                    min_price: (data as any).min_price || 0,
                    tax_included: (data as any).tax_included || 0,
                    type: data.type || 'STOCK'
                });

            } else {
                // Insert
                id = uuidv4();
                db.prepare(`
                    INSERT INTO items (
                        id, code, barcode, name_ar, name_en, category_id, type, brand_id,
                        base_unit_id, sale_unit_id, purchase_unit_id, conversion_factor,
                        sales_account_id, cogs_account_id, inventory_account_id,
                        min_stock_level, reorder_point, cost_price, sale_price, wholesale_price,
                        tax_id, is_active, min_price, tax_included
                    ) VALUES (
                        @id, @code, @barcode, @name_ar, @name_en, @category_id, @type, @brand_id,
                        @base_unit_id, @sale_unit_id, @purchase_unit_id, @conversion_factor,
                        @sales_account_id, @cogs_account_id, @inventory_account_id,
                        @min_stock_level, @reorder_point, @cost_price, @sale_price, @wholesale_price,
                        @tax_id, @is_active, @min_price, @tax_included
                    )
                `).run({
                    id,
                    ...data,
                    is_active: data.is_active ?? 1,
                    brand_id: data.brand_id || null,
                    min_price: (data as any).min_price || 0,
                    tax_included: (data as any).tax_included || 0,
                    type: data.type || 'STOCK'
                });
            }

            // Insert Conversions
            if (data.uom_conversions && Array.isArray(data.uom_conversions)) {
                const stmt = db.prepare(`
                    INSERT INTO item_uom_conversions (id, item_id, from_unit_id, to_unit_id, factor, barcode, sale_price)
                    VALUES (@id, @item_id, @from_unit_id, @to_unit_id, @factor, @barcode, @sale_price)
                `);

                for (const conv of data.uom_conversions) {
                    stmt.run({
                        id: uuidv4(),
                        item_id: id,
                        from_unit_id: conv.from_unit_id,
                        to_unit_id: conv.to_unit_id, // Usually base unit
                        factor: conv.factor,
                        barcode: conv.barcode || null,
                        sale_price: conv.sale_price || null
                    });
                }
            }

            return id;
        });

        return update();
    }


    static deleteItem(id: string) {
        const txCount = (db.prepare('SELECT COUNT(*) as cnt FROM inventory_transactions WHERE item_id = ?').get(id) as any)?.cnt ?? 0;
        if (txCount > 0) {
            return { success: false, error: 'لا يمكن حذف الصنف لوجود حركات مخزنية مرتبطة به' };
        }
        db.prepare('DELETE FROM items WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Suggest / List (Optimized for Pickers) ---

    static suggest(q: string, limit = 20) {
        const s = (q || "").trim();
        if (!s) return [];

        const rows = ItemService.searchItemProfilesInternal(s, limit, true);
        return rows.map((row: any) => ({ ...row, uom: row.base_unit_id }));
    }

    static list(q: string, limit = 200, offset = 0) {
        const s = (q || "").trim();
        if (!s) {
            return db.prepare(`
                SELECT id, code, name_ar as name, base_unit_id as uom,
                       type, costing_method,
                       inventory_account_id, sales_account_id, cogs_account_id,
                       cost_price, sale_price, standard_cost
                FROM items 
                ORDER BY code ASC 
                LIMIT ? OFFSET ?
            `).all(limit, offset) as any[];
        }

        return db.prepare(`
            SELECT id, code, name_ar as name, base_unit_id as uom,
                   type, costing_method,
                   inventory_account_id, sales_account_id, cogs_account_id,
                   cost_price, sale_price, standard_cost
            FROM items
            WHERE code LIKE ? OR name_ar LIKE ? OR COALESCE(name_en, '') LIKE ? OR COALESCE(barcode, '') LIKE ?
            ORDER BY code ASC
            LIMIT ? OFFSET ?
        `).all(`%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`, limit, offset) as any[];
    }

    static quickCreate(item: { code: string; name: string; default_uom: string }) {
        if (!item.code?.trim()) throw new Error("رقم الصنف مطلوب");
        if (!item.name?.trim()) throw new Error("اسم الصنف مطلوب");
        if (!item.default_uom?.trim()) throw new Error("الوحدة الافتراضية مطلوبة");

        const exists = db.prepare(`SELECT id FROM items WHERE code = ?`).get(item.code.trim());
        if (exists) throw new Error("رقم الصنف موجود مسبقاً");

        const id = uuidv4();
        db.prepare(`
            INSERT INTO items (id, code, name_ar, base_unit_id, created_at) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(id, item.code.trim(), item.name.trim(), item.default_uom.trim());

        return id;
    }

    // --- Units ---

    static getUnits() {
        const cols = db.prepare("PRAGMA table_info('units')").all();
        const names = new Set((cols || []).map((c: any) => String(c.name)));
        const orderBy = names.has('name_ar') ? 'name_ar' : 'name';
        const rows = db.prepare(`SELECT * FROM units ORDER BY ${orderBy}`).all() as any[];
        return rows.map((u) => ({
            ...u,
            name_ar: u.name_ar || u.name || '',
            name_en: u.name_en || '',
            code: u.code || u.symbol || '',
            is_active: u.is_active === undefined || u.is_active === null ? 1 : u.is_active,
        }));
    }

    static createUnit(data: any) {
        const cols = db.prepare("PRAGMA table_info('units')").all();
        const names = new Set((cols || []).map((c: any) => String(c.name)));
        const id = uuidv4();

        const insertCols: string[] = ['id'];
        const row: any = { id };

        if (names.has('name_ar')) {
            insertCols.push('name_ar');
            row.name_ar = data.name_ar || data.name || '';
        }

        if (names.has('name')) {
            insertCols.push('name');
            row.name = data.name_ar || data.name || '';
        }

        if (names.has('name_en')) {
            insertCols.push('name_en');
            row.name_en = data.name_en || '';
        }

        if (names.has('code')) {
            insertCols.push('code');
            row.code = data.code || '';
        }

        if (names.has('symbol')) {
            insertCols.push('symbol');
            row.symbol = data.symbol || data.code || '';
        }

        if (names.has('is_active')) {
            insertCols.push('is_active');
            row.is_active = data.is_active ? 1 : 0;
        }

        if (names.has('is_base')) {
            insertCols.push('is_base');
            row.is_base = data.is_base ? 1 : 0;
        }

        if (names.has('name_he')) {
            insertCols.push('name_he');
            row.name_he = data.name_he || '';
        }

        if (names.has('is_used')) {
            insertCols.push('is_used');
            row.is_used = data.is_used ? 1 : 0;
        }

        if (names.has('unit_type')) {
            insertCols.push('unit_type');
            row.unit_type = data.unit_type || 'كمية';
        }

        if (names.has('parent_unit_id')) {
            insertCols.push('parent_unit_id');
            row.parent_unit_id = data.parent_unit_id || null;
        }

        if (names.has('level_no')) {
            insertCols.push('level_no');
            row.level_no = Number(data.level_no || 1);
        }

        if (names.has('symbol_ar')) {
            insertCols.push('symbol_ar');
            row.symbol_ar = data.symbol_ar || data.code || '';
        }

        if (names.has('symbol_en')) {
            insertCols.push('symbol_en');
            row.symbol_en = data.symbol_en || data.symbol || data.code || '';
        }

        if (names.has('symbol_he')) {
            insertCols.push('symbol_he');
            row.symbol_he = data.symbol_he || '';
        }

        if (names.has('multiplier')) {
            insertCols.push('multiplier');
            row.multiplier = Number(data.multiplier || 1);
        }

        if (names.has('total_factor')) {
            insertCols.push('total_factor');
            row.total_factor = Number(data.total_factor || row.multiplier || 1);
        }

        if (names.has('updated_at')) {
            insertCols.push('updated_at');
            row.updated_at = new Date().toISOString();
        }

        const sql = `INSERT INTO units (${insertCols.join(', ')}) VALUES (${insertCols.map((c) => '@' + c).join(', ')})`;
        db.prepare(sql).run(row);
        return id;
    }

    static deleteUnit(id: string) {
        db.prepare('DELETE FROM units WHERE id = ?').run(id);
        return { success: true };
    }


    // --- Categories ---

    static getCategories() {
        return db.prepare('SELECT * FROM item_categories ORDER BY name_ar').all();
    }

    static createCategory(data: any) {
        const id = uuidv4();
        db.prepare('INSERT INTO item_categories (id, name_ar, name_en, parent_id, description, code, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            id, data.name_ar, data.name_en, data.parent_id || null, data.description, data.code, data.is_active ? 1 : 0
        );
        return id;
    }

    static updateCategory(data: any) {
        db.prepare('UPDATE item_categories SET name_ar = ?, name_en = ?, parent_id = ?, description = ?, code = ?, is_active = ? WHERE id = ?').run(
            data.name_ar, data.name_en, data.parent_id || null, data.description, data.code, data.is_active ? 1 : 0, data.id
        );
        return { success: true };
    }

    static deleteCategory(id: string) {
        // Optional: Check constraint if used by validation
        db.prepare('DELETE FROM item_categories WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Brands ---
    static getBrands() {
        return db.prepare('SELECT * FROM brands ORDER BY name_ar').all();
    }

    static createBrand(data: any) {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO brands (id, code, name_ar, name_en, origin_country, description, is_active) 
            VALUES (@id, @code, @name_ar, @name_en, @origin_country, @description, @is_active)
        `).run({
            id,
            code: data.code || null,
            name_ar: data.name_ar,
            name_en: data.name_en || null,
            origin_country: data.origin_country || null,
            description: data.description || null,
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        });
        return id;
    }

    static updateBrand(data: any) {
        db.prepare(`
            UPDATE brands 
            SET code=@code, name_ar=@name_ar, name_en=@name_en, origin_country=@origin_country, description=@description, is_active=@is_active 
            WHERE id=@id
        `).run({
            ...data,
            code: data.code || null,
            name_en: data.name_en || null,
            origin_country: data.origin_country || null,
            description: data.description || null,
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        });
        return { success: true };
    }

    static deleteBrand(id: string) {
        db.prepare('DELETE FROM brands WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Warehouses & Bins ---
    static getWarehouses() {
        const warehouses = db.prepare('SELECT * FROM warehouses ORDER BY name_ar').all();
        // Note: 'name' was migrated to 'name_ar'.
        // Also fetch bins if needed, but for Master List, maybe not?
        // Keeping bins fetch for compatibility if used elsewhere.
        const bins = db.prepare('SELECT * FROM warehouse_bins ORDER BY code').all();

        return warehouses.map((w: any) => ({
            ...w,
            bins: bins.filter((b: any) => b.warehouse_id === w.id)
        }));
    }

    static createWarehouse(data: any) {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO warehouses (
                id, code, name_ar, name_en, location, phone, manager_id, address, is_active
            ) VALUES (
                @id, @code, @name_ar, @name_en, @location, @phone, @manager_id, @address, @is_active
            )
        `).run({
            id,
            code: data.code || null,
            name_ar: data.name_ar, // Required
            name_en: data.name_en || null,
            location: data.location || null,
            phone: data.phone || null,
            manager_id: data.manager_id || null,
            address: data.address || null,
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        });
        return id;
    }

    static updateWarehouse(data: any) {
        db.prepare(`
            UPDATE warehouses 
            SET code=@code, name_ar=@name_ar, name_en=@name_en, location=@location, 
                phone=@phone, manager_id=@manager_id, address=@address, is_active=@is_active 
            WHERE id=@id
        `).run({
            ...data,
            code: data.code || null,
            name_en: data.name_en || null,
            location: data.location || null,
            phone: data.phone || null,
            manager_id: data.manager_id || null,
            address: data.address || null,
            is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
        });
        return { success: true };
    }

    static deleteWarehouse(id: string) {
        db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
        return { success: true };
    }

    static saveBin(data: any) {
        if (data.id) {
            db.prepare('UPDATE warehouse_bins SET code=@code, type=@type WHERE id=@id').run(data);
        } else {
            const id = uuidv4();
            db.prepare('INSERT INTO warehouse_bins (id, warehouse_id, code, type) VALUES (@id, @warehouse_id, @code, @type)').run({ id, ...data });
        }
        return { success: true };
    }

    static deleteBin(id: string) {
        db.prepare('DELETE FROM warehouse_bins WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Attributes Definitions ---
    static getAttributesDefinitions() {
        const attributes = db.prepare('SELECT * FROM item_attributes ORDER BY name_ar').all();
        const values = db.prepare('SELECT * FROM item_attribute_values').all();

        return attributes.map((attr: any) => ({
            ...attr,
            values: values.filter((v: any) => v.attribute_id === attr.id)
        }));
    }

    static saveAttributeDefinition(data: any) {
        if (data.id) {
            db.prepare('UPDATE item_attributes SET name_ar=@name_ar, name_en=@name_en, type=@type WHERE id=@id').run(data);
            return { success: true, id: data.id };
        } else {
            const id = uuidv4();
            db.prepare('INSERT INTO item_attributes (id, name_ar, name_en, type) VALUES (@id, @name_ar, @name_en, @type)').run({
                id,
                name_ar: data.name_ar,
                name_en: data.name_en,
                type: data.type || 'TEXT'
            });
            return { success: true, id };
        }
    }

    static saveAttributeValue(data: any) {
        if (data.id) {
            db.prepare('UPDATE item_attribute_values SET value=@value WHERE id=@id').run(data);
            return { success: true, id: data.id };
        } else {
            const id = uuidv4();
            db.prepare('INSERT INTO item_attribute_values (id, attribute_id, value) VALUES (@id, @attribute_id, @value)').run({
                id,
                attribute_id: data.attribute_id,
                value: data.value
            });
            return { success: true, id };
        }
    }

    static deleteAttributeDefinition(id: string) {
        db.prepare('DELETE FROM item_attributes WHERE id = ?').run(id);
        return { success: true };
    }

    static deleteAttributeValue(id: string) {
        db.prepare('DELETE FROM item_attribute_values WHERE id = ?').run(id);
        return { success: true };
    }
}
