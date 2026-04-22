import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

export interface JournalHeader {
    id: string;
    voucher_no: string;
    voucher_type: string; // JV, SINV, etc.
    date: string;
    reference_no?: string;
    description?: string;
    status: 'DRAFT' | 'POSTED' | 'VOID';
    branch_id: string;
    currency_id: string;
    exchange_rate: number;
    created_by?: string;
}

export interface JournalLine {
    id?: string;
    header_id?: string;
    account_id: string;
    debit: number;
    credit: number;
    line_description?: string;
    cost_center_id?: string;
    fc_amount?: number;
    fc_currency_id?: string;
    exchange_rate?: number;
    // Enhanced Grid Fields
    invoice_ref?: string;
    tax_ref?: string;
    sub_account_id?: string;
    due_date?: string;
    customer_id?: string;
    is_returned?: boolean;
    bank_account_id?: string; // New field
    expense_type_id?: string | null;
    vehicle_id?: string | null;
}

export class JournalService {

    // --- Sequence Generation ---

    static getNextVoucherNo(prefix: string, year: number = new Date().getFullYear()): string {
        const row = db.prepare('SELECT current_value FROM document_counters WHERE prefix = ? AND year = ?').get(prefix, year);
        let nextVal = 1;

        if (row) {
            nextVal = row.current_value + 1;
        } else {
            db.prepare('INSERT INTO document_counters (prefix, year, current_value) VALUES (?, ?, 0)').run(prefix, year);
        }

        // Format: JV-2026-0001
        return `${prefix}-${year}-${String(nextVal).padStart(4, '0')}`;
    }

    static incrementVoucherNo(prefix: string, year: number = new Date().getFullYear()) {
        db.prepare('UPDATE document_counters SET current_value = current_value + 1 WHERE prefix = ? AND year = ?').run(prefix, year);
    }

    // --- Entries ---

    static createJournalEntry(header: Omit<JournalHeader, 'id' | 'voucher_no'>, lines: JournalLine[]) {
        // 0. Self-Heal Schema (Add missing columns to header)
        try {
            const cols = db.prepare("PRAGMA table_info(journal_entries)").all();
            if (!cols.some((c: any) => c.name === 'cost_center_id')) {
                db.prepare("ALTER TABLE journal_entries ADD COLUMN cost_center_id TEXT").run();
            }
        } catch (e) {
            console.error("Schema heal failed (Journal Header)", e);
        }
        try {
            const lineCols = db.prepare("PRAGMA table_info(journal_entry_lines)").all();
            if (!lineCols.some((c: any) => c.name === 'expense_type_id')) {
                db.prepare("ALTER TABLE journal_entry_lines ADD COLUMN expense_type_id TEXT").run();
            }
            if (!lineCols.some((c: any) => c.name === 'vehicle_id')) {
                db.prepare("ALTER TABLE journal_entry_lines ADD COLUMN vehicle_id TEXT").run();
            }
        } catch (e) {
            console.error("Schema heal failed (Journal Lines Dimensions)", e);
        }

        // 1. Validate Balance
        let totalDebit = new Decimal(0);
        let totalCredit = new Decimal(0);

        lines.forEach(line => {
            totalDebit = totalDebit.plus(line.debit);
            totalCredit = totalCredit.plus(line.credit);
        });

        if (!totalDebit.equals(totalCredit)) {
            throw new Error(`Unbalanced Entry: Debit (${totalDebit}) != Credit (${totalCredit})`);
        }

        // 2. Generate ID and Voucher No
        const id = uuidv4();
        const year = new Date(header.date).getFullYear();
        let voucher_no = this.getNextVoucherNo(header.voucher_type, year);
        for (let i = 0; i < 50; i++) {
            const exists = db.prepare('SELECT 1 FROM journal_entries WHERE voucher_no = ? LIMIT 1').get(voucher_no);
            if (!exists) break;
            this.incrementVoucherNo(header.voucher_type, year);
            voucher_no = this.getNextVoucherNo(header.voucher_type, year);
        }

        // Resolve Branch ID
        let branchId = header.branch_id;
        if (!branchId || branchId === '1') {
            const mainBranch = db.prepare('SELECT id FROM branches WHERE is_main = 1').get();
            if (mainBranch) branchId = mainBranch.id;
            else {
                const anyBranch = db.prepare('SELECT id FROM branches LIMIT 1').get();
                branchId = anyBranch ? anyBranch.id : null;
            }
        }

        // Resolve Created By (User ID)
        let createdById = header.created_by;
        if (!createdById || createdById === 'SYSTEM') {
            const adminUser = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
            if (adminUser) createdById = adminUser.id;
            else {
                const anyUser = db.prepare("SELECT id FROM users LIMIT 1").get();
                createdById = anyUser ? anyUser.id : null;
            }
        }

        // Resolve Currency ID (Handle Code vs UUID)
        let currencyId = header.currency_id;
        if (currencyId && currencyId.length <= 4) { // Assume 'ILS', 'USD' are codes
            try {
                const currencyRow = db.prepare("SELECT id FROM currencies WHERE code = ?").get(currencyId);
                if (currencyRow) currencyId = currencyRow.id;
            } catch (e) {
                // Table might not exist or other error, ignore and use original
                console.warn("Could not look up currency:", e);
            }
        }

        // 3. Transaction
        // EMERGENCY FIX: Drop broken triggers/views if they exist
        try {
            const broken = db.prepare(`
                SELECT type, name FROM sqlite_master 
                WHERE (type = 'trigger' OR type = 'view') 
                AND (
                    sql LIKE '%business_partners_backup_fix_fk%' 
                    OR sql LIKE '%backup_fix%' 
                    OR sql LIKE '%gl_journal_header%'
                )
            `).all();
            for (const obj of broken) {
                console.log(`[JournalService] Dropping broken ${obj.type}: ${obj.name}`);
                if (obj.type === 'trigger') {
                    db.prepare(`DROP TRIGGER IF EXISTS "${obj.name}"`).run();
                } else {
                    db.prepare(`DROP VIEW IF EXISTS "${obj.name}"`).run();
                }
            }
        } catch (e) {
            console.error("[JournalService] Trigger cleanup failed", e);
        }

        const transaction = db.transaction(() => {
            // Insert Header
            db.prepare(`
            INSERT INTO journal_entries (
                id, voucher_no, voucher_type, date, reference_no, description, status,
                branch_id, currency_id, exchange_rate, created_by, cost_center_id
            ) VALUES (
                @id, @voucher_no, @voucher_type, @date, @reference_no, @description, @status,
                @branch_id, @currency_id, @exchange_rate, @created_by, @cost_center_id
            )
        `).run({
                id,
                voucher_no,
                ...header,
                currency_id: currencyId,
                branch_id: branchId,
                created_by: createdById,
                reference_no: header.reference_no || null,
                description: header.description || null,
                cost_center_id: (header as any).cost_center_id || null
            });

            // Insert Lines
            const insertLine = db.prepare(`
            INSERT INTO journal_entry_lines(
                id, journal_entry_id, account_id, debit, credit, line_description, cost_center_id,
                fc_amount, fc_currency_id, exchange_rate,
                invoice_ref, tax_ref, sub_account_id, due_date, customer_id, is_returned, bank_account_id,
                expense_type_id, vehicle_id
            ) VALUES(
                @id, @journal_entry_id, @account_id, @debit, @credit, @line_description, @cost_center_id,
                @fc_amount, @fc_currency_id, @exchange_rate,
                @invoice_ref, @tax_ref, @sub_account_id, @due_date, @customer_id, @is_returned, @bank_account_id,
                @expense_type_id, @vehicle_id
            )
                `);

            lines.forEach(line => {
                insertLine.run({
                    id: uuidv4(),
                    journal_entry_id: id,
                    account_id: line.account_id,
                    debit: line.debit,
                    credit: line.credit,
                    line_description: line.line_description || null,
                    cost_center_id: line.cost_center_id || null,
                    fc_amount: line.fc_amount || 0,
                    fc_currency_id: line.fc_currency_id || null,
                    exchange_rate: line.exchange_rate || 1,
                    invoice_ref: line.invoice_ref || null,
                    tax_ref: line.tax_ref || null,
                    sub_account_id: line.sub_account_id || null,
                    due_date: line.due_date || null,
                    customer_id: line.customer_id || null,
                    is_returned: line.is_returned ? 1 : 0,
                    bank_account_id: line.bank_account_id || null,
                    expense_type_id: line.expense_type_id || null,
                    vehicle_id: line.vehicle_id || null
                });
            });

            // Update Counter
            this.incrementVoucherNo(header.voucher_type, year);
        });

        transaction();
        return { success: true, id, voucher_no };
    }

    static getJournalEntry(id: string) {
        const header = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
        if (!header) return null;
        const lines = db.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?').all(id);
        return { ...header, lines };
    }
    static getJournalEntries(filters: { fromDate?: string; toDate?: string; type?: string; status?: string } = {}) {
        let query = `
            SELECT 
                h.id, h.voucher_no, h.voucher_type, h.date, h.description, h.status, h.currency_id,
                h.exchange_rate, h.created_by,
                (SELECT SUM(debit) FROM journal_entry_lines WHERE journal_entry_id = h.id) as total_amount
            FROM journal_entries h
            WHERE 1 = 1
                `;
        const params: any[] = [];

        if (filters.fromDate) {
            query += ` AND h.date >= ? `;
            params.push(filters.fromDate);
        }
        if (filters.toDate) {
            query += ` AND h.date <= ? `;
            params.push(filters.toDate);
        }
        if (filters.type) {
            query += ` AND h.voucher_type = ? `;
            params.push(filters.type);
        }
        if (filters.status) {
            query += ` AND h.status = ? `;
            params.push(filters.status);
        }

        query += ` ORDER BY h.date DESC, h.voucher_no DESC`;

        return db.prepare(query).all(...params);
    }
}
