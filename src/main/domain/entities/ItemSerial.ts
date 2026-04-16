export class ItemSerial {
    public readonly id: string;
    public readonly itemId: string;
    public readonly serialNumber: string;

    // Status can be 'Available', 'Reserved', 'Sold', 'Returned', 'Defective'
    public status: 'Available' | 'Reserved' | 'Sold' | 'Returned' | 'Defective';
    public batchId?: string; // Optional link to a batch

    constructor(
        id: string,
        itemId: string,
        serialNumber: string,
        status: 'Available' | 'Reserved' | 'Sold' | 'Returned' | 'Defective' = 'Available',
        batchId?: string
    ) {
        this.id = id;
        this.itemId = itemId;
        this.serialNumber = serialNumber;
        this.status = status;
        this.batchId = batchId;
        this.validate();
    }

    private validate() {
        if (!this.serialNumber || this.serialNumber.trim() === '') {
            throw new Error("Serial Number is required");
        }
        if (!this.itemId) {
            throw new Error("Item ID is required for a serial number");
        }
    }

    public updateStatus(newStatus: 'Available' | 'Reserved' | 'Sold' | 'Returned' | 'Defective') {
        this.status = newStatus;
        this.validate();
    }
}
