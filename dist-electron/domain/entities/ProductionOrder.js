"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionOrder = void 0;
class ProductionOrder {
    constructor(id, companyId, orderNo, bomId, productId, productName, plannedQty, producedQty = 0, status = 'Draft', plannedDate = new Date().toISOString().split('T')[0], completedDate = null, notes = '', createdAt = new Date().toISOString()) {
        this.id = id;
        this.companyId = companyId;
        this.orderNo = orderNo;
        this.bomId = bomId;
        this.productId = productId;
        this.productName = productName;
        this.plannedQty = plannedQty;
        this.producedQty = producedQty;
        this.status = status;
        this.plannedDate = plannedDate;
        this.completedDate = completedDate;
        this.notes = notes;
        this.createdAt = createdAt;
    }
    get remainingQty() {
        return this.plannedQty - this.producedQty;
    }
    release() {
        if (this.status !== 'Draft')
            throw new Error('Only Draft orders can be released.');
        this.status = 'Released';
    }
    execute(qty, date) {
        if (this.status === 'Cancelled')
            throw new Error('Order is cancelled.');
        if (this.status === 'Completed')
            throw new Error('Order already completed.');
        if (qty <= 0)
            throw new Error('Quantity must be positive.');
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
    cancel() {
        if (this.status === 'Completed')
            throw new Error('Cannot cancel a completed order.');
        this.status = 'Cancelled';
    }
}
exports.ProductionOrder = ProductionOrder;
