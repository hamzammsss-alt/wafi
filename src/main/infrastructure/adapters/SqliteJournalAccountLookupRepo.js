"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteJournalAccountLookupRepo = void 0;
class SqliteJournalAccountLookupRepo {
    constructor(db) {
        this.db = db;
    }
    getPostingValidationState(companyId, accountId) {
        try {
            const row = this.db
                .prepare(`
                    SELECT
                        id,
                        code,
                        account_code,
                        name,
                        is_active,
                        status,
                        is_posting,
                        posting_allowed,
                        is_transactional,
                        is_group
                    FROM accounts
                    WHERE COALESCE(company_id, 'COMP_01') = ?
                      AND id = ?
                    LIMIT 1
                    `)
                .get(companyId, accountId);
            return this.mapRow(accountId, row);
        }
        catch {
            const fallback = this.db
                .prepare(`
                    SELECT
                        id,
                        code,
                        NULL AS account_code,
                        name,
                        is_active,
                        NULL AS status,
                        NULL AS is_posting,
                        NULL AS posting_allowed,
                        is_transactional,
                        is_group
                    FROM accounts
                    WHERE id = ?
                    LIMIT 1
                    `)
                .get(accountId);
            return this.mapRow(accountId, fallback);
        }
    }
    mapRow(accountId, row) {
        if (!row) {
            return {
                accountId,
                exists: false,
                isActive: false,
                isPosting: false,
                accountCode: null,
                accountName: null,
            };
        }
        const status = String(row.status || '').trim().toUpperCase();
        const isActive = row.is_active != null
            ? Number(row.is_active) === 1
            : status
                ? status === 'ACTIVE'
                : true;
        const isPosting = row.is_posting != null
            ? Number(row.is_posting) === 1
            : row.posting_allowed != null
                ? Number(row.posting_allowed) === 1
                : row.is_transactional != null
                    ? Number(row.is_transactional) === 1
                    : Number(row.is_group || 0) === 0;
        return {
            accountId: row.id,
            exists: true,
            isActive,
            isPosting,
            accountCode: String(row.code || row.account_code || '').trim() || null,
            accountName: String(row.name || '').trim() || null,
        };
    }
}
exports.SqliteJournalAccountLookupRepo = SqliteJournalAccountLookupRepo;
