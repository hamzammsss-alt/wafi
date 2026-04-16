#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');

function q(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function todayPlus(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function appDataRoot() {
  if (process.env.APPDATA) return process.env.APPDATA;
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support');
  return path.join(os.homedir(), '.local', 'share');
}

function resolveDbPath(explicitArg) {
  const candidates = [];
  if (explicitArg) candidates.push(path.resolve(explicitArg));
  if (process.env.WAFI_DB_PATH) candidates.push(path.resolve(process.env.WAFI_DB_PATH));

  const appData = appDataRoot();
  candidates.push(path.join(process.cwd(), 'wafi.db'));
  candidates.push(path.join(process.cwd(), 'database.sqlite'));
  candidates.push(path.join(appData, 'wafi-erp', 'wafi.db'));
  candidates.push(path.join(appData, 'WAFI ERP', 'wafi.db'));
  candidates.push(path.join(appData, 'Electron', 'wafi.db'));

  const seen = new Set();
  for (const p of candidates) {
    const normalized = path.normalize(p);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    if (fs.existsSync(normalized)) return normalized;
  }
  return null;
}

function openDatabase(dbPath) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(dbPath);
    return {
      driver: 'node:sqlite',
      prepare: (sql) => db.prepare(sql),
      exec: (sql) => db.exec(sql),
      pragma: (expr) => db.exec(`PRAGMA ${expr}`),
      close: () => db.close()
    };
  } catch (nodeSqliteError) {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    return {
      driver: 'better-sqlite3',
      prepare: (sql) => db.prepare(sql),
      exec: (sql) => db.exec(sql),
      pragma: (expr) => db.pragma(expr),
      close: () => db.close()
    };
  }
}

const tableExistsCache = new Map();
function tableExists(db, table) {
  if (tableExistsCache.has(table)) return tableExistsCache.get(table);
  const exists = !!db.prepare(
    `SELECT 1 FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1`
  ).get(table);
  tableExistsCache.set(table, exists);
  return exists;
}

const tableInfoCache = new Map();
function tableInfo(db, table) {
  if (tableInfoCache.has(table)) return tableInfoCache.get(table);
  if (!tableExists(db, table)) {
    tableInfoCache.set(table, []);
    return [];
  }
  const safeTable = table.replace(/'/g, "''");
  const rows = db.prepare(`PRAGMA table_info('${safeTable}')`).all();
  tableInfoCache.set(table, rows);
  return rows;
}

function tableColumns(db, table) {
  return tableInfo(db, table).map(c => c.name);
}

function hasColumn(db, table, col) {
  return tableColumns(db, table).includes(col);
}

function sanitizeObject(db, table, obj) {
  const cols = tableColumns(db, table);
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (!cols.includes(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function normalizeLookup(db, table, lookup) {
  const out = sanitizeObject(db, table, lookup);
  for (const k of Object.keys(out)) {
    if (out[k] === null) delete out[k];
  }
  return out;
}

function selectOneByLookup(db, table, lookup) {
  const normalized = normalizeLookup(db, table, lookup);
  const keys = Object.keys(normalized);
  if (keys.length === 0) return null;
  const where = keys.map(k => `${q(k)} = ?`).join(' AND ');
  const sql = `SELECT * FROM ${q(table)} WHERE ${where} LIMIT 1`;
  return db.prepare(sql).get(...keys.map(k => normalized[k])) || null;
}

function firstId(db, table) {
  if (!tableExists(db, table) || !hasColumn(db, table, 'id')) return null;
  const row = db.prepare(`SELECT id FROM ${q(table)} LIMIT 1`).get();
  return row ? row.id : null;
}

function firstRow(db, table) {
  if (!tableExists(db, table)) return null;
  return db.prepare(`SELECT * FROM ${q(table)} LIMIT 1`).get() || null;
}

function getIdColumn(db, table) {
  const info = tableInfo(db, table);
  return info.find(c => c.name === 'id') || null;
}

function ensureRow(db, table, lookup, desiredRow) {
  if (!tableExists(db, table)) {
    return { status: 'skipped', reason: `table_missing:${table}`, row: null };
  }

  const normalizedLookup = normalizeLookup(db, table, lookup);
  const lookupKeys = Object.keys(normalizedLookup);
  if (lookupKeys.length > 0) {
    const existing = selectOneByLookup(db, table, normalizedLookup);
    if (existing) return { status: 'existing', row: existing };
  }

  const row = sanitizeObject(db, table, desiredRow);
  const idCol = getIdColumn(db, table);
  if (idCol && row.id === undefined && !/int/i.test(idCol.type || '')) {
    row.id = randomUUID();
  }

  const keys = Object.keys(row);
  if (keys.length === 0) {
    return { status: 'skipped', reason: `no_compatible_columns:${table}`, row: null };
  }

  const sql = `INSERT INTO ${q(table)} (${keys.map(q).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
  try {
    db.prepare(sql).run(...keys.map(k => row[k]));

    if (lookupKeys.length > 0) {
      const inserted = selectOneByLookup(db, table, normalizedLookup);
      if (inserted) return { status: 'inserted', row: inserted };
    }
    if (row.id !== undefined && hasColumn(db, table, 'id')) {
      const insertedById = db.prepare(`SELECT * FROM ${q(table)} WHERE id = ? LIMIT 1`).get(row.id);
      if (insertedById) return { status: 'inserted', row: insertedById };
    }
    return { status: 'inserted', row };
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE constraint failed') && lookupKeys.length > 0) {
      const existing = selectOneByLookup(db, table, normalizedLookup);
      if (existing) return { status: 'existing', row: existing };
    }
    return { status: 'failed', error, row: null };
  }
}

function safeCount(db, table) {
  if (!tableExists(db, table)) return null;
  try {
    return db.prepare(`SELECT COUNT(*) AS c FROM ${q(table)}`).get().c;
  } catch {
    return null;
  }
}

function foreignKeyTarget(db, table, column) {
  if (!tableExists(db, table)) return null;
  try {
    const safeTable = table.replace(/'/g, "''");
    const rows = db.prepare(`PRAGMA foreign_key_list('${safeTable}')`).all();
    const fk = rows.find(r => String(r.from).toLowerCase() === String(column).toLowerCase());
    return fk ? fk.table : null;
  } catch {
    return null;
  }
}

function resolveFkValue(db, table, column, options) {
  const target = foreignKeyTarget(db, table, column);
  if (!target) return options.default ?? null;
  if (options[target] !== undefined) return options[target];
  return options.default ?? null;
}

function tryFindAccountByType(db, keyword) {
  if (!tableExists(db, 'accounts')) return null;
  if (!hasColumn(db, 'accounts', 'type') || !hasColumn(db, 'accounts', 'id')) {
    return firstId(db, 'accounts');
  }
  const row = db.prepare(
    `SELECT id FROM accounts WHERE lower(coalesce(type, '')) LIKE ? LIMIT 1`
  ).get(`%${String(keyword).toLowerCase()}%`);
  return row ? row.id : firstId(db, 'accounts');
}

function findAccountByCode(db, code) {
  if (!tableExists(db, 'accounts')) return null;
  if (!hasColumn(db, 'accounts', 'code') || !hasColumn(db, 'accounts', 'id')) return null;
  const row = db.prepare('SELECT id FROM accounts WHERE code = ? LIMIT 1').get(code);
  return row ? row.id : null;
}

function main() {
  const args = process.argv.slice(2);
  const fkOn = args.includes('--fk-on');
  const dbPathArg = args.find(a => !a.startsWith('--'));
  const dbPath = resolveDbPath(dbPathArg);

  if (!dbPath) {
    console.error('[Seed] Could not find database file.');
    console.error('[Seed] Provide path explicitly: node scripts/seed_test_data.js "C:\\path\\to\\wafi.db"');
    process.exit(1);
  }

  console.log(`[Seed] Database: ${dbPath}`);
  const db = openDatabase(dbPath);
  console.log(`[Seed] driver=${db.driver}`);
  db.pragma('busy_timeout = 5000');
  db.pragma('journal_mode = WAL');
  db.pragma(`foreign_keys = ${fkOn ? 'ON' : 'OFF'}`);
  console.log(`[Seed] foreign_keys=${fkOn ? 'ON' : 'OFF'}`);

  const summary = { inserted: 0, existing: 0, skipped: 0, failed: 0 };

  function track(label, result) {
    if (!result) return null;
    if (result.status === 'inserted') summary.inserted += 1;
    if (result.status === 'existing') summary.existing += 1;
    if (result.status === 'skipped') summary.skipped += 1;
    if (result.status === 'failed') summary.failed += 1;

    if (result.status === 'failed') {
      console.error(`[FAILED] ${label}: ${result.error.message}`);
      return null;
    }
    if (result.status === 'skipped') {
      console.log(`[SKIPPED] ${label}: ${result.reason}`);
      return null;
    }
    console.log(`[${result.status === 'inserted' ? 'INSERTED' : 'EXISTS'}] ${label}`);
    return result.row || null;
  }

  function ensure(label, table, lookup, row) {
    return track(label, ensureRow(db, table, lookup, row));
  }

  function section(title, fn) {
    console.log(`\n=== ${title} ===`);
    try {
      fn();
    } catch (error) {
      summary.failed += 1;
      console.error(`[FAILED] section "${title}": ${error.message}`);
    }
  }

  const ctx = {
    branchId: null,
    branch2Id: null,
    currencyId: null,
    unitPieceId: null,
    unitBoxId: null,
    unitKgId: null,
    warehouseMainId: null,
    warehouseSecondaryId: null,
    categoryId: null,
    taxId: null,
    priceListId: null,
    customerPartnerId: null,
    supplierPartnerId: null,
    accountCashId: null,
    accountRevenueId: null,
    accountExpenseId: null,
    accountReceivableId: null,
    accountPayableId: null,
    itemAId: null,
    itemBId: null,
    itemCId: null,
    partnerTable: null,
    journalEntryId: null,
    customerAccountRefId: null
  };

  const d0 = todayPlus(0);
  const d2 = todayPlus(2);
  const d5 = todayPlus(5);
  const d7 = todayPlus(7);
  const d10 = todayPlus(10);
  const d15 = todayPlus(15);
  const d30 = todayPlus(30);

  section('Core Definitions', () => {
    const curr = ensure(
      'Currency ILS',
      'currencies',
      { code: 'ILS' },
      {
        id: randomUUID(),
        code: 'ILS',
        name_ar: 'Shekel',
        name_en: 'Israeli Shekel',
        symbol: 'NIS',
        is_base: 1,
        exchange_rate: 1
      }
    );
    ctx.currencyId = (curr && curr.id) || (
      selectOneByLookup(db, 'currencies', { code: 'ILS' }) || firstRow(db, 'currencies')
    )?.id || null;

    const branchMain = ensure(
      'Branch Main',
      'branches',
      { name_ar: 'Main Branch' },
      {
        id: randomUUID(),
        name_ar: 'Main Branch',
        name_en: 'Main Branch',
        type: 'MAIN',
        is_main: 1,
        is_active: 1,
        address: 'HQ'
      }
    );
    const branchSecondary = ensure(
      'Branch Secondary',
      'branches',
      { name_ar: 'Demo Branch' },
      {
        id: randomUUID(),
        name_ar: 'Demo Branch',
        name_en: 'Demo Branch',
        type: 'BRANCH',
        is_main: 0,
        is_active: 1,
        address: 'Secondary'
      }
    );
    ctx.branchId = (branchMain && branchMain.id) || firstId(db, 'branches');
    ctx.branch2Id = (branchSecondary && branchSecondary.id) || ctx.branchId;

    const uPiece = ensure(
      'Unit PCS',
      'units',
      { code: 'PCS' },
      { id: randomUUID(), name_ar: 'Piece', name_en: 'Piece', code: 'PCS', is_active: 1 }
    );
    const uBox = ensure(
      'Unit BOX',
      'units',
      { code: 'BOX' },
      { id: randomUUID(), name_ar: 'Box', name_en: 'Box', code: 'BOX', is_active: 1 }
    );
    const uKg = ensure(
      'Unit KG',
      'units',
      { code: 'KG' },
      { id: randomUUID(), name_ar: 'Kilogram', name_en: 'Kilogram', code: 'KG', is_active: 1 }
    );
    ctx.unitPieceId = (uPiece && uPiece.id) || firstId(db, 'units');
    ctx.unitBoxId = (uBox && uBox.id) || ctx.unitPieceId;
    ctx.unitKgId = (uKg && uKg.id) || ctx.unitPieceId;

    const category = ensure(
      'Item Category - General',
      'item_categories',
      { code: 'CAT-DEMO' },
      {
        id: randomUUID(),
        name_ar: 'General Items',
        name_en: 'General Items',
        code: 'CAT-DEMO',
        description: 'Seeded test category',
        is_active: 1
      }
    );
    ctx.categoryId = (category && category.id) || firstId(db, 'item_categories');

    const whMain = ensure(
      'Warehouse Main',
      'warehouses',
      { code: 'WH-MAIN' },
      {
        id: randomUUID(),
        name: 'Main Warehouse',
        name_ar: 'Main Warehouse',
        name_en: 'Main Warehouse',
        code: 'WH-MAIN',
        location: 'HQ',
        is_active: 1,
        address: 'Main storage'
      }
    );
    const whSecondary = ensure(
      'Warehouse Secondary',
      'warehouses',
      { code: 'WH-SEC' },
      {
        id: randomUUID(),
        name: 'Secondary Warehouse',
        name_ar: 'Secondary Warehouse',
        name_en: 'Secondary Warehouse',
        code: 'WH-SEC',
        location: 'Branch storage',
        is_active: 1,
        address: 'Branch storage'
      }
    );
    ctx.warehouseMainId = (whMain && whMain.id) || firstId(db, 'warehouses') || ctx.branchId;
    ctx.warehouseSecondaryId = (whSecondary && whSecondary.id) || ctx.warehouseMainId;

    const bank = ensure(
      'Bank Demo',
      'banks',
      { bank_code: '9001' },
      {
        id: randomUUID(),
        name_ar: 'Demo Bank',
        name_en: 'Demo Bank',
        bank_code: '9001',
        branch_code: '001',
        is_local: 1
      }
    );
    const bankId = (bank && bank.id) || firstId(db, 'banks');

    ensure(
      'Bank Account Demo',
      'bank_accounts',
      { account_number: '9001000001' },
      {
        id: randomUUID(),
        bank_id: bankId,
        branch_name: 'Main',
        account_number: '9001000001',
        iban: 'PS90DEMO0000000001',
        currency_id: ctx.currencyId,
        currency: 'ILS',
        account_name: 'Demo Operations Account',
        bank_name: 'Demo Bank',
        code: 'BANK-AC-001',
        is_active: 1
      }
    );

    ensure(
      'Payment Method Cash',
      'payment_methods',
      { type: 'CASH' },
      {
        id: randomUUID(),
        name_ar: 'Cash',
        name_en: 'Cash',
        type: 'CASH',
        is_active: 1
      }
    );
    ensure(
      'Payment Method Transfer',
      'payment_methods',
      { type: 'BANK_TRANSFER' },
      {
        id: randomUUID(),
        name_ar: 'Bank Transfer',
        name_en: 'Bank Transfer',
        type: 'BANK_TRANSFER',
        is_active: 1
      }
    );
    ensure(
      'Payment Method Check',
      'payment_methods',
      { type: 'CHECK' },
      {
        id: randomUUID(),
        name_ar: 'Check',
        name_en: 'Check',
        type: 'CHECK',
        is_active: 1
      }
    );

    ensure(
      'Cost Center - Main Ops',
      'cost_centers',
      { code: 'CC-DEMO-01' },
      {
        id: randomUUID(),
        code: 'CC-DEMO-01',
        name_ar: 'Main Operations',
        name_en: 'Main Operations',
        type: 'DEPARTMENT',
        manager_name: 'System User',
        is_active: 1
      }
    );

    ensure(
      'Analysis Code - Sales',
      'analysis_codes',
      { code: 'ANL-SALES' },
      {
        id: randomUUID(),
        code: 'ANL-SALES',
        name_ar: 'Sales Analysis',
        name_en: 'Sales Analysis',
        is_active: 1
      }
    );

    const taxSimple = ensure(
      'Tax VAT 16',
      'taxes',
      { name_ar: 'VAT 16%' },
      {
        id: randomUUID(),
        name_ar: 'VAT 16%',
        name_en: 'VAT 16%',
        rate: 16,
        amount: 16,
        type: 'Add',
        is_fixed: 0,
        is_active: 1
      }
    );
    ctx.taxId = (taxSimple && taxSimple.id) || firstId(db, 'taxes');

    ensure(
      'Tax Definition VAT',
      'tax_definitions',
      { name_ar: 'VAT Purchase 16%' },
      {
        id: randomUUID(),
        name_ar: 'VAT Purchase 16%',
        type: 'VAT',
        percentage: 16,
        is_active: 1
      }
    );

    ensure(
      'Customer Type - General',
      'customer_types',
      { name: 'General Customer' },
      {
        name: 'General Customer',
        name_ar: 'General Customer',
        name_en: 'General Customer',
        code: 'CT-GEN',
        discount: 0,
        is_active: 1,
        description: 'Seeded'
      }
    );
    ensure(
      'Vendor Type - General',
      'vendor_types',
      { name: 'General Supplier' },
      {
        name: 'General Supplier',
        name_ar: 'General Supplier',
        name_en: 'General Supplier',
        code: 'VT-GEN',
        is_active: 1,
        description: 'Seeded'
      }
    );
  });

  section('Accounts, Partners, Items', () => {
    const accCash = ensure(
      'Account Cash',
      'accounts',
      { code: 'ACC-DEMO-CASH' },
      {
        id: randomUUID(),
        code: 'ACC-DEMO-CASH',
        name: 'Demo Cash',
        type: 'ASSET',
        currency: 'ILS',
        is_transactional: 1,
        is_active: 1
      }
    );
    const accRevenue = ensure(
      'Account Revenue',
      'accounts',
      { code: 'ACC-DEMO-REV' },
      {
        id: randomUUID(),
        code: 'ACC-DEMO-REV',
        name: 'Demo Revenue',
        type: 'REVENUE',
        currency: 'ILS',
        is_transactional: 1,
        is_active: 1
      }
    );
    const accExpense = ensure(
      'Account Expense',
      'accounts',
      { code: 'ACC-DEMO-EXP' },
      {
        id: randomUUID(),
        code: 'ACC-DEMO-EXP',
        name: 'Demo Expense',
        type: 'EXPENSE',
        currency: 'ILS',
        is_transactional: 1,
        is_active: 1
      }
    );
    const accAR = ensure(
      'Account Receivable',
      'accounts',
      { code: 'ACC-DEMO-AR' },
      {
        id: randomUUID(),
        code: 'ACC-DEMO-AR',
        name: 'Demo Accounts Receivable',
        type: 'ASSET',
        currency: 'ILS',
        is_transactional: 1,
        is_active: 1
      }
    );
    const accAP = ensure(
      'Account Payable',
      'accounts',
      { code: 'ACC-DEMO-AP' },
      {
        id: randomUUID(),
        code: 'ACC-DEMO-AP',
        name: 'Demo Accounts Payable',
        type: 'LIABILITY',
        currency: 'ILS',
        is_transactional: 1,
        is_active: 1
      }
    );

    ctx.accountCashId = (accCash && accCash.id) || tryFindAccountByType(db, 'asset');
    ctx.accountRevenueId = (accRevenue && accRevenue.id) || tryFindAccountByType(db, 'revenue');
    ctx.accountExpenseId = (accExpense && accExpense.id) || tryFindAccountByType(db, 'expense');
    ctx.accountReceivableId = (accAR && accAR.id) || tryFindAccountByType(db, 'asset') || ctx.accountCashId;
    ctx.accountPayableId = (accAP && accAP.id) || tryFindAccountByType(db, 'liability') || ctx.accountExpenseId;
    ctx.customerAccountRefId = ctx.accountReceivableId || ctx.accountCashId;

    const region = ensure(
      'Region - Central',
      'regions',
      { code: 'REG-CENTRAL' },
      {
        id: randomUUID(),
        code: 'REG-CENTRAL',
        name_ar: 'Central',
        name_en: 'Central',
        is_active: 1
      }
    );
    const customerGroup = ensure(
      'Customer Group - Retail',
      'customer_groups',
      { name_ar: 'Retail Customers' },
      {
        id: randomUUID(),
        name_ar: 'Retail Customers',
        name_en: 'Retail Customers',
        is_active: 1
      }
    );
    const salesRep = ensure(
      'Sales Rep - Demo',
      'sales_reps',
      { name_ar: 'Demo Sales Rep' },
      {
        id: randomUUID(),
        name_ar: 'Demo Sales Rep',
        name_en: 'Demo Sales Rep',
        phone: '0599001234',
        commission_rate: 3,
        target_amount: 50000,
        is_active: 1
      }
    );
    const regionId = (region && region.id) || firstId(db, 'regions');
    const groupId = (customerGroup && customerGroup.id) || firstId(db, 'customer_groups');
    const salesRepId = (salesRep && salesRep.id) || firstId(db, 'sales_reps');

    const priceList = ensure(
      'Price List - Retail',
      'price_lists',
      { name_ar: 'Retail Price List' },
      {
        id: randomUUID(),
        name_ar: 'Retail Price List',
        name_en: 'Retail Price List',
        currency_id: ctx.currencyId,
        is_active: 1
      }
    );
    ctx.priceListId = (priceList && priceList.id) || firstId(db, 'price_lists');

    ensure(
      'Payment Terms - Cash',
      'payment_terms',
      { name_ar: 'Cash' },
      { id: randomUUID(), name_ar: 'Cash', days: 0 }
    );
    ensure(
      'Payment Terms - 30 Days',
      'payment_terms',
      { name_ar: '30 Days' },
      { id: randomUUID(), name_ar: '30 Days', days: 30 }
    );

    ctx.partnerTable = tableExists(db, 'business_partners')
      ? 'business_partners'
      : (tableExists(db, 'business_partners_backup_fix_fk') ? 'business_partners_backup_fix_fk' : null);

    if (ctx.partnerTable) {
      const customer = ensure(
        'Business Partner - Customer',
        ctx.partnerTable,
        { code: 'BP-CUST-DEMO' },
        {
          id: randomUUID(),
          code: 'BP-CUST-DEMO',
          name_ar: 'Demo Customer',
          name_en: 'Demo Customer',
          type: 'CUSTOMER',
          phone: '022000001',
          mobile: '0599000001',
          email: 'customer.demo@example.com',
          address: 'Main Street',
          city: 'Gaza',
          tax_number: 'CUST-TAX-001',
          linked_account_id: ctx.accountReceivableId,
          credit_limit: 50000,
          payment_term_days: 30,
          price_list_id: ctx.priceListId,
          region_id: regionId,
          group_id: groupId,
          sales_rep_id: salesRepId,
          is_active: 1
        }
      );
      const supplier = ensure(
        'Business Partner - Supplier',
        ctx.partnerTable,
        { code: 'BP-SUP-DEMO' },
        {
          id: randomUUID(),
          code: 'BP-SUP-DEMO',
          name_ar: 'Demo Supplier',
          name_en: 'Demo Supplier',
          type: 'SUPPLIER',
          phone: '022000002',
          mobile: '0599000002',
          email: 'supplier.demo@example.com',
          address: 'Industrial Area',
          city: 'Gaza',
          tax_number: 'SUP-TAX-001',
          linked_account_id: ctx.accountPayableId,
          credit_limit: 80000,
          payment_term_days: 45,
          is_active: 1
        }
      );
      ctx.customerPartnerId = (customer && customer.id) || firstId(db, ctx.partnerTable);
      ctx.supplierPartnerId = (supplier && supplier.id) || firstId(db, ctx.partnerTable);
    } else {
      console.log('[SKIPPED] Business partners: table_missing');
      summary.skipped += 1;
    }

    function ensureItem(code, name, costPrice, salePrice) {
      return ensure(
        `Item ${code}`,
        'items',
        { code },
        {
          id: randomUUID(),
          code,
          barcode: `${code}-BAR`,
          name_ar: name,
          name_en: name,
          category_id: ctx.categoryId,
          type: 'STOCK',
          base_unit_id: ctx.unitPieceId,
          sale_unit_id: ctx.unitPieceId,
          purchase_unit_id: ctx.unitPieceId,
          conversion_factor: 1,
          cost_price: costPrice,
          sale_price: salePrice,
          wholesale_price: salePrice * 0.9,
          min_stock_level: 5,
          reorder_point: 10,
          sales_account_id: ctx.accountRevenueId,
          cogs_account_id: ctx.accountExpenseId,
          inventory_account_id: ctx.accountCashId,
          is_active: 1
        }
      );
    }

    const itemA = ensureItem('ITEM-DEMO-001', 'Demo Item A', 12, 20);
    const itemB = ensureItem('ITEM-DEMO-002', 'Demo Item B', 18, 30);
    const itemC = ensureItem('ITEM-DEMO-003', 'Demo Item C (FG)', 25, 45);
    ctx.itemAId = (itemA && itemA.id) || firstId(db, 'items');
    ctx.itemBId = (itemB && itemB.id) || ctx.itemAId;
    ctx.itemCId = (itemC && itemC.id) || ctx.itemBId;

    [ctx.itemAId, ctx.itemBId, ctx.itemCId].filter(Boolean).forEach((itemId, idx) => {
      ensure(
        `Item Unit ${idx + 1}`,
        'item_units',
        { item_id: itemId, unit_id: ctx.unitPieceId },
        {
          id: randomUUID(),
          item_id: itemId,
          unit_id: ctx.unitPieceId,
          factor: 1,
          sale_price: idx === 0 ? 20 : idx === 1 ? 30 : 45
        }
      );

      ensure(
        `Stock Balance Main ${idx + 1}`,
        'stock_balances',
        { item_id: itemId, warehouse_id: ctx.warehouseMainId },
        {
          item_id: itemId,
          warehouse_id: ctx.warehouseMainId,
          quantity: 200 - (idx * 40),
          avg_cost: idx === 0 ? 12 : idx === 1 ? 18 : 25
        }
      );
    });

    if (ctx.priceListId) {
      [
        { itemId: ctx.itemAId, price: 20 },
        { itemId: ctx.itemBId, price: 30 },
        { itemId: ctx.itemCId, price: 45 }
      ].filter(x => x.itemId).forEach((x, idx) => {
        ensure(
          `Price List Item ${idx + 1}`,
          'price_list_items',
          { price_list_id: ctx.priceListId, item_id: x.itemId, unit_id: ctx.unitPieceId },
          {
            id: randomUUID(),
            price_list_id: ctx.priceListId,
            item_id: x.itemId,
            unit_id: ctx.unitPieceId,
            price: x.price,
            min_quantity: 1
          }
        );

        ensure(
          `Item Price ${idx + 1}`,
          'item_prices',
          { price_list_id: ctx.priceListId, item_id: x.itemId, unit_id: ctx.unitPieceId },
          {
            id: randomUUID(),
            price_list_id: ctx.priceListId,
            item_id: x.itemId,
            unit_id: ctx.unitPieceId,
            price: x.price
          }
        );
      });
    }
  });

  section('Purchasing & Sales Vouchers', () => {
    const purchaseQty = 20;
    const purchasePrice = 12;
    const purchaseSubtotal = purchaseQty * purchasePrice;
    const purchaseTax = +(purchaseSubtotal * 0.16).toFixed(2);
    const purchaseTotal = +(purchaseSubtotal + purchaseTax).toFixed(2);

    const salesQty = 8;
    const salesPrice = 30;
    const salesSubtotal = salesQty * salesPrice;
    const salesTax = +(salesSubtotal * 0.16).toFixed(2);
    const salesTotal = +(salesSubtotal + salesTax).toFixed(2);

    const purchaseReq = ensure(
      'Purchase Request PR-DEMO-0001',
      'purchase_requests',
      { request_no: 'PR-DEMO-0001' },
      {
        id: randomUUID(),
        request_no: 'PR-DEMO-0001',
        branch_id: ctx.branchId,
        warehouse_id: ctx.warehouseMainId,
        requester_id: 'seed-script',
        date: d0,
        needed_date: d7,
        status: 'APPROVED',
        notes: 'Seeded purchase request'
      }
    );
    if (purchaseReq && ctx.itemAId && ctx.unitPieceId) {
      ensure(
        'Purchase Request Line',
        'purchase_request_lines',
        { request_id: purchaseReq.id, item_id: ctx.itemAId },
        {
          id: randomUUID(),
          request_id: purchaseReq.id,
          item_id: ctx.itemAId,
          description: 'Need stock refill',
          quantity: purchaseQty,
          unit_id: ctx.unitPieceId,
          notes: 'Seed data'
        }
      );
    }

    const purchaseOrder = ensure(
      'Purchase Order PO-DEMO-0001',
      'purchase_orders',
      { order_no: 'PO-DEMO-0001' },
      {
        id: randomUUID(),
        order_no: 'PO-DEMO-0001',
        supplier_id: ctx.supplierPartnerId,
        branch_id: ctx.branchId,
        date: d0,
        delivery_date: d5,
        currency_id: ctx.currencyId,
        exchange_rate: 1,
        subtotal: purchaseSubtotal,
        tax_total: purchaseTax,
        grand_total: purchaseTotal,
        status: 'APPROVED',
        request_id: purchaseReq ? purchaseReq.id : null,
        notes: 'Seeded purchase order',
        created_by: 'seed-script'
      }
    );
    if (purchaseOrder && ctx.itemAId && ctx.unitPieceId) {
      ensure(
        'Purchase Order Line',
        'purchase_order_lines',
        { order_id: purchaseOrder.id, item_id: ctx.itemAId },
        {
          id: randomUUID(),
          order_id: purchaseOrder.id,
          item_id: ctx.itemAId,
          quantity: purchaseQty,
          unit_id: ctx.unitPieceId,
          unit_price: purchasePrice,
          total_price: purchaseSubtotal,
          tax_amount: purchaseTax
        }
      );
    }

    const purchaseInvoice = ensure(
      'Purchase Invoice PINV-DEMO-0001',
      'purchase_invoices',
      { invoice_no: 'PINV-DEMO-0001' },
      {
        id: randomUUID(),
        invoice_no: 'PINV-DEMO-0001',
        vendor_invoice_no: 'V-0001',
        supplier_id: ctx.supplierPartnerId,
        branch_id: ctx.branchId,
        warehouse_id: ctx.warehouseMainId,
        date: d0,
        due_date: d30,
        subtotal: purchaseSubtotal,
        tax_total: purchaseTax,
        discount_total: 0,
        grand_total: purchaseTotal,
        currency_id: ctx.currencyId,
        exchange_rate: 1,
        status: 'POSTED',
        payment_status: 'UNPAID',
        notes: 'Seeded purchase invoice',
        created_by: 'seed-script'
      }
    );
    if (purchaseInvoice && ctx.itemAId && ctx.unitPieceId) {
      ensure(
        'Purchase Invoice Line',
        'purchase_invoice_lines',
        { invoice_id: purchaseInvoice.id, item_id: ctx.itemAId },
        {
          id: randomUUID(),
          invoice_id: purchaseInvoice.id,
          item_id: ctx.itemAId,
          description: 'Demo purchase line',
          quantity: purchaseQty,
          unit_id: ctx.unitPieceId,
          unit_price: purchasePrice,
          total_price: purchaseSubtotal,
          discount_amount: 0,
          tax_amount: purchaseTax,
          tax_id: ctx.taxId,
          net_total: purchaseTotal
        }
      );
    }

    const purchaseReturn = ensure(
      'Purchase Return PRET-DEMO-0001',
      'purchase_returns',
      { return_no: 'PRET-DEMO-0001' },
      {
        id: randomUUID(),
        return_no: 'PRET-DEMO-0001',
        invoice_id: purchaseInvoice ? purchaseInvoice.id : null,
        supplier_id: ctx.supplierPartnerId,
        branch_id: ctx.branchId,
        warehouse_id: ctx.warehouseMainId,
        date: d10,
        currency_id: ctx.currencyId,
        exchange_rate: 1,
        subtotal: 24,
        tax_total: 3.84,
        grand_total: 27.84,
        notes: 'Seeded purchase return',
        status: 'POSTED',
        created_by: 'seed-script'
      }
    );
    if (purchaseReturn && ctx.itemAId && ctx.unitPieceId) {
      ensure(
        'Purchase Return Line',
        'purchase_return_lines',
        { return_id: purchaseReturn.id, item_id: ctx.itemAId },
        {
          id: randomUUID(),
          return_id: purchaseReturn.id,
          item_id: ctx.itemAId,
          unit_id: ctx.unitPieceId,
          quantity: 2,
          unit_price: 12,
          total_price: 24,
          tax_amount: 3.84,
          notes: 'Damaged units'
        }
      );
    }

    const salesQuotation = ensure(
      'Sales Quotation QT-DEMO-0001',
      'sales_quotations',
      { quotation_no: 'QT-DEMO-0001' },
      {
        id: randomUUID(),
        quotation_no: 'QT-DEMO-0001',
        customer_id: ctx.customerPartnerId,
        branch_id: ctx.branchId,
        date: d0,
        expiry_date: d15,
        subtotal: salesSubtotal,
        tax_total: salesTax,
        discount_total: 0,
        grand_total: salesTotal,
        currency_id: ctx.currencyId,
        exchange_rate: 1,
        status: 'SENT',
        notes: 'Seeded sales quotation'
      }
    );
    if (salesQuotation && ctx.itemBId && ctx.unitPieceId) {
      ensure(
        'Sales Quotation Line',
        'sales_quotation_lines',
        { quotation_id: salesQuotation.id, item_id: ctx.itemBId },
        {
          id: randomUUID(),
          quotation_id: salesQuotation.id,
          item_id: ctx.itemBId,
          description: 'Demo quotation line',
          quantity: salesQty,
          unit_id: ctx.unitPieceId,
          unit_price: salesPrice,
          total_price: salesSubtotal,
          discount_amount: 0,
          tax_amount: salesTax,
          net_total: salesTotal
        }
      );
    }

    const salesOrderWarehouseRef = resolveFkValue(db, 'sales_orders', 'warehouse_id', {
      branches: ctx.branchId,
      warehouses: ctx.warehouseMainId,
      default: ctx.warehouseMainId || ctx.branchId
    });
    const salesOrder = ensure(
      'Sales Order SO-DEMO-0001',
      'sales_orders',
      { order_no: 'SO-DEMO-0001' },
      {
        id: randomUUID(),
        order_no: 'SO-DEMO-0001',
        quotation_id: salesQuotation ? salesQuotation.id : null,
        customer_id: ctx.customerPartnerId,
        branch_id: ctx.branchId,
        warehouse_id: salesOrderWarehouseRef,
        date: d0,
        delivery_date: d7,
        subtotal: salesSubtotal,
        tax_total: salesTax,
        discount_total: 0,
        grand_total: salesTotal,
        currency_id: ctx.currencyId,
        status: 'CONFIRMED',
        notes: 'Seeded sales order'
      }
    );
    if (salesOrder && ctx.itemBId && ctx.unitPieceId) {
      ensure(
        'Sales Order Line',
        'sales_order_lines',
        { order_id: salesOrder.id, item_id: ctx.itemBId },
        {
          id: randomUUID(),
          order_id: salesOrder.id,
          item_id: ctx.itemBId,
          description: 'Demo order line',
          quantity: salesQty,
          unit_id: ctx.unitPieceId,
          unit_price: salesPrice,
          total_price: salesSubtotal,
          discount_amount: 0,
          tax_amount: salesTax,
          net_total: salesTotal
        }
      );
    }

    const salesInvoiceWarehouseRef = resolveFkValue(db, 'sales_invoices', 'warehouse_id', {
      branches: ctx.branchId,
      warehouses: ctx.warehouseMainId,
      default: ctx.warehouseMainId || ctx.branchId
    });
    const salesInvoice = ensure(
      'Sales Invoice SINV-DEMO-0001',
      'sales_invoices',
      { invoice_no: 'SINV-DEMO-0001' },
      {
        id: randomUUID(),
        invoice_no: 'SINV-DEMO-0001',
        customer_id: ctx.customerPartnerId,
        branch_id: ctx.branchId,
        warehouse_id: salesInvoiceWarehouseRef,
        date: d0,
        due_date: d30,
        subtotal: salesSubtotal,
        tax_total: salesTax,
        discount_total: 0,
        grand_total: salesTotal,
        currency_id: ctx.currencyId,
        exchange_rate: 1,
        status: 'POSTED',
        payment_status: 'PARTIAL',
        notes: 'Seeded sales invoice',
        created_by: 'seed-script'
      }
    );
    if (salesInvoice && ctx.itemBId && ctx.unitPieceId) {
      ensure(
        'Sales Invoice Line',
        'sales_invoice_lines',
        { invoice_id: salesInvoice.id, item_id: ctx.itemBId },
        {
          id: randomUUID(),
          invoice_id: salesInvoice.id,
          item_id: ctx.itemBId,
          description: 'Demo invoice line',
          quantity: salesQty,
          unit_id: ctx.unitPieceId,
          unit_price: salesPrice,
          total_price: salesSubtotal,
          discount_amount: 0,
          tax_amount: salesTax,
          tax_id: ctx.taxId,
          net_total: salesTotal
        }
      );
    }

    const salesReturnCustomerRef = resolveFkValue(db, 'sales_returns', 'customer_id', {
      accounts: ctx.customerAccountRefId,
      business_partners: ctx.customerPartnerId,
      business_partners_backup_fix_fk: ctx.customerPartnerId,
      default: ctx.customerAccountRefId || ctx.customerPartnerId
    });
    const salesReturnWarehouseRef = resolveFkValue(db, 'sales_returns', 'warehouse_id', {
      branches: ctx.branchId,
      warehouses: ctx.warehouseMainId,
      default: ctx.warehouseMainId || ctx.branchId
    });
    const salesReturn = ensure(
      'Sales Return SRET-DEMO-0001',
      'sales_returns',
      { return_no: 'SRET-DEMO-0001' },
      {
        id: randomUUID(),
        return_no: 'SRET-DEMO-0001',
        invoice_id: salesInvoice ? salesInvoice.id : null,
        customer_id: salesReturnCustomerRef,
        branch_id: ctx.branchId,
        warehouse_id: salesReturnWarehouseRef,
        date: d10,
        subtotal: 30,
        tax_total: 4.8,
        grand_total: 34.8,
        currency_id: ctx.currencyId,
        exchange_rate: 1,
        status: 'POSTED',
        notes: 'Seeded sales return',
        created_by: 'seed-script'
      }
    );
    if (salesReturn && ctx.itemBId && ctx.unitPieceId) {
      ensure(
        'Sales Return Line',
        'sales_return_lines',
        { return_id: salesReturn.id, item_id: ctx.itemBId },
        {
          id: randomUUID(),
          return_id: salesReturn.id,
          item_id: ctx.itemBId,
          description: 'Returned unit',
          quantity: 1,
          unit_id: ctx.unitPieceId,
          unit_price: 30,
          total_price: 30,
          tax_amount: 4.8,
          net_total: 34.8
        }
      );
    }
  });

  section('Accounting Engine (AE) Definitions & Vouchers', () => {
    const cash1110 = findAccountByCode(db, '1110') || ctx.accountCashId;
    const ar1200 = findAccountByCode(db, '1200') || ctx.accountReceivableId || cash1110;
    const ap2300 = findAccountByCode(db, '2300') || ctx.accountPayableId || ctx.accountExpenseId;
    const exp6000 = findAccountByCode(db, '6000') || ctx.accountExpenseId || cash1110;

    if (!cash1110 || !ar1200 || !ap2300 || !exp6000) {
      console.log('[SKIPPED] AE definitions/vouchers: missing required accounts (1110/1200/2300/6000)');
      summary.skipped += 1;
      return;
    }

    try {
      db.prepare('UPDATE accounts SET requires_sub_account = 1, requires_reference = 1 WHERE id IN (?, ?)')
        .run(ar1200, ap2300);
      console.log('[UPDATED] AE account flags for AR/AP');
    } catch (error) {
      console.log(`[SKIPPED] AE account flags update: ${error.message}`);
      summary.skipped += 1;
    }

    const arSub = ensure(
      'AE Sub Account - Customer A',
      'ae_sub_accounts',
      { account_id: ar1200, normalized_name: 'customer a' },
      {
        id: randomUUID(),
        account_id: ar1200,
        code: 'AR-CUST-A',
        name: 'Customer A',
        normalized_name: 'customer a',
        is_active: 1
      }
    );

    const apSub = ensure(
      'AE Sub Account - Supplier A',
      'ae_sub_accounts',
      { account_id: ap2300, normalized_name: 'supplier a' },
      {
        id: randomUUID(),
        account_id: ap2300,
        code: 'AP-SUP-A',
        name: 'Supplier A',
        normalized_name: 'supplier a',
        is_active: 1
      }
    );

    const refCustomer = ensure(
      'AE Reference - Customer Ref',
      'ae_references',
      { ref_type: 'CUSTOMER', normalized_name: 'demo customer ref' },
      {
        id: randomUUID(),
        ref_type: 'CUSTOMER',
        ref_code: 'CUST-REF-001',
        ref_name: 'Demo Customer Ref',
        normalized_name: 'demo customer ref',
        is_active: 1
      }
    );

    const refSupplier = ensure(
      'AE Reference - Supplier Ref',
      'ae_references',
      { ref_type: 'SUPPLIER', normalized_name: 'demo supplier ref' },
      {
        id: randomUUID(),
        ref_type: 'SUPPLIER',
        ref_code: 'SUP-REF-001',
        ref_name: 'Demo Supplier Ref',
        normalized_name: 'demo supplier ref',
        is_active: 1
      }
    );

    const aeJournal = ensure(
      'AE Voucher - Journal',
      'ae_vouchers',
      { voucher_no: 'AE-JV-DEMO-0001' },
      {
        id: randomUUID(),
        voucher_no: 'AE-JV-DEMO-0001',
        voucher_type: 'JOURNAL',
        voucher_date: d0,
        status: 'POSTED',
        currency_code: 'ILS',
        exchange_rate: '1',
        description: 'Seeded AE Journal voucher',
        source_type: 'SEED',
        source_id: 'seed-ae-jv-1',
        created_by: 'seed-script',
        posted_at: `${d0}T10:00:00`
      }
    );

    if (aeJournal) {
      ensure(
        'AE Journal Line 1',
        'ae_voucher_lines',
        { voucher_id: aeJournal.id, line_no: 1 },
        {
          id: randomUUID(),
          voucher_id: aeJournal.id,
          line_no: 1,
          account_id: cash1110,
          line_description: 'Debit cash',
          debit: '1000',
          credit: '0',
          currency_code: 'ILS',
          exchange_rate: '1'
        }
      );
      ensure(
        'AE Journal Line 2',
        'ae_voucher_lines',
        { voucher_id: aeJournal.id, line_no: 2 },
        {
          id: randomUUID(),
          voucher_id: aeJournal.id,
          line_no: 2,
          account_id: exp6000,
          line_description: 'Credit expense',
          debit: '0',
          credit: '1000',
          currency_code: 'ILS',
          exchange_rate: '1'
        }
      );
    }

    const aeReceipt = ensure(
      'AE Voucher - Receipt',
      'ae_vouchers',
      { voucher_no: 'AE-RV-DEMO-0001' },
      {
        id: randomUUID(),
        voucher_no: 'AE-RV-DEMO-0001',
        voucher_type: 'RECEIPT',
        voucher_date: d2,
        status: 'POSTED',
        currency_code: 'ILS',
        exchange_rate: '1',
        description: 'Seeded AE Receipt voucher',
        source_type: 'SEED',
        source_id: 'seed-ae-rv-1',
        created_by: 'seed-script',
        posted_at: `${d2}T11:00:00`
      }
    );

    if (aeReceipt) {
      ensure(
        'AE Receipt Line 1',
        'ae_voucher_lines',
        { voucher_id: aeReceipt.id, line_no: 1 },
        {
          id: randomUUID(),
          voucher_id: aeReceipt.id,
          line_no: 1,
          account_id: ar1200,
          sub_account_id: arSub ? arSub.id : null,
          reference_type: 'CUSTOMER',
          reference_id: refCustomer ? refCustomer.id : null,
          line_description: 'Debit customer AR',
          debit: '550',
          credit: '0',
          currency_code: 'ILS',
          exchange_rate: '1'
        }
      );
      ensure(
        'AE Receipt Line 2',
        'ae_voucher_lines',
        { voucher_id: aeReceipt.id, line_no: 2 },
        {
          id: randomUUID(),
          voucher_id: aeReceipt.id,
          line_no: 2,
          account_id: cash1110,
          line_description: 'Credit cash',
          debit: '0',
          credit: '550',
          currency_code: 'ILS',
          exchange_rate: '1'
        }
      );
    }

    const aePayment = ensure(
      'AE Voucher - Payment',
      'ae_vouchers',
      { voucher_no: 'AE-PV-DEMO-0001' },
      {
        id: randomUUID(),
        voucher_no: 'AE-PV-DEMO-0001',
        voucher_type: 'PAYMENT',
        voucher_date: d5,
        status: 'POSTED',
        currency_code: 'ILS',
        exchange_rate: '1',
        description: 'Seeded AE Payment voucher',
        source_type: 'SEED',
        source_id: 'seed-ae-pv-1',
        created_by: 'seed-script',
        posted_at: `${d5}T12:00:00`
      }
    );

    if (aePayment) {
      ensure(
        'AE Payment Line 1',
        'ae_voucher_lines',
        { voucher_id: aePayment.id, line_no: 1 },
        {
          id: randomUUID(),
          voucher_id: aePayment.id,
          line_no: 1,
          account_id: ap2300,
          sub_account_id: apSub ? apSub.id : null,
          reference_type: 'SUPPLIER',
          reference_id: refSupplier ? refSupplier.id : null,
          line_description: 'Debit supplier AP',
          debit: '700',
          credit: '0',
          currency_code: 'ILS',
          exchange_rate: '1'
        }
      );
      ensure(
        'AE Payment Line 2',
        'ae_voucher_lines',
        { voucher_id: aePayment.id, line_no: 2 },
        {
          id: randomUUID(),
          voucher_id: aePayment.id,
          line_no: 2,
          account_id: cash1110,
          line_description: 'Credit cash',
          debit: '0',
          credit: '700',
          currency_code: 'ILS',
          exchange_rate: '1'
        }
      );
    }
  });

  section('Inventory, Treasury, Journal Vouchers', () => {
    const stockEntry = ensure(
      'Stock Document ENTRY',
      'stock_documents',
      { code: 'STK-ENT-DEMO-0001' },
      {
        id: randomUUID(),
        code: 'STK-ENT-DEMO-0001',
        type: 'ENTRY',
        date: d0,
        warehouse_id: ctx.warehouseMainId,
        status: 'POSTED',
        notes: 'Seeded stock entry',
        created_by: 'seed-script'
      }
    );
    if (stockEntry && ctx.itemAId) {
      ensure(
        'Stock Entry Line',
        'stock_document_lines',
        { document_id: stockEntry.id, item_id: ctx.itemAId },
        {
          id: randomUUID(),
          document_id: stockEntry.id,
          item_id: ctx.itemAId,
          quantity: 30,
          cost: 12,
          notes: 'Initial top-up'
        }
      );
    }

    const stockIssue = ensure(
      'Stock Document ISSUE',
      'stock_documents',
      { code: 'STK-ISS-DEMO-0001' },
      {
        id: randomUUID(),
        code: 'STK-ISS-DEMO-0001',
        type: 'ISSUE',
        date: d2,
        warehouse_id: ctx.warehouseMainId,
        status: 'POSTED',
        notes: 'Seeded stock issue',
        created_by: 'seed-script'
      }
    );
    if (stockIssue && ctx.itemBId) {
      ensure(
        'Stock Issue Line',
        'stock_document_lines',
        { document_id: stockIssue.id, item_id: ctx.itemBId },
        {
          id: randomUUID(),
          document_id: stockIssue.id,
          item_id: ctx.itemBId,
          quantity: 4,
          cost: 18,
          notes: 'Issued to branch'
        }
      );
    }

    const transfer = ensure(
      'Stock Transfer TR-DEMO-0001',
      'stock_transfers',
      { code: 'TR-DEMO-0001' },
      {
        id: randomUUID(),
        code: 'TR-DEMO-0001',
        date: d2,
        from_warehouse_id: ctx.warehouseMainId,
        to_warehouse_id: ctx.warehouseSecondaryId,
        status: 'IN_TRANSIT',
        driver_name: 'Demo Driver',
        vehicle_no: 'DEMO-1001',
        notes: 'Seeded stock transfer',
        created_by: 'seed-script'
      }
    );
    if (transfer && ctx.itemAId) {
      ensure(
        'Stock Transfer Line',
        'stock_transfer_items',
        { transfer_id: transfer.id, item_id: ctx.itemAId },
        {
          id: randomUUID(),
          transfer_id: transfer.id,
          item_id: ctx.itemAId,
          unit_id: ctx.unitPieceId,
          quantity: 6,
          received_quantity: 0
        }
      );
    }

    const journal = ensure(
      'Journal Entry JV-DEMO-0001',
      'journal_entries',
      { voucher_no: 'JV-DEMO-0001' },
      {
        id: randomUUID(),
        voucher_no: 'JV-DEMO-0001',
        voucher_type: 'JV',
        date: d0,
        reference_no: 'SEED-REF-0001',
        description: 'Seeded balanced journal entry',
        status: 'POSTED',
        branch_id: ctx.branchId,
        currency_id: ctx.currencyId,
        exchange_rate: 1,
        created_by: 'seed-script'
      }
    );
    ctx.journalEntryId = journal ? journal.id : null;
    if (journal && ctx.accountCashId && ctx.accountRevenueId) {
      ensure(
        'Journal Line Debit',
        'journal_entry_lines',
        { journal_entry_id: journal.id, account_id: ctx.accountCashId, debit: 1000 },
        {
          id: randomUUID(),
          journal_entry_id: journal.id,
          account_id: ctx.accountCashId,
          debit: 1000,
          credit: 0,
          line_description: 'Debit cash'
        }
      );
      ensure(
        'Journal Line Credit',
        'journal_entry_lines',
        { journal_entry_id: journal.id, account_id: ctx.accountRevenueId, credit: 1000 },
        {
          id: randomUUID(),
          journal_entry_id: journal.id,
          account_id: ctx.accountRevenueId,
          debit: 0,
          credit: 1000,
          line_description: 'Credit revenue'
        }
      );
    }

    ensure(
      'Treasury Voucher TV-DEMO-0001',
      'treasury_vouchers',
      { voucher_no: 'TV-DEMO-0001' },
      {
        id: randomUUID(),
        voucher_no: 'TV-DEMO-0001',
        voucher_type: 'RV',
        date: d0,
        partner_id: ctx.customerPartnerId,
        branch_id: ctx.branchId,
        amount: 500,
        currency_id: ctx.currencyId,
        exchange_rate: 1,
        description: 'Seeded receipt voucher',
        status: 'POSTED',
        journal_header_id: ctx.journalEntryId,
        created_by: 'seed-script'
      }
    );

    ensure(
      'Check CHK-DEMO-0001',
      'checks',
      { check_number: 'CHK-DEMO-0001' },
      {
        id: randomUUID(),
        check_number: 'CHK-DEMO-0001',
        bank_name: 'Demo Bank',
        amount: '500',
        currency: 'ILS',
        due_date: d30,
        status: 'Holding',
        type: 'IN',
        customer_id: ctx.accountReceivableId || ctx.accountCashId,
        supplier_id: ctx.accountPayableId,
        notes: 'Seeded check',
        created_by: 'seed-script'
      }
    );
  });

  section('HR, Logistics, Manufacturing Seeds', () => {
    const dep = ensure(
      'HR Department - Finance',
      'hr_departments',
      { name: 'Finance' },
      { id: randomUUID(), name: 'Finance' }
    );
    const jobTitle = ensure(
      'HR Job Title - Accountant',
      'hr_job_titles',
      { title: 'Accountant' },
      { id: randomUUID(), title: 'Accountant', description: 'Seeded title' }
    );
    const leaveType = ensure(
      'HR Leave Type - Annual',
      'hr_leave_types',
      { name: 'Annual' },
      {
        id: randomUUID(),
        name: 'Annual',
        description: 'Annual leave',
        default_days_per_year: 21,
        days_per_year: 21,
        is_paid: 1,
        requires_approval: 1
      }
    );

    const employee = ensure(
      'HR Employee EMP-DEMO-0001',
      'hr_employees',
      { employee_code: 'EMP-DEMO-0001' },
      {
        id: randomUUID(),
        employee_code: 'EMP-DEMO-0001',
        first_name: 'Demo',
        father_name: 'Test',
        grandfather_name: 'Seed',
        last_name: 'Employee',
        date_of_birth: '1995-01-01',
        gender: 'MALE',
        mobile_phone: '0599555000',
        email: 'employee.demo@example.com',
        address_city: 'Gaza',
        address_street: 'Main Street',
        status: 'ACTIVE',
        linked_account_id: ctx.accountExpenseId
      }
    );

    if (employee) {
      ensure(
        'HR Contract',
        'hr_employee_contracts',
        { employee_id: employee.id, start_date: '2026-01-01' },
        {
          id: randomUUID(),
          employee_id: employee.id,
          contract_type: 'UNLIMITED',
          start_date: '2026-01-01',
          department_id: dep ? dep.id : null,
          job_title_id: jobTitle ? jobTitle.id : null,
          basic_salary: 3500,
          currency: 'ILS',
          payment_method: 'BANK_TRANSFER',
          is_active: 1
        }
      );
    }

    if (employee && leaveType) {
      ensure(
        'HR Leave Balance',
        'hr_leave_balances',
        { employee_id: employee.id, leave_type_id: leaveType.id, year: 2026 },
        {
          id: randomUUID(),
          employee_id: employee.id,
          leave_type_id: leaveType.id,
          year: 2026,
          total_days: 21,
          used_days: 2
        }
      );
      ensure(
        'HR Leave Request',
        'hr_leave_requests',
        { employee_id: employee.id, start_date: d5, end_date: d7 },
        {
          id: randomUUID(),
          employee_id: employee.id,
          leave_type_id: leaveType.id,
          start_date: d5,
          end_date: d7,
          days_count: 3,
          reason: 'Seeded leave request',
          status: 'APPROVED',
          approved_by: employee.id
        }
      );
    }

    const driver = ensure(
      'Driver Demo',
      'drivers',
      { name: 'Demo Driver' },
      {
        id: randomUUID(),
        name: 'Demo Driver',
        license_no: 'DRV-DEMO-0001',
        phone: '0599555111',
        notes: 'Seeded driver',
        is_active: 1
      }
    );
    ensure(
      'Vehicle Demo',
      'vehicles',
      { plate_no: 'DEMO-1001' },
      {
        id: randomUUID(),
        name: 'Demo Vehicle 01',
        plate_no: 'DEMO-1001',
        vehicle_code: 'VH-DEMO-01',
        model: 'Model X',
        brand: 'Demo Motors',
        type: 'Truck',
        color: 'White',
        driver_id: driver ? driver.id : null,
        is_active: 1
      }
    );

    const workCenter = ensure(
      'MFG Work Center',
      'mfg_work_centers',
      { code: 'WC-DEMO-01' },
      {
        id: randomUUID(),
        code: 'WC-DEMO-01',
        name: 'Assembly Line A',
        cost_per_hour: 40,
        overhead_rate_per_hour: 12,
        capacity_per_hour: 15,
        is_active: 1
      }
    );
    ensure(
      'MFG Machine',
      'mfg_machines',
      { serial_number: 'MAC-DEMO-001' },
      {
        id: randomUUID(),
        work_center_id: workCenter ? workCenter.id : null,
        name: 'Assembly Machine 1',
        serial_number: 'MAC-DEMO-001',
        brand: 'DemoTech',
        model: 'DT-100',
        status: 'ACTIVE'
      }
    );

    const bom = ensure(
      'MFG BOM BOM-DEMO-0001',
      'mfg_boms',
      { bom_number: 'BOM-DEMO-0001' },
      {
        id: randomUUID(),
        bom_number: 'BOM-DEMO-0001',
        item_id: ctx.itemCId || ctx.itemAId,
        batch_size: 10,
        type: 'PRODUCTION',
        version: 1,
        is_default: 1,
        notes: 'Seeded BOM'
      }
    );
    if (bom && ctx.itemAId) {
      ensure(
        'MFG BOM Component',
        'mfg_bom_components',
        { bom_id: bom.id, item_id: ctx.itemAId },
        {
          id: randomUUID(),
          bom_id: bom.id,
          item_id: ctx.itemAId,
          quantity: 2,
          scarp_percentage: 0,
          is_critical: 1
        }
      );
    }

    const routing = ensure(
      'MFG Routing',
      'mfg_routings',
      { name: 'Routing DEMO 1' },
      {
        id: randomUUID(),
        bom_id: bom ? bom.id : null,
        name: 'Routing DEMO 1',
        is_default: 1
      }
    );

    ensure(
      'MFG Routing Operation',
      'mfg_routing_operations',
      { routing_id: routing ? routing.id : null, sequence_order: 10 },
      {
        id: randomUUID(),
        routing_id: routing ? routing.id : null,
        sequence_order: 10,
        work_center_id: workCenter ? workCenter.id : null,
        description: 'Assembly Step',
        step_type: 'OPERATION',
        setup_time_minutes: 15,
        run_time_minutes: 45
      }
    );

    ensure(
      'MFG Production Order MO-DEMO-0001',
      'mfg_production_orders',
      { order_number: 'MO-DEMO-0001' },
      {
        id: randomUUID(),
        order_number: 'MO-DEMO-0001',
        bom_id: bom ? bom.id : null,
        routing_id: routing ? routing.id : null,
        item_id: ctx.itemCId || ctx.itemAId,
        type: 'STANDARD',
        status: 'RELEASED',
        quantity: 50,
        start_date: d0,
        due_date: d10,
        branch_id: ctx.branchId,
        warehouse_id: ctx.warehouseMainId
      }
    );
  });

  const reportTables = [
    'branches',
    'warehouses',
    'units',
    'items',
    'business_partners',
    'purchase_requests',
    'purchase_orders',
    'purchase_invoices',
    'sales_quotations',
    'sales_orders',
    'sales_invoices',
    'stock_documents',
    'stock_transfers',
    'journal_entries',
    'ae_sub_accounts',
    'ae_references',
    'ae_vouchers',
    'ae_voucher_lines',
    'treasury_vouchers',
    'checks',
    'hr_employees',
    'mfg_production_orders'
  ];

  console.log('\n=== Seed Summary ===');
  console.log(
    `[Summary] inserted=${summary.inserted} existing=${summary.existing} skipped=${summary.skipped} failed=${summary.failed}`
  );

  console.log('\n=== Table Counts ===');
  reportTables.forEach(t => {
    const c = safeCount(db, t);
    if (c !== null) console.log(`[Count] ${t}: ${c}`);
  });

  try {
    const fkViolations = db.prepare('PRAGMA foreign_key_check').all();
    console.log(`[FK Check] violations=${fkViolations.length}`);
  } catch (error) {
    console.log(`[FK Check] skipped (${error.message})`);
  }

  db.close();

  if (summary.failed > 0) {
    console.log('[Seed] Completed with warnings.');
  } else {
    console.log('[Seed] Completed successfully.');
  }
}

main();
