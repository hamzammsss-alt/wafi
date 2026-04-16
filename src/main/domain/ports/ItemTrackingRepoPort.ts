import { ItemBatch } from '../entities/ItemBatch';
import { ItemSerial } from '../entities/ItemSerial';

export interface ItemBatchRepoPort {
    findById(id: string): Promise<ItemBatch | null>;
    findByItem(itemId: string): Promise<ItemBatch[]>;
    findByBatchNumber(itemId: string, batchNumber: string): Promise<ItemBatch | null>;
    create(batch: ItemBatch): Promise<void>;
    update(batch: ItemBatch): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface ItemSerialRepoPort {
    findById(id: string): Promise<ItemSerial | null>;
    findByItem(itemId: string): Promise<ItemSerial[]>;
    findBySerialNumber(itemId: string, serialNumber: string): Promise<ItemSerial | null>;
    create(serial: ItemSerial): Promise<void>;
    update(serial: ItemSerial): Promise<void>;
    delete(id: string): Promise<void>;
}
