export type ProductionOrderStatus =
    | 'Draft'
    | 'Released'
    | 'InProgress'
    | 'Completed'
    | 'Cancelled';

export class ProductionOrder {
    constructor(
        public readonly id: string,
        public readonly companyId: string,
        public orderNo: string,
        public bomId: string,
        public productId: string,
        public productName: string,
        public plannedQty: number,
        public producedQty: number = 0,
        public status: ProductionOrderStatus = 'Draft',
        public plannedDate: string = new Date().toISOString().split('T')[0],
        public completedDate: string | null = null,
        public notes: string = '',
        public readonly createdAt: string = new Date().toISOString()
    ) { }

    get remainingQty(): number {
        return this.plannedQty - this.producedQty;
    }

    release(): void {
        if (this.status !== 'Draft') throw new Error('Only Draft orders can be released.');
        this.status = 'Released';
    }

    execute(qty: number, date: string): void {
        if (this.status === 'Cancelled') throw new Error('Order is cancelled.');
        if (this.status === 'Completed') throw new Error('Order already completed.');
        if (qty <= 0) throw new Error('Quantity must be positive.');
        if (qty > this.remainingQty) {
            throw new Error(`Cannot produce ${qty}. Only ${this.remainingQty} remaining.`);
        }
        this.producedQty += qty;
        this.status = 'InProgress';
        if (this.producedQty >= this.plannedQty) {
            this.status = 'Completed';
            this.completedDate = date;
        }
    }

    cancel(): void {
        if (this.status === 'Completed') throw new Error('Cannot cancel a completed order.');
        this.status = 'Cancelled';
    }
}
