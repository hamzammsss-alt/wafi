import { AccountsRepositoryPort } from '../../application/ports/AccountingPorts';
import { Account } from '../../domain/entities/Account';
import { AccountId } from '../../domain/valueObjects/AccountId';
import { v4 as uuidv4 } from 'uuid';
import db from 'better-sqlite3'; // Mock import

// In a real implementation this would receive the db instance via constructor dependency injection
const database = new db('wafi.db');

export class SqliteAccountsRepo implements AccountsRepositoryPort {
    nextIdentity(): AccountId {
        return new AccountId(uuidv4());
    }

    async save(account: Account): Promise<void> {
        database.prepare(`
            INSERT INTO accounts (id, company_id, branch_id, number, name, type, nature, parent_id, is_active, is_group)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name, is_active=excluded.is_active
        `).run(
            account.id.value, account.companyId, account.branchId, account.number, account.name,
            account.type, account.nature, account.parentId?.value || null, account.isActive ? 1 : 0, account.isGroup ? 1 : 0
        );
    }

    async getById(companyId: string, id: AccountId): Promise<Account | null> {
        const row = database.prepare('SELECT * FROM accounts WHERE company_id = ? AND id = ?').get(companyId, id.value) as any;
        if (!row) return null;
        return new Account(
            new AccountId(row.id), row.company_id, row.branch_id, row.number, row.name,
            row.type, row.nature, row.parent_id ? new AccountId(row.parent_id) : null,
            Boolean(row.is_active), Boolean(row.is_group)
        );
    }

    async list(companyId: string): Promise<Account[]> {
        const rows = database.prepare('SELECT * FROM accounts WHERE company_id = ? ORDER BY number ASC').all(companyId) as any[];
        return rows.map(row => new Account(
            new AccountId(row.id), row.company_id, row.branch_id, row.number, row.name,
            row.type, row.nature, row.parent_id ? new AccountId(row.parent_id) : null,
            Boolean(row.is_active), Boolean(row.is_group)
        ));
    }
}
