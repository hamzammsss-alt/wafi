const Database = require('better-sqlite3');

const db = new Database('wafi.db');

db.exec(`
    DROP TRIGGER IF EXISTS trg_accounts_prevent_posting_with_children_v55;

    CREATE TRIGGER IF NOT EXISTS trg_accounts_prevent_posting_with_children_v56
    BEFORE UPDATE OF is_posting ON accounts
    FOR EACH ROW
    WHEN COALESCE(NEW.is_posting, 0) = 1
      AND COALESCE(OLD.is_posting, 0) = 0
      AND EXISTS (
        SELECT 1
        FROM accounts c
        WHERE c.parent_id = NEW.id
      )
    BEGIN
        SELECT RAISE(ABORT, 'Posting accounts cannot have children');
    END;
`);

const triggers = db
    .prepare(
        `SELECT name
         FROM sqlite_master
         WHERE type = 'trigger'
           AND name LIKE 'trg_accounts_prevent_posting_with_children%'
         ORDER BY name`,
    )
    .all();

console.log(JSON.stringify(triggers, null, 2));

db.close();