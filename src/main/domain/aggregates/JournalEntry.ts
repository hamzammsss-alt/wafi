import { JournalLine } from '../entities/JournalLine';
import { DomainError } from '../errors';
import { Money } from '../valueObjects/Money';
import { DocumentBase, DocumentStatus } from '../entities/DocumentBase';

export class JournalEntry extends DocumentBase {
    constructor(
        id: string,
        companyId: string,
        branchId: string,
        public number: string,
        date: string,
        reference: string,
        public notes: string,
        status: DocumentStatus,
        private _lines: JournalLine[],
        public readonly createdAt: string,
        public updatedAt: string,
        public postedAt: string | null
    ) {
        super(id, companyId, branchId, date, status, reference);
        if (!number || number.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Journal number is required');
        if (!date || date.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Journal date is required');
    }


    get lines(): ReadonlyArray<JournalLine> { return this._lines; }

    public updateHeader(date: string, reference: string, notes: string): void {
        this.ensureIsDraft();
        if (!date || date.trim() === '') throw new DomainError('VALIDATION_ERROR', 'Journal date cannot be empty');
        this.date = date;
        this.reference = reference;
        this.notes = notes;
    }

    public updateLines(linesData: JournalLine[]): void {
        this.ensureIsDraft();
        this._lines = [...linesData];
    }

    public validate(): void {
        if (this._lines.length < 2) {
            throw new DomainError('VALIDATION_ERROR', 'Journal entry must have at least 2 lines');
        }

        let totalDebit = 0;
        let totalCredit = 0;

        // Track foreign balances by currency
        const foreignBalances = new Map<string, number>();

        for (const line of this._lines) {
            if (line.debit < 0 || line.credit < 0) {
                throw new DomainError('VALIDATION_ERROR', 'Negative values not permitted in journals');
            }
            if (line.debit > 0 && line.credit > 0) {
                throw new DomainError('VALIDATION_ERROR', `Line ${line.id} cannot contain both debit and credit`);
            }
            if (line.debit === 0 && line.credit === 0) {
                throw new DomainError('VALIDATION_ERROR', `Line ${line.id} must have either debit or credit`);
            }

            if (line.currencyId) {
                const fDebit = line.foreignDebit || 0;
                const fCredit = line.foreignCredit || 0;
                const currentBalance = foreignBalances.get(line.currencyId) || 0;
                foreignBalances.set(line.currencyId, currentBalance + (fDebit - fCredit));
            }

            totalDebit += line.debit;
            totalCredit += line.credit;
        }

        const variance = Math.abs(Money.round(totalDebit) - Money.round(totalCredit));
        if (variance > 0.00) {
            throw new DomainError('VALIDATION_ERROR', `Journal entry is out of balance by ${variance} (Base Currency)`);
        }

        // Validate foreign balances
        for (const [currencyId, balance] of foreignBalances.entries()) {
            if (Math.abs(Money.round(balance)) > 0.00) {
                throw new DomainError('VALIDATION_ERROR', `Journal entry is out of balance by ${balance} for currency ${currencyId}`);
            }
        }
    }

    public post(): void {
        this.ensureIsDraft();
        this.validate();
        this.setStatus(DocumentStatus.POSTED);
        this.postedAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    private ensureIsDraft() {
        if (!this.isDraft()) {
            throw new DomainError('VALIDATION_ERROR', 'Only DRAFT journals can be modified');
        }
    }
}
