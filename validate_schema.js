const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbDir = 'c:\\WAFI ERP\\database';
const dbPath = 'c:\\WAFI ERP\\test_schema.db';

// Clean up previous test db
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
let errorCount = 0;
let successCount = 0;

try {
    const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.sql'));

    // Sort files to ensure dependencies might be respected (though largely independent or ordered by name)
    // Ideally, schema_v1 should proceed v2, etc.
    files.sort((a, b) => {
        const getVer = (n) => parseInt(n.match(/v(\d+)/)?.[1] || 0);
        return getVer(a) - getVer(b);
    });

    console.log(`Found ${files.length} SQL files.`);

    for (const file of files) {
        const filePath = path.join(dbDir, file);
        try {
            const schema = fs.readFileSync(filePath, 'utf8');
            db.exec(schema);
            console.log(`[PASS] ${file}`);
            successCount++;
        } catch (err) {
            console.error(`[FAIL] ${file}`);
            console.error(`  Error: ${err.message.split('\n')[0]}`);
            errorCount++;
        }
    }

} catch (err) {
    console.error('Fatal Error:', err);
} finally {
    db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    console.log('\n--- Summary ---');
    console.log(`Passed: ${successCount}`);
    console.log(`Failed: ${errorCount}`);

    if (errorCount > 0) process.exit(1);
}
