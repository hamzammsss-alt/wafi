export class TaxGroup {
    public readonly id: string;
    public readonly companyId: string;
    public readonly code: string;

    public nameEn: string;
    public nameAr?: string;
    public ratePercent: number; // e.g., 16 for 16%
    public isActive: boolean;

    constructor(
        id: string,
        companyId: string,
        code: string,
        nameEn: string,
        ratePercent: number,
        isActive: boolean = true,
        nameAr?: string
    ) {
        this.id = id;
        this.companyId = companyId;
        this.code = code;
        this.ratePercent = ratePercent;
        this.isActive = isActive;
        this.nameEn = nameEn;
        this.nameAr = nameAr;
        this.validate();
    }

    private validate() {
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

    public updateDetails(nameEn: string, ratePercent: number, isActive: boolean, nameAr?: string) {
        this.nameEn = nameEn;
        this.ratePercent = ratePercent;
        this.isActive = isActive;
        if (nameAr !== undefined) this.nameAr = nameAr;
        this.validate();
    }
}
