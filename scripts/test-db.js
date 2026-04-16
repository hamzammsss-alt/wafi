const path = require('path');
const { initDB, db } = require('../dist-electron/electron/database.js');

try {
    const dbPath = path.join(__dirname, '../database.sqlite');
    console.log("[TEST] Initializing DB at:", dbPath);
    initDB(dbPath);

    // Actually, we can just require better-sqlite3 directly if initDB is too complex,
    // but initDB contains the self-repair logic.
    // Wait, db in database.js is exported.
    console.log("[TEST] Database initialized successfully.");

    // Since db is exported from database.ts, we can query it:
    const { db: databaseInstance } = require('../dist-electron/electron/database.js');

    const count = databaseInstance.prepare(`SELECT count(*) as cnt FROM sqlite_master WHERE sql LIKE '%business_partners_backup_fix_fk%'`).get();
    console.log(`[TEST] Broken FKs in sqlite_master: ${count.cnt}`);

    if (count.cnt === 0) {
        console.log("[TEST] SUCCESS: The phantom FK problem is gone.");
    } else {
        console.error("[TEST] FAILURE: Broken FKs still remain.");
        process.exit(1);
    }

} catch (err) {
    console.error("[TEST] Error during DB init:", err);
    process.exit(1);
}

// Exit cleanly
setTimeout(() => process.exit(0), 1000);
