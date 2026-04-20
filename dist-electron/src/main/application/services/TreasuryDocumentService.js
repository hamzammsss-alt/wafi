"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryDocumentService = void 0;
const errors_1 = require("../../domain/errors");
const TreasuryPostingBuilder_1 = require("./TreasuryPostingBuilder");
class TreasuryDocumentService {
    constructor(repository, postingBuilder, chequeLifecycleService, journalEngineUseCases) {
        this.repository = repository;
        this.postingBuilder = postingBuilder;
        this.chequeLifecycleService = chequeLifecycleService;
        this.journalEngineUseCases = journalEngineUseCases;
        this.repository.ensureSchema();
    }
    createDocument(context, input) {
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
        this.validateLines(companyId, docType, lines);
        const partnerId = this.normalizeNullable(input.partnerId);
        if (partnerId) {
            this.requirePartner(partnerId);
        }
        return this.repository.runInTransaction(() => {
            const created = this.repository.createDocument({
                id,
                companyId,
                branchId,
                docType,
                docNo: this.repository.nextDocumentNo(companyId, branchId, docType),
                docDate,
                status: 'DRAFT',
                partnerId,
                cashAccountId: this.normalizeNullable(input.cashAccountId),
                bankAccountId: this.normalizeNullable(input.bankAccountId),
                currencyCode,
                currencyRate,
                referenceNo: this.normalizeNullable(input.referenceNo),
                remarks: this.normalizeNullable(input.remarks),
                createdBy: this.normalizeRequired(input.createdBy || userId, 'Created by is required'),
                approvedBy: this.normalizeNullable(input.approvedBy),
                version: 1,
                createdAt: nowIso,
                updatedAt: nowIso,
                lines,
            });
            this.upsertChequeIfProvided(companyId, branchId, created, input.cheque || null, nowIso);
            const document = this.repository.getDocumentById(companyId, branchId, id);
            if (!document) {
                throw new errors_1.DomainError('INTERNAL_ERROR', 'Treasury document was not found after create', {
                    details: { documentId: id },
                });
            }
            return document;
        });
    }
    updateDocument(context, input) {
        const companyId = this.normalizeRequired(context.companyId, 'Company id is required');
        const branchId = this.normalizeRequired(context.branchId, 'Branch id is required');
        const documentId = this.normalizeRequired(input.id, 'Document id is required');
        const current = this.requireDocument(companyId, branchId, documentId);
        if (current.header.status !== 'DRAFT') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Only draft treasury documents can be updated', {
                messageKey: 'error.treasury_document.update.not_draft',
                details: { documentId, status: current.header.status },
            });
        }
        const docDate = this.normalizeDate(input.docDate, 'Document date is required');
        const currencyCode = this.repository.resolveCurrencyCode(input.currencyCode || current.header.currencyCode);
        const currencyRate = this.toRate(input.currencyRate ?? current.header.currencyRate);
        const nowIso = new Date().toISOString();
        const lines = this.normalizeInputLines(documentId, input.lines || [], nowIso);
        this.validateLines(companyId, current.header.docType, lines);
        const partnerId = this.normalizeNullable(input.partnerId ?? current.header.partnerId);
        if (partnerId) {
            this.requirePartner(partnerId);
        }
        return this.repository.runInTransaction(() => {
            const updated = this.repository.updateDocument({
                id: documentId,
                companyId,
                branchId,
                docDate,
                partnerId,
                cashAccountId: this.normalizeNullable(input.cashAccountId),
                bankAccountId: this.normalizeNullable(input.bankAccountId),
                currencyCode,
                currencyRate,
                referenceNo: this.normalizeNullable(input.referenceNo),
                remarks: this.normalizeNullable(input.remarks),
                approvedBy: this.normalizeNullable(input.approvedBy),
                updatedAt: nowIso,
                lines,
            });
            this.upsertChequeIfProvided(companyId, branchId, updated, input.cheque || null, nowIso);
            const document = this.repository.getDocumentById(companyId, branchId, documentId);
            if (!document) {
                throw new errors_1.DomainError('INTERNAL_ERROR', 'Treasury document was not found after update', {
                    details: { documentId },
                });
            }
            return document;
        });
    }
    getById(context, documentId) {
        return this.requireDocument(context.companyId, context.branchId, documentId);
    }
    async post(context, documentId) {
        const document = this.requireDocument(context.companyId, context.branchId, documentId);
        const header = document.header;
        this.assertCanPost(header);
        this.validateLines(context.companyId, header.docType, document.lines);
        this.validateControlReferences(header);
        const sourceVersion = Number(header.version || 1) + 1;
        let existingJournal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        if (existingJournal) {
            this.repository.savePostingState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                journalId: existingJournal.id,
                postedBy: context.userId,
                postedAt: new Date().toISOString(),
                nextStatus: 'POSTED',
            });
            return {
                documentId: header.id,
                sourceModule: TreasuryPostingBuilder_1.TREASURY_SOURCE_MODULE,
                sourceType: header.docType,
                sourceId: header.id,
                documentNo: header.docNo,
                status: 'ALREADY_POSTED',
                sourceVersion,
                journalId: existingJournal.id,
                journalNo: existingJournal.journalNo,
                chequeId: document.cheque?.id || null,
            };
        }
        const postingCommand = await this.postingBuilder.build({
            companyId: context.companyId,
            branchId: context.branchId,
            userId: context.userId,
            sourceVersion,
            header,
            lines: document.lines,
        });
        let journalId = '';
        let journalNo = '';
        try {
            const postResult = this.journalEngineUseCases.postJournal(context.companyId, context.branchId, context.userId, postingCommand);
            journalId = postResult.journalId;
            journalNo = postResult.journalNo;
        }
        catch (error) {
            if (String(error?.code || '') !== 'ERR_SOURCE_ALREADY_POSTED') {
                throw error;
            }
            const duplicate = this.journalEngineUseCases.getBySource(context.companyId, {
                sourceType: header.docType,
                sourceId: header.id,
                sourceVersion,
            }) || this.journalEngineUseCases.getBySource(context.companyId, {
                sourceType: header.docType,
                sourceId: header.id,
                sourceVersion: null,
            });
            if (!duplicate)
                throw error;
            existingJournal = duplicate;
            journalId = duplicate.id;
            journalNo = duplicate.journalNo;
        }
        const postingTime = new Date().toISOString();
        this.repository.runInTransaction(() => {
            this.repository.savePostingState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                journalId,
                postedBy: context.userId,
                postedAt: postingTime,
                nextStatus: 'POSTED',
            });
            const cheque = this.requireChequeForType(context.companyId, header.docType, header.id);
            if (cheque && header.docType === 'CHEQUE_RECEIPT') {
                this.chequeLifecycleService.receiveChequeFromDocument(context, cheque.id, header.docDate, journalId);
            }
            if (cheque && header.docType === 'CHEQUE_PAYMENT') {
                this.chequeLifecycleService.issueChequeFromDocument(context, cheque.id, header.docDate, journalId);
            }
        });
        return {
            documentId: header.id,
            sourceModule: TreasuryPostingBuilder_1.TREASURY_SOURCE_MODULE,
            sourceType: header.docType,
            sourceId: header.id,
            documentNo: header.docNo,
            status: existingJournal ? 'ALREADY_POSTED' : 'POSTED',
            sourceVersion,
            journalId,
            journalNo,
            chequeId: this.repository.getChequeByDocumentId(context.companyId, header.id)?.id || null,
        };
    }
    async reverse(context, input) {
        const documentId = this.normalizeRequired(input.documentId, 'Document id is required');
        const reverseDate = this.normalizeDate(input.reverseDate, 'Reverse date is required');
        const document = this.requireDocument(context.companyId, context.branchId, documentId);
        const header = document.header;
        const sourceVersion = Number(header.version || 1) + 1;
        const originalJournal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        if (!originalJournal) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Treasury document has not been posted yet', {
                messageKey: 'error.treasury_document.accounting.not_posted',
                details: { documentId: header.id },
            });
        }
        const existingReversal = this.resolveExistingReversal(context.companyId, originalJournal, header.reversalJournalId);
        if (existingReversal) {
            if (document.cheque && document.cheque.status !== 'CANCELLED') {
                await this.chequeLifecycleService.cancelCheque(context, {
                    chequeId: document.cheque.id,
                    date: reverseDate,
                    reason: input.reason || `Cancel cheque for ${header.docNo}`,
                });
            }
            this.repository.saveReversalState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                reversalJournalId: existingReversal.id,
                reversedBy: context.userId,
                reversedAt: header.reversedAt || new Date().toISOString(),
                nextStatus: 'CANCELLED',
            });
            return {
                documentId: header.id,
                sourceModule: TreasuryPostingBuilder_1.TREASURY_SOURCE_MODULE,
                sourceType: header.docType,
                sourceId: header.id,
                documentNo: header.docNo,
                status: 'ALREADY_REVERSED',
                originalJournalId: originalJournal.id,
                reversalJournalId: existingReversal.id,
                reversalJournalNo: existingReversal.journalNo,
                chequeId: document.cheque?.id || null,
            };
        }
        if (document.cheque && (document.cheque.status === 'CLEARED' || document.cheque.status === 'ISSUED_CLEARED')) {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cannot reverse treasury document after cheque cleared', {
                messageKey: 'validation.treasury_document.reverse.cheque_state',
                details: {
                    documentId: header.id,
                    chequeId: document.cheque.id,
                    chequeStatus: document.cheque.status,
                },
            });
        }
        const reverseResult = this.journalEngineUseCases.reverseJournal(context.companyId, context.userId, {
            companyId: context.companyId,
            journalId: originalJournal.id,
            reverseDate,
            sourceType: `${header.docType}_REVERSAL`,
            sourceId: header.id,
            sourceNo: header.docNo,
            sourceVersion,
            referenceNo: header.referenceNo || header.docNo,
            reason: input.reason || `Reverse treasury document ${header.docNo}`,
            postedBy: context.userId,
        });
        if (document.cheque && document.cheque.status !== 'CANCELLED') {
            await this.chequeLifecycleService.cancelCheque(context, {
                chequeId: document.cheque.id,
                date: reverseDate,
                reason: input.reason || `Cancel cheque for ${header.docNo}`,
            });
        }
        const now = new Date().toISOString();
        this.repository.runInTransaction(() => {
            this.repository.saveReversalState({
                companyId: context.companyId,
                branchId: context.branchId,
                documentId: header.id,
                reversalJournalId: reverseResult.reversalJournalId,
                reversedBy: context.userId,
                reversedAt: now,
                nextStatus: 'CANCELLED',
            });
        });
        return {
            documentId: header.id,
            sourceModule: TreasuryPostingBuilder_1.TREASURY_SOURCE_MODULE,
            sourceType: header.docType,
            sourceId: header.id,
            documentNo: header.docNo,
            status: 'REVERSED',
            originalJournalId: reverseResult.originalJournalId,
            reversalJournalId: reverseResult.reversalJournalId,
            reversalJournalNo: reverseResult.reversalJournalNo,
            chequeId: document.cheque?.id || null,
        };
    }
    getPostingStatus(context, documentId) {
        const document = this.requireDocument(context.companyId, context.branchId, documentId);
        const header = document.header;
        const sourceVersion = Number(header.version || 1) + 1;
        const journal = this.resolveOriginalJournal(context.companyId, header, sourceVersion);
        const reversal = this.resolveExistingReversal(context.companyId, journal, header.reversalJournalId);
        return {
            documentId: header.id,
            docType: header.docType,
            docNo: header.docNo || null,
            documentStatus: header.status,
            sourceVersion,
            isFinancialPosted: Boolean(journal),
            isFinancialReversed: Boolean(reversal),
            journalId: journal?.id || null,
            journalNo: journal?.journalNo || null,
            reversalJournalId: reversal?.id || null,
            reversalJournalNo: reversal?.journalNo || null,
            postedAt: header.postedAt || null,
            reversedAt: header.reversedAt || null,
            chequeId: document.cheque?.id || null,
            chequeNo: document.cheque?.chequeNo || null,
            chequeStatus: document.cheque?.status || null,
        };
    }
    requireDocument(companyId, branchId, documentId) {
        const normalizedId = this.normalizeRequired(documentId, 'Document id is required');
        const document = this.repository.getDocumentById(companyId, branchId, normalizedId);
        if (!document) {
            throw new errors_1.DomainError('DOCUMENT_NOT_FOUND', `Treasury document ${normalizedId} was not found`, {
                messageKey: 'error.treasury_document.not_found',
                details: { documentId: normalizedId },
            });
        }
        return document;
    }
    validateControlReferences(header) {
        if ((header.docType === 'CASH_RECEIPT' || header.docType === 'CASH_PAYMENT') && !this.normalizeNullable(header.cashAccountId)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Cash account is required for cash document', {
                messageKey: 'validation.treasury_document.cash_account_required',
                details: { documentId: header.id, docType: header.docType },
            });
        }
        if ((header.docType === 'BANK_RECEIPT' || header.docType === 'BANK_PAYMENT') && !this.normalizeNullable(header.bankAccountId)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Bank account is required for bank document', {
                messageKey: 'validation.treasury_document.bank_account_required',
                details: { documentId: header.id, docType: header.docType },
            });
        }
    }
    assertCanPost(header) {
        if (header.status === 'CANCELLED') {
            throw new errors_1.DomainError('INVALID_TRANSITION', 'Cancelled treasury document cannot be posted', {
                messageKey: 'error.treasury_document.post.cancelled_not_allowed',
                details: { documentId: header.id },
            });
        }
    }
    validateLines(companyId, docType, lines) {
        if (!lines.length) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Treasury document lines are required', {
                messageKey: 'validation.treasury_document.lines_required',
                details: { docType },
            });
        }
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            if (Number(line.amount || 0) <= 0) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${index + 1}: amount must be greater than zero`, {
                    messageKey: 'validation.treasury_document.amount_positive',
                    details: { lineNo: index + 1 },
                });
            }
            const accountState = this.repository.getAccountPostingState(companyId, line.accountId);
            if (!accountState.exists || !accountState.isActive || !accountState.isPosting) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Line ${index + 1}: account is invalid for posting`, {
                    messageKey: 'validation.treasury_document.account_posting_required',
                    details: {
                        lineNo: index + 1,
                        accountId: line.accountId,
                    },
                });
            }
        }
    }
    requirePartner(partnerId) {
        const partner = this.repository.getPartnerById(partnerId);
        if (!partner || !partner.isActive) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Partner was not found for treasury posting', {
                messageKey: 'validation.treasury_document.partner_required',
                details: { partnerId },
            });
        }
    }
    requireChequeForType(companyId, docType, documentId) {
        if (docType !== 'CHEQUE_RECEIPT' && docType !== 'CHEQUE_PAYMENT') {
            return null;
        }
        const cheque = this.repository.getChequeByDocumentId(companyId, documentId);
        if (!cheque) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Cheque details are required for cheque treasury document', {
                messageKey: 'validation.treasury_document.cheque_required',
                details: { documentId, docType },
            });
        }
        return cheque;
    }
    upsertChequeIfProvided(companyId, branchId, document, chequeInput, nowIso) {
        if (!this.isChequeDocument(document.header.docType) && !chequeInput) {
            return;
        }
        const existingCheque = this.repository.getChequeByDocumentId(companyId, document.header.id);
        if (!chequeInput && this.isChequeDocument(document.header.docType) && existingCheque) {
            return;
        }
        if (!chequeInput && this.isChequeDocument(document.header.docType) && !existingCheque) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Cheque information is required for cheque document', {
                messageKey: 'validation.treasury_document.cheque_required',
                details: { documentId: document.header.id, docType: document.header.docType },
            });
        }
        if (!chequeInput)
            return;
        const direction = document.header.docType === 'CHEQUE_RECEIPT' ? 'RECEIVED' : 'ISSUED';
        const totalLinesAmount = this.roundAmount(document.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0));
        this.repository.upsertDocumentCheque({
            id: chequeInput.id || existingCheque?.id || null,
            companyId,
            branchId,
            direction,
            documentId: document.header.id,
            partnerId: this.normalizeNullable(chequeInput.partnerId || document.header.partnerId),
            chequeNo: this.normalizeRequired(chequeInput.chequeNo, 'Cheque number is required'),
            chequeDate: this.normalizeDate(chequeInput.chequeDate, 'Cheque date is required'),
            dueDate: this.normalizeNullable(chequeInput.dueDate),
            amount: this.roundAmount(Number(chequeInput.amount ?? totalLinesAmount)),
            currencyCode: this.repository.resolveCurrencyCode(chequeInput.currencyCode || document.header.currencyCode),
            currencyRate: this.toRate(chequeInput.currencyRate ?? document.header.currencyRate),
            bankName: this.normalizeNullable(chequeInput.bankName),
            drawerName: this.normalizeNullable(chequeInput.drawerName),
            payeeName: this.normalizeNullable(chequeInput.payeeName),
            notes: this.normalizeNullable(chequeInput.notes),
            createdAt: nowIso,
            updatedAt: nowIso,
        });
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
    resolveExistingReversal(companyId, originalJournal, fallbackReversalId) {
        if (originalJournal?.reversedJournalId) {
            return this.journalEngineUseCases.getById(companyId, originalJournal.reversedJournalId);
        }
        if (fallbackReversalId) {
            return this.journalEngineUseCases.getById(companyId, fallbackReversalId);
        }
        return null;
    }
    normalizeInputLines(documentId, inputLines, nowIso) {
        return (inputLines || []).map((line, index) => ({
            id: this.normalizeNullable(line.id) || this.repository.nextIdentity(),
            documentId,
            lineNo: index + 1,
            accountId: this.normalizeRequired(line.accountId, `Line ${index + 1}: account is required`),
            amount: this.roundAmount(Number(line.amount || 0)),
            description: this.normalizeNullable(line.description),
            costCenterId: this.normalizeNullable(line.costCenterId),
            projectId: this.normalizeNullable(line.projectId),
            expenseTypeId: this.normalizeNullable(line.expenseTypeId),
            vehicleId: this.normalizeNullable(line.vehicleId),
            partnerId: this.normalizeNullable(line.partnerId),
            itemId: this.normalizeNullable(line.itemId),
            warehouseId: this.normalizeNullable(line.warehouseId),
            createdAt: nowIso,
            updatedAt: nowIso,
        }));
    }
    isChequeDocument(docType) {
        return docType === 'CHEQUE_RECEIPT' || docType === 'CHEQUE_PAYMENT';
    }
    normalizeDocType(docType) {
        const normalized = String(docType || '').trim().toUpperCase();
        if (normalized === 'CASH_PAYMENT')
            return 'CASH_PAYMENT';
        if (normalized === 'BANK_RECEIPT')
            return 'BANK_RECEIPT';
        if (normalized === 'BANK_PAYMENT')
            return 'BANK_PAYMENT';
        if (normalized === 'CHEQUE_RECEIPT')
            return 'CHEQUE_RECEIPT';
        if (normalized === 'CHEQUE_PAYMENT')
            return 'CHEQUE_PAYMENT';
        if (normalized === 'CASH_RECEIPT')
            return 'CASH_RECEIPT';
        throw new errors_1.DomainError('VALIDATION_ERROR', 'Unsupported treasury document type', {
            messageKey: 'validation.treasury_document.doc_type_required',
            details: { docType },
        });
    }
    normalizeDate(value, errorMessage) {
        const normalized = String(value || '').trim().slice(0, 10);
        if (!normalized) {
            throw new errors_1.DomainError('VALIDATION_ERROR', errorMessage, {
                messageKey: 'validation.treasury_document.date_required',
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
    roundAmount(value) {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
exports.TreasuryDocumentService = TreasuryDocumentService;
