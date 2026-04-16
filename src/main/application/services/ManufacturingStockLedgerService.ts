import { DomainError } from '../../domain/errors';
import {
    ProductionIssueHeaderEntity,
    ProductionIssueLineEntity,
    ProductionReceiptHeaderEntity,
    ProductionReceiptLineEntity,
} from '../../domain/manufacturing/types/ManufacturingTypes';
import { ManufacturingRepositoryPort, ManufacturingStockLedgerEntryRecord } from '../ports/ManufacturingPorts';

type StockContext = {
    companyId: string;
    branchId: string;
    userId: string;
};

export interface ManufacturingStockPostingResult {
    status: 'POSTED' | 'ALREADY_POSTED';
    postedAt: string;
}

export interface ManufacturingStockReversalResult {
    status: 'REVERSED' | 'ALREADY_REVERSED';
    reversedAt: string;
}

const EPSILON = 0.000001;

export class ManufacturingStockLedgerService {
    constructor(private readonly repository: ManufacturingRepositoryPort) {}

    postIssue(
        context: StockContext,
        header: ProductionIssueHeaderEntity,
        lines: ProductionIssueLineEntity[],
    ): ManufacturingStockPostingResult {
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

    postReceipt(
        context: StockContext,
        header: ProductionReceiptHeaderEntity,
        lines: ProductionReceiptLineEntity[],
    ): ManufacturingStockPostingResult {
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

    reverse(
        context: StockContext,
        docType: 'PRODUCTION_MATERIAL_ISSUE' | 'PRODUCTION_RECEIPT',
        docId: string,
        reverseDate: string,
    ): ManufacturingStockReversalResult {
        const alreadyReversed = this.repository.hasStockLedgerPosting(context.companyId, docType, docId, true);
        if (alreadyReversed) {
            return {
                status: 'ALREADY_REVERSED',
                reversedAt: new Date().toISOString(),
            };
        }

        const original = this.repository.listStockLedgerEntries(context.companyId, docType, docId, false);
        if (!original.length) {
            throw new DomainError('VALIDATION_ERROR', 'No stock ledger posting found for document', {
                messageKey: 'validation.manufacturing.stock.not_posted',
                details: { docType, docId },
            });
        }

        const now = new Date().toISOString();
        const movementDate = String(reverseDate || '').slice(0, 10);
        const reversals: ManufacturingStockLedgerEntryRecord[] = original.map((entry) => ({
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
        } catch (error: any) {
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

    private postIssueOrReceipt(
        context: StockContext,
        payload: {
            docType: 'PRODUCTION_MATERIAL_ISSUE' | 'PRODUCTION_RECEIPT';
            docId: string;
            movementDate: string;
            movementSide: 'IN' | 'OUT';
            lines: Array<{
                docLineId: string;
                itemId: string;
                warehouseId: string;
                qty: number;
                unitCost: number;
            }>;
        },
    ): ManufacturingStockPostingResult {
        const alreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, payload.docType, payload.docId, false);
        if (alreadyPosted) {
            return {
                status: 'ALREADY_POSTED',
                postedAt: new Date().toISOString(),
            };
        }

        const now = new Date().toISOString();
        const movementDate = String(payload.movementDate || '').slice(0, 10);
        const entries: ManufacturingStockLedgerEntryRecord[] = [];

        for (const line of payload.lines) {
            const qty = this.round(line.qty);
            if (qty <= EPSILON) continue;

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
            throw new DomainError('VALIDATION_ERROR', 'No valid stock lines to post', {
                messageKey: 'validation.manufacturing.stock.lines_required',
                details: { docType: payload.docType, docId: payload.docId },
            });
        }

        try {
            this.repository.insertStockLedgerEntries(entries);
        } catch (error: any) {
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

    private normalizeRequired(value: string | null | undefined, message: string, details?: Record<string, unknown>): string {
        const normalized = String(value || '').trim();
        if (!normalized) {
            throw new DomainError('VALIDATION_ERROR', message, {
                messageKey: 'validation.manufacturing.warehouse_required',
                details,
            });
        }
        return normalized;
    }

    private round(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
