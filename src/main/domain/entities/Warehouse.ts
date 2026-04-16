export class Warehouse {
    public readonly id: string;
    public readonly companyId: string;
    public readonly code: string;

    public nameEn: string;
    public nameAr?: string;
    public location?: string;
    public isActive: boolean;

    constructor(
        id: string,
        companyId: string,
        code: string,
        nameEn: string,
        isActive: boolean = true,
        nameAr?: string,
        location?: string
    ) {
        this.id = id;
        this.companyId = companyId;
        this.code = code;
        this.isActive = isActive;
        this.nameEn = nameEn;
        this.nameAr = nameAr;
        this.location = location;
        this.validate();
    }

    private validate() {
        if (!this.code || this.code.trim() === '') {
            throw new Error("Warehouse code is required");
        }
        if (!this.nameEn || this.nameEn.trim() === '') {
            throw new Error("Warehouse English name is required");
        }
    }

    public updateDetails(nameEn: string, isActive: boolean, nameAr?: string, location?: string) {
        this.nameEn = nameEn;
        this.isActive = isActive;
        if (nameAr !== undefined) this.nameAr = nameAr;
        if (location !== undefined) this.location = location;
        this.validate();
    }
}

export class BinLocation {
    public readonly id: string;
    public readonly warehouseId: string;
    public readonly code: string;

    public nameEn: string;
    public nameAr?: string;
    public capacity?: number;
    public isActive: boolean;

    constructor(
        id: string,
        warehouseId: string,
        code: string,
        nameEn: string,
        isActive: boolean = true,
        nameAr?: string,
        capacity?: number
    ) {
        this.id = id;
        this.warehouseId = warehouseId;
        this.code = code;
        this.isActive = isActive;
        this.nameEn = nameEn;
        this.nameAr = nameAr;
        this.capacity = capacity;
        this.validate();
    }

    private validate() {
        if (!this.code || this.code.trim() === '') {
            throw new Error("Bin Location code is required");
        }
        if (!this.nameEn || this.nameEn.trim() === '') {
            throw new Error("Bin Location English name is required");
        }
    }

    public updateDetails(nameEn: string, isActive: boolean, nameAr?: string, capacity?: number) {
        this.nameEn = nameEn;
        this.isActive = isActive;
        if (nameAr !== undefined) this.nameAr = nameAr;
        if (capacity !== undefined) this.capacity = capacity;
        this.validate();
    }
}
