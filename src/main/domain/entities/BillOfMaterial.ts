export type BOMStatus = 'Draft' | 'Active' | 'Archived';

export interface BOMLine {
    id: string;
    bomId: string;
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    wastePercent: number;
}

export class BillOfMaterial {
    constructor(
        public readonly id: string,
        public readonly companyId: string,
        public code: string,
        public productId: string,
        public productName: string,
        public outputQuantity: number = 1,
        public unit: string = 'EA',
        public laborCost: number = 0,
        public overheadCost: number = 0,
        public status: BOMStatus = 'Draft',
        public lines: BOMLine[] = [],
        public readonly createdAt: string = new Date().toISOString()
    ) { }

    /** Total material cost based on lines (no item cost here, quantity-weighted) */
    totalMaterialQtyForOutput(): { itemId: string; quantity: number }[] {
        return this.lines.map(l => ({
            itemId: l.itemId,
            quantity: l.quantity * (1 + l.wastePercent / 100),
        }));
    }

    activate(): void {
        if (this.lines.length === 0) throw new Error('Cannot activate a BOM with no lines.');
        this.status = 'Active';
    }
}
