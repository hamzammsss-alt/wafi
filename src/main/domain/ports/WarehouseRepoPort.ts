import { Warehouse, BinLocation } from '../entities/Warehouse';

export interface WarehouseRepoPort {
    findById(id: string, companyId: string): Promise<Warehouse | null>;
    findAll(companyId: string): Promise<Warehouse[]>;
    create(warehouse: Warehouse): Promise<void>;
    update(warehouse: Warehouse): Promise<void>;
    delete(id: string, companyId: string): Promise<void>;
}

export interface BinLocationRepoPort {
    findById(id: string): Promise<BinLocation | null>;
    findByWarehouse(warehouseId: string): Promise<BinLocation[]>;
    create(binLocation: BinLocation): Promise<void>;
    update(binLocation: BinLocation): Promise<void>;
    delete(id: string): Promise<void>;
}
