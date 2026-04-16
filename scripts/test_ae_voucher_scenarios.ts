import path from 'path';
import { initDB, db } from '../electron/database';
import { AccountingEngineService } from '../electron/services/AccountingEngineService';

const log = (msg: string) => console.log(`[AE TEST] ${msg}`);

async function expectThrows(name: string, fn: () => any) {
  try {
    await Promise.resolve(fn());
    throw new Error(`${name} should fail but passed`);
  } catch (error: any) {
    log(`${name} failed as expected: ${error?.message || error}`);
  }
}

function findAccountIdByCode(code: string): string {
  const row = db.prepare('SELECT id FROM accounts WHERE code = ? LIMIT 1').get(code) as any;
  if (!row?.id) {
    throw new Error(`Required account with code ${code} was not found`);
  }
  return row.id;
}

async function run() {
  const dbPath = path.resolve('wafi.db');
  initDB(dbPath);

  const cashAccountId = findAccountIdByCode('1110');
  const arAccountId = findAccountIdByCode('1200');
  const expenseAccountId = findAccountIdByCode('6000');

  log('Scenario 1: balanced voucher should post');
  const balanced = AccountingEngineService.postVoucher({
    voucher_type: 'JOURNAL',
    voucher_date: new Date().toISOString().slice(0, 10),
    description: 'AE test balanced',
    lines: [
      { account_id: cashAccountId, debit: 100, credit: 0, line_description: 'debit cash' },
      { account_id: expenseAccountId, debit: 0, credit: 100, line_description: 'credit expense' }
    ]
  });

  if (!balanced?.id || balanced?.status !== 'POSTED') {
    throw new Error('Balanced voucher did not post correctly');
  }
  log(`Scenario 1 passed: ${balanced.voucher_no}`);

  log('Scenario 2: unbalanced voucher should fail');
  await expectThrows('Unbalanced voucher', () =>
    AccountingEngineService.postVoucher({
      voucher_type: 'JOURNAL',
      voucher_date: new Date().toISOString().slice(0, 10),
      description: 'AE test unbalanced',
      lines: [
        { account_id: cashAccountId, debit: 130, credit: 0 },
        { account_id: expenseAccountId, debit: 0, credit: 100 }
      ]
    })
  );

  log('Scenario 3: required sub-account/reference should fail then pass');
  await expectThrows('Missing required sub account/reference', () =>
    AccountingEngineService.postVoucher({
      voucher_type: 'RECEIPT',
      voucher_date: new Date().toISOString().slice(0, 10),
      description: 'AE test missing required refs',
      lines: [
        { account_id: arAccountId, debit: 220, credit: 0 },
        { account_id: cashAccountId, debit: 0, credit: 220 }
      ]
    })
  );

  const sub = AccountingEngineService.createSubAccount({
    account_id: arAccountId,
    name: `AE Test Sub ${Date.now()}`
  });

  const ref = AccountingEngineService.createReference({
    ref_type: 'CUSTOMER',
    ref_name: `AE Test Ref ${Date.now()}`
  });

  const requiredPass = AccountingEngineService.postVoucher({
    voucher_type: 'RECEIPT',
    voucher_date: new Date().toISOString().slice(0, 10),
    description: 'AE test required refs passed',
    lines: [
      {
        account_id: arAccountId,
        debit: 220,
        credit: 0,
        sub_account_id: sub.id,
        reference_type: 'CUSTOMER',
        reference_id: ref.id
      },
      { account_id: cashAccountId, debit: 0, credit: 220 }
    ]
  });

  if (!requiredPass?.id || requiredPass?.status !== 'POSTED') {
    throw new Error('Required sub-account/reference scenario did not pass as expected');
  }

  log(`Scenario 3 passed: ${requiredPass.voucher_no}`);
  log('All AE voucher scenarios passed');
}

run().catch((error) => {
  console.error('[AE TEST] Failed:', error?.message || error);
  process.exitCode = 1;
});
