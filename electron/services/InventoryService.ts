import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { Item, Unit, ItemUnit } from '../../types';

import { JournalService } from './JournalService';

interface DefaultUnitSeed {
    name_ar: string;
    name_en: string;
    code: string;
    symbol: string;
}

const DEFAULT_UNITS: DefaultUnitSeed[] = [
    { name_ar: 'قطعة', name_en: 'Piece', code: 'PCS', symbol: 'pc' },
    { name_ar: 'غرام', name_en: 'Gram', code: 'GRAM', symbol: 'g' },
    { name_ar: 'كيلو غرام', name_en: 'Kilogram', code: 'KG', symbol: 'kg' },
    { name_ar: 'طن', name_en: 'Ton', code: 'TON', symbol: 'ton' },
    { name_ar: 'مليمتر مربع', name_en: 'Square Millimeter', code: 'MM2', symbol: 'mm2' },
    { name_ar: 'سنتيمتر مربع', name_en: 'Square Centimeter', code: 'CM2', symbol: 'cm2' },
    { name_ar: 'متر مربع', name_en: 'Square Meter', code: 'M2', symbol: 'm2' },
    { name_ar: 'مليمتر مكعب', name_en: 'Cubic Millimeter', code: 'MM3', symbol: 'mm3' },
    { name_ar: 'سنتيمتر مكعب', name_en: 'Cubic Centimeter', code: 'CM3', symbol: 'cm3' },
    { name_ar: 'متر مكعب', name_en: 'Cubic Meter', code: 'M3', symbol: 'm3' },
    { name_ar: 'ليتر', name_en: 'Liter', code: 'LTR', symbol: 'l' },
    { name_ar: 'ثانية', name_en: 'Second', code: 'SEC', symbol: 'sec' },
    { name_ar: 'دقيقة', name_en: 'Minute', code: 'MIN', symbol: 'min' },
    { name_ar: 'ساعة', name_en: 'Hour', code: 'HOUR', symbol: 'hr' },
    { name_ar: 'يوم', name_en: 'Day', code: 'DAY', symbol: 'day' },
    { name_ar: 'مليمتر', name_en: 'Millimeter', code: 'MM', symbol: 'mm' },
    { name_ar: 'سنتيمتر', name_en: 'Centimeter', code: 'CM', symbol: 'cm' },
    { name_ar: 'متر', name_en: 'Meter', code: 'M', symbol: 'm' },
    { name_ar: 'كيلومتر', name_en: 'Kilometer', code: 'KM', symbol: 'km' },
    { name_ar: 'كيلو واط', name_en: 'Kilowatt', code: 'KW', symbol: 'kw' }
];

const LEGACY_DEFAULT_UNIT_AR_NAMES = new Set([
    'وحدة',
    'صندوق',
    'كرتون',
    'عبوة',
    'باكيت',
    'دستة',
    'زوج',
    'طقم',
    'رول',
    'بالة',
    'طبالي',
    'كيس',
    'شوال',
    'علبة',
    'زجاجة',
    'مرطبان',
    'ملليلتر',
    'جالون',
    'كيلوجرام',
    'قدم',
    'بوصة',
    'ياردة',
    'قدم مربع',
    'قدم مكعب',
    'أسبوع',
    'شهر',
    'ربع سنة',
    'سنة',
    'لوط',
    'خدمة'
]);

export class InventoryService {

    private static getUnitsColumnSet(): Set<string> {
        const cols = db.prepare("PRAGMA table_info('units')").all();
        return new Set((cols || []).map((c: any) => String(c.name)));
    }

    private static ensureStockDocumentSchema() {
        db.exec(`
            CREATE TABLE IF NOT EXISTS stock_documents (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                type TEXT CHECK(type IN ('ENTRY', 'ISSUE', 'DISPATCH')) NOT NULL,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                warehouse_id TEXT,
                status TEXT DEFAULT 'DRAFT',
                notes TEXT,
                created_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
            );
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS stock_document_lines (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 0,
                cost REAL DEFAULT 0,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES stock_documents(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES items(id)
            );
        `);

        db.exec(`CREATE INDEX IF NOT EXISTS idx_stock_documents_code ON stock_documents(code)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_stock_documents_date ON stock_documents(date)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_stock_documents_warehouse ON stock_documents(warehouse_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_stock_document_lines_document ON stock_document_lines(document_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_stock_document_lines_item ON stock_document_lines(item_id)`);
    }

    private static normalizeStockDocumentType(type: any): { requestedType: string; normalizedType: string } {
        const requestedType = String(type || '').toUpperCase();
        const normalizedType = requestedType === 'DISPATCH' ? 'ISSUE' : (requestedType || 'ENTRY');
        return { requestedType, normalizedType };
    }

    private static postStockDocumentImpact(params: {
        docId: string;
        code: string;
        requestedType: string;
        normalizedType: string;
        warehouse_id: string;
        date?: string;
        notes?: string;
        items: any[];
        created_by?: string;
    }) {
        const {
            docId,
            code,
            requestedType,
            normalizedType,
            warehouse_id,
            date,
            notes,
            items,
            created_by
        } = params;

        let totalValue = 0;
        items.forEach((i: any) => (totalValue += Math.abs(i.quantity) * Number(i.cost || 0)));

        const inventoryAccId = this.getInventoryAccount();
        const adjustmentAccId = this.getAdjustmentAccount();

        if (inventoryAccId && adjustmentAccId && totalValue > 0) {
            const journalLines = [];
            if (normalizedType === 'ENTRY') {
                journalLines.push({ account_id: inventoryAccId, debit: totalValue, credit: 0, line_description: `Stock Entry ${code}` });
                journalLines.push({ account_id: adjustmentAccId, debit: 0, credit: totalValue, line_description: `Stock Entry ${code}` });
            } else {
                journalLines.push({ account_id: adjustmentAccId, debit: totalValue, credit: 0, line_description: `Stock Issue ${code}` });
                journalLines.push({ account_id: inventoryAccId, debit: 0, credit: totalValue, line_description: `Stock Issue ${code}` });
            }

            JournalService.createJournalEntry(
                {
                    voucher_type: normalizedType === 'ENTRY' ? 'Stock Entry' : 'Stock Issue',
                    date: date || new Date().toISOString(),
                    reference_no: code,
                    description: notes || `${requestedType} Transaction`,
                    status: 'POSTED',
                    branch_id: null,
                    currency_id: this.getBaseCurrencyId(),
                    exchange_rate: 1
                },
                journalLines
            );
        }

        const stmt = db.prepare(`
            INSERT INTO inventory_transactions (
                id, date, transaction_date, type, ref_no, ref_document_type, ref_document_id,
                warehouse_id, item_id, quantity, cost_price, unit_cost, total_cost, description, notes, created_by
            ) VALUES (
                @id, @date, @transaction_date, @type, @ref_no, 'STOCK_DOCUMENT', @ref_doc_id,
                @warehouse_id, @item_id, @quantity, @cost_price, @unit_cost, @total_cost, @description, @notes, @created_by
            )
        `);

        const checkBalance = db.prepare('SELECT * FROM stock_balances WHERE item_id = ? AND warehouse_id = ?');
        const insertBalance = db.prepare(
            'INSERT INTO stock_balances (item_id, warehouse_id, quantity, avg_cost, last_updated) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
        );
        const updateBalance = db.prepare(
            'UPDATE stock_balances SET quantity = ?, avg_cost = ?, last_updated = CURRENT_TIMESTAMP WHERE item_id = ? AND warehouse_id = ?'
        );

        for (const item of items) {
            const qty = normalizedType === 'ENTRY' ? Math.abs(item.quantity) : -Math.abs(item.quantity);
            const cost = Number(item.cost || 0);
            const txDate = date || new Date().toISOString();
            const txNote = notes || `${requestedType} ${code}`;

            stmt.run({
                id: uuidv4(),
                date: txDate,
                transaction_date: txDate,
                type: normalizedType,
                ref_no: docId,
                ref_doc_id: docId,
                warehouse_id,
                item_id: item.item_id,
                quantity: qty,
                cost_price: cost,
                unit_cost: cost,
                total_cost: cost * Math.abs(qty),
                description: txNote,
                notes: txNote,
                created_by: created_by || 'Admin'
            });

            const current = checkBalance.get(item.item_id, warehouse_id);
            if (current) {
                const newQty = Number(current.quantity || 0) + qty;
                let newCost = Number(current.avg_cost || 0);

                if (normalizedType === 'ENTRY' && qty > 0) {
                    const totalInventoryValue = Number(current.quantity || 0) * Number(current.avg_cost || 0) + qty * cost;
                    newCost = newQty !== 0 ? totalInventoryValue / newQty : newCost;
                }

                updateBalance.run(newQty, newCost, item.item_id, warehouse_id);
            } else {
                insertBalance.run(item.item_id, warehouse_id, qty, cost);
            }
        }
    }

    // --- Units ---
    static getUnits(): Unit[] {
        const columns = this.getUnitsColumnSet();
        const orderBy = columns.has('name_ar') ? 'name_ar' : 'name';
        let units = db.prepare(`SELECT * FROM units ORDER BY ${orderBy}`).all();

        if (!units || units.length === 0) {
            this.seedDefaultUnits();
            units = db.prepare(`SELECT * FROM units ORDER BY ${orderBy}`).all();
        }

        const normalized = units.map((u: any) => ({
            ...u,
            name_ar: u.name_ar || u.name,
            code: u.code || u.symbol || '',
            is_base: !!u.is_base,
            is_active: u.is_active === undefined || u.is_active === null ? 1 : u.is_active
        }));

        // Keep current behavior for active user units, but hide old auto-seeded legacy units
        // when they are not used by any item as base/additional unit.
        const usedUnitIds = new Set<string>();
        try {
            const usedBase = db.prepare('SELECT DISTINCT base_unit_id as unit_id FROM items WHERE base_unit_id IS NOT NULL AND base_unit_id <> ""').all() as Array<{ unit_id: string }>;
            for (const row of usedBase) {
                if (row?.unit_id) usedUnitIds.add(String(row.unit_id));
            }
        } catch { /* no-op */ }

        try {
            const usedAdditional = db.prepare('SELECT DISTINCT unit_id FROM item_units WHERE unit_id IS NOT NULL AND unit_id <> ""').all() as Array<{ unit_id: string }>;
            for (const row of usedAdditional) {
                if (row?.unit_id) usedUnitIds.add(String(row.unit_id));
            }
        } catch { /* no-op */ }

        return normalized.filter((u: any) => {
            if (usedUnitIds.has(String(u.id || ''))) return true;
            return !LEGACY_DEFAULT_UNIT_AR_NAMES.has(String(u.name_ar || '').trim());
        });
    }

    static seedDefaultUnits() {
        const columns = this.getUnitsColumnSet();
        const hasNameAr = columns.has('name_ar');
        const hasName = columns.has('name');
        const hasNameEn = columns.has('name_en');
        const hasCode = columns.has('code');
        const hasSymbol = columns.has('symbol');
        const hasIsActive = columns.has('is_active');
        const hasIsBase = columns.has('is_base');

        if (!hasNameAr && !hasName) {
            throw new Error("units table does not support name/name_ar columns");
        }

        const insertColumns: string[] = ['id'];
        if (hasNameAr) insertColumns.push('name_ar');
        if (hasName) insertColumns.push('name');
        if (hasNameEn) insertColumns.push('name_en');
        if (hasCode) insertColumns.push('code');
        if (hasSymbol) insertColumns.push('symbol');
        if (hasIsActive) insertColumns.push('is_active');
        if (hasIsBase) insertColumns.push('is_base');

        const insertStmt = db.prepare(`
            INSERT INTO units (${insertColumns.join(', ')})
            VALUES (${insertColumns.map(c => '@' + c).join(', ')})
        `);

        const existsByCodeStmt = hasCode
            ? db.prepare('SELECT id FROM units WHERE UPPER(code) = UPPER(?) LIMIT 1')
            : null;
        const existsByNameArStmt = hasNameAr
            ? db.prepare('SELECT id FROM units WHERE LOWER(name_ar) = LOWER(?) LIMIT 1')
            : null;
        const existsByNameStmt = hasName
            ? db.prepare('SELECT id FROM units WHERE LOWER(name) = LOWER(?) LIMIT 1')
            : null;

        let inserted = 0;
        let skipped = 0;

        const runSeed = db.transaction(() => {
            for (const unit of DEFAULT_UNITS) {
                const alreadyExists =
                    (existsByCodeStmt && existsByCodeStmt.get(unit.code)) ||
                    (existsByNameArStmt && existsByNameArStmt.get(unit.name_ar)) ||
                    (existsByNameStmt && existsByNameStmt.get(unit.name_ar));

                if (alreadyExists) {
                    skipped++;
                    continue;
                }

                const row: any = { id: uuidv4() };

                if (hasNameAr) row.name_ar = unit.name_ar;
                if (hasName) row.name = unit.name_ar;
                if (hasNameEn) row.name_en = unit.name_en;
                if (hasCode) row.code = unit.code;
                if (hasSymbol) row.symbol = unit.symbol;
                if (hasIsActive) row.is_active = 1;
                if (hasIsBase) row.is_base = unit.code === 'PCS' ? 1 : 0;

                insertStmt.run(row);
                inserted++;
            }
        });

        runSeed();
        return { inserted, skipped, total: DEFAULT_UNITS.length };
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
        let items: any[] = [];

        try {
            items = db.prepare(`
                SELECT i.*, 
                       u.name_ar as base_unit_name, 
                       b.name_ar as brand_name,
                       c.name_ar as category_name,
                       COALESCE(ai.name_ar, ai.name, gai.name_ar, gai.name_en) as inventory_account_name,
                       COALESCE(asl.name_ar, asl.name, gas.name_ar, gas.name_en) as sales_account_name,
                       COALESCE(acg.name_ar, acg.name, gac.name_ar, gac.name_en) as cogs_account_name
                FROM items i
                LEFT JOIN units u ON i.base_unit_id = u.id
                LEFT JOIN brands b ON i.brand_id = b.id
                LEFT JOIN item_categories c ON i.category_id = c.id
                LEFT JOIN accounts ai ON i.inventory_account_id = ai.id
                LEFT JOIN accounts asl ON i.sales_account_id = asl.id
                LEFT JOIN accounts acg ON i.cogs_account_id = acg.id
                LEFT JOIN gl_chart_of_accounts gai ON i.inventory_account_id = gai.id
                LEFT JOIN gl_chart_of_accounts gas ON i.sales_account_id = gas.id
                LEFT JOIN gl_chart_of_accounts gac ON i.cogs_account_id = gac.id
                ORDER BY i.code
            `).all();
        } catch (error) {
            // Older/partially migrated databases may miss brands/units columns or tables.
            // Keep item lookup working by falling back to the core items projection.
            console.warn('[InventoryService] getItems extended query failed; using fallback query.', error);
            items = db.prepare(`
                SELECT *
                FROM items
                ORDER BY code
            `).all();
        }

        const toNumber = (value: any): number => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        return items.map((i: any) => ({
            ...i,
            cost_price: toNumber(i.cost_price),
            sale_price: toNumber(i.sale_price),
            min_price: toNumber(i.min_price),
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



    private static getTableColumnSet(tableName: string): Set<string> {
        const cols = db.prepare(`PRAGMA table_info('${tableName}')`).all();
        return new Set((cols || []).map((c: any) => String(c.name)));
    }

    private static resolveBaseUnitId(baseUnitId?: string | null): string | null {
        if (baseUnitId) return baseUnitId;

        const existingUnit = db.prepare('SELECT id FROM units ORDER BY name_ar LIMIT 1').get() as { id?: string } | undefined;
        if (existingUnit?.id) return existingUnit.id;

        try {
            InventoryService.seedDefaultUnits();
        } catch (error) {
            console.warn('[InventoryService] seedDefaultUnits failed while resolving base unit.', error);
        }

        const seededUnit = db.prepare('SELECT id FROM units ORDER BY name_ar LIMIT 1').get() as { id?: string } | undefined;
        return seededUnit?.id || null;
    }

    static createItem(item: any): any {
        const resolvedBaseUnitId = InventoryService.resolveBaseUnitId(item.base_unit_id);

        if (!resolvedBaseUnitId) {
            throw new Error('تعذر تحديد الوحدة الأساسية. الرجاء إضافة وحدة قياس أولاً.');
        }

        const newItem = {
            id: uuidv4(),
            code: String(item.code || '').trim(),
            name_ar: String(item.name_ar || '').trim(),
            name_en: item.name_en || '',
            trade_name: item.trade_name || '',
            name_he: item.name_he || '',
            category_id: item.category_id || null,
            brand_id: item.brand_id || null,
            type: item.type || 'Goods',
            base_unit_id: resolvedBaseUnitId,
            cost_price: String(item.cost_price || 0),
            standard_cost: String(item.standard_cost || 0),
            costing_method: item.costing_method || 'WEIGHTED_AVG',
            sale_price: String(item.sale_price || 0),
            min_price: String(item.min_price || 0),
            floor_price: String(item.floor_price || 0),
            min_stock_level: item.min_stock ?? item.min_stock_level ?? 0,
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
        };

        if (!newItem.code) throw new Error('رمز الصنف مطلوب.');
        if (!newItem.name_ar) throw new Error('اسم الصنف بالعربية مطلوب.');

        const createTx = db.transaction(() => {
            const itemColumns = InventoryService.getTableColumnSet('items');
            const insertableEntries = Object.entries(newItem).filter(([key]) => itemColumns.has(key));
            if (insertableEntries.length === 0) {
                throw new Error('تعذر الحفظ: أعمدة جدول الأصناف غير متوافقة.');
            }

            const insertKeys = insertableEntries.map(([key]) => key);
            const placeholders = insertKeys.map((key) => `@${key}`).join(', ');
            const payload = Object.fromEntries(insertableEntries);

            db.prepare(`
                INSERT INTO items (${insertKeys.join(', ')})
                VALUES (${placeholders})
            `).run(payload);

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

            if (item.alternatives && item.alternatives.length > 0) {
                InventoryService.saveItemAlternatives(newItem.id, item.alternatives);
            }

            if (item.attributes) {
                InventoryService.saveItemAttributes(newItem.id, item.attributes);
            }
        });

        try {
            createTx();
        } catch (error: any) {
            if (String(error?.message || '').includes('UNIQUE constraint failed: items.code')) {
                throw new Error(`رمز الصنف مستخدم مسبقًا: ${newItem.code}`);
            }
            throw error;
        }

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
            const id = item.id;
            if (!id) throw new Error('معرف الصنف مطلوب للتعديل.');

            const resolvedBaseUnitId = InventoryService.resolveBaseUnitId(item.base_unit_id);

            const updatePayload: Record<string, any> = {
                id,
                code: item.code,
                name_ar: item.name_ar,
                name_en: item.name_en || '',
                trade_name: item.trade_name || '',
                name_he: item.name_he || '',
                category_id: item.category_id || null,
                brand_id: item.brand_id || null,
                type: item.type || 'Goods',
                base_unit_id: resolvedBaseUnitId,
                cost_price: String(item.cost_price || 0),
                standard_cost: String(item.standard_cost || 0),
                costing_method: item.costing_method || 'WEIGHTED_AVG',
                sale_price: String(item.sale_price || 0),
                min_price: String(item.min_price || 0),
                floor_price: String(item.floor_price || 0),
                min_stock_level: item.min_stock ?? item.min_stock_level ?? 0,
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
            };

            const itemColumns = InventoryService.getTableColumnSet('items');
            const setEntries = Object.entries(updatePayload).filter(([key]) => key !== 'id' && itemColumns.has(key));
            if (setEntries.length === 0) {
                throw new Error('تعذر التعديل: أعمدة جدول الأصناف غير متوافقة.');
            }

            const setSql = setEntries.map(([key]) => `${key} = @${key}`).join(', ');
            const finalPayload = Object.fromEntries([['id', id], ...setEntries]);

            db.prepare(`UPDATE items SET ${setSql} WHERE id = @id`).run(finalPayload);

            db.prepare('DELETE FROM item_units WHERE item_id = ?').run(id);
            db.prepare('DELETE FROM item_prices WHERE item_id = ?').run(id);
            db.prepare('DELETE FROM item_kits WHERE parent_item_id = ?').run(id);
            db.prepare('DELETE FROM item_alternatives WHERE item_id = ?').run(id);

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

            if (item.attributes) {
                InventoryService.saveItemAttributes(id, item.attributes);
            }

            if (item.alternatives && item.alternatives.length > 0) {
                InventoryService.saveItemAlternatives(id, item.alternatives);
            }
        });

        try {
            updateTx();
        } catch (error: any) {
            if (String(error?.message || '').includes('UNIQUE constraint failed: items.code')) {
                throw new Error(`رمز الصنف مستخدم مسبقًا: ${item.code || ''}`);
            }
            throw error;
        }

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
        this.ensureStockDocumentSchema();
        // doc: { type, warehouse_id, date, notes, items: [], status? }
        const { type, warehouse_id, date, notes, items, created_by } = doc;
        const { requestedType, normalizedType } = this.normalizeStockDocumentType(type);
        const status = doc.status || 'POSTED'; // Default to POSTED if not specified

        // Validate Period
        if (date) this.validateTransactionDate(date);

        // Generate Code
        let code = doc.code;
        if (!code) {
            const codePrefix = normalizedType === 'ENTRY'
                ? 'SE'
                : (requestedType === 'DISPATCH' ? 'DSP' : 'SI');
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
                type: normalizedType,
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
                this.postStockDocumentImpact({
                    docId,
                    code,
                    requestedType,
                    normalizedType,
                    warehouse_id,
                    date,
                    notes,
                    items,
                    created_by
                });
            }
        });

        runTx();
        return { success: true, id: docId, code };
    }

    static updateStockDocument(doc: any) {
        this.ensureStockDocumentSchema();
        const { id, type, warehouse_id, date, notes, items, created_by } = doc || {};
        if (!id) throw new Error('Missing stock document id');

        const existing = db.prepare('SELECT * FROM stock_documents WHERE id = ?').get(id) as any;
        if (!existing) throw new Error('Stock document not found');

        const existingStatus = String(existing.status || '').toUpperCase();
        if (existingStatus === 'POSTED') {
            throw new Error('لا يمكن تعديل سند إرسال مرحّل. استخدم التحويل إلى فاتورة أو إنشاء سند استلام لعكس الإرسالية.');
        }

        const { requestedType, normalizedType } = this.normalizeStockDocumentType(type || existing.type);
        const status = String(doc.status || existing.status || 'DRAFT').toUpperCase();
        const effectiveDate = date || existing.date || new Date().toISOString();
        const effectiveWarehouse = warehouse_id || existing.warehouse_id;
        const code = String(existing.code || existing.ref_no || '').trim();
        const safeItems = Array.isArray(items) ? items : [];

        if (!effectiveWarehouse) throw new Error('Missing warehouse');
        if (safeItems.length === 0) throw new Error('Missing document lines');
        if (effectiveDate) this.validateTransactionDate(effectiveDate);

        const runTx = db.transaction(() => {
            db.prepare(`
                UPDATE stock_documents
                SET type = @type,
                    date = @date,
                    warehouse_id = @warehouse_id,
                    status = @status,
                    notes = @notes,
                    created_by = COALESCE(@created_by, created_by),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `).run({
                id,
                type: normalizedType,
                date: effectiveDate,
                warehouse_id: effectiveWarehouse,
                status,
                notes: notes ?? existing.notes ?? '',
                created_by: created_by || existing.created_by || 'Admin'
            });

            db.prepare('DELETE FROM stock_document_lines WHERE document_id = ?').run(id);
            const insertLine = db.prepare(`
                INSERT INTO stock_document_lines (id, document_id, item_id, quantity, cost, notes)
                VALUES (@id, @document_id, @item_id, @quantity, @cost, @notes)
            `);
            for (const item of safeItems) {
                insertLine.run({
                    id: uuidv4(),
                    document_id: id,
                    item_id: item.item_id,
                    quantity: item.quantity,
                    cost: item.cost || 0,
                    notes: item.notes || ''
                });
            }

            if (status === 'POSTED') {
                this.postStockDocumentImpact({
                    docId: id,
                    code,
                    requestedType,
                    normalizedType,
                    warehouse_id: effectiveWarehouse,
                    date: effectiveDate,
                    notes: notes ?? existing.notes ?? '',
                    items: safeItems,
                    created_by: created_by || existing.created_by || 'Admin'
                });
            } else {
                db.prepare('DELETE FROM inventory_transactions WHERE ref_document_type = ? AND ref_document_id = ?').run('STOCK_DOCUMENT', id);
            }
        });

        runTx();
        return { success: true, id, code, status };
    }

    static getGoodsReceipts() {
        this.ensureStockDocumentSchema();
        return db.prepare(`
            SELECT sd.*, w.name_ar as warehouse_name
            FROM stock_documents sd
            LEFT JOIN warehouses w ON sd.warehouse_id = w.id
            WHERE sd.type = 'ENTRY'
            ORDER BY sd.date DESC
        `).all();
    }

    static getDispatches() {
        this.ensureStockDocumentSchema();
        return db.prepare(`
            SELECT sd.*, w.name_ar as warehouse_name
            FROM stock_documents sd
            LEFT JOIN warehouses w ON sd.warehouse_id = w.id
            WHERE sd.type = 'DISPATCH'
               OR (sd.type = 'ISSUE' AND sd.code LIKE 'DSP-%')
            ORDER BY sd.date DESC
        `).all();
    }

    static getStockDocument(id: string) {
        this.ensureStockDocumentSchema();
        const header = db.prepare(`
            SELECT sd.*, w.name_ar as warehouse_name
            FROM stock_documents sd
            LEFT JOIN warehouses w ON sd.warehouse_id = w.id
            WHERE sd.id = ?
        `).get(id);

        if (!header) return null;

        const lines = db.prepare(`
            SELECT
                l.*,
                i.code as item_code,
                i.name_ar as item_name,
                i.base_unit_id as unit_id,
                u.name_ar as unit_name
            FROM stock_document_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON i.base_unit_id = u.id
            WHERE l.document_id = ?
            ORDER BY l.rowid ASC
        `).all(id);

        return { header, lines };
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
        const txDate = date || new Date().toISOString();

        // Validate Period
        if (date) this.validateTransactionDate(date);

        const runTransaction = db.transaction(() => {
            // 1. Log Transaction
            db.prepare(`
                INSERT INTO inventory_transactions (
                    id, date, transaction_date, type, ref_no, ref_document_id, item_id, warehouse_id, 
                    quantity, cost_price, unit_cost, total_cost, description, notes, created_by,
                    batch_id, serial_id
                ) VALUES (
                    @id, @date, @transaction_date, @type, @ref_no, @ref_document_id, @item_id, @warehouse_id, 
                    @quantity, @cost_price, @unit_cost, @total_cost, @description, @notes, @created_by,
                    @batch_id, @serial_id
                )
            `).run({
                id: uuidv4(),
                date: txDate,
                transaction_date: txDate,
                type,
                ref_no,
                ref_document_id: ref_no,
                item_id,
                warehouse_id,
                quantity,
                cost_price: String(cost),
                unit_cost: String(cost),
                total_cost: String(cost * Math.abs(quantity)),
                description,
                notes: description || null,
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
                    SET quantity = @qty, avg_cost = @cost, last_updated = CURRENT_TIMESTAMP
                    WHERE item_id = @itemId AND warehouse_id = @whId
                `).run({ qty: newQty, cost: String(newCost), itemId: item_id, whId: warehouse_id });

            } else {
                db.prepare(`
                    INSERT INTO stock_balances (item_id, warehouse_id, quantity, avg_cost, last_updated)
                    VALUES (@itemId, @whId, @qty, @cost, CURRENT_TIMESTAMP)
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

    // --- Transfers ---
    private static getStockTransferColumnSet(): Set<string> {
        const cols = db.prepare("PRAGMA table_info('stock_transfers')").all();
        return new Set((cols || []).map((c: any) => String(c.name)));
    }

    private static ensureStockTransferSchema() {
        const cols = this.getStockTransferColumnSet();
        if (!cols.has('request_type')) {
            try {
                db.exec(`ALTER TABLE stock_transfers ADD COLUMN request_type TEXT DEFAULT 'TRANSFER'`);
            } catch {
                // Ignore when column already exists in concurrent migrations.
            }
        }
    }

    static getTransferRequests(filters?: any) {
        this.ensureStockTransferSchema();

        const transferCols = this.getStockTransferColumnSet();
        const hasRequestType = transferCols.has('request_type');

        const requestedStatus = String(filters?.status || 'ALL').trim().toUpperCase();
        const requestedType = String(filters?.request_type || filters?.type || 'ALL').trim().toUpperCase();
        const queryText = String(filters?.query || '').trim().toLowerCase();

        const clauses: string[] = ['1=1'];
        const params: any[] = [];

        if (requestedStatus && requestedStatus !== 'ALL') {
            clauses.push("UPPER(COALESCE(t.status, '')) = ?");
            params.push(requestedStatus);
        }

        if (hasRequestType && requestedType && requestedType !== 'ALL') {
            clauses.push("UPPER(COALESCE(t.request_type, 'TRANSFER')) = ?");
            params.push(requestedType);
        }

        if (queryText) {
            clauses.push(`
                (
                    LOWER(COALESCE(t.code, '')) LIKE ?
                    OR LOWER(COALESCE(t.notes, '')) LIKE ?
                    OR LOWER(COALESCE(fw.name_ar, fw.name, fw.code, '')) LIKE ?
                    OR LOWER(COALESCE(tw.name_ar, tw.name, tw.code, '')) LIKE ?
                )
            `);
            const likeQuery = `%${queryText}%`;
            params.push(likeQuery, likeQuery, likeQuery, likeQuery);
        }

        const requestTypeSelect = hasRequestType
            ? "COALESCE(t.request_type, 'TRANSFER')"
            : "'TRANSFER'";

        return db.prepare(`
            SELECT
                t.*,
                ${requestTypeSelect} AS request_type,
                COALESCE(fw.name_ar, fw.name, fw.code, t.from_warehouse_id) AS from_warehouse_name,
                COALESCE(tw.name_ar, tw.name, tw.code, t.to_warehouse_id) AS to_warehouse_name,
                COUNT(sti.id) AS lines_count,
                COALESCE(SUM(sti.quantity), 0) AS total_quantity,
                COALESCE(SUM(sti.received_quantity), 0) AS received_quantity,
                COALESCE(SUM(CASE WHEN COALESCE(sti.quantity, 0) > COALESCE(sti.received_quantity, 0) THEN 1 ELSE 0 END), 0) AS pending_lines
            FROM stock_transfers t
            LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
            LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
            LEFT JOIN stock_transfer_items sti ON sti.transfer_id = t.id
            WHERE ${clauses.join(' AND ')}
            GROUP BY t.id
            ORDER BY datetime(t.date) DESC, t.code DESC
        `).all(...params);
    }

    static getTransferRequest(id: string) {
        this.ensureStockTransferSchema();

        const transferCols = this.getStockTransferColumnSet();
        const hasRequestType = transferCols.has('request_type');
        const requestTypeSelect = hasRequestType
            ? "COALESCE(t.request_type, 'TRANSFER')"
            : "'TRANSFER'";

        const header = db.prepare(`
            SELECT
                t.*,
                ${requestTypeSelect} AS request_type,
                COALESCE(fw.name_ar, fw.name, fw.code, t.from_warehouse_id) AS from_warehouse_name,
                COALESCE(tw.name_ar, tw.name, tw.code, t.to_warehouse_id) AS to_warehouse_name
            FROM stock_transfers t
            LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
            LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
            WHERE t.id = ?
        `).get(id);

        if (!header) return null;

        const lines = db.prepare(`
            SELECT
                sti.*,
                COALESCE(i.code, '') AS item_code,
                COALESCE(i.name_ar, i.name, i.name_en, '') AS item_name,
                COALESCE(u.name_ar, u.name, u.name_en, '') AS unit_name,
                (COALESCE(sti.quantity, 0) - COALESCE(sti.received_quantity, 0)) AS pending_quantity
            FROM stock_transfer_items sti
            LEFT JOIN items i ON i.id = sti.item_id
            LEFT JOIN units u ON u.id = sti.unit_id
            WHERE sti.transfer_id = ?
            ORDER BY sti.rowid
        `).all(id);

        return { header, lines };
    }

    static createTransferRequest(transfer: any) {
        this.ensureStockTransferSchema();

        const { type, from_warehouse_id, to_warehouse_id, items, date, notes, created_by } = transfer;
        const requestedType = String(type || 'TRANSIT').toUpperCase();
        const isDirect = requestedType === 'DIRECT';
        const isInternalOrder = requestedType === 'INTERNAL_ORDER';
        const transferId = uuidv4();
        const code = `TR-${Date.now().toString().slice(-6)}`;

        const transferCols = this.getStockTransferColumnSet();
        const hasRequestType = transferCols.has('request_type');
        const requestType = isInternalOrder
            ? 'INTERNAL_ORDER'
            : (isDirect ? 'DIRECT' : 'TRANSIT');

        const initialStatus = isDirect
            ? 'COMPLETED'
            : (isInternalOrder ? 'PENDING' : 'IN_TRANSIT');

        const runTransfer = db.transaction(() => {
            if (hasRequestType) {
                db.prepare(`
                    INSERT INTO stock_transfers (id, code, date, from_warehouse_id, to_warehouse_id, status, notes, created_by, request_type)
                    VALUES (@id, @code, @date, @from_warehouse_id, @to_warehouse_id, @status, @notes, @created_by, @request_type)
                `).run({
                    id: transferId,
                    code,
                    date: date || new Date().toISOString(),
                    from_warehouse_id,
                    to_warehouse_id,
                    status: initialStatus,
                    notes,
                    created_by: created_by || 'Admin',
                    request_type: requestType
                });
            } else {
                db.prepare(`
                    INSERT INTO stock_transfers (id, code, date, from_warehouse_id, to_warehouse_id, status, notes, created_by)
                    VALUES (@id, @code, @date, @from_warehouse_id, @to_warehouse_id, @status, @notes, @created_by)
                `).run({
                    id: transferId,
                    code,
                    date: date || new Date().toISOString(),
                    from_warehouse_id,
                    to_warehouse_id,
                    status: initialStatus,
                    notes,
                    created_by: created_by || 'Admin'
                });
            }

            (items || []).forEach((item: any) => {
                db.prepare(`
                    INSERT INTO stock_transfer_items (id, transfer_id, item_id, unit_id, quantity, received_quantity)
                    VALUES (@id, @transferId, @itemId, @unitId, @qty, @receivedQty)
                `).run({
                    id: uuidv4(),
                    transferId: transferId,
                    itemId: item.item_id,
                    unitId: item.unit_id || null,
                    qty: item.quantity,
                    receivedQty: isDirect ? item.quantity : 0
                });

                // Internal orders are request-only and should not affect stock balances yet.
                if (isInternalOrder) return;

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

                if (isDirect) {
                    this.addStockTransaction({
                        date: date || new Date().toISOString(),
                        type: 'TRANSFER_IN',
                        ref_no: transferId,
                        warehouse_id: to_warehouse_id,
                        item_id: item.item_id,
                        quantity: item.quantity,
                        cost: unitCost,
                        description: `Transfer IN from ${from_warehouse_id} (${code})`,
                        created_by: created_by || 'Admin'
                    });
                }
            });
        });

        runTransfer();
        return { success: true, id: transferId, code, status: initialStatus, request_type: requestType };
    }

    // Receive Transit Transfer
    static receiveTransfer(data: any) {
        const { transfer_id, items, received_date, created_by } = data;
        // items: [{ item_id, received_quantity }] (Partial receipt support)

        const runReceive = db.transaction(() => {
            const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transfer_id);
            if (!transfer || transfer.status !== 'IN_TRANSIT') throw new Error("Transfer not found or not in transit");

            (items || []).forEach((recItem: any) => {
                const line = db.prepare('SELECT * FROM stock_transfer_items WHERE transfer_id = ? AND item_id = ?').get(transfer_id, recItem.item_id);
                if (!line) return;

                db.prepare('UPDATE stock_transfer_items SET received_quantity = received_quantity + ? WHERE id = ?')
                    .run(recItem.received_quantity, line.id);

                const outTx = db.prepare("SELECT unit_cost FROM inventory_transactions WHERE ref_document_id = ? AND item_id = ? AND type = 'TRANSFER_OUT'").get(transfer_id, recItem.item_id);
                const cost = outTx ? Number(outTx.unit_cost) : 0;

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

            const remaining = db.prepare('SELECT count(*) as count FROM stock_transfer_items WHERE transfer_id = ? AND quantity > received_quantity').get(transfer_id);
            if (remaining.count === 0) {
                db.prepare("UPDATE stock_transfers SET status = 'COMPLETED' WHERE id = ?").run(transfer_id);
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

