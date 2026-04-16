"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxGroup = void 0;
class TaxGroup {
    constructor(id, companyId, code, nameEn, ratePercent, isActive = true, nameAr) {
        this.id = id;
        this.companyId = companyId;
        this.code = code;
        this.ratePercent = ratePercent;
        this.isActive = isActive;
        this.nameEn = nameEn;
        this.nameAr = nameAr;
        this.validate();
    }
    validate() {
        if (!this.code || this.code.trim() === '') {
            throw new Error("Tax Group code is required");
        }
        if (!this.nameEn || this.nameEn.trim() === '') {
            throw new Error("Tax Group English name is required");
        }
        if (this.ratePercent < 0 || this.ratePercent > 100) {
            throw new Error("Tax rate must be between 0 and 100");
        }
    }
    updateDetails(nameEn, ratePercent, isActive, nameAr) {
        this.nameEn = nameEn;
        this.ratePercent = ratePercent;
        this.isActive = isActive;
        if (nameAr !== undefined)
            this.nameAr = nameAr;
        this.validate();
    }
}
exports.TaxGroup = TaxGroup;
