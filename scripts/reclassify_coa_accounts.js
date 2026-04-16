const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const CATEGORY_DEFAULT_BY_TYPE = {
  ASSET: 'CURRENT_ASSET',
  LIABILITY: 'CURRENT_LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'OPERATING_REVENUE',
  EXPENSE: 'OPERATING_EXPENSE',
};

const CATEGORY_BY_TYPE = {
  ASSET: new Set(['CURRENT_ASSET', 'NON_CURRENT_ASSET', 'CONTROL', 'TAX', 'GENERAL']),
  LIABILITY: new Set(['CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY', 'CONTROL', 'TAX', 'GENERAL']),
  EQUITY: new Set(['EQUITY', 'GENERAL']),
  REVENUE: new Set(['OPERATING_REVENUE', 'OTHER_REVENUE', 'GENERAL']),
  EXPENSE: new Set(['OPERATING_EXPENSE', 'OTHER_EXPENSE', 'GENERAL']),
};

const SUBTYPE_BY_TYPE = {
  ASSET: new Set(['GENERAL', 'CASH', 'BANK', 'RECEIVABLE', 'INVENTORY', 'TAX_RECEIVABLE', 'DISCOUNT', 'ROUNDING']),
  LIABILITY: new Set(['GENERAL', 'PAYABLE', 'TAX_PAYABLE', 'DISCOUNT', 'ROUNDING']),
  EQUITY: new Set(['GENERAL', 'ROUNDING']),
  REVENUE: new Set(['GENERAL', 'REVENUE', 'DISCOUNT', 'ROUNDING']),
  EXPENSE: new Set(['GENERAL', 'EXPENSE', 'COGS', 'DISCOUNT', 'ROUNDING']),
};

const REFERENCE_BY_SUBTYPE_DEFAULT = {
  GENERAL: 'NONE',
  CASH: 'USER',
  BANK: 'BANK_CHEQUE',
  RECEIVABLE: 'GUIDE',
  PAYABLE: 'GUIDE',
  REVENUE: 'NONE',
  EXPENSE: 'NONE',
  INVENTORY: 'NONE',
  COGS: 'NONE',
  TAX_PAYABLE: 'NONE',
  TAX_RECEIVABLE: 'NONE',
  DISCOUNT: 'NONE',
  ROUNDING: 'NONE',
};

function resolveDbPath() {
  const candidates = [
    path.resolve('wafi.db'),
    path.resolve('database.sqlite'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'wafi-erp', 'wafi.db') : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error('Could not locate database file (wafi.db).');
}

function normalizeType(rawType, code) {
  const normalized = String(rawType || '').trim().toUpperCase();
  if (ACCOUNT_TYPES.includes(normalized)) return normalized;

  const first = String(code || '').trim().charAt(0);
  if (first === '1') return 'ASSET';
  if (first === '2') return 'LIABILITY';
  if (first === '3') return 'EQUITY';
  if (first === '4') return 'REVENUE';
  if (first === '5') return 'EXPENSE';

  return 'ASSET';
}

function inferSubtype(type, accountName, accountCode) {
  const name = String(accountName || '').toLowerCase();
  const code = String(accountCode || '').trim();

  if (type === 'ASSET') {
    if (/bank|بنك|مصرف/.test(name) || code.startsWith('112')) return 'BANK';
    if (/cash|صندوق|نقد/.test(name) || code.startsWith('111')) return 'CASH';
    if (/receiv|مدين|عملاء|زبائن/.test(name) || code.startsWith('113')) return 'RECEIVABLE';
    if (/invent|مخزون/.test(name) || code.startsWith('114')) return 'INVENTORY';
    if (/tax|ضريب/.test(name)) return 'TAX_RECEIVABLE';
    return 'GENERAL';
  }

  if (type === 'LIABILITY') {
    if (/payab|دائن|مورد/.test(name) || code.startsWith('211')) return 'PAYABLE';
    if (/tax|ضريب/.test(name)) return 'TAX_PAYABLE';
    return 'GENERAL';
  }

  if (type === 'REVENUE') {
    if (/discount|خصم/.test(name)) return 'DISCOUNT';
    return 'REVENUE';
  }

  if (type === 'EXPENSE') {
    if (/cogs|تكلفة|بضاعة مباعة/.test(name)) return 'COGS';
    if (/discount|خصم/.test(name)) return 'DISCOUNT';
    return 'EXPENSE';
  }

  return 'GENERAL';
}

function classifyRow(row) {
  const accountCode = String(row.account_code || row.code || '').trim().toUpperCase();
  const accountName = String(row.name || '').trim();
  const type = normalizeType(row.type, accountCode);

  const rawCategory = String(row.account_category || '').trim().toUpperCase();
  const category = CATEGORY_BY_TYPE[type].has(rawCategory)
    ? rawCategory
    : CATEGORY_DEFAULT_BY_TYPE[type];

  const rawSubtype = String(row.account_subtype || '').trim().toUpperCase();
  const inferredSubtype = inferSubtype(type, accountName, accountCode);
  const subtype = SUBTYPE_BY_TYPE[type].has(rawSubtype)
    ? rawSubtype
    : (SUBTYPE_BY_TYPE[type].has(inferredSubtype) ? inferredSubtype : 'GENERAL');

  const referenceType = REFERENCE_BY_SUBTYPE_DEFAULT[subtype] || 'NONE';
  const postingAllowed = Number(row.posting_allowed ?? row.is_transactional ?? 1) ? 1 : 0;
  const isGroup = postingAllowed ? 0 : 1;
  const status = Number(row.is_active ?? 1) ? 'ACTIVE' : 'INACTIVE';

  return {
    id: row.id,
    accountCode,
    type,
    category,
    subtype,
    referenceType,
    postingAllowed,
    isGroup,
    status,
  };
}

function run() {
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);

  const columns = db.prepare("PRAGMA table_info(accounts)").all().map((c) => c.name);
  const has = (name) => columns.includes(name);

  if (!has('id')) {
    throw new Error('accounts table does not contain id column.');
  }

  const selectParts = ['id'];
  if (has('code')) selectParts.push('code');
  if (has('account_code')) selectParts.push('account_code');
  if (has('name')) selectParts.push('name');
  if (has('type')) selectParts.push('type');
  if (has('account_category')) selectParts.push('account_category');
  if (has('account_subtype')) selectParts.push('account_subtype');
  if (has('reference_type')) selectParts.push('reference_type');
  if (has('posting_allowed')) selectParts.push('posting_allowed');
  if (has('is_transactional')) selectParts.push('is_transactional');
  if (has('is_group')) selectParts.push('is_group');
  if (has('is_active')) selectParts.push('is_active');
  if (has('status')) selectParts.push('status');

  const rows = db.prepare(`SELECT ${selectParts.join(', ')} FROM accounts`).all();

  if (!rows.length) {
    console.log('No accounts found.');
    return;
  }

  const updateSetParts = [];
  if (has('account_code')) updateSetParts.push('account_code = @accountCode');
  if (has('code')) updateSetParts.push('code = @accountCode');
  if (has('type')) updateSetParts.push('type = @type');
  if (has('account_category')) updateSetParts.push('account_category = @category');
  if (has('account_subtype')) updateSetParts.push('account_subtype = @subtype');
  if (has('reference_type')) updateSetParts.push('reference_type = @referenceType');
  if (has('posting_allowed')) updateSetParts.push('posting_allowed = @postingAllowed');
  if (has('is_transactional')) updateSetParts.push('is_transactional = @postingAllowed');
  if (has('is_group')) updateSetParts.push('is_group = @isGroup');
  if (has('status')) updateSetParts.push('status = @status');

  if (!updateSetParts.length) {
    throw new Error('No reclassification target columns exist in accounts table.');
  }

  const update = db.prepare(`UPDATE accounts SET ${updateSetParts.join(', ')} WHERE id = @id`);

  let changed = 0;
  const tx = db.transaction(() => {
    for (const row of rows) {
      const next = classifyRow(row);
      const before = {
        accountCode: String(row.account_code || row.code || '').trim().toUpperCase(),
        type: String(row.type || '').trim().toUpperCase(),
        category: String(row.account_category || '').trim().toUpperCase(),
        subtype: String(row.account_subtype || '').trim().toUpperCase(),
        referenceType: String(row.reference_type || '').trim().toUpperCase(),
        postingAllowed: Number(row.posting_allowed ?? row.is_transactional ?? 1) ? 1 : 0,
        isGroup: Number(row.is_group ?? 0) ? 1 : 0,
        status: String(row.status || (Number(row.is_active ?? 1) ? 'ACTIVE' : 'INACTIVE')).trim().toUpperCase(),
      };

      const isDifferent =
        before.accountCode !== next.accountCode ||
        before.type !== next.type ||
        before.category !== next.category ||
        before.subtype !== next.subtype ||
        before.referenceType !== next.referenceType ||
        before.postingAllowed !== next.postingAllowed ||
        before.isGroup !== next.isGroup ||
        before.status !== next.status;

      if (isDifferent) {
        update.run(next);
        changed += 1;
      }
    }
  });

  tx();
  console.log(`Reclassified ${changed} account(s) out of ${rows.length}.`);
  console.log(`Database: ${dbPath}`);
}

run();
