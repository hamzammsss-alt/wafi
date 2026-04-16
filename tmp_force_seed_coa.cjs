const { app } = require('electron');
const Database = require('better-sqlite3');
const { seedPalestinianData } = require('./dist-electron/electron/seed_palestine.js');
app.whenReady().then(() => {
  try {
    const dbPath = 'D:/Users/HP/AppData/Roaming/wafi-erp/wafi.db';
    const db = new Database(dbPath);
    db.exec('PRAGMA foreign_keys = OFF;');
    db.prepare('DELETE FROM gl_chart_of_accounts').run();
    db.prepare('DELETE FROM accounts').run();
    seedPalestinianData(db);
    const gl = db.prepare('SELECT COUNT(*) as c FROM gl_chart_of_accounts').get();
    const acc = db.prepare('SELECT COUNT(*) as c FROM accounts').get();
    const roots = db.prepare("SELECT account_code, name_ar FROM gl_chart_of_accounts WHERE parent_id IS NULL ORDER BY account_code").all();
    console.log(JSON.stringify({ dbPath, glCount: gl.c, accountsCount: acc.c, roots }, null, 2));
    app.exit(0);
  } catch (e) {
    console.error('ERR_FORCE_SEED', e && e.stack ? e.stack : e);
    app.exit(1);
  }
});
