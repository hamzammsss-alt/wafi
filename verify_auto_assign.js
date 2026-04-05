const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Connect DB
const userHome = process.env.USERPROFILE || 'C:\\Users\\Ahmad Sultan';
const dbPath = path.join(userHome, 'AppData', 'Roaming', 'wafi-erp', 'wafi.db');
const db = new Database(dbPath, { fileMustExist: true });

// MOCK AccountService and SystemService logic since we can't import TS files in raw node directly easily without build
// We only need the DB logic part or we can run a minimal ts-node if available, but raw node is safer.
// So we will REPLICATE the logic of PartnerService here to test the CONCEPT/DB STATE works.

// 1. Ensure 1131 exists
let account1131 = db.prepare("SELECT * FROM gl_chart_of_accounts WHERE account_code = '1131'").get();
if (!account1131) {
    console.log("Account 1131 not found. Creating it as Header...");
    const id = uuidv4();
    db.prepare("INSERT INTO gl_chart_of_accounts (id, account_code, name_ar, account_type, account_level, is_transactional, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        id, '1131', 'ذمم تجارية', 'ASSET', 3, 0, null
    );
    account1131 = { id };
    console.log("Created 1131.");
} else if (account1131.is_transactional === 1) {
    console.log("WARNING: 1131 is transactional! Making it header for test.");
    db.prepare("UPDATE gl_chart_of_accounts SET is_transactional = 0 WHERE id = ?").run(account1131.id);
}

// 2. Prepare Data (Mock Frontend Submission)
const partnerData = {
    id: uuidv4(),
    name_ar: 'العميل الآلي التجريبي',
    type: 'CUSTOMER',
    linked_account_id: account1131.id, // User sends PARENT ID
    code: 'AUTO-001'
};

console.log("Simulating Partner Creation with Parent ID:", partnerData.linked_account_id);

// 3. Simulate PartnerService Logic (The part we changed)
let finalLinkedId = partnerData.linked_account_id;
const linkedAcc = db.prepare('SELECT id, is_transactional, account_code FROM gl_chart_of_accounts WHERE id = ?').get(partnerData.linked_account_id);

if (linkedAcc && linkedAcc.is_transactional === 0) {
    console.log("DETECTED PARENT ACCOUNT. Auto-creating sub-account...");

    // Logic from PartnerService
    const parentId = linkedAcc.id;
    const parentCode = linkedAcc.account_code;

    // Find Max Suffix
    const siblings = db.prepare("SELECT account_code FROM gl_chart_of_accounts WHERE parent_id = ?").all(parentId);
    let maxSuffix = 0;
    siblings.forEach(s => {
        if (s.account_code.startsWith(parentCode)) {
            const suffix = parseInt(s.account_code.slice(parentCode.length));
            if (!isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
        }
    });

    const nextCode = parentCode + (maxSuffix + 1).toString().padStart(4, '0');
    console.log("New Account Code:", nextCode);

    // Create Account
    const newId = uuidv4();
    db.prepare(`
        INSERT INTO gl_chart_of_accounts (id, account_code, name_ar, name_en, parent_id, account_type, is_transactional, system_type, requires_cost_center)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        newId, nextCode, partnerData.name_ar, null, parentId, 'ASSET', 1, 'CUSTOMER', 0
    );

    finalLinkedId = newId;
    console.log("Created Sub-Account ID:", newId);
}

// 4. Save Partner
db.prepare("INSERT INTO business_partners (id, code, name_ar, type, linked_account_id, is_active) VALUES (?, ?, ?, ?, ?, 1)").run(
    partnerData.id, partnerData.code, partnerData.name_ar, partnerData.type, finalLinkedId
);

console.log("Partner Saved.");

// 5. Verify
const savedPartner = db.prepare("SELECT * FROM business_partners WHERE id = ?").get(partnerData.id);
const savedAccount = db.prepare("SELECT * FROM gl_chart_of_accounts WHERE id = ?").get(savedPartner.linked_account_id);

console.log("--- VERIFICATION ---");
console.log("Partner Linked Account ID:", savedPartner.linked_account_id);
console.log("Is Original Parent?", savedPartner.linked_account_id === account1131.id ? "YES (FAIL)" : "NO (PASS)");
console.log("Linked Account Code:", savedAccount.account_code);
console.log("Linked Account Name:", savedAccount.name_ar);
console.log("Linked Account Parent:", savedAccount.parent_id === account1131.id ? "CORRECT" : "WRONG");

// Clean up
db.prepare("DELETE FROM business_partners WHERE id = ?").run(partnerData.id);
if (finalLinkedId !== account1131.id) {
    db.prepare("DELETE FROM gl_chart_of_accounts WHERE id = ?").run(finalLinkedId);
}
