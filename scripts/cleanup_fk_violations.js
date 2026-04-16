#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * FK Violations Cleanup Script
 * يقوم بفحص جميع انتهاكات المفاتيح الخارجية وحذف الصفوف غير الصالحة
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

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

function getForeignKeyList(db, tableName) {
  const safeTable = tableName.replace(/'/g, "''");
  try {
    return db.prepare(`PRAGMA foreign_key_list('${safeTable}')`).all();
  } catch {
    return [];
  }
}

function getForeignKeyViolations(db) {
  try {
    return db.prepare('PRAGMA foreign_key_check').all();
  } catch {
    return [];
  }
}

function tableExists(db, tableName) {
  try {
    return !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1`).get(tableName);
  } catch {
    return false;
  }
}

function getTablePrimaryKey(db, tableName) {
  try {
    const info = db.prepare(`PRAGMA table_info('${tableName.replace(/'/g, "''")}')`).all();
    const pk = info.find(col => col.pk > 0);
    return pk ? pk.name : 'rowid';
  } catch {
    return 'rowid';
  }
}

async function main() {
  const dbPath = resolveDbPath(process.argv[2]);
  if (!dbPath) {
    console.error('[Error] Database file not found');
    process.exit(1);
  }

  console.log(`[Cleanup] Database: ${dbPath}`);

  const db = openDatabase(dbPath);
  if (!db) {
    console.error('[Error] Failed to open database');
    process.exit(1);
  }

  try {
    // Get violations BEFORE disabling FK (while they're still detectable)
    db.exec('PRAGMA foreign_keys = ON');
    const violationsBefore = getForeignKeyViolations(db);
    console.log(`\n[Violations] Before cleanup: ${violationsBefore.length}`);

    if (violationsBefore.length === 0) {
      console.log('[Status] No FK violations found. Database is already clean.');
      db.close();
      return;
    }

    // Group violations by table for analysis
    const violationsByTable = {};
    violationsBefore.forEach(v => {
      if (!violationsByTable[v.table]) {
        violationsByTable[v.table] = [];
      }
      violationsByTable[v.table].push(v);
    });

    console.log('\n=== FK Violations Details ===');
    Object.entries(violationsByTable).forEach(([table, violations]) => {
      console.log(`\n[Table] ${table}`);
      violations.slice(0, 5).forEach(v => {
        console.log(
          `  → Row ${v.rowid}: references ${v.parent}(${v.fkid}) [col set #${v.fkid}]`
        );
      });
      if (violations.length > 5) {
        console.log(`  ... and ${violations.length - 5} more violations`);
      }
    });

    // Delete violating rows
    console.log('\n=== Starting Cleanup ===');
    let deletedTotal = 0;

    // Disable FK constraints temporarily to allow deletion
    db.exec('PRAGMA foreign_keys = OFF');

    for (const [table, violations] of Object.entries(violationsByTable)) {
      const pk = getTablePrimaryKey(db, table);
      const rowIds = violations.map(v => v.rowid);

      try {
        if (pk === 'rowid') {
          // Use rowid directly
          rowIds.forEach(rowid => {
            try {
              db.prepare(`DELETE FROM ${table} WHERE rowid = ?`).run(rowid);
              deletedTotal++;
            } catch (err) {
              console.log(`[Delete Error] ${table} rowid=${rowid}: ${err.message}`);
            }
          });
        } else {
          // Use primary key column (if it's composite, this is more complex)
          // For simplicity, we'll fetch the actual PK values and delete
          rowIds.forEach(rowid => {
            try {
              const pkVal = db.prepare(
                `SELECT ${pk} FROM ${table} WHERE rowid = ?`
              ).get(rowid);
              if (pkVal) {
                db.prepare(`DELETE FROM ${table} WHERE ${pk} = ?`).run(pkVal[pk]);
                deletedTotal++;
              }
            } catch (err) {
              console.log(`[Delete Error] ${table} rowid=${rowid}: ${err.message}`);
            }
          });
        }
        console.log(`[Deleted] ${table}: ${rowIds.length} rows`);
      } catch (err) {
        console.log(`[Error] Failed to delete from ${table}: ${err.message}`);
      }
    }

    // Re-enable FK constraints
    db.exec('PRAGMA foreign_keys = ON');

    // Verify cleanup
    const violationsAfter = getForeignKeyViolations(db);
    console.log(`\n[Status] Cleanup complete!`);
    console.log(`[Violations] After cleanup: ${violationsAfter.length}`);
    console.log(`[Deleted] Total rows removed: ${deletedTotal}`);

    if (violationsAfter.length > 0) {
      console.log('\n⚠️  WARNING: Some violations remain:');
      violationsAfter.slice(0, 10).forEach(v => {
        console.log(`  → ${v.table} rowid=${v.rowid} → ${v.parent}`);
      });
      if (violationsAfter.length > 10) {
        console.log(`  ... and ${violationsAfter.length - 10} more`);
      }
    } else {
      console.log('\n✅ SUCCESS: All FK violations have been cleaned!');
    }
  } catch (error) {
    console.error('[Fatal Error]', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main().catch(console.error);
