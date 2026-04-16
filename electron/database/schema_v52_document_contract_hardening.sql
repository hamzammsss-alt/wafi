-- Document Contract Hardening V52
-- Purchase Invoice + Stock Transfer + Journal Voucher:
-- scoped uniqueness, idempotent posting markers, and hot-path indexes.

-- ------------------------------------------------------------------
-- Purchase Invoices
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id TEXT PRIMARY KEY,
    invoice_no TEXT,
    date TEXT,
    status TEXT DEFAULT 'DRAFT',
    branch_id TEXT,
    company_id TEXT
);

ALTER TABLE purchase_invoices ADD COLUMN company_id TEXT;
ALTER TABLE purchase_invoices ADD COLUMN posted_once INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN posted_token TEXT;
ALTER TABLE purchase_invoices ADD COLUMN updated_at DATETIME;
ALTER TABLE purchase_invoices ADD COLUMN voided_at DATETIME;
ALTER TABLE purchase_invoices ADD COLUMN voided_by TEXT;
ALTER TABLE purchase_invoices ADD COLUMN remarks TEXT;
ALTER TABLE purchase_invoices ADD COLUMN tax_group_id TEXT;

UPDATE purchase_invoices
SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE purchase_invoice_lines ADD COLUMN line_no INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_scope_status_date
    ON purchase_invoices(company_id, branch_id, status, date, id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_scope_vendor_date
    ON purchase_invoices(company_id, supplier_id, date, id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_posted_token
    ON purchase_invoices(posted_token);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_lines_invoice_line_no
    ON purchase_invoice_lines(invoice_id, line_no);

CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_invoices_doc_no_scope
    ON purchase_invoices(company_id, COALESCE(branch_id, ''), invoice_no);

CREATE TRIGGER IF NOT EXISTS trg_purchase_invoices_touch_updated_at_ai
AFTER INSERT ON purchase_invoices
BEGIN
    UPDATE purchase_invoices
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_purchase_invoices_touch_updated_at_au
AFTER UPDATE ON purchase_invoices
BEGIN
    UPDATE purchase_invoices
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_purchase_invoices_mark_posted_au
AFTER UPDATE OF status ON purchase_invoices
WHEN NEW.status = 'POSTED'
BEGIN
    UPDATE purchase_invoices
    SET posted_once = 1,
        posted_token = COALESCE(NULLIF(posted_token, ''), NEW.id || ':POSTED')
    WHERE id = NEW.id;
END;

UPDATE purchase_invoices
SET company_id = COALESCE(NULLIF(company_id, ''), 'COMP_01')
WHERE COALESCE(company_id, '') = '';

-- ------------------------------------------------------------------
-- Stock Transfers
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_transfers (
    id TEXT PRIMARY KEY,
    code TEXT,
    date TEXT,
    status TEXT DEFAULT 'DRAFT',
    from_warehouse_id TEXT,
    to_warehouse_id TEXT
);

ALTER TABLE stock_transfers ADD COLUMN company_id TEXT;
ALTER TABLE stock_transfers ADD COLUMN branch_id TEXT;
ALTER TABLE stock_transfers ADD COLUMN request_type TEXT DEFAULT 'TRANSFER';
ALTER TABLE stock_transfers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stock_transfers ADD COLUMN posted_once INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_transfers ADD COLUMN posted_token TEXT;
ALTER TABLE stock_transfers ADD COLUMN voided_at DATETIME;
ALTER TABLE stock_transfers ADD COLUMN voided_by TEXT;
ALTER TABLE stock_transfers ADD COLUMN updated_at DATETIME;

UPDATE stock_transfers
SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE stock_transfer_items ADD COLUMN line_no INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stock_transfers_scope_status_date
    ON stock_transfers(company_id, branch_id, status, date, id);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_scope_from_to
    ON stock_transfers(company_id, branch_id, from_warehouse_id, to_warehouse_id, date, id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_transfers_doc_no_scope
    ON stock_transfers(company_id, COALESCE(branch_id, ''), code);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer_line
    ON stock_transfer_items(transfer_id, line_no);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_item
    ON stock_transfer_items(item_id);

CREATE TRIGGER IF NOT EXISTS trg_stock_transfers_touch_updated_at_ai
AFTER INSERT ON stock_transfers
BEGIN
    UPDATE stock_transfers
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_stock_transfers_touch_updated_at_au
AFTER UPDATE ON stock_transfers
BEGIN
    UPDATE stock_transfers
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_stock_transfers_mark_posted_au
AFTER UPDATE OF status ON stock_transfers
WHEN NEW.status = 'POSTED'
BEGIN
    UPDATE stock_transfers
    SET posted_once = 1,
        posted_token = COALESCE(NULLIF(posted_token, ''), NEW.id || ':POSTED')
    WHERE id = NEW.id;
END;

UPDATE stock_transfers
SET company_id = COALESCE(NULLIF(company_id, ''), 'COMP_01')
WHERE COALESCE(company_id, '') = '';

-- ------------------------------------------------------------------
-- Journals
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    voucher_no TEXT,
    date TEXT,
    status TEXT DEFAULT 'DRAFT'
);

ALTER TABLE journal_entries ADD COLUMN company_id TEXT;
ALTER TABLE journal_entries ADD COLUMN branch_id TEXT;
ALTER TABLE journal_entries ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE journal_entries ADD COLUMN posted_once INTEGER NOT NULL DEFAULT 0;
ALTER TABLE journal_entries ADD COLUMN posted_token TEXT;
ALTER TABLE journal_entries ADD COLUMN updated_at DATETIME;
ALTER TABLE journal_entries ADD COLUMN voided_at DATETIME;
ALTER TABLE journal_entries ADD COLUMN voided_by TEXT;

UPDATE journal_entries
SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE journal_entry_lines ADD COLUMN line_no INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_journal_entries_scope_status_date
    ON journal_entries(company_id, branch_id, status, date, id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_entries_doc_no_scope
    ON journal_entries(company_id, COALESCE(branch_id, ''), voucher_no);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_line
    ON journal_entry_lines(journal_entry_id, line_no);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account
    ON journal_entry_lines(account_id);

CREATE TRIGGER IF NOT EXISTS trg_journal_entries_touch_updated_at_ai
AFTER INSERT ON journal_entries
BEGIN
    UPDATE journal_entries
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_journal_entries_touch_updated_at_au
AFTER UPDATE ON journal_entries
BEGIN
    UPDATE journal_entries
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_journal_entries_mark_posted_au
AFTER UPDATE OF status ON journal_entries
WHEN NEW.status = 'POSTED'
BEGIN
    UPDATE journal_entries
    SET posted_once = 1,
        posted_token = COALESCE(NULLIF(posted_token, ''), NEW.id || ':POSTED')
    WHERE id = NEW.id;
END;

UPDATE journal_entries
SET company_id = COALESCE(NULLIF(company_id, ''), 'COMP_01')
WHERE COALESCE(company_id, '') = '';
