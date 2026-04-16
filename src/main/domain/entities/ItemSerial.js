"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemSerial = void 0;
class ItemSerial {
    constructor(id, itemId, serialNumber, status = 'Available', batchId) {
        this.id = id;
        this.itemId = itemId;
        this.serialNumber = serialNumber;
        this.status = status;
        this.batchId = batchId;
        this.validate();
    }
    validate() {
        if (!this.serialNumber || this.serialNumber.trim() === '') {
            throw new Error("Serial Number is required");
        }
        if (!this.itemId) {
            throw new Error("Item ID is required for a serial number");
        }
    }
    updateStatus(newStatus) {
        this.status = newStatus;
        this.validate();
    }
}
exports.ItemSerial = ItemSerial;
