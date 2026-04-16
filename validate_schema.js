const fs = require("fs");
const path = require("path");

const defaultSchemaDir = path.resolve(__dirname, "database");
const defaultDbPath = path.resolve(__dirname, "schema_validation.db");

const rawArgs = process.argv.slice(2);
const includeAllSql = rawArgs.includes("--all-sql");
const positionalArgs = rawArgs.filter((arg) => arg !== "--all-sql");

const schemaDir = path.resolve(positionalArgs[0] || defaultSchemaDir);
const dbPath = path.resolve(positionalArgs[1] || defaultDbPath);

const openDatabase = (filePath) => {
    try {
        const { DatabaseSync } = require("node:sqlite");
        return { db: new DatabaseSync(filePath), engine: "node:sqlite" };
    } catch {
        const BetterSqlite3 = require("better-sqlite3");
        return { db: new BetterSqlite3(filePath), engine: "better-sqlite3" };
    }
};

const getVersion = (fileName) => {
    const match = fileName.match(/schema_v(\d+)/i);
    return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};

if (!fs.existsSync(schemaDir)) {
    console.error(`[ERROR] Schema directory not found: ${schemaDir}`);
    process.exit(1);
}

if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

const { db, engine } = openDatabase(dbPath);
let successCount = 0;
let errorCount = 0;

try {
    const files = fs.readdirSync(schemaDir)
        .filter((file) => {
            if (!file.toLowerCase().endsWith(".sql")) return false;
            if (includeAllSql) return true;
            return /^schema_.*\.sql$/i.test(file);
        })
        .sort((a, b) => {
            const versionA = getVersion(a);
            const versionB = getVersion(b);

            if (versionA !== versionB) return versionA - versionB;
            return a.localeCompare(b);
        });

    if (files.length === 0) {
        console.error(`[ERROR] No SQL files found in ${schemaDir}`);
        process.exit(1);
    }

    console.log(`[INFO] Using ${engine}`);
    console.log(`[INFO] Mode: ${includeAllSql ? "all .sql files" : "schema_*.sql files"}`);
    console.log(`[INFO] Found ${files.length} SQL files in ${schemaDir}`);

    for (const file of files) {
        const filePath = path.join(schemaDir, file);
        try {
            const schemaSql = fs.readFileSync(filePath, "utf8");
            db.exec(schemaSql);
            console.log(`[PASS] ${file}`);
            successCount += 1;
        } catch (error) {
            const message = error && error.message ? error.message.split("\n")[0] : String(error);
            console.error(`[FAIL] ${file}`);
            console.error(`  ${message}`);
            errorCount += 1;
        }
    }
} catch (error) {
    console.error("[FATAL] Unexpected validation error:", error);
    process.exitCode = 1;
} finally {
    try {
        db.close();
    } catch {
        // noop
    }

    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }

    console.log("\n--- Summary ---");
    console.log(`Passed: ${successCount}`);
    console.log(`Failed: ${errorCount}`);

    if (errorCount > 0) {
        process.exitCode = 1;
    }
}
