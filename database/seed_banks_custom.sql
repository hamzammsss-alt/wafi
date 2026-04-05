-- Seed Bank Accounts for User Request
-- 112 is presumed to be 'Banks' (Current Assets -> Cash & Banks -> Banks)

-- 1. Ensure Parent '112' exists (It should, but safety first)
-- If not, we rely on the user having a standard COA. 
-- We will insert children 112001 and 112002.

INSERT OR IGNORE INTO gl_chart_of_accounts (id, account_code, name_ar, name_en, parent_id, account_type, is_transactional, currency_id, balance)
VALUES 
(
    'bank-arab-chk', '112001', 'البنك العربي - جاري شيكل', 'Arab Bank - Current ILS', 
    (SELECT id FROM gl_chart_of_accounts WHERE account_code = '112' LIMIT 1), 
    'ASSET', 1, (SELECT id FROM currencies WHERE code = 'ILS' LIMIT 1), 0
),
(
    'bank-pal-chk', '112002', 'بنك فلسطين - جاري شيكل', 'Bank of Palestine - Current ILS', 
    (SELECT id FROM gl_chart_of_accounts WHERE account_code = '112' LIMIT 1), 
    'ASSET', 1, (SELECT id FROM currencies WHERE code = 'ILS' LIMIT 1), 0
);

-- 2. Link to Bank Accounts Table (so they appear in "Our Accounts" and are functional for cheques)
-- We need Bank Master Data first.
INSERT OR IGNORE INTO banks (id, name_ar, name_en, bank_code) VALUES ('bank-arab', 'البنك العربي', 'Arab Bank', 'ARAB');
INSERT OR IGNORE INTO banks (id, name_ar, name_en, bank_code) VALUES ('bank-pal', 'بنك فلسطين', 'Bank of Palestine', 'BOP');

INSERT OR IGNORE INTO bank_accounts (id, bank_id, bank_name, account_name, account_number, currency, gl_account_id, is_active)
VALUES
(
    'ba-arab-001', 'bank-arab', 'البنك العربي', 'Arab Bank Current', '123456', 'ILS', 
    (SELECT id FROM gl_chart_of_accounts WHERE account_code = '112001'), 1
),
(
    'ba-pal-001', 'bank-pal', 'بنك فلسطين', 'Palestine Bank Current', '987654', 'ILS', 
    (SELECT id FROM gl_chart_of_accounts WHERE account_code = '112002'), 1
);
