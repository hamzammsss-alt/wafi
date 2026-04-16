import Database from 'better-sqlite3';

export type ActiveSessionInput = {
    id: string;
    userId: string;
    companyId: string;
    branchId: string;
    webContentsId: number;
};

export type UploadSessionInput = {
    id: string;
    companyId: string;
    branchId: string;
    moduleKey: string;
    entityName: string;
    entityId: string;
    fileName: string;
    mimeType: string;
    totalSize: number;
    chunkSize: number;
    expectedChunks: number;
    checksumSha256?: string;
    createdBy: string;
};

export type UploadChunkInput = {
    id: string;
    sessionId: string;
    chunkIndex: number;
    chunkSize: number;
    checksumSha256?: string;
    chunkPath: string;
};

export type AttachmentFileInput = {
    id: string;
    companyId: string;
    branchId: string;
    moduleKey: string;
    entityName: string;
    entityId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    checksumSha256?: string;
    createdBy: string;
};

export type AuditEventInput = {
    id: string;
    companyId: string;
    branchId: string;
    actorUserId: string;
    actionKey: string;
    entityName: string;
    entityId: string;
    payloadJson?: string;
};

const GB = 1024 * 1024 * 1024;

export class SqliteRuntimeGovernanceRepo {
    private db: Database.Database;

    constructor(database: Database.Database) {
        this.db = database;
        this.ensureTables();
    }

    private ensureTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sys_concurrency_license (
                company_id TEXT PRIMARY KEY,
                base_seats INTEGER NOT NULL DEFAULT 1,
                extra_seats INTEGER NOT NULL DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sys_active_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                web_contents_id INTEGER NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ended_at DATETIME,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS sys_attachment_quota (
                company_id TEXT PRIMARY KEY,
                quota_tier TEXT NOT NULL DEFAULT 'BASE_5GB',
                base_quota_bytes INTEGER NOT NULL DEFAULT 5368709120,
                addon_quota_bytes INTEGER NOT NULL DEFAULT 0,
                used_quota_bytes INTEGER NOT NULL DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sys_attachment_upload_sessions (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                module_key TEXT NOT NULL,
                entity_name TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                total_size INTEGER NOT NULL,
                chunk_size INTEGER NOT NULL,
                expected_chunks INTEGER NOT NULL,
                uploaded_chunks INTEGER NOT NULL DEFAULT 0,
                checksum_sha256 TEXT,
                status TEXT NOT NULL DEFAULT 'INIT',
                created_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS sys_attachment_chunks (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                chunk_size INTEGER NOT NULL,
                checksum_sha256 TEXT,
                chunk_path TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES sys_attachment_upload_sessions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sys_attachment_files (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                module_key TEXT NOT NULL,
                entity_name TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                storage_path TEXT NOT NULL,
                checksum_sha256 TEXT,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                created_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS fin_audit_events (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                branch_id TEXT NOT NULL,
                actor_user_id TEXT NOT NULL,
                action_key TEXT NOT NULL,
                entity_name TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                payload_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_sys_active_sessions_company_active
                ON sys_active_sessions(company_id, is_active, last_seen_at DESC);
            CREATE INDEX IF NOT EXISTS idx_sys_active_sessions_wc_active
                ON sys_active_sessions(web_contents_id, is_active);
            CREATE INDEX IF NOT EXISTS idx_sys_upload_sessions_company_status
                ON sys_attachment_upload_sessions(company_id, status, created_at DESC);
            CREATE UNIQUE INDEX IF NOT EXISTS uq_sys_attachment_chunks_session_idx
                ON sys_attachment_chunks(session_id, chunk_index);
            CREATE INDEX IF NOT EXISTS idx_sys_attachment_files_entity
                ON sys_attachment_files(company_id, entity_name, entity_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_audit_company_time
                ON fin_audit_events(company_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_audit_actor_time
                ON fin_audit_events(actor_user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_audit_entity_time
                ON fin_audit_events(entity_name, entity_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_fin_audit_action_time
                ON fin_audit_events(action_key, created_at DESC);
        `);

        this.db.prepare(`
            INSERT OR IGNORE INTO sys_concurrency_license(company_id, base_seats, extra_seats)
            VALUES ('COMP_01', 1, 0)
        `).run();
        this.db.prepare(`
            INSERT OR IGNORE INTO sys_attachment_quota(company_id, quota_tier, base_quota_bytes, addon_quota_bytes, used_quota_bytes)
            VALUES ('COMP_01', 'BASE_5GB', ${5 * GB}, 0, 0)
        `).run();
    }

    getConcurrencyLicense(companyId: string) {
        this.db.prepare(`
            INSERT OR IGNORE INTO sys_concurrency_license(company_id, base_seats, extra_seats)
            VALUES (?, 1, 0)
        `).run(companyId);
        return this.db.prepare(`
            SELECT company_id, base_seats, extra_seats,
                   (base_seats + extra_seats) as total_seats
            FROM sys_concurrency_license
            WHERE company_id = ?
        `).get(companyId) as any;
    }

    updateExtraSeats(companyId: string, extraSeats: number) {
        this.db.prepare(`
            INSERT INTO sys_concurrency_license(company_id, base_seats, extra_seats, updated_at)
            VALUES (?, 1, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(company_id) DO UPDATE SET
                extra_seats = excluded.extra_seats,
                updated_at = CURRENT_TIMESTAMP
        `).run(companyId, Math.max(0, Math.floor(extraSeats)));
        return this.getConcurrencyLicense(companyId);
    }

    expireStaleSessions(maxIdleMinutes = 30) {
        this.db.prepare(`
            UPDATE sys_active_sessions
            SET is_active = 0,
                ended_at = CURRENT_TIMESTAMP
            WHERE is_active = 1
              AND datetime(last_seen_at) <= datetime('now', '-' || ? || ' minutes')
        `).run(maxIdleMinutes);
    }

    countActiveSessions(companyId: string): number {
        const row = this.db.prepare(`
            SELECT COUNT(*) as c
            FROM sys_active_sessions
            WHERE company_id = ? AND is_active = 1
        `).get(companyId) as any;
        return Number(row?.c || 0);
    }

    upsertActiveSession(input: ActiveSessionInput) {
        this.db.prepare(`
            UPDATE sys_active_sessions
            SET is_active = 0,
                ended_at = CURRENT_TIMESTAMP
            WHERE web_contents_id = @webContentsId
              AND is_active = 1
        `).run(input);

        this.db.prepare(`
            INSERT INTO sys_active_sessions (
                id, user_id, company_id, branch_id, web_contents_id, started_at, last_seen_at, is_active
            ) VALUES (
                @id, @userId, @companyId, @branchId, @webContentsId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1
            )
        `).run(input);
    }

    heartbeat(webContentsId: number) {
        this.db.prepare(`
            UPDATE sys_active_sessions
            SET last_seen_at = CURRENT_TIMESTAMP
            WHERE web_contents_id = ? AND is_active = 1
        `).run(webContentsId);
    }

    releaseSessionByWebContents(webContentsId: number) {
        this.db.prepare(`
            UPDATE sys_active_sessions
            SET is_active = 0,
                ended_at = CURRENT_TIMESTAMP
            WHERE web_contents_id = ?
              AND is_active = 1
        `).run(webContentsId);
    }

    getAttachmentQuota(companyId: string) {
        this.db.prepare(`
            INSERT OR IGNORE INTO sys_attachment_quota(company_id, quota_tier, base_quota_bytes, addon_quota_bytes, used_quota_bytes)
            VALUES (?, 'BASE_5GB', ?, 0, 0)
        `).run(companyId, 5 * GB);

        return this.db.prepare(`
            SELECT *,
                   (base_quota_bytes + addon_quota_bytes) as total_quota_bytes
            FROM sys_attachment_quota
            WHERE company_id = ?
        `).get(companyId) as any;
    }

    updateAttachmentTier(companyId: string, tier: 'BASE_5GB' | 'EXT_10GB') {
        const baseQuota = tier === 'EXT_10GB' ? 10 * GB : 5 * GB;
        this.db.prepare(`
            INSERT INTO sys_attachment_quota(company_id, quota_tier, base_quota_bytes, addon_quota_bytes, used_quota_bytes, updated_at)
            VALUES (?, ?, ?, 0, 0, CURRENT_TIMESTAMP)
            ON CONFLICT(company_id) DO UPDATE SET
                quota_tier = excluded.quota_tier,
                base_quota_bytes = excluded.base_quota_bytes,
                updated_at = CURRENT_TIMESTAMP
        `).run(companyId, tier, baseQuota);
        return this.getAttachmentQuota(companyId);
    }

    addAttachmentAddon(companyId: string, addonGb: 10 | 15 | 25) {
        this.db.prepare(`
            INSERT OR IGNORE INTO sys_attachment_quota(company_id, quota_tier, base_quota_bytes, addon_quota_bytes, used_quota_bytes)
            VALUES (?, 'BASE_5GB', ?, 0, 0)
        `).run(companyId, 5 * GB);
        this.db.prepare(`
            UPDATE sys_attachment_quota
            SET addon_quota_bytes = addon_quota_bytes + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ?
        `).run(addonGb * GB, companyId);
        return this.getAttachmentQuota(companyId);
    }

    increaseUsedQuota(companyId: string, sizeBytes: number) {
        this.db.prepare(`
            UPDATE sys_attachment_quota
            SET used_quota_bytes = used_quota_bytes + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ?
        `).run(sizeBytes, companyId);
    }

    decreaseUsedQuota(companyId: string, sizeBytes: number) {
        this.db.prepare(`
            UPDATE sys_attachment_quota
            SET used_quota_bytes = MAX(0, used_quota_bytes - ?),
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ?
        `).run(sizeBytes, companyId);
    }

    createUploadSession(input: UploadSessionInput) {
        this.db.prepare(`
            INSERT INTO sys_attachment_upload_sessions (
                id, company_id, branch_id, module_key, entity_name, entity_id,
                file_name, mime_type, total_size, chunk_size, expected_chunks,
                uploaded_chunks, checksum_sha256, status, created_by
            ) VALUES (
                @id, @companyId, @branchId, @moduleKey, @entityName, @entityId,
                @fileName, @mimeType, @totalSize, @chunkSize, @expectedChunks,
                0, @checksumSha256, 'UPLOADING', @createdBy
            )
        `).run(input);
        return this.getUploadSession(input.id);
    }

    getUploadSession(sessionId: string) {
        return this.db.prepare(`
            SELECT *
            FROM sys_attachment_upload_sessions
            WHERE id = ?
        `).get(sessionId) as any;
    }

    addUploadChunk(input: UploadChunkInput) {
        this.db.prepare(`
            INSERT INTO sys_attachment_chunks (
                id, session_id, chunk_index, chunk_size, checksum_sha256, chunk_path
            ) VALUES (
                @id, @sessionId, @chunkIndex, @chunkSize, @checksumSha256, @chunkPath
            )
            ON CONFLICT(session_id, chunk_index) DO UPDATE SET
                chunk_size = excluded.chunk_size,
                checksum_sha256 = excluded.checksum_sha256,
                chunk_path = excluded.chunk_path
        `).run(input);
        const uploaded = this.db.prepare(`
            SELECT COUNT(*) as c
            FROM sys_attachment_chunks
            WHERE session_id = ?
        `).get(input.sessionId) as any;
        this.db.prepare(`
            UPDATE sys_attachment_upload_sessions
            SET uploaded_chunks = ?
            WHERE id = ?
        `).run(Number(uploaded?.c || 0), input.sessionId);
    }

    listUploadChunks(sessionId: string) {
        return this.db.prepare(`
            SELECT *
            FROM sys_attachment_chunks
            WHERE session_id = ?
            ORDER BY chunk_index ASC
        `).all(sessionId) as any[];
    }

    completeUploadSession(sessionId: string) {
        this.db.prepare(`
            UPDATE sys_attachment_upload_sessions
            SET status = 'COMPLETED',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(sessionId);
    }

    abortUploadSession(sessionId: string) {
        this.db.prepare(`
            UPDATE sys_attachment_upload_sessions
            SET status = 'ABORTED',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(sessionId);
    }

    createAttachmentFile(input: AttachmentFileInput) {
        this.db.prepare(`
            INSERT INTO sys_attachment_files (
                id, company_id, branch_id, module_key, entity_name, entity_id,
                file_name, mime_type, size_bytes, storage_path, checksum_sha256, status, created_by
            ) VALUES (
                @id, @companyId, @branchId, @moduleKey, @entityName, @entityId,
                @fileName, @mimeType, @sizeBytes, @storagePath, @checksumSha256, 'ACTIVE', @createdBy
            )
        `).run(input);
        return this.getAttachmentFile(input.id);
    }

    getAttachmentFile(fileId: string) {
        return this.db.prepare(`
            SELECT *
            FROM sys_attachment_files
            WHERE id = ?
        `).get(fileId) as any;
    }

    listAttachmentFiles(companyId: string, entityName: string, entityId: string) {
        return this.db.prepare(`
            SELECT *
            FROM sys_attachment_files
            WHERE company_id = ?
              AND entity_name = ?
              AND entity_id = ?
              AND status = 'ACTIVE'
            ORDER BY created_at DESC
        `).all(companyId, entityName, entityId) as any[];
    }

    markAttachmentDeleted(fileId: string) {
        this.db.prepare(`
            UPDATE sys_attachment_files
            SET status = 'DELETED',
                deleted_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(fileId);
    }

    appendAuditEvent(event: AuditEventInput) {
        this.db.prepare(`
            INSERT INTO fin_audit_events (
                id, company_id, branch_id, actor_user_id, action_key, entity_name, entity_id, payload_json
            ) VALUES (
                @id, @companyId, @branchId, @actorUserId, @actionKey, @entityName, @entityId, @payloadJson
            )
        `).run(event);
    }
}
