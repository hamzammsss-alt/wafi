"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillOfMaterial = void 0;
class BillOfMaterial {
    constructor(id, companyId, code, productId, productName, outputQuantity = 1, unit = 'EA', laborCost = 0, overheadCost = 0, status = 'Draft', lines = [], createdAt = new Date().toISOString()) {
        this.id = id;
        this.companyId = companyId;
        this.code = code;
        this.productId = productId;
        this.productName = productName;
        this.outputQuantity = outputQuantity;
        this.unit = unit;
        this.laborCost = laborCost;
        this.overheadCost = overheadCost;
        this.status = status;
        this.lines = lines;
        this.createdAt = createdAt;
    }
    /** Total material cost based on lines (no item cost here, quantity-weighted) */
    totalMaterialQtyForOutput() {
        return this.lines.map(l => ({
            itemId: l.itemId,
            quantity: l.quantity * (1 + l.wastePercent / 100),
        }));
    }
    activate() {
        if (this.lines.length === 0)
            throw new Error('Cannot activate a BOM with no lines.');
        this.status = 'Active';
    }
}
exports.BillOfMaterial = BillOfMaterial;
