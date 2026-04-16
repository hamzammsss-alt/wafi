/**
 * Comprehensive Accounting Audit & Linking System
 * Verifies and links:
 * - Chart of Accounts (types, categories, subtypes)
 * - Reference types and linking logic
 * - Voucher linkage to accounts
 * - Journal entry validation
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function resolveDbPath() {
  const candidates = [
    path.resolve('wafi.db'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'wafi-erp', 'wafi.db') : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Could not locate database file (wafi.db).');
}

const db = new Database(resolveDbPath());

// ============ AUDIT SECTION 1: Account Classification ============
console.log('\n' + '='.repeat(80));
console.log('AUDIT 1: ACCOUNT CLASSIFICATION');
console.log('='.repeat(80));

const accountCols = db.prepare('PRAGMA table_info(accounts)').all().map((c) => c.name);
const has = (cols, name) => cols.includes(name);

const totalAccounts = db.prepare('SELECT COUNT(*) AS c FROM accounts').get().c;
console.log(`\n✓ Total accounts: ${totalAccounts}`);

// Type distribution
if (has(accountCols, 'type')) {
  const typeRows = db.prepare(`
    SELECT type, COUNT(*) AS count 
    FROM accounts 
    WHERE type IS NOT NULL AND type != '' 
    GROUP BY type 
    ORDER BY count DESC
  `).all();
  
  console.log('\nAccount Types Distribution:');
  let typesOk = 0;
  typeRows.forEach(row => {
    const icon = row.count > 0 ? '✓' : '✗';
    console.log(`  ${icon} ${row.type}: ${row.count}`);
    if (row.count > 0) typesOk++;
  });
  
  const unclassified = db.prepare(`SELECT COUNT(*) AS c FROM accounts WHERE type IS NULL OR type = ''`).get().c;
  if (unclassified > 0) {
    console.log(`  ✗ Unclassified (null/empty): ${unclassified} ⚠️`);
  } else {
    console.log(`  ✓ All accounts classified by type`);
  }
}

// ============ AUDIT SECTION 2: Reference Type Linking ============
console.log('\n' + '='.repeat(80));
console.log('AUDIT 2: REFERENCE TYPE & LINKING LOGIC');
console.log('='.repeat(80));

if (has(accountCols, 'reference_type')) {
  const refTypeRows = db.prepare(`
    SELECT reference_type, COUNT(*) AS count 
    FROM accounts 
    WHERE reference_type IS NOT NULL AND reference_type != '' 
    GROUP BY reference_type 
    ORDER BY count DESC
  `).all();
  
  console.log('\nReference Types:');
  if (refTypeRows.length === 0) {
    console.log('  ✗ No reference types defined ⚠️');
  } else {
    refTypeRows.forEach(row => {
      console.log(`  ✓ ${row.reference_type}: ${row.count} accounts`);
    });
  }
} else {
  console.log('  ⚠️ reference_type column not found in accounts table');
}

// ============ AUDIT SECTION 3: Voucher Linkage ============
console.log('\n' + '='.repeat(80));
console.log('AUDIT 3: VOUCHER & JOURNAL LINKAGE');
console.log('='.repeat(80));

// Check treasury vouchers
const treasurySql = `SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='treasury_vouchers'`;
const hasTreasuryTable = db.prepare(treasurySql).get().c > 0;

if (hasTreasuryTable) {
  const treasuryCount = db.prepare('SELECT COUNT(*) AS c FROM treasury_vouchers').get().c;
  console.log(`\n✓ Treasury Vouchers: ${treasuryCount} vouchers`);
  
  // Check linked to journal
  const linkedToJournal = db.prepare(`
    SELECT COUNT(*) AS c FROM treasury_vouchers 
    WHERE journal_header_id IS NOT NULL
  `).get().c;
  console.log(`  ${linkedToJournal === treasuryCount ? '✓' : '✗'} Linked to journal: ${linkedToJournal}/${treasuryCount}`);
  
  // Check manual refs
  const withRef = db.prepare(`
    SELECT COUNT(*) AS c FROM treasury_vouchers 
    WHERE manual_ref IS NOT NULL AND manual_ref != ''
  `).get().c;
  console.log(`  ✓ With manual references: ${withRef}/${treasuryCount}`);
}

// Check journal entries
const journalCount = db.prepare('SELECT COUNT(*) AS c FROM journal_entries').get().c;
console.log(`\n✓ Journal Entries: ${journalCount} entries`);

const journalLinesCols = db.prepare('PRAGMA table_info(journal_entry_lines)').all().map(c => c.name);
const journalLineCount = db.prepare('SELECT COUNT(*) AS c FROM journal_entry_lines').get().c;
console.log(`✓ Journal Entry Lines: ${journalLineCount} lines`);

// Check line-level linkage
let linkageStats = {
  withSubAccount: 0,
  withInvoiceRef: 0,
  withCustomerId: 0,
  withTaxRef: 0,
  withBankAccountId: 0,
  total: journalLineCount
};

if (has(journalLinesCols, 'sub_account_id')) {
  linkageStats.withSubAccount = db.prepare(`
    SELECT COUNT(*) AS c FROM journal_entry_lines 
    WHERE sub_account_id IS NOT NULL AND sub_account_id != ''
  `).get().c;
}

if (has(journalLinesCols, 'invoice_ref')) {
  linkageStats.withInvoiceRef = db.prepare(`
    SELECT COUNT(*) AS c FROM journal_entry_lines 
    WHERE invoice_ref IS NOT NULL AND invoice_ref != ''
  `).get().c;
}

if (has(journalLinesCols, 'customer_id')) {
  linkageStats.withCustomerId = db.prepare(`
    SELECT COUNT(*) AS c FROM journal_entry_lines 
    WHERE customer_id IS NOT NULL AND customer_id != ''
  `).get().c;
}

if (has(journalLinesCols, 'tax_ref')) {
  linkageStats.withTaxRef = db.prepare(`
    SELECT COUNT(*) AS c FROM journal_entry_lines 
    WHERE tax_ref IS NOT NULL AND tax_ref != ''
  `).get().c;
}

if (has(journalLinesCols, 'bank_account_id')) {
  linkageStats.withBankAccountId = db.prepare(`
    SELECT COUNT(*) AS c FROM journal_entry_lines 
    WHERE bank_account_id IS NOT NULL AND bank_account_id != ''
  `).get().c;
}

console.log('\nJournal Line Linkage:');
console.log(`  ${linkageStats.withSubAccount > 0 ? '✓' : '⚠'} With sub-account: ${linkageStats.withSubAccount}/${journalLineCount}`);
console.log(`  ${linkageStats.withInvoiceRef > 0 ? '✓' : '⚠'} With invoice ref: ${linkageStats.withInvoiceRef}/${journalLineCount}`);
console.log(`  ${linkageStats.withCustomerId > 0 ? '✓' : '⚠'} With customer ID: ${linkageStats.withCustomerId}/${journalLineCount}`);
console.log(`  ${linkageStats.withTaxRef > 0 ? '✓' : '⚠'} With tax ref: ${linkageStats.withTaxRef}/${journalLineCount}`);
console.log(`  ${linkageStats.withBankAccountId > 0 ? '✓' : '⚠'} With bank account: ${linkageStats.withBankAccountId}/${journalLineCount}`);

// ============ AUDIT SECTION 4: Reference Linking Logic ============
console.log('\n' + '='.repeat(80));
console.log('AUDIT 4: REFERENCE LINKING LOGIC BY ACCOUNT TYPE');
console.log('='.repeat(80));

const typeRefAnalysis = db.prepare(`
  SELECT 
    a.type,
    a.reference_type,
    COUNT(*) AS count
  FROM accounts a
  WHERE a.type IS NOT NULL AND a.type != ''
  GROUP BY a.type, a.reference_type
  ORDER BY a.type, COALESCE(a.reference_type, '')
`).all();

console.log('\nAccount Type → Reference Type Mapping:');
let currentType = null;
typeRefAnalysis.forEach(row => {
  if (row.type !== currentType) {
    currentType = row.type;
    console.log(`\n  ${row.type}:`);
  }
  const refType = row.reference_type || '(none)';
  console.log(`    → ${refType}: ${row.count}`);
});

// ============ AUDIT SECTION 5: Missing Definitions ============
console.log('\n' + '='.repeat(80));
console.log('AUDIT 5: MISSING OR INCOMPLETE DEFINITIONS');
console.log('='.repeat(80));

const missingIssues = [];

// Missing account names
const missingNames = db.prepare(`
  SELECT COUNT(*) AS c FROM accounts 
  WHERE name_ar IS NULL OR name_ar = ''
`).get().c;
if (missingNames > 0) {
  missingIssues.push(`Missing Arabic names: ${missingNames} accounts`);
}

// Missing linked accounts for partners
const missingLinkedPartners = db.prepare(`
  SELECT COUNT(*) AS c FROM business_partners 
  WHERE linked_account_id IS NULL OR linked_account_id = ''
`).get().c;
if (missingLinkedPartners > 0) {
  missingIssues.push(`Partners without linked accounts: ${missingLinkedPartners}`);
}

// Orphaned accounts (no transactions)
const orphanedAccounts = db.prepare(`
  SELECT COUNT(*) AS c FROM accounts a
  LEFT JOIN journal_entry_lines l ON a.id = l.account_id
  WHERE l.account_id IS NULL AND a.is_transactional = 1
`).get().c;
if (orphanedAccounts > 0) {
  missingIssues.push(`Transactional accounts with no transactions: ${orphanedAccounts}`);
}

if (missingIssues.length === 0) {
  console.log('✓ No major issues detected');
} else {
  console.log('⚠️ Issues found:');
  missingIssues.forEach(issue => {
    console.log(`  • ${issue}`);
  });
}

// ============ SUMMARY ============
console.log('\n' + '='.repeat(80));
console.log('AUDIT SUMMARY');
console.log('='.repeat(80));

const summary = {
  '📊 Accounts': totalAccounts,
  '📋 Journal Entries': journalCount,
  '📝 Journal Lines': journalLineCount,
  '🔗 Linked Journal Lines': 
    `${linkageStats.withSubAccount}/${journalLineCount} (sub), ` +
    `${linkageStats.withInvoiceRef}/${journalLineCount} (ref), ` +
    `${linkageStats.withCustomerId}/${journalLineCount} (cust)`,
  '✓ Status': missingIssues.length === 0 ? 'HEALTHY' : `⚠️ ${missingIssues.length} issues`
};

Object.entries(summary).forEach(([key, val]) => {
  console.log(`${key}: ${val}`);
});

console.log('\n' + '='.repeat(80));
console.log('Audit complete. Check for any ⚠️ warnings above.');
console.log('='.repeat(80) + '\n');

db.close();
