-- Sales Invoice Hardening V51
-- Enforces tenant-aware defaults, posting markers, and hot-path indexes.

ALTER TABLE sales_invoices ADD COLUMN company_id TEXT;
ALTER TABLE sales_invoices ADD COLUMN tax_group_id TEXT;
ALTER TABLE sales_invoices ADD COLUMN remarks TEXT;
ALTER TABLE sales_invoices ADD COLUMN posted_token TEXT;
ALTER TABLE sales_invoices ADD COLUMN posted_once INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales_invoices ADD COLUMN updated_at DATETIME;
ALTER TABLE sales_invoices ADD COLUMN locked_at DATETIME;

UPDATE sales_invoices
SET company_id = 'COMP_01'
WHERE COALESCE(company_id, '') = '';

UPDATE sales_invoices
SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE sales_invoice_lines ADD COLUMN line_no INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sales_invoices_scope_status_date
    ON sales_invoices(company_id, branch_id, status, date, id);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_scope_customer_date
    ON sales_invoices(company_id, customer_id, date, id);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_doc_no_scope_lookup
    ON sales_invoices(company_id, branch_id, invoice_no);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_posted_token
    ON sales_invoices(posted_token);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_invoice_line_no
    ON sales_invoice_lines(invoice_id, line_no);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_item
    ON sales_invoice_lines(item_id);

-- Prevent future duplicate numbers inside company/branch scope.
CREATE TRIGGER IF NOT EXISTS trg_sales_invoices_doc_no_scope_unique_ai
BEFORE INSERT ON sales_invoices
WHEN COALESCE(NEW.invoice_no, '') <> ''
BEGIN
    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM sales_invoices si
                WHERE COALESCE(si.company_id, 'COMP_01') = COALESCE(NEW.company_id, 'COMP_01')
                  AND COALESCE(si.branch_id, '') = COALESCE(NEW.branch_id, '')
                  AND si.invoice_no = NEW.invoice_no
            ) THEN RAISE(ABORT, 'DUPLICATE_DOC_NO_SCOPE')
        END;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_invoices_doc_no_scope_unique_au
BEFORE UPDATE OF invoice_no, company_id, branch_id ON sales_invoices
WHEN COALESCE(NEW.invoice_no, '') <> ''
BEGIN
    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM sales_invoices si
                WHERE si.id <> NEW.id
                  AND COALESCE(si.company_id, 'COMP_01') = COALESCE(NEW.company_id, 'COMP_01')
                  AND COALESCE(si.branch_id, '') = COALESCE(NEW.branch_id, '')
                  AND si.invoice_no = NEW.invoice_no
            ) THEN RAISE(ABORT, 'DUPLICATE_DOC_NO_SCOPE')
        END;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_invoices_touch_updated_at_ai
AFTER INSERT ON sales_invoices
BEGIN
    UPDATE sales_invoices
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_invoices_touch_updated_at_au
AFTER UPDATE ON sales_invoices
BEGIN
    UPDATE sales_invoices
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sales_invoices_mark_posted_au
AFTER UPDATE OF status ON sales_invoices
WHEN NEW.status = 'POSTED'
BEGIN
    UPDATE sales_invoices
    SET posted_once = 1,
        posted_token = COALESCE(NULLIF(posted_token, ''), NEW.id || ':POSTED')
    WHERE id = NEW.id;
END;
