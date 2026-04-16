"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinLocation = exports.Warehouse = void 0;
class Warehouse {
    constructor(id, companyId, code, nameEn, isActive = true, nameAr, location) {
        this.id = id;
        this.companyId = companyId;
        this.code = code;
        this.isActive = isActive;
        this.nameEn = nameEn;
        this.nameAr = nameAr;
        this.location = location;
        this.validate();
    }
    validate() {
        if (!this.code || this.code.trim() === '') {
            throw new Error("Warehouse code is required");
        }
        if (!this.nameEn || this.nameEn.trim() === '') {
            throw new Error("Warehouse English name is required");
        }
    }
    updateDetails(nameEn, isActive, nameAr, location) {
        this.nameEn = nameEn;
        this.isActive = isActive;
        if (nameAr !== undefined)
            this.nameAr = nameAr;
        if (location !== undefined)
            this.location = location;
        this.validate();
    }
}
exports.Warehouse = Warehouse;
class BinLocation {
    constructor(id, warehouseId, code, nameEn, isActive = true, nameAr, capacity) {
        this.id = id;
        this.warehouseId = warehouseId;
        this.code = code;
        this.isActive = isActive;
        this.nameEn = nameEn;
        this.nameAr = nameAr;
        this.capacity = capacity;
        this.validate();
    }
    validate() {
        if (!this.code || this.code.trim() === '') {
            throw new Error("Bin Location code is required");
        }
        if (!this.nameEn || this.nameEn.trim() === '') {
            throw new Error("Bin Location English name is required");
        }
    }
    updateDetails(nameEn, isActive, nameAr, capacity) {
        this.nameEn = nameEn;
        this.isActive = isActive;
        if (nameAr !== undefined)
            this.nameAr = nameAr;
        if (capacity !== undefined)
            this.capacity = capacity;
        this.validate();
    }
}
exports.BinLocation = BinLocation;
