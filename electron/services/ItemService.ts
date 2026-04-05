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
        db.prepare('DELETE FROM items WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Units ---

    static getUnits() {
        return db.prepare('SELECT * FROM units ORDER BY is_active DESC, name_ar').all();
    }

    static createUnit(data: any) {
        const id = uuidv4();
        db.prepare('INSERT INTO units (id, name_ar, name_en, code, is_active) VALUES (?, ?, ?, ?, ?)').run(
            id, data.name_ar, data.name_en, data.code, data.is_active ? 1 : 0
        );
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
