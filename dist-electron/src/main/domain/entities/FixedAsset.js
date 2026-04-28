"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedAsset = void 0;
class FixedAsset {
    constructor(id, companyId, code, name, categoryId, assetAccountId, accumulatedDepAccountId, depExpenseAccountId, purchaseDate, purchaseCost, salvageValue, lifeYears, depreciationMethod = 'StraightLine', status = 'Active', bookValue = purchaseCost, accumulatedDepreciation = 0, supplierId = null, supplierAccountId = null, supplierInvoiceNo = null, supplierInvoiceAmount = purchaseCost, clearanceCost = 0, clearanceAccountId = null, purchaseJournalId = null, purchaseJournalNo = null, clearanceJournalId = null, clearanceJournalNo = null, createdAt = new Date().toISOString()) {
        this.id = id;
        this.companyId = companyId;
        this.code = code;
        this.name = name;
        this.categoryId = categoryId;
        this.assetAccountId = assetAccountId;
        this.accumulatedDepAccountId = accumulatedDepAccountId;
        this.depExpenseAccountId = depExpenseAccountId;
        this.purchaseDate = purchaseDate;
        this.purchaseCost = purchaseCost;
        this.salvageValue = salvageValue;
        this.lifeYears = lifeYears;
        this.depreciationMethod = depreciationMethod;
        this.status = status;
        this.bookValue = bookValue;
        this.accumulatedDepreciation = accumulatedDepreciation;
        this.supplierId = supplierId;
        this.supplierAccountId = supplierAccountId;
        this.supplierInvoiceNo = supplierInvoiceNo;
        this.supplierInvoiceAmount = supplierInvoiceAmount;
        this.clearanceCost = clearanceCost;
        this.clearanceAccountId = clearanceAccountId;
        this.purchaseJournalId = purchaseJournalId;
        this.purchaseJournalNo = purchaseJournalNo;
        this.clearanceJournalId = clearanceJournalId;
        this.clearanceJournalNo = clearanceJournalNo;
        this.createdAt = createdAt;
    }
    /** Annual depreciation amount (Straight Line) */
    annualDepreciation() {
        if (this.lifeYears <= 0)
            return 0;
        if (this.depreciationMethod === 'StraightLine') {
            return (this.purchaseCost - this.salvageValue) / this.lifeYears;
        }
        // Declining Balance: rate = 1 / lifeYears * 2
        const rate = (1 / this.lifeYears) * 2;
        return this.bookValue * rate;
    }
    /** Monthly depreciation amount */
    monthlyDepreciation() {
        return this.annualDepreciation() / 12;
    }
    /** Post a depreciation entry — updates book value and accumulated depreciation */
    postDepreciation(amount) {
        if (amount <= 0)
            throw new Error('Depreciation amount must be positive.');
        const remaining = this.bookValue - this.salvageValue;
        const actual = Math.min(amount, remaining);
        this.accumulatedDepreciation += actual;
        this.bookValue -= actual;
        if (this.bookValue <= this.salvageValue) {
            this.status = 'FullyDepreciated';
        }
    }
}
exports.FixedAsset = FixedAsset;
