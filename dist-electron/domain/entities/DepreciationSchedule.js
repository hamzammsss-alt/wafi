"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepreciationSchedule = void 0;
class DepreciationSchedule {
    constructor(id, assetId, periodDate, // 'YYYY-MM-DD' — the period this entry covers
    amount, journalEntryId = null, createdAt = new Date().toISOString()) {
        this.id = id;
        this.assetId = assetId;
        this.periodDate = periodDate;
        this.amount = amount;
        this.journalEntryId = journalEntryId;
        this.createdAt = createdAt;
    }
}
exports.DepreciationSchedule = DepreciationSchedule;
