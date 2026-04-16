-- ================================================================
-- Schema V45: Treasury Module Updates
-- Formalizing missing columns dynamically added by self-healing
-- ================================================================

-- 1. Treasury Vouchers
ALTER TABLE treasury_vouchers ADD COLUMN manual_ref TEXT;
ALTER TABLE treasury_vouchers ADD COLUMN cost_center_id TEXT;
ALTER TABLE treasury_vouchers ADD COLUMN sales_rep_code TEXT;

-- 2. Cheques
ALTER TABLE cheques ADD COLUMN bank_id TEXT;
ALTER TABLE cheques ADD COLUMN endorser TEXT;

-- 3. Journal Entry Lines (Adding Bank Account Context for Reconciliation)
ALTER TABLE journal_entry_lines ADD COLUMN bank_account_id TEXT;
