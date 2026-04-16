import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { PostingRegistryRecord, PostingRegistryRepositoryPort } from '../../application/ports/JournalEnginePorts';

type PostingRegistryRow = {
    id: string;
    company_id: string;
    source_type: string;
    source_id: string;
    source_version: number;
    journal_id: string;
    posting_hash: string;
    created_at: string;
};

export class SqlitePostingRegistryRepo implements PostingRegistryRepositoryPort {
    constructor(private readonly db: Database.Database) {}

    nextIdentity(): string {
        return uuidv4();
    }

    findBySource(companyId: string, sourceType: string, sourceId: string, sourceVersion: number): PostingRegistryRecord | null {
        const row = this.db
            .prepare(
                `
                SELECT *
                FROM posting_registry
                WHERE company_id = ?
                  AND UPPER(source_type) = ?
                  AND source_id = ?
                  AND source_version = ?
                LIMIT 1
                `,
            )
            .get(companyId, String(sourceType || '').trim().toUpperCase(), String(sourceId || '').trim(), Number(sourceVersion || 1)) as PostingRegistryRow | undefined;

        if (!row) return null;
        return this.mapRow(row);
    }

    insert(record: PostingRegistryRecord): void {
        this.db
            .prepare(
                `
                INSERT INTO posting_registry (
                    id,
                    company_id,
                    source_type,
                    source_id,
                    source_version,
                    journal_id,
                    posting_hash,
                    created_at
                ) VALUES (
                    @id,
                    @companyId,
                    @sourceType,
                    @sourceId,
                    @sourceVersion,
                    @journalId,
                    @postingHash,
                    @createdAt
                )
                `,
            )
            .run({
                ...record,
                sourceType: String(record.sourceType || '').trim().toUpperCase(),
                sourceVersion: Number(record.sourceVersion || 1),
            });
    }

    private mapRow(row: PostingRegistryRow): PostingRegistryRecord {
        return {
            id: row.id,
            companyId: row.company_id,
            sourceType: row.source_type,
            sourceId: row.source_id,
            sourceVersion: Number(row.source_version || 1),
            journalId: row.journal_id,
            postingHash: row.posting_hash,
            createdAt: row.created_at,
        };
    }
}
