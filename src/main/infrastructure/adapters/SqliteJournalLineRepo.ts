import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { JournalLineRepositoryPort } from '../../application/ports/JournalEnginePorts';
import { JournalLineEntity } from '../../domain/journalEngine/entities/JournalLineEntity';

type JournalLineRow = {
    id: string;
    journal_id: string;
    line_no: number;
    account_id: string;
    description: string | null;
    debit: number;
    credit: number;
    currency_code: string;
    exchange_rate: number;
    base_debit: number;
    base_credit: number;
    branch_id: string | null;
    cost_center_id: string | null;
    expense_type_id: string | null;
    vehicle_id: string | null;
    partner_id: string | null;
    project_id: string | null;
    item_id: string | null;
    warehouse_id: string | null;
    created_at: string;
    updated_at: string;
};

export class SqliteJournalLineRepo implements JournalLineRepositoryPort {
    constructor(private readonly db: Database.Database) {}

    nextIdentity(): string {
        return uuidv4();
    }

    insertMany(lines: JournalLineEntity[]): void {
        if (!lines.length) return;
        const stmt = this.db.prepare(
            `
            INSERT INTO journal_lines (
                id,
                journal_id,
                line_no,
                account_id,
                description,
                debit,
                credit,
                currency_code,
                exchange_rate,
                base_debit,
                base_credit,
                branch_id,
                cost_center_id,
                expense_type_id,
                vehicle_id,
                partner_id,
                project_id,
                item_id,
                warehouse_id,
                created_at,
                updated_at
            ) VALUES (
                @id,
                @journalId,
                @lineNo,
                @accountId,
                @description,
                @debit,
                @credit,
                @currencyCode,
                @exchangeRate,
                @baseDebit,
                @baseCredit,
                @branchId,
                @costCenterId,
                @expenseTypeId,
                @vehicleId,
                @partnerId,
                @projectId,
                @itemId,
                @warehouseId,
                @createdAt,
                @updatedAt
            )
            `,
        );

        for (const line of lines) {
            stmt.run(line.toJSON());
        }
    }

    listByJournalId(journalId: string): JournalLineEntity[] {
        const rows = this.db
            .prepare(
                `
                SELECT *
                FROM journal_lines
                WHERE journal_id = ?
                ORDER BY line_no ASC
                `,
            )
            .all(journalId) as JournalLineRow[];

        return rows.map((row) =>
            JournalLineEntity.create({
                id: row.id,
                journalId: row.journal_id,
                lineNo: Number(row.line_no || 0),
                accountId: row.account_id,
                description: row.description,
                debit: Number(row.debit || 0),
                credit: Number(row.credit || 0),
                currencyCode: row.currency_code || 'ILS',
                exchangeRate: Number(row.exchange_rate || 1),
                baseDebit: Number(row.base_debit || 0),
                baseCredit: Number(row.base_credit || 0),
                branchId: row.branch_id,
                costCenterId: row.cost_center_id,
                expenseTypeId: row.expense_type_id,
                vehicleId: row.vehicle_id,
                partnerId: row.partner_id,
                projectId: row.project_id,
                itemId: row.item_id,
                warehouseId: row.warehouse_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }),
        );
    }
}
