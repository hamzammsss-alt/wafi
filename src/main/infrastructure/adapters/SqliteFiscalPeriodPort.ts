import { FiscalPeriodPort } from '../../application/ports/AccountingPorts';
import { DomainError } from '../../domain/errors';
import db from 'better-sqlite3';

const database = new db('wafi.db');

export class SqliteFiscalPeriodPort implements FiscalPeriodPort {
    async ensureIsOpen(companyId: string, dateString: string): Promise<void> {
        const row = database.prepare(`
            SELECT status FROM fiscal_periods 
            WHERE company_id = ? AND start_date <= ? AND end_date >= ?
        `).get(companyId, dateString, dateString) as any;

        if (!row) {
            throw new DomainError('VALIDATION_ERROR', 'No fiscal period exists for this date.');
        }
        if (row.status === 'CLOSED') {
            throw new DomainError('VALIDATION_ERROR', 'Fiscal period is CLOSED.');
        }
    }
}
