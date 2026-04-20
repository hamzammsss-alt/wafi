"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
const decimal_js_1 = __importDefault(require("decimal.js"));
class JournalService {
    // --- Sequence Generation ---
    static getNextVoucherNo(prefix, year = new Date().getFullYear()) {
        const row = database_1.db.prepare('SELECT current_value FROM document_counters WHERE prefix = ? AND year = ?').get(prefix, year);
        let nextVal = 1;
        if (row) {
            nextVal = row.current_value + 1;
        }
        else {
            database_1.db.prepare('INSERT INTO document_counters (prefix, year, current_value) VALUES (?, ?, 0)').run(prefix, year);
        }
        // Format: JV-2026-0001
        return `${prefix}-${year}-${String(nextVal).padStart(4, '0')}`;
    }
    static incrementVoucherNo(prefix, year = new Date().getFullYear()) {
        database_1.db.prepare('UPDATE document_counters SET current_value = current_value + 1 WHERE prefix = ? AND year = ?').run(prefix, year);
    }
    // --- Entries ---
    static createJournalEntry(header, lines) {
        // 0. Self-Heal Schema (Add missing columns to header)
        try {
            const cols = database_1.db.prepare("PRAGMA table_info(journal_entries)").all();
            if (!cols.some((c) => c.name === 'cost_center_id')) {
                database_1.db.prepare("ALTER TABLE journal_entries ADD COLUMN cost_center_id TEXT").run();
            }
        }
        catch (e) {
            console.error("Schema heal failed (Journal Header)", e);
        }
        // 1. Validate Balance
        let totalDebit = new decimal_js_1.default(0);
        let totalCredit = new decimal_js_1.default(0);
        lines.forEach(line => {
            totalDebit = totalDebit.plus(line.debit);
            totalCredit = totalCredit.plus(line.credit);
        });
        if (!totalDebit.equals(totalCredit)) {
            throw new Error(`Unbalanced Entry: Debit (${totalDebit}) != Credit (${totalCredit})`);
        }
        // 2. Generate ID and Voucher No
        const id = (0, uuid_1.v4)();
        const year = new Date(header.date).getFullYear();
        const voucher_no = this.getNextVoucherNo(header.voucher_type, year);
        // Resolve Branch ID
        let branchId = header.branch_id;
        if (!branchId || branchId === '1') {
            const mainBranch = database_1.db.prepare('SELECT id FROM branches WHERE is_main = 1').get();
            if (mainBranch)
                branchId = mainBranch.id;
            else {
                const anyBranch = database_1.db.prepare('SELECT id FROM branches LIMIT 1').get();
                branchId = anyBranch ? anyBranch.id : null;
            }
        }
        // Resolve Created By (User ID)
        let createdById = header.created_by;
        if (!createdById || createdById === 'SYSTEM') {
            const adminUser = database_1.db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
            if (adminUser)
                createdById = adminUser.id;
            else {
                const anyUser = database_1.db.prepare("SELECT id FROM users LIMIT 1").get();
                createdById = anyUser ? anyUser.id : null;
            }
        }
        // Resolve Currency ID (Handle Code vs UUID)
        let currencyId = header.currency_id;
        if (currencyId && currencyId.length <= 4) { // Assume 'ILS', 'USD' are codes
            try {
                const currencyRow = database_1.db.prepare("SELECT id FROM currencies WHERE code = ?").get(currencyId);
                if (currencyRow)
                    currencyId = currencyRow.id;
            }
            catch (e) {
                // Table might not exist or other error, ignore and use original
                console.warn("Could not look up currency:", e);
            }
        }
        // 3. Transaction
        // EMERGENCY FIX: Drop broken triggers/views if they exist
        try {
            const broken = database_1.db.prepare(`
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
                    database_1.db.prepare(`DROP TRIGGER IF EXISTS "${obj.name}"`).run();
                }
                else {
                    database_1.db.prepare(`DROP VIEW IF EXISTS "${obj.name}"`).run();
                }
            }
        }
        catch (e) {
            console.error("[JournalService] Trigger cleanup failed", e);
        }
        const transaction = database_1.db.transaction(() => {
            // Insert Header
            database_1.db.prepare(`
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
                cost_center_id: header.cost_center_id || null
            });
            // Insert Lines
            const insertLine = database_1.db.prepare(`
            INSERT INTO journal_entry_lines(
                id, journal_entry_id, account_id, debit, credit, line_description, cost_center_id,
                fc_amount, fc_currency_id, exchange_rate,
                invoice_ref, tax_ref, sub_account_id, due_date, customer_id, is_returned, bank_account_id
            ) VALUES(
                @id, @journal_entry_id, @account_id, @debit, @credit, @line_description, @cost_center_id,
                @fc_amount, @fc_currency_id, @exchange_rate,
                @invoice_ref, @tax_ref, @sub_account_id, @due_date, @customer_id, @is_returned, @bank_account_id
            )
                `);
            lines.forEach(line => {
                insertLine.run({
                    id: (0, uuid_1.v4)(),
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
                    bank_account_id: line.bank_account_id || null
                });
            });
            // Update Counter
            this.incrementVoucherNo(header.voucher_type, year);
        });
        transaction();
        return { success: true, id, voucher_no };
    }
    static getJournalEntry(id) {
        const header = database_1.db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?').all(id);
        return { ...header, lines };
    }
    static getJournalEntries(filters = {}) {
        let query = `
            SELECT 
                h.id, h.voucher_no, h.voucher_type, h.date, h.description, h.status, h.currency_id,
                h.exchange_rate, h.created_by,
                (SELECT SUM(debit) FROM journal_entry_lines WHERE journal_entry_id = h.id) as total_amount
            FROM journal_entries h
            WHERE 1 = 1
                `;
        const params = [];
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
        return database_1.db.prepare(query).all(...params);
    }
}
exports.JournalService = JournalService;
