"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEngineService = void 0;
const crypto_1 = require("crypto");
const errors_1 = require("../../domain/errors");
const JournalEntity_1 = require("../../domain/journalEngine/entities/JournalEntity");
const JournalLineEntity_1 = require("../../domain/journalEngine/entities/JournalLineEntity");
const JournalPostingValidationService_1 = require("../../domain/journalEngine/services/JournalPostingValidationService");
const JournalStatus_1 = require("../../domain/journalEngine/types/JournalStatus");
class JournalEngineService {
    constructor(deps) {
        this.deps = deps;
        this.validationService = new JournalPostingValidationService_1.JournalPostingValidationService(deps.accountLookupRepo, deps.fiscalPeriodRepo, deps.postingRegistryRepo);
    }
    previewValidation(command) {
        return this.validationService.validate(this.normalizePostingCommand(command));
    }
    postJournal(command) {
        const normalized = this.normalizePostingCommand(command);
        const validation = this.validationService.validate(normalized);
        if (!validation.isValid || !validation.fiscalPeriodId) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Journal posting validation failed', {
                messageKey: 'error.journal.post.validation_failed',
                validation,
            });
        }
        try {
            return this.runInTransaction(() => {
                const duplicate = this.deps.postingRegistryRepo.findBySource(normalized.companyId, normalized.sourceType, normalized.sourceId, normalized.sourceVersion || 1);
                if (duplicate) {
                    throw new errors_1.DomainError('ERR_SOURCE_ALREADY_POSTED', 'Source document version has already been posted', {
                        messageKey: 'error.journal.source.already_posted',
                        duplicate,
                    });
                }
                const now = new Date().toISOString();
                const journalId = this.deps.journalsRepo.nextIdentity();
                const journalNo = this.deps.journalsRepo.nextJournalNo(normalized.companyId, normalized.journalDate);
                const journalLines = this.toJournalLineEntities(journalId, normalized.lines, normalized.branchId, normalized.exchangeRate, now);
                const journal = JournalEntity_1.JournalEntity.create({
                    id: journalId,
                    companyId: normalized.companyId,
                    branchId: normalized.branchId,
                    journalNo,
                    journalDate: normalized.journalDate,
                    fiscalPeriodId: validation.fiscalPeriodId,
                    sourceType: normalized.sourceType,
                    sourceId: normalized.sourceId,
                    sourceNo: normalized.sourceNo || null,
                    sourceVersion: normalized.sourceVersion || 1,
                    referenceNo: normalized.referenceNo || null,
                    description: normalized.description || null,
                    status: JournalStatus_1.JournalStatus.POSTED,
                    currencyCode: normalized.currencyCode,
                    exchangeRate: normalized.exchangeRate,
                    totalDebit: validation.totals.totalDebit,
                    totalCredit: validation.totals.totalCredit,
                    postedBy: normalized.postedBy,
                    postedAt: now,
                    reversedJournalId: null,
                    createdAt: now,
                    updatedAt: now,
                    lines: journalLines,
                });
                this.deps.journalsRepo.insert(journal);
                this.deps.journalLinesRepo.insertMany(journalLines);
                const postingRegistryId = this.deps.postingRegistryRepo.nextIdentity();
                this.deps.postingRegistryRepo.insert({
                    id: postingRegistryId,
                    companyId: normalized.companyId,
                    sourceType: normalized.sourceType,
                    sourceId: normalized.sourceId,
                    sourceVersion: normalized.sourceVersion || 1,
                    journalId,
                    postingHash: this.computePostingHash(normalized),
                    createdAt: now,
                });
                return {
                    journalId,
                    journalNo,
                    status: JournalStatus_1.JournalStatus.POSTED,
                    fiscalPeriodId: validation.fiscalPeriodId,
                    totals: {
                        totalDebit: validation.totals.totalDebit,
                        totalCredit: validation.totals.totalCredit,
                    },
                    postingRegistryId,
                };
            });
        }
        catch (error) {
            if (String(error?.message || '').includes('UNIQUE constraint failed: posting_registry')) {
                throw new errors_1.DomainError('ERR_SOURCE_ALREADY_POSTED', 'Source document version has already been posted', {
                    messageKey: 'error.journal.source.already_posted',
                    details: error?.message || null,
                });
            }
            throw error;
        }
    }
    reverseJournal(command) {
        const normalized = this.normalizeReverseCommand(command);
        const original = this.getById(normalized.companyId, normalized.journalId);
        if (!original) {
            throw new errors_1.DomainError('ERR_JOURNAL_NOT_FOUND', `Journal ${normalized.journalId} was not found`, {
                messageKey: 'error.journal.not_found',
            });
        }
        if (original.status !== JournalStatus_1.JournalStatus.POSTED) {
            throw new errors_1.DomainError('ERR_JOURNAL_NOT_POSTED', 'Only posted journals can be reversed', {
                messageKey: 'error.journal.reverse.not_posted',
            });
        }
        if (original.reversedJournalId) {
            throw new errors_1.DomainError('ERR_JOURNAL_ALREADY_REVERSED', 'Journal already has a reversing entry', {
                messageKey: 'error.journal.reverse.already_reversed',
                details: {
                    reversedJournalId: original.reversedJournalId,
                },
            });
        }
        const reversalSourceType = String(normalized.sourceType || `${original.sourceType}_REVERSAL`).trim().toUpperCase();
        const reversalSourceId = String(normalized.sourceId || original.id).trim();
        const reversalSourceVersion = Number(normalized.sourceVersion || 1);
        const periodId = this.deps.fiscalPeriodRepo.resolveOpenPeriodId(normalized.companyId, normalized.reverseDate);
        if (!periodId) {
            throw new errors_1.DomainError('ERR_FISCAL_PERIOD_NOT_OPEN', 'Fiscal period is not open for reversal date', {
                messageKey: 'error.journal.period.closed',
            });
        }
        const reverseLinesInput = original.lines.map((line) => ({
            lineNo: line.lineNo,
            accountId: line.accountId,
            description: line.description,
            debit: line.credit,
            credit: line.debit,
            currencyCode: line.currencyCode,
            exchangeRate: line.exchangeRate,
            baseDebit: line.baseCredit,
            baseCredit: line.baseDebit,
            branchId: line.branchId,
            costCenterId: line.costCenterId,
            expenseTypeId: line.expenseTypeId,
            vehicleId: line.vehicleId,
            partnerId: line.partnerId,
            projectId: line.projectId,
            itemId: line.itemId,
            warehouseId: line.warehouseId,
        }));
        const validation = this.validationService.validate({
            companyId: normalized.companyId,
            branchId: original.branchId,
            journalDate: normalized.reverseDate,
            fiscalPeriodId: periodId,
            sourceType: reversalSourceType,
            sourceId: reversalSourceId,
            sourceNo: normalized.sourceNo || original.journalNo,
            sourceVersion: reversalSourceVersion,
            referenceNo: normalized.referenceNo || original.referenceNo || original.journalNo,
            description: normalized.reason || `Auto reversal for ${original.journalNo}`,
            currencyCode: original.currencyCode,
            exchangeRate: original.exchangeRate,
            totalDebit: original.totalCredit,
            totalCredit: original.totalDebit,
            postedBy: normalized.postedBy,
            lines: reverseLinesInput,
        });
        if (!validation.isValid || !validation.fiscalPeriodId) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Journal reversal validation failed', {
                messageKey: 'error.journal.reverse.validation_failed',
                validation,
            });
        }
        try {
            return this.runInTransaction(() => {
                const now = new Date().toISOString();
                const reversalJournalId = this.deps.journalsRepo.nextIdentity();
                const reversalJournalNo = this.deps.journalsRepo.nextJournalNo(normalized.companyId, normalized.reverseDate);
                const reversalLines = this.toJournalLineEntities(reversalJournalId, reverseLinesInput, original.branchId, original.exchangeRate, now);
                const reversingJournal = JournalEntity_1.JournalEntity.create({
                    id: reversalJournalId,
                    companyId: normalized.companyId,
                    branchId: original.branchId,
                    journalNo: reversalJournalNo,
                    journalDate: normalized.reverseDate,
                    fiscalPeriodId: validation.fiscalPeriodId,
                    sourceType: reversalSourceType,
                    sourceId: reversalSourceId,
                    sourceNo: normalized.sourceNo || original.journalNo,
                    sourceVersion: reversalSourceVersion,
                    referenceNo: normalized.referenceNo || original.referenceNo || original.journalNo,
                    description: normalized.reason || `Auto reversal for ${original.journalNo}`,
                    status: JournalStatus_1.JournalStatus.POSTED,
                    currencyCode: original.currencyCode,
                    exchangeRate: original.exchangeRate,
                    totalDebit: validation.totals.totalDebit,
                    totalCredit: validation.totals.totalCredit,
                    postedBy: normalized.postedBy,
                    postedAt: now,
                    reversedJournalId: original.id,
                    createdAt: now,
                    updatedAt: now,
                    lines: reversalLines,
                });
                this.deps.journalsRepo.insert(reversingJournal);
                this.deps.journalLinesRepo.insertMany(reversalLines);
                this.deps.postingRegistryRepo.insert({
                    id: this.deps.postingRegistryRepo.nextIdentity(),
                    companyId: normalized.companyId,
                    sourceType: reversalSourceType,
                    sourceId: reversalSourceId,
                    sourceVersion: reversalSourceVersion,
                    journalId: reversalJournalId,
                    postingHash: this.computePostingHash({
                        companyId: normalized.companyId,
                        branchId: original.branchId,
                        journalDate: normalized.reverseDate,
                        fiscalPeriodId: validation.fiscalPeriodId,
                        sourceType: reversalSourceType,
                        sourceId: reversalSourceId,
                        sourceNo: normalized.sourceNo || original.journalNo,
                        sourceVersion: reversalSourceVersion,
                        referenceNo: normalized.referenceNo || original.referenceNo || original.journalNo,
                        description: normalized.reason || `Auto reversal for ${original.journalNo}`,
                        currencyCode: original.currencyCode,
                        exchangeRate: original.exchangeRate,
                        totalDebit: validation.totals.totalDebit,
                        totalCredit: validation.totals.totalCredit,
                        postedBy: normalized.postedBy,
                        lines: reverseLinesInput,
                    }),
                    createdAt: now,
                });
                this.deps.journalsRepo.updateReversalLink(normalized.companyId, original.id, reversalJournalId, JournalStatus_1.JournalStatus.REVERSED);
                return {
                    originalJournalId: original.id,
                    reversalJournalId,
                    reversalJournalNo,
                    status: JournalStatus_1.JournalStatus.REVERSED,
                };
            });
        }
        catch (error) {
            if (String(error?.message || '').includes('UNIQUE constraint failed: posting_registry')) {
                throw new errors_1.DomainError('ERR_SOURCE_ALREADY_POSTED', 'Reversal source version has already been posted', {
                    messageKey: 'error.journal.source.already_posted',
                    details: error?.message || null,
                });
            }
            throw error;
        }
    }
    getBySource(companyId, sourceType, sourceId, sourceVersion) {
        const header = this.deps.journalsRepo.getBySource(companyId, sourceType, sourceId, sourceVersion);
        if (!header)
            return null;
        const lines = this.deps.journalLinesRepo.listByJournalId(header.id);
        return JournalEntity_1.JournalEntity.create({
            ...header.toJSON(),
            lines,
        });
    }
    getById(companyId, journalId) {
        const header = this.deps.journalsRepo.getById(companyId, journalId);
        if (!header)
            return null;
        const lines = this.deps.journalLinesRepo.listByJournalId(header.id);
        return JournalEntity_1.JournalEntity.create({
            ...header.toJSON(),
            lines,
        });
    }
    toJournalLineEntities(journalId, lines, defaultBranchId, defaultExchangeRate, nowIso) {
        return lines.map((line, index) => {
            const exchangeRate = Number(line.exchangeRate ?? (defaultExchangeRate || 1));
            const debit = Number(line.debit || 0);
            const credit = Number(line.credit || 0);
            const baseDebit = Number(line.baseDebit ?? debit * exchangeRate);
            const baseCredit = Number(line.baseCredit ?? credit * exchangeRate);
            const lineNo = Number(line.lineNo || index + 1);
            return JournalLineEntity_1.JournalLineEntity.create({
                id: this.deps.journalLinesRepo.nextIdentity(),
                journalId,
                lineNo,
                accountId: line.accountId,
                description: line.description || null,
                debit,
                credit,
                currencyCode: String(line.currencyCode || 'ILS').trim().toUpperCase(),
                exchangeRate,
                baseDebit,
                baseCredit,
                branchId: line.branchId || defaultBranchId || null,
                costCenterId: line.costCenterId || null,
                expenseTypeId: line.expenseTypeId || null,
                vehicleId: line.vehicleId || null,
                partnerId: line.partnerId || null,
                projectId: line.projectId || null,
                itemId: line.itemId || null,
                warehouseId: line.warehouseId || null,
                createdAt: nowIso,
                updatedAt: nowIso,
            });
        });
    }
    computePostingHash(command) {
        const normalizedLines = [...(command.lines || [])]
            .map((line, index) => ({
            lineNo: Number(line.lineNo || index + 1),
            accountId: String(line.accountId || '').trim(),
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            baseDebit: Number(line.baseDebit ?? 0),
            baseCredit: Number(line.baseCredit ?? 0),
            currencyCode: String(line.currencyCode || command.currencyCode || 'ILS').trim().toUpperCase(),
            exchangeRate: Number(line.exchangeRate ?? command.exchangeRate ?? 1),
            branchId: line.branchId || null,
            costCenterId: line.costCenterId || null,
            expenseTypeId: line.expenseTypeId || null,
            vehicleId: line.vehicleId || null,
            partnerId: line.partnerId || null,
            projectId: line.projectId || null,
            itemId: line.itemId || null,
            warehouseId: line.warehouseId || null,
        }))
            .sort((a, b) => a.lineNo - b.lineNo);
        const payload = {
            companyId: command.companyId,
            branchId: command.branchId,
            journalDate: command.journalDate,
            sourceType: command.sourceType,
            sourceId: command.sourceId,
            sourceVersion: Number(command.sourceVersion || 1),
            sourceNo: command.sourceNo || null,
            referenceNo: command.referenceNo || null,
            description: command.description || null,
            currencyCode: command.currencyCode,
            exchangeRate: Number(command.exchangeRate || 1),
            lines: normalizedLines,
        };
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(payload))
            .digest('hex');
    }
    normalizePostingCommand(command) {
        const companyId = String(command.companyId || '').trim();
        const branchId = String(command.branchId || '').trim();
        const journalDate = String(command.journalDate || '').trim();
        const sourceType = String(command.sourceType || '').trim().toUpperCase();
        const sourceId = String(command.sourceId || '').trim();
        const postedBy = String(command.postedBy || '').trim();
        const currencyCode = String(command.currencyCode || 'ILS').trim().toUpperCase();
        if (!companyId)
            throw new errors_1.DomainError('ERR_JOURNAL_COMPANY_REQUIRED', 'Company id is required');
        if (!branchId)
            throw new errors_1.DomainError('ERR_JOURNAL_BRANCH_REQUIRED', 'Branch id is required');
        if (!journalDate)
            throw new errors_1.DomainError('ERR_JOURNAL_DATE_REQUIRED', 'Journal date is required');
        if (!sourceType)
            throw new errors_1.DomainError('ERR_JOURNAL_SOURCE_TYPE_REQUIRED', 'Source type is required');
        if (!sourceId)
            throw new errors_1.DomainError('ERR_JOURNAL_SOURCE_ID_REQUIRED', 'Source id is required');
        if (!postedBy)
            throw new errors_1.DomainError('ERR_JOURNAL_POSTED_BY_REQUIRED', 'Posted by is required');
        return {
            ...command,
            companyId,
            branchId,
            journalDate,
            sourceType,
            sourceId,
            sourceNo: command.sourceNo ? String(command.sourceNo).trim() : null,
            sourceVersion: Number(command.sourceVersion || 1),
            referenceNo: command.referenceNo ? String(command.referenceNo).trim() : null,
            description: command.description ? String(command.description).trim() : null,
            currencyCode,
            exchangeRate: Number(command.exchangeRate || 1),
            postedBy,
            lines: command.lines || [],
        };
    }
    normalizeReverseCommand(command) {
        const companyId = String(command.companyId || '').trim();
        const journalId = String(command.journalId || '').trim();
        const reverseDate = String(command.reverseDate || '').trim();
        const postedBy = String(command.postedBy || '').trim();
        if (!companyId)
            throw new errors_1.DomainError('ERR_JOURNAL_COMPANY_REQUIRED', 'Company id is required');
        if (!journalId)
            throw new errors_1.DomainError('ERR_JOURNAL_ID_REQUIRED', 'Journal id is required');
        if (!reverseDate)
            throw new errors_1.DomainError('ERR_JOURNAL_REVERSE_DATE_REQUIRED', 'Reverse date is required');
        if (!postedBy)
            throw new errors_1.DomainError('ERR_JOURNAL_POSTED_BY_REQUIRED', 'Posted by is required');
        return {
            ...command,
            companyId,
            journalId,
            reverseDate,
            sourceType: command.sourceType ? String(command.sourceType).trim().toUpperCase() : null,
            sourceId: command.sourceId ? String(command.sourceId).trim() : null,
            sourceNo: command.sourceNo ? String(command.sourceNo).trim() : null,
            sourceVersion: Number(command.sourceVersion || 1),
            referenceNo: command.referenceNo ? String(command.referenceNo).trim() : null,
            reason: command.reason ? String(command.reason).trim() : null,
            postedBy,
        };
    }
    runInTransaction(work) {
        const tx = this.deps.database.transaction(() => work());
        return tx();
    }
}
exports.JournalEngineService = JournalEngineService;
