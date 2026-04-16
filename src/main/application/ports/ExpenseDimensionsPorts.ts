import {
    CostCenterDimension,
    CostCenterExpenseReportRow,
    DimensionListQuery,
    ExpenseReportQuery,
    ExpenseTypeDimension,
    ExpenseTypeReportRow,
    JournalLineDimensions,
    VehicleDimension,
    VehicleExpenseReportRow,
} from '../../domain/expenseDimensions/types/ExpenseDimensionTypes';

export interface ExpenseDimensionsRepositoryPort {
    listExpenseTypes(companyId: string, query: DimensionListQuery): Promise<ExpenseTypeDimension[]>;
    listCostCenters(companyId: string, query: DimensionListQuery): Promise<CostCenterDimension[]>;
    listVehicles(companyId: string, query: DimensionListQuery): Promise<VehicleDimension[]>;
    validateJournalLineDimensions(companyId: string, dimensions: JournalLineDimensions): Promise<void>;

    getVehicleExpenseReport(companyId: string, query: ExpenseReportQuery): Promise<VehicleExpenseReportRow[]>;
    getExpenseTypeReport(companyId: string, query: ExpenseReportQuery): Promise<ExpenseTypeReportRow[]>;
    getCostCenterExpenseReport(companyId: string, query: ExpenseReportQuery): Promise<CostCenterExpenseReportRow[]>;
}
