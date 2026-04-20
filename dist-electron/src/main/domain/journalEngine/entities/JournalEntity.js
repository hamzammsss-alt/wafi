"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEntity = void 0;
const errors_1 = require("../../errors");
const Money_1 = require("../../valueObjects/Money");
class JournalEntity {
    constructor(props) {
        this.props = props;
    }
    static create(props) {
        const companyId = String(props.companyId || '').trim();
        const branchId = String(props.branchId || '').trim();
        const journalNo = String(props.journalNo || '').trim();
        const journalDate = String(props.journalDate || '').trim();
        const fiscalPeriodId = String(props.fiscalPeriodId || '').trim();
        const sourceType = String(props.sourceType || '').trim().toUpperCase();
        const sourceId = String(props.sourceId || '').trim();
        const postedBy = String(props.postedBy || '').trim();
        if (!companyId)
            throw new errors_1.DomainError('ERR_JOURNAL_COMPANY_REQUIRED', 'Company id is required');
        if (!branchId)
            throw new errors_1.DomainError('ERR_JOURNAL_BRANCH_REQUIRED', 'Branch id is required');
        if (!journalNo)
            throw new errors_1.DomainError('ERR_JOURNAL_NO_REQUIRED', 'Journal number is required');
        if (!journalDate)
            throw new errors_1.DomainError('ERR_JOURNAL_DATE_REQUIRED', 'Journal date is required');
        if (!fiscalPeriodId)
            throw new errors_1.DomainError('ERR_JOURNAL_PERIOD_REQUIRED', 'Fiscal period id is required');
        if (!sourceType)
            throw new errors_1.DomainError('ERR_JOURNAL_SOURCE_TYPE_REQUIRED', 'Source type is required');
        if (!sourceId)
            throw new errors_1.DomainError('ERR_JOURNAL_SOURCE_ID_REQUIRED', 'Source id is required');
        if (!postedBy)
            throw new errors_1.DomainError('ERR_JOURNAL_POSTED_BY_REQUIRED', 'Posted by is required');
        const totalDebit = Money_1.Money.round(Number(props.totalDebit || 0));
        const totalCredit = Money_1.Money.round(Number(props.totalCredit || 0));
        return new JournalEntity({
            ...props,
            id: String(props.id || '').trim(),
            companyId,
            branchId,
            journalNo,
            journalDate,
            fiscalPeriodId,
            sourceType,
            sourceId,
            sourceNo: props.sourceNo ? String(props.sourceNo).trim() : null,
            sourceVersion: Number(props.sourceVersion || 1),
            referenceNo: props.referenceNo ? String(props.referenceNo).trim() : null,
            description: props.description ? String(props.description).trim() : null,
            status: props.status,
            currencyCode: String(props.currencyCode || 'ILS').trim().toUpperCase(),
            exchangeRate: Number(props.exchangeRate || 1),
            totalDebit,
            totalCredit,
            postedBy,
            postedAt: String(props.postedAt || new Date().toISOString()),
            reversedJournalId: props.reversedJournalId ? String(props.reversedJournalId).trim() : null,
            createdAt: String(props.createdAt || new Date().toISOString()),
            updatedAt: String(props.updatedAt || new Date().toISOString()),
            lines: props.lines || [],
        });
    }
    get id() { return this.props.id; }
    get companyId() { return this.props.companyId; }
    get branchId() { return this.props.branchId; }
    get journalNo() { return this.props.journalNo; }
    get journalDate() { return this.props.journalDate; }
    get fiscalPeriodId() { return this.props.fiscalPeriodId; }
    get sourceType() { return this.props.sourceType; }
    get sourceId() { return this.props.sourceId; }
    get sourceNo() { return this.props.sourceNo; }
    get sourceVersion() { return this.props.sourceVersion; }
    get referenceNo() { return this.props.referenceNo; }
    get description() { return this.props.description; }
    get status() { return this.props.status; }
    get currencyCode() { return this.props.currencyCode; }
    get exchangeRate() { return this.props.exchangeRate; }
    get totalDebit() { return this.props.totalDebit; }
    get totalCredit() { return this.props.totalCredit; }
    get postedBy() { return this.props.postedBy; }
    get postedAt() { return this.props.postedAt; }
    get reversedJournalId() { return this.props.reversedJournalId; }
    get createdAt() { return this.props.createdAt; }
    get updatedAt() { return this.props.updatedAt; }
    get lines() { return [...this.props.lines]; }
    toJSON() {
        return {
            ...this.props,
            lines: [...this.props.lines],
        };
    }
}
exports.JournalEntity = JournalEntity;
