import { DomainError } from '../../domain/errors';
import {
    CreateInventoryDocumentInput,
    InventoryAdjustmentDirection,
    InventoryDocumentEntity,
    InventoryDocumentHeaderEntity,
    InventoryDocumentLineEntity,
    InventoryDocumentPostingStatus,
    InventoryDocumentType,
    ReverseInventoryDocumentCommand,
    UpdateInventoryDocumentInput,
} from '../../domain/inventoryDocuments/types/InventoryDocumentTypes';
import {
    InsertStockLedgerEntryInput,
    InventoryDocumentRepositoryPort,
    StockLedgerEntryRecord,
} from '../ports/InventoryDocumentPorts';
import { JournalDto, JournalEngineUseCases } from '../useCases/JournalEngineUseCases';
import { INVENTORY_SOURCE_MODULE, InventoryPostingBuildResult, InventoryPostingBuilder } from './InventoryPostingBuilder';

type AccountingContext = {
    companyId: string;
    branchId: string;
    userId: string;
};

export interface PostInventoryDocumentResult {
    documentId: string;
    sourceModule: string;
    sourceType: InventoryDocumentType;
    sourceId: string;
    documentNo: string;
    status: 'POSTED' | 'ALREADY_POSTED';
    sourceVersion: number;
    journalId: string | null;
    journalNo: string | null;
    financialPosted: boolean;
    stockPosted: boolean;
}

export interface ReverseInventoryDocumentResult {
    documentId: string;
    sourceModule: string;
    sourceType: InventoryDocumentType;
    sourceId: string;
    documentNo: string;
    status: 'REVERSED' | 'ALREADY_REVERSED';
    originalJournalId: string | null;
    reversalJournalId: string | null;
    reversalJournalNo: string | null;
    stockReversed: boolean;
}

const EPSILON = 0.000001;

export class InventoryDocumentService {
    constructor(
        private readonly repository: InventoryDocumentRepositoryPort,
        private readonly postingBuilder: InventoryPostingBuilder,
        private readonly journalEngineUseCases: JournalEngineUseCases,
    ) {
        this.repository.ensureSchema();
    }

    createDocument(context: AccountingContext, input: CreateInventoryDocumentInput): InventoryDocumentEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const userId = this.normalizeRequired(context.userId, 'User id is required');

        const docType = this.normalizeDocType(input.docType);
        const docDate = this.normalizeDate(input.docDate, 'Document date is required');
        const currencyCode = this.repository.resolveCurrencyCode(input.currencyCode || 'ILS');
        const currencyRate = this.toRate(input.currencyRate);
        const nowIso = new Date().toISOString();
        const id = this.repository.nextIdentity();

        const lines = this.normalizeInputLines(id, input.lines || [], nowIso);
        this.validateDraftLines(docType, lines);

        return this.repository.runInTransaction(() => this.repository.createDocument({
            id,
            companyId,
            branchId,
            docType,
            docNo: this.repository.nextDocumentNo(companyId, branchId, docType),
            docDate,
            status: 'DRAFT',
            warehouseId: this.normalizeNullable(input.warehouseId),
            toWarehouseId: this.normalizeNullable(input.toWarehouseId),
            referenceNo: this.normalizeNullable(input.referenceNo),
            remarks: this.normalizeNullable(input.remarks),
            currencyCode,
            currencyRate,
            createdBy: this.normalizeRequired(input.createdBy || userId, 'Created by is required'),
            approvedBy: this.normalizeNullable(input.approvedBy),
            version: 1,
            createdAt: nowIso,
            updatedAt: nowIso,
            lines,
        }));
    }

    updateDocument(context: AccountingContext, input: UpdateInventoryDocumentInput): InventoryDocumentEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');

        const id = this.normalizeRequired(input.id, 'Document id is required');
        const current = this.requireDocument(companyId, branchId, id);
        if (current.header.status !== 'DRAFT') {
            throw new DomainError('INVALID_TRANSITION', 'Only draft inventory documents can be updated', {
                messageKey: 'error.inventory_document.update.not_draft',
                details: { documentId: id, status: current.header.status },
            });
        }

        const docDate = this.normalizeDate(input.docDate, 'Document date is required');
        const currencyCode = this.repository.resolveCurrencyCode(input.currencyCode || current.header.currencyCode);
        const currencyRate = this.toRate(input.currencyRate ?? current.header.currencyRate);
        const nowIso = new Date().toISOString();
        const lines = this.normalizeInputLines(id, input.lines || [], nowIso);
        this.validateDraftLines(current.header.docType, lines);

        return this.repository.runInTransaction(() => this.repository.updateDocument({
            id,
            companyId,
            branchId,
            docDate,
            warehouseId: this.normalizeNullable(input.warehouseId),
            toWarehouseId: this.normalizeNullable(input.toWarehouseId),
            referenceNo: this.normalizeNullable(input.referenceNo),
            remarks: this.normalizeNullable(input.remarks),
            currencyCode,
            currencyRate,
            approvedBy: this.normalizeNullable(input.approvedBy),
            updatedAt: nowIso,
            lines,
        }));
    }

    getById(context: Pick<AccountingContext, 'companyId' | 'branchId'>, documentId: string): InventoryDocumentEntity {
        return this.requireDocument(context.companyId, context.branchId, documentId);
    }

    async post(context: AccountingContext, documentId: string): Promise<PostInventoryDocumentResult> {
        const headerAndLines = this.requireDocument(context.companyId, context.branchId, documentId);
        const header = headerAndLines.header;
        const lines = headerAndLines.lines;

        this.assertCanPost(header);
        this.validatePostingLines(header, lines);

        const sourceVersion = Number(header.version || 1) + 1;
        let existingJournal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const stockAlreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, header.docType, header.id);

        if (header.status === 'POSTED' && stockAlreadyPosted) {
            return {
                documentId: header.id,
                sourceModule: INVENTORY_SOURCE_MODULE,
                sourceType: header.docType,
                sourceId: header.id,
                documentNo: header.docNo,
                status: 'ALREADY_POSTED',
                sourceVersion,
                journalId: existingJournal?.id || null,
                journalNo: existingJournal?.journalNo || null,
                financialPosted: Boolean(existingJournal),
                stockPosted: true,
            };
        }

        const buildResult = await this.postingBuilder.build({
            companyId: context.companyId,
            branchId: context.branchId,
            userId: context.userId,
            sourceVersion,
            header,
            lines,
            perpetualInventoryEnabled: this.repository.isPerpetualInventoryEnabled(context.companyId),
        });

        if (stockAlreadyPosted && (!buildResult.requiresFinancialPosting || existingJournal)) {
            this.repository.savePostingState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                journalId: existingJournal?.id || null,
                postedBy: context.userId,
                postedAt: header.postedAt || new Date().toISOString(),
                stockPostedAt: header.stockPostedAt || new Date().toISOString(),
                nextStatus: 'POSTED',
            });

            return {
                documentId: header.id,
                sourceModule: INVENTORY_SOURCE_MODULE,
                sourceType: header.docType,
                sourceId: header.id,
                documentNo: header.docNo,
                status: 'ALREADY_POSTED',
                sourceVersion,
                journalId: existingJournal?.id || null,
                journalNo: existingJournal?.journalNo || null,
                financialPosted: Boolean(existingJournal),
                stockPosted: true,
            };
        }

        const postingTime = new Date().toISOString();
        const stockEntries = this.buildStockLedgerEntries(header, lines, postingTime, false, null);

        let didInsertStock = false;
        let didInsertJournal = false;

        try {
            this.repository.runInTransaction(() => {
                if (!stockAlreadyPosted && stockEntries.length) {
                    this.repository.insertStockLedgerEntries(stockEntries);
                    didInsertStock = true;
                }

                if (buildResult.requiresFinancialPosting) {
                    if (!existingJournal) {
                        const postResult = this.journalEngineUseCases.postJournal(
                            context.companyId,
                            context.branchId,
                            context.userId,
                            this.requirePostingCommand(buildResult),
                        );
                        existingJournal = this.journalEngineUseCases.getById(context.companyId, postResult.journalId);
                        didInsertJournal = true;
                    }

                    if (!existingJournal) {
                        throw new DomainError('INTERNAL_ERROR', 'Inventory posting journal was not resolved', {
                            messageKey: 'error.inventory_document.journal_not_resolved',
                            details: { documentId: header.id },
                        });
                    }
                }

                this.repository.savePostingState({
                    companyId: context.companyId,
                    branchId: context.branchId,
                    documentId: header.id,
                    journalId: existingJournal?.id || null,
                    postedBy: context.userId,
                    postedAt: postingTime,
                    stockPostedAt: postingTime,
                    nextStatus: 'POSTED',
                });
            });
        } catch (error: any) {
            if (String(error?.code || '') === 'ERR_SOURCE_ALREADY_POSTED') {
                existingJournal = this.journalEngineUseCases.getBySource(context.companyId, {
                    sourceType: header.docType,
                    sourceId: header.id,
                    sourceVersion,
                }) || this.journalEngineUseCases.getBySource(context.companyId, {
                    sourceType: header.docType,
                    sourceId: header.id,
                    sourceVersion: null,
                });

                let stockNowPosted = stockAlreadyPosted;
                if (!stockNowPosted && stockEntries.length) {
                    try {
                        this.repository.runInTransaction(() => {
                            this.repository.insertStockLedgerEntries(stockEntries);
                        });
                        stockNowPosted = true;
                    } catch (stockError: any) {
                        if (String(stockError?.message || '').includes('UNIQUE constraint failed: stock_ledger_entries')) {
                            stockNowPosted = true;
                        } else {
                            throw stockError;
                        }
                    }
                }

                this.repository.savePostingState({
                    companyId: context.companyId,
                    branchId: context.branchId,
                    documentId: header.id,
                    journalId: existingJournal?.id || null,
                    postedBy: context.userId,
                    postedAt: postingTime,
                    stockPostedAt: postingTime,
                    nextStatus: 'POSTED',
                });

                return {
                    documentId: header.id,
                    sourceModule: INVENTORY_SOURCE_MODULE,
                    sourceType: header.docType,
                    sourceId: header.id,
                    documentNo: header.docNo,
                    status: 'ALREADY_POSTED',
                    sourceVersion,
                    journalId: existingJournal?.id || null,
                    journalNo: existingJournal?.journalNo || null,
                    financialPosted: Boolean(existingJournal),
                    stockPosted: stockNowPosted || stockEntries.length === 0,
                };
            }

            if (String(error?.message || '').includes('UNIQUE constraint failed: stock_ledger_entries')) {
                return {
                    documentId: header.id,
                    sourceModule: INVENTORY_SOURCE_MODULE,
                    sourceType: header.docType,
                    sourceId: header.id,
                    documentNo: header.docNo,
                    status: 'ALREADY_POSTED',
                    sourceVersion,
                    journalId: existingJournal?.id || null,
                    journalNo: existingJournal?.journalNo || null,
                    financialPosted: Boolean(existingJournal),
                    stockPosted: true,
                };
            }

            throw error;
        }

        return {
            documentId: header.id,
            sourceModule: INVENTORY_SOURCE_MODULE,
            sourceType: header.docType,
            sourceId: header.id,
            documentNo: header.docNo,
            status: didInsertStock || didInsertJournal ? 'POSTED' : 'ALREADY_POSTED',
            sourceVersion,
            journalId: existingJournal?.id || null,
            journalNo: existingJournal?.journalNo || null,
            financialPosted: buildResult.requiresFinancialPosting,
            stockPosted: true,
        };
    }
    reverse(context: AccountingContext, input: ReverseInventoryDocumentCommand): ReverseInventoryDocumentResult {
        const documentId = this.normalizeRequired(input.documentId, 'Document id is required');
        const reverseDate = this.normalizeDate(input.reverseDate, 'Reverse date is required');

        const document = this.requireDocument(context.companyId, context.branchId, documentId);
        const header = document.header;

        const sourceVersion = Number(header.version || 1) + 1;
        const originalJournal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const stockAlreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, header.docType, header.id);
        if (!originalJournal && !stockAlreadyPosted) {
            throw new DomainError('VALIDATION_ERROR', 'Inventory document has not been posted yet', {
                messageKey: 'error.inventory_document.accounting.not_posted',
                details: { documentId: header.id },
            });
        }

        const existingReversal = this.resolveExistingReversal(context.companyId, originalJournal, header.reversalJournalId);
        const stockAlreadyReversed = this.repository.hasStockLedgerReversal(context.companyId, header.docType, header.id);

        if ((originalJournal ? Boolean(existingReversal) : true) && stockAlreadyReversed) {
            this.repository.saveReversalState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                reversalJournalId: existingReversal?.id || null,
                reversedBy: context.userId,
                reversedAt: header.reversedAt || new Date().toISOString(),
                stockReversedAt: header.stockReversedAt || new Date().toISOString(),
                nextStatus: 'CANCELLED',
            });

            return {
                documentId: header.id,
                sourceModule: INVENTORY_SOURCE_MODULE,
                sourceType: header.docType,
                sourceId: header.id,
                documentNo: header.docNo,
                status: 'ALREADY_REVERSED',
                originalJournalId: originalJournal?.id || null,
                reversalJournalId: existingReversal?.id || null,
                reversalJournalNo: existingReversal?.journalNo || null,
                stockReversed: true,
            };
        }

        const reversalTime = new Date().toISOString();
        const originalStockEntries = this.repository.listStockLedgerEntries(context.companyId, header.docType, header.id, false);
        let reversalJournal = existingReversal;
        let didReverseJournal = false;
        let didReverseStock = false;

        try {
            this.repository.runInTransaction(() => {
                if (originalJournal && !reversalJournal) {
                    try {
                        const result = this.journalEngineUseCases.reverseJournal(context.companyId, context.userId, {
                            companyId: context.companyId,
                            journalId: originalJournal.id,
                            reverseDate,
                            sourceType: `${header.docType}_REVERSAL`,
                            sourceId: header.id,
                            sourceNo: header.docNo,
                            sourceVersion,
                            referenceNo: header.referenceNo || header.docNo,
                            reason: input.reason || `Reverse inventory document ${header.docNo}`,
                            postedBy: context.userId,
                        });
                        reversalJournal = this.journalEngineUseCases.getById(context.companyId, result.reversalJournalId);
                        didReverseJournal = true;
                    } catch (error: any) {
                        if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                            throw error;
                        }
                        reversalJournal = this.resolveExistingReversal(
                            context.companyId,
                            this.journalEngineUseCases.getById(context.companyId, originalJournal.id),
                            header.reversalJournalId,
                        );
                        if (!reversalJournal) {
                            throw error;
                        }
                    }
                }

                if (!stockAlreadyReversed && originalStockEntries.length) {
                    const reversalEntries = this.buildStockLedgerEntries(header, document.lines, reversalTime, true, originalStockEntries);
                    this.repository.insertStockLedgerEntries(reversalEntries);
                    didReverseStock = true;
                }

                this.repository.saveReversalState({
                    companyId: context.companyId,
                    branchId: context.branchId,
                    documentId: header.id,
                    reversalJournalId: reversalJournal?.id || null,
                    reversedBy: context.userId,
                    reversedAt: reversalTime,
                    stockReversedAt: reversalTime,
                    nextStatus: 'CANCELLED',
                });
            });
        } catch (error: any) {
            if (String(error?.message || '').includes('UNIQUE constraint failed: stock_ledger_entries')) {
                const resolvedReversal = this.resolveExistingReversal(
                    context.companyId,
                    originalJournal,
                    header.reversalJournalId,
                );
                return {
                    documentId: header.id,
                    sourceModule: INVENTORY_SOURCE_MODULE,
                    sourceType: header.docType,
                    sourceId: header.id,
                    documentNo: header.docNo,
                    status: 'ALREADY_REVERSED',
                    originalJournalId: originalJournal?.id || null,
                    reversalJournalId: resolvedReversal?.id || null,
                    reversalJournalNo: resolvedReversal?.journalNo || null,
                    stockReversed: true,
                };
            }
            throw error;
        }

        return {
            documentId: header.id,
            sourceModule: INVENTORY_SOURCE_MODULE,
            sourceType: header.docType,
            sourceId: header.id,
            documentNo: header.docNo,
            status: didReverseJournal || didReverseStock ? 'REVERSED' : 'ALREADY_REVERSED',
            originalJournalId: originalJournal?.id || null,
            reversalJournalId: reversalJournal?.id || null,
            reversalJournalNo: reversalJournal?.journalNo || null,
            stockReversed: stockAlreadyReversed || didReverseStock,
        };
    }

    getPostingStatus(
        context: Pick<AccountingContext, 'companyId' | 'branchId'>,
        documentId: string,
    ): InventoryDocumentPostingStatus {
        const document = this.requireDocument(context.companyId, context.branchId, documentId);
        const header = document.header;
        const sourceVersion = Number(header.version || 1) + 1;

        const originalJournal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const reversalJournal = this.resolveExistingReversal(context.companyId, originalJournal, header.reversalJournalId);

        const isStockPosted = this.repository.hasStockLedgerPosting(context.companyId, header.docType, header.id)
            || Boolean(header.stockPostedAt);
        const isStockReversed = this.repository.hasStockLedgerReversal(context.companyId, header.docType, header.id)
            || Boolean(header.stockReversedAt);

        return {
            documentId: header.id,
            docType: header.docType,
            docNo: header.docNo || null,
            documentStatus: header.status,
            sourceVersion,
            isStockPosted,
            isStockReversed,
            isFinancialPosted: Boolean(originalJournal),
            isFinancialReversed: Boolean(reversalJournal),
            journalId: originalJournal?.id || null,
            journalNo: originalJournal?.journalNo || null,
            reversalJournalId: reversalJournal?.id || header.reversalJournalId || null,
            reversalJournalNo: reversalJournal?.journalNo || null,
            postedAt: header.postedAt,
            reversedAt: header.reversedAt,
        };
    }

    private requirePostingCommand(buildResult: InventoryPostingBuildResult) {
        if (!buildResult.command) {
            throw new DomainError('INTERNAL_ERROR', 'Posting command is required');
        }
        return buildResult.command;
    }

    private requireDocument(companyId: string, branchId: string, documentId: string): InventoryDocumentEntity {
        const normalizedDocumentId = this.normalizeRequired(documentId, 'Document id is required');
        const document = this.repository.getDocumentById(companyId, branchId, normalizedDocumentId);
        if (!document) {
            throw new DomainError('DOCUMENT_NOT_FOUND', `Inventory document ${normalizedDocumentId} was not found`, {
                messageKey: 'error.inventory_document.not_found',
                details: { documentId: normalizedDocumentId },
            });
        }
        return document;
    }

    private assertCanPost(header: InventoryDocumentHeaderEntity): void {
        if (header.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled inventory document cannot be posted', {
                messageKey: 'error.inventory_document.posting.cancelled_not_allowed',
                details: { documentId: header.id },
            });
        }
    }

    private validateDraftLines(docType: InventoryDocumentType, lines: Array<{
        id: string;
        lineNo: number;
        itemId: string;
        fromWarehouseId: string | null;
        toWarehouseId: string | null;
        qty: number;
        unitCost: number;
        totalCost: number;
        projectId: string | null;
        costCenterId: string | null;
        partnerId: string | null;
        expenseTypeId: string | null;
        vehicleId: string | null;
        remarks: string | null;
        adjustmentDirection: InventoryAdjustmentDirection | null;
        createdAt: string;
        updatedAt: string;
    }>): void {
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            if (!line.itemId) {
                throw new DomainError('VALIDATION_ERROR', `Line ${index + 1}: item is required`, {
                    messageKey: 'validation.inventory_document.line_item_required',
                    details: { lineNo: index + 1 },
                });
            }
            if (line.qty <= EPSILON) {
                throw new DomainError('VALIDATION_ERROR', `Line ${index + 1}: quantity must be greater than zero`, {
                    messageKey: 'validation.inventory_document.qty_positive',
                    details: { lineNo: index + 1 },
                });
            }
            if (line.totalCost < -EPSILON) {
                throw new DomainError('VALIDATION_ERROR', `Line ${index + 1}: total cost cannot be negative`, {
                    messageKey: 'validation.inventory_document.total_cost_non_negative',
                    details: { lineNo: index + 1 },
                });
            }

            const normalizedDirection = String(line.adjustmentDirection || '').trim().toUpperCase();
            if (docType === 'STOCK_ADJUSTMENT' && normalizedDirection && normalizedDirection !== 'IN' && normalizedDirection !== 'OUT') {
                throw new DomainError('VALIDATION_ERROR', `Line ${index + 1}: adjustment direction must be IN or OUT`, {
                    messageKey: 'validation.inventory_document.adjustment_direction_required',
                    details: { lineNo: index + 1 },
                });
            }
        }
    }

    private validatePostingLines(header: InventoryDocumentHeaderEntity, lines: InventoryDocumentLineEntity[]): void {
        if (!lines.length) {
            throw new DomainError('VALIDATION_ERROR', 'Inventory document lines are required for posting', {
                messageKey: 'validation.inventory_document.lines_required',
                details: { documentId: header.id },
            });
        }

        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            const lineNo = index + 1;

            if (Number(line.qty || 0) <= EPSILON) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: quantity must be greater than zero`, {
                    messageKey: 'validation.inventory_document.qty_positive',
                    details: { lineNo },
                });
            }
            if (Number(line.totalCost || 0) < -EPSILON) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: total cost cannot be negative`, {
                    messageKey: 'validation.inventory_document.total_cost_non_negative',
                    details: { lineNo },
                });
            }

            const item = this.repository.getItemById(line.itemId);
            if (!item || !item.isActive) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: item is invalid`, {
                    messageKey: 'validation.inventory_document.item_required',
                    details: { lineNo, itemId: line.itemId },
                });
            }
            if (!item.isStockItem) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: item must be stock item`, {
                    messageKey: 'validation.inventory_document.stock_item_required',
                    details: { lineNo, itemId: line.itemId },
                });
            }

            const fromWarehouseId = this.normalizeNullable(line.fromWarehouseId || header.warehouseId);
            const toWarehouseId = this.normalizeNullable(line.toWarehouseId || header.toWarehouseId);

            if (header.docType === 'GOODS_RECEIPT') {
                const targetWarehouse = toWarehouseId || this.normalizeNullable(header.warehouseId);
                this.requireWarehouse(targetWarehouse, lineNo, 'toWarehouseId');
            }

            if (header.docType === 'GOODS_ISSUE') {
                const sourceWarehouse = fromWarehouseId || this.normalizeNullable(header.warehouseId);
                this.requireWarehouse(sourceWarehouse, lineNo, 'fromWarehouseId');
            }

            if (header.docType === 'STOCK_TRANSFER') {
                const sourceWarehouse = fromWarehouseId || this.normalizeNullable(header.warehouseId);
                const destinationWarehouse = toWarehouseId || this.normalizeNullable(header.toWarehouseId);
                this.requireWarehouse(sourceWarehouse, lineNo, 'fromWarehouseId');
                this.requireWarehouse(destinationWarehouse, lineNo, 'toWarehouseId');

                if (sourceWarehouse === destinationWarehouse) {
                    throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: source and destination warehouses must differ`, {
                        messageKey: 'validation.inventory_document.transfer_warehouse_mismatch',
                        details: { lineNo },
                    });
                }
            }

            if (header.docType === 'STOCK_ADJUSTMENT') {
                const direction = this.resolveAdjustmentDirection(header, line);
                const warehouse = direction === 'IN'
                    ? (toWarehouseId || this.normalizeNullable(header.warehouseId) || this.normalizeNullable(header.toWarehouseId))
                    : (fromWarehouseId || this.normalizeNullable(header.warehouseId));
                this.requireWarehouse(warehouse, lineNo, direction === 'IN' ? 'toWarehouseId' : 'fromWarehouseId');
            }
        }
    }
    private resolveAdjustmentDirection(
        header: InventoryDocumentHeaderEntity,
        line: InventoryDocumentLineEntity,
    ): InventoryAdjustmentDirection {
        const explicit = String(line.adjustmentDirection || '').trim().toUpperCase();
        if (explicit === 'IN') return 'IN';
        if (explicit === 'OUT') return 'OUT';

        const fromWarehouse = this.normalizeNullable(line.fromWarehouseId || header.warehouseId);
        const toWarehouse = this.normalizeNullable(line.toWarehouseId || header.toWarehouseId);
        if (fromWarehouse && !toWarehouse) return 'OUT';
        if (toWarehouse && !fromWarehouse) return 'IN';

        throw new DomainError('VALIDATION_ERROR', 'Stock adjustment direction is required', {
            messageKey: 'validation.inventory_document.adjustment_direction_required',
            details: {
                documentId: header.id,
                lineId: line.id,
            },
        });
    }

    private requireWarehouse(warehouseId: string | null, lineNo: number, field: string): void {
        if (!warehouseId) {
            throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: warehouse is required`, {
                messageKey: 'validation.inventory_document.warehouse_required',
                details: { lineNo, field },
            });
        }

        const warehouse = this.repository.getWarehouseById(warehouseId);
        if (!warehouse || !warehouse.isActive) {
            throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: warehouse is invalid`, {
                messageKey: 'validation.inventory_document.warehouse_required',
                details: { lineNo, field, warehouseId },
            });
        }
    }

    private normalizeInputLines(
        documentId: string,
        inputLines: Array<{
            id?: string;
            itemId: string;
            fromWarehouseId?: string | null;
            toWarehouseId?: string | null;
            qty: number;
            unitCost: number;
            totalCost?: number | null;
            projectId?: string | null;
            costCenterId?: string | null;
            partnerId?: string | null;
            expenseTypeId?: string | null;
            vehicleId?: string | null;
            remarks?: string | null;
            adjustmentDirection?: InventoryAdjustmentDirection | null;
        }>,
        nowIso: string,
    ) {
        return (inputLines || []).map((line, index) => {
            const qty = Number(line.qty || 0);
            const unitCost = Number(line.unitCost || 0);
            const totalCost = Number(line.totalCost ?? this.roundAmount(qty * unitCost));
            return {
                id: this.normalizeNullable(line.id) || this.repository.nextIdentity(),
                documentId,
                lineNo: index + 1,
                itemId: this.normalizeRequired(line.itemId, `Line ${index + 1}: item is required`),
                fromWarehouseId: this.normalizeNullable(line.fromWarehouseId),
                toWarehouseId: this.normalizeNullable(line.toWarehouseId),
                qty,
                unitCost,
                totalCost,
                projectId: this.normalizeNullable(line.projectId),
                costCenterId: this.normalizeNullable(line.costCenterId),
                partnerId: this.normalizeNullable(line.partnerId),
                expenseTypeId: this.normalizeNullable(line.expenseTypeId),
                vehicleId: this.normalizeNullable(line.vehicleId),
                remarks: this.normalizeNullable(line.remarks),
                adjustmentDirection: this.normalizeDirection(line.adjustmentDirection),
                createdAt: nowIso,
                updatedAt: nowIso,
            };
        });
    }

    private buildStockLedgerEntries(
        header: InventoryDocumentHeaderEntity,
        lines: InventoryDocumentLineEntity[],
        movementDateTime: string,
        isReversal: boolean,
        originalEntries: StockLedgerEntryRecord[] | null,
    ): InsertStockLedgerEntryInput[] {
        const movementDate = String(movementDateTime || '').slice(0, 10);

        if (isReversal) {
            const sourceEntries = originalEntries || [];
            return sourceEntries.map((entry) => ({
                id: this.repository.nextIdentity(),
                companyId: header.companyId,
                branchId: header.branchId,
                docType: header.docType,
                docId: header.id,
                docLineId: entry.docLineId,
                itemId: entry.itemId,
                warehouseId: entry.warehouseId,
                qtyIn: this.roundAmount(entry.qtyOut),
                qtyOut: this.roundAmount(entry.qtyIn),
                unitCost: this.roundAmount(entry.unitCost),
                totalCost: this.roundAmount(entry.totalCost),
                movementSide: entry.movementSide === 'IN' ? 'OUT' : 'IN',
                isReversal: true,
                reversedEntryId: entry.id,
                movementDate,
                createdAt: movementDateTime,
            }));
        }

        const entries: InsertStockLedgerEntryInput[] = [];

        for (const line of lines) {
            const amount = this.roundAmount(line.totalCost);
            const qty = this.roundAmount(line.qty);
            if (qty <= EPSILON) continue;

            if (header.docType === 'GOODS_RECEIPT') {
                const warehouseId = this.normalizeNullable(line.toWarehouseId || header.warehouseId || header.toWarehouseId);
                if (!warehouseId) continue;

                entries.push({
                    id: this.repository.nextIdentity(),
                    companyId: header.companyId,
                    branchId: header.branchId,
                    docType: header.docType,
                    docId: header.id,
                    docLineId: line.id,
                    itemId: line.itemId,
                    warehouseId,
                    qtyIn: qty,
                    qtyOut: 0,
                    unitCost: this.roundAmount(line.unitCost),
                    totalCost: amount,
                    movementSide: 'IN',
                    isReversal: false,
                    reversedEntryId: null,
                    movementDate,
                    createdAt: movementDateTime,
                });
                continue;
            }

            if (header.docType === 'GOODS_ISSUE') {
                const warehouseId = this.normalizeNullable(line.fromWarehouseId || header.warehouseId);
                if (!warehouseId) continue;

                entries.push({
                    id: this.repository.nextIdentity(),
                    companyId: header.companyId,
                    branchId: header.branchId,
                    docType: header.docType,
                    docId: header.id,
                    docLineId: line.id,
                    itemId: line.itemId,
                    warehouseId,
                    qtyIn: 0,
                    qtyOut: qty,
                    unitCost: this.roundAmount(line.unitCost),
                    totalCost: amount,
                    movementSide: 'OUT',
                    isReversal: false,
                    reversedEntryId: null,
                    movementDate,
                    createdAt: movementDateTime,
                });
                continue;
            }

            if (header.docType === 'STOCK_TRANSFER') {
                const fromWarehouseId = this.normalizeNullable(line.fromWarehouseId || header.warehouseId);
                const toWarehouseId = this.normalizeNullable(line.toWarehouseId || header.toWarehouseId);
                if (!fromWarehouseId || !toWarehouseId) continue;

                entries.push({
                    id: this.repository.nextIdentity(),
                    companyId: header.companyId,
                    branchId: header.branchId,
                    docType: header.docType,
                    docId: header.id,
                    docLineId: line.id,
                    itemId: line.itemId,
                    warehouseId: fromWarehouseId,
                    qtyIn: 0,
                    qtyOut: qty,
                    unitCost: this.roundAmount(line.unitCost),
                    totalCost: amount,
                    movementSide: 'OUT',
                    isReversal: false,
                    reversedEntryId: null,
                    movementDate,
                    createdAt: movementDateTime,
                });

                entries.push({
                    id: this.repository.nextIdentity(),
                    companyId: header.companyId,
                    branchId: header.branchId,
                    docType: header.docType,
                    docId: header.id,
                    docLineId: line.id,
                    itemId: line.itemId,
                    warehouseId: toWarehouseId,
                    qtyIn: qty,
                    qtyOut: 0,
                    unitCost: this.roundAmount(line.unitCost),
                    totalCost: amount,
                    movementSide: 'IN',
                    isReversal: false,
                    reversedEntryId: null,
                    movementDate,
                    createdAt: movementDateTime,
                });
                continue;
            }

            if (header.docType === 'STOCK_ADJUSTMENT') {
                const direction = this.resolveAdjustmentDirection(header, line);
                if (direction === 'IN') {
                    const warehouseId = this.normalizeNullable(line.toWarehouseId || header.warehouseId || header.toWarehouseId);
                    if (!warehouseId) continue;
                    entries.push({
                        id: this.repository.nextIdentity(),
                        companyId: header.companyId,
                        branchId: header.branchId,
                        docType: header.docType,
                        docId: header.id,
                        docLineId: line.id,
                        itemId: line.itemId,
                        warehouseId,
                        qtyIn: qty,
                        qtyOut: 0,
                        unitCost: this.roundAmount(line.unitCost),
                        totalCost: amount,
                        movementSide: 'IN',
                        isReversal: false,
                        reversedEntryId: null,
                        movementDate,
                        createdAt: movementDateTime,
                    });
                } else {
                    const warehouseId = this.normalizeNullable(line.fromWarehouseId || header.warehouseId);
                    if (!warehouseId) continue;
                    entries.push({
                        id: this.repository.nextIdentity(),
                        companyId: header.companyId,
                        branchId: header.branchId,
                        docType: header.docType,
                        docId: header.id,
                        docLineId: line.id,
                        itemId: line.itemId,
                        warehouseId,
                        qtyIn: 0,
                        qtyOut: qty,
                        unitCost: this.roundAmount(line.unitCost),
                        totalCost: amount,
                        movementSide: 'OUT',
                        isReversal: false,
                        reversedEntryId: null,
                        movementDate,
                        createdAt: movementDateTime,
                    });
                }
            }
        }

        return entries;
    }

    private resolveOriginalJournal(
        companyId: string,
        header: InventoryDocumentHeaderEntity,
        sourceVersion: number,
    ): JournalDto | null {
        return (header.journalId ? this.journalEngineUseCases.getById(companyId, header.journalId) : null)
            || this.journalEngineUseCases.getBySource(companyId, {
                sourceType: header.docType,
                sourceId: header.id,
                sourceVersion,
            })
            || this.journalEngineUseCases.getBySource(companyId, {
                sourceType: header.docType,
                sourceId: header.id,
                sourceVersion: null,
            });
    }

    private resolveExistingReversal(
        companyId: string,
        originalJournal: JournalDto | null,
        fallbackReversalJournalId: string | null,
    ): JournalDto | null {
        if (originalJournal?.reversedJournalId) {
            return this.journalEngineUseCases.getById(companyId, originalJournal.reversedJournalId);
        }
        if (fallbackReversalJournalId) {
            return this.journalEngineUseCases.getById(companyId, fallbackReversalJournalId);
        }
        return null;
    }

    private normalizeDocType(docType: InventoryDocumentType): InventoryDocumentType {
        const normalized = String(docType || '').trim().toUpperCase();
        if (normalized === 'GOODS_ISSUE') return 'GOODS_ISSUE';
        if (normalized === 'STOCK_TRANSFER') return 'STOCK_TRANSFER';
        if (normalized === 'STOCK_ADJUSTMENT') return 'STOCK_ADJUSTMENT';
        if (normalized === 'GOODS_RECEIPT') return 'GOODS_RECEIPT';

        throw new DomainError('VALIDATION_ERROR', 'Unsupported inventory document type', {
            messageKey: 'validation.inventory_document.doc_type_required',
            details: { docType },
        });
    }

    private normalizeDirection(direction: InventoryAdjustmentDirection | null | undefined): InventoryAdjustmentDirection | null {
        const normalized = String(direction || '').trim().toUpperCase();
        if (normalized === 'IN') return 'IN';
        if (normalized === 'OUT') return 'OUT';
        return null;
    }

    private normalizeDate(value: string, errorMessage: string): string {
        const normalized = String(value || '').trim().slice(0, 10);
        if (!normalized) {
            throw new DomainError('VALIDATION_ERROR', errorMessage, {
                messageKey: 'validation.inventory_document.date_required',
            });
        }
        return normalized;
    }

    private normalizeRequired(value: string, errorMessage: string): string {
        const normalized = String(value || '').trim();
        if (!normalized) {
            throw new DomainError('VALIDATION_ERROR', errorMessage, {
                messageKey: 'error.validation',
            });
        }
        return normalized;
    }

    private normalizeNullable(value: string | null | undefined): string | null {
        const normalized = String(value || '').trim();
        return normalized || null;
    }

    private toRate(value: number | null | undefined): number {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric <= 0) return 1;
        return numeric;
    }

    private roundAmount(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
