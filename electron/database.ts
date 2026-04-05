import path from 'path';
import { v4 as uuidv4 } from 'uuid';
declare const require: any;
const Database = require('better-sqlite3');

// Database instance (initialized in initDB)
export let db: any;

export const initDB = (dbPath: string) => {
  // Initialize Database
  db = new Database(dbPath);

  // *** CRITICAL: Keep FK checks OFF during the entire schema loading & migration ***
  // schema_v1_foundation.sql has "PRAGMA foreign_keys = ON" which would cause
  // FK constraint failures when dropping/recreating tables during init.
  // FKs are re-enabled at the end of initDB by the self-repair block's finally clause.
  db.exec("PRAGMA foreign_keys = OFF;");
  // Version 10: Fixed Assets
  // Read and Execute Schema from File
  const schemaPath = path.join(__dirname, '../database/schema_v1_foundation.sql');
  // Check if we are in production (bundled) or dev
  const possiblePaths = [
    path.join(process.resourcesPath, 'database/schema_v1_foundation.sql'), // Prod
    path.join(__dirname, '../../database/schema_v1_foundation.sql'), // Dev (dist-electron/../../database)
    path.join(__dirname, '../database/schema_v1_foundation.sql'),
    path.resolve('database/schema_v1_foundation.sql') // Dev from root
  ];

  let resolvedSchemaPath = '';
  for (const p of possiblePaths) {
    // console.log('Checking schema path:', p);
    try {
      if (require('fs').existsSync(p)) {
        resolvedSchemaPath = p;
        break;
      }
    } catch (e) {
      // ignore
    }
  }

  if (resolvedSchemaPath) {
    console.log(`[DB] Loading schema from: ${resolvedSchemaPath}`);
    const schemaSql = require('fs').readFileSync(resolvedSchemaPath, 'utf8');
    db.exec(schemaSql);
  }
  // 2. Execute Schema V2 (Inventory & Partners)
  const schemaPathV2 = path.join(__dirname, '../database/schema_v2_inventory_partners.sql');
  const schemaPathV3 = path.join(__dirname, '../database/schema_v3_financials.sql');

  const loadSchema = (schemaPath: string, name: string) => {
    const possiblePaths = [
      path.join(process.resourcesPath, schemaPath),
      path.join(__dirname, '../../' + schemaPath),
      path.join(__dirname, '../' + schemaPath),
      path.resolve(schemaPath)
    ];
    let resolved = '';
    for (const p of possiblePaths) {
      try { if (require('fs').existsSync(p)) { resolved = p; break; } } catch (e) { }
    }
    if (resolved) {
      console.log(`[DB] Loading ${name} from: ${resolved}`);
      const sql = require('fs').readFileSync(resolved, 'utf8');

      // Split statements to handle errors individually (e.g. for ALTER TABLE)
      const statements = sql.split(';').filter((s: string) => s.trim().length > 0);

      // Special Transaction wrapper not strictly needed if we want to allow partial success on ALTERs
      // but usually schemas are transaction-safe. 
      // However, for ALTER ADD COLUMN, we specifically want to Ignore if column exists.

      const runSchema = db.transaction(() => {
        for (const stmt of statements) {
          try {
            db.prepare(stmt).run();
          } catch (err: any) {
            // Check for "duplicate column name" error (SQLite code or message)
            if (err.message.includes('duplicate column name')) {
              console.warn(`[DB] Skipped duplicate column in ${name}: ${err.message}`);
            } else if (err.message.includes('no such table')) {
              // Sometimes DROP TABLE IF EXISTS fails if trigger exists, etc. 
              // OR maybe we are altering a table that doesn't exist yet (bad order).
              console.warn(`[DB] Warning in ${name}: ${err.message}`);
              // We might re-throw if critical, but for now we log.
              throw err;
            } else if (err.message.includes('no statements')) {
              // Ignore empty statements (e.g. comments between semicolons)
            } else {
              throw err;
            }
          }
        }
      });

      try {
        runSchema();
      } catch (err: any) {
        console.error(`[DB] Failed to load ${name}:`, err.message);
        // Don't crash the entire app if one schema fails, unless specific logic needs it.
        // But usually schema failure is bad. 
        // However, thanks to the inner try/catch on statements, we handled "duplicate column".
        // Real errors will still throw here.
      }
    } else {
      console.warn(`[DB] WARNING: ${name} file not found.`);
    }
  };

  loadSchema('database/schema_v2_inventory_partners.sql', 'Schema V2');

  // ==========================================
  // CORE TABLES (Accounts, Transactions)
  // Must be created BEFORE schemas that reference them
  // ==========================================

  // 1. Accounts Table (Refactored for UUID & Decimal Text)
  db.exec(`
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
  db.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);`);

  // 2. Transactions Header
  db.exec(`
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
  db.exec(`
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
  db.exec('DROP TABLE IF EXISTS journal_entry_lines; DROP TABLE IF EXISTS journal_entries; DROP TABLE IF EXISTS gl_journal_lines; DROP TABLE IF EXISTS gl_journal_headers;');
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
    db.exec("PRAGMA foreign_keys=OFF;");
    db.exec("DROP TABLE IF EXISTS hr_attendance; DROP TABLE IF EXISTS hr_loans;");
    db.exec("DROP TABLE IF EXISTS hr_employees; DROP TABLE IF EXISTS hr_salary_slips;");
  } catch (e) { console.error("Error cleaning old HR tables", e); }

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
  loadSchema('database/seed_banks_custom.sql', 'Seeding Custom Bank Accounts');




  // MIGRATION: Add system_type to gl_chart_of_accounts (Account Linking Logic)
  try {
    const coaCols = db.prepare("PRAGMA table_info(gl_chart_of_accounts)").all();
    if (!coaCols.some((col: any) => col.name === 'system_type')) {
      db.prepare("ALTER TABLE gl_chart_of_accounts ADD COLUMN system_type TEXT").run();
      console.log("[DB] Added 'system_type' to gl_chart_of_accounts");
    }
  } catch (e) {
    console.error("[DB] Failed to migrate gl_chart_of_accounts (system_type)", e);
  }

  // MIGRATION: Add reconciled to journal_entry_lines (Bank Reconciliation)
  try {
    const jelCols = db.prepare("PRAGMA table_info(journal_entry_lines)").all();
    if (!jelCols.some((col: any) => col.name === 'reconciled')) {
      db.prepare("ALTER TABLE journal_entry_lines ADD COLUMN reconciled INTEGER DEFAULT 0").run();
      console.log("[DB] Added 'reconciled' to journal_entry_lines");
    }
  } catch (e) {
    console.error("[DB] Failed to migrate journal_entry_lines (reconciled)", e);
  }

  // SEED: Default Parent Accounts for Partners (Auto-GL)
  try {
    const settingsCheck = db.prepare("SELECT value FROM settings WHERE key = 'default_customer_parent'").get();
    if (!settingsCheck) {
      console.log("[DB] Seeding Default Parent Accounts...");
      // Try to find reasonable defaults
      const receivables = db.prepare("SELECT id FROM gl_chart_of_accounts WHERE (name_ar LIKE '%ذمم%' OR name_en LIKE '%Receivable%') AND account_level < 4 LIMIT 1").get();
      const payables = db.prepare("SELECT id FROM gl_chart_of_accounts WHERE (name_ar LIKE '%مورد%' OR name_en LIKE '%Payable%') AND account_level < 4 LIMIT 1").get();
      const employees = db.prepare("SELECT id FROM gl_chart_of_accounts WHERE (name_ar LIKE '%ذمم موظفين%' OR name_en LIKE '%Employee%') AND account_level < 4 LIMIT 1").get();

      const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");

      if (receivables) insertSetting.run('default_customer_parent', receivables.id);
      if (payables) insertSetting.run('default_supplier_parent', payables.id);
      if (employees) insertSetting.run('default_employee_parent', employees.id);
    }
  } catch (e) {
    console.error("[DB] Failed to seed default parent accounts", e);
  }

  // 4. Inventory Module


  // Warehouses
  db.exec(`
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
    db.prepare("SELECT name_ar FROM branches LIMIT 1").get();
  } catch (e: any) {
    if (e.message.includes('no such column')) {
      console.log("[DB] Migrating 'branches' table to support name_ar...");
      try {
        const branches = db.prepare("SELECT * FROM branches").all();
        // Drop and Recreate is risky if we lose data, but for this specific error "no such column name_ar", we are upgrading structure.
        // Safer way: Add columns.
        db.exec("ALTER TABLE branches ADD COLUMN name_ar TEXT");
        db.exec("ALTER TABLE branches ADD COLUMN name_en TEXT");
        db.exec("ALTER TABLE branches ADD COLUMN type TEXT DEFAULT 'BRANCH'");
        db.exec("ALTER TABLE branches ADD COLUMN is_active INTEGER DEFAULT 1");
        db.exec("ALTER TABLE branches ADD COLUMN sync_status INTEGER DEFAULT 0");

        // Migrate 'name' -> 'name_ar'
        db.prepare("UPDATE branches SET name_ar = name").run();
      } catch (migErr) {
        console.error("Migration failed:", migErr);
      }
    }
  }

  // Units (UOM)
  db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT,
      is_base INTEGER DEFAULT 0
    );
  `);

  // Items (Master)
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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

  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
    const baCols = db.prepare("PRAGMA table_info(bank_accounts)").all();
    if (baCols.length > 0) {
      if (!baCols.some((c: any) => c.name === 'bank_id')) db.prepare("ALTER TABLE bank_accounts ADD COLUMN bank_id TEXT").run();
      if (!baCols.some((c: any) => c.name === 'bank_name')) db.prepare("ALTER TABLE bank_accounts ADD COLUMN bank_name TEXT").run();
      if (!baCols.some((c: any) => c.name === 'account_name')) db.prepare("ALTER TABLE bank_accounts ADD COLUMN account_name TEXT").run();
      if (!baCols.some((c: any) => c.name === 'branch')) db.prepare("ALTER TABLE bank_accounts ADD COLUMN branch TEXT").run();
      if (!baCols.some((c: any) => c.name === 'iban')) db.prepare("ALTER TABLE bank_accounts ADD COLUMN iban TEXT").run();
      if (!baCols.some((c: any) => c.name === 'currency')) db.prepare("ALTER TABLE bank_accounts ADD COLUMN currency TEXT DEFAULT 'ILS'").run();
      if (!baCols.some((c: any) => c.name === 'code')) db.prepare("ALTER TABLE bank_accounts ADD COLUMN code TEXT").run();
      if (!baCols.some((c: any) => c.name === 'is_active')) db.prepare("ALTER TABLE bank_accounts ADD COLUMN is_active INTEGER DEFAULT 1").run();

      console.log("[DB] Verified bank_accounts schema (added missing columns).");
    }
  } catch (e) {
    console.error("[DB] Failed to migrate bank_accounts", e);
  }

  // MIGRATION: Add extra fields to banks table (for Import)
  try {
    const bankCols = db.prepare("PRAGMA table_info(banks)").all();
    if (bankCols.length > 0) {
      if (!bankCols.some((c: any) => c.name === 'bank_code')) db.prepare("ALTER TABLE banks ADD COLUMN bank_code TEXT").run();
      if (!bankCols.some((c: any) => c.name === 'branch_code')) db.prepare("ALTER TABLE banks ADD COLUMN branch_code TEXT").run();
      if (!bankCols.some((c: any) => c.name === 'name_he')) db.prepare("ALTER TABLE banks ADD COLUMN name_he TEXT").run();
      if (!bankCols.some((c: any) => c.name === 'routing_no')) db.prepare("ALTER TABLE banks ADD COLUMN routing_no TEXT").run();
      if (!bankCols.some((c: any) => c.name === 'address')) db.prepare("ALTER TABLE banks ADD COLUMN address TEXT").run();
      console.log("[DB] Verified banks schema.");
    }
  } catch (e) {
    console.error("[DB] Failed to migrate banks", e);
  }

  // HR & Payroll Tables

  // Employees
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      is_main INTEGER DEFAULT 0
    );
  `);

  // Roles
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );
  `);

  // Permissions (Role-based)
  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT,
      permission_key TEXT, -- e.g. "sales.create", "gl.post"
      FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `);

  // Users
  db.exec(`
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
  db.exec(`
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed Palestinian Data
  const { seedPalestinianData } = require('./seed_palestine');
  seedPalestinianData(db);
  seedCurrencies(db);

  const { seedRoles } = require('./seed_roles');
  seedRoles(db);

  seedSystem();
  seedAssetCategories(db);
  seedExtensions(db);

  // SELF-REPAIR: Remove invalid units causing React Key Validation Errors
  try {
    db.prepare("DELETE FROM units WHERE id IS NULL OR id = '' OR id = 'undefined'").run();
    console.log("[DB] Cleaned up invalid units.");
  } catch (e) {
    console.error("[DB] Cleanup failed", e);
  }

  // SELF-REPAIR: Remove broken triggers/views referencing missing backup tables
  try {
    console.log("[DB] Checking for broken backup triggers/views...");

    // *** CRITICAL: Must disable FKs for the entire repair process ***
    db.exec("PRAGMA foreign_keys = OFF");

    // STEP 1: Drop the orphaned backup table if it somehow exists
    db.exec("DROP TABLE IF EXISTS business_partners_backup_fix_fk");
    db.exec("DROP TABLE IF EXISTS business_partners_new_fix");
    // Also clean up leftover temp tables from previous failed repairs
    db.exec("DROP TABLE IF EXISTS treasury_vouchers_bad_fk_backup");
    db.exec("DROP TABLE IF EXISTS cheques_bad_fk_backup");
    db.exec("DROP TABLE IF EXISTS treasury_vouchers_old_bad");
    db.exec("DROP TABLE IF EXISTS cheques_old_bad");

    // STEP 2: Find and fix tables with broken Foreign Keys
    const brokenTables = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%business_partners_backup_fix_fk%'`).all();

    if (brokenTables.length > 0) {
      console.log(`[DB] Found ${brokenTables.length} tables with broken Foreign Keys. Repairing...`);

      db.transaction(() => {
        for (const tbl of brokenTables) {
          console.log(`[DB] Repairing table: ${tbl.name}`);
          const tempName = `${tbl.name}_bad_fk_backup`;

          // Drop temp table if it somehow exists from previous failed run
          db.exec(`DROP TABLE IF EXISTS "${tempName}"`);

          // 1. Rename bad table
          db.exec(`ALTER TABLE "${tbl.name}" RENAME TO "${tempName}"`);

          // 2. Create new table with corrected SQL
          let newSql = tbl.sql.replace(/"?business_partners_backup_fix_fk"?/g, '"business_partners"');
          newSql = newSql.replace(/REFERENCES\s+("?business_partners_backup_fix_fk"?)/gi, 'REFERENCES business_partners');

          db.exec(newSql);

          // 3. Copy data
          db.exec(`INSERT INTO "${tbl.name}" SELECT * FROM "${tempName}"`);

          // 4. Drop old
          db.exec(`DROP TABLE "${tempName}"`);

          console.log(`[DB] Repaired ${tbl.name}`);
        }
      })();
    }

    // STEP 3: Find and drop ALL triggers whose SQL references broken tables
    const allTriggers = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'trigger'`).all();
    for (const trig of allTriggers) {
      if (trig.sql && (
        trig.sql.includes('business_partners_backup_fix_fk') ||
        trig.sql.includes('backup_fix') ||
        trig.sql.includes('gl_journal_header')
      )) {
        console.log(`[DB] Dropping broken trigger: ${trig.name}`);
        db.prepare(`DROP TRIGGER IF EXISTS "${trig.name}"`).run();
      }
    }

    // STEP 4: Find and drop broken views
    const allViews = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'view'`).all();
    for (const view of allViews) {
      if (view.sql && (
        view.sql.includes('business_partners_backup_fix_fk') ||
        view.sql.includes('backup_fix') ||
        view.sql.includes('gl_journal_header')
      )) {
        console.log(`[DB] Dropping broken view: ${view.name}`);
        db.prepare(`DROP VIEW IF EXISTS "${view.name}"`).run();
      }
    }

    console.log("[DB] Backup table cleanup complete.");
  } catch (e) {
    console.error("[DB] Failed to clean broken triggers/views or repair tables", e);
  } finally {
    // Re-enable FK checks after all repairs done
    db.exec("PRAGMA foreign_keys = ON");
  }

  // MIGRATION: Add 'code' and 'is_active' to item_categories if missing
  try {
    const tableInfo = db.prepare("PRAGMA table_info(item_categories)").all();
    const hasCode = tableInfo.some((col: any) => col.name === 'code');
    const hasActive = tableInfo.some((col: any) => col.name === 'is_active');

    if (!hasCode) {
      db.prepare("ALTER TABLE item_categories ADD COLUMN code TEXT").run();
      console.log("[DB] Added 'code' column to item_categories");
    }
    if (!hasActive) {
      db.prepare("ALTER TABLE item_categories ADD COLUMN is_active INTEGER DEFAULT 1").run();
      console.log("[DB] Added 'is_active' column to item_categories");
    }
  } catch (e) {
    console.error("[DB] Failed to migrate item_categories", e);
  }

  // MIGRATION: Fix MFG Schema V36 (Machines)
  try {
    const mcbCols = db.prepare("PRAGMA table_info(mfg_machines)").all();
    if (mcbCols.length > 0) {
      if (!mcbCols.some((c: any) => c.name === 'brand')) db.prepare("ALTER TABLE mfg_machines ADD COLUMN brand TEXT").run();
      if (!mcbCols.some((c: any) => c.name === 'model')) db.prepare("ALTER TABLE mfg_machines ADD COLUMN model TEXT").run();
      if (!mcbCols.some((c: any) => c.name === 'serial_number')) db.prepare("ALTER TABLE mfg_machines ADD COLUMN serial_number TEXT").run();
      if (!mcbCols.some((c: any) => c.name === 'status')) db.prepare("ALTER TABLE mfg_machines ADD COLUMN status TEXT DEFAULT 'ACTIVE'").run();
      console.log("[DB] Verified mfg_machines schema.");
    }
  } catch (e) {
    console.error("[DB] Failed to migrate mfg_machines", e);
  }

  // MIGRATION: Fix HR Leave Types (Missing columns)
  try {
    const cols = db.prepare("PRAGMA table_info(hr_leave_types)").all();
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
        if (!cols.some((col: any) => col.name === req.name)) {
          db.prepare(`ALTER TABLE hr_leave_types ADD COLUMN ${req.name} ${req.type}`).run();
          console.log(`[DB] Added '${req.name}' column to hr_leave_types`);
        }
      }
    }

    // Fix HR Leave Requests (Missing submission_date)
    const reqCols = db.prepare("PRAGMA table_info(hr_leave_requests)").all();
    if (reqCols.length > 0 && !reqCols.some((c: any) => c.name === 'submission_date')) {
      db.prepare("ALTER TABLE hr_leave_requests ADD COLUMN submission_date DATE DEFAULT CURRENT_DATE").run();
      console.log("[DB] Added 'submission_date' to hr_leave_requests");
    }

  } catch (e) {
    console.error("[DB] Failed to migrate hr_leave_types/requests", e);
  }

  // MIGRATION: Master Data Redesign (Brands, Warehouses, Partner Types, Regions)
  try {
    // 1. Brands
    const brandCols = db.prepare("PRAGMA table_info(brands)").all();
    if (!brandCols.some((col: any) => col.name === 'code')) db.prepare("ALTER TABLE brands ADD COLUMN code TEXT").run();
    if (!brandCols.some((col: any) => col.name === 'description')) db.prepare("ALTER TABLE brands ADD COLUMN description TEXT").run();
    if (!brandCols.some((col: any) => col.name === 'is_active')) db.prepare("ALTER TABLE brands ADD COLUMN is_active INTEGER DEFAULT 1").run();

    // 2. Warehouses
    const whCols = db.prepare("PRAGMA table_info(warehouses)").all();
    if (!whCols.some((col: any) => col.name === 'name_ar')) {
      db.prepare("ALTER TABLE warehouses ADD COLUMN name_ar TEXT").run();
      // Migrate existing 'name' to 'name_ar'
      db.prepare("UPDATE warehouses SET name_ar = name").run();
    }
    if (!whCols.some((col: any) => col.name === 'name_en')) db.prepare("ALTER TABLE warehouses ADD COLUMN name_en TEXT").run();
    if (!whCols.some((col: any) => col.name === 'code')) db.prepare("ALTER TABLE warehouses ADD COLUMN code TEXT").run();
    if (!whCols.some((col: any) => col.name === 'phone')) db.prepare("ALTER TABLE warehouses ADD COLUMN phone TEXT").run();
    if (!whCols.some((col: any) => col.name === 'manager_id')) db.prepare("ALTER TABLE warehouses ADD COLUMN manager_id TEXT").run();
    if (!whCols.some((col: any) => col.name === 'address')) db.prepare("ALTER TABLE warehouses ADD COLUMN address TEXT").run();

    // 3. Customer Types (Note: these use INTEGER IDs currently, keeping it safe)
    const custTypeCols = db.prepare("PRAGMA table_info(customer_types)").all();
    if (!custTypeCols.some((col: any) => col.name === 'name_ar')) {
      db.prepare("ALTER TABLE customer_types ADD COLUMN name_ar TEXT").run();
      db.prepare("UPDATE customer_types SET name_ar = name").run();
    }
    if (!custTypeCols.some((col: any) => col.name === 'name_en')) db.prepare("ALTER TABLE customer_types ADD COLUMN name_en TEXT").run();
    if (!custTypeCols.some((col: any) => col.name === 'code')) db.prepare("ALTER TABLE customer_types ADD COLUMN code TEXT").run();
    if (!custTypeCols.some((col: any) => col.name === 'is_active')) db.prepare("ALTER TABLE customer_types ADD COLUMN is_active INTEGER DEFAULT 1").run();

    // 4. Vendor Types
    const vendTypeCols = db.prepare("PRAGMA table_info(vendor_types)").all();
    if (!vendTypeCols.some((col: any) => col.name === 'name_ar')) {
      db.prepare("ALTER TABLE vendor_types ADD COLUMN name_ar TEXT").run();
      db.prepare("UPDATE vendor_types SET name_ar = name").run();
    }
    if (!vendTypeCols.some((col: any) => col.name === 'name_en')) db.prepare("ALTER TABLE vendor_types ADD COLUMN name_en TEXT").run();
    if (!vendTypeCols.some((col: any) => col.name === 'code')) db.prepare("ALTER TABLE vendor_types ADD COLUMN code TEXT").run();
    if (!vendTypeCols.some((col: any) => col.name === 'is_active')) db.prepare("ALTER TABLE vendor_types ADD COLUMN is_active INTEGER DEFAULT 1").run();

    // 5. Regions / Areas
    // Create table if not exists (might be missing in seed)
    db.prepare(`
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
    const regCols = db.prepare("PRAGMA table_info(regions)").all();
    if (!regCols.some((col: any) => col.name === 'code')) db.prepare("ALTER TABLE regions ADD COLUMN code TEXT").run();
    if (!regCols.some((col: any) => col.name === 'is_active')) db.prepare("ALTER TABLE regions ADD COLUMN is_active INTEGER DEFAULT 1").run();
    if (!regCols.some((col: any) => col.name === 'name_en')) db.prepare("ALTER TABLE regions ADD COLUMN name_en TEXT").run();

    console.log("[DB] Master Data Redesign Migration Completed");

  } catch (e) {
    console.error("[DB] Master Data Migration Failed", e);
  }

  // MIGRATION: Add linked_account_id to hr_employees (for Payment/Receipt Vouchers)
  try {
    const hrCols = db.prepare("PRAGMA table_info(hr_employees)").all();
    if (!hrCols.some((col: any) => col.name === 'linked_account_id')) {
      db.prepare("ALTER TABLE hr_employees ADD COLUMN linked_account_id TEXT").run();
      console.log("[DB] Added 'linked_account_id' to hr_employees.");
    }
  } catch (e) {
    console.error("[DB] Failed to migrate hr_employees linked_account_id", e);
  }

  // MIGRATION: Fix Items Table (min_price, tax_included)
  try {
    const itemCols = db.prepare("PRAGMA table_info(items)").all();

    if (!itemCols.some((col: any) => col.name === 'min_price')) {
      db.prepare("ALTER TABLE items ADD COLUMN min_price DECIMAL(18,4) DEFAULT 0").run();
      console.log("[DB] Added 'min_price' to items table.");
    }

    if (!itemCols.some((col: any) => col.name === 'tax_included')) {
      db.prepare("ALTER TABLE items ADD COLUMN tax_included INTEGER DEFAULT 0").run();
      console.log("[DB] Added 'tax_included' to items table.");
    }

    if (!itemCols.some((col: any) => col.name === 'max_stock')) {
      db.prepare("ALTER TABLE items ADD COLUMN max_stock DECIMAL(18,4) DEFAULT 0").run();
      console.log("[DB] Added 'max_stock' to items table.");
    }

    if (!itemCols.some((col: any) => col.name === 'description')) {
      db.prepare("ALTER TABLE items ADD COLUMN description TEXT").run();
      console.log("[DB] Added 'description' to items table.");
    }

    if (!itemCols.some((col: any) => col.name === 'image_url')) {
      db.prepare("ALTER TABLE items ADD COLUMN image_url TEXT").run();
      console.log("[DB] Added 'image_url' to items table.");
    }

  } catch (e) {
    console.error("[DB] Failed to migrate items table", e);
  }

  // MIGRATION: Add commission_account_id to bank_accounts (Fix for Add Bank Bug)
  try {
    const baCols = db.prepare("PRAGMA table_info(bank_accounts)").all();
    if (baCols.length > 0 && !baCols.some((c: any) => c.name === 'commission_account_id')) {
      db.prepare("ALTER TABLE bank_accounts ADD COLUMN commission_account_id TEXT").run();
      console.log("[DB] Added 'commission_account_id' to bank_accounts");
    }
  } catch (e) {
    console.error("[DB] Failed to add commission_account_id", e);
  }

  // MIGRATION: Fix Business Partners FK (gl_chart_of_accounts -> accounts)
  // Check if we need migration: Try to insert dummy with valid account ID, if it fails with FK error, we need fix?
  // Or just check table info.
  // Safer: Just recreate the table structure if we suspect it's wrong.
  // To be safe and idempotent, we check if we already fixed it? Hard to detect constraint name in SQLite.
  // We will perform the migration if 'business_partners' exists.
  try {
    db.exec("PRAGMA foreign_keys=OFF;");

    db.transaction(() => {
      // Drop dependent views first to avoid errors during table rename
      db.exec("DROP VIEW IF EXISTS view_partner_ledger");

      // 1. Rename old table
      // Check if temp table exists from failed previous run
      db.exec("DROP TABLE IF EXISTS business_partners_backup_fix_fk");

      // We can't easily rename because of existing indexes/triggers maybe? 
      // Better: Create NEW table, Copy, Drop Old, Rename New.

      db.exec(`
            CREATE TABLE IF NOT EXISTS business_partners_new_fix (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE,
                name_ar TEXT NOT NULL,
                name_en TEXT,
                type TEXT NOT NULL,
                phone TEXT,
                mobile TEXT,
                email TEXT,
                address TEXT,
                city TEXT,
                tax_number TEXT,
                
                linked_account_id TEXT, 
                credit_limit DECIMAL(18,4) DEFAULT 0, 
                payment_term_days INTEGER DEFAULT 0, 
                price_list_id TEXT, 
                
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                -- V19 Columns
                region_id TEXT,
                group_id TEXT,
                sales_rep_id TEXT,
                website TEXT,
                credit_days INTEGER,
                
                -- Corrected FK
                FOREIGN KEY (linked_account_id) REFERENCES accounts(id),
                FOREIGN KEY (region_id) REFERENCES regions(id),
                FOREIGN KEY (group_id) REFERENCES customer_groups(id),
                FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(id)
            );
          `);

      // Copy Data
      // We use INSERT OR IGNORE to avoid primary key collisions if something weird happens, 
      // but we want to transfer data.
      // Note: We need to match columns. unique name conflict might occur if we are not careful.
      // 'INSERT INTO ... SELECT * FROM ...' works if columns match exactly.
      // Since we might have extra columns in old table or new table, explicit column list is safer.
      // But hard to maintain.
      // Assumption: The schema matches the accumulation of v2 + v19.

      // Let's try flexible copy:
      // We can't do dynamic SQL in this environment easily.
      // We will rely on matching names.

      const columns = [
        'id', 'code', 'name_ar', 'name_en', 'type', 'phone', 'mobile', 'email', 'address', 'city', 'tax_number',
        'linked_account_id', 'credit_limit', 'payment_term_days', 'price_list_id', 'is_active', 'created_at',
        'region_id', 'group_id', 'sales_rep_id', 'website', 'credit_days'
      ];

      const colString = columns.join(',');

      // Check if old table exists
      const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='business_partners'").get();
      if (exists) {
        console.log("[DB] Migrating business_partners to fix Foreign Key...");

        // We need to verify if source table has all these columns.
        // If not, we might fail.
        // Simple heuristic: Copy what we can.
        // Actually, simply renaming old to backup and creating new is safer.

        db.exec("ALTER TABLE business_partners RENAME TO business_partners_backup_fix_fk");
        db.exec(`INSERT INTO business_partners_new_fix (${colString}) SELECT ${colString} FROM business_partners_backup_fix_fk`);
        db.exec("DROP TABLE business_partners_backup_fix_fk");
      }

      db.exec("ALTER TABLE business_partners_new_fix RENAME TO business_partners");

      // Recreate Indexes ?? 
      // code is unique constraint, so index created.
    })();

    db.exec("PRAGMA foreign_keys=ON;");

    // Recreate the view that was dropped during migration
    loadSchema('database/schema_v7_views.sql', 'Schema V7 (Reports Views) - Recreate after FK fix');

    console.log("[DB] Fixed business_partners Foreign Key constraint.");

  } catch (e: any) {
    // If error (e.g. column missing in old table), log it.
    // If "no such column", it means our Assumption on V19 columns was wrong or user didn't have them yet.
    // This is acceptable, we abort migration then.
    console.error("[DB] FK Fix Migration Failed (This is expected if table structure varies):", e.message);

    // Rollback (Sort of): If we renamed old table, restore it.
    try {
      db.exec("DROP TABLE IF EXISTS business_partners_new_fix");
      const backupExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='business_partners_backup_fix_fk'").get();
      if (backupExists) {
        db.exec("ALTER TABLE business_partners_backup_fix_fk RENAME TO business_partners");
      }
    } catch (rollbackErr) {
      console.error("[DB] Rollback failed:", rollbackErr);
    }
  }

  // DEBUG: Dump Schema to file
  try {
    const fs = require('fs');
    const path = require('path');
    const objects = db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master").all();
    let output = '';
    for (const obj of objects) {
      output += `TYPE: ${obj.type}\nNAME: ${obj.name}\nTBL_NAME: ${obj.tbl_name}\nSQL: ${obj.sql}\n----------------------------------------\n`;
    }
    fs.writeFileSync('C:\\WAFI ERP\\schema_dump.txt', output);
    console.log(`[DEBUG] Dumped ${objects.length} objects to schema_dump.txt`);
  } catch (e) {
    console.error("[DEBUG] Dump failed", e);
  }

  console.log("Database initialized with System Admin tables.");
  return db;
};

export function seedSystem() {
  // 1. Seed Main Branch
  const mainBranch = db.prepare("SELECT * FROM branches WHERE is_main = 1").get();
  let branchId = mainBranch?.id;

  if (!branchId) {
    branchId = uuidv4();
    db.prepare("INSERT INTO branches (id, name_ar, name_en, is_main, type) VALUES (?, ?, 'Main Branch', 1, 'MAIN')").run(branchId, "الفرع الرئيسي");
  }

  // 2. Seed Admin Role
  const adminRole = db.prepare("SELECT * FROM roles WHERE name = 'مدير النظام'").get();
  let roleId = adminRole?.id;

  if (!roleId) {
    roleId = uuidv4();
    // Try to update old 'Admin' if exists to avoid creating duplicate
    const oldAdmin = db.prepare("SELECT * FROM roles WHERE name = 'Admin'").get();
    if (oldAdmin) {
      db.prepare("UPDATE roles SET name = 'مدير النظام', description = 'مدير النظام بصلاحيات كاملة' WHERE id = ?").run(oldAdmin.id);
      roleId = oldAdmin.id;
    } else {
      db.prepare("INSERT INTO roles (id, name, description) VALUES (?, 'مدير النظام', 'مدير النظام بصلاحيات كاملة')").run(roleId);
    }

    // Grant all permissions (*.*) - logic handled in app
  }

  // 3. Seed Admin User (Default: admin / admin123)
  // Note: In production, use bcrypt. For now, simple hash or plain for demo (I'll use a simple indicator)
  // For this prototype, I'll store plain text 'admin123' but prefix with 'plain:' to indicate weak security, 
  // or just assume the AuthService will handle hashing.
  const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  if (!adminUser) {
    db.prepare(`
            INSERT INTO users (id, username, password_hash, full_name, role_id, branch_id) 
            VALUES (?, 'admin', 'admin123', 'System Administrator', ?, ?)
        `).run(uuidv4(), roleId, branchId);
    console.log("Default Admin user created: admin / admin123");
  }
};

function seedCurrencies(db: any) {
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
        db.prepare('INSERT INTO currencies (id, code, name_ar, name_en, exchange_rate, symbol) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), c.code, c.name, c.name_en, c.factor, c.symbol);
        console.log(`Seeded Currency: ${c.code}`);
      }
    } catch (e) {
      console.error("Error seeding currency " + c.code, e);
    }
  });
}



function seedExtensions(db: any) {
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
    const columns = info.map((c: any) => c.name);
    if (!columns.includes('is_clearing_invoice')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN is_clearing_invoice INTEGER DEFAULT 0");
    if (!columns.includes('clearing_dealer_number')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN clearing_dealer_number TEXT");
    if (!columns.includes('clearing_hebrew_name')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN clearing_hebrew_name TEXT");
    if (!columns.includes('clearing_original_date')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN clearing_original_date TEXT");
    if (!columns.includes('shipment_id')) db.exec("ALTER TABLE purchase_invoices ADD COLUMN shipment_id TEXT");
  } catch (e) {
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
    if (!cols.some((c: any) => c.name === 'request_id')) {
      db.prepare("ALTER TABLE purchase_orders ADD COLUMN request_id TEXT").run();
      console.log("[DB] Added 'request_id' to purchase_orders.");
    }
  } catch (e) {
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

export const seedCOA = () => {
  console.log("Seeding/Updating Detailed Chart of Accounts (UUID Mode)...");

  // Account Seeding Data (Same structure, but we will generate UUIDs)
  const accounts = [
    // 1. Assets
    { code: '1', name: 'الأصول', type: 'Asset' },
    { code: '11', name: 'الأصول المتداولة', type: 'Asset' },
    { code: '111', name: 'النقدية وما في حكمها', type: 'Asset' },
    { code: '1110', name: 'البنوك - شيكل', type: 'Asset' },
    { code: '11101', name: 'البنك العربي - شيكل', type: 'Asset' },
    { code: '11102', name: 'بنك فلسطين - شيكل', type: 'Asset' },
    { code: '1112', name: 'البنك العربي - شيكل (قديم)', type: 'Asset' },
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

  const insert = db.prepare(`
    INSERT OR IGNORE INTO accounts(id, code, name, type, balance, parent_id, account_level, is_transactional)
  VALUES(@id, @code, @name, @type, @balance, @parent_id, @account_level, @is_transactional)
    `);

  const codeToIdMap = new Map<string, string>();

  // Use transaction for speed
  const insertMany = db.transaction((rows: any[]) => {
    // Sort to ensure parents exist before trying to map them (though we map by code now)
    rows.sort((a, b) => a.code.length - b.code.length);

    for (const row of rows) {
      // Check existence first to avoid re-generating UUID for existing account
      const existing = db.prepare('SELECT id FROM accounts WHERE code = ?').get(row.code) as { id: string };

      let id = existing ? existing.id : uuidv4();

      // Store in map for children to use
      codeToIdMap.set(row.code, id);

      // Parent Resolution
      let parentId = null;
      if (row.code.length > 1) {
        const parentCode = row.code.substring(0, row.code.length - 1); // Simple digit hierarchy logic
        if (codeToIdMap.has(parentCode)) {
          parentId = codeToIdMap.get(parentCode);
        } else {
          // Fallback: Check DB if not in current batch
          const parentInDb = db.prepare('SELECT id FROM accounts WHERE code = ?').get(parentCode) as { id: string };
          if (parentInDb) parentId = parentInDb.id;
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

function seedAssetCategories(db: any) {
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
      `).run(uuidv4(), cat.code, cat.name_ar, cat.name_en, cat.rate);
      console.log(`Seeded Asset Category: ${cat.name_en} `);
    }
  });
}


