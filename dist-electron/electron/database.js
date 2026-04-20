"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCOA = exports.initDB = exports.db = void 0;
exports.seedSystem = seedSystem;
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const Database = require('better-sqlite3');
const initDB = (dbPath) => {
    // Initialize Database
    exports.db = new Database(dbPath);
    // Operational policy for SQLite runtime.
    try {
        exports.db.pragma('journal_mode = WAL');
        exports.db.pragma('synchronous = NORMAL');
        exports.db.pragma('busy_timeout = 5000');
    }
    catch (e) {
        console.warn('[DB] PRAGMA policy setup warning:', e);
    }
    // *** CRITICAL: Keep FK checks OFF during the entire schema loading & migration ***
    // schema_v1_foundation.sql has "PRAGMA foreign_keys = ON" which would cause
    // FK constraint failures when dropping/recreating tables during init.
    // FKs are re-enabled at the end of initDB by the self-repair block's finally clause.
    exports.db.exec("PRAGMA foreign_keys = OFF;");
    // Version 10: Fixed Assets
    // Read and Execute Schema from File
    const schemaPath = path_1.default.join(__dirname, '../database/schema_v1_foundation.sql');
    // Check if we are in production (bundled) or dev
    const possiblePaths = [
        path_1.default.join(process.resourcesPath, 'database/schema_v1_foundation.sql'), // Prod
        path_1.default.join(__dirname, '../../database/schema_v1_foundation.sql'), // Dev (dist-electron/../../database)
        path_1.default.join(__dirname, '../database/schema_v1_foundation.sql'),
        path_1.default.resolve('database/schema_v1_foundation.sql') // Dev from root
    ];
    let resolvedSchemaPath = '';
    for (const p of possiblePaths) {
        // console.log('Checking schema path:', p);
        try {
            if (require('fs').existsSync(p)) {
                resolvedSchemaPath = p;
                break;
            }
        }
        catch (e) {
            // ignore
        }
    }
    if (resolvedSchemaPath) {
        console.log(`[DB] Loading schema from: ${resolvedSchemaPath}`);
        const schemaSql = require('fs').readFileSync(resolvedSchemaPath, 'utf8');
        exports.db.exec(schemaSql);
    }
    // 2. Execute Schema V2 (Inventory & Partners)
    const schemaPathV2 = path_1.default.join(__dirname, '../database/schema_v2_inventory_partners.sql');
    const schemaPathV3 = path_1.default.join(__dirname, '../database/schema_v3_financials.sql');
    const loadSchema = (schemaPath, name) => {
        const possiblePaths = [
            path_1.default.join(process.resourcesPath, schemaPath),
            path_1.default.join(__dirname, '../../' + schemaPath),
            path_1.default.join(__dirname, '../' + schemaPath),
            path_1.default.resolve(schemaPath)
        ];
        let resolved = '';
        for (const p of possiblePaths) {
            try {
                if (require('fs').existsSync(p)) {
                    resolved = p;
                    break;
                }
            }
            catch (e) { }
        }
        if (resolved) {
            console.log(`[DB] Loading ${name} from: ${resolved}`);
            const sql = require('fs').readFileSync(resolved, 'utf8');
            // Trigger bodies contain semicolons, so they require boundary-aware parsing.
            if (/CREATE\s+TRIGGER/i.test(sql)) {
                const triggerAwareStatements = [];
                const lines = sql.split(/\r?\n/);
                let current = '';
                let inTrigger = false;
                let triggerCaseDepth = 0;
                for (const line of lines) {
                    const trimmedUpper = line.trim().toUpperCase();
                    if (!inTrigger && /^\s*CREATE\s+(?:TEMP\s+)?TRIGGER\b/i.test(line)) {
                        inTrigger = true;
                        triggerCaseDepth = 0;
                    }
                    current += line + '\n';
                    if (inTrigger) {
                        const sqlPart = line.split('--')[0];
                        const caseMatches = sqlPart.match(/\bCASE\b/gi);
                        if (caseMatches)
                            triggerCaseDepth += caseMatches.length;
                        if (/^\s*END\s*;\s*$/i.test(line)) {
                            if (triggerCaseDepth > 0) {
                                triggerCaseDepth--;
                            }
                            else {
                                triggerAwareStatements.push(current);
                                current = '';
                                inTrigger = false;
                            }
                        }
                    }
                    else if (trimmedUpper.endsWith(';')) {
                        triggerAwareStatements.push(current);
                        current = '';
                    }
                }
                if (current.trim().length > 0) {
                    triggerAwareStatements.push(current);
                }
                for (let idx = 0; idx < triggerAwareStatements.length; idx++) {
                    const stmt = triggerAwareStatements[idx];
                    const sqlStmt = stmt.trim();
                    if (!sqlStmt)
                        continue;
                    try {
                        exports.db.exec(sqlStmt);
                    }
                    catch (err) {
                        if (err.message?.includes('duplicate column name')) {
                            console.warn(`[DB] Skipped duplicate column in ${name}: ${err.message}`);
                            continue;
                        }
                        if (err.message?.includes('already exists')) {
                            console.warn(`[DB] Skipped existing object in ${name}: ${err.message}`);
                            continue;
                        }
                        const compactStmt = sqlStmt.replace(/\s+/g, ' ').slice(0, 240);
                        console.error(`[DB] Failed trigger-aware statement in ${name} [#${idx + 1}]:`, err.message, '| SQL:', compactStmt);
                        throw err;
                    }
                }
                return;
            }
            // Split statements to handle errors individually (e.g. for ALTER TABLE)
            const statements = sql.split(';').filter((s) => s.trim().length > 0);
            // Special Transaction wrapper not strictly needed if we want to allow partial success on ALTERs
            // but usually schemas are transaction-safe. 
            // However, for ALTER ADD COLUMN, we specifically want to Ignore if column exists.
            const runSchema = exports.db.transaction(() => {
                for (const stmt of statements) {
                    try {
                        exports.db.prepare(stmt).run();
                    }
                    catch (err) {
                        // Check for "duplicate column name" error (SQLite code or message)
                        if (err.message.includes('duplicate column name')) {
                            console.warn(`[DB] Skipped duplicate column in ${name}: ${err.message}`);
                        }
                        else if (err.message.includes('no such table')) {
                            // Sometimes DROP TABLE IF EXISTS fails if trigger exists, etc. 
                            // OR maybe we are altering a table that doesn't exist yet (bad order).
                            console.warn(`[DB] Warning in ${name}: ${err.message}`);
                            // We might re-throw if critical, but for now we log.
                            throw err;
                        }
                        else if (err.message.includes('no statements')) {
                            // Ignore empty statements (e.g. comments between semicolons)
                        }
                        else {
                            throw err;
                        }
                    }
                }
            });
            try {
                runSchema();
            }
            catch (err) {
                console.error(`[DB] Failed to load ${name}:`, err.message);
                // Don't crash the entire app if one schema fails, unless specific logic needs it.
                // But usually schema failure is bad. 
                // However, thanks to the inner try/catch on statements, we handled "duplicate column".
                // Real errors will still throw here.
            }
        }
        else {
            console.warn(`[DB] WARNING: ${name} file not found.`);
        }
    };
    loadSchema('database/schema_v2_inventory_partners.sql', 'Schema V2');
    // ==========================================
    // CORE TABLES (Accounts, Transactions)
    // Must be created BEFORE schemas that reference them
    // ==========================================
    // 1. Accounts Table (Refactored for UUID & Decimal Text)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY, -- UUID
      code TEXT UNIQUE,
      name TEXT,
      type TEXT, -- Asset, Liability, Equity, Revenue, Expense
      balance TEXT DEFAULT '0', -- Stored as String for Decimal Precision
      currency TEXT DEFAULT 'ILS',
      parent_id TEXT, -- UUID linkage
      account_level INTEGER DEFAULT 1,
      is_transactional INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY(parent_id) REFERENCES accounts(id)
    );
  `);
    // Indexes
    exports.db.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);`);
    exports.db.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);`);
    // Compatibility guard: legacy migrations (v53/v55) use is_group in COALESCE logic.
    // Ensure the column exists before those schemas run to avoid startup failure.
    try {
        const accountCols = exports.db.prepare("PRAGMA table_info(accounts)").all();
        if (!accountCols.some((c) => c.name === 'is_group')) {
            exports.db.prepare("ALTER TABLE accounts ADD COLUMN is_group INTEGER DEFAULT 0").run();
            console.log("[DB] Added missing accounts.is_group compatibility column.");
        }
    }
    catch (e) {
        console.error("[DB] Failed to ensure accounts.is_group compatibility column", e);
    }
    // 2. Transactions Header
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, -- UUID
      voucher_no TEXT UNIQUE, -- Human Readable (JV-2026-0001)
      type TEXT, -- JV, RV, PV, INV...
      date TEXT,
      description TEXT,
      currency TEXT DEFAULT 'ILS',
      exchange_rate TEXT DEFAULT '1', -- Decimal String
      status TEXT DEFAULT 'Posted',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // 3. Transaction Lines
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_lines (
      id TEXT PRIMARY KEY, -- UUID
      transaction_id TEXT,
      account_id TEXT,
      debit TEXT DEFAULT '0', -- Decimal String
      credit TEXT DEFAULT '0', -- Decimal String
      description TEXT,
      cost_center TEXT,
      reference_no TEXT,
      bank_account_id TEXT, -- For specific bank tracking (Transfers)
      FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
  `);
    // Force refresh of V3 Schema to fix FK and add Currencies
    exports.db.exec('DROP TABLE IF EXISTS journal_entry_lines; DROP TABLE IF EXISTS journal_entries; DROP TABLE IF EXISTS gl_journal_lines; DROP TABLE IF EXISTS gl_journal_headers;');
    // Load Schemas
    const schemas = [
        'schema_v1_foundation.sql', // Keeping original v1 as foundation
        'schema_v2_inventory_partners.sql',
        'schema_v3_financials.sql',
        'schema_v4_sales.sql',
        'schema_v5_purchasing.sql',
        'schema_v6_treasury.sql',
        'schema_v7_views.sql',
        'schema_v8_manufacturing.sql',
        'schema_v9_hr.sql', // Keeping original v9
        'schema_v10_sales_cycle.sql',
        'schema_v11_budgets.sql',
        'schema_v12_assets.sql',
        'schema_v13_currency_rates.sql',
        'schema_v18_inventory_master.sql', // Added from instruction
        'schema_v21_inventory_enhancements.sql', // Added from instruction
        'schema_v22_purchase_cycle_expansion.sql', // Added from instruction
        'schema_v27_purchase_rfq.sql',
        'schema_v41_fix_auth.sql'
    ];
    loadSchema('database/schema_v3_financials.sql', 'Schema V3');
    loadSchema('database/schema_v4_sales.sql', 'Schema V4 (Sales)');
    loadSchema('database/schema_v5_purchasing.sql', 'Schema V5 (Purchasing)');
    loadSchema('database/schema_v6_treasury.sql', 'Schema V6 (Treasury)');
    loadSchema('database/schema_v7_views.sql', 'Schema V7 (Reports Views)');
    loadSchema('database/schema_v8_manufacturing.sql', 'Schema V8 (Manufacturing)');
    loadSchema('database/schema_v41_fix_auth.sql', 'Schema V41 (Auth Fix)');
    // HR Schema V14 (Supersedes V9)
    // Drop old partial tables if they exist to prevent conflicts (Soft Migration)
    // We assume v14 handles content creation.
    try {
        // Disable foreign keys for the entire schema loading & migration process
        // They will be re-enabled by the SELF-REPAIR block's finally clause at the end
        exports.db.exec("PRAGMA foreign_keys=OFF;");
        exports.db.exec("DROP TABLE IF EXISTS hr_attendance; DROP TABLE IF EXISTS hr_loans;");
        exports.db.exec("DROP TABLE IF EXISTS hr_employees; DROP TABLE IF EXISTS hr_salary_slips;");
    }
    catch (e) {
        console.error("Error cleaning old HR tables", e);
    }
    loadSchema('database/schema_v14_hr_unified.sql', 'Schema V14 (Unified HR & Payroll)');
    loadSchema('database/schema_v10_sales_cycle.sql', 'Schema V10 (Sales Quotations & Orders)');
    loadSchema('database/schema_v11_budgets.sql', 'Schema V11 (Budgets)');
    loadSchema('database/schema_v12_assets.sql', 'Schema V12 (Assets)');
    loadSchema('database/schema_v13_currency_rates.sql', 'Schema V13 (Currency Rates)');
    loadSchema('database/schema_v16_currency_history.sql', 'Schema V16 (Currency History)');
    loadSchema('database/schema_v17_master_data.sql', 'Schema V17 (Master Data)');
    loadSchema('database/schema_v18_inventory_master.sql', 'Schema V18 (Inventory Master)');
    loadSchema('database/schema_v19_partners_master.sql', 'Partners Master V19');
    loadSchema('database/schema_v20_financial_definitions.sql', 'Financial Definitions V20');
    loadSchema('database/schema_v21_inventory_enhancements.sql', 'Inventory Enhancements V21');
    loadSchema('database/schema_v22_purchase_cycle_expansion.sql', 'Purchase Cycle V22');
    loadSchema('database/schema_v23_purchase_returns.sql', 'Loading Purchase Returns V23');
    loadSchema('database/schema_v24_sales_updates.sql', 'Loading Sales Updates V24');
    loadSchema('database/schema_v25_hr_updates.sql', 'Loading HR Updates V25');
    loadSchema('database/schema_v26_inventory_full.sql', 'Inventory Full V26');
    loadSchema('database/schema_v27_purchase_rfq.sql', 'Purchase RFQ V27');
    loadSchema('database/schema_v15_payroll_updates.sql', 'Payroll Updates V15');
    loadSchema('database/schema_v32_fix_taxes.sql', 'Fix Taxes V32');
    loadSchema('database/schema_v33_critical_fixes.sql', 'Critical Fixes V33');
    loadSchema('database/schema_v34_item_fields.sql', 'Item Fields V34');
    loadSchema('database/schema_v35_fix_missing_tables.sql', 'Fix Missing Tables V35');
    loadSchema('database/schema_v36_fix_mfg_schema.sql', 'Fix MFG Schema V36');
    loadSchema('database/schema_v37_taxes_update.sql', 'Taxes Update V37');
    loadSchema('database/schema_v38_analysis_codes.sql', 'Analysis Codes V38');
    loadSchema('database/schema_v39_stock_documents.sql', 'Stock Documents V39');
    loadSchema('database/schema_v42_partner_profile_expansion.sql', 'Partners Profile V42');
    loadSchema('database/seed_banks_custom.sql', 'Seeding Custom Bank Accounts');
    loadSchema('database/schema_v43_dispatch.sql', 'Dispatch V43');
    loadSchema('database/schema_v44_order_to_invoice_cycle.sql', 'Order to Invoice Cycle V44');
    loadSchema('database/schema_v45_treasury_updates.sql', 'Treasury Schema V45');
    loadSchema('database/schema_v53_accounting_foundation.sql', 'Accounting Foundation V53');
    loadSchema('database/schema_v54_account_resolution_engine.sql', 'Account Resolution Engine V54');
    loadSchema('database/schema_v55_chart_of_accounts_fixed_width.sql', 'Chart of Accounts Fixed Width V55');
    loadSchema('database/schema_v56_financial_definitions_resolution.sql', 'Financial Definitions + Resolution V56');
    loadSchema('database/schema_v57_expense_dimensions.sql', 'Expense Dimensions V57');
    loadSchema('database/schema_v58_journal_engine.sql', 'Journal Engine V58');
    loadSchema('electron/database/schema_v60_treasury_foundation.sql', 'Treasury Foundation V60');
    loadSchema('electron/database/schema_v61_sales_operations_foundation.sql', 'Sales Operations Foundation V61');
    loadSchema('electron/database/schema_v62_purchase_operations_foundation.sql', 'Purchase Operations Foundation V62');
    loadSchema('electron/database/schema_v63_manufacturing_foundation.sql', 'Manufacturing Foundation V63');
    loadSchema('electron/database/schema_v64_crm_receivables_foundation.sql', 'CRM + Receivables Foundation V64');
    loadSchema('electron/database/schema_v65_vendor_payables_foundation.sql', 'Vendor + Payables Foundation V65');
    loadSchema('electron/database/schema_v66_accounting_engine_foundation.sql', 'Accounting Engine Foundation V66');
    // Approvals + Permissions Engine migrations are maintained under electron/database.
    // Keep legacy lookup first for compatibility with older branches, then canonical electron path.
    loadSchema('database/schema_v46_approvals.sql', 'Approvals Workflow V46 (legacy path)');
    loadSchema('database/schema_v47_approval_inbox.sql', 'Approvals Inbox V47 (legacy path)');
    loadSchema('electron/database/schema_v46_approvals.sql', 'Approvals Workflow V46');
    loadSchema('electron/database/schema_v47_approval_inbox.sql', 'Approvals Inbox V47');
    loadSchema('electron/database/schema_v48_permissions_engine.sql', 'Permissions Engine V48');
    loadSchema('electron/database/schema_v49_screen_views.sql', 'Screen Views V49');
    loadSchema('electron/database/schema_v50_audit_engine.sql', 'Audit Engine V50');
    loadSchema('electron/database/schema_v51_sales_invoice_hardening.sql', 'Sales Invoice Hardening V51');
    loadSchema('electron/database/schema_v52_document_contract_hardening.sql', 'Document Contract Hardening V52');
    loadSchema('electron/database/schema_v59_inventory_documents.sql', 'Inventory Documents V59');
    // MIGRATION: Add system_type to gl_chart_of_accounts (Account Linking Logic)
    try {
        const coaCols = exports.db.prepare("PRAGMA table_info(gl_chart_of_accounts)").all();
        if (!coaCols.some((col) => col.name === 'system_type')) {
            exports.db.prepare("ALTER TABLE gl_chart_of_accounts ADD COLUMN system_type TEXT").run();
            console.log("[DB] Added 'system_type' to gl_chart_of_accounts");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate gl_chart_of_accounts (system_type)", e);
    }
    // MIGRATION: Add reconciled to journal_entry_lines (Bank Reconciliation)
    try {
        const jelCols = exports.db.prepare("PRAGMA table_info(journal_entry_lines)").all();
        if (!jelCols.some((col) => col.name === 'reconciled')) {
            exports.db.prepare("ALTER TABLE journal_entry_lines ADD COLUMN reconciled INTEGER DEFAULT 0").run();
            console.log("[DB] Added 'reconciled' to journal_entry_lines");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate journal_entry_lines (reconciled)", e);
    }
    // MIGRATION: Add invoice tracking to dispatch_header
    try {
        const dispatchCols = exports.db.prepare("PRAGMA table_info(dispatch_header)").all();
        if (dispatchCols.length > 0) {
            if (!dispatchCols.some((col) => col.name === 'invoice_id'))
                exports.db.prepare("ALTER TABLE dispatch_header ADD COLUMN invoice_id TEXT").run();
            if (!dispatchCols.some((col) => col.name === 'posted_at'))
                exports.db.prepare("ALTER TABLE dispatch_header ADD COLUMN posted_at TEXT").run();
            if (!dispatchCols.some((col) => col.name === 'invoiced_at'))
                exports.db.prepare("ALTER TABLE dispatch_header ADD COLUMN invoiced_at TEXT").run();
            console.log("[DB] Verified dispatch_header schema (added invoice fields).");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate dispatch_header (invoice tracking)", e);
    }
    // SEED: Default Parent Accounts for Partners (Auto-GL)
    try {
        const settingsRows = exports.db.prepare(`
      SELECT key, value FROM settings
      WHERE key IN ('default_customer_parent', 'default_supplier_parent', 'default_employee_parent', 'default_partner_parent')
    `).all();
        const settingsMap = new Map();
        settingsRows.forEach((row) => settingsMap.set(row.key, row.value));
        const insertSetting = exports.db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
        if (!settingsMap.get('default_customer_parent')) {
            const receivables = exports.db.prepare("SELECT id FROM gl_chart_of_accounts WHERE (name_ar LIKE '%ذمم%' OR name_en LIKE '%Receivable%') AND account_level < 4 LIMIT 1").get();
            if (receivables)
                insertSetting.run('default_customer_parent', receivables.id);
        }
        if (!settingsMap.get('default_supplier_parent')) {
            const payables = exports.db.prepare("SELECT id FROM gl_chart_of_accounts WHERE (name_ar LIKE '%مورد%' OR name_en LIKE '%Payable%') AND account_level < 4 LIMIT 1").get();
            if (payables)
                insertSetting.run('default_supplier_parent', payables.id);
        }
        if (!settingsMap.get('default_employee_parent')) {
            const employees = exports.db.prepare("SELECT id FROM gl_chart_of_accounts WHERE (name_ar LIKE '%ذمم موظفين%' OR name_en LIKE '%Employee%') AND account_level < 4 LIMIT 1").get();
            if (employees)
                insertSetting.run('default_employee_parent', employees.id);
        }
        if (!settingsMap.get('default_partner_parent')) {
            const partners = exports.db.prepare("SELECT id FROM gl_chart_of_accounts WHERE (name_ar LIKE '%شركاء%' OR name_en LIKE '%Partner%') AND account_level < 4 LIMIT 1").get();
            if (partners)
                insertSetting.run('default_partner_parent', partners.id);
        }
    }
    catch (e) {
        console.error("[DB] Failed to seed default parent accounts", e);
    }
    // 4. Inventory Module
    // Warehouses
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);
    // --- AUTO-MIGRATION: Fix Branches Table (Schema V1 Update) ---
    try {
        // Check if name_ar exists
        exports.db.prepare("SELECT name_ar FROM branches LIMIT 1").get();
    }
    catch (e) {
        if (e.message.includes('no such column')) {
            console.log("[DB] Migrating 'branches' table to support name_ar...");
            try {
                const branches = exports.db.prepare("SELECT * FROM branches").all();
                // Drop and Recreate is risky if we lose data, but for this specific error "no such column name_ar", we are upgrading structure.
                // Safer way: Add columns.
                exports.db.exec("ALTER TABLE branches ADD COLUMN name_ar TEXT");
                exports.db.exec("ALTER TABLE branches ADD COLUMN name_en TEXT");
                exports.db.exec("ALTER TABLE branches ADD COLUMN type TEXT DEFAULT 'BRANCH'");
                exports.db.exec("ALTER TABLE branches ADD COLUMN is_active INTEGER DEFAULT 1");
                exports.db.exec("ALTER TABLE branches ADD COLUMN sync_status INTEGER DEFAULT 0");
                // Migrate 'name' -> 'name_ar'
                exports.db.prepare("UPDATE branches SET name_ar = name").run();
            }
            catch (migErr) {
                console.error("Migration failed:", migErr);
            }
        }
    }
    // Units (UOM)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT,
      is_base INTEGER DEFAULT 0
    );
  `);
    // --- AUTO-MIGRATION: Extend Units Definition Fields ---
    try {
        const unitCols = exports.db.prepare("PRAGMA table_info('units')").all();
        const has = (col) => unitCols.some((c) => c.name === col);
        if (!has('name_ar'))
            exports.db.exec("ALTER TABLE units ADD COLUMN name_ar TEXT");
        if (!has('name_en'))
            exports.db.exec("ALTER TABLE units ADD COLUMN name_en TEXT");
        if (!has('name_he'))
            exports.db.exec("ALTER TABLE units ADD COLUMN name_he TEXT");
        if (!has('code'))
            exports.db.exec("ALTER TABLE units ADD COLUMN code TEXT");
        if (!has('is_active'))
            exports.db.exec("ALTER TABLE units ADD COLUMN is_active INTEGER DEFAULT 1");
        if (!has('is_used'))
            exports.db.exec("ALTER TABLE units ADD COLUMN is_used INTEGER DEFAULT 0");
        if (!has('unit_type'))
            exports.db.exec("ALTER TABLE units ADD COLUMN unit_type TEXT DEFAULT 'كمية'");
        if (!has('parent_unit_id'))
            exports.db.exec("ALTER TABLE units ADD COLUMN parent_unit_id TEXT");
        if (!has('level_no'))
            exports.db.exec("ALTER TABLE units ADD COLUMN level_no INTEGER DEFAULT 1");
        if (!has('symbol_ar'))
            exports.db.exec("ALTER TABLE units ADD COLUMN symbol_ar TEXT");
        if (!has('symbol_en'))
            exports.db.exec("ALTER TABLE units ADD COLUMN symbol_en TEXT");
        if (!has('symbol_he'))
            exports.db.exec("ALTER TABLE units ADD COLUMN symbol_he TEXT");
        if (!has('multiplier'))
            exports.db.exec("ALTER TABLE units ADD COLUMN multiplier REAL DEFAULT 1");
        if (!has('total_factor'))
            exports.db.exec("ALTER TABLE units ADD COLUMN total_factor REAL DEFAULT 1");
        if (!has('updated_at'))
            exports.db.exec("ALTER TABLE units ADD COLUMN updated_at TEXT");
        exports.db.exec("UPDATE units SET name_ar = COALESCE(name_ar, name), code = COALESCE(code, symbol), is_active = COALESCE(is_active, 1), level_no = COALESCE(level_no, 1), multiplier = COALESCE(multiplier, 1), total_factor = COALESCE(total_factor, 1)");
    }
    catch (unitMigErr) {
        console.error('[DB] Units migration failed:', unitMigErr);
    }
    // Items (Master)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      category_id TEXT,
      type TEXT DEFAULT 'Goods', -- Goods, Service, RawMaterial
      
      base_unit_id TEXT,
      
      cost_price TEXT DEFAULT '0',
      sale_price TEXT DEFAULT '0',
      min_price TEXT DEFAULT '0',
      
      min_stock REAL DEFAULT 0,
      max_stock REAL DEFAULT 0,
      reorder_point REAL DEFAULT 0,
      
      is_active INTEGER DEFAULT 1,
      tax_included INTEGER DEFAULT 0,
      
      description TEXT,
      image_url TEXT,
      
      FOREIGN KEY(base_unit_id) REFERENCES units(id)
    );
  `);
    // Item Units (Conversion Factors)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS item_units (
      id TEXT PRIMARY KEY,
      item_id TEXT,
      unit_id TEXT,
      factor REAL DEFAULT 1, -- e.g. 12 for Dozen
      barcode TEXT,
      sale_price TEXT DEFAULT '0', -- Specific price for this unit
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY(unit_id) REFERENCES units(id)
    );
  `);
    // Stock Balances (Item + Warehouse)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS stock_balances(
  item_id TEXT,
  warehouse_id TEXT,
  quantity REAL DEFAULT 0,
  avg_cost TEXT DEFAULT '0',
  bin_location TEXT,
  PRIMARY KEY(item_id, warehouse_id),
  FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY(warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);
`);
    // Inventory Transactions (Audit Trail)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_transactions(
  id TEXT PRIMARY KEY,
  date TEXT,
  type TEXT, --IN, OUT, TRANSFER, ADJ
      ref_no TEXT,
  item_id TEXT,
  warehouse_id TEXT,
  quantity REAL,
  cost_price TEXT DEFAULT '0',
  description TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(item_id) REFERENCES items(id),
  FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
);
`);
    // Stock Taking (Physical Count)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS stock_takes (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT,
      date TEXT,
      description TEXT,
      status TEXT DEFAULT 'Open', -- Open, Posted, Cancelled
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
    );
  `);
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS stock_take_items (
      id TEXT PRIMARY KEY,
      stock_take_id TEXT,
      item_id TEXT,
      system_quantity REAL DEFAULT 0, -- Snapshot at time of creation
      counted_quantity REAL DEFAULT 0,
      difference REAL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(stock_take_id) REFERENCES stock_takes(id) ON DELETE CASCADE,
      FOREIGN KEY(item_id) REFERENCES items(id)
    );
  `);
    // Checks (Shikat)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS checks(
  id TEXT PRIMARY KEY,
  check_number TEXT,
  bank_name TEXT,
  amount TEXT,
  currency TEXT DEFAULT 'ILS',
  due_date TEXT,
  status TEXT DEFAULT 'Holding', --Holding, Deposited, Collected, Bounced, Refunded
      type TEXT DEFAULT 'IN', --IN(Portfolio), OUT(Issued)
      
      --Relationships
      customer_id TEXT, --Received from
      supplier_id TEXT, --Issued to
      
      --Tracking
      current_location_id TEXT, --Account ID where the check currently sits(Box, Bank, etc.)
      
      notes TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(customer_id) REFERENCES accounts(id),
  FOREIGN KEY(supplier_id) REFERENCES accounts(id)
);
`);
    // 4.1 Bank Accounts (Detailed)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      bank_id TEXT, -- Link to banks table
      bank_name TEXT, -- Legacy / Fallback
      account_name TEXT,
      account_number TEXT,
      currency TEXT DEFAULT 'ILS',
      branch TEXT,
      iban TEXT,
      swift TEXT,
      gl_account_id TEXT, -- Link to 1110 children
      is_active INTEGER DEFAULT 1,
      use_checkbook INTEGER DEFAULT 1,
      auto_reconcile INTEGER DEFAULT 0,
      
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(gl_account_id) REFERENCES accounts(id),
      FOREIGN KEY(bank_id) REFERENCES banks(id)
    );
  `);
    // MIGRATION: Add bank_id to bank_accounts
    try {
        const baCols = exports.db.prepare("PRAGMA table_info(bank_accounts)").all();
        if (baCols.length > 0) {
            if (!baCols.some((c) => c.name === 'bank_id'))
                exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN bank_id TEXT").run();
            if (!baCols.some((c) => c.name === 'bank_name'))
                exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN bank_name TEXT").run();
            if (!baCols.some((c) => c.name === 'account_name'))
                exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN account_name TEXT").run();
            if (!baCols.some((c) => c.name === 'branch'))
                exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN branch TEXT").run();
            if (!baCols.some((c) => c.name === 'iban'))
                exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN iban TEXT").run();
            if (!baCols.some((c) => c.name === 'currency'))
                exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN currency TEXT DEFAULT 'ILS'").run();
            if (!baCols.some((c) => c.name === 'code'))
                exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN code TEXT").run();
            if (!baCols.some((c) => c.name === 'is_active'))
                exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN is_active INTEGER DEFAULT 1").run();
            console.log("[DB] Verified bank_accounts schema (added missing columns).");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate bank_accounts", e);
    }
    // 4.2 Cash Boxes
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS cash_boxes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      currency_id TEXT,
      currency_code TEXT NOT NULL DEFAULT 'NIS',
      gl_account_id TEXT NOT NULL,
      note TEXT,
      is_active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(currency_id) REFERENCES currencies(id),
      FOREIGN KEY(gl_account_id) REFERENCES accounts(id)
    );
  `);
    exports.db.exec(`CREATE INDEX IF NOT EXISTS idx_cash_boxes_code ON cash_boxes(code);`);
    exports.db.exec(`CREATE INDEX IF NOT EXISTS idx_cash_boxes_currency ON cash_boxes(currency_code);`);
    exports.db.exec(`CREATE INDEX IF NOT EXISTS idx_cash_boxes_account ON cash_boxes(gl_account_id);`);
    try {
        const cbCols = exports.db.prepare("PRAGMA table_info(cash_boxes)").all();
        if (cbCols.length > 0) {
            if (!cbCols.some((c) => c.name === 'code'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN code TEXT").run();
            if (!cbCols.some((c) => c.name === 'name_ar'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN name_ar TEXT").run();
            if (!cbCols.some((c) => c.name === 'name_en'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN name_en TEXT").run();
            if (!cbCols.some((c) => c.name === 'currency_id'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN currency_id TEXT").run();
            if (!cbCols.some((c) => c.name === 'currency_code'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN currency_code TEXT DEFAULT 'NIS'").run();
            if (!cbCols.some((c) => c.name === 'gl_account_id'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN gl_account_id TEXT").run();
            if (!cbCols.some((c) => c.name === 'note'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN note TEXT").run();
            if (!cbCols.some((c) => c.name === 'is_active'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN is_active INTEGER DEFAULT 1").run();
            if (!cbCols.some((c) => c.name === 'created_by'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN created_by TEXT").run();
            if (!cbCols.some((c) => c.name === 'created_at'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN created_at DATETIME").run();
            if (!cbCols.some((c) => c.name === 'updated_at'))
                exports.db.prepare("ALTER TABLE cash_boxes ADD COLUMN updated_at DATETIME").run();
            console.log("[DB] Verified cash_boxes schema.");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate cash_boxes", e);
    }
    // MIGRATION: Add extra fields to banks table (for Import)
    try {
        const bankCols = exports.db.prepare("PRAGMA table_info(banks)").all();
        if (bankCols.length > 0) {
            if (!bankCols.some((c) => c.name === 'bank_code'))
                exports.db.prepare("ALTER TABLE banks ADD COLUMN bank_code TEXT").run();
            if (!bankCols.some((c) => c.name === 'branch_code'))
                exports.db.prepare("ALTER TABLE banks ADD COLUMN branch_code TEXT").run();
            if (!bankCols.some((c) => c.name === 'name_he'))
                exports.db.prepare("ALTER TABLE banks ADD COLUMN name_he TEXT").run();
            if (!bankCols.some((c) => c.name === 'routing_no'))
                exports.db.prepare("ALTER TABLE banks ADD COLUMN routing_no TEXT").run();
            if (!bankCols.some((c) => c.name === 'address'))
                exports.db.prepare("ALTER TABLE banks ADD COLUMN address TEXT").run();
            console.log("[DB] Verified banks schema.");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate banks", e);
    }
    // HR & Payroll Tables
    // Employees
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS employees(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  basic_salary TEXT DEFAULT '0',
  join_date TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'Active', --Active, Terminated
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);
    // Attendance
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS attendance(
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  date TEXT,
  status TEXT, --Present, Absent, Sick Leave, Annual Leave
      check_in TEXT, --HH: MM
      check_out TEXT, --HH: MM
      overtime_hours REAL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY(employee_id) REFERENCES employees(id)
);
`);
    // Payroll Runs (Monthly Header)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS payroll_runs(
  id TEXT PRIMARY KEY,
  month INTEGER,
  year INTEGER,
  status TEXT DEFAULT 'Draft', --Draft, Posted
      total_amount TEXT DEFAULT '0',
  transaction_id TEXT, --Link to Journal Entry
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);
`);
    // Payslips (Details per employee)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS payslips(
  id TEXT PRIMARY KEY,
  run_id TEXT,
  employee_id TEXT,
  basic_salary TEXT,
  housing_allowance TEXT DEFAULT '0',
  transport_allowance TEXT DEFAULT '0',
  overtime_amount TEXT DEFAULT '0',
  deductions TEXT DEFAULT '0',
  net_salary TEXT,
  FOREIGN KEY(run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES employees(id)
);
`);
    // 6. System Administration
    // Branches
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      is_main INTEGER DEFAULT 0
    );
  `);
    // Roles
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );
  `);
    // Permissions (Role-based)
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT,
      permission_key TEXT, -- e.g. "sales.create", "gl.post"
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `);
    // Users
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role_id TEXT,
      branch_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(role_id) REFERENCES roles(id),
      FOREIGN KEY(branch_id) REFERENCES branches(id)
    );
  `);
    // Audit Logs
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT, -- LOGIN, CREATE, UPDATE, DELETE, POST
      table_name TEXT,
      record_id TEXT,
      old_value TEXT, -- JSON
      new_value TEXT, -- JSON
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Settings
    exports.db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Seed Palestinian Data
    const { seedPalestinianData } = require('./seed_palestine');
    seedPalestinianData(exports.db);
    seedCurrencies(exports.db);
    const { seedRoles } = require('./seed_roles');
    seedRoles(exports.db);
    seedSystem();
    seedAssetCategories(exports.db);
    seedExtensions(exports.db);
    // SELF-REPAIR: Remove invalid units causing React Key Validation Errors
    try {
        exports.db.prepare("DELETE FROM units WHERE id IS NULL OR id = '' OR id = 'undefined'").run();
        console.log("[DB] Cleaned up invalid units.");
    }
    catch (e) {
        console.error("[DB] Cleanup failed", e);
    }
    // SELF-REPAIR: Fix broken FK references by recreating affected tables safely.
    // We cannot use PRAGMA writable_schema=ON because better-sqlite3 runs with DBCONFIG_DEFENSIVE enabled.
    try {
        console.log("[DB REPAIR] Checking for phantom FK references in tables...");
        // Find tables that have broken schemas
        const brokenTables = exports.db.prepare(`SELECT name, sql FROM sqlite_master 
       WHERE type = 'table' AND (
          sql LIKE '%business_partners_backup_fix_fk%' 
       OR sql LIKE '%treasury_vouchers_old_bad%'
       )`).all();
        if (brokenTables.length > 0) {
            console.log(`[DB REPAIR] Found ${brokenTables.length} tables with broken FK references. Repairing...`);
            // 1. Foreign keys must be OFF during schema patching
            exports.db.exec("PRAGMA foreign_keys = OFF");
            // Transaction to safely update and verify
            exports.db.transaction(() => {
                for (const tbl of brokenTables) {
                    console.log(`[DB REPAIR] Repairing table: ${tbl.name}`);
                    // Determine fixed SQL
                    let fixedSql = tbl.sql
                        .replace(/"business_partners_backup_fix_fk"/g, 'business_partners')
                        .replace(/business_partners_backup_fix_fk/g, 'business_partners')
                        .replace(/"treasury_vouchers_old_bad"/g, 'treasury_vouchers')
                        .replace(/treasury_vouchers_old_bad/g, 'treasury_vouchers');
                    // Capture associated indexes & triggers BEFORE renaming
                    const indexes = exports.db.prepare(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name = ? AND sql IS NOT NULL`).all(tbl.name);
                    const triggers = exports.db.prepare(`SELECT sql FROM sqlite_master WHERE type='trigger' AND tbl_name = ? AND sql IS NOT NULL`).all(tbl.name);
                    const badName = tbl.name + '_bad_fk';
                    // Ensure temp name is clear
                    exports.db.exec(`DROP TABLE IF EXISTS "${badName}"`);
                    // Rename broken table
                    exports.db.exec(`ALTER TABLE "${tbl.name}" RENAME TO "${badName}"`);
                    // Recreate fixed table using captured original SQL with fixes
                    exports.db.exec(fixedSql);
                    // Copy data over
                    const cols = exports.db.prepare(`PRAGMA table_info("${tbl.name}")`).all();
                    const colNames = cols.map(c => `"${c.name}"`).join(', ');
                    if (colNames.length > 0) {
                        exports.db.exec(`INSERT INTO "${tbl.name}" (${colNames}) SELECT ${colNames} FROM "${badName}"`);
                    }
                    // Drop the broken backup
                    exports.db.exec(`DROP TABLE "${badName}"`);
                    // Restore Indexes
                    for (const idx of indexes) {
                        exports.db.exec(idx.sql);
                    }
                    // Restore Triggers
                    for (const trig of triggers) {
                        exports.db.exec(trig.sql);
                    }
                }
            })();
            // Perform integrity check and FK check
            const integrity = exports.db.prepare("PRAGMA integrity_check").get();
            console.log("[DB REPAIR] Integrity check result:", integrity ? integrity.integrity_check : 'unknown');
            const fkCheck = exports.db.prepare("PRAGMA foreign_key_check").all();
            if (fkCheck.length > 0) {
                console.warn("[DB REPAIR] ⚠️ Warning: Foreign key violations still exist in data:", fkCheck);
            }
            else {
                console.log("[DB REPAIR] ✅ Foreign key data check passed.");
            }
            // Safely turn FKs back on 
            exports.db.exec("PRAGMA foreign_keys = ON");
            console.log("[DB REPAIR] ✅ DB Schema repair completed successfully.");
        }
        else {
            console.log("[DB REPAIR] ✅ No phantom FK references found. DB schema is clean.");
        }
        // Drop orphaned backup/temp tables that may exist from previous failed migrations (from older repair attempts)
        exports.db.exec("PRAGMA foreign_keys = OFF"); // Ensure FKs are off for dropping tables
        exports.db.exec("DROP TABLE IF EXISTS business_partners_backup_fix_fk");
        exports.db.exec("DROP TABLE IF EXISTS business_partners_new_fix");
        exports.db.exec("DROP TABLE IF EXISTS treasury_vouchers_bad_fk_backup");
        exports.db.exec("DROP TABLE IF EXISTS cheques_bad_fk_backup");
        exports.db.exec("DROP TABLE IF EXISTS treasury_vouchers_old_bad");
        exports.db.exec("DROP TABLE IF EXISTS cheques_old_bad");
        exports.db.exec("PRAGMA foreign_keys = ON");
        // Drop any triggers/views that still reference broken table names
        const allTriggers = exports.db.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'trigger'`).all();
        for (const trig of allTriggers) {
            if (trig.sql && (trig.sql.includes('business_partners_backup_fix_fk') ||
                trig.sql.includes('backup_fix') ||
                trig.sql.includes('treasury_vouchers_old_bad'))) {
                console.log(`[DB REPAIR] Dropping broken trigger: ${trig.name}`);
                exports.db.prepare(`DROP TRIGGER IF EXISTS "${trig.name}"`).run();
            }
        }
        const allViews = exports.db.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'view'`).all();
        for (const view of allViews) {
            if (view.sql && (view.sql.includes('business_partners_backup_fix_fk') ||
                view.sql.includes('backup_fix') ||
                view.sql.includes('treasury_vouchers_old_bad'))) {
                console.log(`[DB REPAIR] Dropping broken view: ${view.name}`);
                exports.db.prepare(`DROP VIEW IF EXISTS "${view.name}"`).run();
            }
        }
    }
    catch (e) {
        console.error("[DB REPAIR] ❌ Fatal error during broken FK reference patch:", e);
        // Ensure FKs and writable_schema are always restored to safe state
        try {
            exports.db.exec("PRAGMA writable_schema = OFF");
        }
        catch { }
        try {
            exports.db.exec("PRAGMA foreign_keys = ON");
        }
        catch { }
    }
    // MIGRATION: Create dispatch tables (dispatch_header + dispatch_lines)
    // These tables power the dispatch (سند الإرسال) module.
    try {
        exports.db.exec(`
      CREATE TABLE IF NOT EXISTS dispatch_header (
        id TEXT PRIMARY KEY,
        serial_no TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'محفوظ',
        dispatch_type TEXT DEFAULT 'تحويل داخلي',
        dispatch_date DATE NOT NULL,
        dispatch_time TEXT,
        from_warehouse_id TEXT,
        to_type TEXT DEFAULT 'Warehouse',
        to_id TEXT,
        ledger_id TEXT,
        sales_rep_id TEXT,
        truck_id TEXT,
        carrier_id TEXT,
        tracking_no TEXT,
        is_sent INTEGER DEFAULT 0,
        is_maintenance INTEGER DEFAULT 0,
        customer_ref TEXT,
        send_to TEXT,
        shipment_no TEXT,
        receiver_name TEXT,
        receiver_phone TEXT,
        delivery_date DATE,
        delivery_address TEXT,
        delivery_instructions TEXT,
        source_type TEXT,
        source_id TEXT,
        notes TEXT,
        posted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id)
      )
    `);
        exports.db.exec(`
      CREATE TABLE IF NOT EXISTS dispatch_lines (
        id TEXT PRIMARY KEY,
        header_id TEXT NOT NULL,
        line_no INTEGER DEFAULT 0,
        item_id TEXT NOT NULL,
        uom TEXT,
        qty REAL NOT NULL DEFAULT 0,
        available_qty REAL DEFAULT 0,
        bin_id TEXT,
        batch_no TEXT,
        expiry_date DATE,
        ref TEXT,
        line_note TEXT,
        source_line_id TEXT,
        FOREIGN KEY (header_id) REFERENCES dispatch_header(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `);
        console.log("[DB] dispatch_header and dispatch_lines tables ready.");
    }
    catch (e) {
        console.error("[DB] Failed to create dispatch tables:", e);
    }
    try {
        const tableInfo = exports.db.prepare("PRAGMA table_info(item_categories)").all();
        const hasCode = tableInfo.some((col) => col.name === 'code');
        const hasActive = tableInfo.some((col) => col.name === 'is_active');
        if (!hasCode) {
            exports.db.prepare("ALTER TABLE item_categories ADD COLUMN code TEXT").run();
            console.log("[DB] Added 'code' column to item_categories");
        }
        if (!hasActive) {
            exports.db.prepare("ALTER TABLE item_categories ADD COLUMN is_active INTEGER DEFAULT 1").run();
            console.log("[DB] Added 'is_active' column to item_categories");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate item_categories", e);
    }
    // MIGRATION: Fix MFG Schema V36 (Machines)
    try {
        const mcbCols = exports.db.prepare("PRAGMA table_info(mfg_machines)").all();
        if (mcbCols.length > 0) {
            if (!mcbCols.some((c) => c.name === 'brand'))
                exports.db.prepare("ALTER TABLE mfg_machines ADD COLUMN brand TEXT").run();
            if (!mcbCols.some((c) => c.name === 'model'))
                exports.db.prepare("ALTER TABLE mfg_machines ADD COLUMN model TEXT").run();
            if (!mcbCols.some((c) => c.name === 'serial_number'))
                exports.db.prepare("ALTER TABLE mfg_machines ADD COLUMN serial_number TEXT").run();
            if (!mcbCols.some((c) => c.name === 'status'))
                exports.db.prepare("ALTER TABLE mfg_machines ADD COLUMN status TEXT DEFAULT 'ACTIVE'").run();
            console.log("[DB] Verified mfg_machines schema.");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate mfg_machines", e);
    }
    // MIGRATION: Fix HR Leave Types (Missing columns)
    try {
        const cols = exports.db.prepare("PRAGMA table_info(hr_leave_types)").all();
        if (cols.length > 0) {
            // Define all required columns based on LeaveService.ts
            const required = [
                { name: 'description', type: 'TEXT' },
                { name: 'days_per_year', type: 'INTEGER DEFAULT 30' },
                { name: 'is_paid', type: 'INTEGER DEFAULT 1' },
                { name: 'carry_forward', type: 'INTEGER DEFAULT 0' },
                { name: 'require_attachment', type: 'INTEGER DEFAULT 0' }
            ];
            for (const req of required) {
                if (!cols.some((col) => col.name === req.name)) {
                    exports.db.prepare(`ALTER TABLE hr_leave_types ADD COLUMN ${req.name} ${req.type}`).run();
                    console.log(`[DB] Added '${req.name}' column to hr_leave_types`);
                }
            }
        }
        // Fix HR Leave Requests (Missing submission_date)
        const reqCols = exports.db.prepare("PRAGMA table_info(hr_leave_requests)").all();
        if (reqCols.length > 0 && !reqCols.some((c) => c.name === 'submission_date')) {
            exports.db.prepare("ALTER TABLE hr_leave_requests ADD COLUMN submission_date DATE").run();
            exports.db.prepare("UPDATE hr_leave_requests SET submission_date = COALESCE(submission_date, CURRENT_DATE) WHERE submission_date IS NULL").run();
            console.log("[DB] Added 'submission_date' to hr_leave_requests");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate hr_leave_types/requests", e);
    }
    // MIGRATION: Master Data Redesign (Brands, Warehouses, Partner Types, Regions)
    try {
        // 1. Brands
        const brandCols = exports.db.prepare("PRAGMA table_info(brands)").all();
        if (!brandCols.some((col) => col.name === 'code'))
            exports.db.prepare("ALTER TABLE brands ADD COLUMN code TEXT").run();
        if (!brandCols.some((col) => col.name === 'description'))
            exports.db.prepare("ALTER TABLE brands ADD COLUMN description TEXT").run();
        if (!brandCols.some((col) => col.name === 'is_active'))
            exports.db.prepare("ALTER TABLE brands ADD COLUMN is_active INTEGER DEFAULT 1").run();
        // 2. Warehouses
        const whCols = exports.db.prepare("PRAGMA table_info(warehouses)").all();
        if (!whCols.some((col) => col.name === 'name_ar')) {
            exports.db.prepare("ALTER TABLE warehouses ADD COLUMN name_ar TEXT").run();
            // Migrate existing 'name' to 'name_ar'
            exports.db.prepare("UPDATE warehouses SET name_ar = name").run();
        }
        if (!whCols.some((col) => col.name === 'name_en'))
            exports.db.prepare("ALTER TABLE warehouses ADD COLUMN name_en TEXT").run();
        if (!whCols.some((col) => col.name === 'code'))
            exports.db.prepare("ALTER TABLE warehouses ADD COLUMN code TEXT").run();
        if (!whCols.some((col) => col.name === 'phone'))
            exports.db.prepare("ALTER TABLE warehouses ADD COLUMN phone TEXT").run();
        if (!whCols.some((col) => col.name === 'manager_id'))
            exports.db.prepare("ALTER TABLE warehouses ADD COLUMN manager_id TEXT").run();
        if (!whCols.some((col) => col.name === 'address'))
            exports.db.prepare("ALTER TABLE warehouses ADD COLUMN address TEXT").run();
        // 3. Customer Types (Note: these use INTEGER IDs currently, keeping it safe)
        const custTypeCols = exports.db.prepare("PRAGMA table_info(customer_types)").all();
        if (!custTypeCols.some((col) => col.name === 'name_ar')) {
            exports.db.prepare("ALTER TABLE customer_types ADD COLUMN name_ar TEXT").run();
            exports.db.prepare("UPDATE customer_types SET name_ar = name").run();
        }
        if (!custTypeCols.some((col) => col.name === 'name_en'))
            exports.db.prepare("ALTER TABLE customer_types ADD COLUMN name_en TEXT").run();
        if (!custTypeCols.some((col) => col.name === 'code'))
            exports.db.prepare("ALTER TABLE customer_types ADD COLUMN code TEXT").run();
        if (!custTypeCols.some((col) => col.name === 'is_active'))
            exports.db.prepare("ALTER TABLE customer_types ADD COLUMN is_active INTEGER DEFAULT 1").run();
        // 4. Vendor Types
        const vendTypeCols = exports.db.prepare("PRAGMA table_info(vendor_types)").all();
        if (!vendTypeCols.some((col) => col.name === 'name_ar')) {
            exports.db.prepare("ALTER TABLE vendor_types ADD COLUMN name_ar TEXT").run();
            exports.db.prepare("UPDATE vendor_types SET name_ar = name").run();
        }
        if (!vendTypeCols.some((col) => col.name === 'name_en'))
            exports.db.prepare("ALTER TABLE vendor_types ADD COLUMN name_en TEXT").run();
        if (!vendTypeCols.some((col) => col.name === 'code'))
            exports.db.prepare("ALTER TABLE vendor_types ADD COLUMN code TEXT").run();
        if (!vendTypeCols.some((col) => col.name === 'is_active'))
            exports.db.prepare("ALTER TABLE vendor_types ADD COLUMN is_active INTEGER DEFAULT 1").run();
        // 5. Regions / Areas
        // Create table if not exists (might be missing in seed)
        exports.db.prepare(`
        CREATE TABLE IF NOT EXISTS regions (
            id TEXT PRIMARY KEY,
            code TEXT,
            name_ar TEXT NOT NULL,
            name_en TEXT,
            parent_id TEXT,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY(parent_id) REFERENCES regions(id)
        )
    `).run();
        // Check cols just in case it existed but old schema
        const regCols = exports.db.prepare("PRAGMA table_info(regions)").all();
        if (!regCols.some((col) => col.name === 'code'))
            exports.db.prepare("ALTER TABLE regions ADD COLUMN code TEXT").run();
        if (!regCols.some((col) => col.name === 'is_active'))
            exports.db.prepare("ALTER TABLE regions ADD COLUMN is_active INTEGER DEFAULT 1").run();
        if (!regCols.some((col) => col.name === 'name_en'))
            exports.db.prepare("ALTER TABLE regions ADD COLUMN name_en TEXT").run();
        console.log("[DB] Master Data Redesign Migration Completed");
    }
    catch (e) {
        console.error("[DB] Master Data Migration Failed", e);
    }
    // MIGRATION: Add linked_account_id to hr_employees (for Payment/Receipt Vouchers)
    try {
        const hrCols = exports.db.prepare("PRAGMA table_info(hr_employees)").all();
        if (!hrCols.some((col) => col.name === 'linked_account_id')) {
            exports.db.prepare("ALTER TABLE hr_employees ADD COLUMN linked_account_id TEXT").run();
            console.log("[DB] Added 'linked_account_id' to hr_employees.");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate hr_employees linked_account_id", e);
    }
    // MIGRATION: Fix Items Table (min_price, tax_included)
    try {
        const itemCols = exports.db.prepare("PRAGMA table_info(items)").all();
        if (!itemCols.some((col) => col.name === 'min_price')) {
            exports.db.prepare("ALTER TABLE items ADD COLUMN min_price DECIMAL(18,4) DEFAULT 0").run();
            console.log("[DB] Added 'min_price' to items table.");
        }
        if (!itemCols.some((col) => col.name === 'tax_included')) {
            exports.db.prepare("ALTER TABLE items ADD COLUMN tax_included INTEGER DEFAULT 0").run();
            console.log("[DB] Added 'tax_included' to items table.");
        }
        if (!itemCols.some((col) => col.name === 'max_stock')) {
            exports.db.prepare("ALTER TABLE items ADD COLUMN max_stock DECIMAL(18,4) DEFAULT 0").run();
            console.log("[DB] Added 'max_stock' to items table.");
        }
        if (!itemCols.some((col) => col.name === 'description')) {
            exports.db.prepare("ALTER TABLE items ADD COLUMN description TEXT").run();
            console.log("[DB] Added 'description' to items table.");
        }
        if (!itemCols.some((col) => col.name === 'image_url')) {
            exports.db.prepare("ALTER TABLE items ADD COLUMN image_url TEXT").run();
            console.log("[DB] Added 'image_url' to items table.");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate items table", e);
    }
    // MIGRATION: Add commission_account_id to bank_accounts (Fix for Add Bank Bug)
    try {
        const baCols = exports.db.prepare("PRAGMA table_info(bank_accounts)").all();
        if (baCols.length > 0 && !baCols.some((c) => c.name === 'commission_account_id')) {
            exports.db.prepare("ALTER TABLE bank_accounts ADD COLUMN commission_account_id TEXT").run();
            console.log("[DB] Added 'commission_account_id' to bank_accounts");
        }
    }
    catch (e) {
        console.error("[DB] Failed to add commission_account_id", e);
    }
    // MIGRATION: Fix Business Partners FK
    // (Removed: The old migration logic here was causing 'business_partners_backup_fix_fk' phantom references. 
    // It has been replaced by the PRAGMA writable_schema fix at the top of this file.)
    // Ensure V7 Report Views are loaded
    loadSchema('database/schema_v7_views.sql', 'Schema V7 (Reports Views)');
    // DEBUG: Dump Schema to file
    try {
        const fs = require('fs');
        const path = require('path');
        const objects = exports.db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master").all();
        let output = '';
        for (const obj of objects) {
            output += `TYPE: ${obj.type}\nNAME: ${obj.name}\nTBL_NAME: ${obj.tbl_name}\nSQL: ${obj.sql}\n----------------------------------------\n`;
        }
        fs.writeFileSync('C:\\WAFI ERP\\schema_dump.txt', output);
        console.log(`[DEBUG] Dumped ${objects.length} objects to schema_dump.txt`);
    }
    catch (e) {
        console.error("[DEBUG] Dump failed", e);
    }
    console.log("Database initialized with System Admin tables.");
    return exports.db;
};
exports.initDB = initDB;
function seedSystem() {
    const tableExists = (tableName) => {
        try {
            const row = exports.db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
        LIMIT 1
      `).get(tableName);
            return Boolean(row);
        }
        catch {
            return false;
        }
    };
    // 1. Seed Main Branch
    const mainBranch = exports.db.prepare("SELECT * FROM branches WHERE is_main = 1").get();
    let branchId = mainBranch?.id;
    if (!branchId) {
        branchId = (0, uuid_1.v4)();
        exports.db.prepare("INSERT INTO branches (id, name_ar, name_en, is_main, type) VALUES (?, ?, 'Main Branch', 1, 'MAIN')").run(branchId, "الفرع الرئيسي");
    }
    // 2. Seed Admin Role
    const adminRole = exports.db.prepare("SELECT * FROM roles WHERE name = 'مدير النظام'").get();
    let roleId = adminRole?.id;
    if (!roleId) {
        roleId = (0, uuid_1.v4)();
        // Try to update old 'Admin' if exists to avoid creating duplicate
        const oldAdmin = exports.db.prepare("SELECT * FROM roles WHERE name = 'Admin'").get();
        if (oldAdmin) {
            exports.db.prepare("UPDATE roles SET name = 'مدير النظام', description = 'مدير النظام بصلاحيات كاملة' WHERE id = ?").run(oldAdmin.id);
            roleId = oldAdmin.id;
        }
        else {
            exports.db.prepare("INSERT INTO roles (id, name, description) VALUES (?, 'مدير النظام', 'مدير النظام بصلاحيات كاملة')").run(roleId);
        }
        // Grant all permissions (*.*) - logic handled in app
    }
    // Keep legacy "System Manager" role usable in all databases:
    // this role is the default role for bootstrap admin users.
    const hasAllPermission = exports.db.prepare(`
    SELECT 1
    FROM permissions
    WHERE role_id = ?
      AND permission_key = 'ALL'
    LIMIT 1
  `).get(roleId);
    if (!hasAllPermission) {
        exports.db.prepare(`
      INSERT INTO permissions (id, role_id, permission_key)
      VALUES (?, ?, 'ALL')
    `).run((0, uuid_1.v4)(), roleId);
    }
    if (tableExists('role_permissions')) {
        exports.db.prepare(`
      INSERT OR IGNORE INTO role_permissions (id, role_id, capability_key, effect, created_at)
      VALUES (?, ?, 'ALL', 'ALLOW', CURRENT_TIMESTAMP)
    `).run((0, uuid_1.v4)(), roleId);
    }
    // 3. Seed Admin User (Default: admin / admin123)
    // Note: In production, use bcrypt. For now, simple hash or plain for demo (I'll use a simple indicator)
    // For this prototype, I'll store plain text 'admin123' but prefix with 'plain:' to indicate weak security, 
    // or just assume the AuthService will handle hashing.
    const adminUser = exports.db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (!adminUser) {
        exports.db.prepare(`
            INSERT INTO users (id, username, password_hash, full_name, role_id, branch_id) 
            VALUES (?, 'admin', 'admin123', 'System Administrator', ?, ?)
        `).run((0, uuid_1.v4)(), roleId, branchId);
        console.log("Default Admin user created: admin / admin123");
    }
}
;
function seedCurrencies(db) {
    const currencies = [
        { code: 'ILS', name: 'شيكل', name_en: 'Shekel', factor: 1, symbol: '₪' },
        { code: 'USD', name: 'دولار أمريكي', name_en: 'US Dollar', factor: 3.5, symbol: '$' },
        { code: 'JOD', name: 'دينار أردني', name_en: 'Jordanian Dinar', factor: 5, symbol: 'JD' },
        { code: 'EUR', name: 'يورو', name_en: 'Euro', factor: 4, symbol: '€' }
    ];
    currencies.forEach(c => {
        try {
            const row = db.prepare('SELECT id FROM currencies WHERE code = ?').get(c.code);
            if (!row) {
                db.prepare('INSERT INTO currencies (id, code, name_ar, name_en, exchange_rate, symbol) VALUES (?, ?, ?, ?, ?, ?)').run((0, uuid_1.v4)(), c.code, c.name, c.name_en, c.factor, c.symbol);
                console.log(`Seeded Currency: ${c.code}`);
            }
        }
        catch (e) {
            console.error("Error seeding currency " + c.code, e);
        }
    });
}
function seedExtensions(db) {
    // Sales Returns
    db.exec(`
    CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      return_no TEXT UNIQUE,
      invoice_id TEXT, -- Original Invoice Reference
      customer_id TEXT,
      branch_id TEXT,
      warehouse_id TEXT,
      date TEXT,
      subtotal TEXT DEFAULT '0',
      tax_total TEXT DEFAULT '0',
      grand_total TEXT DEFAULT '0',
      currency_id TEXT,
      exchange_rate TEXT DEFAULT '1',
      status TEXT DEFAULT 'DRAFT',
      notes TEXT,
      journal_header_id TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(invoice_id) REFERENCES sales_invoices(id),
      FOREIGN KEY(customer_id) REFERENCES accounts(id)
    );
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS sales_return_lines (
      id TEXT PRIMARY KEY,
      return_id TEXT,
      item_id TEXT,
      description TEXT,
      quantity REAL,
      unit_id TEXT,
      unit_price TEXT,
      total_price TEXT,
      tax_amount TEXT DEFAULT '0',
      net_total TEXT,
      FOREIGN KEY(return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
      FOREIGN KEY(item_id) REFERENCES items(id)
    );
  `);
    // --- PURCHASES ---
    db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id TEXT PRIMARY KEY,
      invoice_no TEXT UNIQUE,
      vendor_invoice_no TEXT,
      supplier_id TEXT,
      branch_id TEXT,
      warehouse_id TEXT,
      date TEXT,
      due_date TEXT,
      currency_id TEXT,
      exchange_rate TEXT DEFAULT '1',
      subtotal TEXT DEFAULT '0',
      tax_total TEXT DEFAULT '0',
      discount_total TEXT DEFAULT '0',
      grand_total TEXT DEFAULT '0',
      status TEXT DEFAULT 'POSTED',
      journal_header_id TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Clearing Invoice Fields
      is_clearing_invoice INTEGER DEFAULT 0,
      clearing_dealer_number TEXT,
      clearing_hebrew_name TEXT,
      clearing_original_date TEXT,
      shipment_id TEXT,

      FOREIGN KEY(supplier_id) REFERENCES accounts(id)
    );
  `);
    // Migrate Purchase Invoices
    try {
        const info = db.pragma('table_info(purchase_invoices)');
        const columns = info.map((c) => c.name);
        if (!columns.includes('is_clearing_invoice'))
            db.exec("ALTER TABLE purchase_invoices ADD COLUMN is_clearing_invoice INTEGER DEFAULT 0");
        if (!columns.includes('clearing_dealer_number'))
            db.exec("ALTER TABLE purchase_invoices ADD COLUMN clearing_dealer_number TEXT");
        if (!columns.includes('clearing_hebrew_name'))
            db.exec("ALTER TABLE purchase_invoices ADD COLUMN clearing_hebrew_name TEXT");
        if (!columns.includes('clearing_original_date'))
            db.exec("ALTER TABLE purchase_invoices ADD COLUMN clearing_original_date TEXT");
        if (!columns.includes('shipment_id'))
            db.exec("ALTER TABLE purchase_invoices ADD COLUMN shipment_id TEXT");
    }
    catch (e) {
        console.error("Error migrating purchase_invoices:", e);
    }
    db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_invoice_lines (
      id TEXT PRIMARY KEY,
      invoice_id TEXT,
      item_id TEXT,
      quantity REAL,
      unit_id TEXT,
      unit_price TEXT,
      total_price TEXT,
      tax_amount TEXT DEFAULT '0',
      net_total TEXT,
      FOREIGN KEY(invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(item_id) REFERENCES items(id)
    );
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      order_no TEXT UNIQUE,
      supplier_id TEXT,
      branch_id TEXT,
      date TEXT,
      delivery_date TEXT,
      currency_id TEXT,
      exchange_rate TEXT DEFAULT '1',
      subtotal TEXT DEFAULT '0',
      tax_total TEXT DEFAULT '0',
      grand_total TEXT DEFAULT '0',
      status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, COMPLETED, CANCELLED
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(supplier_id) REFERENCES business_partners(id)
    );
  `);
    // MIGRATION: Add request_id to purchase_orders
    try {
        const cols = db.prepare("PRAGMA table_info(purchase_orders)").all();
        if (!cols.some((c) => c.name === 'request_id')) {
            db.prepare("ALTER TABLE purchase_orders ADD COLUMN request_id TEXT").run();
            console.log("[DB] Added 'request_id' to purchase_orders.");
        }
    }
    catch (e) {
        console.error("[DB] Failed to migrate purchase_orders", e);
    }
    db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_order_lines (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      item_id TEXT,
      quantity REAL,
      unit_id TEXT,
      unit_price TEXT,
      total_price TEXT,
      tax_amount TEXT DEFAULT '0',
      FOREIGN KEY(order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY(item_id) REFERENCES items(id)
    );
  `);
    // --- HR & PAYROLL ---
    db.exec(`
    CREATE TABLE IF NOT EXISTS hr_employees (
      id TEXT PRIMARY KEY,
      employee_code TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      position TEXT,
      department TEXT,
      branch_id TEXT,
      basic_salary REAL DEFAULT 0,
      currency_id TEXT,
      join_date TEXT,
      status TEXT DEFAULT 'ACTIVE', -- ACTIVE, RESIGNED, TERMINATED
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(branch_id) REFERENCES branches(id)
    );
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS hr_attendance (
      id TEXT PRIMARY KEY,
      employee_id TEXT,
      date TEXT,
      check_in TEXT,
      check_out TEXT,
      status TEXT, -- PRESENT, ABSENT, LEAVE
      overtime_hours REAL DEFAULT 0,
      late_minutes REAL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(employee_id) REFERENCES hr_employees(id)
    );
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS hr_loans (
      id TEXT PRIMARY KEY,
      employee_id TEXT,
      amount REAL,
      date TEXT,
      reason TEXT,
      is_deducted INTEGER DEFAULT 0,
      deduction_date TEXT,
      FOREIGN KEY(employee_id) REFERENCES hr_employees(id)
    );
  `);
    db.exec(`
    CREATE TABLE IF NOT EXISTS hr_salary_slips (
      id TEXT PRIMARY KEY,
      slip_no TEXT,
      employee_id TEXT,
      month INTEGER,
      year INTEGER,
      basic_salary REAL,
      total_allowances REAL DEFAULT 0,
      total_overtime_amount REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      loan_deduction REAL DEFAULT 0,
      net_salary REAL,
      status TEXT DEFAULT 'POSTED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(employee_id) REFERENCES hr_employees(id)
    );
  `);
}
const seedCOA = () => {
    console.log("Seeding/Updating Detailed Chart of Accounts (UUID Mode)...");
    // Account Seeding Data (Same structure, but we will generate UUIDs)
    const accounts = [
        // 1. Assets
        { code: '1', name: 'الأصول', type: 'Asset' },
        { code: '11', name: 'الأصول المتداولة', type: 'Asset' },
        { code: '111', name: 'النقدية وما في حكمها', type: 'Asset' },
        // Cash Boxes (Sub-accounts under 111)
        { code: '1111', name: 'الصناديق', type: 'Asset' },
        { code: '11111', name: 'الصندوق الرئيسي (الخزينة)', type: 'Asset' },
        { code: '11112', name: 'صندوق الكاشير (نقاط البيع)', type: 'Asset' },
        { code: '11113', name: 'العهد النقدية (نثرية)', type: 'Asset' },
        // Banks (Sub-accounts under 111)
        { code: '1112', name: 'البنوك', type: 'Asset' },
        { code: '11121', name: 'البنك العربي - شيكل', type: 'Asset' },
        { code: '11122', name: 'بنك فلسطين - شيكل', type: 'Asset' },
        { code: '11123', name: 'البنك العربي - دولار', type: 'Asset' },
        { code: '11124', name: 'بنك فلسطين - دولار', type: 'Asset' },
        { code: '11125', name: 'البنك العربي - دينار', type: 'Asset' },
        // 2. Liabilities
        { code: '2', name: 'الخصوم', type: 'Liability' },
        { code: '21', name: 'الخصوم المتداولة', type: 'Liability' },
        { code: '211', name: 'الموردين', type: 'Liability' },
        // 4. Revenue
        { code: '4', name: 'الإيرادات', type: 'Revenue' },
        { code: '41', name: 'المبيعات', type: 'Revenue' },
        { code: '4101', name: 'مبيعات عامة', type: 'Revenue' },
        // 5. Expenses
        { code: '5', name: 'المصروفات', type: 'Expense' },
        { code: '51', name: 'المصاريف الإدارية', type: 'Expense' },
        { code: '5101', name: 'كهرباء', type: 'Expense' }
    ];
    const insert = exports.db.prepare(`
    INSERT OR IGNORE INTO accounts(id, code, name, type, balance, parent_id, account_level, is_transactional)
  VALUES(@id, @code, @name, @type, @balance, @parent_id, @account_level, @is_transactional)
    `);
    const codeToIdMap = new Map();
    // Use transaction for speed
    const insertMany = exports.db.transaction((rows) => {
        // Sort to ensure parents exist before trying to map them (though we map by code now)
        rows.sort((a, b) => a.code.length - b.code.length);
        for (const row of rows) {
            // Check existence first to avoid re-generating UUID for existing account
            const existing = exports.db.prepare('SELECT id FROM accounts WHERE code = ?').get(row.code);
            let id = existing ? existing.id : (0, uuid_1.v4)();
            // Store in map for children to use
            codeToIdMap.set(row.code, id);
            // Parent Resolution
            let parentId = null;
            if (row.code.length > 1) {
                const parentCode = row.code.substring(0, row.code.length - 1); // Simple digit hierarchy logic
                if (codeToIdMap.has(parentCode)) {
                    parentId = codeToIdMap.get(parentCode);
                }
                else {
                    // Fallback: Check DB if not in current batch
                    const parentInDb = exports.db.prepare('SELECT id FROM accounts WHERE code = ?').get(parentCode);
                    if (parentInDb)
                        parentId = parentInDb.id;
                }
            }
            insert.run({
                id: id,
                code: row.code,
                name: row.name,
                type: row.type,
                balance: '0',
                parent_id: parentId,
                account_level: row.code.length,
                is_transactional: (row.code.length >= 4) ? 1 : 0
            });
        }
    });
    insertMany(accounts);
};
exports.seedCOA = seedCOA;
function seedAssetCategories(db) {
    const categories = [
        { code: 'GRP-001', name_ar: 'سيارات', name_en: 'Vehicles', rate: 20 },
        { code: 'GRP-002', name_ar: 'أجهزة حاسوب', name_en: 'Computers', rate: 25 },
        { code: 'GRP-003', name_ar: 'أثاث ومفروشات', name_en: 'Furniture', rate: 10 },
        { code: 'GRP-004', name_ar: 'آلات ومعدات', name_en: 'Machinery', rate: 15 },
        { code: 'GRP-005', name_ar: 'مباني وإنشاءات', name_en: 'Buildings', rate: 5 }
    ];
    categories.forEach(cat => {
        const exists = db.prepare('SELECT id FROM asset_categories WHERE code = ?').get(cat.code);
        if (!exists) {
            db.prepare(`
        INSERT INTO asset_categories(id, code, name_ar, name_en, depreciation_rate, depreciation_method)
  VALUES(?, ?, ?, ?, ?, 'Straight Line')
      `).run((0, uuid_1.v4)(), cat.code, cat.name_ar, cat.name_en, cat.rate);
            console.log(`Seeded Asset Category: ${cat.name_en} `);
        }
    });
}
