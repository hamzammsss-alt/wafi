#!/usr/bin/env node
/**
 * Test script to verify ScreenViewsService.apply() returns data
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Simple mock imports
const dbPath = path.join(__dirname, '..', 'wafi.db');
const db = new DatabaseSync(dbPath);

console.log('=== Testing Item List Query ===\n');
console.log(`Database: ${dbPath}\n`);

// Test the exact SQL that ScreenViewsService should generate
const query = `
    SELECT 
        i.id,
        COALESCE(i.code, '') as code,
        COALESCE(i.name_ar, '') as name_ar,
        COALESCE(i.name_en, '') as name_en,
        COALESCE(i.type, '') as type,
        COALESCE(u.name_ar, u.name_en, u.code, '') as base_unit_name,
        CAST(COALESCE(i.sale_price, 0) AS REAL) as sale_price,
        CAST(COALESCE(i.is_active, 1) AS INTEGER) as is_active
    FROM items i
    LEFT JOIN units u ON u.id = i.base_unit_id
    ORDER BY i.code
    LIMIT 10
`;

try {
    const rows = db.prepare(query).all();
    
    console.log(`✅ Query executed successfully`);
    console.log(`📊 Results: ${rows.length} rows\n`);
    
    if (rows.length === 0) {
        console.log('⚠️  WARNING: No rows returned!');
    } else {
        console.log('Rows:');
        rows.forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.code} - ${row.name_ar} (${row.name_en})`);
            console.log(`   Unit: ${row.base_unit_name}, Price: ${row.sale_price}, Active: ${row.is_active}\n`);
        });
    }
    
    // Try without JOIN to isolate the problem
    console.log('\n=== Testing Simple Items Query (no JOIN) ===\n');
    const simpleRows = db.prepare('SELECT id, code, name_ar, name_en, type, is_active FROM items LIMIT 10').all();
    console.log(`Simple query results: ${simpleRows.length} rows`);
    if (simpleRows.length > 0) {
        console.log('✅ Items table has data');
        simpleRows.forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.code} - ${row.name_ar}`);
        });
    } else {
        console.log('❌ Items table is empty!');
    }
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
} finally {
    db.close();
}

console.log('\n✅ Test complete!');
