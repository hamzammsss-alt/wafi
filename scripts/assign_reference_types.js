/**
 * Intelligent Reference Type Assignment
 * Analyzes account names and codes to assign proper reference types
 * - CUSTOMER: للحسابات المرتبطة بالعملاء
 * - SUPPLIER: للحسابات المرتبطة بالموردين
 * - EMPLOYEE: للحسابات المرتبطة بالموظفين
 * - BANK: للحسابات البنكية
 * - GENERAL: للحسابات العامة
 */

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

console.log('Analyzing accounts to assign reference types...\n');

// Rules for reference type assignment
const referenceRules = [
  // CUSTOMER references (Accounts Receivable)
  {
    patterns: [/customer|عميل|ar:عميل|receivable|ar:مدين|دين العملاء/i],
    type: 'CUSTOMER',
    codes: ['114', '1141']
  },
  
  // SUPPLIER references (Accounts Payable)
  {
    patterns: [/supplier|مورد|ar:مورد|payable|ar:دائن|ديون الموردين/i],
    type: 'SUPPLIER',
    codes: ['211', '2111', '212']
  },
  
  // EMPLOYEE references (HR, Salaries)
  {
    patterns: [/employee|موظف|ar:موظف|salary|wages|ar:رواتب|ar:أجور/i],
    type: 'EMPLOYEE',
    codes: ['114', '211', '52']
  },
  
  // BANK references
  {
    patterns: [/bank|بنك|ar:بنك|checking|savings|cash in/i],
    type: 'BANK',
    codes: ['112', '1121', '1122']
  },
];

// Get all accounts
const accounts = db.prepare(`
  SELECT id, code, name, name_ar, type, reference_type 
  FROM accounts
`).all();

console.log(`Processing ${accounts.length} accounts...\n`);

let updated = {};
updated.customer = 0;
updated.supplier = 0;
updated.employee = 0;
updated.bank = 0;
updated.unchanged = 0;

const update = db.prepare(`
  UPDATE accounts 
  SET reference_type = ? 
  WHERE id = ?
`);

accounts.forEach(account => {
  const searchText = `${account.code} ${account.name} ${account.name_ar}`.toLowerCase();
  let newType = null;

  // Check against rules
  for (const rule of referenceRules) {
    // Check by code
    if (rule.codes.some(c => account.code && account.code.startsWith(c))) {
      newType = rule.type;
      break;
    }
    
    // Check by name pattern
    if (rule.patterns.some(p => p.test(searchText))) {
      newType = rule.type;
      break;
    }
  }

  if (newType && newType !== account.reference_type) {
    update.run(newType, account.id);
    console.log(`  Updated: ${account.code} ${account.name} → ${newType}`);
    updated[newType.toLowerCase()]++;
  } else if (newType === account.reference_type) {
    updated.unchanged++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('Reference Type Assignment Summary:');
console.log('='.repeat(60));
console.log(`  ✓ CUSTOMER: ${updated.customer} accounts`);
console.log(`  ✓ SUPPLIER: ${updated.supplier} accounts`);
console.log(`  ✓ EMPLOYEE: ${updated.employee} accounts`);
console.log(`  ✓ BANK: ${updated.bank} accounts`);
console.log(`  → Unchanged: ${updated.unchanged} accounts`);

// Verify the changes
const refTypeCounts = db.prepare(`
  SELECT reference_type, COUNT(*) AS count 
  FROM accounts
  WHERE reference_type != 'GENERAL'
  GROUP BY reference_type
  ORDER BY count DESC
`).all();

console.log('\nFinal Reference Type Distribution:');
refTypeCounts.forEach(row => {
  console.log(`  • ${row.reference_type}: ${row.count}`);
});

const generalCount = db.prepare(`SELECT COUNT(*) AS c FROM accounts WHERE reference_type = 'GENERAL'`).get().c;
console.log(`  • GENERAL (unclassified): ${generalCount}`);

console.log('\n' + '='.repeat(60));
console.log('Reference type assignment complete!');
console.log('='.repeat(60) + '\n');

db.close();
