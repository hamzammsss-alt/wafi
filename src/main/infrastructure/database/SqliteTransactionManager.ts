import { UnitOfWork } from '../../application/ports/AccountingPorts';
import db from 'better-sqlite3';

const database = new db('wafi.db');

export class SqliteTransactionManager implements UnitOfWork {
    async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
        const begin = database.prepare('BEGIN');
        const commit = database.prepare('COMMIT');
        const rollback = database.prepare('ROLLBACK');

        begin.run();
        try {
            const result = await work();
            commit.run();
            return result;
        } catch (error) {
            rollback.run();
            throw error;
        }
    }
}
