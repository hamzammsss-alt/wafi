-- Schema V66: Accounting Engine Foundation
-- Adds normalized accounting entities for sub-accounts, references, vouchers, and voucher lines.

ALTER TABLE accounts ADD COLUMN requires_sub_account INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN requires_reference INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS ae_sub_accounts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ae_sub_accounts_account_name
ON ae_sub_accounts(account_id, normalized_name);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ae_sub_accounts_account_code
ON ae_sub_accounts(account_id, code)
WHERE code IS NOT NULL AND code != '';

CREATE INDEX IF NOT EXISTS idx_ae_sub_accounts_account
ON ae_sub_accounts(account_id);

CREATE TABLE IF NOT EXISTS ae_references (
  id TEXT PRIMARY KEY,
  ref_type TEXT NOT NULL,
  ref_code TEXT,
  ref_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ae_references_type_code
ON ae_references(ref_type, ref_code)
WHERE ref_code IS NOT NULL AND ref_code != '';

CREATE UNIQUE INDEX IF NOT EXISTS ux_ae_references_type_name
ON ae_references(ref_type, normalized_name);

CREATE TABLE IF NOT EXISTS ae_voucher_counters (
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(prefix, year)
);

CREATE TABLE IF NOT EXISTS ae_vouchers (
  id TEXT PRIMARY KEY,
  voucher_no TEXT NOT NULL UNIQUE,
  voucher_type TEXT NOT NULL,
  voucher_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  currency_code TEXT NOT NULL DEFAULT 'ILS',
  exchange_rate TEXT NOT NULL DEFAULT '1',
  description TEXT,
  source_type TEXT,
  source_id TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  posted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ae_vouchers_date
ON ae_vouchers(voucher_date);

CREATE INDEX IF NOT EXISTS idx_ae_vouchers_status
ON ae_vouchers(status);

CREATE TABLE IF NOT EXISTS ae_voucher_lines (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  account_id TEXT NOT NULL,
  sub_account_id TEXT,
  reference_type TEXT,
  reference_id TEXT,
  line_description TEXT,
  debit TEXT NOT NULL DEFAULT '0',
  credit TEXT NOT NULL DEFAULT '0',
  currency_code TEXT NOT NULL DEFAULT 'ILS',
  exchange_rate TEXT NOT NULL DEFAULT '1',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(voucher_id) REFERENCES ae_vouchers(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(id),
  FOREIGN KEY(sub_account_id) REFERENCES ae_sub_accounts(id),
  FOREIGN KEY(reference_id) REFERENCES ae_references(id)
);

CREATE INDEX IF NOT EXISTS idx_ae_voucher_lines_voucher
ON ae_voucher_lines(voucher_id);

CREATE INDEX IF NOT EXISTS idx_ae_voucher_lines_account
ON ae_voucher_lines(account_id);

CREATE INDEX IF NOT EXISTS idx_ae_voucher_lines_reference
ON ae_voucher_lines(reference_id);

INSERT OR IGNORE INTO accounts (id, code, name, type, balance, currency, is_transactional, is_active)
VALUES
  ('acc_seed_1111_bank', '1111', 'Main Bank Account', 'Asset', '0', 'ILS', 1, 1);
