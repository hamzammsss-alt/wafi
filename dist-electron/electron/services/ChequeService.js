"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChequeService = void 0;
const database_1 = require("../database");
const JournalService_1 = require("./JournalService");
class ChequeService {
    // Get Cheques by Status (or All)
    static getCheques(filters) {
        let query = `
            SELECT c.*, bp.name_ar as partner_name 
            FROM cheques c
            LEFT JOIN business_partners bp ON c.partner_id = bp.id
            WHERE 1=1
        `;
        const params = [];
        if (filters.status) {
            query += ` AND c.status = ?`;
            params.push(filters.status);
        }
        if (filters.type) {
            query += ` AND c.type = ?`;
            params.push(filters.type);
        }
        query += ` ORDER BY c.due_date ASC`;
        return database_1.db.prepare(query).all(...params);
    }
    // Update Check Status + Automated Journal Entry
    static updateStatus(id, newStatus, date, options = {}) {
        const check = database_1.db.prepare('SELECT * FROM cheques WHERE id = ?').get(id);
        if (!check)
            throw new Error("Check not found");
        if (check.status === newStatus)
            return { success: true, message: "No change" };
        const runUpdate = database_1.db.transaction(() => {
            // 1. Update Status
            database_1.db.prepare('UPDATE cheques SET status = ?, endorsed_to = ? WHERE id = ?').run(newStatus, options.endorsedTo || check.endorsed_to, id);
            // 2. Automated GL Entry
            let debitAcc = '';
            let creditAcc = '';
            let description = '';
            const getAccount = (namePattern) => {
                const acc = database_1.db.prepare(`SELECT id FROM accounts WHERE name_ar LIKE ? OR name_en LIKE ?`).get(`%${namePattern}%`, `%${namePattern}%`);
                return acc ? acc.id : null;
            };
            const getPartnerAccount = (partnerId) => {
                const partner = database_1.db.prepare('SELECT linked_account_id FROM business_partners WHERE id = ?').get(partnerId);
                return partner ? partner.linked_account_id : null;
            };
            // INCOMING CHEQUES (Collected from Customer)
            if (check.type === 'INCOMING') {
                if (check.status === 'RECEIVED' && newStatus === 'UNDER_COLLECTION') {
                    // Action: Deposit to Bank (Under Collection)
                    // Dr: Cheques Under Collection | Cr: Cheques in Box
                    debitAcc = getAccount('شيكات برسم التحصيل') || '';
                    creditAcc = getAccount('شيكات بالصندوق') || '';
                    description = `إيداع شيك رقم ${check.cheque_no} برسم التحصيل`;
                }
                else if (check.status === 'RECEIVED' && newStatus === 'ENDORSED') {
                    // Action: Endorse to Vendor
                    // Dr: Vendor (AP) | Cr: Cheques in Box
                    // using options.endorsedTo (name) isn't enough for ID, typically we need partnerId. 
                    // For now, if passed as ID in options, use it, else try to find partner or fail? 
                    // Let's assume the UI sends the Vendor Name/ID. 
                    // If simple string, maybe we can't do GL perfectly without ID.
                    // IMPORTANT: The UI for endorsement should pick a vendor.
                    // We will assume for now we might skip GL if we don't have exact ID, or use a general 'Endorsed Cheques' control account if needed.
                    // Better: The UI sends 'options.beneficiary_id' ??
                    // Let's assume options.notes contains 'Endorsed to X' for now or we look up partner.
                    // Ideally we need vendor account ID.
                    // Let's use a safe fallback or specific account if provided.
                    // Fallback to "Creditors" control if no specific vendor known (but this is bad practice).
                    // We will check if options.endorsedTo matches a partner name.
                    const vendorAccount = getAccount(options.endorsedTo || '');
                    debitAcc = vendorAccount || getAccount('الموردين') || '';
                    creditAcc = getAccount('شيكات بالصندوق') || '';
                    description = `تجيير شيك رقم ${check.cheque_no} للمستفيد ${options.endorsedTo}`;
                }
                else if (check.status === 'UNDER_COLLECTION' && newStatus === 'CLEARED') {
                    // Action: Clear from Bank
                    // Dr: Bank | Cr: Cheques Under Collection
                    debitAcc = options.bankAccountId || getAccount('البنك') || ''; // Should come from UI selection of WHICH bank it was deposited to?
                    // Usually we deposited it to a specific bank in the previous step. We should store which bank it is in?
                    // For simplicity, we ask user to select Bank again or assume it's the one passed.
                    creditAcc = getAccount('شيكات برسم التحصيل') || '';
                    description = `تحصيل شيك رقم ${check.cheque_no} في البنك`;
                }
                else if (check.status === 'UNDER_COLLECTION' && newStatus === 'BOUNCED') {
                    // Action: Return to Customer (Bounce) from Bank
                    // Dr: Customer (AR) | Cr: Cheques Under Collection
                    debitAcc = getPartnerAccount(check.partner_id) || '';
                    creditAcc = getAccount('شيكات برسم التحصيل') || '';
                    description = `شيك عائد (من البنك) رقم ${check.cheque_no}`;
                }
                else if (check.status === 'RECEIVED' && newStatus === 'BOUNCED') {
                    // Bounced from Box (Directly returned to customer?)
                    // Dr: Customer | Cr: Cheques in Box
                    debitAcc = getPartnerAccount(check.partner_id) || '';
                    creditAcc = getAccount('شيكات بالصندوق') || '';
                    description = `إعادة شيك (من الصندوق) رقم ${check.cheque_no}`;
                }
                else if (check.status === 'BOUNCED' && newStatus === 'RECEIVED') {
                    // Re-receiving a bounced check? Or swapping?
                    // Usually you don't just set it back to Received. You create a new receipt.
                    // But if it was a mistake?
                    // Reverse the bounce?
                    // Dr: Cheques in Box | Cr: Customer
                    debitAcc = getAccount('شيكات بالصندوق') || '';
                    creditAcc = getPartnerAccount(check.partner_id) || '';
                    description = `استلام شيك عائد رقم ${check.cheque_no}`;
                }
            }
            // Create Journal if accounts resolved
            if (debitAcc && creditAcc) {
                JournalService_1.JournalService.createJournalEntry({
                    voucher_type: 'Cheque Status',
                    date: date,
                    reference_no: check.cheque_no,
                    description: description,
                    currency_id: check.currency || 'ILS', // Use check currency
                    exchange_rate: 1, // Default for now
                    branch_id: database_1.db.prepare('SELECT id FROM branches LIMIT 1').get()?.id, // Main branch for now
                    status: 'POSTED'
                }, [
                    { account_id: debitAcc, debit: check.amount, credit: 0, line_description: description },
                    { account_id: creditAcc, debit: 0, credit: check.amount, line_description: description }
                ]);
            }
        });
        runUpdate();
        return { success: true };
    }
}
exports.ChequeService = ChequeService;
