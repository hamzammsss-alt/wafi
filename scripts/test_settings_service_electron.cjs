const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const Database = require('better-sqlite3');
const { SystemSettingsService } = require('../dist-electron/src/main/application/services/SystemSettingsService.js');

const log = (message) => console.log(`[SETTINGS TEST] ${message}`);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wafi-settings-'));
const dbPath = path.join(tmpDir, 'settings-test.db');
const db = new Database(dbPath);

try {
  const service = new SystemSettingsService(db, null);
  const ctx = {
    companyId: 'COMP_TEST',
    branchId: 'BR_MAIN',
    userId: 'USER_ADMIN',
  };

  log('Scenario 1: default seed should include all requested sections');
  const all = service.getAll(ctx);
  const codes = new Set(all.groups.map((group) => group.code));
  for (const code of [
    'company_information',
    'general',
    'manual_vouchers',
    'currency',
    'inventory',
    'bisan_services_api',
    'timezone',
  ]) {
    assert.ok(codes.has(code), `Missing settings group: ${code}`);
  }
  assert.ok(all.groups.length >= 32, `Expected at least 32 groups, got ${all.groups.length}`);
  log(`Seed contains ${all.groups.length} groups`);

  log('Scenario 2: saving and reading a company-level setting');
  const patch = service.patchKey('VAT_RATE', 17.5, ctx);
  assert.equal(patch.changedCount, 1);
  const vat = service.getSetting('VAT_RATE', ctx);
  assert.equal(vat.value, 17.5);
  const legacyVat = db.prepare("SELECT value FROM settings WHERE key = 'VAT_RATE'").get();
  assert.equal(legacyVat.value, '17.5');
  log('VAT_RATE saved and mirrored to legacy settings table');

  log('Scenario 3: branch-level override should not break company fallback');
  service.patchKey('general.language', 'en', ctx, { companyId: 'COMP_TEST', branchId: 'BR_2' });
  const branchValue = service.getSetting('general.language', ctx, { companyId: 'COMP_TEST', branchId: 'BR_2' });
  const fallbackValue = service.getSetting('general.language', ctx, { companyId: 'COMP_TEST', branchId: 'BR_OTHER' });
  assert.equal(branchValue.value, 'en');
  assert.equal(fallbackValue.value, 'ar');
  log('Branch override and default fallback work');

  log('Scenario 4: missing setting value should load default without throwing');
  db.prepare("DELETE FROM setting_values WHERE setting_key = 'timezone.default_timezone'").run();
  db.prepare("UPDATE settings SET value = NULL WHERE key = 'timezone.default_timezone'").run();
  const timezone = service.getSetting('timezone.default_timezone', ctx);
  assert.equal(timezone.value, 'Asia/Hebron');
  log('Default value loaded successfully');

  log('Scenario 5: validation should reject required missing values');
  let rejected = false;
  try {
    service.patchKey('company_name_ar', '', ctx);
  } catch (error) {
    rejected = error?.code === 'VALIDATION_ERROR';
  }
  assert.equal(rejected, true, 'Expected required value validation to reject empty company_name_ar');
  log('Validation rejected empty required field');

  log('Scenario 6: settings audit log should record changes');
  const auditRows = service.listAuditLogs(20);
  assert.ok(auditRows.some((row) => row.setting_key === 'VAT_RATE' && row.old_value === '16' && row.new_value === '17.5'));
  log(`Audit log contains ${auditRows.length} rows`);

  log('All settings service scenarios passed');
} finally {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

