import { DomainError } from '../errors';

export class FiscalPeriod {
    constructor(
        public readonly id: string,
        public readonly companyId: string,
        public readonly year: number,
        public readonly month: number,
        public readonly startDate: string,
        public readonly endDate: string,
        public readonly status: 'OPEN' | 'CLOSED'
    ) { }

    public ensureIsOpenFor(dateString: string): void {
        if (this.status === 'CLOSED') {
            throw new DomainError('VALIDATION_ERROR', `Fiscal period for ${this.year}-${this.month} is CLOSED. Cannot post document.`);
        }
        if (dateString < this.startDate || dateString > this.endDate) {
            throw new DomainError('VALIDATION_ERROR', `Document date ${dateString} falls outside period ${this.startDate} to ${this.endDate}`);
        }
    }
}
