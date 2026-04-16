import {
    CostCenterExpenseReportInput,
    ExpenseTypeReportInput,
    ListCostCentersInput,
    ListExpenseTypesInput,
    ListVehiclesInput,
    ValidateJournalLineDimensionsInput,
    VehicleExpenseReportInput,
} from '../dtos/ExpenseDimensionsDtos';
import { ExpenseDimensionsRepositoryPort } from '../ports/ExpenseDimensionsPorts';

export class ExpenseDimensionsUseCases {
    constructor(private readonly repository: ExpenseDimensionsRepositoryPort) {}

    async listExpenseTypes(companyId: string, input: ListExpenseTypesInput = {}) {
        return this.repository.listExpenseTypes(companyId, this.normalizeListQuery(input));
    }

    async listCostCenters(companyId: string, input: ListCostCentersInput = {}) {
        return this.repository.listCostCenters(companyId, this.normalizeListQuery(input));
    }

    async listVehicles(companyId: string, input: ListVehiclesInput = {}) {
        return this.repository.listVehicles(companyId, this.normalizeListQuery(input));
    }

    async validateJournalLineDimensions(companyId: string, input: ValidateJournalLineDimensionsInput) {
        return this.repository.validateJournalLineDimensions(companyId, {
            branchId: this.normalizeNullable(input.branchId),
            costCenterId: this.normalizeNullable(input.costCenterId),
            expenseTypeId: this.normalizeNullable(input.expenseTypeId),
            vehicleId: this.normalizeNullable(input.vehicleId),
            partnerId: this.normalizeNullable(input.partnerId),
            projectId: this.normalizeNullable(input.projectId),
        });
    }

    async getVehicleExpenseReport(companyId: string, input: VehicleExpenseReportInput = {}) {
        return this.repository.getVehicleExpenseReport(companyId, this.normalizeReportQuery(input));
    }

    async getExpenseTypeReport(companyId: string, input: ExpenseTypeReportInput = {}) {
        return this.repository.getExpenseTypeReport(companyId, this.normalizeReportQuery(input));
    }

    async getCostCenterExpenseReport(companyId: string, input: CostCenterExpenseReportInput = {}) {
        return this.repository.getCostCenterExpenseReport(companyId, this.normalizeReportQuery(input));
    }

    private normalizeListQuery<T extends ListExpenseTypesInput | ListCostCentersInput | ListVehiclesInput>(input: T) {
        return {
            includeInactive: Boolean(input.includeInactive),
            search: this.normalizeNullable(input.search) || '',
        };
    }

    private normalizeReportQuery<T extends VehicleExpenseReportInput | ExpenseTypeReportInput | CostCenterExpenseReportInput>(input: T) {
        return {
            dateFrom: this.normalizeNullable(input.dateFrom),
            dateTo: this.normalizeNullable(input.dateTo),
            branchId: this.normalizeNullable(input.branchId),
        };
    }

    private normalizeNullable(value?: string | null): string | null {
        const normalized = String(value || '').trim();
        return normalized || null;
    }
}
