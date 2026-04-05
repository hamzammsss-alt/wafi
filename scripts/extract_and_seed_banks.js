const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// Configuration
const HTML_FILE_PATH = 'D:/download/البنوك والفروع (الكل).html';
const DB_PATH = path.join(__dirname, '../wafi.db');

// Main Execution
const run = () => {
    console.log(`[Start] Extracting banks from: ${HTML_FILE_PATH}`);

    if (!fs.existsSync(HTML_FILE_PATH)) {
        console.error(`[Error] File not found: ${HTML_FILE_PATH}`);
        process.exit(1);
    }

    // 1. Read HTML
    const htmlContent = fs.readFileSync(HTML_FILE_PATH, 'utf8');
    const $ = cheerio.load(htmlContent);

    // 2. Open Database
    console.log(`[DB] Connecting to: ${DB_PATH}`);
    const db = new Database(DB_PATH);

    // 3. Prepare Statement
    // Ensure table exists (Schema from database.ts)
    db.exec(`
        CREATE TABLE IF NOT EXISTS banks (
          id TEXT PRIMARY KEY,
          name_ar TEXT NOT NULL,
          name_en TEXT,
          swift_code TEXT,
          is_local INTEGER DEFAULT 1,
          bank_code TEXT,
          branch_code TEXT,
          name_he TEXT,
          routing_no TEXT,
          address TEXT
        );
    `);

    // Schema: id, name_ar, name_en, swift_code, is_local, bank_code, branch_code, name_he, routing_no, address

    // Note: branch_code can be empty for main bank entries.
    const checkStmt = db.prepare('SELECT id FROM banks WHERE bank_code = ? AND branch_code = ?');
    const insertStmt = db.prepare(`
        INSERT INTO banks (id, name_ar, name_en, name_he, bank_code, branch_code, swift_code, routing_no, address, is_local)
        VALUES (@id, @name_ar, @name_en, @name_he, @bank_code, @branch_code, @swift_code, @routing_no, @address, 1)
    `);
    const updateStmt = db.prepare(`
        UPDATE banks SET 
            name_ar = @name_ar,
            name_en = @name_en,
            name_he = @name_he,
            swift_code = @swift_code,
            routing_no = @routing_no,
            address = @address
        WHERE id = @id
    `);

    // 4. Parse Rows
    const rows = $('table.list tr');
    console.log(`[Parse] Found ${rows.length} rows.`);

    let validCount = 0;
    let insertedCount = 0;
    let updatedCount = 0;

    db.transaction(() => {
        rows.each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length === 0) return;

            // Check if header row (often has class 'tableHeader' or text match)
            if ($(el).find('.tableHeader').length > 0) return;

            // Helper to get text safely
            const txt = (idx) => $(tds[idx]).text().trim();

            const bankCode = txt(1);
            const branchCode = txt(2);

            // Skip invalid rows (e.g. if bank code is missing)
            if (!bankCode || bankCode === '00' || bankCode === 'بنك') return;

            // Mapping based on analysis:
            // 1: Bank Code
            // 2: Branch Code
            // 3: Full Name (Arabic usually) -> Use for name_ar
            // 6: English Name -> name_en
            // 7: Hebrew Name -> name_he
            // 17: Swift
            // 18: Routing
            // 19: Address

            const data = {
                bank_code: bankCode,
                branch_code: branchCode || '', // Ensure empty string if null
                name_ar: txt(3), // Full Name
                name_en: txt(6),
                name_he: txt(7),
                swift_code: txt(17),
                routing_no: txt(18),
                address: txt(19)
            };

            // Heuristic data cleaning
            // If name_en is empty, maybe use name_ar transliteration? No, leave empty.

            validCount++;

            // Check existence
            const existing = checkStmt.get(data.bank_code, data.branch_code);

            if (existing) {
                // Update
                updateStmt.run({ ...data, id: existing.id });
                updatedCount++;
            } else {
                // Insert
                insertStmt.run({ ...data, id: uuidv4() });
                insertedCount++;
            }

            if (validCount % 100 === 0) {
                console.log(`[Progress] Processed ${validCount} records...`);
            }
        });
    })();

    console.log(`[Done] Processed: ${validCount}, Inserted: ${insertedCount}, Updated: ${updatedCount}`);
};

run();
