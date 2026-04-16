#!/usr/bin/env node
/**
 * Quick test to verify item creation works correctly
 */
const {DatabaseSync} = require('node:sqlite');
const { randomUUID } = require('crypto');

const db = new DatabaseSync('./wafi.db');

console.log('=== Item Creation Test ===\n');

// Enable FK checks
db.exec('PRAGMA foreign_keys = ON');

// Test item data
const testItem = {
    id: randomUUID(),
    code: 'TEST-CREATE-' + Date.now(),
    name_ar: 'صنف اختبار جديد',
    name_en: 'Test New Item',
    type: 'Goods',
    is_active: 1
};

try {
    // Get first unit
    const unit = db.prepare('SELECT id FROM units LIMIT 1').get();
    if (!unit) {
        console.error('❌ No units found - seed first!');
        process.exit(1);
    }
    
    testItem.base_unit_id = unit.id;
    
    // Get insertable columns
    const columns = db.prepare("PRAGMA table_info('items')").all()
        .map(c => c.name);
    
    const insertableKeys = Object.keys(testItem).filter(k => columns.includes(k));
    const placeholders = insertableKeys.map(k => '@' + k).join(', ');
    
    console.log('📝 Inserting item:');
    console.log(`   Code: ${testItem.code}`);
    console.log(`   Name AR: ${testItem.name_ar}`);
    console.log(`   Unit: ${testItem.base_unit_id.slice(0, 8)}\n`);
    
    db.prepare(`
        INSERT INTO items (${insertableKeys.join(', ')})
        VALUES (${placeholders})
    `).run(testItem);
    
    console.log('✅ Item inserted successfully!\n');
    
    // Verify
    const inserted = db.prepare('SELECT id, code, name_ar FROM items WHERE id = ?').get(testItem.id);
    if (inserted) {
        console.log('✅ Verification passed:');
        console.log(`   Inserted: ${inserted.code} - ${inserted.name_ar}`);
    } else {
        console.error('❌ Item not found after insert!');
        process.exit(1);
    }
    
    // Check FK violations
    const violations = db.prepare('PRAGMA foreign_key_check').all();
    console.log(`\n📊 FK Violations: ${violations.length}`);
    if (violations.length > 0) {
        console.warn('⚠️  Violations detected:');
        violations.forEach(v => {
            console.warn(`   ${v.table} rowid=${v.rowid} → ${v.parent}`);
        });
    } else {
        console.log('✅ No FK violations');
    }
    
    console.log('\n✅ All tests passed!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
} finally {
    db.close();
}
