import db from 'better-sqlite3';

const database = new db('wafi.db');

database.exec(`
    CREATE TABLE IF NOT EXISTS currencies (
        id TEXT PRIMARY KEY, 
        code TEXT NOT NULL, 
        company_id TEXT NOT NULL, 
        name TEXT NOT NULL, 
        symbol TEXT, 
        exchange_rate REAL NOT NULL DEFAULT 1, 
        is_base_currency INTEGER DEFAULT 0, 
        is_active INTEGER DEFAULT 1, 
        decimal_places INTEGER DEFAULT 2
    );
`);
console.log('Currencies table created/verified successfully.');
