
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to the database file (assuming dev environment)
const dbPath = path.join('c:/wafi/database/wafi.db'); // Adjust if necessary based on where main.ts initializes it

// Check if DB exists
if (!fs.existsSync(dbPath)) {
    // Try default location if dist-electron/../database/wafi.db logic was used
    console.log(`Database not found at ${dbPath}`);
    // Attempt standard electron path logic from earlier analysis might be hard to replicate exactly without running electron, 
    // but typically it's in user data or adjacent to resources.
    // Based on 'seed_palestine.ts' it seems it might be just 'wafi.db' in root or similar. 
    // Let's suspect it is created relative to CWD if not specified absolute.
}

try {
    const db = new Database('wafi.db', { verbose: console.log });

    const user = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();

    if (user) {
        console.log("SUCCESS: Admin user found.");
        console.log(`Username: ${user.username}`);
        console.log(`Password Hash: ${user.password_hash}`);
        console.log(`Role ID: ${user.role_id}`);
    } else {
        console.error("FAILURE: Admin user NOT found.");
    }

    const branches = db.prepare("SELECT * FROM branches").all();
    console.log(`Branches count: ${branches.length}`);

} catch (err) {
    console.error("Database Error:", err);
}
