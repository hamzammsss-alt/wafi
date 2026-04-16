import { DomainError } from '../../errors';
import { Money } from '../../valueObjects/Money';
import { JournalStatus } from '../types/JournalStatus';
import { JournalLineEntity } from './JournalLineEntity';

export interface JournalEntityProps {
    id: string;
    companyId: string;
    branchId: string;
    journalNo: string;
    journalDate: string;
    fiscalPeriodId: string;
    sourceType: string;
    sourceId: string;
    sourceNo: string | null;
    sourceVersion: number;
    referenceNo: string | null;
    description: string | null;
    status: JournalStatus;
    currencyCode: string;
    exchangeRate: number;
    totalDebit: number;
    totalCredit: number;
    postedBy: string;
    postedAt: string;
    reversedJournalId: string | null;
    createdAt: string;
    updatedAt: string;
    lines: JournalLineEntity[];
}

export class JournalEntity {
    private constructor(private readonly props: JournalEntityProps) {}

    static create(props: JournalEntityProps): JournalEntity {
        const companyId = String(props.companyId || '').trim();
        const branchId = String(props.branchId || '').trim();
        const journalNo = String(props.journalNo || '').trim();
        const journalDate = String(props.journalDate || '').trim();
        const fiscalPeriodId = String(props.fiscalPeriodId || '').trim();
        const sourceType = String(props.sourceType || '').trim().toUpperCase();
        const sourceId = String(props.sourceId || '').trim();
        const postedBy = String(props.postedBy || '').trim();

        if (!companyId) throw new DomainError('ERR_JOURNAL_COMPANY_REQUIRED', 'Company id is required');
        if (!branchId) throw new DomainError('ERR_JOURNAL_BRANCH_REQUIRED', 'Branch id is required');
        if (!journalNo) throw new DomainError('ERR_JOURNAL_NO_REQUIRED', 'Journal number is required');
        if (!journalDate) throw new DomainError('ERR_JOURNAL_DATE_REQUIRED', 'Journal date is required');
        if (!fiscalPeriodId) throw new DomainError('ERR_JOURNAL_PERIOD_REQUIRED', 'Fiscal period id is required');
        if (!sourceType) throw new DomainError('ERR_JOURNAL_SOURCE_TYPE_REQUIRED', 'Source type is required');
        if (!sourceId) throw new DomainError('ERR_JOURNAL_SOURCE_ID_REQUIRED', 'Source id is required');
        if (!postedBy) throw new DomainError('ERR_JOURNAL_POSTED_BY_REQUIRED', 'Posted by is required');

        const totalDebit = Money.round(Number(props.totalDebit || 0));
        const totalCredit = Money.round(Number(props.totalCredit || 0));

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

    get id(): string { return this.props.id; }
    get companyId(): string { return this.props.companyId; }
    get branchId(): string { return this.props.branchId; }
    get journalNo(): string { return this.props.journalNo; }
    get journalDate(): string { return this.props.journalDate; }
    get fiscalPeriodId(): string { return this.props.fiscalPeriodId; }
    get sourceType(): string { return this.props.sourceType; }
    get sourceId(): string { return this.props.sourceId; }
    get sourceNo(): string | null { return this.props.sourceNo; }
    get sourceVersion(): number { return this.props.sourceVersion; }
    get referenceNo(): string | null { return this.props.referenceNo; }
    get description(): string | null { return this.props.description; }
    get status(): JournalStatus { return this.props.status; }
    get currencyCode(): string { return this.props.currencyCode; }
    get exchangeRate(): number { return this.props.exchangeRate; }
    get totalDebit(): number { return this.props.totalDebit; }
    get totalCredit(): number { return this.props.totalCredit; }
    get postedBy(): string { return this.props.postedBy; }
    get postedAt(): string { return this.props.postedAt; }
    get reversedJournalId(): string | null { return this.props.reversedJournalId; }
    get createdAt(): string { return this.props.createdAt; }
    get updatedAt(): string { return this.props.updatedAt; }
    get lines(): JournalLineEntity[] { return [...this.props.lines]; }

    toJSON(): JournalEntityProps {
        return {
            ...this.props,
            lines: [...this.props.lines],
        };
    }
}
