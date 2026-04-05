import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Account {
    id: string;
    account_code: string;
    name_ar: string;
    name_en?: string;
    parent_id?: string;
    account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    is_transactional: number;
    currency_id?: string;
    requires_cost_center: number;
    balance: number;
    system_type?: string;
}

export class AccountService {

    static getAccounts(): Account[] {
        return db.prepare('SELECT * FROM gl_chart_of_accounts ORDER BY account_code ASC').all() as Account[];
    }

    static getAccountTree() {
        const accounts = this.getAccounts();
        const map = new Map<string, any>();
        const roots: any[] = [];

        // Initialize map
        accounts.forEach(acc => {
            map.set(acc.id, { ...acc, children: [] });
        });

        // Build hierarchy
        accounts.forEach(acc => {
            const node = map.get(acc.id);
            if (acc.parent_id && map.has(acc.parent_id)) {
                map.get(acc.parent_id).children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }

    static createAccount(data: any) {
        if (!data.account_code || !data.name_ar) throw new Error("Code and Name (AR) are required");

        // Check duplicate code
        const existing = db.prepare('SELECT id FROM gl_chart_of_accounts WHERE account_code = ?').get(data.account_code);
        if (existing) throw new Error("Account Code already exists");

        let validCurrencyId = data.currency_id || null;
        if (validCurrencyId) {
            const exists = db.prepare('SELECT id FROM currencies WHERE id = ?').get(validCurrencyId);
            if (!exists) {
                const byCode = db.prepare('SELECT id FROM currencies WHERE code = ?').get(validCurrencyId);
                if (byCode) validCurrencyId = byCode.id;
                else validCurrencyId = null;
            }
        }

        const id = uuidv4();
        const stmt = db.prepare(`
        INSERT INTO gl_chart_of_accounts (
            id, account_code, name_ar, name_en, parent_id, account_type, 
            is_transactional, currency_id, requires_cost_center, balance, system_type
        ) VALUES (
            @id, @account_code, @name_ar, @name_en, @parent_id, @account_type, 
            @is_transactional, @currency_id, @requires_cost_center, 0, @system_type
        )
    `);

        stmt.run({
            id,
            account_code: data.account_code,
            name_ar: data.name_ar,
            name_en: data.name_en || null,
            parent_id: data.parent_id || null,
            account_type: data.account_type,
            is_transactional: data.is_transactional ? 1 : 0,
            currency_id: validCurrencyId,
            requires_cost_center: data.requires_cost_center ? 1 : 0,
            system_type: data.system_type || null
        });

        return id;
    }

    static updateAccount(data: any) {
        let validCurrencyId = data.currency_id || null;

        if (validCurrencyId) {
            // Validate Currency FK
            const exists = db.prepare('SELECT id FROM currencies WHERE id = ?').get(validCurrencyId);
            if (!exists) {
                // Start Self-Repair: Check if it's a Code (e.g. 'ILS' from legacy seed)
                const byCode = db.prepare('SELECT id FROM currencies WHERE code = ?').get(validCurrencyId);
                if (byCode) {
                    console.log(`[AccountService] Auto-fixed Currency Code '${validCurrencyId}' to UUID '${byCode.id}'`);
                    validCurrencyId = byCode.id;
                } else {
                    console.warn(`[AccountService] Invalid Currency ID '${validCurrencyId}' removed.`);
                    validCurrencyId = null;
                }
            }
        }

        const stmt = db.prepare(`
        UPDATE gl_chart_of_accounts 
        SET name_ar = @name_ar, name_en = @name_en, 
            is_transactional = @is_transactional, requires_cost_center = @requires_cost_center,
            currency_id = @currency_id,
            system_type = @system_type
        WHERE id = @id
      `);
        // Note: Changing Parent or Code usually requires validation of children and integrity. Skipping for now.

        stmt.run({
            id: data.id,
            name_ar: data.name_ar,
            name_en: data.name_en,
            is_transactional: data.is_transactional ? 1 : 0,
            requires_cost_center: data.requires_cost_center ? 1 : 0,
            currency_id: validCurrencyId,
            system_type: data.system_type || null
        });
        return { success: true };
    }

    static deleteAccount(id: string) {
        // Check if has children
        const children = db.prepare('SELECT count(*) as c FROM gl_chart_of_accounts WHERE parent_id = ?').get(id).c;
        if (children > 0) throw new Error("Cannot delete account with sub-accounts");

        // Check transaction lines? (Skipping for now or assuming FK check will fail if enforced)

        db.prepare('DELETE FROM gl_chart_of_accounts WHERE id = ?').run(id);
        return { success: true };
    }
}
