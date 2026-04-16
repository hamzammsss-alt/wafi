const { app } = require('electron');
const Database = require('better-sqlite3');
app.whenReady().then(() => {
  const db = new Database('D:/Users/HP/AppData/Roaming/wafi-erp/wafi.db');
  const gl = db.prepare('SELECT COUNT(*) as c FROM gl_chart_of_accounts').get();
  const roots = db.prepare("SELECT account_code, name_ar FROM gl_chart_of_accounts WHERE parent_id IS NULL ORDER BY account_code").all();
  console.log(JSON.stringify({ glCount: gl.c, roots }, null, 2));
  app.exit(0);
});
