import Database from 'better-sqlite3';
import {
    AuditEventRecord,
    AuditFieldChangeRecord,
    AuditListCursor,
    AuditListQuery,
    AuditListResult,
} from '../../domain/audit/AuditTypes';

type AuditEventInsertRow = {
    id: string;
    companyId: string;
    branchId: string | null;
    userId: string;
    sessionId: string | null;
    entityType: string;
    entityId: string;
    docType: string | null;
    docId: string | null;
    eventType: string;
    correlationId: string | null;
    ipcid: string | null;
    summaryI18nKey: string | null;
    metaJson: string | null;
    createdAt: string;
};

type AuditFieldInsertRow = {
    id: string;
    auditEventId: string;
    fieldPath: string;
    oldValueJson: string | null;
    newValueJson: string | null;
};

export class SqliteAuditRepo {
    private readonly db: Database.Database;

    constructor(database: Database.Database) {
        this.db = database;
        this.ensureSchema();
    }

    private ensureSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT,
                user_id TEXT NOT NULL,
                session_id TEXT,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                doc_type TEXT,
                doc_id TEXT,
                event_type TEXT NOT NULL,
                correlation_id TEXT,
                ipcid TEXT,
                summary_i18n_key TEXT,
                meta_json TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS audit_event_fields (
                id TEXT PRIMARY KEY,
                audit_event_id TEXT NOT NULL,
                field_path TEXT NOT NULL,
                old_value_json TEXT,
                new_value_json TEXT,
                FOREIGN KEY (audit_event_id) REFERENCES audit_events(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_audit_events_company_created_desc
                ON audit_events(company_id, created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_audit_events_company_branch_created_desc
                ON audit_events(company_id, branch_id, created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_audit_events_company_entity_created_desc
                ON audit_events(company_id, entity_type, entity_id, created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_audit_events_company_user_created_desc
                ON audit_events(company_id, user_id, created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_audit_events_company_event_created_desc
                ON audit_events(company_id, event_type, created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_audit_events_company_correlation
                ON audit_events(company_id, correlation_id, event_type, entity_type, entity_id, created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_audit_event_fields_audit_event_id
                ON audit_event_fields(audit_event_id);
        `);
    }

    findDuplicate(params: {
        companyId: string;
        correlationId: string;
        eventType: string;
        entityType: string;
        entityId: string;
        docType?: string | null;
        docId?: string | null;
    }): string | null {
        const row = this.db.prepare(`
            SELECT id
            FROM audit_events
            WHERE company_id = @companyId
              AND correlation_id = @correlationId
              AND event_type = @eventType
              AND entity_type = @entityType
              AND entity_id = @entityId
              AND COALESCE(doc_type, '') = COALESCE(@docType, '')
              AND COALESCE(doc_id, '') = COALESCE(@docId, '')
            LIMIT 1
        `).get({
            companyId: params.companyId,
            correlationId: params.correlationId,
            eventType: params.eventType,
            entityType: params.entityType,
            entityId: params.entityId,
            docType: params.docType || null,
            docId: params.docId || null,
        }) as { id?: string } | undefined;

        return row?.id ? String(row.id) : null;
    }

    insertEvent(event: AuditEventInsertRow, fields: AuditFieldInsertRow[]): void {
        const insertEventStmt = this.db.prepare(`
            INSERT INTO audit_events (
                id, company_id, branch_id, user_id, session_id,
                entity_type, entity_id, doc_type, doc_id,
                event_type, correlation_id, ipcid,
                summary_i18n_key, meta_json, created_at
            ) VALUES (
                @id, @companyId, @branchId, @userId, @sessionId,
                @entityType, @entityId, @docType, @docId,
                @eventType, @correlationId, @ipcid,
                @summaryI18nKey, @metaJson, @createdAt
            )
        `);

        const insertFieldStmt = this.db.prepare(`
            INSERT INTO audit_event_fields (
                id, audit_event_id, field_path, old_value_json, new_value_json
            ) VALUES (
                @id, @auditEventId, @fieldPath, @oldValueJson, @newValueJson
            )
        `);

        const tx = this.db.transaction(() => {
            insertEventStmt.run(event);
            for (const field of fields) {
                insertFieldStmt.run(field);
            }
        });

        tx();
    }

    listEvents(query: AuditListQuery): AuditListResult {
        const limit = Math.max(1, Math.min(Number(query.limit || 100), 500));
        const where: string[] = ['company_id = @companyId'];
        const params: Record<string, unknown> = {
            companyId: query.companyId,
            pageLimit: limit + 1,
        };

        if (query.branchId) {
            where.push('(branch_id = @branchId OR branch_id IS NULL)');
            params.branchId = query.branchId;
        }
        if (query.userId) {
            where.push('user_id = @userId');
            params.userId = query.userId;
        }
        if (query.entityType) {
            where.push('entity_type = @entityType');
            params.entityType = query.entityType;
        }
        if (query.entityId) {
            where.push('entity_id = @entityId');
            params.entityId = query.entityId;
        }
        if (query.docType) {
            where.push('doc_type = @docType');
            params.docType = query.docType;
        }
        if (query.docId) {
            where.push('doc_id = @docId');
            params.docId = query.docId;
        }
        if (query.eventType) {
            where.push('event_type = @eventType');
            params.eventType = query.eventType;
        }
        if (query.cursor) {
            where.push('(created_at < @cursorCreatedAt OR (created_at = @cursorCreatedAt AND id < @cursorId))');
            params.cursorCreatedAt = query.cursor.createdAt;
            params.cursorId = query.cursor.id;
        }

        const sql = `
            SELECT *
            FROM audit_events
            WHERE ${where.join(' AND ')}
            ORDER BY created_at DESC, id DESC
            LIMIT @pageLimit
        `;

        const rows = this.db.prepare(sql).all(params) as Array<Record<string, unknown>>;
        const hasMore = rows.length > limit;
        const pageRows = hasMore ? rows.slice(0, limit) : rows;

        const eventIds = pageRows.map((row) => String(row.id));
        const fieldsByEvent = new Map<string, AuditFieldChangeRecord[]>();

        if (eventIds.length > 0) {
            const placeholders = eventIds.map(() => '?').join(', ');
            const fieldRows = this.db.prepare(`
                SELECT id, audit_event_id, field_path, old_value_json, new_value_json
                FROM audit_event_fields
                WHERE audit_event_id IN (${placeholders})
                ORDER BY rowid ASC
            `).all(...eventIds) as Array<Record<string, unknown>>;

            for (const row of fieldRows) {
                const auditEventId = String(row.audit_event_id || '');
                if (!auditEventId) continue;
                if (!fieldsByEvent.has(auditEventId)) {
                    fieldsByEvent.set(auditEventId, []);
                }
                fieldsByEvent.get(auditEventId)!.push({
                    id: String(row.id || ''),
                    fieldPath: String(row.field_path || ''),
                    oldValue: this.parseJsonValue(row.old_value_json),
                    newValue: this.parseJsonValue(row.new_value_json),
                });
            }
        }

        const mappedRows: AuditEventRecord[] = pageRows.map((row) => {
            const id = String(row.id || '');
            return {
                id,
                companyId: String(row.company_id || ''),
                branchId: row.branch_id ? String(row.branch_id) : null,
                userId: String(row.user_id || ''),
                sessionId: row.session_id ? String(row.session_id) : null,
                entityType: String(row.entity_type || ''),
                entityId: String(row.entity_id || ''),
                docType: row.doc_type ? String(row.doc_type) : null,
                docId: row.doc_id ? String(row.doc_id) : null,
                eventType: String(row.event_type || ''),
                correlationId: row.correlation_id ? String(row.correlation_id) : null,
                ipcid: row.ipcid ? String(row.ipcid) : null,
                summaryI18nKey: row.summary_i18n_key ? String(row.summary_i18n_key) : null,
                meta: this.parseJsonObject(row.meta_json),
                createdAt: String(row.created_at || ''),
                fieldChanges: fieldsByEvent.get(id) || [],
            };
        });

        let nextCursor: AuditListCursor | null = null;
        if (hasMore && mappedRows.length > 0) {
            const last = mappedRows[mappedRows.length - 1];
            nextCursor = {
                createdAt: last.createdAt,
                id: last.id,
            };
        }

        return {
            rows: mappedRows,
            nextCursor,
        };
    }

    private parseJsonValue(value: unknown): unknown {
        if (value === null || value === undefined) return null;
        const text = String(value);
        if (!text.trim()) return null;
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    private parseJsonObject(value: unknown): Record<string, unknown> | null {
        const parsed = this.parseJsonValue(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
        return null;
    }
}
