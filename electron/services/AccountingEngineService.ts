import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

type VoucherInputLine = {
  account_id: string;
  debit?: number | string;
  credit?: number | string;
  sub_account_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  line_description?: string | null;
  currency_code?: string | null;
  exchange_rate?: number | string | null;
};

type VoucherInput = {
  voucher_type: string;
  voucher_date: string;
  description?: string | null;
  currency_code?: string | null;
  exchange_rate?: number | string | null;
  source_type?: string | null;
  source_id?: string | null;
  created_by?: string | null;
  lines: VoucherInputLine[];
};

const normalizeText = (value?: string | null): string =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const toDecimal = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return new Decimal(value);
};

const voucherPrefixMap: Record<string, string> = {
  JOURNAL: 'JV',
  RECEIPT: 'RV',
  PAYMENT: 'PV',
  OPENING: 'OV',
  CLOSING: 'CV',
  TRANSFER: 'TV'
};

export class AccountingEngineService {
  static listSubAccounts(accountId?: string | null) {
    if (accountId) {
      return db
        .prepare(`
          SELECT *
          FROM ae_sub_accounts
          WHERE account_id = ? AND is_active = 1
          ORDER BY COALESCE(code, ''), name
        `)
        .all(accountId);
    }

    return db
      .prepare(`
        SELECT *
        FROM ae_sub_accounts
        WHERE is_active = 1
        ORDER BY account_id, COALESCE(code, ''), name
      `)
      .all();
  }

  static listReferences(refType?: string | null) {
    if (refType?.trim()) {
      return db
        .prepare(`
          SELECT *
          FROM ae_references
          WHERE ref_type = ? AND is_active = 1
          ORDER BY COALESCE(ref_code, ''), ref_name
        `)
        .all(refType.trim().toUpperCase());
    }

    return db
      .prepare(`
        SELECT *
        FROM ae_references
        WHERE is_active = 1
        ORDER BY ref_type, COALESCE(ref_code, ''), ref_name
      `)
      .all();
  }

  static createSubAccount(data: { account_id: string; name: string; code?: string | null }) {
    if (!data?.account_id) throw new Error('account_id is required');
    if (!data?.name?.trim()) throw new Error('Sub account name is required');

    const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(data.account_id);
    if (!account) throw new Error('Parent account does not exist');

    const normalizedName = normalizeText(data.name);
    const duplicate = db
      .prepare('SELECT id FROM ae_sub_accounts WHERE account_id = ? AND normalized_name = ? LIMIT 1')
      .get(data.account_id, normalizedName);
    if (duplicate) throw new Error('Sub account already exists for this parent account');

    const id = uuidv4();
    db.prepare(`
      INSERT INTO ae_sub_accounts (id, account_id, code, name, normalized_name, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, data.account_id, data.code || null, data.name.trim(), normalizedName);

    return db.prepare('SELECT * FROM ae_sub_accounts WHERE id = ?').get(id);
  }

  static createReference(data: { ref_type: string; ref_name: string; ref_code?: string | null }) {
    if (!data?.ref_type?.trim()) throw new Error('ref_type is required');
    if (!data?.ref_name?.trim()) throw new Error('ref_name is required');

    const refType = data.ref_type.trim().toUpperCase();
    const normalizedName = normalizeText(data.ref_name);

    const duplicateByName = db
      .prepare('SELECT id FROM ae_references WHERE ref_type = ? AND normalized_name = ? LIMIT 1')
      .get(refType, normalizedName);
    if (duplicateByName) throw new Error('Reference already exists in this reference type');

    if (data.ref_code?.trim()) {
      const duplicateByCode = db
        .prepare('SELECT id FROM ae_references WHERE ref_type = ? AND ref_code = ? LIMIT 1')
        .get(refType, data.ref_code.trim());
      if (duplicateByCode) throw new Error('Reference code already exists in this reference type');
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO ae_references (id, ref_type, ref_code, ref_name, normalized_name, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, refType, data.ref_code?.trim() || null, data.ref_name.trim(), normalizedName);

    return db.prepare('SELECT * FROM ae_references WHERE id = ?').get(id);
  }

  static saveDraftVoucher(input: VoucherInput) {
    this.ensureVoucherInput(input);
    const payload = this.buildVoucherPayload(input);

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO ae_vouchers (
          id, voucher_no, voucher_type, voucher_date, status,
          currency_code, exchange_rate, description, source_type, source_id, created_by
        ) VALUES (
          @id, @voucher_no, @voucher_type, @voucher_date, 'DRAFT',
          @currency_code, @exchange_rate, @description, @source_type, @source_id, @created_by
        )
      `).run(payload.header);

      const insertLine = db.prepare(`
        INSERT INTO ae_voucher_lines (
          id, voucher_id, line_no, account_id, sub_account_id, reference_type, reference_id,
          line_description, debit, credit, currency_code, exchange_rate
        ) VALUES (
          @id, @voucher_id, @line_no, @account_id, @sub_account_id, @reference_type, @reference_id,
          @line_description, @debit, @credit, @currency_code, @exchange_rate
        )
      `);

      payload.lines.forEach((line) => insertLine.run(line));
    });

    tx();
    return this.getVoucher(payload.header.id);
  }

  static postVoucher(input: VoucherInput) {
    this.ensureVoucherInput(input);
    this.validateLines(input.lines);
    const payload = this.buildVoucherPayload(input);

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO ae_vouchers (
          id, voucher_no, voucher_type, voucher_date, status,
          currency_code, exchange_rate, description, source_type, source_id, created_by, posted_at
        ) VALUES (
          @id, @voucher_no, @voucher_type, @voucher_date, 'POSTED',
          @currency_code, @exchange_rate, @description, @source_type, @source_id, @created_by, CURRENT_TIMESTAMP
        )
      `).run(payload.header);

      const insertLine = db.prepare(`
        INSERT INTO ae_voucher_lines (
          id, voucher_id, line_no, account_id, sub_account_id, reference_type, reference_id,
          line_description, debit, credit, currency_code, exchange_rate
        ) VALUES (
          @id, @voucher_id, @line_no, @account_id, @sub_account_id, @reference_type, @reference_id,
          @line_description, @debit, @credit, @currency_code, @exchange_rate
        )
      `);

      payload.lines.forEach((line) => insertLine.run(line));
    });

    tx();
    return this.getVoucher(payload.header.id);
  }

  static postDraftVoucher(voucherId: string) {
    const voucher = this.getVoucher(voucherId);
    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status === 'POSTED') return voucher;

    this.validateLines(voucher.lines || []);

    db.prepare(`
      UPDATE ae_vouchers
      SET status = 'POSTED', posted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(voucherId);

    return this.getVoucher(voucherId);
  }

  static getVoucher(id: string) {
    const header = db.prepare('SELECT * FROM ae_vouchers WHERE id = ?').get(id);
    if (!header) return null;
    const lines = db
      .prepare('SELECT * FROM ae_voucher_lines WHERE voucher_id = ? ORDER BY line_no ASC')
      .all(id);
    return { ...header, lines };
  }

  static getVouchers(filters: { status?: string; fromDate?: string; toDate?: string; voucherType?: string } = {}) {
    let sql = 'SELECT * FROM ae_vouchers WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status.toUpperCase());
    }
    if (filters.voucherType) {
      sql += ' AND voucher_type = ?';
      params.push(filters.voucherType.toUpperCase());
    }
    if (filters.fromDate) {
      sql += ' AND voucher_date >= ?';
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      sql += ' AND voucher_date <= ?';
      params.push(filters.toDate);
    }

    sql += ' ORDER BY voucher_date DESC, voucher_no DESC';
    return db.prepare(sql).all(...params);
  }

  static getTrialBalance(params: { fromDate?: string; toDate?: string } = {}) {
    let whereClause = 'v.status = \'POSTED\'';
    const sqlParams: any[] = [];

    if (params.fromDate) {
      whereClause += ' AND v.voucher_date >= ?';
      sqlParams.push(params.fromDate);
    }
    if (params.toDate) {
      whereClause += ' AND v.voucher_date <= ?';
      sqlParams.push(params.toDate);
    }

    const rows = db.prepare(`
      SELECT
        a.id AS account_id,
        a.code AS account_code,
        a.name AS account_name,
        SUM(CAST(l.debit AS REAL)) AS total_debit,
        SUM(CAST(l.credit AS REAL)) AS total_credit
      FROM ae_voucher_lines l
      INNER JOIN ae_vouchers v ON v.id = l.voucher_id
      INNER JOIN accounts a ON a.id = l.account_id
      WHERE ${whereClause}
      GROUP BY a.id, a.code, a.name
      ORDER BY a.code ASC
    `).all(...sqlParams);

    return rows.map((row: any) => {
      const debit = toDecimal(row.total_debit || 0);
      const credit = toDecimal(row.total_credit || 0);
      return {
        ...row,
        total_debit: debit.toFixed(6),
        total_credit: credit.toFixed(6),
        net_balance: debit.minus(credit).toFixed(6)
      };
    });
  }

  private static ensureVoucherInput(input: VoucherInput) {
    if (!input?.voucher_type?.trim()) throw new Error('voucher_type is required');
    if (!input?.voucher_date?.trim()) throw new Error('voucher_date is required');
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error('Voucher must contain at least one line');
    }
  }

  private static validateLines(lines: VoucherInputLine[]) {
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    lines.forEach((line, index) => {
      if (!line.account_id) throw new Error(`Line ${index + 1}: account_id is required`);

      const debit = toDecimal(line.debit || 0);
      const credit = toDecimal(line.credit || 0);

      if (debit.isNegative() || credit.isNegative()) {
        throw new Error(`Line ${index + 1}: debit/credit cannot be negative`);
      }

      if (debit.gt(0) === credit.gt(0)) {
        throw new Error(`Line ${index + 1}: exactly one side (debit or credit) must be greater than zero`);
      }

      const account = db.prepare(`
        SELECT id, code, name,
               COALESCE(is_posting, posting_allowed, is_transactional, 1) AS can_post,
               COALESCE(requires_sub_account, 0) AS requires_sub_account,
               COALESCE(requires_reference, 0) AS requires_reference
        FROM accounts
        WHERE id = ?
      `).get(line.account_id);

      if (!account) throw new Error(`Line ${index + 1}: account does not exist`);
      if (Number(account.can_post) !== 1) {
        throw new Error(`Line ${index + 1}: account ${account.code || account.name} is not posting`);
      }

      if (Number(account.requires_sub_account) === 1 && !line.sub_account_id) {
        throw new Error(`Line ${index + 1}: account requires a sub account`);
      }

      if (line.sub_account_id) {
        const subAcc = db
          .prepare('SELECT id, account_id FROM ae_sub_accounts WHERE id = ? AND is_active = 1')
          .get(line.sub_account_id);
        if (!subAcc) throw new Error(`Line ${index + 1}: sub account does not exist or inactive`);
        if (subAcc.account_id !== line.account_id) {
          throw new Error(`Line ${index + 1}: sub account does not belong to selected account`);
        }
      }

      if (Number(account.requires_reference) === 1 && (!line.reference_type || !line.reference_id)) {
        throw new Error(`Line ${index + 1}: account requires reference type and reference id`);
      }

      if (line.reference_id) {
        const ref = db
          .prepare('SELECT id, ref_type FROM ae_references WHERE id = ? AND is_active = 1')
          .get(line.reference_id);
        if (!ref) throw new Error(`Line ${index + 1}: reference does not exist or inactive`);
        if (line.reference_type && String(ref.ref_type).toUpperCase() !== String(line.reference_type).toUpperCase()) {
          throw new Error(`Line ${index + 1}: reference type mismatch`);
        }
      }

      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);
    });

    if (!totalDebit.equals(totalCredit)) {
      throw new Error(`Unbalanced voucher. Debit ${totalDebit.toFixed(6)} != Credit ${totalCredit.toFixed(6)}`);
    }
  }

  private static buildVoucherPayload(input: VoucherInput) {
    const voucherType = input.voucher_type.trim().toUpperCase();
    const voucherDate = input.voucher_date;
    const year = new Date(voucherDate).getFullYear();
    const prefix = voucherPrefixMap[voucherType] || 'JV';
    const voucherNo = this.getNextVoucherNo(prefix, year);
    const voucherId = uuidv4();

    const header = {
      id: voucherId,
      voucher_no: voucherNo,
      voucher_type: voucherType,
      voucher_date: voucherDate,
      currency_code: (input.currency_code || 'ILS').toUpperCase(),
      exchange_rate: toDecimal(input.exchange_rate || 1).toFixed(6),
      description: input.description || null,
      source_type: input.source_type || null,
      source_id: input.source_id || null,
      created_by: input.created_by || null
    };

    const lines = input.lines.map((line, idx) => ({
      id: uuidv4(),
      voucher_id: voucherId,
      line_no: idx + 1,
      account_id: line.account_id,
      sub_account_id: line.sub_account_id || null,
      reference_type: line.reference_type ? String(line.reference_type).toUpperCase() : null,
      reference_id: line.reference_id || null,
      line_description: line.line_description || null,
      debit: toDecimal(line.debit || 0).toFixed(6),
      credit: toDecimal(line.credit || 0).toFixed(6),
      currency_code: (line.currency_code || input.currency_code || 'ILS').toUpperCase(),
      exchange_rate: toDecimal(line.exchange_rate || input.exchange_rate || 1).toFixed(6)
    }));

    return { header, lines };
  }

  private static getNextVoucherNo(prefix: string, year: number) {
    const tx = db.transaction(() => {
      const row = db
        .prepare('SELECT current_value FROM ae_voucher_counters WHERE prefix = ? AND year = ?')
        .get(prefix, year);

      let currentValue = 0;
      if (row) {
        currentValue = Number(row.current_value || 0);
      } else {
        db.prepare('INSERT INTO ae_voucher_counters (prefix, year, current_value) VALUES (?, ?, 0)').run(prefix, year);
      }

      currentValue += 1;
      db.prepare('UPDATE ae_voucher_counters SET current_value = ? WHERE prefix = ? AND year = ?').run(currentValue, prefix, year);

      return `${prefix}-${year}-${String(currentValue).padStart(4, '0')}`;
    });

    return tx();
  }
}
