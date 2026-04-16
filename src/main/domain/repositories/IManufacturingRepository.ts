import { WorkCenter } from '../entities/WorkCenter';
import { BillOfMaterial } from '../entities/BillOfMaterial';
import { RoutingOperation } from '../entities/RoutingOperation';
import { ProductionOrder } from '../entities/ProductionOrder';
import { JobCard } from '../entities/JobCard';

export interface MaterialConsumptionLine {
    itemId: string;
    itemName: string;
    unit: string;
    wastePercent: number;
    requiredQty: number;
    issuedQty: number;
    unitCost: number;
    totalCost: number;
}

export interface MaterialConsumptionResult {
    orderId: string;
    productionQty: number;
    warehouseId: string | null;
    totalMaterialCost: number;
    producedUnitCost: number;
    lines: MaterialConsumptionLine[];
}

export interface IManufacturingRepository {
    nextIdentity(): string;

    // Work Centers
    saveWorkCenter(wc: WorkCenter): Promise<void>;
    getWorkCenters(companyId: string): Promise<WorkCenter[]>;
    deleteWorkCenter(id: string): Promise<void>;

    // BOM
    saveBOM(bom: BillOfMaterial): Promise<void>;
    getBOMs(companyId: string): Promise<BillOfMaterial[]>;
    getBOMById(id: string): Promise<BillOfMaterial | null>;

    // Routing
    saveRouting(op: RoutingOperation): Promise<void>;
    deleteRoutingsByBOM(bomId: string): Promise<void>;
    getRoutingsByBOM(bomId: string): Promise<RoutingOperation[]>;

    // Production Orders
    saveOrder(order: ProductionOrder): Promise<void>;
    getOrders(companyId: string): Promise<ProductionOrder[]>;
    getOrderById(id: string): Promise<ProductionOrder | null>;
    consumeMaterialsForExecution(
        order: ProductionOrder,
        bom: BillOfMaterial,
        qty: number,
        executionDate: string
    ): Promise<MaterialConsumptionResult>;

    // Job Cards
    saveJobCard(card: JobCard): Promise<void>;
    getJobCardById(id: string): Promise<JobCard | null>;
    getJobCards(orderId: string): Promise<JobCard[]>;
}
