export class CostCenter {
    public readonly id: string;
    public readonly companyId: string;
    public readonly code: string;

    // Basic Details
    public nameEn: string;
    public nameAr?: string;
    public description?: string;
    public isActive: boolean;

    // Hierarchy Support
    public parentId?: string;
    public isParent: boolean;

    constructor(
        id: string,
        companyId: string,
        code: string,
        nameEn: string,
        isActive: boolean = true,
        isParent: boolean = false,
        nameAr?: string,
        description?: string,
        parentId?: string
    ) {
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

    private validate() {
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
    public updateDetails(nameEn: string, nameAr?: string, description?: string, isActive?: boolean, isParent?: boolean, parentId?: string) {
        this.nameEn = nameEn;
        if (nameAr !== undefined) this.nameAr = nameAr;
        if (description !== undefined) this.description = description;
        if (isActive !== undefined) this.isActive = isActive;
        if (isParent !== undefined) this.isParent = isParent;
        if (parentId !== undefined) {
            if (parentId === this.id) {
                throw new Error('A Cost Center cannot be its own parent.');
            }
            this.parentId = parentId;
        }

        this.validate(); // Re-validate on update
    }
}
