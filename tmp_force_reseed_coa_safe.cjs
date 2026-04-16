const { app } = require('electron');
const Database = require('better-sqlite3');
const { seedPalestinianData } = require('./dist-electron/electron/seed_palestine.js');

function titleType(t) {
  const u = String(t || '').toUpperCase();
  if (u === 'ASSET') return 'Asset';
  if (u === 'LIABILITY') return 'Liability';
  if (u === 'EQUITY') return 'Equity';
  if (u === 'REVENUE') return 'Revenue';
  if (u === 'EXPENSE') return 'Expense';
  return 'Asset';
}

app.whenReady().then(() => {
  try {
    const dbPath = 'D:/Users/HP/AppData/Roaming/wafi-erp/wafi.db';
    const db = new Database(dbPath);
    db.exec('PRAGMA foreign_keys = OFF;');

    db.prepare('DELETE FROM gl_chart_of_accounts').run();
    db.prepare('DELETE FROM accounts').run();

    // Proxy db: let seed write full GL tree, but skip legacy accounts insert that violates V55 trigger policy.
    const proxiedDb = {
      prepare(sql) {
        const txt = String(sql || '');
        if (txt.includes('INSERT INTO accounts')) {
          return { run() { return { changes: 0 }; } };
        }
        return db.prepare(sql);
      },
      transaction(fn) {
        return db.transaction(fn);
      },
      exec(sql) {
        return db.exec(sql);
      }
    };

    seedPalestinianData(proxiedDb);

    // Sync GL => accounts with V55-compliant fields.
    const rows = db.prepare(`
      SELECT g.id, g.account_code, g.name_ar, g.parent_id, g.account_type, g.is_transactional,
             g.currency_id, c.code AS currency_code,
             EXISTS(SELECT 1 FROM gl_chart_of_accounts ch WHERE ch.parent_id = g.id) AS has_children
      FROM gl_chart_of_accounts g
      LEFT JOIN currencies c ON c.id = g.currency_id
      ORDER BY LENGTH(g.account_code), g.account_code
    `).all();

    const ins = db.prepare(`
      INSERT INTO accounts (
        id, code, name, type, balance, parent_id, account_level, is_transactional, currency, is_active,
        company_id, category, subtype, is_posting, is_group, normal_balance, allow_manual_entry, level, path
      ) VALUES (
        @id, @code, @name, @type, '0', @parent_id, @account_level, @is_transactional, @currency, 1,
        'COMP_01', @category, @subtype, @is_posting, @is_group, @normal_balance, @allow_manual_entry, @level, @path
      )
    `);

    const insertTx = db.transaction(() => {
      for (const r of rows) {
        const category = String(r.account_type || 'ASSET').toUpperCase();
        const isPosting = Number(r.has_children) ? 0 : 1;
        const subtype = isPosting ? 'GENERAL' : 'GROUP';
        const normalBalance = ['LIABILITY', 'EQUITY', 'REVENUE', 'OTHER_INCOME'].includes(category) ? 'CREDIT' : 'DEBIT';
        const code = String(r.account_code || '');
        ins.run({
          id: r.id,
          code,
          name: r.name_ar,
          type: titleType(r.account_type),
          parent_id: r.parent_id || null,
          account_level: code.length || 1,
          is_transactional: isPosting,
          currency: r.currency_code || 'NIS',
          category,
          subtype,
          is_posting: isPosting,
          is_group: isPosting ? 0 : 1,
          normal_balance: normalBalance,
          allow_manual_entry: isPosting,
          level: code.length || 1,
          path: code
        });
      }
    });

    insertTx();

    const gl = db.prepare('SELECT COUNT(*) c FROM gl_chart_of_accounts').get();
    const acc = db.prepare('SELECT COUNT(*) c FROM accounts').get();
    const roots = db.prepare("SELECT account_code, name_ar FROM gl_chart_of_accounts WHERE parent_id IS NULL ORDER BY account_code").all();
    console.log(JSON.stringify({ dbPath, glCount: gl.c, accountsCount: acc.c, roots }, null, 2));

    app.exit(0);
  } catch (e) {
    console.error('ERR_RESEED_COA', e && e.stack ? e.stack : e);
    app.exit(1);
  }
});
