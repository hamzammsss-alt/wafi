"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
const JournalService_1 = require("./JournalService");
class CheckService {
    static getChecks(status) {
        if (status === 'All')
            return database_1.db.prepare('SELECT * FROM checks').all();
        // Map UI status to DB status if needed, currently they match roughly
        // UI: Holding, Deposited, Cleared, Bounced
        // DB: Holding, Deposited, Collected, Bounced
        let dbStatus = status;
        if (status === 'Cleared')
            dbStatus = 'Collected';
        return database_1.db.prepare(`
            SELECT c.*, a.name as customer_name 
            FROM checks c 
            LEFT JOIN accounts a ON c.customer_id = a.id 
            WHERE c.status = ?
        `).all(dbStatus);
    }
    // Called when a Receipt Voucher is saved
    static registerCheck(data, customerId, reference, userId) {
        const { check_number, bank_name, amount, due_date } = data;
        const id = (0, uuid_1.v4)();
        database_1.db.prepare(`
            INSERT INTO checks (id, check_number, bank_name, amount, due_date, status, type, customer_id, notes, created_by)
            VALUES (?, ?, ?, ?, ?, 'Holding', 'IN', ?, ?, ?)
        `).run(id, check_number, bank_name, amount.toString(), due_date, customerId, `RV: ${reference}`, userId);
        return id;
    }
    static updateStatus(data) {
        const { checkId, newStatus, bankAccountId, date } = data;
        const check = database_1.db.prepare('SELECT * FROM checks WHERE id = ?').get(checkId);
        if (!check)
            throw new Error("Check not found");
        const transactions = [];
        // State Machine & Accounting Logic
        if (check.status === 'Holding' && newStatus === 'Deposited') {
            // Deposit to Bank (Under Collection)
            // Dr Checks Under Collection (Asset), Cr Checks in Hand (Asset)
            // Ideally "Checks in Hand" is the Account ID linked to the Box? Or a general clearing account?
            // In WAFI ERP, usually:
            // RV: Dr Checks in Hand, Cr Customer.
            // Deposit: Dr Checks Under Collection (Bank specific?), Cr Checks in Hand.
            // For simplicity in this session:
            // We need a "Checks Under Collection" account. Let's assume bankAccountId IS that account or we find one.
            JournalService_1.JournalService.createJournalEntry({
                voucher_type: 'JV',
                date: date,
                description: `Deposit Check ${check.check_number}`,
                reference_no: `DEP-${check.check_number}`,
                currency_id: 'ILS',
                exchange_rate: 1,
                status: 'POSTED',
                created_by: 'System',
                branch_id: '1' // Placeholder or fetch
            }, [
                { account_id: bankAccountId, line_description: `Deposit Chk ${check.check_number}`, debit: Number(check.amount), credit: 0 },
                { account_id: 'check-in-hand-placeholder-id', line_description: `Deposit Chk ${check.check_number}`, debit: 0, credit: Number(check.amount) }
            ]);
        }
        else if (check.status === 'Deposited' && newStatus === 'Cleared') {
            // Collected
            // Dr Bank Current, Cr Checks Under Collection
            JournalService_1.JournalService.createJournalEntry({
                voucher_type: 'JV',
                date: date,
                description: `Collect Check ${check.check_number}`,
                reference_no: `COL-${check.check_number}`,
                currency_id: 'ILS',
                exchange_rate: 1,
                status: 'POSTED',
                created_by: 'System',
                branch_id: '1'
            }, [
                { account_id: bankAccountId, line_description: `Collect Chk ${check.check_number}`, debit: Number(check.amount), credit: 0 },
                { account_id: 'checks-under-collection-id', line_description: `Collect Chk ${check.check_number}`, debit: 0, credit: Number(check.amount) }
            ]);
        }
        else if (newStatus === 'Bounced') {
            // Reverse everything or Debit Customer
            // Dr Customer, Cr Bank (if returned from bank) or Cr Checks in Hand (if returned from hand)
            JournalService_1.JournalService.createJournalEntry({
                voucher_type: 'JV',
                date: date,
                description: `Return Check ${check.check_number}`,
                reference_no: `RET-${check.check_number}`,
                currency_id: 'ILS',
                exchange_rate: 1,
                status: 'POSTED',
                created_by: 'System',
                branch_id: '1'
            }, [
                { account_id: check.customer_id, line_description: `Bounced Chk ${check.check_number}`, debit: Number(check.amount), credit: 0 },
                { account_id: bankAccountId, line_description: `Bounced Chk ${check.check_number}`, debit: 0, credit: Number(check.amount) }
            ]);
        }
        // Update DB
        database_1.db.prepare('UPDATE checks SET status = ? WHERE id = ?').run(newStatus === 'Cleared' ? 'Collected' : newStatus, checkId);
        return { success: true };
    }
}
exports.CheckService = CheckService;
