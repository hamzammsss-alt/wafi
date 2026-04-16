const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

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

console.log('Adding missing columns to accounts table...\n');

const columnsToAdd = [
  { name: 'name_ar', type: 'TEXT', description: 'Arabic account name' },
  { name: 'account_category', type: 'TEXT', description: 'Category: BALANCE_SHEET or INCOME_STATEMENT' },
  { name: 'account_subtype', type: 'TEXT', description: 'Subtype within category' },
  { name: 'reference_type', type: 'TEXT', description: 'Reference linking: CUSTOMER, SUPPLIER, EMPLOYEE, BANK, etc.' },
  { name: 'system_type', type: 'TEXT', description: 'System linkage type' },
  { name: 'linked_partner_id', type: 'TEXT', description: 'Link to partner/employee' },
  { name: 'gl_account_id', type: 'TEXT', description: 'GL mapping' },
];

const existingCols = db.prepare('PRAGMA table_info(accounts)').all().map(c => c.name);

let added = 0;
columnsToAdd.forEach(col => {
  if (!existingCols.includes(col.name)) {
    try {
      db.prepare(`ALTER TABLE accounts ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`✓ Added ${col.name} (${col.type})`);
      added++;
    } catch (error) {
      console.log(`✗ Failed to add ${col.name}: ${error.message}`);
    }
  } else {
    console.log(`- ${col.name} already exists`);
  }
});

console.log(`\n✓ Added ${added} new columns`);

// Now populate the data
console.log('\nPopulating default values...');

// Populate name_ar from name (as fallback)
const missingAr = db.prepare(`SELECT COUNT(*) AS c FROM accounts WHERE name_ar IS NULL OR name_ar = ''`).get().c;
if (missingAr > 0) {
  db.prepare(`UPDATE accounts SET name_ar = name WHERE name_ar IS NULL OR name_ar = ''`).run();
  console.log(`✓ Populated name_ar for ${missingAr} accounts (from name)`);
}

// Populate categories based on type
const categoryMap = {
  'ASSET': 'BALANCE_SHEET',
  'LIABILITY': 'BALANCE_SHEET',
  'EQUITY': 'BALANCE_SHEET',
  'REVENUE': 'INCOME_STATEMENT',
  'EXPENSE': 'INCOME_STATEMENT',
};

let categorized = 0;
Object.entries(categoryMap).forEach(([type, category]) => {
  const count = db.prepare(`
    UPDATE accounts 
    SET account_category = ? 
    WHERE type = ? AND (account_category IS NULL OR account_category = '')
  `).run(category, type).changes;
  if (count > 0) {
    console.log(`✓ Categorized ${count} accounts (${type} → ${category})`);
    categorized += count;
  }
});

// Populate subtypes based on account type and code patterns
const subtypeRules = {
  'ASSET': [
    { code: '111', subtype: 'CASH' },
    { code: '112', subtype: 'BANK_ACCOUNT' },
    { code: '114', subtype: 'RECEIVABLES' },
    { code: '12', subtype: 'INVENTORY' },
    { code: '13', subtype: 'FIXED_ASSET' },
  ],
  'LIABILITY': [
    { code: '211', subtype: 'PAYABLES' },
    { code: '213', subtype: 'BANK_LOAN' },
  ],
  'EQUITY': [
    { code: '31', subtype: 'CAPITAL' },
  ],
  'REVENUE': [
    { code: '4', subtype: 'SALES' },
  ],
  'EXPENSE': [
    { code: '5', subtype: 'OPERATING' },
    { code: '6', subtype: 'Operating_EXP' },
  ],
};

let subtypesAdded = 0;
Object.entries(subtypeRules).forEach(([type, rules]) => {
  rules.forEach(rule => {
    const count = db.prepare(`
      UPDATE accounts 
      SET account_subtype = ? 
      WHERE type = ? 
        AND code LIKE ? 
        AND (account_subtype IS NULL OR account_subtype = '')
    `).run(rule.subtype, type, `${rule.code}%`).changes;
    if (count > 0) {
      subtypesAdded += count;
    }
  });
});
console.log(`✓ Populated account_subtype for ${subtypesAdded} accounts`);

// Set reference types based on system type
const refTypeMap = {
  'CUSTOMER': 'CUSTOMER',
  'SUPPLIER': 'SUPPLIER',
  'EMPLOYEE': 'EMPLOYEE',
  'BANK': 'BANK',
  'GENERAL': 'GENERAL',
};

const unclassifiedRef = db.prepare(`SELECT COUNT(*) AS c FROM accounts WHERE reference_type IS NULL OR reference_type = ''`).get().c;
if (unclassifiedRef > 0) {
  // Set GENERAL as default
  db.prepare(`UPDATE accounts SET reference_type = 'GENERAL' WHERE reference_type IS NULL OR reference_type = ''`).run();
  console.log(`✓ Set reference_type to GENERAL for ${unclassifiedRef} accounts (default)`);
}

console.log('\n' + '='.repeat(60));
console.log('Schema migration complete!');
console.log('='.repeat(60));

db.close();
