"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOperationsService = void 0;
const errors_1 = require("../../domain/errors");
const EPSILON = 0.000001;
class PurchaseOperationsService {
    constructor(repository, stockLedgerService, accountingBuilder, journalEngineUseCases) {
        this.repository = repository;
        this.stockLedgerService = stockLedgerService;
        this.accountingBuilder = accountingBuilder;
        this.journalEngineUseCases = journalEngineUseCases;
        this.repository.ensureSchema();
    }
    createRequest(context, input) {
        return this.createDocument(context, 'PURCHASE_REQUEST', input);
    }
    updateRequest(context, input) {
        return this.updateDocument(context, 'PURCHASE_REQUEST', input);
    }
    getRequestById(context, documentId) {
        return this.getDocument(context, 'PURCHASE_REQUEST', documentId);
    }
    confirmRequest(context, documentId) {
        const request = this.requireDocument(context.companyId, context.branchId, documentId, 'PURCHASE_REQUEST');
        if (request.header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled request cannot be confirmed', {
                messageKey: 'validation.purchase_operations.request.cancelled',
                details: { documentId },
            });
        }
        if (request.header.status === 'CONFIRMED') {
            return request;
        }
        this.repository.saveDocumentStatus(context.companyId, context.branchId, request.header.id, 'CONFIRMED', context.userId, new Date().toISOString());
        return this.requireDocument(context.companyId, context.branchId, request.header.id, 'PURCHASE_REQUEST');
    }
    cancelRequest(context, documentId) {
        const request = this.requireDocument(context.companyId, context.branchId, documentId, 'PURCHASE_REQUEST');
        if (request.header.status === 'CANCELLED')
            return request;
        this.repository.saveDocumentStatus(context.companyId, context.branchId, request.header.id, 'CANCELLED', context.userId, new Date().toISOString());
        return this.requireDocument(context.companyId, context.branchId, request.header.id, 'PURCHASE_REQUEST');
    }
    convertRequestToRfq(context, input) {
        return this.convertSourceToTarget(context, this.normalizeRequired(input.requestId, 'Request id is required'), 'PURCHASE_REQUEST', 'PURCHASE_RFQ');
    }
    convertRequestToOrder(context, input) {
        return this.convertSourceToTarget(context, this.normalizeRequired(input.requestId, 'Request id is required'), 'PURCHASE_REQUEST', 'PURCHASE_ORDER');
    }
    createRfq(context, input) {
        return this.createDocument(context, 'PURCHASE_RFQ', input);
    }
    updateRfq(context, input) {
        return this.updateDocument(context, 'PURCHASE_RFQ', input);
    }
    getRfqById(context, documentId) {
        return this.getDocument(context, 'PURCHASE_RFQ', documentId);
    }
    confirmRfq(context, documentId) {
        const rfq = this.requireDocument(context.companyId, context.branchId, documentId, 'PURCHASE_RFQ');
        if (rfq.header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled RFQ cannot be confirmed', {
                messageKey: 'validation.purchase_operations.rfq.cancelled',
                details: { documentId },
            });
        }
        if (rfq.header.status === 'CONFIRMED') {
            return rfq;
        }
        this.repository.saveDocumentStatus(context.companyId, context.branchId, rfq.header.id, 'CONFIRMED', context.userId, new Date().toISOString());
        return this.requireDocument(context.companyId, context.branchId, rfq.header.id, 'PURCHASE_RFQ');
    }
    cancelRfq(context, documentId) {
        const rfq = this.requireDocument(context.companyId, context.branchId, documentId, 'PURCHASE_RFQ');
        if (rfq.header.status === 'CANCELLED')
            return rfq;
        this.repository.saveDocumentStatus(context.companyId, context.branchId, rfq.header.id, 'CANCELLED', context.userId, new Date().toISOString());
        return this.requireDocument(context.companyId, context.branchId, rfq.header.id, 'PURCHASE_RFQ');
    }
    convertRfqToOrder(context, input) {
        return this.convertSourceToTarget(context, this.normalizeRequired(input.rfqId, 'RFQ id is required'), 'PURCHASE_RFQ', 'PURCHASE_ORDER');
    }
    createOrder(context, input) {
        return this.createDocument(context, 'PURCHASE_ORDER', input);
    }
    updateOrder(context, input) {
        return this.updateDocument(context, 'PURCHASE_ORDER', input);
    }
    getOrderById(context, documentId) {
        return this.getDocument(context, 'PURCHASE_ORDER', documentId);
    }
    confirmOrder(context, orderId) {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'PURCHASE_ORDER');
        if (order.header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled purchase order cannot be confirmed', {
                messageKey: 'validation.purchase_operations.order.cancelled',
                details: { orderId },
            });
        }
        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            this.repository.saveDocumentStatus(context.companyId, context.branchId, order.header.id, 'CONFIRMED', context.userId, now);
            this.refreshOrderCommitmentSnapshot(context, order.header.id);
        });
        return this.requireDocument(context.companyId, context.branchId, order.header.id, 'PURCHASE_ORDER');
    }
    cancelOrder(context, orderId) {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'PURCHASE_ORDER');
        if (order.header.status === 'CANCELLED') {
            return order;
        }
        const hasFulfillment = order.lines.some((line) => this.round(line.receivedQty) > EPSILON || this.round(line.billedQty) > EPSILON);
        if (hasFulfillment) {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Order with fulfilled quantity cannot be cancelled', {
                messageKey: 'validation.purchase_operations.order.cannot_cancel_fulfilled',
                details: { orderId },
            });
        }
        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            this.repository.saveDocumentStatus(context.companyId, context.branchId, order.header.id, 'CANCELLED', context.userId, now);
            this.repository.replaceCommitmentsForOrder(context.companyId, context.branchId, order.header.id, []);
            for (const line of order.lines) {
                if (line.reservedQty > EPSILON) {
                    this.repository.updateLineProgress(order.header.id, line.id, {
                        reservedQty: -line.reservedQty,
                    });
                }
            }
        });
        return this.requireDocument(context.companyId, context.branchId, order.header.id, 'PURCHASE_ORDER');
    }
    getOrderFulfillmentStatus(context, orderId) {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'PURCHASE_ORDER');
        return this.buildFulfillmentSummary(order);
    }
    convertOrderToReceipt(context, input) {
        const orderId = this.normalizeRequired(input.orderId, 'Order id is required');
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'PURCHASE_ORDER');
        if (order.header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled order cannot be converted', {
                messageKey: 'validation.purchase_operations.order.cancelled',
                details: { orderId },
            });
        }
        const policy = this.repository.getPolicy(context.companyId);
        const selected = this.normalizeSelectedLines(input.selectedLines || []);
        const convertedMap = this.getActiveConvertedQtyBySourceLine(context.companyId, context.branchId, order.header.id, 'GOODS_RECEIPT_NOTE');
        const sourceRows = order.lines
            .map((line) => {
            const convertedQty = convertedMap.get(line.id) || 0;
            const remainingByProgress = this.computeOrderRemainingQty(line);
            const remainingByLinks = this.round(Math.max(0, line.qty - convertedQty));
            const remaining = this.round(Math.max(0, Math.min(remainingByProgress, remainingByLinks)));
            return { line, remaining };
        })
            .filter((entry) => entry.remaining > EPSILON);
        if (!sourceRows.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Order has no remaining quantity for receipt conversion', {
                messageKey: 'validation.purchase_operations.conversion.no_remaining_qty',
                details: { orderId },
            });
        }
        this.assertSelectedLinesExist(selected, sourceRows.map((entry) => entry.line.id), 'Order conversion line is invalid');
        const now = new Date().toISOString();
        const targetId = this.repository.nextIdentity();
        const targetLines = [];
        const links = [];
        for (const source of sourceRows) {
            const requested = selected.get(source.line.id);
            const qty = requested !== undefined ? requested : source.remaining;
            if (qty <= EPSILON)
                continue;
            if (!policy.allowOverReceipt && qty - source.remaining > EPSILON) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Over conversion to receipt is not allowed', {
                    messageKey: 'validation.purchase_operations.over_receipt',
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
                sourceDocType: 'PURCHASE_ORDER',
                sourceDocId: order.header.id,
                sourceLineId: source.line.id,
                targetDocType: 'GOODS_RECEIPT_NOTE',
                targetDocId: targetId,
                targetLineId: line.id,
                qty,
                createdAt: now,
            });
        }
        if (!targetLines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'No receipt lines generated from order conversion', {
                messageKey: 'validation.purchase_operations.conversion.no_remaining_qty',
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
                docType: 'GOODS_RECEIPT_NOTE',
                docNo: this.repository.nextDocumentNo(context.companyId, context.branchId, 'GOODS_RECEIPT_NOTE'),
                docDate: order.header.docDate,
                status: 'DRAFT',
                vendorId: order.header.vendorId,
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
                sourceDocType: 'PURCHASE_ORDER',
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
        const receipt = this.requireDocument(context.companyId, context.branchId, targetId, 'GOODS_RECEIPT_NOTE');
        return {
            sourceDocumentId: order.header.id,
            targetDocumentId: receipt.header.id,
            targetDocType: 'GOODS_RECEIPT_NOTE',
            targetDocNo: receipt.header.docNo,
        };
    }
    orderToInvoicePreparation(context, orderId) {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'PURCHASE_ORDER');
        return this.prepareInvoiceDtoFromDocument(order, (line) => this.round(Math.max(0, line.qty - line.billedQty)));
    }
    createGoodsReceiptNote(context, input) {
        return this.createDocument(context, 'GOODS_RECEIPT_NOTE', input);
    }
    updateGoodsReceiptNote(context, input) {
        return this.updateDocument(context, 'GOODS_RECEIPT_NOTE', input);
    }
    getGoodsReceiptNoteById(context, documentId) {
        return this.getDocument(context, 'GOODS_RECEIPT_NOTE', documentId);
    }
    async postGoodsReceiptNote(context, input) {
        const documentId = this.normalizeRequired(input.documentId, 'Receipt note id is required');
        const receipt = this.requireDocument(context.companyId, context.branchId, documentId, 'GOODS_RECEIPT_NOTE');
        const header = receipt.header;
        const lines = receipt.lines;
        this.assertCanPost(header);
        this.validatePostingLines('GOODS_RECEIPT_NOTE', lines, header.warehouseId);
        const policy = this.repository.getPolicy(context.companyId);
        const sourceVersion = Number(header.version || 1) + 1;
        const postingTime = new Date().toISOString();
        const stockAlreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, 'GOODS_RECEIPT_NOTE', header.id, false);
        let journal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const requiresFinancialPosting = policy.receiptAccountingMode === 'RECEIPT';
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
            this.stockLedgerService.postReceipt(context, header, lines);
        }
        if (requiresFinancialPosting && !journal) {
            const postingCommand = await this.accountingBuilder.buildReceiptJournal({
                companyId: context.companyId,
                branchId: context.branchId,
                userId: context.userId,
                sourceVersion,
                header,
                lines,
            });
            if (postingCommand) {
                try {
                    const result = this.journalEngineUseCases.postJournal(context.companyId, context.branchId, context.userId, postingCommand);
                    journal = this.journalEngineUseCases.getById(context.companyId, result.journalId);
                }
                catch (error) {
                    if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                        throw error;
                    }
                    journal = this.journalEngineUseCases.getBySource(context.companyId, {
                        sourceType: 'GOODS_RECEIPT_NOTE',
                        sourceId: header.id,
                        sourceVersion,
                    }) || this.journalEngineUseCases.getBySource(context.companyId, {
                        sourceType: 'GOODS_RECEIPT_NOTE',
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
            this.applyReceiptProgressByLinks(context, header.id, 1);
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
    async cancelGoodsReceiptNote(context, input) {
        const documentId = this.normalizeRequired(input.documentId, 'Receipt note id is required');
        const reverseDate = this.normalizeDate(input.reverseDate, 'Reverse date is required');
        const receipt = this.requireDocument(context.companyId, context.branchId, documentId, 'GOODS_RECEIPT_NOTE');
        const header = receipt.header;
        const sourceVersion = Number(header.version || 1) + 1;
        this.assertNoActiveReturnsForReceipt(context.companyId, context.branchId, header.id);
        const stockPosted = this.repository.hasStockLedgerPosting(context.companyId, 'GOODS_RECEIPT_NOTE', header.id, false);
        const stockAlreadyReversed = this.repository.hasStockLedgerPosting(context.companyId, 'GOODS_RECEIPT_NOTE', header.id, true);
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
            this.repository.saveDocumentStatus(context.companyId, context.branchId, header.id, 'CANCELLED', context.userId, new Date().toISOString());
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
            this.stockLedgerService.reverse(context, 'GOODS_RECEIPT_NOTE', header.id, reverseDate);
        }
        if (originalJournal && !reversalJournal) {
            try {
                const result = this.journalEngineUseCases.reverseJournal(context.companyId, context.userId, {
                    companyId: context.companyId,
                    journalId: originalJournal.id,
                    reverseDate,
                    sourceType: 'GOODS_RECEIPT_NOTE_REVERSAL',
                    sourceId: header.id,
                    sourceNo: header.docNo,
                    sourceVersion,
                    referenceNo: header.referenceNo || header.docNo,
                    reason: input.reason || `Cancel receipt note ${header.docNo}`,
                    postedBy: context.userId,
                });
                reversalJournal = this.journalEngineUseCases.getById(context.companyId, result.reversalJournalId);
            }
            catch (error) {
                if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                    throw error;
                }
                reversalJournal = this.resolveExistingReversal(context.companyId, this.journalEngineUseCases.getById(context.companyId, originalJournal.id), header.reversalJournalId);
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
            this.applyReceiptProgressByLinks(context, header.id, -1);
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
    receiptToInvoicePreparation(context, receiptId) {
        const receipt = this.requireDocument(context.companyId, context.branchId, receiptId, 'GOODS_RECEIPT_NOTE');
        return this.prepareInvoiceDtoFromDocument(receipt, (line) => this.round(Math.max(0, line.qty - line.returnedQty - line.billedQty)));
    }
    convertReceiptToReturn(context, input) {
        const receiptId = this.normalizeRequired(input.receiptId, 'Receipt id is required');
        const receipt = this.requireDocument(context.companyId, context.branchId, receiptId, 'GOODS_RECEIPT_NOTE');
        if (receipt.header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled receipt cannot be converted', {
                messageKey: 'validation.purchase_operations.receipt.cancelled',
                details: { receiptId },
            });
        }
        const policy = this.repository.getPolicy(context.companyId);
        const selected = this.normalizeSelectedLines(input.selectedLines || []);
        const convertedMap = this.getActiveConvertedQtyBySourceLine(context.companyId, context.branchId, receipt.header.id, 'PURCHASE_RETURN');
        const sourceRows = receipt.lines
            .map((line) => {
            const converted = convertedMap.get(line.id) || 0;
            const remainingByProgress = this.round(Math.max(0, line.qty - line.returnedQty));
            const remainingByLinks = this.round(Math.max(0, line.qty - converted));
            const remaining = this.round(Math.max(0, Math.min(remainingByProgress, remainingByLinks)));
            return { line, remaining };
        })
            .filter((entry) => entry.remaining > EPSILON);
        if (!sourceRows.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Receipt has no remaining quantity for return conversion', {
                messageKey: 'validation.purchase_operations.conversion.no_remaining_qty',
                details: { receiptId },
            });
        }
        this.assertSelectedLinesExist(selected, sourceRows.map((entry) => entry.line.id), 'Receipt conversion line is invalid');
        const now = new Date().toISOString();
        const targetId = this.repository.nextIdentity();
        const targetLines = [];
        const links = [];
        for (const source of sourceRows) {
            const requested = selected.get(source.line.id);
            const qty = requested !== undefined ? requested : source.remaining;
            if (qty <= EPSILON)
                continue;
            if (!policy.allowOverReturn && qty - source.remaining > EPSILON) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Over conversion to return is not allowed', {
                    messageKey: 'validation.purchase_operations.over_return',
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
                sourceDocType: 'GOODS_RECEIPT_NOTE',
                sourceDocId: receipt.header.id,
                sourceLineId: source.line.id,
                targetDocType: 'PURCHASE_RETURN',
                targetDocId: targetId,
                targetLineId: line.id,
                qty,
                createdAt: now,
            });
        }
        if (!targetLines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'No purchase return lines generated from receipt conversion', {
                messageKey: 'validation.purchase_operations.conversion.no_remaining_qty',
                details: { receiptId },
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
                docType: 'PURCHASE_RETURN',
                docNo: this.repository.nextDocumentNo(context.companyId, context.branchId, 'PURCHASE_RETURN'),
                docDate: receipt.header.docDate,
                status: 'DRAFT',
                vendorId: receipt.header.vendorId,
                warehouseId: receipt.header.warehouseId,
                currencyCode: receipt.header.currencyCode,
                currencyRate: receipt.header.currencyRate,
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                taxableAmount: totals.taxableAmount,
                vatAmount: totals.vatAmount,
                totalAmount: totals.totalAmount,
                referenceNo: receipt.header.docNo,
                remarks: receipt.header.remarks,
                sourceDocType: 'GOODS_RECEIPT_NOTE',
                sourceDocId: receipt.header.id,
                createdBy: context.userId,
                approvedBy: null,
                version: 1,
                createdAt: now,
                updatedAt: now,
                lines: targetLines,
            });
            this.repository.createLinks(links);
        });
        const purchaseReturn = this.requireDocument(context.companyId, context.branchId, targetId, 'PURCHASE_RETURN');
        return {
            sourceDocumentId: receipt.header.id,
            targetDocumentId: purchaseReturn.header.id,
            targetDocType: 'PURCHASE_RETURN',
            targetDocNo: purchaseReturn.header.docNo,
        };
    }
    createPurchaseReturn(context, input) {
        return this.createDocument(context, 'PURCHASE_RETURN', input);
    }
    updatePurchaseReturn(context, input) {
        return this.updateDocument(context, 'PURCHASE_RETURN', input);
    }
    getPurchaseReturnById(context, documentId) {
        return this.getDocument(context, 'PURCHASE_RETURN', documentId);
    }
    async postPurchaseReturn(context, input) {
        const documentId = this.normalizeRequired(input.documentId, 'Purchase return id is required');
        const purchaseReturn = this.requireDocument(context.companyId, context.branchId, documentId, 'PURCHASE_RETURN');
        const header = purchaseReturn.header;
        const lines = purchaseReturn.lines;
        this.assertCanPost(header);
        this.validatePostingLines('PURCHASE_RETURN', lines, header.warehouseId);
        const policy = this.repository.getPolicy(context.companyId);
        const sourceVersion = Number(header.version || 1) + 1;
        const postingTime = new Date().toISOString();
        const stockAlreadyPosted = this.repository.hasStockLedgerPosting(context.companyId, 'PURCHASE_RETURN', header.id, false);
        let journal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const requiresFinancialPosting = policy.returnFinancialImpactEnabled;
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
            const postingCommand = await this.accountingBuilder.buildReturnJournal({
                companyId: context.companyId,
                branchId: context.branchId,
                userId: context.userId,
                sourceVersion,
                header,
                lines,
            });
            if (postingCommand) {
                try {
                    const result = this.journalEngineUseCases.postJournal(context.companyId, context.branchId, context.userId, postingCommand);
                    journal = this.journalEngineUseCases.getById(context.companyId, result.journalId);
                }
                catch (error) {
                    if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                        throw error;
                    }
                    journal = this.journalEngineUseCases.getBySource(context.companyId, {
                        sourceType: 'PURCHASE_RETURN',
                        sourceId: header.id,
                        sourceVersion,
                    }) || this.journalEngineUseCases.getBySource(context.companyId, {
                        sourceType: 'PURCHASE_RETURN',
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
    async cancelPurchaseReturn(context, input) {
        const documentId = this.normalizeRequired(input.documentId, 'Purchase return id is required');
        const reverseDate = this.normalizeDate(input.reverseDate, 'Reverse date is required');
        const purchaseReturn = this.requireDocument(context.companyId, context.branchId, documentId, 'PURCHASE_RETURN');
        const header = purchaseReturn.header;
        const sourceVersion = Number(header.version || 1) + 1;
        const stockPosted = this.repository.hasStockLedgerPosting(context.companyId, 'PURCHASE_RETURN', header.id, false);
        const stockAlreadyReversed = this.repository.hasStockLedgerPosting(context.companyId, 'PURCHASE_RETURN', header.id, true);
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
            this.repository.saveDocumentStatus(context.companyId, context.branchId, header.id, 'CANCELLED', context.userId, new Date().toISOString());
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
            this.stockLedgerService.reverse(context, 'PURCHASE_RETURN', header.id, reverseDate);
        }
        if (originalJournal && !reversalJournal) {
            try {
                const result = this.journalEngineUseCases.reverseJournal(context.companyId, context.userId, {
                    companyId: context.companyId,
                    journalId: originalJournal.id,
                    reverseDate,
                    sourceType: 'PURCHASE_RETURN_REVERSAL',
                    sourceId: header.id,
                    sourceNo: header.docNo,
                    sourceVersion,
                    referenceNo: header.referenceNo || header.docNo,
                    reason: input.reason || `Cancel purchase return ${header.docNo}`,
                    postedBy: context.userId,
                });
                reversalJournal = this.journalEngineUseCases.getById(context.companyId, result.reversalJournalId);
            }
            catch (error) {
                if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                    throw error;
                }
                reversalJournal = this.resolveExistingReversal(context.companyId, this.journalEngineUseCases.getById(context.companyId, originalJournal.id), header.reversalJournalId);
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
    getPurchaseReturnPostingStatus(context, documentId) {
        const purchaseReturn = this.requireDocument(context.companyId, context.branchId, documentId, 'PURCHASE_RETURN');
        const header = purchaseReturn.header;
        const sourceVersion = Number(header.version || 1) + 1;
        const journal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const reversal = this.resolveExistingReversal(context.companyId, journal, header.reversalJournalId);
        const stockPosted = this.repository.hasStockLedgerPosting(context.companyId, 'PURCHASE_RETURN', header.id, false);
        const stockReversed = this.repository.hasStockLedgerPosting(context.companyId, 'PURCHASE_RETURN', header.id, true);
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
    convertSourceToTarget(context, sourceDocumentId, sourceDocType, targetDocType) {
        const source = this.requireDocument(context.companyId, context.branchId, sourceDocumentId, sourceDocType);
        if (source.header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled document cannot be converted', {
                messageKey: 'validation.purchase_operations.conversion.cancelled_source',
                details: { sourceDocumentId, sourceDocType, targetDocType },
            });
        }
        if (this.requiresVendor(targetDocType) && !this.normalizeNullable(source.header.vendorId)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Vendor is required for conversion target document', {
                messageKey: 'validation.purchase_operations.vendor_required',
                details: { sourceDocumentId, sourceDocType, targetDocType },
            });
        }
        const convertedMap = this.getActiveConvertedQtyBySourceLine(context.companyId, context.branchId, source.header.id, targetDocType);
        const sourceLines = source.lines
            .map((line) => {
            const converted = convertedMap.get(line.id) || 0;
            const remaining = this.round(Math.max(0, line.qty - converted));
            return { line, remaining };
        })
            .filter((entry) => entry.remaining > EPSILON);
        if (!sourceLines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Source document has no remaining quantity for conversion', {
                messageKey: 'validation.purchase_operations.conversion.no_remaining_qty',
                details: { sourceDocumentId, sourceDocType, targetDocType },
            });
        }
        const now = new Date().toISOString();
        const targetId = this.repository.nextIdentity();
        const targetLines = sourceLines.map((entry, index) => this.mapSourceLineToTarget(index + 1, entry.line, entry.remaining, now));
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
                docType: targetDocType,
                docNo: this.repository.nextDocumentNo(context.companyId, context.branchId, targetDocType),
                docDate: source.header.docDate,
                status: 'DRAFT',
                vendorId: source.header.vendorId,
                warehouseId: source.header.warehouseId,
                currencyCode: source.header.currencyCode,
                currencyRate: source.header.currencyRate,
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                taxableAmount: totals.taxableAmount,
                vatAmount: totals.vatAmount,
                totalAmount: totals.totalAmount,
                referenceNo: source.header.docNo,
                remarks: source.header.remarks,
                sourceDocType,
                sourceDocId: source.header.id,
                createdBy: context.userId,
                approvedBy: null,
                version: 1,
                createdAt: now,
                updatedAt: now,
                lines: targetLines,
            });
            const links = sourceLines.map((entry, index) => ({
                id: this.repository.nextIdentity(),
                companyId: context.companyId,
                branchId: context.branchId,
                sourceDocType,
                sourceDocId: source.header.id,
                sourceLineId: entry.line.id,
                targetDocType,
                targetDocId: targetId,
                targetLineId: targetLines[index].id,
                qty: entry.remaining,
                createdAt: now,
            }));
            this.repository.createLinks(links);
            if (source.header.status === 'DRAFT') {
                this.repository.saveDocumentStatus(context.companyId, context.branchId, source.header.id, 'CONFIRMED', context.userId, now);
            }
        });
        const target = this.requireDocument(context.companyId, context.branchId, targetId, targetDocType);
        return {
            sourceDocumentId: source.header.id,
            targetDocumentId: target.header.id,
            targetDocType,
            targetDocNo: target.header.docNo,
        };
    }
    createDocument(context, docType, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const userId = this.normalizeRequired(context.userId, 'User id is required');
        const docDate = this.normalizeDate(input.docDate, 'Document date is required');
        const vendorId = this.normalizeNullable(input.vendorId);
        if (this.requiresVendor(docType)) {
            this.ensureVendor(this.normalizeRequired(vendorId, 'Vendor id is required'));
        }
        else if (vendorId) {
            this.ensureVendor(vendorId);
        }
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
            vendorId,
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
        }));
    }
    updateDocument(context, docType, input) {
        const documentId = this.normalizeRequired(input.id, 'Document id is required');
        const current = this.requireDocument(context.companyId, context.branchId, documentId, docType);
        if (current.header.status !== 'DRAFT') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Only draft documents can be updated', {
                messageKey: 'error.purchase_operations.update.not_draft',
                details: { documentId, status: current.header.status },
            });
        }
        const docDate = this.normalizeDate(input.docDate, 'Document date is required');
        const vendorId = this.normalizeNullable(input.vendorId ?? current.header.vendorId);
        if (this.requiresVendor(docType)) {
            this.ensureVendor(this.normalizeRequired(vendorId, 'Vendor id is required'));
        }
        else if (vendorId) {
            this.ensureVendor(vendorId);
        }
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
            vendorId,
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
    getDocument(context, docType, documentId) {
        return this.requireDocument(context.companyId, context.branchId, documentId, docType);
    }
    prepareInvoiceDtoFromDocument(document, quantitySelector) {
        const lines = [];
        for (const line of document.lines) {
            const qty = this.round(quantitySelector(line));
            if (qty <= EPSILON)
                continue;
            lines.push(this.mapLineForInvoice(line, qty));
        }
        if (!lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'No quantity available for invoice preparation', {
                messageKey: 'validation.purchase_operations.invoice_preparation.no_qty',
                details: { sourceDocId: document.header.id, sourceDocType: document.header.docType },
            });
        }
        return {
            sourceDocType: document.header.docType,
            sourceDocId: document.header.id,
            sourceDocNo: document.header.docNo,
            vendorId: document.header.vendorId,
            currencyCode: document.header.currencyCode,
            currencyRate: document.header.currencyRate,
            warehouseId: document.header.warehouseId,
            lines,
        };
    }
    mapLineForInvoice(line, qty) {
        const sourceQty = this.round(line.qty);
        const ratio = sourceQty > EPSILON ? qty / sourceQty : 0;
        return {
            sourceLineId: line.id,
            lineType: line.lineType,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
            qty,
            unitPrice: this.round(line.unitPrice),
            discountAmount: this.round(line.discountAmount * ratio),
            taxableAmount: this.round(line.taxableAmount * ratio),
            vatAmount: this.round(line.vatAmount * ratio),
            lineTotal: this.round(line.lineTotal * ratio),
            unitCost: line.unitCost,
            expenseTypeId: line.expenseTypeId,
            vehicleId: line.vehicleId,
            projectId: line.projectId,
            costCenterId: line.costCenterId,
        };
    }
    assertCanPost(header) {
        if (header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled document cannot be posted', {
                messageKey: 'validation.purchase_operations.post.cancelled',
                details: { documentId: header.id, docType: header.docType },
            });
        }
    }
    validatePostingLines(docType, lines, documentWarehouseId) {
        this.validateDraftLines(docType, lines, documentWarehouseId);
    }
    validateDraftLines(docType, lines, documentWarehouseId) {
        if (!lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Document must contain at least one line', {
                messageKey: 'validation.purchase_operations.lines_required',
                details: { docType },
            });
        }
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            const lineNo = index + 1;
            if (this.round(line.qty) <= EPSILON) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: quantity must be greater than zero`, {
                    messageKey: 'validation.purchase_operations.qty_positive',
                    details: { lineNo },
                });
            }
            if (this.round(line.unitPrice) < -EPSILON) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: unit price cannot be negative`, {
                    messageKey: 'validation.purchase_operations.price_non_negative',
                    details: { lineNo },
                });
            }
            if (this.round(line.discountAmount) < -EPSILON) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: discount cannot be negative`, {
                    messageKey: 'validation.purchase_operations.discount_non_negative',
                    details: { lineNo },
                });
            }
            if (this.round(line.lineSubtotal) < -EPSILON || this.round(line.taxableAmount) < -EPSILON || this.round(line.lineTotal) < -EPSILON) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: line totals must be non-negative`, {
                    messageKey: 'validation.purchase_operations.line_totals_invalid',
                    details: { lineNo },
                });
            }
            const expectedLineTotal = this.round(line.taxableAmount + line.vatAmount);
            if (Math.abs(expectedLineTotal - this.round(line.lineTotal)) > 0.02) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: line total mismatch`, {
                    messageKey: 'validation.purchase_operations.line_totals_invalid',
                    details: { lineNo, expectedLineTotal, lineTotal: line.lineTotal },
                });
            }
            const isInventoryLine = line.lineType === 'INVENTORY';
            const itemId = this.normalizeNullable(line.itemId);
            const item = itemId ? this.requireItem(itemId, lineNo) : null;
            const warehouseId = this.normalizeNullable(line.warehouseId || documentWarehouseId);
            if (warehouseId) {
                this.requireWarehouse(warehouseId, lineNo);
            }
            if (isInventoryLine && !item) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: item is required`, {
                    messageKey: 'validation.purchase_operations.item_required',
                    details: { lineNo, docType },
                });
            }
            if (docType === 'GOODS_RECEIPT_NOTE' || docType === 'PURCHASE_RETURN') {
                if (isInventoryLine && item && !item.isStockItem) {
                    throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: stock item is required`, {
                        messageKey: 'validation.purchase_operations.stock_item_required',
                        details: { lineNo, itemId, docType },
                    });
                }
                if (isInventoryLine && !warehouseId) {
                    throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: warehouse is required`, {
                        messageKey: 'validation.purchase_operations.warehouse_required',
                        details: { lineNo, docType },
                    });
                }
            }
        }
    }
    applyReceiptProgressByLinks(context, receiptId, sign) {
        const links = this.repository.listLinksByTarget(context.companyId, receiptId)
            .filter((link) => link.sourceDocType === 'PURCHASE_ORDER' && link.targetDocType === 'GOODS_RECEIPT_NOTE');
        if (!links.length)
            return;
        const touchedOrders = new Set();
        for (const link of links) {
            const delta = this.round(sign * Number(link.qty || 0));
            if (Math.abs(delta) <= EPSILON)
                continue;
            this.repository.updateLineProgress(link.sourceDocId, link.sourceLineId, { receivedQty: delta });
            touchedOrders.add(link.sourceDocId);
        }
        for (const orderId of touchedOrders) {
            this.refreshOrderCommitmentSnapshot(context, orderId);
        }
    }
    applyReturnProgressByLinks(context, purchaseReturnId, sign) {
        const returnLinks = this.repository.listLinksByTarget(context.companyId, purchaseReturnId)
            .filter((link) => link.sourceDocType === 'GOODS_RECEIPT_NOTE' && link.targetDocType === 'PURCHASE_RETURN');
        if (!returnLinks.length)
            return;
        const touchedOrders = new Set();
        const cachedOrderLinksByReceipt = new Map();
        for (const link of returnLinks) {
            const deltaReturn = this.round(sign * Number(link.qty || 0));
            if (Math.abs(deltaReturn) <= EPSILON)
                continue;
            this.repository.updateLineProgress(link.sourceDocId, link.sourceLineId, { returnedQty: deltaReturn });
            if (!cachedOrderLinksByReceipt.has(link.sourceDocId)) {
                const orderLinks = this.repository.listLinksByTarget(context.companyId, link.sourceDocId)
                    .filter((row) => row.sourceDocType === 'PURCHASE_ORDER' && row.targetDocType === 'GOODS_RECEIPT_NOTE');
                cachedOrderLinksByReceipt.set(link.sourceDocId, orderLinks);
            }
            const parentLinks = (cachedOrderLinksByReceipt.get(link.sourceDocId) || [])
                .filter((row) => row.targetLineId === link.sourceLineId);
            if (!parentLinks.length)
                continue;
            const totalLinkedQty = this.round(parentLinks.reduce((sum, row) => sum + Number(row.qty || 0), 0));
            let allocated = 0;
            for (let index = 0; index < parentLinks.length; index += 1) {
                const parent = parentLinks[index];
                const isLast = index === parentLinks.length - 1;
                const delta = isLast
                    ? this.round(deltaReturn - allocated)
                    : this.round(deltaReturn * (Number(parent.qty || 0) / (totalLinkedQty > EPSILON ? totalLinkedQty : 1)));
                allocated = this.round(allocated + delta);
                if (Math.abs(delta) <= EPSILON)
                    continue;
                this.repository.updateLineProgress(parent.sourceDocId, parent.sourceLineId, { returnedQty: delta });
                touchedOrders.add(parent.sourceDocId);
            }
        }
        for (const orderId of touchedOrders) {
            this.refreshOrderCommitmentSnapshot(context, orderId);
        }
    }
    refreshOrderCommitmentSnapshot(context, orderId) {
        const order = this.requireDocument(context.companyId, context.branchId, orderId, 'PURCHASE_ORDER');
        if (order.header.status === 'CANCELLED') {
            this.repository.replaceCommitmentsForOrder(context.companyId, context.branchId, orderId, []);
            return;
        }
        const now = new Date().toISOString();
        const commitments = [];
        for (const line of order.lines) {
            const warehouseId = this.normalizeNullable(line.warehouseId || order.header.warehouseId);
            const remaining = this.computeOrderRemainingQty(line);
            const itemId = this.normalizeNullable(line.itemId);
            const isInventoryLine = line.lineType === 'INVENTORY';
            const targetReserved = isInventoryLine && itemId && warehouseId && remaining > EPSILON ? remaining : 0;
            const delta = this.round(targetReserved - line.reservedQty);
            if (Math.abs(delta) > EPSILON) {
                this.repository.updateLineProgress(order.header.id, line.id, {
                    reservedQty: delta,
                });
            }
            if (itemId && warehouseId && targetReserved > EPSILON) {
                commitments.push({
                    id: this.repository.nextIdentity(),
                    companyId: context.companyId,
                    branchId: context.branchId,
                    purchaseOrderId: order.header.id,
                    purchaseOrderLineId: line.id,
                    itemId,
                    warehouseId,
                    expectedQty: targetReserved,
                    createdAt: now,
                });
            }
        }
        this.repository.replaceCommitmentsForOrder(context.companyId, context.branchId, order.header.id, commitments);
        const refreshedOrder = this.requireDocument(context.companyId, context.branchId, order.header.id, 'PURCHASE_ORDER');
        const summary = this.buildFulfillmentSummary(refreshedOrder);
        const nextStatus = this.mapOrderStatusFromFulfillment(refreshedOrder.header.status, summary.status);
        if (nextStatus !== refreshedOrder.header.status) {
            this.repository.saveDocumentStatus(context.companyId, context.branchId, order.header.id, nextStatus, context.userId, now);
        }
    }
    buildFulfillmentSummary(order) {
        const lines = order.lines.map((line) => this.mapLineRemaining(line));
        const totals = lines.reduce((acc, line) => {
            acc.totalQty += line.qty;
            acc.receivedQty += line.receivedQty;
            acc.returnedQty += line.returnedQty;
            acc.billedQty += line.billedQty;
            acc.reservedQty += line.reservedQty;
            acc.remainingQty += line.remainingQty;
            return acc;
        }, {
            totalQty: 0,
            receivedQty: 0,
            returnedQty: 0,
            billedQty: 0,
            reservedQty: 0,
            remainingQty: 0,
        });
        const status = this.computeFulfillmentStatus(order.header.status, lines);
        return {
            orderId: order.header.id,
            orderNo: order.header.docNo,
            status,
            totalQty: this.round(totals.totalQty),
            receivedQty: this.round(totals.receivedQty),
            returnedQty: this.round(totals.returnedQty),
            billedQty: this.round(totals.billedQty),
            reservedQty: this.round(totals.reservedQty),
            remainingQty: this.round(Math.max(0, totals.remainingQty)),
            lines,
        };
    }
    mapLineRemaining(line) {
        const remaining = this.computeOrderRemainingQty(line);
        let lineStatus = 'OPEN';
        const progressed = this.round(line.receivedQty + line.returnedQty + line.billedQty + line.reservedQty) > EPSILON;
        if (remaining <= EPSILON) {
            lineStatus = 'COMPLETED';
        }
        else if (progressed) {
            lineStatus = 'PARTIAL';
        }
        return {
            lineId: line.id,
            itemId: line.itemId,
            lineType: line.lineType,
            qty: this.round(line.qty),
            reservedQty: this.round(line.reservedQty),
            receivedQty: this.round(line.receivedQty),
            returnedQty: this.round(line.returnedQty),
            billedQty: this.round(line.billedQty),
            remainingQty: this.round(Math.max(0, remaining)),
            lineStatus,
        };
    }
    computeFulfillmentStatus(orderStatus, lines) {
        if (orderStatus === 'CANCELLED')
            return 'CANCELLED';
        if (!lines.length)
            return 'OPEN';
        if (lines.every((line) => line.remainingQty <= EPSILON))
            return 'COMPLETED';
        const hasProgress = lines.some((line) => line.lineStatus === 'PARTIAL' || line.lineStatus === 'COMPLETED' || line.reservedQty > EPSILON);
        return hasProgress ? 'PARTIAL' : 'OPEN';
    }
    mapOrderStatusFromFulfillment(currentStatus, fulfillmentStatus) {
        if (currentStatus === 'CANCELLED')
            return 'CANCELLED';
        if (fulfillmentStatus === 'COMPLETED')
            return 'COMPLETED';
        if (fulfillmentStatus === 'PARTIAL')
            return 'PARTIAL';
        if (currentStatus === 'DRAFT')
            return 'DRAFT';
        return 'CONFIRMED';
    }
    computeOrderRemainingQty(line) {
        return this.round(Math.max(0, line.qty - line.receivedQty - line.returnedQty - line.billedQty));
    }
    assertNoActiveReturnsForReceipt(companyId, branchId, receiptId) {
        const links = this.repository.listLinksBySource(companyId, receiptId)
            .filter((link) => link.sourceDocType === 'GOODS_RECEIPT_NOTE' && link.targetDocType === 'PURCHASE_RETURN');
        if (!links.length)
            return;
        for (const link of links) {
            const targetHeader = this.repository.getDocumentHeaderById(companyId, branchId, link.targetDocId);
            if (!targetHeader)
                continue;
            if (targetHeader.status !== 'CANCELLED') {
                throw new errors_1.DomainError('INVALID_TRANSITION', 'Receipt note with active purchase return cannot be cancelled', {
                    messageKey: 'validation.purchase_operations.receipt.cancel.has_returns',
                    details: {
                        receiptId,
                        purchaseReturnId: targetHeader.id,
                        purchaseReturnStatus: targetHeader.status,
                    },
                });
            }
        }
    }
    getActiveConvertedQtyBySourceLine(companyId, branchId, sourceDocId, targetDocType) {
        const links = this.repository.listLinksBySource(companyId, sourceDocId)
            .filter((link) => link.targetDocType === targetDocType);
        const convertedBySource = new Map();
        for (const link of links) {
            const targetHeader = this.repository.getDocumentHeaderById(companyId, branchId, link.targetDocId);
            if (!targetHeader || targetHeader.status === 'CANCELLED')
                continue;
            const current = convertedBySource.get(link.sourceLineId) || 0;
            convertedBySource.set(link.sourceLineId, this.round(current + Number(link.qty || 0)));
        }
        return convertedBySource;
    }
    assertSelectedLinesExist(selected, availableLineIds, message) {
        if (!selected.size)
            return;
        const available = new Set(availableLineIds);
        for (const sourceLineId of selected.keys()) {
            if (!available.has(sourceLineId)) {
                throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                    messageKey: 'validation.purchase_operations.conversion.line_invalid',
                    details: { sourceLineId },
                });
            }
        }
    }
    mapSourceLineToTarget(lineNo, sourceLine, qty, now) {
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
            lineType: sourceLine.lineType,
            warehouseId: sourceLine.warehouseId,
            qty: normalizedQty,
            receivedQty: 0,
            returnedQty: 0,
            billedQty: 0,
            reservedQty: 0,
            unitPrice: this.round(sourceLine.unitPrice),
            discountAmount,
            lineSubtotal,
            taxableAmount,
            vatAmount,
            lineTotal,
            unitCost: sourceLine.unitCost !== null ? this.round(sourceLine.unitCost) : null,
            expenseTypeId: sourceLine.expenseTypeId,
            vehicleId: sourceLine.vehicleId,
            projectId: sourceLine.projectId,
            costCenterId: sourceLine.costCenterId,
            partnerId: sourceLine.partnerId,
            remarks: sourceLine.remarks,
            createdAt: now,
            updatedAt: now,
        };
    }
    normalizeSelectedLines(input) {
        const map = new Map();
        for (const row of input || []) {
            const lineId = this.normalizeRequired(row.sourceLineId, 'Source line id is required');
            const qty = this.round(Number(row.qty || 0));
            if (qty <= EPSILON) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Selected quantity must be greater than zero', {
                    messageKey: 'validation.purchase_operations.qty_positive',
                    details: { sourceLineId: lineId, qty: row.qty },
                });
            }
            const existing = map.get(lineId) || 0;
            map.set(lineId, this.round(existing + qty));
        }
        return map;
    }
    normalizeInputLines(inputLines, nowIso) {
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
            const lineTypeRaw = String(line.lineType || '').trim().toUpperCase();
            const lineType = lineTypeRaw === 'EXPENSE'
                ? 'EXPENSE'
                : lineTypeRaw === 'SERVICE'
                    ? 'SERVICE'
                    : 'INVENTORY';
            return {
                id: this.normalizeNullable(line.id) || this.repository.nextIdentity(),
                lineNo: index + 1,
                itemId: this.normalizeNullable(line.itemId),
                lineType,
                warehouseId: this.normalizeNullable(line.warehouseId),
                qty,
                receivedQty: 0,
                returnedQty: 0,
                billedQty: 0,
                reservedQty: 0,
                unitPrice,
                discountAmount,
                lineSubtotal,
                taxableAmount,
                vatAmount,
                lineTotal,
                unitCost,
                expenseTypeId: this.normalizeNullable(line.expenseTypeId),
                vehicleId: this.normalizeNullable(line.vehicleId),
                projectId: this.normalizeNullable(line.projectId),
                costCenterId: this.normalizeNullable(line.costCenterId),
                partnerId: this.normalizeNullable(line.partnerId),
                remarks: this.normalizeNullable(line.remarks),
                createdAt: nowIso,
                updatedAt: nowIso,
            };
        });
    }
    resolveDocumentTotals(lines, overrides) {
        const computed = {
            subtotal: this.round(lines.reduce((sum, line) => sum + Number(line.lineSubtotal || 0), 0)),
            discountAmount: this.round(lines.reduce((sum, line) => sum + Number(line.discountAmount || 0), 0)),
            taxableAmount: this.round(lines.reduce((sum, line) => sum + Number(line.taxableAmount || 0), 0)),
            vatAmount: this.round(lines.reduce((sum, line) => sum + Number(line.vatAmount || 0), 0)),
            totalAmount: this.round(lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0)),
        };
        const assertMatch = (field, provided) => {
            if (provided === null || provided === undefined || String(provided).trim() === '')
                return;
            const numeric = this.round(Number(provided));
            if (Math.abs(numeric - computed[field]) > 0.02) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Document ${field} does not match line totals`, {
                    messageKey: 'validation.purchase_operations.header_totals_mismatch',
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
    requiresVendor(docType) {
        return docType !== 'PURCHASE_REQUEST';
    }
    ensureVendor(vendorId) {
        const vendor = this.repository.getVendorById(vendorId);
        if (!vendor || !vendor.isActive) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Vendor was not found', {
                messageKey: 'validation.purchase_operations.vendor_required',
                details: { vendorId },
            });
        }
    }
    requireItem(itemId, lineNo) {
        const item = this.repository.getItemById(itemId);
        if (!item || !item.isActive) {
            throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: item is invalid`, {
                messageKey: 'validation.purchase_operations.item_required',
                details: { lineNo, itemId },
            });
        }
        return item;
    }
    requireWarehouse(warehouseId, lineNo) {
        const warehouse = this.repository.getWarehouseById(warehouseId);
        if (!warehouse || !warehouse.isActive) {
            throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${lineNo}: warehouse is invalid`, {
                messageKey: 'validation.purchase_operations.warehouse_required',
                details: { lineNo, warehouseId },
            });
        }
    }
    resolveOriginalJournal(companyId, header, sourceVersion) {
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
    resolveExistingReversal(companyId, originalJournal, fallbackReversalJournalId) {
        if (originalJournal?.reversedJournalId) {
            return this.journalEngineUseCases.getById(companyId, originalJournal.reversedJournalId);
        }
        if (fallbackReversalJournalId) {
            return this.journalEngineUseCases.getById(companyId, fallbackReversalJournalId);
        }
        return null;
    }
    requireDocument(companyId, branchId, documentId, expectedDocType) {
        const normalizedId = this.normalizeRequired(documentId, 'Document id is required');
        const document = this.repository.getDocumentById(companyId, branchId, normalizedId);
        if (!document) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', 'Purchase document was not found', {
                messageKey: 'error.purchase_operations.document_not_found',
                details: { documentId: normalizedId },
            });
        }
        if (expectedDocType && document.header.docType !== expectedDocType) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Document type mismatch', {
                messageKey: 'validation.purchase_operations.doc_type_mismatch',
                details: {
                    documentId: normalizedId,
                    expectedDocType,
                    actualDocType: document.header.docType,
                },
            });
        }
        return document;
    }
    normalizeDocTypeNullable(docType) {
        const normalized = String(docType || '').trim().toUpperCase();
        if (!normalized)
            return null;
        if (normalized === 'PURCHASE_RFQ')
            return 'PURCHASE_RFQ';
        if (normalized === 'PURCHASE_ORDER')
            return 'PURCHASE_ORDER';
        if (normalized === 'GOODS_RECEIPT_NOTE')
            return 'GOODS_RECEIPT_NOTE';
        if (normalized === 'PURCHASE_RETURN')
            return 'PURCHASE_RETURN';
        if (normalized === 'PURCHASE_REQUEST')
            return 'PURCHASE_REQUEST';
        throw new errors_1.DomainError('VALIDATION_ERROR', 'Unsupported source document type', {
            messageKey: 'validation.purchase_operations.doc_type_invalid',
            details: { docType },
        });
    }
    normalizeDate(value, errorMessage) {
        const normalized = String(value || '').trim().slice(0, 10);
        if (!normalized) {
            throw new errors_1.DomainError('VALIDATION_ERROR', errorMessage, {
                messageKey: 'validation.purchase_operations.date_required',
            });
        }
        return normalized;
    }
    normalizeRequired(value, errorMessage) {
        const normalized = String(value || '').trim();
        if (!normalized) {
            throw new errors_1.DomainError('VALIDATION_ERROR', errorMessage, {
                messageKey: 'error.validation',
            });
        }
        return normalized;
    }
    normalizeNullable(value) {
        const normalized = String(value || '').trim();
        return normalized || null;
    }
    toRate(value) {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric <= 0)
            return 1;
        return numeric;
    }
    round(value) {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
exports.PurchaseOperationsService = PurchaseOperationsService;
