"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteJournalFiscalPeriodRepo = void 0;
class SqliteJournalFiscalPeriodRepo {
    constructor(db) {
        this.db = db;
    }
    resolveOpenPeriodId(companyId, journalDate) {
        if (this.tableExists('fiscal_periods')) {
            const row = this.db
                .prepare(`
                    SELECT id, status
                    FROM fiscal_periods
                    WHERE company_id = ?
                      AND start_date <= ?
                      AND end_date >= ?
                    ORDER BY start_date DESC
                    LIMIT 1
                    `)
                .get(companyId, journalDate, journalDate);
            if (!row)
                return null;
            const status = String(row.status || '').trim().toUpperCase();
            if (status && status !== 'OPEN')
                return null;
            return String(row.id || '').trim() || null;
        }
        if (this.tableExists('fin_close_cycles')) {
            const period = String(journalDate || '').slice(0, 7);
            const row = this.db
                .prepare(`
                    SELECT status
                    FROM fin_close_cycles
                    WHERE company_id = ?
                      AND period = ?
                    ORDER BY started_at DESC
                    LIMIT 1
                    `)
                .get(companyId, period);
            if (!row) {
                return `PERIOD-${period}`;
            }
            const status = String(row.status || '').trim().toUpperCase();
            if (status === 'CLOSED' || status === 'LOCKED') {
                return null;
            }
            return `PERIOD-${period}`;
        }
        return null;
    }
    tableExists(name) {
        const row = this.db
            .prepare(`
                SELECT 1 as ok
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = ?
                LIMIT 1
                `)
            .get(name);
        return Boolean(row?.ok);
    }
}
exports.SqliteJournalFiscalPeriodRepo = SqliteJournalFiscalPeriodRepo;
