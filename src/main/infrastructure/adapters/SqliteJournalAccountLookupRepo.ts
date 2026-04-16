import Database from 'better-sqlite3';
import { AccountLookupRepositoryPort, AccountPostingValidationState } from '../../application/ports/JournalEnginePorts';

type AccountRow = {
    id: string;
    code: string | null;
    account_code: string | null;
    name: string | null;
    is_active: number | null;
    status: string | null;
    is_posting: number | null;
    posting_allowed: number | null;
    is_transactional: number | null;
    is_group: number | null;
};

export class SqliteJournalAccountLookupRepo implements AccountLookupRepositoryPort {
    constructor(private readonly db: Database.Database) {}

    getPostingValidationState(companyId: string, accountId: string): AccountPostingValidationState {
        try {
            const row = this.db
                .prepare(
                    `
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
                    `,
                )
                .get(companyId, accountId) as AccountRow | undefined;

            return this.mapRow(accountId, row);
        } catch {
            const fallback = this.db
                .prepare(
                    `
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
                    `,
                )
                .get(accountId) as AccountRow | undefined;
            return this.mapRow(accountId, fallback);
        }
    }

    private mapRow(accountId: string, row?: AccountRow): AccountPostingValidationState {
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
