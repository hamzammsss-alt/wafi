import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { JournalHeaderRepositoryPort } from '../../application/ports/JournalEnginePorts';
import { JournalEntity } from '../../domain/journalEngine/entities/JournalEntity';
import { JournalStatus } from '../../domain/journalEngine/types/JournalStatus';

type JournalRow = {
    id: string;
    company_id: string;
    branch_id: string;
    journal_no: string;
    journal_date: string;
    fiscal_period_id: string;
    source_type: string;
    source_id: string;
    source_no: string | null;
    source_version: number;
    reference_no: string | null;
    description: string | null;
    status: string;
    currency_code: string;
    exchange_rate: number;
    total_debit: number;
    total_credit: number;
    posted_by: string;
    posted_at: string;
    reversed_journal_id: string | null;
    created_at: string;
    updated_at: string;
};

export class SqliteJournalHeaderRepo implements JournalHeaderRepositoryPort {
    constructor(private readonly db: Database.Database) {}

    nextIdentity(): string {
        return uuidv4();
    }

    nextJournalNo(companyId: string, journalDate: string): string {
        const datePart = String(journalDate || '').replace(/-/g, '');
        const prefix = `JRN-${datePart}-`;
        const likePattern = `${prefix}%`;

        const row = this.db
            .prepare(
                `
                SELECT journal_no
                FROM journals
                WHERE company_id = ?
                  AND journal_no LIKE ?
                ORDER BY journal_no DESC
                LIMIT 1
                `,
            )
            .get(companyId, likePattern) as { journal_no?: string } | undefined;

        if (!row?.journal_no) {
            return `${prefix}0001`;
        }

        const sequenceText = row.journal_no.slice(prefix.length);
        const sequence = Number(sequenceText || 0);
        const next = Number.isFinite(sequence) ? sequence + 1 : 1;
        return `${prefix}${String(next).padStart(4, '0')}`;
    }

    insert(journal: JournalEntity): void {
        const payload = journal.toJSON();
        this.db
            .prepare(
                `
                INSERT INTO journals (
                    id,
                    company_id,
                    branch_id,
                    journal_no,
                    journal_date,
                    fiscal_period_id,
                    source_type,
                    source_id,
                    source_no,
                    source_version,
                    reference_no,
                    description,
                    status,
                    currency_code,
                    exchange_rate,
                    total_debit,
                    total_credit,
                    posted_by,
                    posted_at,
                    reversed_journal_id,
                    created_at,
                    updated_at
                ) VALUES (
                    @id,
                    @companyId,
                    @branchId,
                    @journalNo,
                    @journalDate,
                    @fiscalPeriodId,
                    @sourceType,
                    @sourceId,
                    @sourceNo,
                    @sourceVersion,
                    @referenceNo,
                    @description,
                    @status,
                    @currencyCode,
                    @exchangeRate,
                    @totalDebit,
                    @totalCredit,
                    @postedBy,
                    @postedAt,
                    @reversedJournalId,
                    @createdAt,
                    @updatedAt
                )
                `,
            )
            .run({
                id: payload.id,
                companyId: payload.companyId,
                branchId: payload.branchId,
                journalNo: payload.journalNo,
                journalDate: payload.journalDate,
                fiscalPeriodId: payload.fiscalPeriodId,
                sourceType: payload.sourceType,
                sourceId: payload.sourceId,
                sourceNo: payload.sourceNo,
                sourceVersion: payload.sourceVersion,
                referenceNo: payload.referenceNo,
                description: payload.description,
                status: payload.status,
                currencyCode: payload.currencyCode,
                exchangeRate: payload.exchangeRate,
                totalDebit: payload.totalDebit,
                totalCredit: payload.totalCredit,
                postedBy: payload.postedBy,
                postedAt: payload.postedAt,
                reversedJournalId: payload.reversedJournalId,
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt,
            });
    }

    getById(companyId: string, journalId: string): JournalEntity | null {
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM journals
                WHERE company_id = ?
                  AND id = ?
                LIMIT 1
                `,
            )
            .get(companyId, journalId) as JournalRow | undefined;
        if (!row) return null;
        return this.mapRow(row);
    }

    getBySource(companyId: string, sourceType: string, sourceId: string, sourceVersion?: number | null): JournalEntity | null {
        const normalizedSourceType = String(sourceType || '').trim().toUpperCase();
        const normalizedSourceId = String(sourceId || '').trim();

        if (!normalizedSourceType || !normalizedSourceId) return null;

        let sql = `
            SELECT *
            FROM journals
            WHERE company_id = ?
              AND UPPER(source_type) = ?
              AND source_id = ?
        `;
        const params: Array<string | number> = [companyId, normalizedSourceType, normalizedSourceId];
        if (sourceVersion != null) {
            sql += ' AND source_version = ?';
            params.push(Number(sourceVersion));
        }
        sql += ' ORDER BY source_version DESC, created_at DESC LIMIT 1';

        const row = this.db.prepare(sql).get(...params) as JournalRow | undefined;
        if (!row) return null;
        return this.mapRow(row);
    }

    updateReversalLink(companyId: string, journalId: string, reversedJournalId: string, status: JournalStatus): void {
        this.db
            .prepare(
                `
                UPDATE journals
                SET reversed_journal_id = ?,
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND id = ?
                `,
            )
            .run(reversedJournalId, status, companyId, journalId);
    }

    private mapRow(row: JournalRow): JournalEntity {
        return JournalEntity.create({
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id,
            journalNo: row.journal_no,
            journalDate: row.journal_date,
            fiscalPeriodId: row.fiscal_period_id,
            sourceType: row.source_type,
            sourceId: row.source_id,
            sourceNo: row.source_no,
            sourceVersion: Number(row.source_version || 1),
            referenceNo: row.reference_no,
            description: row.description,
            status: this.mapStatus(row.status),
            currencyCode: row.currency_code,
            exchangeRate: Number(row.exchange_rate || 1),
            totalDebit: Number(row.total_debit || 0),
            totalCredit: Number(row.total_credit || 0),
            postedBy: row.posted_by,
            postedAt: row.posted_at,
            reversedJournalId: row.reversed_journal_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lines: [],
        });
    }

    private mapStatus(value: string): JournalStatus {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === JournalStatus.REVERSED) return JournalStatus.REVERSED;
        if (normalized === JournalStatus.DRAFT) return JournalStatus.DRAFT;
        return JournalStatus.POSTED;
    }
}
