-- Schema V55: Fixed-width ERP Chart of Accounts foundation
-- Adds ERP-grade account fields for hierarchy, controls, and posting safety.

ALTER TABLE accounts ADD COLUMN company_id TEXT DEFAULT 'COMP_01';
ALTER TABLE accounts ADD COLUMN category TEXT;
ALTER TABLE accounts ADD COLUMN subtype TEXT;
ALTER TABLE accounts ADD COLUMN is_posting INTEGER DEFAULT 1;
ALTER TABLE accounts ADD COLUMN is_group INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN normal_balance TEXT DEFAULT 'DEBIT';
ALTER TABLE accounts ADD COLUMN system_tag TEXT;
ALTER TABLE accounts ADD COLUMN allow_manual_entry INTEGER DEFAULT 1;
ALTER TABLE accounts ADD COLUMN level INTEGER;
ALTER TABLE accounts ADD COLUMN path TEXT;
ALTER TABLE accounts ADD COLUMN created_at TEXT DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN updated_at TEXT DEFAULT NULL;

UPDATE accounts
SET company_id = COALESCE(NULLIF(company_id, ''), 'COMP_01');

UPDATE accounts
SET code = COALESCE(NULLIF(code, ''), NULLIF(account_code, ''), id);

UPDATE accounts
SET category = COALESCE(
    NULLIF(category, ''),
    NULLIF(account_category, ''),
    CASE UPPER(COALESCE(type, ''))
        WHEN 'ASSET' THEN 'ASSET'
        WHEN 'LIABILITY' THEN 'LIABILITY'
        WHEN 'EQUITY' THEN 'EQUITY'
        WHEN 'REVENUE' THEN 'REVENUE'
        WHEN 'EXPENSE' THEN 'EXPENSE'
        ELSE 'ASSET'
    END
);

UPDATE accounts
SET
    is_posting = CASE
        WHEN EXISTS (
            SELECT 1
            FROM accounts c
            WHERE c.parent_id = accounts.id
        ) THEN 0
        ELSE COALESCE(
            is_posting,
            posting_allowed,
            is_transactional,
            CASE WHEN COALESCE(is_group, 0) = 1 THEN 0 ELSE 1 END
        )
    END,
    allow_manual_entry = CASE
        WHEN EXISTS (
            SELECT 1
            FROM accounts c
            WHERE c.parent_id = accounts.id
        ) THEN 0
        WHEN COALESCE(
            is_posting,
            posting_allowed,
            is_transactional,
            CASE WHEN COALESCE(is_group, 0) = 1 THEN 0 ELSE 1 END
        ) = 0 THEN 0
        ELSE COALESCE(allow_manual_entry, 1)
    END;

UPDATE accounts
SET subtype = COALESCE(
    NULLIF(subtype, ''),
    NULLIF(account_subtype, ''),
    CASE WHEN COALESCE(is_posting, 1) = 1 THEN 'GENERAL' ELSE 'GROUP' END
);

UPDATE accounts
SET normal_balance = COALESCE(
    NULLIF(normal_balance, ''),
    CASE
        WHEN category IN ('LIABILITY', 'EQUITY', 'REVENUE', 'OTHER_INCOME') THEN 'CREDIT'
        ELSE 'DEBIT'
    END
);

UPDATE accounts
SET allow_manual_entry = CASE
    WHEN COALESCE(is_posting, posting_allowed, is_transactional, 1) = 0 THEN 0
    ELSE COALESCE(allow_manual_entry, 1)
END;

UPDATE accounts
SET level = COALESCE(level, account_level, 1);

UPDATE accounts
SET path = COALESCE(NULLIF(path, ''), UPPER(COALESCE(code, id)));

UPDATE accounts
SET account_code = COALESCE(NULLIF(account_code, ''), code),
    account_category = COALESCE(NULLIF(account_category, ''), category),
    account_subtype = COALESCE(NULLIF(account_subtype, ''), subtype),
    posting_allowed = COALESCE(posting_allowed, is_posting),
    account_level = COALESCE(account_level, level),
    status = COALESCE(NULLIF(status, ''), CASE WHEN COALESCE(is_active, 1) = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END),
    is_active = COALESCE(is_active, CASE WHEN COALESCE(status, 'ACTIVE') = 'ACTIVE' THEN 1 ELSE 0 END);

CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_company_code_v55
ON accounts(company_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_company_system_tag_v55
ON accounts(company_id, system_tag)
WHERE system_tag IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_parent_id_v55
ON accounts(parent_id);

CREATE INDEX IF NOT EXISTS idx_accounts_category_v55
ON accounts(category);

CREATE INDEX IF NOT EXISTS idx_accounts_is_posting_v55
ON accounts(is_posting);

CREATE INDEX IF NOT EXISTS idx_accounts_is_active_v55
ON accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_accounts_company_path_v55
ON accounts(company_id, path);

CREATE TRIGGER IF NOT EXISTS trg_accounts_updated_at_v55
AFTER UPDATE ON accounts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE accounts
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_prevent_child_of_posting_insert_v55
BEFORE INSERT ON accounts
FOR EACH ROW
WHEN NEW.parent_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM accounts p
    WHERE p.id = NEW.parent_id
      AND COALESCE(p.is_posting, p.posting_allowed, p.is_transactional, 1) = 1
  )
BEGIN
    SELECT RAISE(ABORT, 'Posting accounts cannot have children');
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_prevent_child_of_posting_update_v55
BEFORE UPDATE OF parent_id ON accounts
FOR EACH ROW
WHEN NEW.parent_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM accounts p
    WHERE p.id = NEW.parent_id
      AND COALESCE(p.is_posting, p.posting_allowed, p.is_transactional, 1) = 1
  )
BEGIN
    SELECT RAISE(ABORT, 'Posting accounts cannot have children');
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_prevent_posting_with_children_v55
BEFORE UPDATE OF is_posting ON accounts
FOR EACH ROW
WHEN COALESCE(NEW.is_posting, 1) = 1
  AND EXISTS (
    SELECT 1
    FROM accounts c
    WHERE c.parent_id = NEW.id
  )
BEGIN
    SELECT RAISE(ABORT, 'Posting accounts cannot have children');
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_header_manual_forbidden_insert_v55
BEFORE INSERT ON accounts
FOR EACH ROW
WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) = 0
  AND COALESCE(NEW.allow_manual_entry, 1) = 1
BEGIN
    SELECT RAISE(ABORT, 'Header accounts cannot allow manual entry');
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_header_manual_forbidden_update_v55
BEFORE UPDATE OF is_posting, allow_manual_entry ON accounts
FOR EACH ROW
WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) = 0
  AND COALESCE(NEW.allow_manual_entry, 1) = 1
BEGIN
    SELECT RAISE(ABORT, 'Header accounts cannot allow manual entry');
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_ar_control_policy_insert_v55
BEFORE INSERT ON accounts
FOR EACH ROW
WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) = 'RECEIVABLE_CONTROL'
   OR UPPER(COALESCE(NEW.system_tag, '')) = 'AR_CONTROL'
BEGIN
    SELECT CASE
        WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) != 'RECEIVABLE_CONTROL' THEN RAISE(ABORT, 'AR control must use RECEIVABLE_CONTROL subtype')
        WHEN UPPER(COALESCE(NEW.system_tag, '')) != 'AR_CONTROL' THEN RAISE(ABORT, 'AR control must use AR_CONTROL system tag')
        WHEN UPPER(COALESCE(NEW.category, NEW.account_category, '')) != 'ASSET' THEN RAISE(ABORT, 'AR control must be ASSET category')
        WHEN COALESCE(NEW.allow_manual_entry, 1) = 1 THEN RAISE(ABORT, 'AR control cannot allow manual entry')
        WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) != 1 THEN RAISE(ABORT, 'AR control must be posting')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_ar_control_policy_update_v55
BEFORE UPDATE OF subtype, account_subtype, system_tag, category, account_category, allow_manual_entry, is_posting, posting_allowed, is_transactional ON accounts
FOR EACH ROW
WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) = 'RECEIVABLE_CONTROL'
   OR UPPER(COALESCE(NEW.system_tag, '')) = 'AR_CONTROL'
BEGIN
    SELECT CASE
        WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) != 'RECEIVABLE_CONTROL' THEN RAISE(ABORT, 'AR control must use RECEIVABLE_CONTROL subtype')
        WHEN UPPER(COALESCE(NEW.system_tag, '')) != 'AR_CONTROL' THEN RAISE(ABORT, 'AR control must use AR_CONTROL system tag')
        WHEN UPPER(COALESCE(NEW.category, NEW.account_category, '')) != 'ASSET' THEN RAISE(ABORT, 'AR control must be ASSET category')
        WHEN COALESCE(NEW.allow_manual_entry, 1) = 1 THEN RAISE(ABORT, 'AR control cannot allow manual entry')
        WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) != 1 THEN RAISE(ABORT, 'AR control must be posting')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_ap_control_policy_insert_v55
BEFORE INSERT ON accounts
FOR EACH ROW
WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) = 'PAYABLE_CONTROL'
   OR UPPER(COALESCE(NEW.system_tag, '')) = 'AP_CONTROL'
BEGIN
    SELECT CASE
        WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) != 'PAYABLE_CONTROL' THEN RAISE(ABORT, 'AP control must use PAYABLE_CONTROL subtype')
        WHEN UPPER(COALESCE(NEW.system_tag, '')) != 'AP_CONTROL' THEN RAISE(ABORT, 'AP control must use AP_CONTROL system tag')
        WHEN UPPER(COALESCE(NEW.category, NEW.account_category, '')) != 'LIABILITY' THEN RAISE(ABORT, 'AP control must be LIABILITY category')
        WHEN COALESCE(NEW.allow_manual_entry, 1) = 1 THEN RAISE(ABORT, 'AP control cannot allow manual entry')
        WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) != 1 THEN RAISE(ABORT, 'AP control must be posting')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_accounts_ap_control_policy_update_v55
BEFORE UPDATE OF subtype, account_subtype, system_tag, category, account_category, allow_manual_entry, is_posting, posting_allowed, is_transactional ON accounts
FOR EACH ROW
WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) = 'PAYABLE_CONTROL'
   OR UPPER(COALESCE(NEW.system_tag, '')) = 'AP_CONTROL'
BEGIN
    SELECT CASE
        WHEN UPPER(COALESCE(NEW.subtype, NEW.account_subtype, '')) != 'PAYABLE_CONTROL' THEN RAISE(ABORT, 'AP control must use PAYABLE_CONTROL subtype')
        WHEN UPPER(COALESCE(NEW.system_tag, '')) != 'AP_CONTROL' THEN RAISE(ABORT, 'AP control must use AP_CONTROL system tag')
        WHEN UPPER(COALESCE(NEW.category, NEW.account_category, '')) != 'LIABILITY' THEN RAISE(ABORT, 'AP control must be LIABILITY category')
        WHEN COALESCE(NEW.allow_manual_entry, 1) = 1 THEN RAISE(ABORT, 'AP control cannot allow manual entry')
        WHEN COALESCE(NEW.is_posting, NEW.posting_allowed, NEW.is_transactional, 1) != 1 THEN RAISE(ABORT, 'AP control must be posting')
    END;
END;
