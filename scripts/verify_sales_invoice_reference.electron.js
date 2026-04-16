const fs = require('fs');
const path = require('path');
const BetterSqlite3 = require('better-sqlite3');
const database = require('../dist-electron/electron/database');
const { SalesInvoiceService } = require('../dist-electron/electron/services/SalesInvoiceService');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function setupTestDb(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS doc_sequences (
            doc_type TEXT PRIMARY KEY,
            next_no INTEGER NOT NULL DEFAULT 1
        );
        INSERT OR IGNORE INTO doc_sequences(doc_type, next_no) VALUES ('sales_invoice', 1);

        CREATE TABLE IF NOT EXISTS branches (
            id TEXT PRIMARY KEY,
            is_main INTEGER DEFAULT 0
        );
        INSERT OR IGNORE INTO branches(id, is_main) VALUES ('BR_TEST', 1);

        CREATE TABLE IF NOT EXISTS business_partners (
            id TEXT PRIMARY KEY,
            name_ar TEXT,
            name_en TEXT,
            type TEXT,
            code TEXT,
            phone TEXT
        );

        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            code TEXT,
            name_ar TEXT,
            sale_price REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            tax_included INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sales_invoices (
            id TEXT PRIMARY KEY,
            invoice_no TEXT UNIQUE,
            status TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            date TEXT,
            doc_date TEXT,
            customer_id TEXT,
            customer_name TEXT,
            currency_id TEXT,
            exchange_rate REAL DEFAULT 1,
            subtotal REAL DEFAULT 0,
            tax_total REAL DEFAULT 0,
            grand_total REAL DEFAULT 0,
            notes TEXT,
            created_by TEXT,
            created_at TEXT,
            submitted_by TEXT,
            submitted_at TEXT,
            posted_by TEXT,
            posted_at TEXT,
            rejected_by TEXT,
            rejected_at TEXT,
            rejection_reason TEXT,
            branch_id TEXT
        );

        CREATE TABLE IF NOT EXISTS sales_invoice_lines (
            id TEXT PRIMARY KEY,
            invoice_id TEXT NOT NULL,
            line_no INTEGER DEFAULT 0,
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

        CREATE TABLE IF NOT EXISTS document_audit (
            id TEXT PRIMARY KEY,
            document_id TEXT,
            doc_type TEXT,
            action TEXT,
            from_status TEXT,
            to_status TEXT,
            acted_by TEXT,
            acted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS approval_rules (
            id TEXT PRIMARY KEY,
            doc_type TEXT,
            min_amount REAL DEFAULT 0,
            level INTEGER DEFAULT 1
        );
    `);

    // Force L2 routing to verify approval integration branch.
    db.prepare(`DELETE FROM approval_rules WHERE doc_type = 'sales_invoice'`).run();
    db.prepare(`
        INSERT INTO approval_rules (id, doc_type, min_amount, level)
        VALUES ('rule_sales_l2', 'sales_invoice', 0, 2)
    `).run();
}

function runVerification() {
    const tmpDbPath = path.resolve('tmp_sales_invoice_reference.db');
    if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);

    const conn = new BetterSqlite3(tmpDbPath);
    database.db = conn;
    setupTestDb(conn);
    SalesInvoiceService.ensureSchema();

    // F2: create -> save -> F9 post
    const draft = SalesInvoiceService.createDraft('qa_user');
    assert(draft.id && draft.status === 'DRAFT', 'Draft creation failed');

    const saved = SalesInvoiceService.save({
        id: draft.id,
        header: {
            doc_date: '2026-03-03',
            customer_name: 'QA Customer',
            notes: 'automation smoke',
        },
        lines: [
            { item_name: 'QA Item', qty: 2, price: 10, discount: 0, tax_rate: 15 },
        ],
        userId: 'qa_user',
    });
    assert(saved && saved.header && saved.header.id === draft.id, 'Save flow failed');
    assert(Number(saved.header.grand_total || 0) > 0, 'Grand total not calculated');

    const posted = SalesInvoiceService.postOrSubmit(draft.id, 'qa_user', true);
    assert(posted.status === 'POSTED', 'F9 post flow failed');

    // F3: workflow integration (no post permission => submit to pending approval)
    const draft2 = SalesInvoiceService.createDraft('qa_user');
    SalesInvoiceService.save({
        id: draft2.id,
        header: {
            doc_date: '2026-03-03',
            customer_name: 'QA Customer 2',
        },
        lines: [
            { item_name: 'QA Item 2', qty: 1, price: 50, discount: 0, tax_rate: 0 },
        ],
        userId: 'qa_user',
    });

    const submitted = SalesInvoiceService.postOrSubmit(draft2.id, 'qa_user', false);
    assert(submitted.action === 'submitted', 'Expected submit action without post permission');
    assert(submitted.status === 'PENDING_APPROVAL_L2', `Expected L2 pending, got: ${submitted.status}`);

    const auditCount = conn
        .prepare("SELECT COUNT(1) AS cnt FROM document_audit WHERE document_id = ? AND doc_type = 'sales_invoice'")
        .get(draft2.id);
    assert(Number(auditCount?.cnt || 0) > 0, 'Expected audit trail record for submit flow');

    console.log('[verify_sales_invoice_reference] OK');
    console.log(`  posted_invoice_id: ${draft.id}`);
    console.log(`  submitted_invoice_id: ${draft2.id} (${submitted.status})`);

    conn.close();
}

try {
    runVerification();
    process.exit(0);
} catch (e) {
    console.error('[verify_sales_invoice_reference] FAILED:', e && e.message ? e.message : e);
    process.exit(1);
}

