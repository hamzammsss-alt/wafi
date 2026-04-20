"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteJournalLineRepo = void 0;
const uuid_1 = require("uuid");
const JournalLineEntity_1 = require("../../domain/journalEngine/entities/JournalLineEntity");
class SqliteJournalLineRepo {
    constructor(db) {
        this.db = db;
    }
    nextIdentity() {
        return (0, uuid_1.v4)();
    }
    insertMany(lines) {
        if (!lines.length)
            return;
        const stmt = this.db.prepare(`
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
            `);
        for (const line of lines) {
            stmt.run(line.toJSON());
        }
    }
    listByJournalId(journalId) {
        const rows = this.db
            .prepare(`
                SELECT *
                FROM journal_lines
                WHERE journal_id = ?
                ORDER BY line_no ASC
                `)
            .all(journalId);
        return rows.map((row) => JournalLineEntity_1.JournalLineEntity.create({
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
        }));
    }
}
exports.SqliteJournalLineRepo = SqliteJournalLineRepo;
