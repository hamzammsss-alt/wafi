"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemBatch = void 0;
class ItemBatch {
    constructor(id, itemId, batchNumber, isActive = true, productionDate, expiryDate) {
        this.id = id;
        this.itemId = itemId;
        this.batchNumber = batchNumber;
        this.isActive = isActive;
        this.productionDate = productionDate;
        this.expiryDate = expiryDate;
        this.validate();
    }
    validate() {
        if (!this.batchNumber || this.batchNumber.trim() === '') {
            throw new Error("Batch Number is required");
        }
        if (!this.itemId) {
            throw new Error("Item ID is required for a batch");
        }
    }
    updateDetails(isActive, productionDate, expiryDate) {
        this.isActive = isActive;
        if (productionDate !== undefined)
            this.productionDate = productionDate;
        if (expiryDate !== undefined)
            this.expiryDate = expiryDate;
        this.validate();
    }
}
exports.ItemBatch = ItemBatch;
