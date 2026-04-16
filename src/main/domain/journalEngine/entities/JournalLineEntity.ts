import { DomainError } from '../../errors';
import { Money } from '../../valueObjects/Money';

export interface JournalLineEntityProps {
    id: string;
    journalId: string;
    lineNo: number;
    accountId: string;
    description: string | null;
    debit: number;
    credit: number;
    currencyCode: string;
    exchangeRate: number;
    baseDebit: number;
    baseCredit: number;
    branchId: string | null;
    costCenterId: string | null;
    expenseTypeId: string | null;
    vehicleId: string | null;
    partnerId: string | null;
    projectId: string | null;
    itemId: string | null;
    warehouseId: string | null;
    createdAt: string;
    updatedAt: string;
}

export class JournalLineEntity {
    private constructor(private readonly props: JournalLineEntityProps) {}

    static create(props: JournalLineEntityProps): JournalLineEntity {
        const lineNo = Number(props.lineNo || 0);
        if (!Number.isInteger(lineNo) || lineNo <= 0) {
            throw new DomainError('ERR_JOURNAL_LINE_NO_INVALID', 'Line number must be a positive integer');
        }

        const accountId = String(props.accountId || '').trim();
        if (!accountId) {
            throw new DomainError('ERR_JOURNAL_LINE_ACCOUNT_REQUIRED', 'Account id is required');
        }

        const debit = Money.round(Number(props.debit || 0));
        const credit = Money.round(Number(props.credit || 0));
        const baseDebit = Money.round(Number(props.baseDebit || 0));
        const baseCredit = Money.round(Number(props.baseCredit || 0));

        if (debit > 0 && credit > 0) {
            throw new DomainError('ERR_JOURNAL_LINE_BOTH_DEBIT_CREDIT', 'A line cannot contain both debit and credit');
        }
        if (debit === 0 && credit === 0) {
            throw new DomainError('ERR_JOURNAL_LINE_ZERO_VALUE', 'A line cannot contain zero debit and zero credit');
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

    get id(): string { return this.props.id; }
    get journalId(): string { return this.props.journalId; }
    get lineNo(): number { return this.props.lineNo; }
    get accountId(): string { return this.props.accountId; }
    get description(): string | null { return this.props.description; }
    get debit(): number { return this.props.debit; }
    get credit(): number { return this.props.credit; }
    get currencyCode(): string { return this.props.currencyCode; }
    get exchangeRate(): number { return this.props.exchangeRate; }
    get baseDebit(): number { return this.props.baseDebit; }
    get baseCredit(): number { return this.props.baseCredit; }
    get branchId(): string | null { return this.props.branchId; }
    get costCenterId(): string | null { return this.props.costCenterId; }
    get expenseTypeId(): string | null { return this.props.expenseTypeId; }
    get vehicleId(): string | null { return this.props.vehicleId; }
    get partnerId(): string | null { return this.props.partnerId; }
    get projectId(): string | null { return this.props.projectId; }
    get itemId(): string | null { return this.props.itemId; }
    get warehouseId(): string | null { return this.props.warehouseId; }
    get createdAt(): string { return this.props.createdAt; }
    get updatedAt(): string { return this.props.updatedAt; }

    toJSON(): JournalLineEntityProps {
        return { ...this.props };
    }
}
