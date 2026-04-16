"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManufacturingStockLedgerService = void 0;
const errors_1 = require("../../domain/errors");
const EPSILON = 0.000001;
class ManufacturingStockLedgerService {
    constructor(repository) {
        this.repository = repository;
    }
    postIssue(context, header, lines) {
        return this.postIssueOrReceipt(context, {
            docType: 'PRODUCTION_MATERIAL_ISSUE',
            docId: header.id,
            movementDate: header.issueDate,
            lines: lines.map((line) => ({
                docLineId: line.id,
                itemId: line.componentItemId,
                warehouseId: line.warehouseId,
                qty: line.qty,
                unitCost: line.unitCost,
            })),
            movementSide: 'OUT',
        });
    }
    postReceipt(context, header, lines) {
        return this.postIssueOrReceipt(context, {
            docType: 'PRODUCTION_RECEIPT',
            docId: header.id,
            movementDate: header.receiptDate,
            lines: lines.map((line) => ({
                docLineId: line.id,
                itemId: line.itemId,
                warehouseId: line.warehouseId,
                qty: line.qtyReceived,
                unitCost: line.unitCost,
            })),
            movementSide: 'IN',
        });
    }
    reverse(context, docType, docId, reverseDate) {
        const alreadyReversed = this.repository.hasStockLedgerPosting(context.companyId, docType, docId, true);
        if (alreadyReversed) {
            return {
                status: 'ALREADY_REVERSED',
                reversedAt: new Date().toISOString(),
            };
        }
        const original = this.repository.listStockLedgerEntries(context.companyId, docType, docId, false);
        if (!original.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'No stock ledger posting found for document', {
                messageKey: 'validation.manufacturing.stock.not_posted',
                details: { docType, docId },
            });
        }
        const now = new Date().toISOString();
        const movementDate = String(reverseDate || '').slice(0, 10);
        const reversals = original.map((entry) => ({
            id: this.repository.nextIdentity(),
            companyId: entry.companyId,
            branchId: entry.branchId,
            docType,
            docId,
            docLineId: entry.docLineId,
            itemId: entry.itemId,
            warehouseId: entry.warehouseId,
            qtyIn: this.round(entry.qtyOut),
            qtyOut: this.round(entry.qtyIn),
            unitCost: this.round(entry.unitCost),
            totalCost: this.round(entry.totalCost),
            movementSide: entry.movementSide === 'IN' ? 'OUT' : 'IN',
            isReversal: true,
            reversedEntryId: entry.id,
            movementDate,
            createdAt: now,
        }));
        try {
            this.repository.insertStockLedgerEntries(reversals);
        }
        catch (error) {
            if (String(error?.message || '').includes('UNIQUE constraint failed: stock_ledger_entries')) {
                return {
                    status: 'ALREADY_REVERSED',
                    reversedAt: now,
                };
            }
            throw error;
        }
        return {
            status: 'REVERSED',
            reversedAt: now,
        };
    }
    postIssueOrReceipt(context, payload) {
        const alreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, payload.docType, payload.docId, false);
        if (alreadyPosted) {
            return {
                status: 'ALREADY_POSTED',
                postedAt: new Date().toISOString(),
            };
        }
        const now = new Date().toISOString();
        const movementDate = String(payload.movementDate || '').slice(0, 10);
        const entries = [];
        for (const line of payload.lines) {
            const qty = this.round(line.qty);
            if (qty <= EPSILON)
                continue;
            const warehouseId = this.normalizeRequired(line.warehouseId, 'Warehouse is required for stock movement', {
                docType: payload.docType,
                docId: payload.docId,
                docLineId: line.docLineId,
            });
            const itemId = this.normalizeRequired(line.itemId, 'Item is required for stock movement', {
                docType: payload.docType,
                docId: payload.docId,
                docLineId: line.docLineId,
            });
            const unitCost = this.round(line.unitCost || 0);
            const totalCost = this.round(qty * unitCost);
            entries.push({
                id: this.repository.nextIdentity(),
                companyId: context.companyId,
                branchId: context.branchId,
                docType: payload.docType,
                docId: payload.docId,
                docLineId: line.docLineId,
                itemId,
                warehouseId,
                qtyIn: payload.movementSide === 'IN' ? qty : 0,
                qtyOut: payload.movementSide === 'OUT' ? qty : 0,
                unitCost,
                totalCost,
                movementSide: payload.movementSide,
                isReversal: false,
                reversedEntryId: null,
                movementDate,
                createdAt: now,
            });
        }
        if (!entries.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'No valid stock lines to post', {
                messageKey: 'validation.manufacturing.stock.lines_required',
                details: { docType: payload.docType, docId: payload.docId },
            });
        }
        try {
            this.repository.insertStockLedgerEntries(entries);
        }
        catch (error) {
            if (String(error?.message || '').includes('UNIQUE constraint failed: stock_ledger_entries')) {
                return {
                    status: 'ALREADY_POSTED',
                    postedAt: now,
                };
            }
            throw error;
        }
        return {
            status: 'POSTED',
            postedAt: now,
        };
    }
    normalizeRequired(value, message, details) {
        const normalized = String(value || '').trim();
        if (!normalized) {
            throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                messageKey: 'validation.manufacturing.warehouse_required',
                details,
            });
        }
        return normalized;
    }
    round(value) {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
exports.ManufacturingStockLedgerService = ManufacturingStockLedgerService;
