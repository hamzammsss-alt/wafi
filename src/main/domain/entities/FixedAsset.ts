export type DepreciationMethod = 'StraightLine' | 'DecliningBalance';
export type AssetStatus = 'Active' | 'Disposed' | 'FullyDepreciated';

export class FixedAsset {
    constructor(
        public readonly id: string,
        public readonly companyId: string,
        public code: string,
        public name: string,
        public categoryId: string | null,
        public assetAccountId: string | null,
        public accumulatedDepAccountId: string | null,
        public depExpenseAccountId: string | null,
        public purchaseDate: string,
        public purchaseCost: number,
        public salvageValue: number,
        public lifeYears: number,
        public depreciationMethod: DepreciationMethod = 'StraightLine',
        public status: AssetStatus = 'Active',
        public bookValue: number = purchaseCost,
        public accumulatedDepreciation: number = 0,
        public supplierId: string | null = null,
        public supplierAccountId: string | null = null,
        public supplierInvoiceNo: string | null = null,
        public supplierInvoiceAmount: number = purchaseCost,
        public clearanceCost: number = 0,
        public clearanceAccountId: string | null = null,
        public purchaseJournalId: string | null = null,
        public purchaseJournalNo: string | null = null,
        public clearanceJournalId: string | null = null,
        public clearanceJournalNo: string | null = null,
        public readonly createdAt: string = new Date().toISOString()
    ) { }

    /** Annual depreciation amount (Straight Line) */
    annualDepreciation(): number {
        if (this.lifeYears <= 0) return 0;
        if (this.depreciationMethod === 'StraightLine') {
            return (this.purchaseCost - this.salvageValue) / this.lifeYears;
        }
        // Declining Balance: rate = 1 / lifeYears * 2
        const rate = (1 / this.lifeYears) * 2;
        return this.bookValue * rate;
    }

    /** Monthly depreciation amount */
    monthlyDepreciation(): number {
        return this.annualDepreciation() / 12;
    }

    /** Post a depreciation entry — updates book value and accumulated depreciation */
    postDepreciation(amount: number): void {
        if (amount <= 0) throw new Error('Depreciation amount must be positive.');
        const remaining = this.bookValue - this.salvageValue;
        const actual = Math.min(amount, remaining);
        this.accumulatedDepreciation += actual;
        this.bookValue -= actual;
        if (this.bookValue <= this.salvageValue) {
            this.status = 'FullyDepreciated';
        }
    }
}
