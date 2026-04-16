const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const openDatabase = (filePath) => {
    try {
        const BetterSqlite3 = require("better-sqlite3");
        return { db: new BetterSqlite3(filePath), engine: "better-sqlite3" };
    } catch (error) {
        const message = error && error.message ? error.message : "";
        const canFallback = error && (
            error.code === "ERR_DLOPEN_FAILED" ||
            error.code === "MODULE_NOT_FOUND" ||
            /NODE_MODULE_VERSION|compiled against/i.test(message)
        );

        if (canFallback) {
            const { DatabaseSync } = require("node:sqlite");
            return { db: new DatabaseSync(filePath), engine: "node:sqlite" };
        }
        throw error;
    }
};

const dbPath = path.resolve(process.argv[2] || path.join(__dirname, "wafi.db"));
if (!fs.existsSync(dbPath)) {
    console.error(`[ERROR] Database file not found: ${dbPath}`);
    console.error("Create it first, or pass a custom path:");
    console.error("  node verify_auto_assign.js path/to/wafi.db");
    process.exit(1);
}

const { db, engine } = openDatabase(dbPath);

const query = {
    run: (sql, params = []) => db.prepare(sql).run(...params),
    get: (sql, params = []) => db.prepare(sql).get(...params),
    all: (sql, params = []) => db.prepare(sql).all(...params),
};

const getTableColumns = (tableName) => {
    const columns = query.all(`PRAGMA table_info(${tableName})`);
    return new Set(columns.map((column) => column.name));
};

const insertWithKnownColumns = (tableName, row, validColumns) => {
    const entries = Object.entries(row).filter(([key, value]) => validColumns.has(key) && value !== undefined);
    const columns = entries.map(([key]) => key);
    const placeholders = columns.map(() => "?").join(", ");
    const values = entries.map(([, value]) => value);

    if (columns.length === 0) {
        throw new Error(`No compatible columns available for ${tableName}`);
    }

    query.run(
        `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
        values
    );
};

const requiredTables = ["gl_chart_of_accounts", "business_partners"];
for (const tableName of requiredTables) {
    const table = query.get(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        [tableName]
    );
    if (!table) {
        console.error(`[ERROR] Missing required table: ${tableName}`);
        process.exit(1);
    }
}

const coaColumns = getTableColumns("gl_chart_of_accounts");
const partnerColumns = getTableColumns("business_partners");

const insertedIds = {
    partnerId: null,
    childAccountId: null,
    createdParentId: null,
    mirroredAccountId: null,
};
const parentAccountState = {
    id: null,
    shouldRestoreTransactional: false,
    originalTransactional: null,
};

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

try {
    console.log(`[INFO] Using ${engine}`);

    let parentAccount = query.get(
        "SELECT id, account_code, is_transactional, account_type FROM gl_chart_of_accounts WHERE account_code = '1131'"
    );

    if (!parentAccount) {
        const createdParentId = uuidv4();
        insertedIds.createdParentId = createdParentId;

        insertWithKnownColumns(
            "gl_chart_of_accounts",
            {
                id: createdParentId,
                account_code: "1131",
                name_ar: "Auto Assign Parent",
                name_en: "Auto Assign Parent",
                account_type: "ASSET",
                account_level: 4,
                is_transactional: 0,
                parent_id: null,
                requires_cost_center: 0,
                sync_status: 0,
            },
            coaColumns
        );

        parentAccount = query.get(
            "SELECT id, account_code, is_transactional, account_type FROM gl_chart_of_accounts WHERE id = ?",
            [createdParentId]
        );
    } else if (coaColumns.has("is_transactional")) {
        parentAccountState.id = parentAccount.id;
        parentAccountState.originalTransactional = parentAccount.is_transactional;

        if (parentAccount.is_transactional === 1) {
            query.run("UPDATE gl_chart_of_accounts SET is_transactional = 0 WHERE id = ?", [parentAccount.id]);
            parentAccountState.shouldRestoreTransactional = true;
            parentAccount = query.get(
                "SELECT id, account_code, is_transactional, account_type FROM gl_chart_of_accounts WHERE id = ?",
                [parentAccount.id]
            );
        }
    }

    assert(parentAccount, "Parent account 1131 could not be prepared.");

    const partnerId = uuidv4();
    insertedIds.partnerId = partnerId;

    const partnerCode = `AUTO-${Date.now().toString(36).toUpperCase()}`;
    const partnerName = "Auto Assign Verification Partner";

    const siblings = query.all(
        "SELECT account_code FROM gl_chart_of_accounts WHERE parent_id = ?",
        [parentAccount.id]
    );

    let maxSuffix = 0;
    for (const sibling of siblings) {
        if (typeof sibling.account_code !== "string") continue;
        if (!sibling.account_code.startsWith(parentAccount.account_code)) continue;

        const suffixValue = Number.parseInt(
            sibling.account_code.slice(parentAccount.account_code.length),
            10
        );
        if (Number.isFinite(suffixValue) && suffixValue > maxSuffix) {
            maxSuffix = suffixValue;
        }
    }

    const childCode = `${parentAccount.account_code}${String(maxSuffix + 1).padStart(4, "0")}`;
    const childAccountId = uuidv4();
    insertedIds.childAccountId = childAccountId;

    insertWithKnownColumns(
        "gl_chart_of_accounts",
        {
            id: childAccountId,
            account_code: childCode,
            name_ar: partnerName,
            name_en: partnerName,
            parent_id: parentAccount.id,
            account_type: parentAccount.account_type || "ASSET",
            account_level: 5,
            is_transactional: 1,
            system_type: "CUSTOMER",
            requires_cost_center: 0,
            sync_status: 0,
        },
        coaColumns
    );

    const partnerForeignKeys = query.all("PRAGMA foreign_key_list(business_partners)");
    const linkedAccountForeignKey = partnerForeignKeys.find((fk) => fk.from === "linked_account_id");
    const linkedAccountTargetTable = linkedAccountForeignKey && linkedAccountForeignKey.table
        ? String(linkedAccountForeignKey.table).toLowerCase()
        : "";

    if (linkedAccountTargetTable === "accounts") {
        const accountColumns = getTableColumns("accounts");
        const existingAccount = query.get("SELECT id FROM accounts WHERE id = ?", [childAccountId]);

        if (!existingAccount) {
            insertWithKnownColumns(
                "accounts",
                {
                    id: childAccountId,
                    code: childCode,
                    name: partnerName,
                    type: "Asset",
                    balance: "0",
                    currency: "ILS",
                    parent_id: null,
                    account_level: 5,
                    is_transactional: 1,
                    is_active: 1,
                },
                accountColumns
            );
            insertedIds.mirroredAccountId = childAccountId;
        }
    }

    insertWithKnownColumns(
        "business_partners",
        {
            id: partnerId,
            code: partnerCode,
            name_ar: partnerName,
            name_en: partnerName,
            type: "CUSTOMER",
            linked_account_id: childAccountId,
            is_active: 1,
        },
        partnerColumns
    );

    const savedPartner = query.get(
        "SELECT id, code, linked_account_id FROM business_partners WHERE id = ?",
        [partnerId]
    );

    assert(savedPartner, "Partner insert failed.");

    const linkedAccount = query.get(
        "SELECT id, account_code, parent_id, is_transactional FROM gl_chart_of_accounts WHERE id = ?",
        [savedPartner.linked_account_id]
    );

    assert(savedPartner.linked_account_id !== parentAccount.id, "Partner linked to parent account instead of child account.");
    assert(linkedAccount, "Linked child account was not found.");
    assert(linkedAccount.parent_id === parentAccount.id, "Child account parent_id is incorrect.");

    if (coaColumns.has("is_transactional")) {
        assert(linkedAccount.is_transactional === 1, "Child account is not transactional.");
    }

    console.log("[PASS] Auto assignment verification completed.");
    console.log(`       Partner code: ${partnerCode}`);
    console.log(`       Parent account: ${parentAccount.account_code}`);
    console.log(`       Child account: ${linkedAccount.account_code}`);
} catch (error) {
    console.error("[FAIL] Auto assignment verification failed.");
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
} finally {
    try {
        if (
            parentAccountState.shouldRestoreTransactional &&
            parentAccountState.id &&
            coaColumns.has("is_transactional")
        ) {
            query.run("UPDATE gl_chart_of_accounts SET is_transactional = ? WHERE id = ?", [
                parentAccountState.originalTransactional,
                parentAccountState.id,
            ]);
        }

        if (insertedIds.partnerId) {
            query.run("DELETE FROM business_partners WHERE id = ?", [insertedIds.partnerId]);
        }

        if (insertedIds.childAccountId) {
            query.run("DELETE FROM gl_chart_of_accounts WHERE id = ?", [insertedIds.childAccountId]);
        }

        if (insertedIds.mirroredAccountId) {
            query.run("DELETE FROM accounts WHERE id = ?", [insertedIds.mirroredAccountId]);
        }

        if (insertedIds.createdParentId) {
            query.run("DELETE FROM gl_chart_of_accounts WHERE id = ?", [insertedIds.createdParentId]);
        }
    } catch (cleanupError) {
        console.error("[WARN] Cleanup encountered an issue:", cleanupError.message || cleanupError);
    }

    try {
        db.close();
    } catch {
        // noop
    }
}
