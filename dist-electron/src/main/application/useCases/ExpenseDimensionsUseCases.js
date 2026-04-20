"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseDimensionsUseCases = void 0;
class ExpenseDimensionsUseCases {
    constructor(repository) {
        this.repository = repository;
    }
    async listExpenseTypes(companyId, input = {}) {
        return this.repository.listExpenseTypes(companyId, this.normalizeListQuery(input));
    }
    async listCostCenters(companyId, input = {}) {
        return this.repository.listCostCenters(companyId, this.normalizeListQuery(input));
    }
    async listVehicles(companyId, input = {}) {
        return this.repository.listVehicles(companyId, this.normalizeListQuery(input));
    }
    async validateJournalLineDimensions(companyId, input) {
        return this.repository.validateJournalLineDimensions(companyId, {
            branchId: this.normalizeNullable(input.branchId),
            costCenterId: this.normalizeNullable(input.costCenterId),
            expenseTypeId: this.normalizeNullable(input.expenseTypeId),
            vehicleId: this.normalizeNullable(input.vehicleId),
            partnerId: this.normalizeNullable(input.partnerId),
            projectId: this.normalizeNullable(input.projectId),
        });
    }
    async getVehicleExpenseReport(companyId, input = {}) {
        return this.repository.getVehicleExpenseReport(companyId, this.normalizeReportQuery(input));
    }
    async getExpenseTypeReport(companyId, input = {}) {
        return this.repository.getExpenseTypeReport(companyId, this.normalizeReportQuery(input));
    }
    async getCostCenterExpenseReport(companyId, input = {}) {
        return this.repository.getCostCenterExpenseReport(companyId, this.normalizeReportQuery(input));
    }
    normalizeListQuery(input) {
        return {
            includeInactive: Boolean(input.includeInactive),
            search: this.normalizeNullable(input.search) || '',
        };
    }
    normalizeReportQuery(input) {
        return {
            dateFrom: this.normalizeNullable(input.dateFrom),
            dateTo: this.normalizeNullable(input.dateTo),
            branchId: this.normalizeNullable(input.branchId),
        };
    }
    normalizeNullable(value) {
        const normalized = String(value || '').trim();
        return normalized || null;
    }
}
exports.ExpenseDimensionsUseCases = ExpenseDimensionsUseCases;
