import { DomainError } from '../../domain/errors';
import { chartOfAccountsSeed } from '../../domain/chartOfAccounts/seeds/chartOfAccountsSeed';
import { ChartOfAccountsValidationService } from '../../domain/chartOfAccounts/services/ChartOfAccountsValidationService';
import { SeedAccount } from '../../domain/chartOfAccounts/types/SeedAccount';
import {
    SeedDefaultChartResult,
    ChartOfAccountsSeedPort,
    ChartOfAccountsRepositoryPort,
} from '../../application/ports/ChartOfAccountsPorts';
import { SeedDuplicateStrategy } from '../../application/dtos/ChartOfAccountsDtos';

export class ChartOfAccountsSeedService implements ChartOfAccountsSeedPort {
    constructor(
        private readonly repository: ChartOfAccountsRepositoryPort,
        private readonly validation: ChartOfAccountsValidationService = new ChartOfAccountsValidationService(),
    ) {}

    async seedDefaultChartOfAccounts(
        companyId: string,
        strategy: SeedDuplicateStrategy = 'skip',
    ): Promise<SeedDefaultChartResult> {
        const normalizedCompanyId = String(companyId || '').trim();
        if (!normalizedCompanyId) {
            throw new DomainError('ERR_ACCOUNT_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.account.company.required',
            });
        }

        this.validation.validateSeedIntegrity(chartOfAccountsSeed);
        return this.repository.seedDefaultChartOfAccounts(normalizedCompanyId, chartOfAccountsSeed, strategy);
    }

    async seedCustomChart(
        companyId: string,
        seed: SeedAccount[],
        strategy: SeedDuplicateStrategy = 'skip',
    ): Promise<SeedDefaultChartResult> {
        const normalizedCompanyId = String(companyId || '').trim();
        if (!normalizedCompanyId) {
            throw new DomainError('ERR_ACCOUNT_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.account.company.required',
            });
        }
        this.validation.validateSeedIntegrity(seed);
        return this.repository.seedDefaultChartOfAccounts(normalizedCompanyId, seed, strategy);
    }
}
