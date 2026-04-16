import { AccountId } from '../valueObjects/AccountId';
import { Money } from '../valueObjects/Money';

export class JournalLine {
    constructor(
        public readonly id: string,
        public readonly entryId: string,
        public readonly accountId: AccountId,
        public readonly debit: number,
        public readonly credit: number,
        public readonly memo: string,
        public readonly currencyId?: string,
        public readonly exchangeRate?: number,
        public readonly foreignDebit?: number,
        public readonly foreignCredit?: number,
        public readonly branchId?: string | null,
        public readonly costCenterId?: string | null,
        public readonly expenseTypeId?: string | null,
        public readonly vehicleId?: string | null,
        public readonly partnerId?: string | null,
        public readonly projectId?: string | null,
    ) {
        this.debit = Money.round(debit);
        this.credit = Money.round(credit);
        this.foreignDebit = foreignDebit ? Money.round(foreignDebit) : undefined;
        this.foreignCredit = foreignCredit ? Money.round(foreignCredit) : undefined;

        // Basic sanity check: if foreign currency is specified, exchange rate MUST be present
        if (currencyId && (foreignDebit || foreignCredit)) {
            if (!exchangeRate || exchangeRate <= 0) {
                throw new Error("Exchange rate must be a positive number when dealing with foreign currency amounts.");
            }
        }
    }
}
