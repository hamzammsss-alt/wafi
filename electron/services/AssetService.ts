import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { JournalService } from './JournalService';

export class AssetService {

    // --- Asset Management ---

    static getAssets() {
        return db.prepare('SELECT * FROM assets ORDER BY name').all();
    }

    static saveAsset(data: any) {
        const {
            id, code, name, type, category_id,
            purchase_date, purchase_cost, salvage_value,
            life_years, depreciation_rate, status,
            payment_method, payment_account_id
        } = data;

        if (id && id !== 0 && id !== '0') {
            // Update
            const stmt = db.prepare(`
                UPDATE assets 
                SET code = @code, name = @name, type = @type, category_id = @category_id,
                    purchase_date = @purchase_date, purchase_cost = @purchase_cost, 
                    salvage_value = @salvage_value, life_years = @life_years, 
                    depreciation_rate = @depreciation_rate, status = @status
                WHERE id = @id
            `);
            stmt.run({ ...data });
        } else {
            // Insert
            const stmt = db.prepare(`
                INSERT INTO assets (
                    id, code, name, type, category_id,
                    purchase_date, purchase_cost, salvage_value, 
                    life_years, depreciation_rate, status,
                    accumulated_depreciation, book_value
                )
                VALUES (
                    @id, @code, @name, @type, @category_id,
                    @purchase_date, @purchase_cost, @salvage_value,
                    @life_years, @depreciation_rate, @status,
                    0, @purchase_cost
                )
            `);
            // Generate UUID if not provided or if 0
            const newId = uuidv4();
            stmt.run({
                ...data,
                id: newId,
                status: status || 'Active',
                category_id: category_id || null, // Ensure null if empty
                type: type || null
            });

            // --- GL Integration ---
            // Only if it's a new asset and we have payment info + category linked
            if (payment_method && payment_account_id && category_id) {
                try {
                    const category = db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(category_id);
                    if (category && category.asset_account_id) {
                        const amount = Number(purchase_cost);
                        if (amount > 0) {
                            // 1. Create Journal Entry via JournalService
                            JournalService.createJournalEntry({
                                voucher_type: 'JV', // Asset Purchase Journal
                                date: purchase_date,
                                reference_no: `AST-${code}`,
                                description: `Purchase Asset: ${name}`,
                                status: 'POSTED',
                                branch_id: '1',
                                currency_id: 'ILS', // Default, should ideally come from form
                                exchange_rate: 1,
                                created_by: 'SYSTEM'
                            }, [
                                {
                                    account_id: category.asset_account_id,
                                    debit: amount,
                                    credit: 0,
                                    line_description: `Asset Cost: ${name}`
                                },
                                {
                                    account_id: payment_account_id,
                                    debit: 0,
                                    credit: amount,
                                    line_description: `Payment for Asset: ${name}`
                                }
                            ]);

                            // 2. Update Account Balances (Manual update for now to ensure COA reflects it)
                            // Asset Account (Debit -> Increase)
                            db.prepare('UPDATE accounts SET balance = COALESCE(balance, 0) + ? WHERE id = ?')
                                .run(amount, category.asset_account_id);

                            // Payment Account (Credit -> Decrease)
                            db.prepare('UPDATE accounts SET balance = COALESCE(balance, 0) - ? WHERE id = ?')
                                .run(amount, payment_account_id);
                        }
                    }
                } catch (err) {
                    console.error("Failed to create GL entry for asset", err);
                }
            }
        }
        return { success: true };
    }

    // --- Categories ---

    static getCategories() {
        const categories = db.prepare('SELECT * FROM asset_categories ORDER BY code').all();
        if (categories.length === 0) {
            // Lazy Seed if empty
            const seed = [
                { code: 'GRP-001', name_ar: 'سيارات', name_en: 'Vehicles', rate: 20 },
                { code: 'GRP-002', name_ar: 'أجهزة حاسوب', name_en: 'Computers', rate: 25 },
                { code: 'GRP-003', name_ar: 'أثاث ومفروشات', name_en: 'Furniture', rate: 10 },
                { code: 'GRP-004', name_ar: 'آلات ومعدات', name_en: 'Machinery', rate: 15 },
                { code: 'GRP-005', name_ar: 'مباني وإنشاءات', name_en: 'Buildings', rate: 5 }
            ];
            const stmt = db.prepare(`
                INSERT INTO asset_categories (id, code, name_ar, name_en, depreciation_rate, depreciation_method)
                VALUES (?, ?, ?, ?, ?, 'Straight Line')
            `);
            const updateStmt = db.prepare("UPDATE asset_categories SET depreciation_rate = ? WHERE code = ?");

            seed.forEach(cat => {
                stmt.run(uuidv4(), cat.code, cat.name_ar, cat.name_en, cat.rate);
            });
            return db.prepare('SELECT * FROM asset_categories ORDER BY code').all();
        }
        return categories;
    }

    static saveCategory(data: any) {
        if (data.id) {
            const stmt = db.prepare(`
                UPDATE asset_categories
                SET code = @code, name_ar = @name_ar, name_en = @name_en, 
                    depreciation_method = @depreciation_method, depreciation_rate = @depreciation_rate,
                    asset_account_id = @asset_account_id,
                    accumulated_depreciation_account_id = @accumulated_depreciation_account_id,
                    depreciation_expense_account_id = @depreciation_expense_account_id
                WHERE id = @id
            `);
            stmt.run(data);
        } else {
            const stmt = db.prepare(`
                INSERT INTO asset_categories (
                    id, code, name_ar, name_en, depreciation_method, depreciation_rate,
                    asset_account_id, accumulated_depreciation_account_id, depreciation_expense_account_id
                )
                VALUES (
                    @id, @code, @name_ar, @name_en, @depreciation_method, @depreciation_rate,
                    @asset_account_id, @accumulated_depreciation_account_id, @depreciation_expense_account_id
                )
            `);
            stmt.run({ ...data, id: uuidv4() });
        }
        return { success: true };
    }

    // --- Helpers ---

    static getNextCode() {
        try {
            const last = db.prepare('SELECT code FROM assets ORDER BY created_at DESC LIMIT 1').get();
            if (!last || !last.code) return 'AST-0001';

            const parts = last.code.split('-');
            if (parts.length === 2) {
                const prefix = parts[0];
                const num = parseInt(parts[1]);
                if (!isNaN(num)) {
                    return `${prefix}-${String(num + 1).padStart(4, '0')}`;
                }
            }
            return 'AST-' + Date.now().toString().slice(-4);
        } catch (e) {
            return 'AST-0001';
        }
    }

    // --- Depreciation ---

    static calculateDepreciation(assetId: string) {
        // Simple Straight Line: (Cost - Salvage) / Life
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
        if (!asset) throw new Error("Asset not found");

        const cost = Number(asset.purchase_cost);
        const salvage = Number(asset.salvage_value);
        const lifeYears = Number(asset.life_years);

        if (lifeYears <= 0) return 0;

        const yearlyDepreciation = (cost - salvage) / lifeYears;
        const monthlyDepreciation = yearlyDepreciation / 12;

        return {
            yearly: yearlyDepreciation.toFixed(2),
            monthly: monthlyDepreciation.toFixed(2)
        };
    }

    static postDepreciation(assetId: string, amount: number, date: string) {
        // In a real app, this would create a Journal Entry
        // Dr Depreciation Expense
        // Cr Accumulated Depreciation

        const stmt = db.prepare(`
            INSERT INTO asset_depreciations (id, asset_id, date, amount)
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(uuidv4(), assetId, date, amount.toString());
        return { success: true };
    }
}
