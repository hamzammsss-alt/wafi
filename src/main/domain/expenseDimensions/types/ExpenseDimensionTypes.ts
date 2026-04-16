export interface ExpenseTypeDimension {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    createdAt: string;
}

export interface CostCenterDimension {
    id: string;
    code: string;
    name: string;
    parentId: string | null;
    isActive: boolean;
}

export interface VehicleDimension {
    id: string;
    name: string;
    plateNo: string;
    model: string | null;
    department: string | null;
    isActive: boolean;
}

export interface JournalLineDimensions {
    branchId?: string | null;
    costCenterId?: string | null;
    expenseTypeId?: string | null;
    vehicleId?: string | null;
    partnerId?: string | null;
    projectId?: string | null;
}

export interface DimensionListQuery {
    includeInactive?: boolean;
    search?: string;
}

export interface ExpenseReportQuery {
    dateFrom?: string | null;
    dateTo?: string | null;
    branchId?: string | null;
}

export interface VehicleExpenseReportRow {
    vehicleId: string;
    vehicleName: string;
    plateNo: string;
    department: string | null;
    totalDebit: number;
    totalCredit: number;
    netAmount: number;
}

export interface ExpenseTypeReportRow {
    expenseTypeId: string;
    expenseTypeCode: string;
    expenseTypeName: string;
    totalDebit: number;
    totalCredit: number;
    netAmount: number;
}

export interface CostCenterExpenseReportRow {
    costCenterId: string;
    costCenterCode: string;
    costCenterName: string;
    parentId: string | null;
    totalDebit: number;
    totalCredit: number;
    netAmount: number;
}
