"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalLineEntity = void 0;
const errors_1 = require("../../errors");
const Money_1 = require("../../valueObjects/Money");
class JournalLineEntity {
    constructor(props) {
        this.props = props;
    }
    static create(props) {
        const lineNo = Number(props.lineNo || 0);
        if (!Number.isInteger(lineNo) || lineNo <= 0) {
            throw new errors_1.DomainError('ERR_JOURNAL_LINE_NO_INVALID', 'Line number must be a positive integer');
        }
        const accountId = String(props.accountId || '').trim();
        if (!accountId) {
            throw new errors_1.DomainError('ERR_JOURNAL_LINE_ACCOUNT_REQUIRED', 'Account id is required');
        }
        const debit = Money_1.Money.round(Number(props.debit || 0));
        const credit = Money_1.Money.round(Number(props.credit || 0));
        const baseDebit = Money_1.Money.round(Number(props.baseDebit || 0));
        const baseCredit = Money_1.Money.round(Number(props.baseCredit || 0));
        if (debit > 0 && credit > 0) {
            throw new errors_1.DomainError('ERR_JOURNAL_LINE_BOTH_DEBIT_CREDIT', 'A line cannot contain both debit and credit');
        }
        if (debit === 0 && credit === 0) {
            throw new errors_1.DomainError('ERR_JOURNAL_LINE_ZERO_VALUE', 'A line cannot contain zero debit and zero credit');
        }
        return new JournalLineEntity({
            ...props,
            id: String(props.id || '').trim(),
            journalId: String(props.journalId || '').trim(),
            lineNo,
            accountId,
            description: props.description ? String(props.description).trim() : null,
            debit,
            credit,
            currencyCode: String(props.currencyCode || 'ILS').trim().toUpperCase(),
            exchangeRate: Number(props.exchangeRate || 1),
            baseDebit,
            baseCredit,
            branchId: props.branchId ? String(props.branchId).trim() : null,
            costCenterId: props.costCenterId ? String(props.costCenterId).trim() : null,
            expenseTypeId: props.expenseTypeId ? String(props.expenseTypeId).trim() : null,
            vehicleId: props.vehicleId ? String(props.vehicleId).trim() : null,
            partnerId: props.partnerId ? String(props.partnerId).trim() : null,
            projectId: props.projectId ? String(props.projectId).trim() : null,
            itemId: props.itemId ? String(props.itemId).trim() : null,
            warehouseId: props.warehouseId ? String(props.warehouseId).trim() : null,
            createdAt: String(props.createdAt || new Date().toISOString()),
            updatedAt: String(props.updatedAt || new Date().toISOString()),
        });
    }
    get id() { return this.props.id; }
    get journalId() { return this.props.journalId; }
    get lineNo() { return this.props.lineNo; }
    get accountId() { return this.props.accountId; }
    get description() { return this.props.description; }
    get debit() { return this.props.debit; }
    get credit() { return this.props.credit; }
    get currencyCode() { return this.props.currencyCode; }
    get exchangeRate() { return this.props.exchangeRate; }
    get baseDebit() { return this.props.baseDebit; }
    get baseCredit() { return this.props.baseCredit; }
    get branchId() { return this.props.branchId; }
    get costCenterId() { return this.props.costCenterId; }
    get expenseTypeId() { return this.props.expenseTypeId; }
    get vehicleId() { return this.props.vehicleId; }
    get partnerId() { return this.props.partnerId; }
    get projectId() { return this.props.projectId; }
    get itemId() { return this.props.itemId; }
    get warehouseId() { return this.props.warehouseId; }
    get createdAt() { return this.props.createdAt; }
    get updatedAt() { return this.props.updatedAt; }
    toJSON() {
        return { ...this.props };
    }
}
exports.JournalLineEntity = JournalLineEntity;
