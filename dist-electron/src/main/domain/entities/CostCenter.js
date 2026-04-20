"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostCenter = void 0;
class CostCenter {
    constructor(id, companyId, code, nameEn, isActive = true, isParent = false, nameAr, description, parentId) {
        this.id = id;
        this.companyId = companyId;
        this.code = code;
        this.isActive = isActive;
        this.nameEn = nameEn;
        this.nameAr = nameAr;
        this.description = description;
        this.parentId = parentId;
        this.isParent = isParent;
        this.validate();
    }
    validate() {
        if (!this.code || this.code.trim().length === 0) {
            throw new Error('Cost Center code is required.');
        }
        if (!this.nameEn || this.nameEn.trim().length === 0) {
            throw new Error('Cost Center English name is required.');
        }
        if (this.parentId && this.parentId === this.id) {
            throw new Error('A Cost Center cannot be its own parent.');
        }
    }
    /**
     * Updates the cost center details.
     */
    updateDetails(nameEn, nameAr, description, isActive, isParent, parentId) {
        this.nameEn = nameEn;
        if (nameAr !== undefined)
            this.nameAr = nameAr;
        if (description !== undefined)
            this.description = description;
        if (isActive !== undefined)
            this.isActive = isActive;
        if (isParent !== undefined)
            this.isParent = isParent;
        if (parentId !== undefined) {
            if (parentId === this.id) {
                throw new Error('A Cost Center cannot be its own parent.');
            }
            this.parentId = parentId;
        }
        this.validate(); // Re-validate on update
    }
}
exports.CostCenter = CostCenter;
