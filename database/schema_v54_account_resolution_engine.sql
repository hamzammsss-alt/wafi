-- Schema V54: Account Resolution Engine qualifiers and deterministic variant indexing

ALTER TABLE financial_definitions ADD COLUMN document_type TEXT;
ALTER TABLE financial_definitions ADD COLUMN line_type TEXT;
ALTER TABLE financial_definitions ADD COLUMN tax_profile_id TEXT;

UPDATE financial_definitions
SET
    document_type = NULLIF(UPPER(TRIM(COALESCE(document_type, ''))), ''),
    line_type = NULLIF(UPPER(TRIM(COALESCE(line_type, ''))), ''),
    tax_profile_id = NULLIF(UPPER(TRIM(COALESCE(tax_profile_id, ''))), '');

DROP INDEX IF EXISTS ux_financial_definitions_active;

CREATE UNIQUE INDEX IF NOT EXISTS ux_financial_definitions_active_variant
ON financial_definitions(
    company_id,
    COALESCE(branch_id, ''),
    scope_type,
    scope_id,
    mapping_key,
    COALESCE(document_type, ''),
    COALESCE(line_type, ''),
    COALESCE(tax_profile_id, '')
)
WHERE is_active = 1;

CREATE INDEX IF NOT EXISTS idx_fin_defs_resolve_scope
ON financial_definitions(company_id, scope_type, scope_id, mapping_key, is_active);

CREATE INDEX IF NOT EXISTS idx_fin_defs_resolve_scope_branch
ON financial_definitions(company_id, scope_type, scope_id, branch_id, mapping_key, is_active);

CREATE INDEX IF NOT EXISTS idx_fin_defs_resolve_qual
ON financial_definitions(company_id, mapping_key, document_type, line_type, tax_profile_id, is_active);
