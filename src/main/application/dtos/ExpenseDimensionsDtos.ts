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

export interface ListExpenseTypesInput extends DimensionListQuery {}
export interface ListCostCentersInput extends DimensionListQuery {}
export interface ListVehiclesInput extends DimensionListQuery {}

export interface ValidateJournalLineDimensionsInput extends JournalLineDimensions {}

export interface VehicleExpenseReportInput extends ExpenseReportQuery {}
export interface ExpenseTypeReportInput extends ExpenseReportQuery {}
export interface CostCenterExpenseReportInput extends ExpenseReportQuery {}

export interface ExpenseTypeDto extends ExpenseTypeDimension {}
export interface CostCenterDto extends CostCenterDimension {}
export interface VehicleDto extends VehicleDimension {}

export interface VehicleExpenseReportDto extends VehicleExpenseReportRow {}
export interface ExpenseTypeReportDto extends ExpenseTypeReportRow {}
export interface CostCenterExpenseReportDto extends CostCenterExpenseReportRow {}
