-- Schema V60: Treasury foundation on Journal Engine

CREATE TABLE IF NOT EXISTS treasury_documents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN (
        'CASH_RECEIPT',
        'CASH_PAYMENT',
        'BANK_RECEIPT',
        'BANK_PAYMENT',
        'CHEQUE_RECEIPT',
        'CHEQUE_PAYMENT'
    )),
    doc_no TEXT NOT NULL,
    doc_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    partner_id TEXT,
    cash_account_id TEXT,
    bank_account_id TEXT,
    currency_code TEXT NOT NULL DEFAULT 'ILS',
    currency_rate REAL NOT NULL DEFAULT 1,
    reference_no TEXT,
    remarks TEXT,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    journal_id TEXT,
    reversal_journal_id TEXT,
    posted_at TEXT,
    posted_by TEXT,
    reversed_at TEXT,
    reversed_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journals(id),
    FOREIGN KEY (reversal_journal_id) REFERENCES journals(id)
);

CREATE TABLE IF NOT EXISTS treasury_document_lines (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    account_id TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    description TEXT,
    cost_center_id TEXT,
    project_id TEXT,
    expense_type_id TEXT,
    vehicle_id TEXT,
    partner_id TEXT,
    item_id TEXT,
    warehouse_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES treasury_documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cheque_register (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    cheque_no TEXT NOT NULL,
    cheque_date TEXT NOT NULL,
    due_date TEXT,
    amount REAL NOT NULL DEFAULT 0,
    currency_code TEXT NOT NULL DEFAULT 'ILS',
    currency_rate REAL NOT NULL DEFAULT 1,
    bank_name TEXT,
    drawer_name TEXT,
    payee_name TEXT,
    partner_id TEXT,
    status TEXT NOT NULL CHECK (status IN (
        'IN_SAFE',
        'DEPOSITED',
        'CLEARED',
        'RETURNED',
        'CANCELLED',
        'ISSUED_PENDING',
        'ISSUED_CLEARED'
    )),
    direction TEXT NOT NULL CHECK (direction IN ('RECEIVED', 'ISSUED')),
    treasury_document_id TEXT,
    deposited_bank_account_id TEXT,
    cleared_date TEXT,
    returned_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (treasury_document_id) REFERENCES treasury_documents(id)
);

CREATE TABLE IF NOT EXISTS cheque_event_registry (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    cheque_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'RECEIVE',
        'ISSUE',
        'DEPOSIT',
        'CLEAR_RECEIVED',
        'RETURN_RECEIVED',
        'CLEAR_ISSUED',
        'CANCEL'
    )),
    event_date TEXT NOT NULL,
    journal_id TEXT,
    source_type TEXT NOT NULL,
    source_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cheque_id) REFERENCES cheque_register(id),
    FOREIGN KEY (journal_id) REFERENCES journals(id)
);

CREATE INDEX IF NOT EXISTS idx_treasury_documents_scope_status_date_v60
    ON treasury_documents(company_id, branch_id, status, doc_date, id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_treasury_documents_doc_no_scope_v60
    ON treasury_documents(company_id, COALESCE(branch_id, ''), doc_type, doc_no);

CREATE INDEX IF NOT EXISTS idx_treasury_document_lines_document_id_v60
    ON treasury_document_lines(document_id, line_no);

CREATE INDEX IF NOT EXISTS idx_treasury_document_lines_account_v60
    ON treasury_document_lines(account_id);

CREATE INDEX IF NOT EXISTS idx_cheque_register_direction_no_v60
    ON cheque_register(company_id, direction, cheque_no);

CREATE INDEX IF NOT EXISTS idx_cheque_register_document_v60
    ON cheque_register(treasury_document_id);

CREATE INDEX IF NOT EXISTS idx_cheque_register_status_v60
    ON cheque_register(company_id, status, direction);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cheque_event_registry_scope_v60
    ON cheque_event_registry(company_id, cheque_id, event_type);

DROP TRIGGER IF EXISTS trg_fin_defs_validate_role_insert_v56;
DROP TRIGGER IF EXISTS trg_fin_defs_validate_role_update_v56;

CREATE TRIGGER IF NOT EXISTS trg_fin_defs_validate_role_insert_v56
BEFORE INSERT ON financial_definitions
FOR EACH ROW
WHEN UPPER(COALESCE(NEW.account_role, '')) NOT IN (
    'RECEIVABLE_ACCOUNT',
    'PAYABLE_ACCOUNT',
    'REVENUE_ACCOUNT',
    'SERVICE_REVENUE_ACCOUNT',
    'EXPENSE_ACCOUNT',
    'INVENTORY_ACCOUNT',
    'RAW_MATERIAL_INVENTORY_ACCOUNT',
    'WIP_INVENTORY_ACCOUNT',
    'FINISHED_GOODS_INVENTORY_ACCOUNT',
    'MERCHANDISE_INVENTORY_ACCOUNT',
    'COGS_ACCOUNT',
    'PURCHASE_RETURN_ACCOUNT',
    'SALES_RETURN_ACCOUNT',
    'SALES_DISCOUNT_ACCOUNT',
    'PURCHASE_DISCOUNT_ACCOUNT',
    'VAT_INPUT_ACCOUNT',
    'VAT_OUTPUT_ACCOUNT',
    'WITHHOLDING_TAX_ACCOUNT',
    'ROUNDING_ACCOUNT',
    'FREIGHT_IN_ACCOUNT',
    'INVENTORY_ADJUSTMENT_ACCOUNT',
    'PRICE_DIFFERENCE_ACCOUNT',
    'SUSPENSE_ACCOUNT',
    'CASH_ACCOUNT',
    'BANK_ACCOUNT',
    'CHEQUE_IN_SAFE_ACCOUNT',
    'CHEQUES_DEPOSITED_ACCOUNT',
    'RETURNED_CHEQUE_ACCOUNT',
    'ISSUED_CHEQUE_ACCOUNT',
    'BANK_CLEARING_ACCOUNT'
)
BEGIN
    SELECT RAISE(ABORT, 'Invalid account_role in financial_definitions');
END;

CREATE TRIGGER IF NOT EXISTS trg_fin_defs_validate_role_update_v56
BEFORE UPDATE OF account_role ON financial_definitions
FOR EACH ROW
WHEN UPPER(COALESCE(NEW.account_role, '')) NOT IN (
    'RECEIVABLE_ACCOUNT',
    'PAYABLE_ACCOUNT',
    'REVENUE_ACCOUNT',
    'SERVICE_REVENUE_ACCOUNT',
    'EXPENSE_ACCOUNT',
    'INVENTORY_ACCOUNT',
    'RAW_MATERIAL_INVENTORY_ACCOUNT',
    'WIP_INVENTORY_ACCOUNT',
    'FINISHED_GOODS_INVENTORY_ACCOUNT',
    'MERCHANDISE_INVENTORY_ACCOUNT',
    'COGS_ACCOUNT',
    'PURCHASE_RETURN_ACCOUNT',
    'SALES_RETURN_ACCOUNT',
    'SALES_DISCOUNT_ACCOUNT',
    'PURCHASE_DISCOUNT_ACCOUNT',
    'VAT_INPUT_ACCOUNT',
    'VAT_OUTPUT_ACCOUNT',
    'WITHHOLDING_TAX_ACCOUNT',
    'ROUNDING_ACCOUNT',
    'FREIGHT_IN_ACCOUNT',
    'INVENTORY_ADJUSTMENT_ACCOUNT',
    'PRICE_DIFFERENCE_ACCOUNT',
    'SUSPENSE_ACCOUNT',
    'CASH_ACCOUNT',
    'BANK_ACCOUNT',
    'CHEQUE_IN_SAFE_ACCOUNT',
    'CHEQUES_DEPOSITED_ACCOUNT',
    'RETURNED_CHEQUE_ACCOUNT',
    'ISSUED_CHEQUE_ACCOUNT',
    'BANK_CLEARING_ACCOUNT'
)
BEGIN
    SELECT RAISE(ABORT, 'Invalid account_role in financial_definitions');
END;