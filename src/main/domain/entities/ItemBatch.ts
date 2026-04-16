export class ItemBatch {
    public readonly id: string;
    public readonly itemId: string;
    public readonly batchNumber: string;

    public productionDate?: Date;
    public expiryDate?: Date;
    public isActive: boolean;

    constructor(
        id: string,
        itemId: string,
        batchNumber: string,
        isActive: boolean = true,
        productionDate?: Date,
        expiryDate?: Date
    ) {
        this.id = id;
        this.itemId = itemId;
        this.batchNumber = batchNumber;
        this.isActive = isActive;
        this.productionDate = productionDate;
        this.expiryDate = expiryDate;
        this.validate();
    }

    private validate() {
        if (!this.batchNumber || this.batchNumber.trim() === '') {
            throw new Error("Batch Number is required");
        }
        if (!this.itemId) {
            throw new Error("Item ID is required for a batch");
        }
    }

    public updateDetails(isActive: boolean, productionDate?: Date, expiryDate?: Date) {
        this.isActive = isActive;
        if (productionDate !== undefined) this.productionDate = productionDate;
        if (expiryDate !== undefined) this.expiryDate = expiryDate;
        this.validate();
    }
}
