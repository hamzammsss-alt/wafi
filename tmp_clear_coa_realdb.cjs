const { app } = require('electron');
const Database = require('better-sqlite3');
app.whenReady().then(() => {
  try {
    const db = new Database('D:/Users/HP/AppData/Roaming/wafi-erp/wafi.db');
    db.exec('PRAGMA foreign_keys = OFF;');
    db.prepare('DELETE FROM gl_chart_of_accounts').run();
    db.prepare('DELETE FROM accounts').run();
    console.log('CLEARED_COA_TABLES');
    app.exit(0);
  } catch (e) {
    console.error('ERR_CLEAR', e && e.stack ? e.stack : e);
    app.exit(1);
  }
});
