import { DomainError } from '../../domain/errors';
import {
    SalesOperationDocumentType,
    SalesOperationHeaderEntity,
    SalesOperationLineEntity,
} from '../../domain/salesOperations/types/SalesOperationsTypes';
import { SalesOperationsRepositoryPort, SalesStockLedgerEntryRecord } from '../ports/SalesOperationsPorts';

type StockContext = {
    companyId: string;
    branchId: string;
    userId: string;
};

export interface SalesStockPostingResult {
    status: 'POSTED' | 'ALREADY_POSTED';
    postedAt: string;
}

export interface SalesStockReversalResult {
    status: 'REVERSED' | 'ALREADY_REVERSED';
    reversedAt: string;
}

const EPSILON = 0.000001;

export class SalesStockLedgerService {
    constructor(private readonly repository: SalesOperationsRepositoryPort) {}

    postDelivery(
        context: StockContext,
        header: SalesOperationHeaderEntity,
        lines: SalesOperationLineEntity[],
    ): SalesStockPostingResult {
        return this.post(context, header, lines, 'DELIVERY_NOTE', 'OUT');
    }

    postReturn(
        context: StockContext,
        header: SalesOperationHeaderEntity,
        lines: SalesOperationLineEntity[],
    ): SalesStockPostingResult {
        return this.post(context, header, lines, 'SALES_RETURN', 'IN');
    }

    reverse(
        context: StockContext,
        docType: SalesOperationDocumentType,
        docId: string,
        reverseDate: string,
    ): SalesStockReversalResult {
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
                messageKey: 'validation.sales_operations.stock.not_posted',
                details: { docType, docId },
            });
        }

        const now = new Date().toISOString();
        const movementDate = String(reverseDate || '').slice(0, 10);
        const reversals: SalesStockLedgerEntryRecord[] = original.map((entry) => ({
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

    private post(
        context: StockContext,
        header: SalesOperationHeaderEntity,
        lines: SalesOperationLineEntity[],
        docType: 'DELIVERY_NOTE' | 'SALES_RETURN',
        movementSide: 'OUT' | 'IN',
    ): SalesStockPostingResult {
        const alreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, docType, header.id, false);
        if (alreadyPosted) {
            return {
                status: 'ALREADY_POSTED',
                postedAt: new Date().toISOString(),
            };
        }

        const now = new Date().toISOString();
        const movementDate = String(header.docDate || '').slice(0, 10);
        const entries: SalesStockLedgerEntryRecord[] = [];

        for (const line of lines) {
            const qty = this.round(line.qty);
            if (qty <= EPSILON) continue;

            const warehouseId = this.normalizeRequired(
                line.warehouseId || header.warehouseId,
                'Warehouse is required for stock movement',
                { docType, docId: header.id, lineId: line.id },
            );

            const unitCost = this.round(Number(line.unitCost || 0));
            const totalCost = this.round(qty * unitCost);
            entries.push({
                id: this.repository.nextIdentity(),
                companyId: context.companyId,
                branchId: context.branchId,
                docType,
                docId: header.id,
                docLineId: line.id,
                itemId: line.itemId,
                warehouseId,
                qtyIn: movementSide === 'IN' ? qty : 0,
                qtyOut: movementSide === 'OUT' ? qty : 0,
                unitCost,
                totalCost,
                movementSide,
                isReversal: false,
                reversedEntryId: null,
                movementDate,
                createdAt: now,
            });
        }

        if (!entries.length) {
            throw new DomainError('VALIDATION_ERROR', 'No valid stock lines to post', {
                messageKey: 'validation.sales_operations.stock.lines_required',
                details: { docType, docId: header.id },
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
                messageKey: 'validation.sales_operations.warehouse_required',
                details,
            });
        }
        return normalized;
    }

    private round(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
