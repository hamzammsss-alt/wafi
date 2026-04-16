const fs = require("fs");
const path = require("path");
const Module = require("module");

process.resourcesPath = process.cwd();

const dbPath = path.resolve(process.argv[2] || path.join(__dirname, "wafi.db"));
const databaseModulePath = path.resolve(__dirname, "dist-electron/electron/database.js");
const serviceModulePath = path.resolve(__dirname, "dist-electron/electron/services/PartnerService.js");

const createBetterSqliteShim = () => {
    const { DatabaseSync } = require("node:sqlite");
    let savepointCounter = 0;

    return class BetterSqlite3Shim {
        constructor(filePath) {
            this.db = new DatabaseSync(filePath);
        }

        exec(sql) {
            return this.db.exec(sql);
        }

        prepare(sql) {
            return this.db.prepare(sql);
        }

        transaction(fn) {
            return (...args) => {
                savepointCounter += 1;
                const savepoint = `verify_sp_${savepointCounter}`;

                this.db.exec(`SAVEPOINT ${savepoint}`);
                try {
                    const result = fn(...args);
                    this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
                    return result;
                } catch (error) {
                    try {
                        this.db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
                    } catch {
                        // noop
                    }
                    try {
                        this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
                    } catch {
                        // noop
                    }
                    throw error;
                }
            };
        }

        pragma(query, options = {}) {
            const trimmed = query.trim();
            const pragmaSql = /^pragma\b/i.test(trimmed) ? trimmed : `PRAGMA ${trimmed}`;

            try {
                const rows = this.db.prepare(pragmaSql).all();
                if (options.simple) {
                    const firstRow = rows[0];
                    if (!firstRow) return undefined;
                    const firstColumn = Object.keys(firstRow)[0];
                    return firstRow[firstColumn];
                }
                return rows;
            } catch {
                this.db.exec(pragmaSql);
                return options.simple ? undefined : [];
            }
        }

        close() {
            return this.db.close();
        }
    };
};

const originalRequire = Module.prototype.require;
let shimWarningShown = false;
Module.prototype.require = function patchedRequire(request) {
    if (request === "electron") {
        const userDataPath = path.resolve(__dirname, ".verify-user-data");
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }

        return {
            app: {
                getPath: (name) => {
                    if (name === "userData") return userDataPath;
                    if (name === "documents") return process.cwd();
                    return process.cwd();
                },
            },
            dialog: {
                showSaveDialog: async () => ({ filePath: undefined }),
                showOpenDialog: async () => ({ filePaths: [] }),
            },
        };
    }

    if (request === "better-sqlite3") {
        if (!shimWarningShown) {
            console.warn("[WARN] Using node:sqlite compatibility shim for verification.");
            shimWarningShown = true;
        }
        return createBetterSqliteShim();
    }

    return originalRequire.apply(this, arguments);
};

if (!fs.existsSync(databaseModulePath) || !fs.existsSync(serviceModulePath)) {
    console.error("[ERROR] Dist modules not found.");
    console.error("Run the electron build first, then rerun this script.");
    process.exit(1);
}

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

let database;
let db;
let customerCode;
let supplierCode;

try {
    database = require(databaseModulePath);
    const { PartnerService } = require(serviceModulePath);
    const BetterSqlite3 = require("better-sqlite3");

    console.log(`[INFO] Opening database at ${dbPath}`);
    database.db = new BetterSqlite3(dbPath);
    db = database.db;

    const suffix = Date.now().toString(36).toUpperCase();
    customerCode = `CUST-VERIFY-${suffix}`;
    supplierCode = `SUP-VERIFY-${suffix}`;

    const fallbackAccount = db
        .prepare("SELECT id FROM gl_chart_of_accounts WHERE is_transactional = 1 LIMIT 1")
        .get();

    console.log("[INFO] Creating test customer via PartnerService.savePartner");
    PartnerService.savePartner({
        code: customerCode,
        name_ar: "Verify Customer",
        type: "CUSTOMER",
        is_active: 1,
        credit_limit: 5000,
        linked_account_id: fallbackAccount ? fallbackAccount.id : undefined,
    });

    const savedCustomer = db
        .prepare("SELECT id, code, type FROM business_partners WHERE code = ?")
        .get(customerCode);
    assert(savedCustomer, "Customer was not saved to business_partners.");

    console.log("[INFO] Creating test supplier via PartnerService.savePartner");
    PartnerService.savePartner({
        code: supplierCode,
        name_ar: "Verify Supplier",
        type: "SUPPLIER",
        is_active: 1,
        mobile: "0500000000",
        email: `verify-${suffix.toLowerCase()}@example.com`,
        linked_account_id: fallbackAccount ? fallbackAccount.id : undefined,
    });

    const savedSupplier = db
        .prepare("SELECT id, code, type FROM business_partners WHERE code = ?")
        .get(supplierCode);
    assert(savedSupplier, "Supplier was not saved to business_partners.");

    console.log("[INFO] Verifying PartnerService.getPartners output");
    const partners = PartnerService.getPartners();

    const customerInList = partners.find((partner) => partner.code === customerCode && partner.type === "CUSTOMER");
    const supplierInList = partners.find((partner) => partner.code === supplierCode && partner.type === "SUPPLIER");

    assert(customerInList, "getPartners() did not return the created customer.");
    assert(supplierInList, "getPartners() did not return the created supplier.");

    const customerById = PartnerService.getPartner(savedCustomer.id);
    const supplierById = PartnerService.getPartner(savedSupplier.id);
    assert(customerById?.code === customerCode, "getPartner() failed for customer.");
    assert(supplierById?.code === supplierCode, "getPartner() failed for supplier.");

    console.log("[PASS] PartnerService verification completed.");
    console.log(`       Customer code: ${customerCode}`);
    console.log(`       Supplier code: ${supplierCode}`);
} catch (error) {
    console.error("[FAIL] PartnerService verification failed.");

    if (error && error.code === "ERR_DLOPEN_FAILED") {
        console.error("better-sqlite3 is built for a different Node version.");
        console.error("Run: npm rebuild better-sqlite3");
    } else {
        console.error(error && error.stack ? error.stack : error);
    }

    process.exitCode = 1;
} finally {
    Module.prototype.require = originalRequire;

    if (db) {
        try {
            if (customerCode) {
                db.prepare("DELETE FROM business_partners WHERE code = ?").run(customerCode);
            }

            if (supplierCode) {
                db.prepare("DELETE FROM business_partners WHERE code = ?").run(supplierCode);
            }
        } catch (cleanupError) {
            console.error("[WARN] Cleanup issue:", cleanupError.message || cleanupError);
        }

        try {
            db.close();
        } catch {
            // noop
        }
    }
}
