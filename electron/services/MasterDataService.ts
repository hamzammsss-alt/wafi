import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

export class MasterDataService {

    // ================================================================
    // 1. BANKS
    // ================================================================
    static getBanks() {
        return db.prepare('SELECT * FROM banks ORDER BY name_ar').all();
    }

    static saveBank(data: any) {
        if (!data.id) {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO banks (
                    id, name_ar, name_en, swift_code, is_local, 
                    bank_code, branch_code, name_he, routing_no, address
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                data.name_ar,
                data.name_en,
                data.swift_code,
                data.is_local ? 1 : 0,
                data.bank_code,
                data.branch_code,
                data.name_he,
                data.routing_no,
                data.address
            );
            return { success: true, id };
        } else {
            db.prepare(`
                UPDATE banks SET 
                    name_ar=?, name_en=?, swift_code=?, is_local=?,
                    bank_code=?, branch_code=?, name_he=?, routing_no=?, address=?
                WHERE id=?
            `).run(
                data.name_ar,
                data.name_en,
                data.swift_code,
                data.is_local ? 1 : 0,
                data.bank_code,
                data.branch_code,
                data.name_he,
                data.routing_no,
                data.address,
                data.id
            );
            return { success: true, id: data.id };
        }
    }

    static deleteBank(id: string) {
        db.prepare('DELETE FROM banks WHERE id = ?').run(id);
        return { success: true };
    }

    static async importBanksFromHTML(filePath: string) {
        const fs = require('fs');
        const cheerio = require('cheerio');

        if (!fs.existsSync(filePath)) throw new Error('File not found');

        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);
        const rows = $('table.list tr');

        let valid = 0, updated = 0, inserted = 0;

        const checkStmt = db.prepare('SELECT id FROM banks WHERE bank_code = ? AND branch_code = ?');
        const insertStmt = db.prepare(`
            INSERT INTO banks (id, name_ar, name_en, name_he, bank_code, branch_code, swift_code, routing_no, address, is_local)
            VALUES (@id, @name_ar, @name_en, @name_he, @bank_code, @branch_code, @swift_code, @routing_no, @address, 1)
        `);
        const updateStmt = db.prepare(`
            UPDATE banks SET 
                name_ar = @name_ar,
                name_en = @name_en,
                name_he = @name_he,
                swift_code = @swift_code,
                routing_no = @routing_no,
                address = @address
            WHERE id = @id
        `);

        // Transaction for speed
        const runImport = db.transaction(() => {
            rows.each((i: number, el: any) => {
                const tds = $(el).find('td');
                if (tds.length === 0) return;
                if ($(el).find('.tableHeader').length > 0) return;

                const txt = (idx: number) => $(tds[idx]).text().trim();
                const bankCode = txt(1);
                // Important: Branch code is column 2
                const branchCode = txt(2);

                if (!bankCode || bankCode === '00' || bankCode === 'بنك') return;

                const data: any = {
                    bank_code: bankCode,
                    branch_code: branchCode || '',
                    name_ar: txt(3),
                    name_en: txt(6),
                    name_he: txt(7),
                    swift_code: txt(17),
                    routing_no: txt(18),
                    address: txt(19)
                };

                valid++;
                const existing = checkStmt.get(data.bank_code, data.branch_code);

                if (existing) {
                    updateStmt.run({ ...data, id: existing.id });
                    updated++;
                } else {
                    insertStmt.run({ ...data, id: uuidv4() });
                    inserted++;
                }
            });
        });

        runImport();
        return { success: true, valid, inserted, updated };
    }

    // ================================================================
    // 2. BANK ACCOUNTS
    // ================================================================
    static getBankAccounts() {
        return db.prepare(`
            SELECT ba.*, COALESCE(b.name_ar, ba.bank_name) as bank_name 
            FROM bank_accounts ba
            LEFT JOIN banks b ON ba.bank_id = b.id
            ORDER BY ba.created_at
        `).all();
    }

    static saveBankAccount(data: any) {
        try {
            // SELF-HEAL: Ensure columns exist at runtime
            try {
                const cols = db.prepare("PRAGMA table_info(bank_accounts)").all();
                if (!cols.some((c: any) => c.name === 'commission_account_id')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN commission_account_id TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'branch')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN branch TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'iban')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN iban TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'account_name')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN account_name TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'bank_name')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN bank_name TEXT").run();
                }
                if (!cols.some((c: any) => c.name === 'currency')) {
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN currency TEXT DEFAULT 'ILS'").run();
                }
                if (!cols.some((c: any) => c.name === 'code')) {
                    // Custom Numbering Column
                    db.prepare("ALTER TABLE bank_accounts ADD COLUMN code TEXT").run();
                }
            } catch (e) { /* ignore */ }

            const id = data.id || uuidv4();
            const currencyCode = data.currency_id || 'ILS';
            let currencyUUID = null;

            // Lookup Currency UUID for FK (because DB enforces NOT NULL constraint on currency_id)
            try {
                const cRow = db.prepare("SELECT id FROM currencies WHERE code = ?").get(currencyCode);
                if (cRow) {
                    currencyUUID = cRow.id;
                } else {
                    const defaultRow = db.prepare("SELECT id FROM currencies LIMIT 1").get();
                    if (defaultRow) currencyUUID = defaultRow.id;
                }
            } catch (e) { console.error("Currency lookup failed", e); }

            // --- AUTO-CREATE GL ACCOUNT LOGIC ---
            let glAccountId = data.gl_account_id || null;
            if (!data.id && data.parent_gl_id && !glAccountId) {
                try {
                    const parentAccount = db.prepare("SELECT * FROM accounts WHERE id = ?").get(data.parent_gl_id);
                    if (parentAccount) {
                        // 1. Generate Next Code
                        // Find all children of this parent
                        const children = db.prepare("SELECT account_code FROM accounts WHERE parent_id = ? ORDER BY account_code DESC LIMIT 1").get(data.parent_gl_id);
                        let nextCode = parentAccount.account_code + '01'; // Default first child
                        if (children && children.account_code) {
                            const lastCode = children.account_code;
                            // Increment last code
                            // Assuming format is parentABCD...
                            // If parent is 1110, child is 111001. 
                            // Try to parse number
                            const num = parseInt(lastCode);
                            if (!isNaN(num)) {
                                nextCode = (num + 1).toString();
                            }
                        }

                        // 2. Create GL Account
                        const newGlId = uuidv4();
                        const newAccountName = data.account_name || `${data.bank_name || 'Bank'} - ${currencyCode}`;

                        db.prepare(`
                            INSERT INTO accounts (
                                id, account_code, name_ar, name_en, type, 
                                parent_id, level, is_transactional, nature, currency_id, is_active
                            ) VALUES (
                                @id, @code, @name, @name, 'ASSET', 
                                @parent_id, @level, 1, 'DEBIT', @currency_id, 1
                            )
                        `).run({
                            id: newGlId,
                            code: nextCode,
                            name: newAccountName,
                            parent_id: data.parent_gl_id,
                            level: (parentAccount.level || 1) + 1,
                            currency_id: currencyCode
                        });

                        glAccountId = newGlId;
                        console.log(`[Auto-Create] Created GL Account ${newAccountName} (${nextCode})`);
                    }
                } catch (e) {
                    console.error("Failed to auto-create GL account:", e);
                    // Fallback: proceed without linking or throw? 
                    // Let's log and proceed, user can link later.
                }
            }

            const params = {
                id,
                bank_id: data.bank_id,
                branch: data.branch || null,
                account_number: data.account_number,
                iban: data.iban || null,
                currency: currencyCode, // Store code in 'currency' column
                currency_id: currencyUUID, // Store UUID in 'currency_id' column (FK)
                gl_account_id: glAccountId,
                commission_account_id: data.commission_account_id || null,
                account_name: data.account_name,
                bank_name: data.bank_name || null,
                code: data.code || null, // Custom code
                is_active: data.is_active !== false ? 1 : 0
            };

            if (!data.id) {
                db.prepare(`
                    INSERT INTO bank_accounts (
                        id, bank_id, branch, account_number, iban, 
                        currency, currency_id, gl_account_id, commission_account_id, account_name, bank_name, code, is_active
                    )
                    VALUES (
                        @id, @bank_id, @branch, @account_number, @iban, 
                        @currency, @currency_id, @gl_account_id, @commission_account_id, @account_name, @bank_name, @code, @is_active
                    )
                `).run(params);
            } else {
                db.prepare(`
                    UPDATE bank_accounts SET 
                        bank_id=@bank_id, branch=@branch, account_number=@account_number, 
                        iban=@iban, currency=@currency, currency_id=@currency_id,
                        gl_account_id=@gl_account_id, commission_account_id=@commission_account_id,
                        account_name=@account_name, bank_name=@bank_name, code=@code, is_active=@is_active
                    WHERE id=@id
                `).run(params);
            }
            return { success: true, id };
        } catch (err: any) {
            console.error("MasterDataService.saveBankAccount Error:", err);
            throw err;
        }
    }

    static deleteBankAccount(id: string) {
        db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(id);
        return { success: true };
    }

    // ================================================================
    // 3. COST CENTERS
    // ================================================================
    static getCostCenters() {
        // Return hierarchy or flat list? Flat list for now, UI builds tree
        return db.prepare('SELECT * FROM cost_centers ORDER BY code').all();
    }

    static saveCostCenter(data: any) {
        const id = data.id || uuidv4();
        const sanitizedData = {
            ...data,
            id,
            code: data.code || null,
            parent_id: data.parent_id || null,
            name_en: data.name_en || null,
            manager_name: data.manager_name || null,
            type: data.type || 'DEPARTMENT'
        };

        if (!data.id) {
            db.prepare(`
                INSERT INTO cost_centers (id, code, name_ar, name_en, parent_id, type, manager_name, is_active)
                VALUES (@id, @code, @name_ar, @name_en, @parent_id, @type, @manager_name, 1)
            `).run(sanitizedData);
        } else {
            db.prepare(`
                UPDATE cost_centers SET 
                    code=@code, name_ar=@name_ar, name_en=@name_en, parent_id=@parent_id, 
                    type=@type, manager_name=@manager_name
                WHERE id=@id
            `).run(sanitizedData);
        }
        return { success: true, id };
    }

    static deleteCostCenter(id: string) {
        db.prepare('DELETE FROM cost_centers WHERE id = ?').run(id);
        return { success: true };
    }

    // ================================================================
    // 4. PAYMENT METHODS
    // ================================================================
    static getPaymentMethods() {
        return db.prepare('SELECT * FROM payment_methods ORDER BY name_ar').all();
    }

    static savePaymentMethod(data: any) {
        const id = data.id || uuidv4();
        if (!data.id) {
            db.prepare(`
                INSERT INTO payment_methods (id, name_ar, name_en, type, gl_account_id, commission_rate, is_active)
                VALUES (@id, @name_ar, @name_en, @type, @gl_account_id, @commission_rate, 1)
            `).run({
                ...data,
                id,
                name_en: data.name_en || null,
                type: data.type || 'CASH', // Fix missing param default
                gl_account_id: data.gl_account_id || null,
                commission_rate: data.commission_rate || 0
            });
        } else {
            db.prepare(`
                UPDATE payment_methods SET 
                    name_ar=@name_ar, name_en=@name_en, type=@type, 
                    gl_account_id=@gl_account_id, commission_rate=@commission_rate
                WHERE id=@id
            `).run(data);
        }
        return { success: true, id };
    }

    // ================================================================
    // 5. BRANCHES
    // ================================================================
    static getBranches() {
        return db.prepare('SELECT * FROM branches ORDER BY is_main DESC, name_ar').all();
    }

    static saveBranch(data: any) {
        const id = data.id || uuidv4();
        if (!data.id) {
            db.prepare(`
                INSERT INTO branches (id, name_ar, name_en, type, address, phone, is_main, is_active)
                VALUES (@id, @name_ar, @name_en, @type, @address, @phone, @is_main, 1)
            `).run({
                ...data,
                id,
                name_en: data.name_en || null,
                type: data.type || 'BRANCH',
                address: data.address || null,
                phone: data.phone || null,
                is_main: data.is_main ? 1 : 0
            });
        } else {
            db.prepare(`
                UPDATE branches SET 
                    name_ar=@name_ar, name_en=@name_en, type=@type,
                    address=@address, phone=@phone, is_main=@is_main
                WHERE id=@id
            `).run({
                ...data,
                is_main: data.is_main ? 1 : 0
            });
        }
        return { success: true, id };
    }

    static deleteBranch(id: string) {
        db.prepare('DELETE FROM branches WHERE id = ?').run(id);
        return { success: true };
    }
}
