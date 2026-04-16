import { JournalRepositoryPort, Cursor, PagedResult } from '../../application/ports/AccountingPorts';
import { JournalEntry } from '../../domain/aggregates/JournalEntry';
import { JournalLine } from '../../domain/entities/JournalLine';
import { AccountId } from '../../domain/valueObjects/AccountId';
import { v4 as uuidv4 } from 'uuid';
import db from 'better-sqlite3';

const database = new db('wafi.db');

export class SqliteJournalRepo implements JournalRepositoryPort {
    nextIdentity() { return uuidv4(); }
    nextNumber(companyId: string) { return `JV-${Date.now()}`; }

    async save(journal: JournalEntry): Promise<void> {
        database.prepare(`
            INSERT INTO journals (id, company_id, branch_id, number, date, reference, notes, status, created_at, updated_at, posted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date=excluded.date, reference=excluded.reference, notes=excluded.notes, status=excluded.status,
                updated_at=excluded.updated_at, posted_at=excluded.posted_at
        `).run(
            journal.id, journal.companyId, journal.branchId, journal.number, journal.date, journal.reference,
            journal.notes, journal.status, journal.createdAt, journal.updatedAt, journal.postedAt
        );

        database.prepare(`
            DELETE FROM journal_lines
            WHERE COALESCE(NULLIF(entry_id, ''), NULLIF(journal_id, '')) = ?
        `).run(journal.id);

        const ins = database.prepare(`
            INSERT INTO journal_lines (
                id,
                journal_id,
                entry_id,
                account_id,
                debit,
                credit,
                memo,
                currency_id,
                exchange_rate,
                foreign_debit,
                foreign_credit,
                branch_id,
                cost_center_id,
                expense_type_id,
                vehicle_id,
                partner_id,
                project_id,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const now = new Date().toISOString();
        for (const l of journal.lines) {
            ins.run(
                l.id,
                journal.id,
                journal.id,
                l.accountId.value,
                l.debit,
                l.credit,
                l.memo,
                l.currencyId || null,
                l.exchangeRate || null,
                l.foreignDebit || null,
                l.foreignCredit || null,
                l.branchId || journal.branchId || null,
                l.costCenterId || null,
                l.expenseTypeId || null,
                l.vehicleId || null,
                l.partnerId || null,
                l.projectId || null,
                now,
                now,
            );
        }
    }

    async getById(companyId: string, id: string): Promise<JournalEntry | null> {
        const row = database.prepare('SELECT * FROM journals WHERE company_id = ? AND id = ?').get(companyId, id) as any;
        if (!row) return null;

        const lRows = database.prepare(`
            SELECT *
            FROM journal_lines
            WHERE COALESCE(NULLIF(entry_id, ''), NULLIF(journal_id, '')) = ?
        `).all(id) as any[];
        const lines = lRows.map(l => new JournalLine(
            l.id,
            l.entry_id || l.journal_id || row.id,
            new AccountId(l.account_id),
            l.debit,
            l.credit,
            l.memo,
            l.currency_id,
            l.exchange_rate,
            l.foreign_debit,
            l.foreign_credit,
            l.branch_id || row.branch_id || null,
            l.cost_center_id || null,
            l.expense_type_id || null,
            l.vehicle_id || null,
            l.partner_id || null,
            l.project_id || null,
        ));

        return new JournalEntry(
            row.id, row.company_id, row.branch_id, row.number, row.date, row.reference, row.notes,
            row.status, lines, row.created_at, row.updated_at, row.posted_at
        );
    }

    async list(companyId: string, cursor?: Cursor, limit = 50): Promise<PagedResult<JournalEntry>> {
        let sql = `SELECT * FROM journals WHERE company_id = ?`;
        const args: any[] = [companyId];

        if (cursor) {
            sql += ` AND ((created_at < ?) OR (created_at = ? AND id < ?))`;
            args.push(cursor.createdAt, cursor.createdAt, cursor.id);
        }
        sql += ` ORDER BY created_at DESC, id DESC LIMIT ?`;

        const rows = database.prepare(sql).all(...args, limit + 1) as any[];
        const hasMore = rows.length > limit;
        if (hasMore) rows.pop();

        const journals = rows.map(r => new JournalEntry(
            r.id, r.company_id, r.branch_id, r.number, r.date, r.reference, r.notes,
            r.status, [], r.created_at, r.updated_at, r.posted_at
        ));

        const nextCursor = hasMore && rows.length > 0 ?
            { createdAt: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id } : null;

        return { rows: journals, nextCursor };
    }
}
