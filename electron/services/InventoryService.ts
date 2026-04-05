import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { Item, Unit, ItemUnit } from '../../types';

import { JournalService } from './JournalService';

export class InventoryService {

    // --- Units ---
    static getUnits(): Unit[] {
        const units = db.prepare('SELECT * FROM units ORDER BY name_ar').all();
        // Fallback for name_ar if not present in basic units table (migration safe)
        return units.map((u: any) => ({
            ...u,
            name_ar: u.name_ar || u.name,
            is_base: !!u.is_base
        }));
    }

    static createUnit(unit: Partial<Unit>): Unit {
        const newUnit = {
            id: uuidv4(),
            name: unit.name_ar, // Mapping ar to name for legacy compat
            name_ar: unit.name_ar,
            name_en: unit.name_en || '',
            symbol: unit.symbol || '',
            is_base: unit.is_base ? 1 : 0
        };

        // Try insert with name_ar if column exists (it should per v1) or just name
        try {
            db.prepare(`
                INSERT INTO units (id, name, name_ar, symbol, is_base)
                VALUES (@id, @name, @name_ar, @symbol, @is_base)
            `).run(newUnit);
        } catch (e) {
            // Fallback if name_ar missing in some legacy version
            db.prepare(`
                INSERT INTO units (id, name, symbol, is_base)
                VALUES (@id, @name, @symbol, @is_base)
            `).run(newUnit);
        }

        return { ...unit, id: newUnit.id } as Unit;
    }

    static deleteUnit(id: string) {
        db.prepare('DELETE FROM units WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Attributes & Brands ---
    static getBrands() {
        // Table created in v18
        try {
            return db.prepare('SELECT * FROM brands WHERE is_active = 1 ORDER BY name_ar').all();
        } catch (e) { return []; }
    }

    static createBrand(brand: any) {
        const newBrand = {
            id: uuidv4(),
            name_ar: brand.name_ar,
            name_en: brand.name_en || '',
            code: brand.code || null,
            description: brand.description || null,
            origin_country: brand.origin_country || '',
            is_active: 1
        };
        db.prepare(`INSERT INTO brands (id, name_ar, name_en, code, description, origin_country, is_active) VALUES (@id, @name_ar, @name_en, @code, @description, @origin_country, @is_active)`).run(newBrand);
        return newBrand;
    }

    static updateBrand(brand: any) {
        const stmt = db.prepare(`UPDATE brands SET name_ar = @name_ar, name_en = @name_en, code = @code, description = @description, origin_country = @origin_country, is_active = @is_active WHERE id = @id`);
        stmt.run({
            ...brand,
            code: brand.code || null,
            description: brand.description || null
        });
        return { success: true };
    }

    static deleteBrand(id: string) {
        db.prepare('DELETE FROM brands WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Attributes (New) ---
    static getAttributeDefinitions() {
        return db.prepare('SELECT * FROM item_attributes ORDER BY name_ar').all();
    }

    static saveAttributeDefinition(attr: any) {
        if (attr.id) {
            // Update
            db.prepare('UPDATE item_attributes SET name_ar = @name_ar, name_en = @name_en, type = @type WHERE id = @id').run({
                id: attr.id,
                name_ar: attr.name_ar,
                name_en: attr.name_en || '',
                type: attr.type || 'TEXT'
            });
            return attr;
        } else {
            // Create
            const newAttr = {
                id: uuidv4(),
                name_ar: attr.name_ar,
                name_en: attr.name_en || '',
                type: attr.type || 'TEXT'
            };
            db.prepare('INSERT INTO item_attributes (id, name_ar, name_en, type) VALUES (@id, @name_ar, @name_en, @type)').run(newAttr);
            return newAttr;
        }
    }

    static deleteAttribute(id: string) {
        db.prepare('DELETE FROM item_attributes WHERE id = ?').run(id);
        return { success: true };
    }

    static getAttributeValues(attributeId: string) {
        return db.prepare('SELECT * FROM item_attribute_values WHERE attribute_id = ? ORDER BY value').all(attributeId);
    }

    static createAttributeValue(attributeId: string, value: string) {
        // Check exist
        const exist = db.prepare('SELECT * FROM item_attribute_values WHERE attribute_id = ? AND value = ?').get(attributeId, value);
        if (exist) {
            // If it exists, we might want to update it? For now, just return existing.
            // But if the frontend sends an ID, we should update.
            // Let's change this to saveAttributeValue
            return exist;
        }

        const newVal = {
            id: uuidv4(),
            attribute_id: attributeId,
            value: value
        };
        db.prepare('INSERT INTO item_attribute_values (id, attribute_id, value) VALUES (@id, @attribute_id, @value)').run(newVal);
        return newVal;
    }

    static saveAttributeValue(data: any) {
        if (data.id) {
            db.prepare('UPDATE item_attribute_values SET value = @value WHERE id = @id').run({ id: data.id, value: data.value });
            return data;
        } else {
            return this.createAttributeValue(data.attribute_id, data.value);
        }
    }

    static deleteAttributeValue(id: string) {
        db.prepare('DELETE FROM item_attribute_values WHERE id = ?').run(id);
        return { success: true };
    }

    // Helper to save item attributes (Clear & Re-insert)
    // Expects attributes: [{ attribute_id, value }]
    private static saveItemAttributes(itemId: string, attributes: any[]) {
        db.prepare('DELETE FROM item_has_attributes WHERE item_id = ?').run(itemId);

        if (!attributes || attributes.length === 0) return;

        const insertLink = db.prepare('INSERT INTO item_has_attributes (item_id, attribute_value_id) VALUES (?, ?)');

        for (const attr of attributes) {
            // 1. Ensure Value Exists
            let valueObj = db.prepare('SELECT id FROM item_attribute_values WHERE attribute_id = ? AND value = ?').get(attr.attribute_id, attr.value);

            if (!valueObj) {
                // Create valid value if not exists? Or strictly require ID?
                // Let's create it for UX convenience
                const newValId = uuidv4();
                db.prepare('INSERT INTO item_attribute_values (id, attribute_id, value) VALUES (?, ?, ?)').run(newValId, attr.attribute_id, attr.value);
                valueObj = { id: newValId };
            }

            // 2. Link
            insertLink.run(itemId, valueObj.id);
        }
    }

    // --- Items (Complex 7-Tabs) ---
    static getItems(): Item[] {
        // Fetch extended info
        const items = db.prepare(`
            SELECT i.*, u.name_ar as base_unit_name, b.name_ar as brand_name
            FROM items i
            LEFT JOIN units u ON i.base_unit_id = u.id
            LEFT JOIN brands b ON i.brand_id = b.id
            ORDER BY i.code
        `).all();

        return items.map((i: any) => ({
            ...i,
            cost_price: Number(i.cost_price),
            sale_price: Number(i.sale_price),
            min_price: Number(i.min_price),
            is_active: !!i.is_active,
            tax_included: !!i.tax_included,
            has_expiry: !!i.has_expiry,
            has_serial: !!i.has_serial
        }));
    }

    static getItemDetails(id: string) {
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
        if (!item) return null;

        let units = [], prices = [], kitItems = [], realAttributes = [], alternatives = [];

        try {
            units = db.prepare(`
                SELECT iu.*, u.name_ar as unit_name 
                FROM item_units iu 
                JOIN units u ON iu.unit_id = u.id 
                WHERE iu.item_id = ?
            `).all(id);
        } catch (e) {
            console.error('Error fetching units for item ' + id, e);
        }

        try {
            prices = db.prepare(`
                SELECT ip.*, pl.name_ar as list_name, u.name_ar as unit_name
                FROM item_prices ip
                JOIN price_lists pl ON ip.price_list_id = pl.id
                JOIN units u ON ip.unit_id = u.id
                WHERE ip.item_id = ?
            `).all(id);
        } catch (e) {
            console.error('Error fetching prices for item ' + id, e);
        }

        try {
            kitItems = db.prepare(`
                SELECT ik.*, i.name_ar as child_item_name
                FROM item_kits ik
                JOIN items i ON ik.child_item_id = i.id
                WHERE ik.parent_item_id = ?
            `).all(id);
        } catch (e) {
            console.error('Error fetching kit items for item ' + id, e);
        }

        try {
            // Correct query for attributes:
            realAttributes = db.prepare(`
                SELECT iha.item_id, iav.attribute_id, ia.name_ar as attribute_name, iav.value, iav.id as value_id
                FROM item_has_attributes iha
                JOIN item_attribute_values iav ON iha.attribute_value_id = iav.id
                JOIN item_attributes ia ON iav.attribute_id = ia.id
                WHERE iha.item_id = ?
            `).all(id);
        } catch (e) {
            console.error('Error fetching attributes for item ' + id, e);
        }

        try {
            alternatives = db.prepare(`
                SELECT alt.alternative_item_id, alt.note,
                       i.name_ar as item_name, i.code,
                       (SELECT COALESCE(SUM(quantity), 0) FROM item_batches WHERE item_id = i.id) as current_stock
                FROM item_alternatives alt
                JOIN items i ON alt.alternative_item_id = i.id
                WHERE alt.item_id = ?
            `).all(id);
        } catch (e) {
            console.error('Error fetching alternatives for item ' + id, e);
        }

        return {
            ...item,
            additional_units: units,
            prices: prices,
            kit_items: kitItems,
            attributes: realAttributes,
            alternatives: alternatives,
            // flags
            is_active: !!item.is_active,
            tax_included: !!item.tax_included,
            has_expiry: !!item.has_expiry,
            has_serial: !!item.has_serial
        };
    }



    static createItem(item: any): any {
        const newItem = {
            id: uuidv4(),
            code: item.code,
            name_ar: item.name_ar,
            name_en: item.name_en || '',
            trade_name: item.trade_name || '',
            name_he: item.name_he || '',

            category_id: item.category_id || null,
            brand_id: item.brand_id || null,
            type: item.type || 'Goods',

            base_unit_id: item.base_unit_id || null,

            cost_price: String(item.cost_price || 0),
            standard_cost: String(item.standard_cost || 0),
            costing_method: item.costing_method || 'WEIGHTED_AVG',
            sale_price: String(item.sale_price || 0),
            min_price: String(item.min_price || 0),
            floor_price: String(item.floor_price || 0),

            min_stock: item.min_stock || 0,
            max_stock: item.max_stock || 0,
            reorder_point: item.reorder_point || 0,

            is_active: item.is_active ? 1 : 0,
            tax_included: item.tax_included ? 1 : 0,
            tax_type: item.tax_type || 'VAT_16',

            description: item.description || '',
            image_url: item.image_url || '',

            // Flags
            has_expiry: item.has_expiry ? 1 : 0,
            has_serial: item.has_serial ? 1 : 0,
            shelf_life_days: item.shelf_life_days || 0,

            production_line: item.production_line || '',
            default_supplier_id: item.default_supplier_id || null,
            warranty_info: item.warranty_info || '',
            grade: item.grade || ''
        };

        const createTx = db.transaction(() => {
            db.prepare(`
                INSERT INTO items (
                    id, code, name_ar, name_en, trade_name, name_he,
                    category_id, brand_id, type, base_unit_id,
                    cost_price, standard_cost, costing_method, sale_price, min_price, floor_price,
                    min_stock_level, max_stock, reorder_point,
                    is_active, tax_included, tax_type,
                    description, image_url,
                    has_expiry, has_serial, shelf_life_days,
                    production_line, default_supplier_id, warranty_info, grade
                ) VALUES (
                    @id, @code, @name_ar, @name_en, @trade_name, @name_he,
                    @category_id, @brand_id, @type, @base_unit_id,
                    @cost_price, @standard_cost, @costing_method, @sale_price, @min_price, @floor_price,
                    @min_stock, @max_stock, @reorder_point,
                    @is_active, @tax_included, @tax_type,
                    @description, @image_url,
                    @has_expiry, @has_serial, @shelf_life_days,
                    @production_line, @default_supplier_id, @warranty_info, @grade
                )
            `).run(newItem);

            // Additional Units
            if (item.additional_units && item.additional_units.length > 0) {
                const insertUnit = db.prepare(`
                    INSERT INTO item_units (id, item_id, unit_id, factor, barcode, sale_price)
                    VALUES (@id, @item_id, @unit_id, @factor, @barcode, @sale_price)
                `);
                for (const u of item.additional_units) {
                    insertUnit.run({
                        id: uuidv4(),
                        item_id: newItem.id,
                        unit_id: u.unit_id,
                        factor: u.factor,
                        barcode: u.barcode || null,
                        sale_price: String(u.sale_price || 0)
                    });
                }
            }

            // Prices per List
            if (item.prices && item.prices.length > 0) {
                const insertPrice = db.prepare(`
                   INSERT INTO item_prices (id, price_list_id, item_id, unit_id, price)
                   VALUES (@id, @price_list_id, @item_id, @unit_id, @price) 
                `);
                for (const p of item.prices) {
                    insertPrice.run({
                        id: uuidv4(),
                        price_list_id: p.price_list_id,
                        item_id: newItem.id,
                        unit_id: p.unit_id,
                        price: p.price
                    });
                }
            }
            // Kit Items (Components)
            if (item.kit_items && item.kit_items.length > 0) {
                const insertKit = db.prepare(`
                    INSERT INTO item_kits (parent_item_id, child_item_id, quantity)
                    VALUES (@parent_item_id, @child_item_id, @quantity)
                `);
                for (const k of item.kit_items) {
                    insertKit.run({
                        parent_item_id: newItem.id,
                        child_item_id: k.child_item_id,
                        quantity: k.quantity
                    });
                }
            }

            // Alternatives
            if (item.alternatives && item.alternatives.length > 0) {
                InventoryService.saveItemAlternatives(newItem.id, item.alternatives);
            }

            // Attributes
            if (item.attributes) {
                InventoryService.saveItemAttributes(newItem.id, item.attributes);
            }
        });

        createTx();
        return { ...newItem, id: newItem.id };
    }

    static bulkUpdateItems(updates: any[]) {
        const runBulk = db.transaction(() => {
            const stmt = db.prepare(`
                UPDATE items 
                SET sale_price = @sale_price, cost_price = @cost_price, min_price = @min_price
                WHERE id = @id
            `);
            // We can make this dynamic or just fixed for prices now.
            // Let's stick to prices for this task.
            for (const u of updates) {
                // Determine what to update based on what's passed
                // For simplicity, we assume the passed object has the fields we want to update.
                // But SQL needs fixed columns.
                // Let's assume we update sale_price and cost_price if present.
                // We need to fetch current if we want to only update one? 
                // No, the frontend sends the final state.

                // Construct dynamic update is harder with prepared statements in loop.
                // Let's do specific price update method.

                let query = "UPDATE items SET ";
                const params: any = { id: u.id };
                const sets = [];

                if (u.sale_price !== undefined) { sets.push("sale_price = @sale_price"); params.sale_price = u.sale_price; }
                if (u.cost_price !== undefined) { sets.push("cost_price = @cost_price"); params.cost_price = u.cost_price; }
                if (u.min_price !== undefined) { sets.push("min_price = @min_price"); params.min_price = u.min_price; }

                if (sets.length === 0) continue;

                query += sets.join(", ") + " WHERE id = @id";
                db.prepare(query).run(params);
            }
        });
        runBulk();
        return { success: true };
    }

    static updateItem(item: any) {
        const updateTx = db.transaction(() => {
            // 1. Update Main Table
            db.prepare(`
                UPDATE items SET 
                    code = @code, name_ar = @name_ar, name_en = @name_en, trade_name = @trade_name, name_he = @name_he,
                    category_id = @category_id, brand_id = @brand_id, type = @type, base_unit_id = @base_unit_id,
                    cost_price = @cost_price, standard_cost = @standard_cost, costing_method = @costing_method, sale_price = @sale_price, min_price = @min_price, floor_price = @floor_price,
                    min_stock_level = @min_stock, max_stock = @max_stock, reorder_point = @reorder_point,
                    is_active = @is_active, tax_included = @tax_included, tax_type = @tax_type,
                    description = @description, image_url = @image_url,
                    has_expiry = @has_expiry, has_serial = @has_serial, shelf_life_days = @shelf_life_days,
                    production_line = @production_line, default_supplier_id = @default_supplier_id, warranty_info = @warranty_info, grade = @grade
                WHERE id = @id
            `).run({
                id: item.id,
                code: item.code,
                name_ar: item.name_ar,
                name_en: item.name_en || '',
                trade_name: item.trade_name || '',
                name_he: item.name_he || '',
                category_id: item.category_id || null,
                brand_id: item.brand_id || null,
                type: item.type || 'Goods',
                base_unit_id: item.base_unit_id || null,
                cost_price: String(item.cost_price || 0),
                standard_cost: String(item.standard_cost || 0),
                costing_method: item.costing_method || 'WEIGHTED_AVG',
                sale_price: String(item.sale_price || 0),
                min_price: String(item.min_price || 0),
                floor_price: String(item.floor_price || 0),
                min_stock: item.min_stock || 0,
                max_stock: item.max_stock || 0,
                reorder_point: item.reorder_point || 0,
                is_active: item.is_active ? 1 : 0,
                tax_included: item.tax_included ? 1 : 0,
                tax_type: item.tax_type || 'VAT_16',
                description: item.description || '',
                image_url: item.image_url || '',
                has_expiry: item.has_expiry ? 1 : 0,
                has_serial: item.has_serial ? 1 : 0,
                shelf_life_days: item.shelf_life_days || 0,
                production_line: item.production_line || '',
                default_supplier_id: item.default_supplier_id || null,
                warranty_info: item.warranty_info || '',
                grade: item.grade || ''
            });

            // 2. Clear Child Tables
            const id = item.id;
            db.prepare('DELETE FROM item_units WHERE item_id = ?').run(id);
            db.prepare('DELETE FROM item_prices WHERE item_id = ?').run(id);
            db.prepare('DELETE FROM item_kits WHERE parent_item_id = ?').run(id);
            db.prepare('DELETE FROM item_alternatives WHERE item_id = ?').run(id);

            // 3. Re-Insert Units
            if (item.additional_units && item.additional_units.length > 0) {
                const insertUnit = db.prepare(`
                    INSERT INTO item_units (id, item_id, unit_id, factor, barcode, sale_price)
                    VALUES (@id, @item_id, @unit_id, @factor, @barcode, @sale_price)
                `);
                for (const u of item.additional_units) {
                    insertUnit.run({
                        id: uuidv4(),
                        item_id: id,
                        unit_id: u.unit_id,
                        factor: u.factor,
                        barcode: u.barcode || null,
                        sale_price: String(u.sale_price || 0)
                    });
                }
            }

            // 4. Re-Insert Prices
            if (item.prices && item.prices.length > 0) {
                const insertPrice = db.prepare(`
                   INSERT INTO item_prices (id, price_list_id, item_id, unit_id, price)
                   VALUES (@id, @price_list_id, @item_id, @unit_id, @price) 
                `);
                for (const p of item.prices) {
                    insertPrice.run({
                        id: uuidv4(),
                        price_list_id: p.price_list_id,
                        item_id: id,
                        unit_id: p.unit_id,
                        price: p.price
                    });
                }
            }

            // 5. Re-Insert Kits
            if (item.kit_items && item.kit_items.length > 0) {
                const insertKit = db.prepare(`
                    INSERT INTO item_kits (parent_item_id, child_item_id, quantity)
                    VALUES (@parent_item_id, @child_item_id, @quantity)
                `);
                for (const k of item.kit_items) {
                    insertKit.run({
                        parent_item_id: id,
                        child_item_id: k.child_item_id,
                        quantity: k.quantity
                    });
                }
            }

            // 6. Re-Insert Attributes
            if (item.attributes) {
                InventoryService.saveItemAttributes(id, item.attributes);
            }

            // 7. Re-Insert Alternatives
            if (item.alternatives && item.alternatives.length > 0) {
                InventoryService.saveItemAlternatives(id, item.alternatives);
            }
        });

        updateTx();
        return { success: true };
    }

    // --- Warehouses ---
    static getWarehouses() {
        return db.prepare('SELECT * FROM warehouses ORDER BY name_ar').all();
    }

    static createWarehouse(data: any) {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO warehouses (
                id, code, name, name_ar, name_en, location, phone, manager_id, address, is_active
            ) VALUES (
                @id, @code, @name, @name_ar, @name_en, @location, @phone, @manager_id, @address, @is_active
            )
        `).run({
            id,
            code: data.code || null,
            name: data.name_ar, // Legacy map
            name_ar: data.name_ar,
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
            SET code=@code, name=@name, name_ar=@name_ar, name_en=@name_en, location=@location, 
                phone=@phone, manager_id=@manager_id, address=@address, is_active=@is_active 
            WHERE id=@id
        `).run({
            ...data,
            code: data.code || null,
            name: data.name_ar, // Legacy map
            name_ar: data.name_ar,
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

    // --- Stock Control (Revised) ---

    static getStock(itemId: string, warehouseId?: string) {
        if (warehouseId) {
            const row = db.prepare('SELECT * FROM stock_balances WHERE item_id = ? AND warehouse_id = ?').get(itemId, warehouseId);
            return row ? { quantity: row.quantity, avg_cost: Number(row.avg_cost) } : { quantity: 0, avg_cost: 0 };
        } else {
            const row = db.prepare('SELECT SUM(quantity) as quantity, AVG(avg_cost) as avg_cost FROM stock_balances WHERE item_id = ?').get(itemId);
            return row ? { quantity: row.quantity || 0, avg_cost: Number(row.avg_cost) || 0 } : { quantity: 0, avg_cost: 0 };
        }
    }

    static getInventoryValuation(filters?: any) {
        let query = `
            SELECT 
                i.code, i.name_ar as item_name, 
                u.name_ar as unit_name,
                c.name_ar as category_name,
                sb.warehouse_id, w.name_ar as warehouse_name,
                sb.quantity, sb.avg_cost, 
                (sb.quantity * sb.avg_cost) as total_value
            FROM stock_balances sb
            JOIN items i ON sb.item_id = i.id
            LEFT JOIN units u ON i.base_unit_id = u.id
            LEFT JOIN item_categories c ON i.category_id = c.id
            LEFT JOIN warehouses w ON sb.warehouse_id = w.id
            WHERE sb.quantity != 0
        `;

        const params: any[] = [];
        if (filters) {
            if (filters.warehouse_id) {
                query += ` AND sb.warehouse_id = ?`;
                params.push(filters.warehouse_id);
            }
            if (filters.category_id) {
                query += ` AND i.category_id = ?`;
                params.push(filters.category_id);
            }
        }

        query += ` ORDER BY w.name_ar, i.name_ar`;

        return db.prepare(query).all(...params);
    }

    // --- Stock Documents (Entry/Issue) ---
    static createStockDocument(doc: any) {
        // doc: { type, warehouse_id, date, notes, items: [], status? }
        const { type, warehouse_id, date, notes, items, created_by } = doc;
        const status = doc.status || 'POSTED'; // Default to POSTED if not specified

        // Validate Period
        if (date) this.validateTransactionDate(date);

        // Generate Code
        let code = doc.code;
        if (!code) {
            const codePrefix = type === 'ENTRY' ? 'SE' : 'SI';
            const timestamp = Date.now().toString().slice(-6);
            code = `${codePrefix}-${timestamp}`;
        }

        const docId = uuidv4();

        // Calculate Total Value
        let totalValue = 0;
        items.forEach((i: any) => totalValue += (Math.abs(i.quantity) * Number(i.cost || 0)));

        const runTx = db.transaction(() => {
            // 1. Create Stock Document Header
            db.prepare(`
                INSERT INTO stock_documents (id, code, type, date, warehouse_id, status, notes, created_by)
                VALUES (@id, @code, @type, @date, @warehouse_id, @status, @notes, @created_by)
            `).run({
                id: docId,
                code,
                type,
                date: date || new Date().toISOString(),
                warehouse_id,
                status,
                notes,
                created_by: created_by || 'Admin'
            });

            // 2. Insert Lines (Always)
            const insertLine = db.prepare(`
                INSERT INTO stock_document_lines (id, document_id, item_id, quantity, cost, notes)
                VALUES (@id, @document_id, @item_id, @quantity, @cost, @notes)
            `);
            for (const item of items) {
                insertLine.run({
                    id: uuidv4(),
                    document_id: docId,
                    item_id: item.item_id,
                    quantity: item.quantity,
                    cost: item.cost || 0,
                    notes: item.notes || ''
                });
            }

            // 3. Post (Impact) ONLY if POSTED
            if (status === 'POSTED') {
                // A. Journal Entry
                const inventoryAccId = this.getInventoryAccount();
                const adjustmentAccId = this.getAdjustmentAccount();

                if (inventoryAccId && adjustmentAccId && totalValue > 0) {
                    const journalLines = [];
                    if (type === 'ENTRY') {
                        journalLines.push({ account_id: inventoryAccId, debit: totalValue, credit: 0, line_description: `Stock Entry ${code}` });
                        journalLines.push({ account_id: adjustmentAccId, debit: 0, credit: totalValue, line_description: `Stock Entry ${code}` });
                    } else {
                        journalLines.push({ account_id: adjustmentAccId, debit: totalValue, credit: 0, line_description: `Stock Issue ${code}` });
                        journalLines.push({ account_id: inventoryAccId, debit: 0, credit: totalValue, line_description: `Stock Issue ${code}` });
                    }

                    JournalService.createJournalEntry({
                        voucher_type: type === 'ENTRY' ? 'Stock Entry' : 'Stock Issue',
                        date: date || new Date().toISOString(),
                        reference_no: code,
                        description: notes || `${type} Transaction`,
                        status: 'POSTED',
                        branch_id: null,
                        currency_id: this.getBaseCurrencyId(),
                        exchange_rate: 1
                    }, journalLines);
                }

                // B. Stock Transactions & Balance Update
                const stmt = db.prepare(`
                    INSERT INTO inventory_transactions (
                        id, transaction_date, type, ref_document_type, ref_document_id,
                        warehouse_id, item_id, quantity, unit_cost, total_cost, description, created_by
                    ) VALUES (
                        @id, @date, @type, 'STOCK_DOCUMENT', @ref_doc_id,
                        @warehouse_id, @item_id, @quantity, @unit_cost, @total_cost, @description, @created_by
                    )
                `);

                const checkBalance = db.prepare('SELECT * FROM stock_balances WHERE item_id = ? AND warehouse_id = ?');
                const insertBalance = db.prepare('INSERT INTO stock_balances (item_id, warehouse_id, quantity, avg_cost, last_updated) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)');
                const updateBalance = db.prepare('UPDATE stock_balances SET quantity = ?, avg_cost = ?, last_updated = CURRENT_TIMESTAMP WHERE item_id = ? AND warehouse_id = ?');

                for (const item of items) {
                    const qty = type === 'ENTRY' ? Math.abs(item.quantity) : -Math.abs(item.quantity);
                    const cost = Number(item.cost || 0);

                    stmt.run({
                        id: uuidv4(),
                        date: date || new Date().toISOString(),
                        type: type,
                        ref_doc_id: docId,
                        warehouse_id: warehouse_id,
                        item_id: item.item_id,
                        quantity: qty,
                        unit_cost: cost,
                        total_cost: cost * Math.abs(qty),
                        description: notes || `${type} ${code}`,
                        created_by: created_by || 'Admin'
                    });

                    // Update Balance
                    const current = checkBalance.get(item.item_id, warehouse_id);
                    if (current) {
                        let newQty = current.quantity + qty;
                        let newCost = Number(current.avg_cost);

                        if (type === 'ENTRY' && qty > 0) {
                            const totalValue = (current.quantity * Number(current.avg_cost)) + (qty * cost);
                            // Avoid div by zero
                            newCost = newQty !== 0 ? totalValue / newQty : newCost;
                        }
                        updateBalance.run(newQty, newCost, item.item_id, warehouse_id);
                    } else {
                        insertBalance.run(item.item_id, warehouse_id, qty, cost);
                    }
                }
            }
        });

        runTx();
        return { success: true, id: docId, code };
    }

    static getGoodsReceipts() {
        return db.prepare(`
            SELECT sd.*, w.name_ar as warehouse_name
            FROM stock_documents sd
            LEFT JOIN warehouses w ON sd.warehouse_id = w.id
            WHERE sd.type = 'ENTRY'
            ORDER BY sd.date DESC
        `).all();
    }

    static getDispatches() {
        return db.prepare(`
            SELECT sd.*, w.name_ar as warehouse_name
            FROM stock_documents sd
            LEFT JOIN warehouses w ON sd.warehouse_id = w.id
            WHERE sd.type = 'DISPATCH'
            ORDER BY sd.date DESC
        `).all();
    }

    // --- Helpers ---
    static getInventoryAccount() {
        const acc = db.prepare("SELECT id FROM accounts WHERE code = '1201' OR name LIKE '%Inventory%' OR name LIKE '%مخزون%'").get();
        return acc ? acc.id : null;
    }

    static getAdjustmentAccount() {
        const acc = db.prepare("SELECT id FROM accounts WHERE code LIKE '5%' AND (name LIKE '%Adjustment%' OR name LIKE '%تسويات%')").get();
        return acc ? acc.id : null; // Should fall back to some expense/equity
    }

    static getBaseCurrencyId() {
        try {
            const sys = db.prepare("SELECT value FROM system_info WHERE key = 'base_currency_id'").get();
            // @ts-ignore
            if (sys) return sys.value;
            // Fallback: Get first inserted currency or 'ILS'
            const curr = db.prepare("SELECT id FROM currencies WHERE is_base = 1").get();
            // @ts-ignore
            return curr ? curr.id : 'ILS'; // Default fallback
        } catch (e) { return 'ILS'; }
    }

    // Advanced Transaction: Supports Batches/Serials
    static addStockTransaction(trx: any) {
        const { date, type, ref_no, warehouse_id, item_id, quantity, cost, description, created_by, batch_id, serial_id } = trx;

        // Validate Period
        if (date) this.validateTransactionDate(date);

        const runTransaction = db.transaction(() => {
            // 1. Log Transaction
            db.prepare(`
                INSERT INTO inventory_transactions (
                    id, transaction_date, type, ref_document_id, item_id, warehouse_id, 
                    quantity, unit_cost, total_cost, description, created_by,
                    batch_id, serial_id
                ) VALUES (
                    @id, @date, @type, @ref_no, @item_id, @warehouse_id, 
                    @quantity, @cost, @total_cost, @description, @created_by,
                    @batch_id, @serial_id
                )
            `).run({
                id: uuidv4(),
                date: date || new Date().toISOString(),
                type,
                ref_no,
                item_id,
                warehouse_id,
                quantity,
                cost: String(cost),
                total_cost: String(cost * Math.abs(quantity)),
                description,
                created_by: created_by || 'System',
                batch_id: batch_id || null,
                serial_id: serial_id || null
            });

            // 2. Update Aggregated Stock Balance
            const current = db.prepare('SELECT * FROM stock_balances WHERE item_id = ? AND warehouse_id = ?').get(item_id, warehouse_id);

            if (current) {
                let newCost = Number(current.avg_cost);
                let newQty = current.quantity + quantity;

                // Weighted Average Cost Calc (Only on IN)
                if (quantity > 0) {
                    const totalValue = (current.quantity * Number(current.avg_cost)) + (quantity * cost);
                    newCost = totalValue / (newQty || 1);
                }

                db.prepare(`
                    UPDATE stock_balances 
                    SET quantity = @qty, avg_cost = @cost 
                    WHERE item_id = @itemId AND warehouse_id = @whId
                `).run({ qty: newQty, cost: String(newCost), itemId: item_id, whId: warehouse_id });

            } else {
                db.prepare(`
                    INSERT INTO stock_balances (item_id, warehouse_id, quantity, avg_cost)
                    VALUES (@itemId, @whId, @qty, @cost)
                `).run({ itemId: item_id, whId: warehouse_id, qty: quantity, cost: String(cost) });
            }

            // 3. Update Batch Qty (if applicable)
            if (batch_id) {
                db.prepare(`UPDATE item_batches SET quantity = quantity + @qty WHERE id = @id`).run({ qty: quantity, id: batch_id });
            }

            // 4. Update Serial Status (if applicable)
            if (serial_id) {
                const newStatus = quantity > 0 ? 'AVAILABLE' : 'SOLD'; // Simplified
                db.prepare(`UPDATE item_serials SET status = @status, current_warehouse_id = @whId WHERE id = @id`)
                    .run({ status: newStatus, whId: quantity > 0 ? warehouse_id : null, id: serial_id });
            }
        });

        runTransaction();
        return { success: true };
    }

    // --- Transfers (Direct & Transit) ---
    static createTransferRequest(transfer: any) {
        // transfer: { type: 'DIRECT'|'TRANSIT', from_warehouse_id, to_warehouse_id, items: [...], date, notes }
        const { type, from_warehouse_id, to_warehouse_id, items, date, notes, created_by } = transfer;
        const transferId = uuidv4();
        const code = `TR-${Date.now().toString().slice(-6)}`;

        const runTransfer = db.transaction(() => {
            // 1. Create Stock Transfer Header
            db.prepare(`
                INSERT INTO stock_transfers (id, code, date, from_warehouse_id, to_warehouse_id, status, notes, created_by)
                VALUES (@id, @code, @date, @from_warehouse_id, @to_warehouse_id, @status, @notes, @created_by)
            `).run({
                id: transferId,
                code,
                date: date || new Date().toISOString(),
                from_warehouse_id,
                to_warehouse_id,
                status: type === 'DIRECT' ? 'COMPLETED' : 'IN_TRANSIT',
                notes,
                created_by: created_by || 'Admin'
            });

            // 2. Insert Items & Move Stock
            items.forEach((item: any) => {
                // Insert Transfer Item Line
                db.prepare(`
                    INSERT INTO stock_transfer_items (id, transfer_id, item_id, quantity, received_quantity)
                    VALUES (@id, @transferId, @itemId, @qty, @receivedQty)
                `).run({
                    id: uuidv4(),
                    transferId: transferId,
                    itemId: item.item_id,
                    qty: item.quantity,
                    receivedQty: type === 'DIRECT' ? item.quantity : 0
                });

                // OUT from Source (Average Cost from Source)
                // Need to get current cost from source
                const sourceStock = this.getStock(item.item_id, from_warehouse_id);
                // @ts-ignore
                const unitCost = Number(sourceStock.avg_cost || 0);

                this.addStockTransaction({
                    date: date || new Date().toISOString(),
                    type: 'TRANSFER_OUT',
                    ref_no: transferId,
                    warehouse_id: from_warehouse_id,
                    item_id: item.item_id,
                    quantity: -item.quantity,
                    cost: unitCost,
                    description: `Transfer OUT to ${to_warehouse_id} (${code})`,
                    created_by: created_by || 'Admin'
                });

                // IF DIRECT: IN to Dest immediately
                if (type === 'DIRECT') {
                    this.addStockTransaction({
                        date: date || new Date().toISOString(),
                        type: 'TRANSFER_IN',
                        ref_no: transferId,
                        warehouse_id: to_warehouse_id,
                        item_id: item.item_id,
                        quantity: item.quantity,
                        cost: unitCost, // Transfers carry cost
                        description: `Transfer IN from ${from_warehouse_id} (${code})`,
                        created_by: created_by || 'Admin'
                    });
                }
            });
        });

        runTransfer();
        return { success: true, id: transferId, code };
    }

    // Receive Transit Transfer
    static receiveTransfer(data: any) {
        const { transfer_id, items, received_date, created_by } = data;
        // items: [{ item_id, received_quantity }] (Partial receipt support)

        const runReceive = db.transaction(() => {
            const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transfer_id);
            if (!transfer || transfer.status !== 'IN_TRANSIT') throw new Error("Transfer not found or not in transit");

            let allReceived = true;

            items.forEach((recItem: any) => {
                // Get Original Transfer Line
                const line = db.prepare('SELECT * FROM stock_transfer_items WHERE transfer_id = ? AND item_id = ?').get(transfer_id, recItem.item_id);
                if (!line) return;

                // Update Received Qty
                db.prepare('UPDATE stock_transfer_items SET received_quantity = received_quantity + ? WHERE id = ?')
                    .run(recItem.received_quantity, line.id);

                // Determine Cost (Using cost at time of transfer? Or fetch from transaction logic? 
                // Ideally transfer logic should store unit_cost in transfer_items. For now, try to fetch from OUT transaction or just use current.)
                // Simple hack: get cost from OUT transaction linked to this transfer
                const outTx = db.prepare('SELECT unit_cost FROM inventory_transactions WHERE ref_document_id = ? AND item_id = ? AND type = "TRANSFER_OUT"').get(transfer_id, recItem.item_id);
                const cost = outTx ? Number(outTx.unit_cost) : 0;

                // IN to Dest
                this.addStockTransaction({
                    date: received_date || new Date().toISOString(),
                    type: 'TRANSFER_IN',
                    ref_no: transfer_id,
                    warehouse_id: transfer.to_warehouse_id,
                    item_id: recItem.item_id,
                    quantity: recItem.received_quantity,
                    cost: cost,
                    description: `Transfer Receive from ${transfer.from_warehouse_id} (${transfer.code})`,
                    created_by: created_by || 'Admin'
                });
            });

            // Check if fully received
            const remaining = db.prepare('SELECT count(*) as count FROM stock_transfer_items WHERE transfer_id = ? AND quantity > received_quantity').get(transfer_id);

            if (remaining.count === 0) {
                db.prepare('UPDATE stock_transfers SET status = "COMPLETED" WHERE id = ?').run(transfer_id);
            }
        });

        runReceive();
        return { success: true };
    }

    // --- Batches & Serials ---
    static createBatch(batch: any) {
        const newBatch = {
            id: uuidv4(),
            item_id: batch.item_id,
            batch_number: batch.batch_number,
            expiry_date: batch.expiry_date,
            manufacturing_date: batch.manufacturing_date,
            quantity: 0
        };
        db.prepare(`
            INSERT INTO item_batches (id, item_id, batch_number, expiry_date, manufacturing_date, quantity)
            VALUES (@id, @item_id, @batch_number, @expiry_date, @manufacturing_date, @quantity)
         `).run(newBatch);
        return newBatch;
    }

    static getBatches(itemId: string) {
        return db.prepare('SELECT * FROM item_batches WHERE item_id = ? AND quantity > 0').all(itemId);
    }



    // --- Bins ---
    static getBins(warehouseId: string) {
        return db.prepare('SELECT * FROM warehouse_bins WHERE warehouse_id = ?').all(warehouseId);
    }

    static createBin(bin: any) {
        const row = db.prepare('SELECT id FROM warehouse_bins WHERE warehouse_id = ? AND code = ?').get(bin.warehouse_id, bin.code);
        if (row) throw new Error('رمز الرف موجود مسبقاً في هذا المستودع');

        const id = uuidv4();
        const stmt = db.prepare(`INSERT INTO warehouse_bins (id, warehouse_id, code, name, type, max_weight, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(id, bin.warehouse_id, bin.code, bin.name, bin.type, bin.max_weight, bin.is_active ? 1 : 0);
        return { id, ...bin };
    }

    static deleteBin(id: string) {
        db.prepare('DELETE FROM warehouse_bins WHERE id = ?').run(id);
        return { success: true };
    }

    // --- Assembly / Kitting ---
    static async getKit(itemId: string) {
        // Get components defined in item_kits
        return db.prepare(`
            SELECT k.*, i.name_ar, i.code, i.cost_price 
            FROM item_kits k
            JOIN items i ON k.child_item_id = i.id
            WHERE k.parent_item_id = ?
        `).all(itemId);
    }

    static createAssembly(assembly: any) {
        // assembly: { type: 'BUILD'|'UNBUILD', parent_item_id, quantity, warehouse_id, date, notes }
        const { type, parent_item_id, quantity, warehouse_id, date, notes, created_by } = assembly;
        const assemblyId = uuidv4();
        const code = `ASM-${Date.now().toString().slice(-6)}`;

        const runAssembly = db.transaction(() => {
            // 1. Log Transaction Header (Using inventory_transactions with special type or ref?)
            // We can use 'ASSEMBLY_BUILD' as type in inventory_transactions for the Parent Item
            // And 'ASSEMBLY_USE' for components.

            // Get Kit Components
            const components = db.prepare('SELECT * FROM item_kits WHERE parent_item_id = ?').all(parent_item_id);
            if (components.length === 0) throw new Error("No components defined for this item kit.");

            // Calculate Cost of Assembly (Sum of components * qty)
            let totalUnitCost = 0;
            const componentCosts: any[] = [];

            components.forEach((comp: any) => {
                const stock = this.getStock(comp.child_item_id, warehouse_id);
                // @ts-ignore
                const unitCost = Number(stock.avg_cost || 0);
                totalUnitCost += (unitCost * comp.quantity);
                componentCosts.push({ ...comp, unitCost });
            });

            // If UNBUILD, we use the Parent Item's current avg cost as the value to distribute back
            if (type === 'UNBUILD') {
                const parentStock = this.getStock(parent_item_id, warehouse_id);
                // @ts-ignore
                totalUnitCost = Number(parentStock.avg_cost || 0);
                // Note: Real accounting might split this cost propotionally or standard.
                // Simplified: We assume components get back their standard/current AP, and variance goes to expense?
                // OR: We just reverse exactly using current component costs.
            }

            // 2. Parent Item Movement
            this.addStockTransaction({
                date: date || new Date().toISOString(),
                type: type === 'BUILD' ? 'ASSEMBLY_BUILD' : 'ASSEMBLY_UNBUILD', // BUILD = IN, UNBUILD = OUT
                ref_no: assemblyId,
                warehouse_id: warehouse_id,
                item_id: parent_item_id,
                quantity: type === 'BUILD' ? quantity : -quantity,
                cost: totalUnitCost,
                description: `Assembly ${type} ${code}`,
                created_by: created_by || 'Admin'
            });

            // 3. Components Movement
            componentCosts.forEach(comp => {
                const neededQty = comp.quantity * quantity;

                this.addStockTransaction({
                    date: date || new Date().toISOString(),
                    type: type === 'BUILD' ? 'ASSEMBLY_USE' : 'ASSEMBLY_RETURN', // BUILD = OUT, UNBUILD = IN
                    ref_no: assemblyId,
                    warehouse_id: warehouse_id,
                    item_id: comp.child_item_id,
                    quantity: type === 'BUILD' ? -neededQty : neededQty,
                    cost: comp.unitCost, // Use current cost for consumption
                    description: `Used in Assembly ${code}`,
                    created_by: created_by || 'Admin'
                });
            });
        });

        runAssembly();
        return { success: true, id: assemblyId, code };
    }

    // --- Stock Taking (Physical Inventory) ---

    static getStockTakes() {
        try {
            return db.prepare(`
                SELECT st.*, w.name as warehouse_name 
                FROM stock_takes st
                LEFT JOIN warehouses w ON st.warehouse_id = w.id
                ORDER BY st.date DESC
            `).all();
        } catch (e) {
            return [];
        }
    }

    static getStockTake(id: string) {
        const header = db.prepare(`
            SELECT st.*, w.name as warehouse_name 
            FROM stock_takes st
            LEFT JOIN warehouses w ON st.warehouse_id = w.id
            WHERE st.id = ?
        `).get(id);

        if (!header) return null;

        const items = db.prepare(`
            SELECT sti.*, i.name_ar as item_name, i.code as item_code, u.name as unit_name
            FROM stock_take_items sti
            LEFT JOIN items i ON sti.item_id = i.id
            LEFT JOIN units u ON i.base_unit_id = u.id
            WHERE sti.stock_take_id = ?
        `).all(id);

        return { ...header, items };
    }

    static createStockTake(data: any) {
        const id = uuidv4();
        // Generate Code ST-YYYY-XXXX
        let count = 0;
        try { count = db.prepare('SELECT COUNT(*) as c FROM stock_takes').get().c + 1; } catch (e) { }
        const code = `ST-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

        const runCreate = db.transaction(() => {
            db.prepare(`
                INSERT INTO stock_takes (id, code, warehouse_id, date, status, type, notes, created_by)
                VALUES (@id, @code, @warehouse_id, @date, 'DRAFT', @type, @notes, @created_by)
            `).run({
                id,
                code,
                warehouse_id: data.warehouse_id,
                date: new Date().toISOString(),
                type: data.type || 'FULL',
                notes: data.notes || '',
                created_by: data.created_by || 'Admin'
            });

            if (data.type === 'FULL') {
                const items = this.getItems();

                for (const item of items) {
                    const stock = this.getStock(item.id, data.warehouse_id);
                    const systemQty = Number(stock.quantity || 0);

                    db.prepare(`
                        INSERT INTO stock_take_items (id, stock_take_id, item_id, snapshot_quantity, counted_quantity, cost_price)
                        VALUES (@id, @stId, @itemId, @sysQty, @countQty, @cost)
                    `).run({
                        id: uuidv4(),
                        stId: id,
                        itemId: item.id,
                        sysQty: systemQty,
                        countQty: systemQty,
                        cost: item.cost_price || 0
                    });
                }
            }
        });

        runCreate();
        return { success: true, id, code };
    }

    static updateStockTakeItem(lineId: string, countedQty: number) {
        db.prepare(`UPDATE stock_take_items SET counted_quantity = ? WHERE id = ?`).run(countedQty, lineId);
        return { success: true };
    }

    static approveStockTake(id: string) {
        const result = db.transaction(() => {
            const st = this.getStockTake(id);
            if (!st || st.status !== 'DRAFT') throw new Error("Invalid Stock Take");

            for (const item of st.items) {
                const diff = item.counted_quantity - item.snapshot_quantity;

                if (diff !== 0) {
                    const type = diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
                    const qty = Math.abs(diff);

                    this.addStockTransaction({
                        date: new Date().toISOString(),
                        type: type,
                        ref_no: st.code,
                        warehouse_id: st.warehouse_id,
                        item_id: item.item_id,
                        quantity: type === 'ADJUSTMENT_OUT' ? -qty : qty,
                        cost: item.cost_price,
                        description: `Stock Take Adjustment (${st.code})`,
                        created_by: st.created_by
                    });
                }
            }

            db.prepare(`UPDATE stock_takes SET status = 'POSTED' WHERE id = ?`).run(id);
        });

        result();
        return { success: true };
    }

    // --- Period Closing ---

    static getLastClosingDate() {
        try {
            const row = db.prepare('SELECT MAX(closing_date) as last_date FROM inventory_closing').get();
            return row?.last_date || null;
        } catch (e) {
            return null;
        }
    }

    static closePeriod(date: string, userId: string = 'Admin') {
        const lastDate = this.getLastClosingDate();
        if (lastDate && new Date(date) <= new Date(lastDate)) {
            throw new Error("New closing date must be after the last closing date");
        }

        // Optional: Check if there are draft transactions? For now, we just lock.

        db.prepare(`
            INSERT INTO inventory_closing (id, closing_date, closed_by)
            VALUES (?, ?, ?)
        `).run(uuidv4(), date, userId);

        return { success: true };
    }

    static validateTransactionDate(date: string) {
        const lastDate = this.getLastClosingDate();
        if (lastDate && new Date(date) <= new Date(lastDate)) {
            throw new Error(`Transaction date (${date}) is within a closed period (Closed up to ${lastDate})`);
        }
    }
    static saveItemAlternatives(itemId: string, alternatives: any[]) {
        const stmt = db.prepare(`
            INSERT INTO item_alternatives (item_id, alternative_item_id, note)
            VALUES (@item_id, @alternative_item_id, @note)
        `);

        for (const alt of alternatives) {
            try {
                stmt.run({
                    item_id: itemId,
                    alternative_item_id: alt.alternative_item_id,
                    note: alt.note || ''
                });
            } catch (e) {
                // Ignore duplicates
                console.log("Alternative duplicate or error", e);
            }
        }
    }

    // Compat helper for PurchaseService
    static updateStock(itemId: string, quantity: number, type: string, ref: string, description: string, cost: number, warehouseId: string) {
        // Map legacy args to new transaction object
        // Quantity needs to be signed based on type for addStockTransaction?
        // addStockTransaction expects quantity to be signed? 
        // No, addStockTransaction takes quantity and cost.
        // Let's check logic:
        // if quantity > 0 -> IN/WeightedAvg update.

        // PurchaseService passes positive quantity and 'IN' for Purchase, and 'OUT' for Return.
        // addStockTransaction handles balances.

        let finalQty = quantity;
        if (type === 'OUT' || type === 'ISSUE') finalQty = -Math.abs(quantity);
        else finalQty = Math.abs(quantity);

        return this.addStockTransaction({
            date: new Date().toISOString(),
            type: type === 'IN' ? 'PURCHASE' : (type === 'OUT' ? 'PURCHASE_RETURN' : type),
            ref_no: ref,
            warehouse_id: warehouseId,
            item_id: itemId,
            quantity: finalQty,
            cost: cost,
            description: description,
            created_by: 'System'
        });
    }
}

