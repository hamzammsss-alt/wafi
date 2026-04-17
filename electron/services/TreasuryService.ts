import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { JournalService } from './JournalService';

export class TreasuryService {
    private static safeConsole(method: 'log' | 'warn' | 'error', ...args: any[]) {
        try {
            const writer = console[method] || console.log;
            writer(...args);
        } catch {
            // Ignore stdout/stderr pipe failures in desktop runs.
        }
    }

    private static getApprovalInboxViewSql() {
        return `
DROP VIEW IF EXISTS view_approval_inbox;

CREATE VIEW view_approval_inbox AS
SELECT
    'sales_invoice' as doc_type,
    id as doc_id,
    COALESCE(invoice_no, id) as ref_no,
    date as doc_date,
    COALESCE(created_by, submitted_by, '') as created_by,
    COALESCE(submitted_at, updated_at, created_at) as submitted_at,
    COALESCE(grand_total, 0) as amount,
    status
FROM sales_invoices
WHERE status LIKE 'PENDING_APPROVAL%'

UNION ALL

SELECT
    'purchase_order' as doc_type,
    id as doc_id,
    COALESCE(order_no, id) as ref_no,
    date as doc_date,
    COALESCE(created_by, submitted_by, '') as created_by,
    COALESCE(submitted_at, created_at) as submitted_at,
    COALESCE(grand_total, 0) as amount,
    status
FROM purchase_orders
WHERE status LIKE 'PENDING_APPROVAL%'

UNION ALL

SELECT
    'purchase_request' as doc_type,
    id as doc_id,
    COALESCE(request_no, id) as ref_no,
    date as doc_date,
    COALESCE(submitted_by, requester_id, '') as created_by,
    COALESCE(submitted_at, created_at) as submitted_at,
    0 as amount,
    status
FROM purchase_requests
WHERE status LIKE 'PENDING_APPROVAL%';
        `;
    }

    private static refreshApprovalInboxView() {
        db.exec(TreasuryService.getApprovalInboxViewSql());
        TreasuryService.safeConsole('log', '[TreasuryService] Refreshed approval inbox view.');
    }

    private static cleanupBrokenTreasuryObjects() {
        TreasuryService.refreshApprovalInboxView();

        const broken = db.prepare(`
            SELECT type, name FROM sqlite_master
            WHERE (type = 'trigger' OR type = 'view')
              AND sql IS NOT NULL
              AND (
                sql LIKE '%business_partners_backup_fix_fk%'
                OR sql LIKE '%backup_fix%'
                OR sql LIKE '%gl_journal_header%'
              )
        `).all();

        for (const obj of broken) {
            TreasuryService.safeConsole('log', `[TreasuryService] Dropping broken ${obj.type}: ${obj.name}`);
            try {
                if (obj.type === 'trigger') {
                    db.prepare(`DROP TRIGGER IF EXISTS "${obj.name}"`).run();
                } else {
                    db.prepare(`DROP VIEW IF EXISTS "${obj.name}"`).run();
                }
            } catch (innerErr) {
                TreasuryService.safeConsole('error', `[TreasuryService] Failed to drop ${obj.name}`, innerErr);
            }
        }

        const tvTriggers = db.prepare(`
            SELECT name, sql FROM sqlite_master
            WHERE type = 'trigger' AND tbl_name = 'treasury_vouchers'
        `).all();

        for (const trig of tvTriggers) {
            if (trig.sql && (trig.sql.includes('backup') || trig.sql.includes('gl_journal_header'))) {
                try {
                    db.prepare(`DROP TRIGGER IF EXISTS "${trig.name}"`).run();
                    TreasuryService.safeConsole('log', `[TreasuryService] Dropped broken trigger on treasury_vouchers: ${trig.name}`);
                } catch {
                    // Ignore cleanup failures and continue.
                }
            }
        }

        const orphanedTables = db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type = 'table' AND (name LIKE '%backup_fix%' OR name LIKE '%_old_bad%')
        `).all();

        for (const tbl of orphanedTables) {
            try {
                db.prepare(`DROP TABLE IF EXISTS "${tbl.name}"`).run();
                TreasuryService.safeConsole('log', `[TreasuryService] Dropped orphaned table: ${tbl.name}`);
            } catch {
                // Ignore orphaned table cleanup failures and continue.
            }
        }
    }

    private static ensureTreasuryVoucherColumns() {
        const cols = db.prepare("PRAGMA table_info(treasury_vouchers)").all();
        if (!cols.some((c: any) => c.name === 'manual_ref')) {
            db.prepare("ALTER TABLE treasury_vouchers ADD COLUMN manual_ref TEXT").run();
        }
        if (!cols.some((c: any) => c.name === 'cost_center_id')) {
            db.prepare("ALTER TABLE treasury_vouchers ADD COLUMN cost_center_id TEXT").run();
        }
        if (!cols.some((c: any) => c.name === 'sales_rep_code')) {
            db.prepare("ALTER TABLE treasury_vouchers ADD COLUMN sales_rep_code TEXT").run();
        }
        if (!cols.some((c: any) => c.name === 'extra_data')) {
            db.prepare("ALTER TABLE treasury_vouchers ADD COLUMN extra_data TEXT").run();
        }
    }

    private static ensureChequesColumns() {
        const chkCols = db.prepare("PRAGMA table_info(cheques)").all();
        if (!chkCols.some((c: any) => c.name === 'bank_id')) {
            db.prepare("ALTER TABLE cheques ADD COLUMN bank_id TEXT").run();
        }
        if (!chkCols.some((c: any) => c.name === 'endorser')) {
            db.prepare("ALTER TABLE cheques ADD COLUMN endorser TEXT").run();
        }
    }

    private static ensureJournalEntryLineColumns() {
        const jelCols = db.prepare("PRAGMA table_info(journal_entry_lines)").all();
        if (!jelCols.some((c: any) => c.name === 'bank_account_id')) {
            db.prepare("ALTER TABLE journal_entry_lines ADD COLUMN bank_account_id TEXT").run();
            TreasuryService.safeConsole('log', "[TreasuryService] Added bank_account_id to journal_entry_lines");
        }
    }

    private static prepareTreasuryPersistence() {
        try {
            TreasuryService.cleanupBrokenTreasuryObjects();
        } catch (e) {
            TreasuryService.safeConsole('error', "[TreasuryService] Trigger/view cleanup failed", e);
        }

        try {
            TreasuryService.repairTreasurySchema();
            TreasuryService.repairChequesSchema();
        } catch (e) {
            TreasuryService.safeConsole('error', "[TreasuryService] Schema Repair Failed", e);
        }

        try {
            TreasuryService.ensureTreasuryVoucherColumns();
            TreasuryService.ensureChequesColumns();
            TreasuryService.ensureJournalEntryLineColumns();
        } catch (e) {
            TreasuryService.safeConsole('error', "[TreasuryService] Column Self-Heal Failed", e);
        }
    }

    private static resolveReferenceLink(reference: unknown, payeeType?: string) {
        const rawReference = String(reference || '').trim();
        if (!rawReference) {
            return { partnerId: null as string | null, linkedAccountId: null as string | null };
        }

        const normalized = rawReference.toLowerCase();
        const codeCandidate = rawReference.split('-')[0]?.trim();

        const matchPartnerByType = (type: string) => {
            if (type === 'EMPLOYEE') {
                const byCode = codeCandidate
                    ? db.prepare('SELECT id, linked_account_id FROM hr_employees WHERE employee_code = ? LIMIT 1').get(codeCandidate)
                    : null;
                if (byCode?.id) return byCode;

                return db.prepare("SELECT id, linked_account_id FROM hr_employees WHERE LOWER(COALESCE(name_ar, name_en, full_name, '')) = ? LIMIT 1").get(normalized);
            }

            const byCode = codeCandidate
                ? db.prepare('SELECT id, linked_account_id FROM business_partners WHERE code = ? LIMIT 1').get(codeCandidate)
                : null;
            if (byCode?.id) return byCode;

            return db.prepare("SELECT id, linked_account_id FROM business_partners WHERE LOWER(COALESCE(name_ar, name_en, name, '')) = ? LIMIT 1").get(normalized);
        };

        const typed = String(payeeType || '').toUpperCase();
        if (typed === 'EMPLOYEE') {
            const row = matchPartnerByType('EMPLOYEE');
            return { partnerId: row?.id || null, linkedAccountId: row?.linked_account_id || null };
        }

        if (typed === 'CUSTOMER' || typed === 'SUPPLIER') {
            const row = matchPartnerByType(typed);
            return { partnerId: row?.id || null, linkedAccountId: row?.linked_account_id || null };
        }

        const genericPartner = matchPartnerByType('CUSTOMER');
        if (genericPartner?.id) {
            return { partnerId: genericPartner.id, linkedAccountId: genericPartner.linked_account_id || null };
        }

        const genericEmployee = matchPartnerByType('EMPLOYEE');
        return { partnerId: genericEmployee?.id || null, linkedAccountId: genericEmployee?.linked_account_id || null };
    }

    private static reserveTreasuryVoucherNo(prefix: string, dateValue?: string): string {
        const year = dateValue ? new Date(dateValue).getFullYear() : new Date().getFullYear();
        for (let i = 0; i < 50; i++) {
            const candidate = JournalService.getNextVoucherNo(prefix, year);
            const exists = db.prepare('SELECT 1 FROM treasury_vouchers WHERE voucher_no = ? LIMIT 1').get(candidate);
            if (!exists) {
                JournalService.incrementVoucherNo(prefix, year);
                return candidate;
            }
            JournalService.incrementVoucherNo(prefix, year);
        }
        throw new Error('تعذر توليد رقم سند فريد');
    }

    // Create Receipt Voucher (قبض)
    static createReceiptVoucher(data: any) {
        const { header, details, checks, against } = data;

        if (!header.partner_id) throw new Error("يجب تحديد العميل/المستلم منه");

        const voucherId = uuidv4();
        // Generate Auto Number
        let voucherNo = header.voucher_no;
        if (voucherNo === 'NEW' || !voucherNo) {
            voucherNo = this.reserveTreasuryVoucherNo('REC', header.date);
        } else {
            const duplicate = db.prepare('SELECT 1 FROM treasury_vouchers WHERE voucher_no = ? LIMIT 1').get(voucherNo);
            if (duplicate) throw new Error('رقم السند مستخدم مسبقاً');
        }

        // EMERGENCY FIX: Drop broken triggers/views/tables if they exist (Run outside transaction)
        try {
            // 1. Drop triggers/views referencing broken tables
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
                TreasuryService.safeConsole('log', `[TreasuryService] Dropping broken ${obj.type}: ${obj.name}`);
                try {
                    if (obj.type === 'trigger') {
                        db.prepare(`DROP TRIGGER IF EXISTS "${obj.name}"`).run();
                    } else {
                        db.prepare(`DROP VIEW IF EXISTS "${obj.name}"`).run();
                    }
                } catch (innerErr) {
                    TreasuryService.safeConsole('error', `[TreasuryService] Failed to drop ${obj.name}`, innerErr);
                }
            }

            // 2. Also drop ALL triggers on treasury_vouchers that reference missing tables
            const tvTriggers = db.prepare(`
                SELECT name, sql FROM sqlite_master 
                WHERE type = 'trigger' AND tbl_name = 'treasury_vouchers'
            `).all();
            for (const trig of tvTriggers) {
                if (trig.sql && (trig.sql.includes('backup') || trig.sql.includes('gl_journal_header'))) {
                    try {
                        db.prepare(`DROP TRIGGER IF EXISTS "${trig.name}"`).run();
                        TreasuryService.safeConsole('log', `[TreasuryService] Dropped broken trigger on treasury_vouchers: ${trig.name}`);
                    } catch (e2) { /* ignore */ }
                }
            }

            // 3. Drop orphaned backup tables
            const orphanedTables = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type = 'table' AND (name LIKE '%backup_fix%' OR name LIKE '%_old_bad%')
            `).all();
            for (const tbl of orphanedTables) {
                try {
                    db.prepare(`DROP TABLE IF EXISTS "${tbl.name}"`).run();
                    TreasuryService.safeConsole('log', `[TreasuryService] Dropped orphaned table: ${tbl.name}`);
                } catch (e3) { /* ignore */ }
            }
        } catch (e) {
            TreasuryService.safeConsole('error', "[TreasuryService] Trigger cleanup failed", e);
        }

        // EMERGENCY SCHEMA FIX: Repair Treasury Vouchers Table (Bad FK)
        try {
            // STEP 1: Repair broken FKs first (may recreate tables)
            TreasuryService.repairTreasurySchema();
            TreasuryService.repairChequesSchema();
        } catch (e) {
            TreasuryService.safeConsole('error', "[TreasuryService] Schema Repair Failed", e);
        }

        try {
            // STEP 2: Self-Heal — add missing columns AFTER repair (so they don't get dropped)
            const cols = db.prepare("PRAGMA table_info(treasury_vouchers)").all();
            if (!cols.some((c: any) => c.name === 'manual_ref')) {
                db.prepare("ALTER TABLE treasury_vouchers ADD COLUMN manual_ref TEXT").run();
            }
            if (!cols.some((c: any) => c.name === 'cost_center_id')) {
                db.prepare("ALTER TABLE treasury_vouchers ADD COLUMN cost_center_id TEXT").run();
            }
            if (!cols.some((c: any) => c.name === 'sales_rep_code')) {
                db.prepare("ALTER TABLE treasury_vouchers ADD COLUMN sales_rep_code TEXT").run();
            }

            // Cheques: bank_id + endorser
            const chkCols = db.prepare("PRAGMA table_info(cheques)").all();
            if (!chkCols.some((c: any) => c.name === 'bank_id')) {
                db.prepare("ALTER TABLE cheques ADD COLUMN bank_id TEXT").run();
            }
            if (!chkCols.some((c: any) => c.name === 'endorser')) {
                db.prepare("ALTER TABLE cheques ADD COLUMN endorser TEXT").run();
            }

            // Journal Lines: bank_account_id
            const jelCols = db.prepare("PRAGMA table_info(journal_entry_lines)").all();
            if (!jelCols.some((c: any) => c.name === 'bank_account_id')) {
                db.prepare("ALTER TABLE journal_entry_lines ADD COLUMN bank_account_id TEXT").run();
                TreasuryService.safeConsole('log', "[TreasuryService] Added bank_account_id to journal_entry_lines");
            }
        } catch (e) {
            TreasuryService.safeConsole('error', "[TreasuryService] Column Self-Heal Failed", e);
        }

        TreasuryService.prepareTreasuryPersistence();

        // SAFETY: Disable FK checks for the main transaction (broken FK to business_partners_backup_fix_fk)
        db.exec("PRAGMA foreign_keys = OFF");

        const runTransaction = db.transaction(() => {
            // RESOLVE FKs

            // 1. Branch
            let branchId = header.branch_id;
            if (!branchId || branchId === '1') {
                const branch = db.prepare("SELECT id FROM branches LIMIT 1").get();
                branchId = branch ? branch.id : null;
            }

            // 2. Currency
            let currencyId = header.currency_id || header.currency || 'ILS';
            // Check if it's a code like 'ILS' (len=3) or UUID
            if (currencyId && currencyId.length <= 4) {
                const curr = db.prepare("SELECT id FROM currencies WHERE code = ?").get(currencyId);
                if (curr) currencyId = curr.id;
            }

            // 3. Partner (If Employee, set partner_id to NULL to avoid FK violation with business_partners)
            // We still use header.partner_id later for Account Resolution, but not for the Voucher Table FK.
            // Unless the selected partner is actually in business_partners.
            let dbPartnerId = header.partner_id;
            // Check if this ID exists in business_partners
            const partnerCheck = db.prepare("SELECT id FROM business_partners WHERE id = ?").get(data.header.partner_id); // Use data.header to be safe
            if (!partnerCheck) {
                // Not in business_partners (could be Employee or invalid). 
                // Set to NULL for the FK column.
                dbPartnerId = null;
            }

            // 1. Create Voucher Header
            db.prepare(`
                INSERT INTO treasury_vouchers (
                    id, voucher_no, voucher_type, date, partner_id, branch_id,
                    amount, currency_id, exchange_rate, description, status, created_by,
                    manual_ref, cost_center_id, sales_rep_code
                ) VALUES (
                    @id, @voucher_no, 'RECEIPT', @date, @partner_id, @branch_id,
                    @amount, @currency_id, @exchange_rate, @description, 'POSTED', 'System',
                    @manual_ref, @cost_center_id, @sales_rep_code
                )
            `).run({
                id: voucherId,
                voucher_no: voucherNo,
                date: header.date,
                partner_id: dbPartnerId,
                branch_id: branchId,
                amount: header.amount,
                currency_id: currencyId,
                exchange_rate: header.exchange_rate || 1,
                description: header.description,
                manual_ref: header.manual_ref || null,
                cost_center_id: header.cost_center_id || null,
                sales_rep_code: header.sales_rep_code || null
            });

            // 2. Prepare Journal Lines
            const journalLines: any[] = [];

            // ===== CREDIT SIDE (Against / مقابل) =====
            if (against && against.length > 0) {
                // Bisan-style: Use explicit against lines from frontend
                for (const ag of against) {
                    if (ag.credit > 0) {
                        const referenceLink = TreasuryService.resolveReferenceLink(ag.reference, ag.reference_type || header.payee_type);
                        const linkedSubAccountId = ag.sub_account_id || referenceLink.linkedAccountId || null;
                        journalLines.push({
                            account_id: ag.account_id,
                            debit: ag.debit || 0,
                            credit: ag.credit,
                            line_description: `سند قبض ${voucherNo} - مقابل ${ag.reference || ''}`,
                            cost_center_id: ag.cost_center_id || header.cost_center_id || null,
                            sub_account_id: linkedSubAccountId,
                            invoice_ref: ag.reference || null,
                            tax_ref: ag.tax_ref || null,
                            due_date: ag.invoice_date || null,
                            customer_id: referenceLink.partnerId || null
                        });
                    }
                }
            } else {
                // Legacy fallback: Auto-resolve from partner linked account
                let payerAccountId = null;
                const payerType = header.payee_type || header.payeeType || 'CUSTOMER'; // Default fallback (using payeeType key for consistency or payerType if preferred)

                if (payerType === 'EMPLOYEE') {
                    const emp = db.prepare('SELECT linked_account_id FROM hr_employees WHERE id = ?').get(header.partner_id);
                    if (emp && emp.linked_account_id) {
                        payerAccountId = emp.linked_account_id;
                    } else {
                        throw new Error("الموظف المختار غير مربوط بحساب محاسبي (Linked Account)");
                    }
                } else if (payerType === 'CUSTOMER' || payerType === 'SUPPLIER') {
                    const partner = db.prepare('SELECT linked_account_id FROM business_partners WHERE id = ?').get(header.partner_id);
                    if (partner && partner.linked_account_id) {
                        payerAccountId = partner.linked_account_id;
                    } else {
                        throw new Error("العميل غير مربوط بحساب محاسبي");
                    }
                } else {
                    // Fallback to Account ID directly if we supported it
                    const partner = db.prepare('SELECT linked_account_id FROM business_partners WHERE id = ?').get(header.partner_id);
                    payerAccountId = partner ? partner.linked_account_id : null;
                }

                if (!payerAccountId) throw new Error("تعذر تحديد الحساب المحاسبي للعميل/الموظف");

                // Check if account exists
                const accountExists = db.prepare('SELECT id FROM accounts WHERE id = ?').get(payerAccountId);
                if (!accountExists) throw new Error("حساب العميل/الموظف غير موجود في دليل الحسابات");

                journalLines.push({
                    account_id: payerAccountId,
                    debit: 0,
                    credit: header.amount, // Reducing AR (Credit Customer)
                    line_description: `سند قبض ${voucherNo} - ${header.description}`,
                    cost_center_id: header.cost_center_id || null
                });
            }

            // ===== DEBIT SIDE (Receipt / قبض) =====

            // A. Cash / Bank Transfers
            if (details && details.length > 0) {
                for (const d of details) {
                    if (d.amount > 0) {
                        journalLines.push({
                            account_id: d.account_id, // Box or Bank Account
                            debit: d.amount,
                            credit: 0,
                            line_description: `قبض نقدي/تحويل - ${voucherNo}`,
                            cost_center_id: d.cost_center_id || header.cost_center_id || null,
                            sub_account_id: d.sub_account_id || d.cost_center_id || null,
                            invoice_ref: d.reference || d.line_ref || null
                        });
                    }
                }
            }

            // B. Checks (Cheques in Box)
            if (checks && checks.length > 0) {
                // Each cheque line already has an account_id from the frontend grid
                // If no account_id, fall back to "Cheques in Box" account
                let fallbackCheckAccountId: string | null = null;

                for (const c of checks) {
                    // Insert into cheques table
                    db.prepare(`
                        INSERT INTO cheques (
                            id, cheque_no, bank_name, amount, currency_id, due_date, 
                            received_date, type, status, partner_id, voucher_id, drawer_name, bank_id, endorser
                        ) VALUES (
                            @id, @no, @bank, @amount, @curr, @due,
                            @recv, 'INCOMING', 'ON_HAND', @partner, @vid, @drawer, @bank_id, @endorser
                        )
                     `).run({
                        id: uuidv4(),
                        no: c.cheque_no,
                        bank: c.bank_name,
                        amount: c.amount,
                        curr: header.currency_id, // Assuming same currency for now
                        due: c.due_date,
                        recv: header.date,
                        partner: header.partner_id,
                        vid: voucherId,
                        drawer: c.drawer_name || '',
                        bank_id: c.bank_id || null,
                        endorser: c.endorser || null
                    });

                    // Journal debit line for this cheque — use the account from the receipt grid
                    // The frontend sends account_id for cheque lines too (صندوق الشيكات)
                    // We accumulate per-account
                }

                // In the new Bisan-style flow, cheque debit lines are already included 
                // in the `details` array with their account_ids from the grid.
                // But if they're sent separately (legacy), create a single journal line:
                const totalCheckAmount = checks.reduce((s: number, c: any) => s + Number(c.amount), 0);
                if (totalCheckAmount > 0 && (!details || details.length === 0)) {
                    // Legacy: need to find cheques-in-box account
                    const boxCheckAcc = db.prepare(`SELECT id FROM accounts WHERE name_ar LIKE '%شيكات بالصندوق%' OR name_ar LIKE '%Cheques in Box%'`).get();
                    if (!boxCheckAcc) throw new Error("حساب 'شيكات بالصندوق' غير موجود في الدليل");

                    journalLines.push({
                        account_id: boxCheckAcc.id,
                        debit: totalCheckAmount,
                        credit: 0,
                        line_description: `شيكات واردة - سند ${voucherNo}`,
                        cost_center_id: header.cost_center_id || null
                    });
                }
            }

            // 3. Create Journal Entry
            const journal = JournalService.createJournalEntry({
                voucher_type: 'Receipt Voucher',
                date: header.date,
                reference_no: voucherNo,
                description: header.description,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                branch_id: header.branch_id || '1',
                status: 'POSTED'
            }, journalLines);

            // Update Voucher with Journal ID
            db.prepare('UPDATE treasury_vouchers SET journal_header_id = ? WHERE id = ?').run(journal.id, voucherId);

        });

        try {
            runTransaction();
        } finally {
            db.exec("PRAGMA foreign_keys = ON");
        }
        return { success: true, voucher_no: voucherNo };
    }

    // Create Payment Voucher (صرف)
    static createPaymentVoucher(data: any) {
        const { header, details, checks, against } = data; // details = Cash/Bank Lines (Source), checks = Outgoing Cheques

        // Validation
        if (!header.partner_id) throw new Error("يجب تحديد المستفيد");
        if ((header.total_amount || 0) <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

        const voucherId = uuidv4();
        let voucherNo = header.voucher_no;
        if (voucherNo === 'NEW' || !voucherNo) {
            voucherNo = this.reserveTreasuryVoucherNo('PAY', header.date);
        } else {
            const duplicate = db.prepare('SELECT 1 FROM treasury_vouchers WHERE voucher_no = ? LIMIT 1').get(voucherNo);
            if (duplicate) throw new Error('رقم السند مستخدم مسبقاً');
        }

        TreasuryService.prepareTreasuryPersistence();

        const runTransaction = db.transaction(() => {

            // 1. Create Voucher Header
            db.prepare(`
                INSERT INTO treasury_vouchers (
                    id, voucher_no, voucher_type, date, partner_id, branch_id,
                    amount, currency_id, exchange_rate, description, status, created_by,
                    manual_ref, cost_center_id, sales_rep_code, extra_data
                ) VALUES (
                    @id, @voucher_no, 'PAYMENT', @date, @partner_id, @branch_id,
                    @amount, @currency_id, @exchange_rate, @description, 'POSTED', 'System',
                    @manual_ref, @cost_center_id, @sales_rep_code, @extra_data
                )
            `).run({
                id: voucherId,
                voucher_no: voucherNo,
                date: header.date,
                partner_id: header.partner_id,
                branch_id: header.branch_id || '1',
                amount: header.total_amount,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate || 1,
                description: header.description,
                manual_ref: header.manual_ref || null,
                cost_center_id: header.cost_center_id || null,
                sales_rep_code: header.sales_rep_code || null,
                extra_data: header.extra_data || null
            });

            // 2. Prepare Journal Lines
            const journalLines: any[] = [];

            if (against && against.length > 0) {
                for (const ag of against) {
                    if (Number(ag.debit || 0) <= 0) continue;
                    const referenceLink = TreasuryService.resolveReferenceLink(ag.reference, ag.reference_type || header.payee_type);
                    const linkedSubAccountId = ag.sub_account_id || referenceLink.linkedAccountId || null;
                    journalLines.push({
                        account_id: ag.account_id,
                        debit: ag.debit,
                        credit: 0,
                        line_description: ag.reference ? `سند صرف ${voucherNo} - ${ag.reference}` : `سند صرف ${voucherNo} - ${header.description}`,
                        cost_center_id: ag.cost_center_id || header.cost_center_id || null,
                        sub_account_id: linkedSubAccountId,
                        invoice_ref: ag.reference || null,
                        tax_ref: ag.tax_ref || null,
                        due_date: ag.invoice_date || null,
                        customer_id: referenceLink.partnerId || null
                    });
                }
            } else {
                let payeeAccountId = null;

                const partner = db.prepare('SELECT linked_account_id FROM business_partners WHERE id = ?').get(header.partner_id);
                if (partner && partner.linked_account_id) {
                    payeeAccountId = partner.linked_account_id;
                } else {
                    const emp = db.prepare('SELECT linked_account_id FROM hr_employees WHERE id = ?').get(header.partner_id);
                    if (emp && emp.linked_account_id) {
                        payeeAccountId = emp.linked_account_id;
                    } else {
                        const acc = db.prepare('SELECT id FROM accounts WHERE id = ?').get(header.partner_id);
                        if (acc) payeeAccountId = acc.id;
                    }
                }

                if (!payeeAccountId) throw new Error("المستفيد غير مربوط بحساب محاسبي (Linked Account)");

                journalLines.push({
                    account_id: payeeAccountId,
                    debit: header.total_amount,
                    credit: 0,
                    line_description: `سند صرف - ${header.description}`,
                    cost_center_id: header.cost_center_id || null
                });
            }

            // B. Credit Side: Source of Funds (Cash Box / Bank)
            // 2. Add Credit Lines (Payment Means - Cash / Bank Transfer)
            if (details && details.length > 0) {
                for (const d of details) {
                    let creditAccountId = d.account_id;
                    let bankAccountId = d.bank_account_id || null;

                    // Logic: If bank_account_id is provided (Transfer), resolve its GL Account
                    if (bankAccountId) {
                        const bankAcc = db.prepare("SELECT gl_account_id FROM bank_accounts WHERE id = ?").get(bankAccountId);
                        if (bankAcc && bankAcc.gl_account_id) {
                            creditAccountId = bankAcc.gl_account_id;
                        } else {
                            // Fallback or Error? 
                            // Check if we have a valid account_id passed. If not, error.
                            if (!creditAccountId) {
                                throw new Error("حساب البنك المختار غير مرتبط بحساب محاسبي (Linked GL Account). راجع إعدادات البنوك.");
                            }
                        }
                    }

                    if (!creditAccountId) throw new Error("يجب تحديد حساب الدفع (الصندوق أو البنك)");

                    journalLines.push({
                        account_id: creditAccountId,
                        debit: 0,
                        credit: d.amount,
                        line_description: d.description || `سند صرف رقم ${header.voucher_no}`,
                        cost_center_id: d.cost_center_id || header.cost_center_id,
                        sub_account_id: d.sub_account_id || d.cost_center_id || null,
                        invoice_ref: d.reference || d.line_ref || null,
                        bank_account_id: bankAccountId // Track specific source
                    });
                }
            }
            // 2. Cheques (Outgoing)
            if (checks && checks.length > 0) {
                // For Outgoing Cheques, we normally Credit a "Notes Payable" or "Banks" account?
                // Usually "Bank" directly OR "Cheques Under Collection" (Payment).
                // Let's assume we Credit the Bank Account directly OR a standardized "Cheques Payable" account.
                // In this implementation, the UI for checks should probably ask for "Bank Account" to credit.
                // BUT, `checks` array in `checks` table usually stores instrument details.
                // We need a loop to insert into `cheques` table AND add journal lines.

                // ISSUE: The `checks` array from UI usually contains `bank_id` (The bank we are drawing FROM).
                // So we credit that Bank Account.

                for (const c of checks) {
                    let persistedBankId = c.bank_id || null;
                    if (!persistedBankId && c.bank_account_id) {
                        const bankAccountRow = db.prepare("SELECT bank_id FROM bank_accounts WHERE id = ?").get(c.bank_account_id);
                        persistedBankId = bankAccountRow?.bank_id || null;
                    }

                    // Insert into Cheques Table (OUTGOING)
                    db.prepare(`
                        INSERT INTO cheques (
                            id, cheque_no, bank_name, amount, currency_id, due_date, 
                            received_date, type, status, partner_id, voucher_id, drawer_name, bank_id
                        ) VALUES (
                            @id, @no, @bank, @amount, @curr, @due,
                            @recv, 'OUTGOING', 'ISSUED', @partner, @vid, @drawer, @bank_id
                        )
                     `).run({
                        id: uuidv4(),
                        no: c.cheque_no,
                        bank: c.bank_name, // Name of OUR bank
                        amount: c.amount,
                        curr: header.currency_id,
                        due: c.due_date,
                        recv: header.date, // Issue Date
                        partner: header.partner_id,
                        vid: voucherId,
                        drawer: 'Self', // We are the drawer
                        bank_id: persistedBankId
                    });

                    // Add Journal Credit Line (Credit The Bank Account)
                    let bankGLAccountId = null;

                    if (c.bank_account_id) {
                        const bankAcc = db.prepare("SELECT gl_account_id FROM bank_accounts WHERE id = ?").get(c.bank_account_id);
                        if (bankAcc && bankAcc.gl_account_id) {
                            bankGLAccountId = bankAcc.gl_account_id;
                        }
                    }

                    // Fallback to old logic if no bank_account_id (Legacy)
                    if (!bankGLAccountId && c.bank_id) {
                        // Attempt to find account linked to Bank (Legacy way, likely deprecated)
                        const bankObj = db.prepare("SELECT account_id FROM banks WHERE id = ?").get(c.bank_id);
                        if (bankObj && bankObj.account_id) {
                            bankGLAccountId = bankObj.account_id;
                        }
                    }

                    if (!bankGLAccountId) {
                        throw new Error(`البنك المختار للشيك رقم ${c.cheque_no} غير مربوط بحساب محاسبي (GL Account)`);
                    }

                    journalLines.push({
                        account_id: bankGLAccountId,
                        debit: 0,
                        credit: c.amount,
                        line_description: `شيك رقم ${c.cheque_no} - ${c.description || ''}`,
                        cost_center_id: header.cost_center_id || null,
                        invoice_ref: c.cheque_no || null,
                        due_date: c.due_date || null,
                        bank_account_id: c.bank_account_id || null
                    });
                }
            }

            // 3. Create Journal Entry
            const journal = JournalService.createJournalEntry({
                voucher_type: 'Payment Voucher',
                date: header.date,
                reference_no: voucherNo,
                description: header.description,
                currency_id: header.currency || 'ILS',
                exchange_rate: header.rate || 1,
                branch_id: header.branch_id || '1',
                status: header.status
            }, journalLines);

            db.prepare('UPDATE treasury_vouchers SET journal_header_id = ? WHERE id = ?').run(journal.id, voucherId);

        });

        runTransaction();
        return { success: true, voucher_no: voucherNo };
    }

    static getReceipt(idOrNo: string) {
        // 1. Fetch Voucher Header
        let header = db.prepare(`
            SELECT v.*, c.name_ar as customer_name
            FROM treasury_vouchers v
            LEFT JOIN business_partners c ON v.partner_id = c.id
            WHERE v.id = ?
                            `).get(idOrNo);

        if (!header) {
            header = db.prepare(`
                SELECT v.*, c.name_ar as customer_name
                FROM treasury_vouchers v
                LEFT JOIN business_partners c ON v.partner_id = c.id
                WHERE v.voucher_no = ?
                            `).get(idOrNo);
        }

        if (!header) return null;

        // 2. Fetch Checks
        const checks = db.prepare(`SELECT * FROM cheques WHERE voucher_id = ? `).all(header.id);

        // 3. Fetch Cash/Bank Lines from Journal (Debit Side)
        let cashDetails: any[] = [];
        let againstDetails: any[] = [];

        if (header.journal_header_id) {
            // Debit Lines (Receipts - Cash/Bank)
            const debits = db.prepare(`
                SELECT l.*, a.name_ar as account_name, a.account_code as account_code
                FROM journal_entry_lines l
                LEFT JOIN accounts a ON l.account_id = a.id
                WHERE l.journal_entry_id = ? AND l.debit > 0
            `).all(header.journal_header_id);
            cashDetails = debits;

            // Credit Lines (Against - Invoices/Accounts)
            const credits = db.prepare(`
                SELECT l.*, a.name_ar as account_name, a.account_code as account_code
                FROM journal_entry_lines l
                LEFT JOIN accounts a ON l.account_id = a.id
                WHERE l.journal_entry_id = ? AND l.credit > 0
            `).all(header.journal_header_id);
            againstDetails = credits;
        }

        return { header, lines: cashDetails, checks, against: againstDetails };
    }

    static getPaymentVoucher(idOrNo: string) {
        let header = db.prepare(`
            SELECT v.*, c.name_ar as payee_name
            FROM treasury_vouchers v
            LEFT JOIN business_partners c ON v.partner_id = c.id
            WHERE v.id = ? AND v.voucher_type = 'PAYMENT'
                            `).get(idOrNo);

        if (!header) {
            header = db.prepare(`
                SELECT v.*, c.name_ar as payee_name
                FROM treasury_vouchers v
                LEFT JOIN business_partners c ON v.partner_id = c.id
                WHERE v.voucher_no = ? AND v.voucher_type = 'PAYMENT'
                            `).get(idOrNo);
        }

        if (!header) return null;

        const checks = db.prepare(`SELECT * FROM cheques WHERE voucher_id = ? `).all(header.id);

        let creditLines: any[] = [];
        let debitLines: any[] = [];

        if (header.journal_header_id) {
            // Credit Lines (Payment Means - Cash/Bank)
            const credits = db.prepare(`
                SELECT l.*, a.name_ar as account_name, a.account_code as account_code 
                FROM journal_entry_lines l
                LEFT JOIN accounts a ON l.account_id = a.id
                WHERE l.journal_entry_id = ? AND l.credit > 0
            `).all(header.journal_header_id);
            creditLines = credits;

            // Debit Lines (Expenses/Payees)
            const debits = db.prepare(`
                SELECT l.*, a.name_ar as account_name, a.account_code as account_code 
                FROM journal_entry_lines l
                LEFT JOIN accounts a ON l.account_id = a.id
                WHERE l.journal_entry_id = ? AND l.debit > 0
            `).all(header.journal_header_id);
            debitLines = debits;
        }

        return { header, lines: creditLines, checks, debits: debitLines };
    }

    static getPaymentVouchers(filters?: any) {
        // Basic list for UI
        return db.prepare(`
            SELECT v.*, p.name_ar as payee_name 
            FROM treasury_vouchers v
            LEFT JOIN business_partners p ON v.partner_id = p.id
            WHERE v.voucher_type = 'PAYMENT'
            ORDER BY v.date DESC, v.created_at DESC
                            `).all();
    }

    static deletePaymentVoucher(id: string) {
        const voucher = db.prepare(`
            SELECT id, voucher_no, journal_header_id
            FROM treasury_vouchers
            WHERE id = ? AND voucher_type = 'PAYMENT'
        `).get(id) as { id: string; voucher_no: string; journal_header_id?: string | null } | undefined;

        if (!voucher) {
            throw new Error('سند الصرف غير موجود');
        }

        const deleteVoucher = db.prepare(`
            DELETE FROM treasury_vouchers
            WHERE id = ? AND voucher_type = 'PAYMENT'
        `);
        const deleteJournalLines = db.prepare(`
            DELETE FROM journal_entry_lines
            WHERE journal_entry_id = ?
        `);
        const deleteJournalHeader = db.prepare(`
            DELETE FROM journal_entries
            WHERE id = ?
        `);

        const runTransaction = db.transaction(() => {
            deleteVoucher.run(voucher.id);
            if (voucher.journal_header_id) {
                deleteJournalLines.run(voucher.journal_header_id);
                deleteJournalHeader.run(voucher.journal_header_id);
            }
        });

        runTransaction();
        return { success: true, id: voucher.id, voucher_no: voucher.voucher_no };
    }

    static updatePaymentVoucherStatus(id: string, status: 'DRAFT' | 'POSTED') {
        const voucher = db.prepare(`
            SELECT id, voucher_no, status, journal_header_id
            FROM treasury_vouchers
            WHERE id = ? AND voucher_type = 'PAYMENT'
        `).get(id) as { id: string; voucher_no: string; status: string; journal_header_id?: string | null } | undefined;

        if (!voucher) {
            throw new Error('سند الصرف غير موجود');
        }

        if (voucher.status === status) {
            return { success: true, id: voucher.id, voucher_no: voucher.voucher_no, status };
        }

        const updateVoucher = db.prepare(`
            UPDATE treasury_vouchers
            SET status = ?
            WHERE id = ? AND voucher_type = 'PAYMENT'
        `);
        const updateJournal = db.prepare(`
            UPDATE journal_entries
            SET status = ?
            WHERE id = ?
        `);

        const runTransaction = db.transaction(() => {
            updateVoucher.run(status, voucher.id);
            if (voucher.journal_header_id) {
                updateJournal.run(status, voucher.journal_header_id);
            }
        });

        runTransaction();
        return { success: true, id: voucher.id, voucher_no: voucher.voucher_no, status };
    }

    static postPaymentVoucher(id: string) {
        return TreasuryService.updatePaymentVoucherStatus(id, 'POSTED');
    }

    static getReceiptVouchers(filters?: any) {
        return db.prepare(`
            SELECT v.*, p.name_ar as payer_name 
            FROM treasury_vouchers v
            LEFT JOIN business_partners p ON v.partner_id = p.id
            WHERE v.voucher_type = 'RECEIPT'
            ORDER BY v.date DESC, v.created_at DESC
                            `).all();
    }

    static deleteReceiptVoucher(id: string) {
        const voucher = db.prepare(`
            SELECT id, voucher_no, journal_header_id
            FROM treasury_vouchers
            WHERE id = ? AND voucher_type = 'RECEIPT'
        `).get(id) as { id: string; voucher_no: string; journal_header_id?: string | null } | undefined;

        if (!voucher) {
            throw new Error('سند القبض غير موجود');
        }

        const deleteVoucher = db.prepare(`
            DELETE FROM treasury_vouchers
            WHERE id = ? AND voucher_type = 'RECEIPT'
        `);
        const deleteJournalLines = db.prepare(`
            DELETE FROM journal_entry_lines
            WHERE journal_entry_id = ?
        `);
        const deleteJournalHeader = db.prepare(`
            DELETE FROM journal_entries
            WHERE id = ?
        `);

        const runTransaction = db.transaction(() => {
            deleteVoucher.run(voucher.id);
            if (voucher.journal_header_id) {
                deleteJournalLines.run(voucher.journal_header_id);
                deleteJournalHeader.run(voucher.journal_header_id);
            }
        });

        runTransaction();
        return { success: true, id: voucher.id, voucher_no: voucher.voucher_no };
    }

    static updateReceiptVoucherStatus(id: string, status: 'DRAFT' | 'POSTED') {
        const voucher = db.prepare(`
            SELECT id, voucher_no, status, journal_header_id
            FROM treasury_vouchers
            WHERE id = ? AND voucher_type = 'RECEIPT'
        `).get(id) as { id: string; voucher_no: string; status: string; journal_header_id?: string | null } | undefined;

        if (!voucher) {
            throw new Error('سند القبض غير موجود');
        }

        if (voucher.status === status) {
            return { success: true, id: voucher.id, voucher_no: voucher.voucher_no, status };
        }

        const updateVoucher = db.prepare(`
            UPDATE treasury_vouchers
            SET status = ?
            WHERE id = ? AND voucher_type = 'RECEIPT'
        `);
        const updateJournal = db.prepare(`
            UPDATE journal_entries
            SET status = ?
            WHERE id = ?
        `);

        const runTransaction = db.transaction(() => {
            updateVoucher.run(status, voucher.id);
            if (voucher.journal_header_id) {
                updateJournal.run(status, voucher.journal_header_id);
            }
        });

        runTransaction();
        return { success: true, id: voucher.id, voucher_no: voucher.voucher_no, status };
    }

    static postReceiptVoucher(id: string) {
        return TreasuryService.updateReceiptVoucherStatus(id, 'POSTED');
    }

    // --- Manual Bank Reconciliation ---

    static getUnreconciledItems(accountId: string, endDate: string) {
        return db.prepare(`
            SELECT 
                l.id, l.journal_entry_id, l.debit, l.credit, l.line_description as description, l.due_date,
                            h.date, h.voucher_no, h.voucher_type, h.reference_no
            FROM journal_entry_lines l
            JOIN journal_entries h ON l.journal_entry_id = h.id
            WHERE l.account_id = ?
                            AND h.date <= ?
                            AND IFNULL(l.reconciled, 0) = 0
            AND h.status = 'POSTED'
            ORDER BY h.date ASC
                            `).all(accountId, endDate);
    }

    static reconcileItems(lineIds: string[]) {
        if (!lineIds || lineIds.length === 0) return;
        const update = db.prepare("UPDATE journal_entry_lines SET reconciled = 1 WHERE id = ?");
        const transaction = db.transaction(() => {
            for (const id of lineIds) {
                update.run(id);
            }
        });
        transaction();
        return { success: true };
    }

    static getBookBalance(accountId: string, endDate: string) {
        // Balance up to date (All Posted Items)
        const row = db.prepare(`
            SELECT SUM(l.debit) as total_debit, SUM(l.credit) as total_credit
            FROM journal_entry_lines l
            JOIN journal_entries h ON l.journal_entry_id = h.id
            WHERE l.account_id = ?
                            AND h.date <= ?
                            AND h.status = 'POSTED'
                                `).get(accountId, endDate);

        // Account Nature Check
        // Usually Bank is Asset (Debit - Credit)
        // Check Account Type? Default to Debit Balance.
        const debit = Number(row?.total_debit || 0);
        const credit = Number(row?.total_credit || 0);
        return debit - credit;
    }

    // --- Auto Match Engine ---

    // importedItems: { date: string, description: string, reference?: string, debit: number, credit: number }[]
    static matchImportedItems(accountId: string, importedItems: any[]) {
        // 1. Fetch ALL unreconciled items for this account (or large range)
        // Optimization: Fetch all unreconciled.
        const unreconciled = db.prepare(`
            SELECT 
                l.id, l.journal_entry_id, l.debit, l.credit, l.line_description,
                            h.date, h.voucher_no, h.reference_no
            FROM journal_entry_lines l
            JOIN journal_entries h ON l.journal_entry_id = h.id
            WHERE l.account_id = ?
                            AND IFNULL(l.reconciled, 0) = 0
            AND h.status = 'POSTED'
                            `).all(accountId);

        const results: any[] = [];

        // Helper to parse date
        const parseDate = (d: string) => new Date(d);

        importedItems.forEach((imp, index) => {
            const impDate = parseDate(imp.date);
            const impAmount = imp.debit > 0 ? imp.debit : imp.credit; // Magnitude
            const isDebit = imp.debit > 0; // Bank Statement Debit = Withdrawal (usually). 
            // WAIT: Bank Statement terminology.
            // Bank Debit = Money leaving account (Credit in our books).
            // Bank Credit = Money entering account (Debit in our books).
            // We need to match Logic.
            // If Statement has Credit (Deposit), we look for System Debit (Receipt).
            // If Statement has Debit (Withdrawal), we look for System Credit (Payment).

            // System Side:
            // Receipt Voucher -> Debit Bank (Increase).
            // Payment Voucher -> Credit Bank (Decrease).

            // Matching:
            // Import Credit (Deposit) matches System Debit (Receipt).
            // Import Debit (Withdrawal) matches System Credit (Payment).

            const targetSide = isDebit ? 'credit' : 'debit'; // We look for System Item with this side > 0

            // Filter Candidates
            const candidates = unreconciled.filter((sys: any) => {
                // 1. Direction Match
                const sysVal = Number(sys[targetSide]);
                if (sysVal <= 0) return false;

                // 2. Amount Match (Exact)
                if (Math.abs(sysVal - impAmount) > 0.01) return false;

                // 3. Date Tolerance (+/- 3 Days)
                const sysDate = parseDate(sys.date);
                const diffTime = Math.abs(impDate.getTime() - sysDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return diffDays <= 3;
            });

            // Fuzzy Ref Match? (Optional - Bonus)

            results.push({
                id: `imp - ${index}`,
                imported: imp,
                matches: candidates
            });
        });

        return results;
    }

    static repairTreasurySchema() {
        try {
            // Check if bad FK exists
            const fks = db.prepare("PRAGMA foreign_key_list(treasury_vouchers)").all();
            const badFk = fks.find((fk: any) =>
                fk.table === 'gl_journal_headers' ||
                fk.table.includes('backup_fix') ||
                fk.table.includes('business_partners_backup')
            );

            if (badFk) {
                TreasuryService.safeConsole('log', `[TreasuryService] Found bad FK to ${badFk.table}. Repairing treasury_vouchers...`);

                // CRITICAL: Disable Foreign Keys to prevent cascading delete of checks!
                db.exec("PRAGMA foreign_keys = OFF");

                const transaction = db.transaction(() => {
                    // 1. Rename old
                    db.prepare("ALTER TABLE treasury_vouchers RENAME TO treasury_vouchers_old_bad").run();

                    // 2. Create new (Fixed FK to journal_entries) — includes sales_rep_code
                    db.prepare(`
                        CREATE TABLE treasury_vouchers(
                                id TEXT PRIMARY KEY,
                                voucher_no TEXT NOT NULL UNIQUE,
                                voucher_type TEXT NOT NULL,
                                date DATE NOT NULL,
                                partner_id TEXT,
                                branch_id TEXT NOT NULL,
                                amount REAL NOT NULL,
                                currency_id TEXT NOT NULL,
                                exchange_rate REAL DEFAULT 1,
                                description TEXT,
                                status TEXT DEFAULT 'POSTED',
                                journal_header_id TEXT,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                created_by TEXT,
                                manual_ref TEXT,
                                cost_center_id TEXT,
                                sales_rep_code TEXT,
                                extra_data TEXT,
                                FOREIGN KEY(partner_id) REFERENCES business_partners(id),
                                FOREIGN KEY(branch_id) REFERENCES branches(id),
                                FOREIGN KEY(journal_header_id) REFERENCES journal_entries(id)
                            )
                            `).run();

                    // 3. Copy data
                    // Use INSERT INTO ... SELECT with specific columns to avoid mismatch
                    // We need to map columns carefully. 
                    // New table has manual_ref, cost_center_id. Old might or might not.
                    // We will try to select common columns.
                    // Actually, since we just added manual_ref/cost_center_id in the previous step (lines 45+),
                    // the "treasury_vouchers" table currently implies it has them OR we are about to add them?
                    // Wait, if we RENAME the table, we rename the one that *might* have them.

                    // Let's inspect the OLD table columns to build the SELECT query dynamically? 
                    // Too complex for cleaner. 
                    // Best approach: "INSERT INTO new (cols) SELECT cols FROM old" for the standard columns.
                    // manual_ref and cost_center_id will be NULL if we don't select them, which is fine.
                    // BUT if we just added them in the previous "Self-Heal" step (lines 45), they exist in `treasury_vouchers_old_bad`.

                    // Let's assume standard columns + new ones.

                    db.prepare(`
                        INSERT INTO treasury_vouchers(
                                id, voucher_no, voucher_type, date, partner_id, branch_id,
                                amount, currency_id, exchange_rate, description, status,
                                journal_header_id, created_at, created_by, manual_ref, cost_center_id, sales_rep_code, extra_data
                            )
                        SELECT 
                            id, voucher_no, voucher_type, date, partner_id, branch_id,
                            amount, currency_id, exchange_rate, description, status,
                            journal_header_id, created_at, created_by,
                            CASE WHEN(SELECT count(*) FROM pragma_table_info('treasury_vouchers_old_bad') WHERE name = 'manual_ref') > 0 THEN manual_ref ELSE NULL END,
                            CASE WHEN(SELECT count(*) FROM pragma_table_info('treasury_vouchers_old_bad') WHERE name = 'cost_center_id') > 0 THEN cost_center_id ELSE NULL END,
                            CASE WHEN(SELECT count(*) FROM pragma_table_info('treasury_vouchers_old_bad') WHERE name = 'sales_rep_code') > 0 THEN sales_rep_code ELSE NULL END,
                            CASE WHEN(SELECT count(*) FROM pragma_table_info('treasury_vouchers_old_bad') WHERE name = 'extra_data') > 0 THEN extra_data ELSE NULL END
                        FROM treasury_vouchers_old_bad
                            `).run();

                    // 4. Drop old
                    db.prepare("DROP TABLE treasury_vouchers_old_bad").run();
                });

                transaction();
                TreasuryService.safeConsole('log', "[TreasuryService] Schema repair successful.");

            }
        } catch (e) {
            TreasuryService.safeConsole('error', "[TreasuryService] Schema repair failed", e);
            throw e;
        } finally {
            db.exec("PRAGMA foreign_keys = ON");
        }
    }
    static repairChequesSchema() {
        try {
            // Check if bad FK exists
            const fks = db.prepare("PRAGMA foreign_key_list(cheques)").all();
            const badFk = fks.find((fk: any) =>
                fk.table.includes('backup_fix') ||
                fk.table.includes('business_partners_backup')
            );

            if (badFk) {
                TreasuryService.safeConsole('log', `[TreasuryService] Found bad FK to ${badFk.table}. Repairing cheques...`);

                // CRITICAL: Disable Foreign Keys to prevent cascading delete of checks!
                db.exec("PRAGMA foreign_keys = OFF");

                const transaction = db.transaction(() => {
                    // 1. Rename old
                    db.prepare("ALTER TABLE cheques RENAME TO cheques_old_bad").run();

                    // 2. Create new (Fixed FK)
                    db.prepare(`
                        CREATE TABLE cheques(
                                id TEXT PRIMARY KEY,
                                cheque_no TEXT NOT NULL,
                                bank_name TEXT,
                                amount REAL NOT NULL,
                                currency_id TEXT NOT NULL,
                                due_date DATE,
                                received_date DATE,
                                type TEXT CHECK(type IN('INCOMING', 'OUTGOING')),
                                status TEXT DEFAULT 'ON_HAND',
                                partner_id TEXT,
                                voucher_id TEXT,
                                drawer_name TEXT,
                                bank_id TEXT,
                                endorser TEXT,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY(partner_id) REFERENCES business_partners(id),
                                FOREIGN KEY(voucher_id) REFERENCES treasury_vouchers(id) ON DELETE CASCADE,
                                FOREIGN KEY(bank_id) REFERENCES banks(id)
                            )
                            `).run();

                    // 3. Copy data
                    db.prepare(`
                        INSERT INTO cheques(
                                id, cheque_no, bank_name, amount, currency_id, due_date, received_date,
                                type, status, partner_id, voucher_id, drawer_name, bank_id, endorser, created_at
                            )
                        SELECT 
                            id, cheque_no, bank_name, amount, currency_id, due_date, received_date,
                            type, status, partner_id, voucher_id, drawer_name,
                            CASE WHEN(SELECT count(*) FROM pragma_table_info('cheques_old_bad') WHERE name = 'bank_id') > 0 THEN bank_id ELSE NULL END,
                            CASE WHEN(SELECT count(*) FROM pragma_table_info('cheques_old_bad') WHERE name = 'endorser') > 0 THEN endorser ELSE NULL END,
                            created_at
                        FROM cheques_old_bad
                            `).run();

                    // 4. Drop old
                    db.prepare("DROP TABLE cheques_old_bad").run();
                });

                transaction();
                TreasuryService.safeConsole('log', "[TreasuryService] Cheques schema repaired.");

            }
        } catch (e) {
            TreasuryService.safeConsole('error', "[TreasuryService] Cheques repair failed", e);
        } finally {
            db.exec("PRAGMA foreign_keys = ON");
        }
    }
}
