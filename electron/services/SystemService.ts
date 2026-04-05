import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { db } from '../database';

export class SystemService {

    // We will inject the dbPath from main.ts if needed, or deduce it
    static dbPath = path.join(app.getPath('userData'), 'wafi.db');

    static async backupDatabase() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultName = `wafi-backup-${timestamp}.db`;

        const { filePath } = await dialog.showSaveDialog({
            title: 'حفظ نسخة احتياطية',
            defaultPath: path.join(app.getPath('documents'), defaultName),
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (filePath) {
            try {
                fs.copyFileSync(this.dbPath, filePath);
                return { success: true, path: filePath };
            } catch (err: any) {
                console.error("Backup Failed:", err);
                throw new Error("فشل إنشاء النسخة الاحتياطية: " + err.message);
            }
        }
        return { success: false }; // Cancelled
    }

    static async restoreDatabase() {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'استرجاع نسخة احتياطية',
            filters: [{ name: 'SQLite Database', extensions: ['db'] }],
            properties: ['openFile']
        });

        if (filePaths && filePaths.length > 0) {
            const source = filePaths[0];
            try {
                // Return path to main process for handling
                return { success: true, filePath: source };
            } catch (err: any) {
                throw new Error("Restore Failed: " + err.message);
            }
        }
        return { success: false };
    }

    // --- Audit Logs ---

    static getAuditLogs(filters: any = {}) {
        let query = `
            SELECT a.*, u.username 
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (filters.action) {
            query += ' AND action = ?';
            params.push(filters.action);
        }

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        query += ' ORDER BY timestamp DESC LIMIT 100';

        return db.prepare(query).all(...params);
    }

    // --- Settings ---

    static getSettings() {
        // Return object { key: value }
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings: any = {};
        rows.forEach((r: any) => {
            settings[r.key] = r.value;
        });
        return settings;
    }

    static saveSettings(settings: any) {
        const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (@key, @value, CURRENT_TIMESTAMP)');
        const runTransaction = db.transaction(() => {
            for (const [key, value] of Object.entries(settings)) {
                insert.run({ key, value: String(value) });
            }
        });
        runTransaction();
        return { success: true };
    }

    // --- Maintenance ---

    // --- Assets ---

    static async saveLogo(buffer: Buffer | ArrayBuffer, originalName: string) {
        try {
            // Fix: explicit cast or check to satisfy TS overloads
            const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
            const uploadsDir = path.join(app.getPath('userData'), 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const ext = path.extname(originalName);
            const fileName = `company-logo-${Date.now()}${ext}`;
            const filePath = path.join(uploadsDir, fileName);

            fs.writeFileSync(filePath, buf);

            // Return wafi:// URL for local display
            return { success: true, path: `wafi://${fileName}` };
        } catch (err: any) {
            console.error("Save Logo Failed:", err);
            throw new Error("فشل حفظ الشعار: " + err.message);
        }
    }

    static async saveImage(buffer: Buffer | ArrayBuffer, originalName: string) {
        try {
            const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
            const uploadsDir = path.join(app.getPath('userData'), 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const ext = path.extname(originalName);
            const fileName = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
            const filePath = path.join(uploadsDir, fileName);

            fs.writeFileSync(filePath, buf);

            return { success: true, path: `wafi://${fileName}` };
        } catch (err: any) {
            console.error("Save Image Failed:", err);
            throw new Error("فشل حفظ الصورة: " + err.message);
        }
    }

    static checkIntegrity() {
        try {
            // [FIX] Cleanup rogue triggers manually (specifically for the backup_fix_fk error)
            try {
                const rogueTriggers = db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND sql LIKE '%business_partners_backup_fix_fk%'").all();
                rogueTriggers.forEach((t: any) => {
                    db.prepare(`DROP TRIGGER IF EXISTS ${t.name}`).run();
                    console.log(`[Integrity] Dropped rogue trigger: ${t.name}`);
                });
            } catch (err: any) {
                console.warn('[Integrity] Trigger cleanup warning:', err.message);
            }

            // 1. Integrity Check
            const integrity = db.pragma('integrity_check', { simple: true });
            if (integrity !== 'ok') {
                throw new Error(`Database integrity check failed: ${integrity}`);
            }

            // 2. Optimize (VACUUM)
            db.exec('VACUUM');

            // 3. Analyze (Update Statistics)
            db.exec('ANALYZE');

            return { success: true, message: 'Database is healthy and optimized.' };
        } catch (e: any) {
            console.error('Integrity Check Failed:', e);
            throw e;
        }
    }

    // --- Dashboard Data ---

    static getDashboardKPIs() {
        try {
            // Get sales from journal entries (credit side of revenue accounts)
            let sales = 0;
            try {
                const salesResult = db.prepare(`
                    SELECT COALESCE(SUM(credit), 0) as total
                    FROM journal_entry_lines jel
                    JOIN journal_entries je ON jel.journal_entry_id = je.id
                    JOIN gl_chart_of_accounts acc ON jel.account_id = acc.id
                    WHERE acc.account_code LIKE '4%'
                    AND DATE(je.date) = DATE('now')
                    AND je.status = 'Posted'
                `).get() as any;
                sales = salesResult?.total || 0;
            } catch (e) {
                console.error('Sales query failed:', e);
            }

            // Get cash balance from cash accounts
            let cash = 0;
            try {
                const cashResult = db.prepare(`
                    SELECT COALESCE(SUM(debit) - SUM(credit), 0) as balance
                    FROM journal_entry_lines jel
                    JOIN gl_chart_of_accounts acc ON jel.account_id = acc.id
                    WHERE acc.account_code LIKE '111%'
                `).get() as any;
                cash = cashResult?.balance || 0;
            } catch (e) {
                console.error('Cash query failed:', e);
            }

            // Get checks count (from cheques table if exists)
            let checks = 0;
            try {
                const checksResult = db.prepare(`
                    SELECT COUNT(*) as count
                    FROM cheques
                    WHERE status = 'Pending'
                `).get() as any;
                checks = checksResult?.count || 0;
            } catch (e) {
                // Table might not exist yet
                console.error('Checks query failed:', e);
            }

            // Get low stock items (from inventory if exists)
            let lowStock = 0;
            try {
                const stockResult = db.prepare(`
                    SELECT COUNT(*) as count
                    FROM items
                    WHERE quantity_on_hand <= reorder_level
                `).get() as any;
                lowStock = stockResult?.count || 0;
            } catch (e) {
                console.error('Stock query failed:', e);
            }

            return { sales, cash, checks, lowStock };
        } catch (e) {
            console.error('getDashboardKPIs failed:', e);
            return { sales: 0, cash: 0, checks: 0, lowStock: 0 };
        }
    }

    static getDashboardCharts() {
        try {
            // Cash flow for last 7 days
            const cashFlow = [];
            try {
                const flowData = db.prepare(`
                    SELECT 
                        DATE(je.date) as date,
                        COALESCE(SUM(CASE WHEN acc.account_code LIKE '4%' THEN jel.credit ELSE 0 END), 0) as in_flow,
                        COALESCE(SUM(CASE WHEN acc.account_code LIKE '5%' THEN jel.debit ELSE 0 END), 0) as out_flow
                    FROM journal_entries je
                    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
                    JOIN gl_chart_of_accounts acc ON jel.account_id = acc.id
                    WHERE je.date >= DATE('now', '-7 days')
                    AND je.status = 'Posted'
                    GROUP BY DATE(je.date)
                    ORDER BY DATE(je.date)
                `).all();

                cashFlow.push(...flowData);
            } catch (e) {
                console.error('Cash flow query failed:', e);
            }

            // If no data, provide sample data point
            if (cashFlow.length === 0) {
                cashFlow.push({ date: 'اليوم', in_flow: 0, out_flow: 0 });
            }

            // Top products (placeholder - would need sales data)
            const topProducts: any[] = [];

            return { cashFlow, topProducts };
        } catch (e) {
            console.error('getDashboardCharts failed:', e);
            return {
                cashFlow: [{ date: 'اليوم', in_flow: 0, out_flow: 0 }],
                topProducts: []
            };
        }
    }
}
