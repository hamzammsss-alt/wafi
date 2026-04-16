-- Schema V56: Financial Definitions owner/role model for Account Resolution Engine

ALTER TABLE financial_definitions ADD COLUMN owner_type TEXT;
ALTER TABLE financial_definitions ADD COLUMN owner_id TEXT;
ALTER TABLE financial_definitions ADD COLUMN account_role TEXT;
ALTER TABLE financial_definitions ADD COLUMN notes TEXT;

UPDATE financial_definitions
SET owner_type = COALESCE(NULLIF(owner_type, ''), NULLIF(scope_type, ''), 'COMPANY');

UPDATE financial_definitions
SET owner_id = COALESCE(
    NULLIF(owner_id, ''),
    NULLIF(scope_id, ''),
    CASE
        WHEN owner_type = 'COMPANY' THEN 'DEFAULT'
        WHEN owner_type = 'DOCUMENT_TYPE_DEFAULT' THEN COALESCE(NULLIF(document_type, ''), 'GENERAL')
        ELSE 'DEFAULT'
    END
);

UPDATE financial_definitions
SET account_role = COALESCE(
    NULLIF(account_role, ''),
    CASE UPPER(COALESCE(mapping_key, ''))
        WHEN 'RECEIVABLE' THEN 'RECEIVABLE_ACCOUNT'
        WHEN 'PAYABLE' THEN 'PAYABLE_ACCOUNT'
        WHEN 'REVENUE' THEN 'REVENUE_ACCOUNT'
        WHEN 'EXPENSE' THEN 'EXPENSE_ACCOUNT'
        WHEN 'INVENTORY' THEN 'INVENTORY_ACCOUNT'
        WHEN 'COGS' THEN 'COGS_ACCOUNT'
        WHEN 'TAX_PAYABLE' THEN 'VAT_OUTPUT_ACCOUNT'
        WHEN 'TAX_RECEIVABLE' THEN 'VAT_INPUT_ACCOUNT'
        WHEN 'DISCOUNT' THEN 'SALES_DISCOUNT_ACCOUNT'
        WHEN 'ROUNDING' THEN 'ROUNDING_ACCOUNT'
        ELSE 'SUSPENSE_ACCOUNT'
    END
);

DELETE FROM financial_definitions
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY company_id, owner_type, owner_id, account_role
                ORDER BY is_active DESC, COALESCE(updated_at, created_at, '') DESC, id DESC
            ) AS rn
        FROM financial_definitions
    ) ranked
    WHERE ranked.rn > 1
);

CREATE INDEX IF NOT EXISTS idx_fin_defs_company_v56
ON financial_definitions(company_id);

CREATE INDEX IF NOT EXISTS idx_fin_defs_owner_v56
ON financial_definitions(company_id, owner_type, owner_id);

CREATE INDEX IF NOT EXISTS idx_fin_defs_role_v56
ON financial_definitions(company_id, account_role);

CREATE INDEX IF NOT EXISTS idx_fin_defs_account_v56
ON financial_definitions(company_id, account_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_defs_company_owner_role_v56
ON financial_definitions(company_id, owner_type, owner_id, account_role);

CREATE TRIGGER IF NOT EXISTS trg_fin_defs_validate_owner_insert_v56
BEFORE INSERT ON financial_definitions
FOR EACH ROW
WHEN UPPER(COALESCE(NEW.owner_type, '')) NOT IN (
    'COMPANY',
    'BRANCH',
    'ITEM',
    'ITEM_GROUP',
    'WAREHOUSE',
    'PARTNER',
    'TAX_PROFILE',
    'DOCUMENT_TYPE_DEFAULT'
)
BEGIN
    SELECT RAISE(ABORT, 'Invalid owner_type in financial_definitions');
END;

CREATE TRIGGER IF NOT EXISTS trg_fin_defs_validate_owner_update_v56
BEFORE UPDATE OF owner_type ON financial_definitions
FOR EACH ROW
WHEN UPPER(COALESCE(NEW.owner_type, '')) NOT IN (
    'COMPANY',
    'BRANCH',
    'ITEM',
    'ITEM_GROUP',
    'WAREHOUSE',
    'PARTNER',
    'TAX_PROFILE',
    'DOCUMENT_TYPE_DEFAULT'
)
BEGIN
    SELECT RAISE(ABORT, 'Invalid owner_type in financial_definitions');
END;

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
    'SUSPENSE_ACCOUNT'
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
    'SUSPENSE_ACCOUNT'
)
BEGIN
    SELECT RAISE(ABORT, 'Invalid account_role in financial_definitions');
END;

CREATE TRIGGER IF NOT EXISTS trg_fin_defs_owner_id_required_insert_v56
BEFORE INSERT ON financial_definitions
FOR EACH ROW
WHEN TRIM(COALESCE(NEW.owner_id, '')) = ''
BEGIN
    SELECT RAISE(ABORT, 'owner_id is required in financial_definitions');
END;

CREATE TRIGGER IF NOT EXISTS trg_fin_defs_owner_id_required_update_v56
BEFORE UPDATE OF owner_id ON financial_definitions
FOR EACH ROW
WHEN TRIM(COALESCE(NEW.owner_id, '')) = ''
BEGIN
    SELECT RAISE(ABORT, 'owner_id is required in financial_definitions');
END;
