"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlitePostingRegistryRepo = void 0;
const uuid_1 = require("uuid");
class SqlitePostingRegistryRepo {
    constructor(db) {
        this.db = db;
    }
    nextIdentity() {
        return (0, uuid_1.v4)();
    }
    findBySource(companyId, sourceType, sourceId, sourceVersion) {
        const row = this.db
            .prepare(`
                SELECT *
                FROM posting_registry
                WHERE company_id = ?
                  AND UPPER(source_type) = ?
                  AND source_id = ?
                  AND source_version = ?
                LIMIT 1
                `)
            .get(companyId, String(sourceType || '').trim().toUpperCase(), String(sourceId || '').trim(), Number(sourceVersion || 1));
        if (!row)
            return null;
        return this.mapRow(row);
    }
    insert(record) {
        this.db
            .prepare(`
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
                `)
            .run({
            ...record,
            sourceType: String(record.sourceType || '').trim().toUpperCase(),
            sourceVersion: Number(record.sourceVersion || 1),
        });
    }
    mapRow(row) {
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
exports.SqlitePostingRegistryRepo = SqlitePostingRegistryRepo;
