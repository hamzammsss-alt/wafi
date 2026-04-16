const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Running Sales Invoice & Sequences Migrations...');

try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS doc_sequences (
      doc_type TEXT PRIMARY KEY,
      next_no INTEGER NOT NULL DEFAULT 1
    );
  `);
    console.log('Created doc_sequences table.');

    // Seed sales invoice sequence
    db.prepare(`INSERT OR IGNORE INTO doc_sequences (doc_type, next_no) VALUES ('sales_invoice', 1)`).run();

    db.exec(`
    CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      invoice_no TEXT UNIQUE,
      date TEXT,
      doc_date TEXT,
      customer_id TEXT,
      customer_name TEXT,
      subtotal REAL DEFAULT 0,
      tax_total REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      currency_id TEXT,
      exchange_rate REAL DEFAULT 1,
      notes TEXT,
      status TEXT DEFAULT 'DRAFT',
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      submitted_at DATETIME,
      submitted_by TEXT,
      posted_at DATETIME,
      posted_by TEXT,
      rejected_at DATETIME,
      rejected_by TEXT,
      rejection_reason TEXT,
      branch_id TEXT
    );
  `);
    console.log('Created sales_invoices table.');

    db.exec(`
    CREATE TABLE IF NOT EXISTS sales_invoice_lines (
      id TEXT PRIMARY KEY,
      invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE CASCADE,
      line_no INTEGER NOT NULL,
      item_id TEXT,
      description TEXT,
      quantity REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_total REAL DEFAULT 0
    );
  `);
    console.log('Created sales_invoice_lines table.');

    // Indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_si_status_date_id ON sales_invoices(status, date, id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_si_customer ON sales_invoices(customer_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sil_invoice_id ON sales_invoice_lines(invoice_id)`);

    console.log('Migrations completed successfully.');
} catch (err) {
    console.error('Migration failed:', err);
} finally {
    db.close();
}
