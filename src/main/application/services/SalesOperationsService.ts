
import { DomainError } from '../../domain/errors';
import {
    CancelDeliveryNoteInput,
    CancelSalesReturnInput,
    ConvertDeliveryToReturnInput,
    ConvertLineSelectionInput,
    ConvertOrderToDeliveryInput,
    ConvertQuotationToOrderInput,
    CreateSalesOperationDocumentInput,
    PostDeliveryNoteInput,
    PostSalesReturnInput,
    SalesInvoicePreparationDto,
    SalesInvoicePreparationLineDto,
    SalesLineRemainingDto,
    SalesOperationDocumentEntity,
    SalesOperationDocumentType,
    SalesOperationHeaderEntity,
    SalesOperationLineEntity,
    SalesOperationStatus,
    SalesOperationalPostingStatus,
    SalesOrderFulfillmentStatus,
    SalesOrderFulfillmentSummary,
    UpdateSalesOperationDocumentInput,
} from '../../domain/salesOperations/types/SalesOperationsTypes';
import {
    SalesCreateDocumentDbInput,
    SalesCreateLinkInput,
    SalesOperationsRepositoryPort,
    SalesReservationRecord,
} from '../ports/SalesOperationsPorts';
import { JournalDto, JournalEngineUseCases } from '../useCases/JournalEngineUseCases';
import { SalesOperationsAccountingBuilder } from './SalesOperationsAccountingBuilder';
import { SalesStockLedgerService } from './SalesStockLedgerService';

type SalesContext = {
    companyId: string;
    branchId: string;
    userId: string;
};

export interface SalesConversionResult {
    sourceDocumentId: string;
    targetDocumentId: string;
    targetDocType: SalesOperationDocumentType;
    targetDocNo: string;
}

export interface SalesDocumentPostResult {
    documentId: string;
    docType: SalesOperationDocumentType;
    docNo: string;
    status: 'POSTED' | 'ALREADY_POSTED';
    sourceVersion: number;
    isStockPosted: boolean;
    isFinancialPosted: boolean;
    journalId: string | null;
    journalNo: string | null;
}

export interface SalesDocumentCancelResult {
    documentId: string;
    docType: SalesOperationDocumentType;
    docNo: string;
    status: 'CANCELLED' | 'ALREADY_CANCELLED';
    isStockReversed: boolean;
    isFinancialReversed: boolean;
    reversalJournalId: string | null;
    reversalJournalNo: string | null;
}

const EPSILON = 0.000001;

export class SalesOperationsService {
    constructor(
        private readonly repository: SalesOperationsRepositoryPort,
        private readonly stockLedgerService: SalesStockLedgerService,
        private readonly accountingBuilder: SalesOperationsAccountingBuilder,
        private readonly journalEngineUseCases: JournalEngineUseCases,
    ) {
        this.repository.ensureSchema();
    }

    createQuotation(context: SalesContext, input: CreateSalesOperationDocumentInput): SalesOperationDocumentEntity {
        return this.createDocument(context, 'SALES_QUOTATION', input);
    }

    updateQuotation(context: SalesContext, input: UpdateSalesOperationDocumentInput): SalesOperationDocumentEntity {
        return this.updateDocument(context, 'SALES_QUOTATION', input);
    }

    getQuotationById(context: Pick<SalesContext, 'companyId' | 'branchId'>, documentId: string): SalesOperationDocumentEntity {
        return this.getDocument(context, 'SALES_QUOTATION', documentId);
    }

    confirmQuotation(context: SalesContext, documentId: string): SalesOperationDocumentEntity {
        const quotation = this.requireDocument(context.companyId, context.branchId, documentId, 'SALES_QUOTATION');
        if (quotation.header.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled quotation cannot be confirmed', {
                messageKey: 'validation.sales_operations.quotation.cancelled',
                details: { documentId },
            });
        }

        if (quotation.header.status === 'CONFIRMED') {
            return quotation;
        }

        this.repository.saveDocumentStatus(
            context.companyId,
            context.branchId,
            quotation.header.id,
            'CONFIRMED',
            context.userId,
            new Date().toISOString(),
        );

        return this.requireDocument(context.companyId, context.branchId, quotation.header.id, 'SALES_QUOTATION');
    }

    cancelQuotation(context: SalesContext, documentId: string): SalesOperationDocumentEntity {
        const quotation = this.requireDocument(context.companyId, context.branchId, documentId, 'SALES_QUOTATION');
        if (quotation.header.status === 'CANCELLED') return quotation;

        this.repository.saveDocumentStatus(
            context.companyId,
            context.branchId,
            quotation.header.id,
            'CANCELLED',
            context.userId,
            new Date().toISOString(),
        );

        return this.requireDocument(context.companyId, context.branchId, quotation.header.id, 'SALES_QUOTATION');
    }

    convertQuotationToOrder(context: SalesContext, input: ConvertQuotationToOrderInput): SalesConversionResult {
        const quotationId = this.normalizeRequired(input.quotationId, 'Quotation id is required');
        const quotation = this.requireDocument(context.companyId, context.branchId, quotationId, 'SALES_QUOTATION');
        if (quotation.header.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled quotation cannot be converted', {
                messageKey: 'validation.sales_operations.quotation.cancelled',
                details: { quotationId },
            });
        }

        const convertedMap = this.getActiveConvertedQtyBySourceLine(
            context.companyId,
            context.branchId,
            quotation.header.id,
            'SALES_ORDER',
        );

        const sourceLines = quotation.lines
            .map((line) => {
                const converted = convertedMap.get(line.id) || 0;
                const remaining = this.round(Math.max(0, line.qty - converted));
                return { line, remaining };
            })
            .filter((entry) => entry.remaining > EPSILON);

        if (!sourceLines.length) {
            throw new DomainError('VALIDATION_ERROR', 'Quotation has no remaining quantity for conversion', {
                messageKey: 'validation.sales_operations.conversion.no_remaining_qty',
                details: { quotationId },
            });
        }

        const now = new Date().toISOString();
        const targetId = this.repository.nextIdentity();
        const targetLines = sourceLines.map((entry, index) =>
            this.mapSourceLineToTarget(index + 1, entry.line, entry.remaining, now),
        );

        const totals = this.resolveDocumentTotals(targetLines, {
            subtotal: null,
            discountAmount: null,
            taxableAmount: null,
            vatAmount: null,
            totalAmount: null,
        });

        this.repository.runInTransaction(() => {
            this.repository.createDocument({
                id: targetId,
                companyId: context.companyId,
                branchId: context.branchId,
                docType: 'SALES_ORDER',
                docNo: this.repository.nextDocumentNo(context.companyId, context.branchId, 'SALES_ORDER'),
                docDate: quotation.header.docDate,
                status: 'DRAFT',
                customerId: quotation.header.customerId,
                warehouseId: quotation.header.warehouseId,
                currencyCode: quotation.header.currencyCode,
                currencyRate: quotation.header.currencyRate,
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                taxableAmount: totals.taxableAmount,
                vatAmount: totals.vatAmount,
                totalAmount: totals.totalAmount,
                referenceNo: quotation.header.docNo,
                remarks: quotation.header.remarks,
                sourceDocType: 'SALES_QUOTATION',
                sourceDocId: quotation.header.id,
                createdBy: context.userId,
                approvedBy: null,
                version: 1,
                createdAt: now,
                updatedAt: now,
                lines: targetLines,
            });

            const links: SalesCreateLinkInput[] = sourceLines.map((entry, index) => ({
                id: this.repository.nextIdentity(),
                companyId: context.companyId,
                branchId: context.branchId,
                sourceDocType: 'SALES_QUOTATION',
                sourceDocId: quotation.header.id,
                sourceLineId: entry.line.id,
                targetDocType: 'SALES_ORDER',
                targetDocId: targetId,
                targetLineId: targetLines[index].id,
                qty: entry.remaining,
                createdAt: now,
            }));
            this.repository.createLinks(links);

            if (quotation.header.status === 'DRAFT') {
                this.repository.saveDocumentStatus(
                    context.companyId,
                    context.branchId,
                    quotation.header.id,
                    'CONFIRMED',
                    context.userId,
                    now,
                );
            }
        });

        const order = this.requireDocument(context.companyId, context.branchId, targetId, 'SALES_ORDER');
        return {
            sourceDocumentId: quotation.header.id,
            targetDocumentId: order.header.id,
            targetDocType: 'SALES_ORDER',
            targetDocNo: order.header.docNo,
        };
    }

    createOrder(context: SalesContext, input: CreateSalesOperationDocumentInput): SalesOperationDocumentEntity {
        return this.createDocument(context, 'SALES_ORDER', input);
    }

    updateOrder(context: SalesContext, input: UpdateSalesOperationDocumentInput): SalesOperationDocumentEntity {
        return this.updateDocument(context, 'SALES_ORDER', input);
    }

    getOrderById(context: Pick<SalesContext, 'companyId' | 'branchId'>, documentId: string): SalesOperationDocumentEntity {
        return this.getDocument(context, 'SALES_ORDER', documentId);
    }

    confirmOrder(context: SalesContext, orderId: string): SalesOperationDocumentEntity {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'SALES_ORDER');
        if (order.header.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled sales order cannot be confirmed', {
                messageKey: 'validation.sales_operations.order.cancelled',
                details: { orderId },
            });
        }

        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            this.repository.saveDocumentStatus(
                context.companyId,
                context.branchId,
                order.header.id,
                'CONFIRMED',
                context.userId,
                now,
            );
            this.refreshOrderReservationSnapshot(context, order.header.id);
        });

        return this.requireDocument(context.companyId, context.branchId, order.header.id, 'SALES_ORDER');
    }

    cancelOrder(context: SalesContext, orderId: string): SalesOperationDocumentEntity {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'SALES_ORDER');
        if (order.header.status === 'CANCELLED') {
            return order;
        }

        const hasFulfillment = order.lines.some((line) =>
            this.round(line.deliveredQty) > EPSILON || this.round(line.invoicedQty) > EPSILON,
        );
        if (hasFulfillment) {
            throw new DomainError('INVALID_TRANSITION', 'Order with fulfilled quantity cannot be cancelled', {
                messageKey: 'validation.sales_operations.order.cannot_cancel_fulfilled',
                details: { orderId },
            });
        }

        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            this.repository.saveDocumentStatus(
                context.companyId,
                context.branchId,
                order.header.id,
                'CANCELLED',
                context.userId,
                now,
            );
            this.repository.replaceReservationsForOrder(context.companyId, context.branchId, order.header.id, []);
            for (const line of order.lines) {
                if (line.reservedQty > EPSILON) {
                    this.repository.updateLineProgress(order.header.id, line.id, {
                        reservedQty: -line.reservedQty,
                    });
                }
            }
        });

        return this.requireDocument(context.companyId, context.branchId, order.header.id, 'SALES_ORDER');
    }

    getOrderFulfillmentStatus(context: Pick<SalesContext, 'companyId' | 'branchId'>, orderId: string): SalesOrderFulfillmentSummary {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'SALES_ORDER');
        return this.buildFulfillmentSummary(order);
    }

    convertOrderToDelivery(context: SalesContext, input: ConvertOrderToDeliveryInput): SalesConversionResult {
        const orderId = this.normalizeRequired(input.orderId, 'Order id is required');
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'SALES_ORDER');
        if (order.header.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled order cannot be converted', {
                messageKey: 'validation.sales_operations.order.cancelled',
                details: { orderId },
            });
        }

        const policy = this.repository.getPolicy(context.companyId);
        const selected = this.normalizeSelectedLines(input.selectedLines || []);
        const convertedMap = this.getActiveConvertedQtyBySourceLine(
            context.companyId,
            context.branchId,
            order.header.id,
            'DELIVERY_NOTE',
        );

        const sourceRows = order.lines
            .map((line) => {
                const convertedQty = convertedMap.get(line.id) || 0;
                const remaining = this.round(Math.max(0, line.qty - convertedQty));
                return { line, remaining };
            })
            .filter((entry) => entry.remaining > EPSILON);

        if (!sourceRows.length) {
            throw new DomainError('VALIDATION_ERROR', 'Order has no remaining quantity for delivery conversion', {
                messageKey: 'validation.sales_operations.conversion.no_remaining_qty',
                details: { orderId },
            });
        }

        this.assertSelectedLinesExist(selected, sourceRows.map((entry) => entry.line.id), 'Order conversion line is invalid');

        const now = new Date().toISOString();
        const targetId = this.repository.nextIdentity();
        const targetLines: SalesCreateDocumentDbInput['lines'] = [];
        const links: SalesCreateLinkInput[] = [];

        for (const source of sourceRows) {
            const requested = selected.get(source.line.id);
            const qty = requested !== undefined ? requested : source.remaining;
            if (qty <= EPSILON) continue;

            if (!policy.allowOverDelivery && qty - source.remaining > EPSILON) {
                throw new DomainError('VALIDATION_ERROR', 'Over conversion to delivery is not allowed', {
                    messageKey: 'validation.sales_operations.over_delivery',
                    details: {
                        sourceLineId: source.line.id,
                        requestedQty: qty,
                        remainingQty: source.remaining,
                    },
                });
            }

            const line = this.mapSourceLineToTarget(targetLines.length + 1, source.line, qty, now);
            targetLines.push(line);
            links.push({
                id: this.repository.nextIdentity(),
                companyId: context.companyId,
                branchId: context.branchId,
                sourceDocType: 'SALES_ORDER',
                sourceDocId: order.header.id,
                sourceLineId: source.line.id,
                targetDocType: 'DELIVERY_NOTE',
                targetDocId: targetId,
                targetLineId: line.id,
                qty,
                createdAt: now,
            });
        }

        if (!targetLines.length) {
            throw new DomainError('VALIDATION_ERROR', 'No delivery lines generated from order conversion', {
                messageKey: 'validation.sales_operations.conversion.no_remaining_qty',
                details: { orderId },
            });
        }

        const totals = this.resolveDocumentTotals(targetLines, {
            subtotal: null,
            discountAmount: null,
            taxableAmount: null,
            vatAmount: null,
            totalAmount: null,
        });

        this.repository.runInTransaction(() => {
            this.repository.createDocument({
                id: targetId,
                companyId: context.companyId,
                branchId: context.branchId,
                docType: 'DELIVERY_NOTE',
                docNo: this.repository.nextDocumentNo(context.companyId, context.branchId, 'DELIVERY_NOTE'),
                docDate: order.header.docDate,
                status: 'DRAFT',
                customerId: order.header.customerId,
                warehouseId: order.header.warehouseId,
                currencyCode: order.header.currencyCode,
                currencyRate: order.header.currencyRate,
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                taxableAmount: totals.taxableAmount,
                vatAmount: totals.vatAmount,
                totalAmount: totals.totalAmount,
                referenceNo: order.header.docNo,
                remarks: order.header.remarks,
                sourceDocType: 'SALES_ORDER',
                sourceDocId: order.header.id,
                createdBy: context.userId,
                approvedBy: null,
                version: 1,
                createdAt: now,
                updatedAt: now,
                lines: targetLines,
            });
            this.repository.createLinks(links);
        });

        const delivery = this.requireDocument(context.companyId, context.branchId, targetId, 'DELIVERY_NOTE');
        return {
            sourceDocumentId: order.header.id,
            targetDocumentId: delivery.header.id,
            targetDocType: 'DELIVERY_NOTE',
            targetDocNo: delivery.header.docNo,
        };
    }

    orderToInvoicePreparation(
        context: Pick<SalesContext, 'companyId' | 'branchId'>,
        orderId: string,
    ): SalesInvoicePreparationDto {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'SALES_ORDER');
        return this.prepareInvoiceDtoFromDocument(order, (line) => this.round(Math.max(0, line.qty - line.invoicedQty)));
    }

    createDeliveryNote(context: SalesContext, input: CreateSalesOperationDocumentInput): SalesOperationDocumentEntity {
        return this.createDocument(context, 'DELIVERY_NOTE', input);
    }

    updateDeliveryNote(context: SalesContext, input: UpdateSalesOperationDocumentInput): SalesOperationDocumentEntity {
        return this.updateDocument(context, 'DELIVERY_NOTE', input);
    }

    getDeliveryNoteById(context: Pick<SalesContext, 'companyId' | 'branchId'>, documentId: string): SalesOperationDocumentEntity {
        return this.getDocument(context, 'DELIVERY_NOTE', documentId);
    }

    async postDeliveryNote(context: SalesContext, input: PostDeliveryNoteInput): Promise<SalesDocumentPostResult> {
        const documentId = this.normalizeRequired(input.documentId, 'Delivery note id is required');
        const delivery = this.requireDocument(context.companyId, context.branchId, documentId, 'DELIVERY_NOTE');
        const header = delivery.header;
        const lines = delivery.lines;

        this.assertCanPost(header);
        this.validatePostingLines('DELIVERY_NOTE', lines, header.warehouseId);

        const policy = this.repository.getPolicy(context.companyId);
        const sourceVersion = Number(header.version || 1) + 1;
        const postingTime = new Date().toISOString();

        const stockAlreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, 'DELIVERY_NOTE', header.id, false);
        let journal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const requiresFinancialPosting = policy.cogsPostingMode === 'DELIVERY';

        if (header.status === 'POSTED' && stockAlreadyPosted && (!requiresFinancialPosting || Boolean(journal))) {
            return {
                documentId: header.id,
                docType: header.docType,
                docNo: header.docNo,
                status: 'ALREADY_POSTED',
                sourceVersion,
                isStockPosted: true,
                isFinancialPosted: requiresFinancialPosting ? Boolean(journal) : false,
                journalId: journal?.id || null,
                journalNo: journal?.journalNo || null,
            };
        }

        if (!stockAlreadyPosted) {
            this.stockLedgerService.postDelivery(context, header, lines);
        }

        if (requiresFinancialPosting && !journal) {
            const postingCommand = await this.accountingBuilder.buildDeliveryCostJournal({
                companyId: context.companyId,
                branchId: context.branchId,
                userId: context.userId,
                sourceVersion,
                header,
                lines,
            });

            if (postingCommand) {
                try {
                    const result = this.journalEngineUseCases.postJournal(
                        context.companyId,
                        context.branchId,
                        context.userId,
                        postingCommand,
                    );
                    journal = this.journalEngineUseCases.getById(context.companyId, result.journalId);
                } catch (error: any) {
                    if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                        throw error;
                    }
                    journal = this.journalEngineUseCases.getBySource(context.companyId, {
                        sourceType: 'DELIVERY_NOTE',
                        sourceId: header.id,
                        sourceVersion,
                    }) || this.journalEngineUseCases.getBySource(context.companyId, {
                        sourceType: 'DELIVERY_NOTE',
                        sourceId: header.id,
                        sourceVersion: null,
                    });
                }
            }
        }

        this.repository.runInTransaction(() => {
            this.repository.savePostingState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                journalId: journal?.id || null,
                postedBy: context.userId,
                postedAt: postingTime,
                stockPostedAt: postingTime,
                nextStatus: 'POSTED',
            });

            this.applyDeliveryProgressByLinks(context, header.id, 1);
        });

        return {
            documentId: header.id,
            docType: header.docType,
            docNo: header.docNo,
            status: stockAlreadyPosted && (!requiresFinancialPosting || Boolean(journal)) ? 'ALREADY_POSTED' : 'POSTED',
            sourceVersion,
            isStockPosted: true,
            isFinancialPosted: requiresFinancialPosting ? Boolean(journal) : false,
            journalId: journal?.id || null,
            journalNo: journal?.journalNo || null,
        };
    }

    async cancelDeliveryNote(context: SalesContext, input: CancelDeliveryNoteInput): Promise<SalesDocumentCancelResult> {
        const documentId = this.normalizeRequired(input.documentId, 'Delivery note id is required');
        const reverseDate = this.normalizeDate(input.reverseDate, 'Reverse date is required');

        const delivery = this.requireDocument(context.companyId, context.branchId, documentId, 'DELIVERY_NOTE');
        const header = delivery.header;
        const sourceVersion = Number(header.version || 1) + 1;

        this.assertNoActiveReturnsForDelivery(context.companyId, context.branchId, header.id);

        const stockPosted = this.repository.hasStockLedgerPosting(context.companyId, 'DELIVERY_NOTE', header.id, false);
        const stockAlreadyReversed = this.repository.hasStockLedgerPosting(context.companyId, 'DELIVERY_NOTE', header.id, true);
        const originalJournal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        let reversalJournal = this.resolveExistingReversal(context.companyId, originalJournal, header.reversalJournalId);

        if (header.status === 'CANCELLED' && (!stockPosted || stockAlreadyReversed) && (!originalJournal || Boolean(reversalJournal))) {
            return {
                documentId: header.id,
                docType: header.docType,
                docNo: header.docNo,
                status: 'ALREADY_CANCELLED',
                isStockReversed: true,
                isFinancialReversed: Boolean(reversalJournal) || !originalJournal,
                reversalJournalId: reversalJournal?.id || null,
                reversalJournalNo: reversalJournal?.journalNo || null,
            };
        }

        if (!stockPosted && !originalJournal) {
            this.repository.saveDocumentStatus(
                context.companyId,
                context.branchId,
                header.id,
                'CANCELLED',
                context.userId,
                new Date().toISOString(),
            );
            return {
                documentId: header.id,
                docType: header.docType,
                docNo: header.docNo,
                status: 'CANCELLED',
                isStockReversed: false,
                isFinancialReversed: false,
                reversalJournalId: null,
                reversalJournalNo: null,
            };
        }

        if (stockPosted && !stockAlreadyReversed) {
            this.stockLedgerService.reverse(context, 'DELIVERY_NOTE', header.id, reverseDate);
        }

        if (originalJournal && !reversalJournal) {
            try {
                const result = this.journalEngineUseCases.reverseJournal(context.companyId, context.userId, {
                    companyId: context.companyId,
                    journalId: originalJournal.id,
                    reverseDate,
                    sourceType: 'DELIVERY_NOTE_REVERSAL',
                    sourceId: header.id,
                    sourceNo: header.docNo,
                    sourceVersion,
                    referenceNo: header.referenceNo || header.docNo,
                    reason: input.reason || `Cancel delivery note ${header.docNo}`,
                    postedBy: context.userId,
                });
                reversalJournal = this.journalEngineUseCases.getById(context.companyId, result.reversalJournalId);
            } catch (error: any) {
                if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                    throw error;
                }
                reversalJournal = this.resolveExistingReversal(
                    context.companyId,
                    this.journalEngineUseCases.getById(context.companyId, originalJournal.id),
                    header.reversalJournalId,
                );
            }
        }

        const reverseTime = new Date().toISOString();
        this.repository.runInTransaction(() => {
            this.repository.saveReversalState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                reversalJournalId: reversalJournal?.id || null,
                reversedBy: context.userId,
                reversedAt: reverseTime,
                stockReversedAt: reverseTime,
                nextStatus: 'CANCELLED',
            });

            this.applyDeliveryProgressByLinks(context, header.id, -1);
        });

        return {
            documentId: header.id,
            docType: header.docType,
            docNo: header.docNo,
            status: 'CANCELLED',
            isStockReversed: stockPosted,
            isFinancialReversed: originalJournal ? Boolean(reversalJournal) : false,
            reversalJournalId: reversalJournal?.id || null,
            reversalJournalNo: reversalJournal?.journalNo || null,
        };
    }

    deliveryToInvoicePreparation(
        context: Pick<SalesContext, 'companyId' | 'branchId'>,
        deliveryId: string,
    ): SalesInvoicePreparationDto {
        const delivery = this.requireDocument(context.companyId, context.branchId, deliveryId, 'DELIVERY_NOTE');
        return this.prepareInvoiceDtoFromDocument(
            delivery,
            (line) => this.round(Math.max(0, line.qty - line.returnedQty - line.invoicedQty)),
        );
    }

    convertDeliveryToReturn(context: SalesContext, input: ConvertDeliveryToReturnInput): SalesConversionResult {
        const deliveryId = this.normalizeRequired(input.deliveryId, 'Delivery id is required');
        const delivery = this.requireDocument(context.companyId, context.branchId, deliveryId, 'DELIVERY_NOTE');
        if (delivery.header.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled delivery cannot be converted', {
                messageKey: 'validation.sales_operations.delivery.cancelled',
                details: { deliveryId },
            });
        }

        const policy = this.repository.getPolicy(context.companyId);
        const selected = this.normalizeSelectedLines(input.selectedLines || []);
        const convertedMap = this.getActiveConvertedQtyBySourceLine(
            context.companyId,
            context.branchId,
            delivery.header.id,
            'SALES_RETURN',
        );

        const sourceRows = delivery.lines
            .map((line) => {
                const converted = convertedMap.get(line.id) || 0;
                const remaining = this.round(Math.max(0, line.qty - converted));
                return { line, remaining };
            })
            .filter((entry) => entry.remaining > EPSILON);

        if (!sourceRows.length) {
            throw new DomainError('VALIDATION_ERROR', 'Delivery has no remaining quantity for return conversion', {
                messageKey: 'validation.sales_operations.conversion.no_remaining_qty',
                details: { deliveryId },
            });
        }

        this.assertSelectedLinesExist(selected, sourceRows.map((entry) => entry.line.id), 'Delivery conversion line is invalid');

        const now = new Date().toISOString();
        const targetId = this.repository.nextIdentity();
        const targetLines: SalesCreateDocumentDbInput['lines'] = [];
        const links: SalesCreateLinkInput[] = [];

        for (const source of sourceRows) {
            const requested = selected.get(source.line.id);
            const qty = requested !== undefined ? requested : source.remaining;
            if (qty <= EPSILON) continue;

            if (!policy.allowOverReturn && qty - source.remaining > EPSILON) {
                throw new DomainError('VALIDATION_ERROR', 'Over conversion to return is not allowed', {
                    messageKey: 'validation.sales_operations.over_return',
                    details: {
                        sourceLineId: source.line.id,
                        requestedQty: qty,
                        remainingQty: source.remaining,
                    },
                });
            }

            const line = this.mapSourceLineToTarget(targetLines.length + 1, source.line, qty, now);
            targetLines.push(line);
            links.push({
                id: this.repository.nextIdentity(),
                companyId: context.companyId,
                branchId: context.branchId,
                sourceDocType: 'DELIVERY_NOTE',
                sourceDocId: delivery.header.id,
                sourceLineId: source.line.id,
                targetDocType: 'SALES_RETURN',
                targetDocId: targetId,
                targetLineId: line.id,
                qty,
                createdAt: now,
            });
        }

        if (!targetLines.length) {
            throw new DomainError('VALIDATION_ERROR', 'No sales return lines generated from delivery conversion', {
                messageKey: 'validation.sales_operations.conversion.no_remaining_qty',
                details: { deliveryId },
            });
        }

        const totals = this.resolveDocumentTotals(targetLines, {
            subtotal: null,
            discountAmount: null,
            taxableAmount: null,
            vatAmount: null,
            totalAmount: null,
        });

        this.repository.runInTransaction(() => {
            this.repository.createDocument({
                id: targetId,
                companyId: context.companyId,
                branchId: context.branchId,
                docType: 'SALES_RETURN',
                docNo: this.repository.nextDocumentNo(context.companyId, context.branchId, 'SALES_RETURN'),
                docDate: delivery.header.docDate,
                status: 'DRAFT',
                customerId: delivery.header.customerId,
                warehouseId: delivery.header.warehouseId,
                currencyCode: delivery.header.currencyCode,
                currencyRate: delivery.header.currencyRate,
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                taxableAmount: totals.taxableAmount,
                vatAmount: totals.vatAmount,
                totalAmount: totals.totalAmount,
                referenceNo: delivery.header.docNo,
                remarks: delivery.header.remarks,
                sourceDocType: 'DELIVERY_NOTE',
                sourceDocId: delivery.header.id,
                createdBy: context.userId,
                approvedBy: null,
                version: 1,
                createdAt: now,
                updatedAt: now,
                lines: targetLines,
            });
            this.repository.createLinks(links);
        });

        const salesReturn = this.requireDocument(context.companyId, context.branchId, targetId, 'SALES_RETURN');
        return {
            sourceDocumentId: delivery.header.id,
            targetDocumentId: salesReturn.header.id,
            targetDocType: 'SALES_RETURN',
            targetDocNo: salesReturn.header.docNo,
        };
    }

    createSalesReturn(context: SalesContext, input: CreateSalesOperationDocumentInput): SalesOperationDocumentEntity {
        return this.createDocument(context, 'SALES_RETURN', input);
    }

    updateSalesReturn(context: SalesContext, input: UpdateSalesOperationDocumentInput): SalesOperationDocumentEntity {
        return this.updateDocument(context, 'SALES_RETURN', input);
    }

    getSalesReturnById(context: Pick<SalesContext, 'companyId' | 'branchId'>, documentId: string): SalesOperationDocumentEntity {
        return this.getDocument(context, 'SALES_RETURN', documentId);
    }

    async postSalesReturn(context: SalesContext, input: PostSalesReturnInput): Promise<SalesDocumentPostResult> {
        const documentId = this.normalizeRequired(input.documentId, 'Sales return id is required');
        const salesReturn = this.requireDocument(context.companyId, context.branchId, documentId, 'SALES_RETURN');
        const header = salesReturn.header;
        const lines = salesReturn.lines;

        this.assertCanPost(header);
        this.validatePostingLines('SALES_RETURN', lines, header.warehouseId);

        const policy = this.repository.getPolicy(context.companyId);
        const sourceVersion = Number(header.version || 1) + 1;
        const postingTime = new Date().toISOString();

        const stockAlreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, 'SALES_RETURN', header.id, false);
        let journal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const requiresFinancialPosting = policy.cogsPostingMode === 'DELIVERY' && policy.returnCostReversalEnabled;

        if (header.status === 'POSTED' && stockAlreadyPosted && (!requiresFinancialPosting || Boolean(journal))) {
            return {
                documentId: header.id,
                docType: header.docType,
                docNo: header.docNo,
                status: 'ALREADY_POSTED',
                sourceVersion,
                isStockPosted: true,
                isFinancialPosted: requiresFinancialPosting ? Boolean(journal) : false,
                journalId: journal?.id || null,
                journalNo: journal?.journalNo || null,
            };
        }

        if (!stockAlreadyPosted) {
            this.stockLedgerService.postReturn(context, header, lines);
        }

        if (requiresFinancialPosting && !journal) {
            const postingCommand = await this.accountingBuilder.buildReturnCostJournal({
                companyId: context.companyId,
                branchId: context.branchId,
                userId: context.userId,
                sourceVersion,
                header,
                lines,
            });

            if (postingCommand) {
                try {
                    const result = this.journalEngineUseCases.postJournal(
                        context.companyId,
                        context.branchId,
                        context.userId,
                        postingCommand,
                    );
                    journal = this.journalEngineUseCases.getById(context.companyId, result.journalId);
                } catch (error: any) {
                    if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                        throw error;
                    }
                    journal = this.journalEngineUseCases.getBySource(context.companyId, {
                        sourceType: 'SALES_RETURN',
                        sourceId: header.id,
                        sourceVersion,
                    }) || this.journalEngineUseCases.getBySource(context.companyId, {
                        sourceType: 'SALES_RETURN',
                        sourceId: header.id,
                        sourceVersion: null,
                    });
                }
            }
        }

        this.repository.runInTransaction(() => {
            this.repository.savePostingState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                journalId: journal?.id || null,
                postedBy: context.userId,
                postedAt: postingTime,
                stockPostedAt: postingTime,
                nextStatus: 'POSTED',
            });

            this.applyReturnProgressByLinks(context, header.id, 1);
        });

        return {
            documentId: header.id,
            docType: header.docType,
            docNo: header.docNo,
            status: stockAlreadyPosted && (!requiresFinancialPosting || Boolean(journal)) ? 'ALREADY_POSTED' : 'POSTED',
            sourceVersion,
            isStockPosted: true,
            isFinancialPosted: requiresFinancialPosting ? Boolean(journal) : false,
            journalId: journal?.id || null,
            journalNo: journal?.journalNo || null,
        };
    }

    async cancelSalesReturn(context: SalesContext, input: CancelSalesReturnInput): Promise<SalesDocumentCancelResult> {
        const documentId = this.normalizeRequired(input.documentId, 'Sales return id is required');
        const reverseDate = this.normalizeDate(input.reverseDate, 'Reverse date is required');

        const salesReturn = this.requireDocument(context.companyId, context.branchId, documentId, 'SALES_RETURN');
        const header = salesReturn.header;
        const sourceVersion = Number(header.version || 1) + 1;

        const stockPosted = this.repository.hasStockLedgerPosting(context.companyId, 'SALES_RETURN', header.id, false);
        const stockAlreadyReversed = this.repository.hasStockLedgerPosting(context.companyId, 'SALES_RETURN', header.id, true);
        const originalJournal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        let reversalJournal = this.resolveExistingReversal(context.companyId, originalJournal, header.reversalJournalId);

        if (header.status === 'CANCELLED' && (!stockPosted || stockAlreadyReversed) && (!originalJournal || Boolean(reversalJournal))) {
            return {
                documentId: header.id,
                docType: header.docType,
                docNo: header.docNo,
                status: 'ALREADY_CANCELLED',
                isStockReversed: true,
                isFinancialReversed: Boolean(reversalJournal) || !originalJournal,
                reversalJournalId: reversalJournal?.id || null,
                reversalJournalNo: reversalJournal?.journalNo || null,
            };
        }

        if (!stockPosted && !originalJournal) {
            this.repository.saveDocumentStatus(
                context.companyId,
                context.branchId,
                header.id,
                'CANCELLED',
                context.userId,
                new Date().toISOString(),
            );
            return {
                documentId: header.id,
                docType: header.docType,
                docNo: header.docNo,
                status: 'CANCELLED',
                isStockReversed: false,
                isFinancialReversed: false,
                reversalJournalId: null,
                reversalJournalNo: null,
            };
        }

        if (stockPosted && !stockAlreadyReversed) {
            this.stockLedgerService.reverse(context, 'SALES_RETURN', header.id, reverseDate);
        }

        if (originalJournal && !reversalJournal) {
            try {
                const result = this.journalEngineUseCases.reverseJournal(context.companyId, context.userId, {
                    companyId: context.companyId,
                    journalId: originalJournal.id,
                    reverseDate,
                    sourceType: 'SALES_RETURN_REVERSAL',
                    sourceId: header.id,
                    sourceNo: header.docNo,
                    sourceVersion,
                    referenceNo: header.referenceNo || header.docNo,
                    reason: input.reason || `Cancel sales return ${header.docNo}`,
                    postedBy: context.userId,
                });
                reversalJournal = this.journalEngineUseCases.getById(context.companyId, result.reversalJournalId);
            } catch (error: any) {
                if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                    throw error;
                }
                reversalJournal = this.resolveExistingReversal(
                    context.companyId,
                    this.journalEngineUseCases.getById(context.companyId, originalJournal.id),
                    header.reversalJournalId,
                );
            }
        }

        const reverseTime = new Date().toISOString();
        this.repository.runInTransaction(() => {
            this.repository.saveReversalState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                reversalJournalId: reversalJournal?.id || null,
                reversedBy: context.userId,
                reversedAt: reverseTime,
                stockReversedAt: reverseTime,
                nextStatus: 'CANCELLED',
            });

            this.applyReturnProgressByLinks(context, header.id, -1);
        });

        return {
            documentId: header.id,
            docType: header.docType,
            docNo: header.docNo,
            status: 'CANCELLED',
            isStockReversed: stockPosted,
            isFinancialReversed: originalJournal ? Boolean(reversalJournal) : false,
            reversalJournalId: reversalJournal?.id || null,
            reversalJournalNo: reversalJournal?.journalNo || null,
        };
    }

    getSalesReturnPostingStatus(
        context: Pick<SalesContext, 'companyId' | 'branchId'>,
        documentId: string,
    ): SalesOperationalPostingStatus {
        const salesReturn = this.requireDocument(context.companyId, context.branchId, documentId, 'SALES_RETURN');
        const header = salesReturn.header;
        const sourceVersion = Number(header.version || 1) + 1;

        const journal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const reversal = this.resolveExistingReversal(context.companyId, journal, header.reversalJournalId);
        const stockPosted = this.repository.hasStockLedgerPosting(context.companyId, 'SALES_RETURN', header.id, false);
        const stockReversed = this.repository.hasStockLedgerPosting(context.companyId, 'SALES_RETURN', header.id, true);

        return {
            documentId: header.id,
            docType: header.docType,
            docNo: header.docNo,
            documentStatus: header.status,
            sourceVersion,
            isStockPosted: stockPosted,
            isStockReversed: stockReversed,
            isFinancialPosted: Boolean(journal),
            isFinancialReversed: Boolean(reversal),
            journalId: journal?.id || null,
            journalNo: journal?.journalNo || null,
            reversalJournalId: reversal?.id || null,
            reversalJournalNo: reversal?.journalNo || null,
            postedAt: header.postedAt || null,
            reversedAt: header.reversedAt || null,
        };
    }

    private createDocument(
        context: SalesContext,
        docType: SalesOperationDocumentType,
        input: CreateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const userId = this.normalizeRequired(context.userId, 'User id is required');

        const docDate = this.normalizeDate(input.docDate, 'Document date is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.ensureCustomer(customerId);

        const currencyCode = this.repository.resolveCurrencyCode(input.currencyCode || 'ILS');
        const currencyRate = this.toRate(input.currencyRate);
        const now = new Date().toISOString();

        const documentId = this.repository.nextIdentity();
        const lines = this.normalizeInputLines(input.lines || [], now);
        this.validateDraftLines(docType, lines, input.warehouseId || null);

        const totals = this.resolveDocumentTotals(lines, {
            subtotal: input.subtotal,
            discountAmount: input.discountAmount,
            taxableAmount: input.taxableAmount,
            vatAmount: input.vatAmount,
            totalAmount: input.totalAmount,
        });

        return this.repository.runInTransaction(() => this.repository.createDocument({
            id: documentId,
            companyId,
            branchId,
            docType,
            docNo: this.repository.nextDocumentNo(companyId, branchId, docType),
            docDate,
            status: 'DRAFT',
            customerId,
            warehouseId: this.normalizeNullable(input.warehouseId),
            currencyCode,
            currencyRate,
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            taxableAmount: totals.taxableAmount,
            vatAmount: totals.vatAmount,
            totalAmount: totals.totalAmount,
            referenceNo: this.normalizeNullable(input.referenceNo),
            remarks: this.normalizeNullable(input.remarks),
            sourceDocType: this.normalizeDocTypeNullable(input.sourceDocType),
            sourceDocId: this.normalizeNullable(input.sourceDocId),
            createdBy: this.normalizeRequired(input.createdBy || userId, 'Created by is required'),
            approvedBy: this.normalizeNullable(input.approvedBy),
            version: 1,
            createdAt: now,
            updatedAt: now,
            lines,
        } satisfies SalesCreateDocumentDbInput));
    }

    private updateDocument(
        context: SalesContext,
        docType: SalesOperationDocumentType,
        input: UpdateSalesOperationDocumentInput,
    ): SalesOperationDocumentEntity {
        const documentId = this.normalizeRequired(input.id, 'Document id is required');
        const current = this.requireDocument(context.companyId, context.branchId, documentId, docType);
        if (current.header.status !== 'DRAFT') {
            throw new DomainError('INVALID_TRANSITION', 'Only draft documents can be updated', {
                messageKey: 'error.sales_operations.update.not_draft',
                details: { documentId, status: current.header.status },
            });
        }

        const docDate = this.normalizeDate(input.docDate, 'Document date is required');
        const customerId = this.normalizeRequired(input.customerId, 'Customer id is required');
        this.ensureCustomer(customerId);

        const currencyCode = this.repository.resolveCurrencyCode(input.currencyCode || current.header.currencyCode);
        const currencyRate = this.toRate(input.currencyRate ?? current.header.currencyRate);
        const now = new Date().toISOString();

        const lines = this.normalizeInputLines(input.lines || [], now);
        this.validateDraftLines(docType, lines, input.warehouseId || current.header.warehouseId);

        const totals = this.resolveDocumentTotals(lines, {
            subtotal: input.subtotal,
            discountAmount: input.discountAmount,
            taxableAmount: input.taxableAmount,
            vatAmount: input.vatAmount,
            totalAmount: input.totalAmount,
        });

        return this.repository.runInTransaction(() => this.repository.updateDocument({
            id: documentId,
            companyId: context.companyId,
            branchId: context.branchId,
            docDate,
            customerId,
            warehouseId: this.normalizeNullable(input.warehouseId),
            currencyCode,
            currencyRate,
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            taxableAmount: totals.taxableAmount,
            vatAmount: totals.vatAmount,
            totalAmount: totals.totalAmount,
            referenceNo: this.normalizeNullable(input.referenceNo),
            remarks: this.normalizeNullable(input.remarks),
            approvedBy: this.normalizeNullable(input.approvedBy),
            updatedAt: now,
            lines,
        }));
    }

    private getDocument(
        context: Pick<SalesContext, 'companyId' | 'branchId'>,
        docType: SalesOperationDocumentType,
        documentId: string,
    ): SalesOperationDocumentEntity {
        return this.requireDocument(context.companyId, context.branchId, documentId, docType);
    }

    private prepareInvoiceDtoFromDocument(
        document: SalesOperationDocumentEntity,
        quantitySelector: (line: SalesOperationLineEntity) => number,
    ): SalesInvoicePreparationDto {
        const lines: SalesInvoicePreparationLineDto[] = [];
        for (const line of document.lines) {
            const qty = this.round(quantitySelector(line));
            if (qty <= EPSILON) continue;
            lines.push(this.mapLineForInvoice(line, qty));
        }

        if (!lines.length) {
            throw new DomainError('VALIDATION_ERROR', 'No quantity available for invoice preparation', {
                messageKey: 'validation.sales_operations.invoice_preparation.no_qty',
                details: { sourceDocId: document.header.id, sourceDocType: document.header.docType },
            });
        }

        return {
            sourceDocType: document.header.docType,
            sourceDocId: document.header.id,
            sourceDocNo: document.header.docNo,
            customerId: document.header.customerId,
            currencyCode: document.header.currencyCode,
            currencyRate: document.header.currencyRate,
            warehouseId: document.header.warehouseId,
            lines,
        };
    }

    private mapLineForInvoice(line: SalesOperationLineEntity, qty: number): SalesInvoicePreparationLineDto {
        const sourceQty = this.round(line.qty);
        const ratio = sourceQty > EPSILON ? qty / sourceQty : 0;
        return {
            sourceLineId: line.id,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
            qty,
            unitPrice: this.round(line.unitPrice),
            discountAmount: this.round(line.discountAmount * ratio),
            taxableAmount: this.round(line.taxableAmount * ratio),
            vatAmount: this.round(line.vatAmount * ratio),
            lineTotal: this.round(line.lineTotal * ratio),
            projectId: line.projectId,
            costCenterId: line.costCenterId,
        };
    }

    private assertCanPost(header: SalesOperationHeaderEntity): void {
        if (header.status === 'CANCELLED') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled document cannot be posted', {
                messageKey: 'validation.sales_operations.post.cancelled',
                details: { documentId: header.id, docType: header.docType },
            });
        }
    }

    private validatePostingLines(
        docType: SalesOperationDocumentType,
        lines: Array<{
            id: string;
            itemId: string;
            warehouseId: string | null;
            qty: number;
            unitPrice: number;
            discountAmount: number;
            lineSubtotal: number;
            taxableAmount: number;
            vatAmount: number;
            lineTotal: number;
        }>,
        documentWarehouseId: string | null,
    ): void {
        this.validateDraftLines(docType, lines, documentWarehouseId);
    }

    private validateDraftLines(
        docType: SalesOperationDocumentType,
        lines: Array<{
            id: string;
            itemId: string;
            warehouseId: string | null;
            qty: number;
            unitPrice: number;
            discountAmount: number;
            lineSubtotal: number;
            taxableAmount: number;
            vatAmount: number;
            lineTotal: number;
        }>,
        documentWarehouseId: string | null,
    ): void {
        if (!lines.length) {
            throw new DomainError('VALIDATION_ERROR', 'Document must contain at least one line', {
                messageKey: 'validation.sales_operations.lines_required',
                details: { docType },
            });
        }

        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            const lineNo = index + 1;

            if (this.round(line.qty) <= EPSILON) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: quantity must be greater than zero`, {
                    messageKey: 'validation.sales_operations.qty_positive',
                    details: { lineNo },
                });
            }

            if (this.round(line.unitPrice) < -EPSILON) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: unit price cannot be negative`, {
                    messageKey: 'validation.sales_operations.price_non_negative',
                    details: { lineNo },
                });
            }

            if (this.round(line.discountAmount) < -EPSILON) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: discount cannot be negative`, {
                    messageKey: 'validation.sales_operations.discount_non_negative',
                    details: { lineNo },
                });
            }

            if (this.round(line.lineSubtotal) < -EPSILON || this.round(line.taxableAmount) < -EPSILON || this.round(line.lineTotal) < -EPSILON) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: line totals must be non-negative`, {
                    messageKey: 'validation.sales_operations.line_totals_invalid',
                    details: { lineNo },
                });
            }

            const expectedLineTotal = this.round(line.taxableAmount + line.vatAmount);
            if (Math.abs(expectedLineTotal - this.round(line.lineTotal)) > 0.02) {
                throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: line total mismatch`, {
                    messageKey: 'validation.sales_operations.line_totals_invalid',
                    details: { lineNo, expectedLineTotal, lineTotal: line.lineTotal },
                });
            }

            const item = this.requireItem(line.itemId, lineNo);
            const warehouseId = this.normalizeNullable(line.warehouseId || documentWarehouseId);
            if (warehouseId) {
                this.requireWarehouse(warehouseId, lineNo);
            }

            if (docType === 'DELIVERY_NOTE' || docType === 'SALES_RETURN') {
                if (!item.isStockItem) {
                    throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: stock item is required`, {
                        messageKey: 'validation.sales_operations.stock_item_required',
                        details: { lineNo, itemId: line.itemId, docType },
                    });
                }
                if (!warehouseId) {
                    throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: warehouse is required`, {
                        messageKey: 'validation.sales_operations.warehouse_required',
                        details: { lineNo, docType },
                    });
                }
            }
        }
    }

    private applyDeliveryProgressByLinks(context: SalesContext, deliveryId: string, sign: 1 | -1): void {
        const links = this.repository.listLinksByTarget(context.companyId, deliveryId)
            .filter((link) => link.sourceDocType === 'SALES_ORDER' && link.targetDocType === 'DELIVERY_NOTE');
        if (!links.length) return;

        const touchedOrders = new Set<string>();
        for (const link of links) {
            const delta = this.round(sign * Number(link.qty || 0));
            if (Math.abs(delta) <= EPSILON) continue;
            this.repository.updateLineProgress(link.sourceDocId, link.sourceLineId, { deliveredQty: delta });
            touchedOrders.add(link.sourceDocId);
        }

        for (const orderId of touchedOrders) {
            this.refreshOrderReservationSnapshot(context, orderId);
        }
    }

    private applyReturnProgressByLinks(context: SalesContext, salesReturnId: string, sign: 1 | -1): void {
        const returnLinks = this.repository.listLinksByTarget(context.companyId, salesReturnId)
            .filter((link) => link.sourceDocType === 'DELIVERY_NOTE' && link.targetDocType === 'SALES_RETURN');
        if (!returnLinks.length) return;

        const touchedOrders = new Set<string>();
        const cachedOrderLinksByDelivery = new Map<string, ReturnType<SalesOperationsRepositoryPort['listLinksByTarget']>>();

        for (const link of returnLinks) {
            const deltaReturn = this.round(sign * Number(link.qty || 0));
            if (Math.abs(deltaReturn) <= EPSILON) continue;

            this.repository.updateLineProgress(link.sourceDocId, link.sourceLineId, { returnedQty: deltaReturn });

            if (!cachedOrderLinksByDelivery.has(link.sourceDocId)) {
                const orderLinks = this.repository.listLinksByTarget(context.companyId, link.sourceDocId)
                    .filter((row) => row.sourceDocType === 'SALES_ORDER' && row.targetDocType === 'DELIVERY_NOTE');
                cachedOrderLinksByDelivery.set(link.sourceDocId, orderLinks);
            }

            const parentLinks = (cachedOrderLinksByDelivery.get(link.sourceDocId) || [])
                .filter((row) => row.targetLineId === link.sourceLineId);
            if (!parentLinks.length) continue;

            const totalLinkedQty = this.round(parentLinks.reduce((sum, row) => sum + Number(row.qty || 0), 0));
            let allocated = 0;
            for (let index = 0; index < parentLinks.length; index += 1) {
                const parent = parentLinks[index];
                const isLast = index === parentLinks.length - 1;
                const delta = isLast
                    ? this.round(deltaReturn - allocated)
                    : this.round(deltaReturn * (Number(parent.qty || 0) / (totalLinkedQty > EPSILON ? totalLinkedQty : 1)));
                allocated = this.round(allocated + delta);
                if (Math.abs(delta) <= EPSILON) continue;
                this.repository.updateLineProgress(parent.sourceDocId, parent.sourceLineId, { returnedQty: delta });
                touchedOrders.add(parent.sourceDocId);
            }
        }

        for (const orderId of touchedOrders) {
            this.refreshOrderReservationSnapshot(context, orderId);
        }
    }

    private refreshOrderReservationSnapshot(context: SalesContext, orderId: string): void {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'SALES_ORDER');
        if (order.header.status === 'CANCELLED') {
            this.repository.replaceReservationsForOrder(context.companyId, context.branchId, orderId, []);
            return;
        }

        const now = new Date().toISOString();
        const reservations: SalesReservationRecord[] = [];

        for (const line of order.lines) {
            const warehouseId = this.normalizeNullable(line.warehouseId || order.header.warehouseId);
            const remaining = this.computeOrderRemainingQty(line);
            const targetReserved = warehouseId && remaining > EPSILON ? remaining : 0;
            const delta = this.round(targetReserved - line.reservedQty);

            if (Math.abs(delta) > EPSILON) {
                this.repository.updateLineProgress(order.header.id, line.id, {
                    reservedQty: delta,
                });
            }

            if (warehouseId && targetReserved > EPSILON) {
                reservations.push({
                    id: this.repository.nextIdentity(),
                    companyId: context.companyId,
                    branchId: context.branchId,
                    salesOrderId: order.header.id,
                    salesOrderLineId: line.id,
                    itemId: line.itemId,
                    warehouseId,
                    reservedQty: targetReserved,
                    createdAt: now,
                });
            }
        }

        this.repository.replaceReservationsForOrder(context.companyId, context.branchId, order.header.id, reservations);

        const refreshedOrder = this.requireDocument(context.companyId, context.branchId, order.header.id, 'SALES_ORDER');
        const summary = this.buildFulfillmentSummary(refreshedOrder);
        const nextStatus = this.mapOrderStatusFromFulfillment(refreshedOrder.header.status, summary.status);
        if (nextStatus !== refreshedOrder.header.status) {
            this.repository.saveDocumentStatus(
                context.companyId,
                context.branchId,
                order.header.id,
                nextStatus,
                context.userId,
                now,
            );
        }
    }

    private buildFulfillmentSummary(order: SalesOperationDocumentEntity): SalesOrderFulfillmentSummary {
        const lines = order.lines.map((line) => this.mapLineRemaining(line));
        const totals = lines.reduce(
            (acc, line) => {
                acc.totalQty += line.qty;
                acc.deliveredQty += line.deliveredQty;
                acc.returnedQty += line.returnedQty;
                acc.invoicedQty += line.invoicedQty;
                acc.reservedQty += line.reservedQty;
                acc.remainingQty += line.remainingQty;
                return acc;
            },
            {
                totalQty: 0,
                deliveredQty: 0,
                returnedQty: 0,
                invoicedQty: 0,
                reservedQty: 0,
                remainingQty: 0,
            },
        );

        const status = this.computeFulfillmentStatus(order.header.status, lines);

        return {
            orderId: order.header.id,
            orderNo: order.header.docNo,
            status,
            totalQty: this.round(totals.totalQty),
            deliveredQty: this.round(totals.deliveredQty),
            returnedQty: this.round(totals.returnedQty),
            invoicedQty: this.round(totals.invoicedQty),
            reservedQty: this.round(totals.reservedQty),
            remainingQty: this.round(Math.max(0, totals.remainingQty)),
            lines,
        };
    }

    private mapLineRemaining(line: SalesOperationLineEntity): SalesLineRemainingDto {
        const remaining = this.computeOrderRemainingQty(line);
        let lineStatus: SalesOrderFulfillmentStatus = 'OPEN';
        const progressed = this.round(line.deliveredQty + line.returnedQty + line.invoicedQty + line.reservedQty) > EPSILON;
        if (remaining <= EPSILON) {
            lineStatus = 'COMPLETED';
        } else if (progressed) {
            lineStatus = 'PARTIAL';
        }

        return {
            lineId: line.id,
            itemId: line.itemId,
            qty: this.round(line.qty),
            reservedQty: this.round(line.reservedQty),
            deliveredQty: this.round(line.deliveredQty),
            returnedQty: this.round(line.returnedQty),
            invoicedQty: this.round(line.invoicedQty),
            remainingQty: this.round(Math.max(0, remaining)),
            lineStatus,
        };
    }

    private computeFulfillmentStatus(
        orderStatus: SalesOperationStatus,
        lines: SalesLineRemainingDto[],
    ): SalesOrderFulfillmentStatus {
        if (orderStatus === 'CANCELLED') return 'CANCELLED';
        if (!lines.length) return 'OPEN';
        if (lines.every((line) => line.remainingQty <= EPSILON)) return 'COMPLETED';
        const hasProgress = lines.some((line) => line.lineStatus === 'PARTIAL' || line.lineStatus === 'COMPLETED' || line.reservedQty > EPSILON);
        return hasProgress ? 'PARTIAL' : 'OPEN';
    }

    private mapOrderStatusFromFulfillment(
        currentStatus: SalesOperationStatus,
        fulfillmentStatus: SalesOrderFulfillmentStatus,
    ): SalesOperationStatus {
        if (currentStatus === 'CANCELLED') return 'CANCELLED';
        if (fulfillmentStatus === 'COMPLETED') return 'COMPLETED';
        if (fulfillmentStatus === 'PARTIAL') return 'PARTIAL';
        if (currentStatus === 'DRAFT') return 'DRAFT';
        return 'CONFIRMED';
    }

    private computeOrderRemainingQty(line: SalesOperationLineEntity): number {
        return this.round(Math.max(0, line.qty - line.deliveredQty - line.returnedQty - line.invoicedQty));
    }

    private assertNoActiveReturnsForDelivery(companyId: string, branchId: string, deliveryId: string): void {
        const links = this.repository.listLinksBySource(companyId, deliveryId)
            .filter((link) => link.sourceDocType === 'DELIVERY_NOTE' && link.targetDocType === 'SALES_RETURN');
        if (!links.length) return;

        for (const link of links) {
            const targetHeader = this.repository.getDocumentHeaderById(companyId, branchId, link.targetDocId);
            if (!targetHeader) continue;
            if (targetHeader.status !== 'CANCELLED') {
                throw new DomainError('INVALID_TRANSITION', 'Delivery note with active sales return cannot be cancelled', {
                    messageKey: 'validation.sales_operations.delivery.cancel.has_returns',
                    details: {
                        deliveryId,
                        salesReturnId: targetHeader.id,
                        salesReturnStatus: targetHeader.status,
                    },
                });
            }
        }
    }

    private getActiveConvertedQtyBySourceLine(
        companyId: string,
        branchId: string,
        sourceDocId: string,
        targetDocType: SalesOperationDocumentType,
    ): Map<string, number> {
        const links = this.repository.listLinksBySource(companyId, sourceDocId)
            .filter((link) => link.targetDocType === targetDocType);
        const convertedBySource = new Map<string, number>();
        for (const link of links) {
            const targetHeader = this.repository.getDocumentHeaderById(companyId, branchId, link.targetDocId);
            if (!targetHeader || targetHeader.status === 'CANCELLED') continue;
            const current = convertedBySource.get(link.sourceLineId) || 0;
            convertedBySource.set(link.sourceLineId, this.round(current + Number(link.qty || 0)));
        }
        return convertedBySource;
    }

    private assertSelectedLinesExist(
        selected: Map<string, number>,
        availableLineIds: string[],
        message: string,
    ): void {
        if (!selected.size) return;
        const available = new Set(availableLineIds);
        for (const sourceLineId of selected.keys()) {
            if (!available.has(sourceLineId)) {
                throw new DomainError('VALIDATION_ERROR', message, {
                    messageKey: 'validation.sales_operations.conversion.line_invalid',
                    details: { sourceLineId },
                });
            }
        }
    }

    private mapSourceLineToTarget(
        lineNo: number,
        sourceLine: SalesOperationLineEntity,
        qty: number,
        now: string,
    ): SalesCreateDocumentDbInput['lines'][number] {
        const normalizedQty = this.round(qty);
        const sourceQty = this.round(sourceLine.qty);
        const ratio = sourceQty > EPSILON ? normalizedQty / sourceQty : 0;
        const lineSubtotal = this.round(sourceLine.lineSubtotal * ratio);
        const discountAmount = this.round(sourceLine.discountAmount * ratio);
        const taxableAmount = this.round(sourceLine.taxableAmount * ratio);
        const vatAmount = this.round(sourceLine.vatAmount * ratio);
        const lineTotal = this.round(sourceLine.lineTotal * ratio);

        return {
            id: this.repository.nextIdentity(),
            lineNo,
            itemId: sourceLine.itemId,
            warehouseId: sourceLine.warehouseId,
            qty: normalizedQty,
            deliveredQty: 0,
            returnedQty: 0,
            invoicedQty: 0,
            reservedQty: 0,
            unitPrice: this.round(sourceLine.unitPrice),
            discountAmount,
            lineSubtotal,
            taxableAmount,
            vatAmount,
            lineTotal,
            unitCost: sourceLine.unitCost !== null ? this.round(sourceLine.unitCost) : null,
            projectId: sourceLine.projectId,
            costCenterId: sourceLine.costCenterId,
            partnerId: sourceLine.partnerId,
            remarks: sourceLine.remarks,
            createdAt: now,
            updatedAt: now,
        };
    }

    private normalizeSelectedLines(input: ConvertLineSelectionInput[]): Map<string, number> {
        const map = new Map<string, number>();
        for (const row of input || []) {
            const lineId = this.normalizeRequired(row.sourceLineId, 'Source line id is required');
            const qty = this.round(Number(row.qty || 0));
            if (qty <= EPSILON) {
                throw new DomainError('VALIDATION_ERROR', 'Selected quantity must be greater than zero', {
                    messageKey: 'validation.sales_operations.qty_positive',
                    details: { sourceLineId: lineId, qty: row.qty },
                });
            }
            const existing = map.get(lineId) || 0;
            map.set(lineId, this.round(existing + qty));
        }
        return map;
    }

    private normalizeInputLines(
        inputLines: Array<{
            id?: string;
            itemId: string;
            warehouseId?: string | null;
            qty: number;
            unitPrice: number;
            discountAmount?: number | null;
            lineSubtotal?: number | null;
            taxableAmount?: number | null;
            vatAmount?: number | null;
            lineTotal?: number | null;
            unitCost?: number | null;
            projectId?: string | null;
            costCenterId?: string | null;
            partnerId?: string | null;
            remarks?: string | null;
        }>,
        nowIso: string,
    ): SalesCreateDocumentDbInput['lines'] {
        return (inputLines || []).map((line, index) => {
            const qty = this.round(Number(line.qty || 0));
            const unitPrice = this.round(Number(line.unitPrice || 0));
            const discountAmount = this.round(Number(line.discountAmount || 0));
            const calculatedSubtotal = this.round(Math.max(0, qty * unitPrice - discountAmount));
            const lineSubtotal = this.round(Number(line.lineSubtotal ?? calculatedSubtotal));
            const taxableAmount = this.round(Number(line.taxableAmount ?? lineSubtotal));
            const vatAmount = this.round(Number(line.vatAmount || 0));
            const lineTotal = this.round(Number(line.lineTotal ?? (taxableAmount + vatAmount)));
            const unitCostRaw = line.unitCost;
            const unitCost = unitCostRaw === null || unitCostRaw === undefined
                ? null
                : this.round(Number(unitCostRaw));

            return {
                id: this.normalizeNullable(line.id) || this.repository.nextIdentity(),
                lineNo: index + 1,
                itemId: this.normalizeRequired(line.itemId, `Line ${index + 1}: item is required`),
                warehouseId: this.normalizeNullable(line.warehouseId),
                qty,
                deliveredQty: 0,
                returnedQty: 0,
                invoicedQty: 0,
                reservedQty: 0,
                unitPrice,
                discountAmount,
                lineSubtotal,
                taxableAmount,
                vatAmount,
                lineTotal,
                unitCost,
                projectId: this.normalizeNullable(line.projectId),
                costCenterId: this.normalizeNullable(line.costCenterId),
                partnerId: this.normalizeNullable(line.partnerId),
                remarks: this.normalizeNullable(line.remarks),
                createdAt: nowIso,
                updatedAt: nowIso,
            };
        });
    }

    private resolveDocumentTotals(
        lines: Array<{
            lineSubtotal: number;
            discountAmount: number;
            taxableAmount: number;
            vatAmount: number;
            lineTotal: number;
        }>,
        overrides: {
            subtotal?: number | null;
            discountAmount?: number | null;
            taxableAmount?: number | null;
            vatAmount?: number | null;
            totalAmount?: number | null;
        },
    ): {
        subtotal: number;
        discountAmount: number;
        taxableAmount: number;
        vatAmount: number;
        totalAmount: number;
    } {
        const computed = {
            subtotal: this.round(lines.reduce((sum, line) => sum + Number(line.lineSubtotal || 0), 0)),
            discountAmount: this.round(lines.reduce((sum, line) => sum + Number(line.discountAmount || 0), 0)),
            taxableAmount: this.round(lines.reduce((sum, line) => sum + Number(line.taxableAmount || 0), 0)),
            vatAmount: this.round(lines.reduce((sum, line) => sum + Number(line.vatAmount || 0), 0)),
            totalAmount: this.round(lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0)),
        };

        const assertMatch = (field: keyof typeof computed, provided?: number | null) => {
            if (provided === null || provided === undefined || String(provided).trim() === '') return;
            const numeric = this.round(Number(provided));
            if (Math.abs(numeric - computed[field]) > 0.02) {
                throw new DomainError('VALIDATION_ERROR', `Document ${field} does not match line totals`, {
                    messageKey: 'validation.sales_operations.header_totals_mismatch',
                    details: { field, provided: numeric, computed: computed[field] },
                });
            }
        };

        assertMatch('subtotal', overrides.subtotal);
        assertMatch('discountAmount', overrides.discountAmount);
        assertMatch('taxableAmount', overrides.taxableAmount);
        assertMatch('vatAmount', overrides.vatAmount);
        assertMatch('totalAmount', overrides.totalAmount);

        return computed;
    }

    private ensureCustomer(customerId: string): void {
        const customer = this.repository.getCustomerById(customerId);
        if (!customer || !customer.isActive) {
            throw new DomainError('VALIDATION_ERROR', 'Customer was not found', {
                messageKey: 'validation.sales_operations.customer_required',
                details: { customerId },
            });
        }
    }

    private requireItem(itemId: string, lineNo: number) {
        const item = this.repository.getItemById(itemId);
        if (!item || !item.isActive) {
            throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: item is invalid`, {
                messageKey: 'validation.sales_operations.item_required',
                details: { lineNo, itemId },
            });
        }
        return item;
    }

    private requireWarehouse(warehouseId: string, lineNo: number): void {
        const warehouse = this.repository.getWarehouseById(warehouseId);
        if (!warehouse || !warehouse.isActive) {
            throw new DomainError('VALIDATION_ERROR', `Line ${lineNo}: warehouse is invalid`, {
                messageKey: 'validation.sales_operations.warehouse_required',
                details: { lineNo, warehouseId },
            });
        }
    }

    private resolveOriginalJournal(
        companyId: string,
        header: SalesOperationHeaderEntity,
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

    private requireDocument(
        companyId: string,
        branchId: string,
        documentId: string,
        expectedDocType?: SalesOperationDocumentType,
    ): SalesOperationDocumentEntity {
        const normalizedId = this.normalizeRequired(documentId, 'Document id is required');
        const document = this.repository.getDocumentById(companyId, branchId, normalizedId);
        if (!document) {
            throw new DomainError('DOCUMENT_NOT_FOUND', 'Sales document was not found', {
                messageKey: 'error.sales_operations.document_not_found',
                details: { documentId: normalizedId },
            });
        }

        if (expectedDocType && document.header.docType !== expectedDocType) {
            throw new DomainError('VALIDATION_ERROR', 'Document type mismatch', {
                messageKey: 'validation.sales_operations.doc_type_mismatch',
                details: {
                    documentId: normalizedId,
                    expectedDocType,
                    actualDocType: document.header.docType,
                },
            });
        }
        return document;
    }

    private normalizeDocTypeNullable(docType: SalesOperationDocumentType | null | undefined): SalesOperationDocumentType | null {
        const normalized = String(docType || '').trim().toUpperCase();
        if (!normalized) return null;
        if (normalized === 'SALES_ORDER') return 'SALES_ORDER';
        if (normalized === 'DELIVERY_NOTE') return 'DELIVERY_NOTE';
        if (normalized === 'SALES_RETURN') return 'SALES_RETURN';
        if (normalized === 'SALES_QUOTATION') return 'SALES_QUOTATION';

        throw new DomainError('VALIDATION_ERROR', 'Unsupported source document type', {
            messageKey: 'validation.sales_operations.doc_type_invalid',
            details: { docType },
        });
    }

    private normalizeDate(value: string, errorMessage: string): string {
        const normalized = String(value || '').trim().slice(0, 10);
        if (!normalized) {
            throw new DomainError('VALIDATION_ERROR', errorMessage, {
                messageKey: 'validation.sales_operations.date_required',
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

    private round(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
