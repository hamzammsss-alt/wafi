import Database from 'better-sqlite3';
import { SqliteChartOfAccountsRepo } from '../src/main/infrastructure/adapters/SqliteChartOfAccountsRepo';
import { ChartOfAccountsSeedService } from '../src/main/infrastructure/services/ChartOfAccountsSeedService';

async function run(): Promise<void> {
    const dbPath = process.argv[2] || 'wafi.db';
    const companyId = process.argv[3] || 'COMP_01';

    const db = new Database(dbPath);
    const repo = new SqliteChartOfAccountsRepo(db);
    const seeder = new ChartOfAccountsSeedService(repo);

    const seedResult = await seeder.seedDefaultChartOfAccounts(companyId, 'skip');
    const flat = await repo.listFlatAccounts(companyId, {
        includeInactive: true,
        search: null,
        category: null,
        posting: 'ALL',
    });

    const byId = new Map(flat.map((account) => [account.id, account]));
    const childrenCount = new Map<string, number>();
    for (const row of flat) {
        if (!row.parentId) continue;
        childrenCount.set(row.parentId, (childrenCount.get(row.parentId) || 0) + 1);
    }

    const violations: string[] = [];
    for (const row of flat) {
        const segments = row.path.split('/').filter(Boolean);
        if (segments[segments.length - 1] !== row.code) {
            violations.push(`Path mismatch for ${row.code}: ${row.path}`);
        }
        if (segments.length !== row.level) {
            violations.push(`Level mismatch for ${row.code}: level=${row.level}, path=${row.path}`);
        }
        if (row.parentId) {
            const parent = byId.get(row.parentId);
            if (!parent) {
                violations.push(`Missing parent for ${row.code} (parentId=${row.parentId})`);
            }
        }
        if (row.isPosting && (childrenCount.get(row.id) || 0) > 0) {
            violations.push(`Posting account has children: ${row.code}`);
        }
    }

    console.log('[verify_chart_of_accounts_seed] summary', {
        dbPath,
        companyId,
        seedResult,
        totalAccounts: flat.length,
        violations: violations.length,
    });

    if (violations.length) {
        console.error('[verify_chart_of_accounts_seed] violations');
        for (const violation of violations) {
            console.error(`- ${violation}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log('[verify_chart_of_accounts_seed] OK');
}

run().catch((error) => {
    console.error('[verify_chart_of_accounts_seed] FAILED', error);
    process.exitCode = 1;
});
