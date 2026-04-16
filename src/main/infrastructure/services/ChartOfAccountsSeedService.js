"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartOfAccountsSeedService = void 0;
const errors_1 = require("../../domain/errors");
const chartOfAccountsSeed_1 = require("../../domain/chartOfAccounts/seeds/chartOfAccountsSeed");
const ChartOfAccountsValidationService_1 = require("../../domain/chartOfAccounts/services/ChartOfAccountsValidationService");
class ChartOfAccountsSeedService {
    constructor(repository, validation = new ChartOfAccountsValidationService_1.ChartOfAccountsValidationService()) {
        this.repository = repository;
        this.validation = validation;
    }
    async seedDefaultChartOfAccounts(companyId, strategy = 'skip') {
        const normalizedCompanyId = String(companyId || '').trim();
        if (!normalizedCompanyId) {
            throw new errors_1.DomainError('ERR_ACCOUNT_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.account.company.required',
            });
        }
        this.validation.validateSeedIntegrity(chartOfAccountsSeed_1.chartOfAccountsSeed);
        return this.repository.seedDefaultChartOfAccounts(normalizedCompanyId, chartOfAccountsSeed_1.chartOfAccountsSeed, strategy);
    }
    async seedCustomChart(companyId, seed, strategy = 'skip') {
        const normalizedCompanyId = String(companyId || '').trim();
        if (!normalizedCompanyId) {
            throw new errors_1.DomainError('ERR_ACCOUNT_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.account.company.required',
            });
        }
        this.validation.validateSeedIntegrity(seed);
        return this.repository.seedDefaultChartOfAccounts(normalizedCompanyId, seed, strategy);
    }
}
exports.ChartOfAccountsSeedService = ChartOfAccountsSeedService;
