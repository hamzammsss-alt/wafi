"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEngineUseCases = void 0;
const errors_1 = require("../../domain/errors");
class JournalEngineUseCases {
    constructor(journalEngine) {
        this.journalEngine = journalEngine;
    }
    postJournal(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const command = {
            companyId,
            branchId: String(input.branchId || authenticatedBranchId || '').trim(),
            journalDate: String(input.journalDate || '').trim(),
            fiscalPeriodId: input.fiscalPeriodId || null,
            sourceType: String(input.sourceType || '').trim(),
            sourceId: String(input.sourceId || '').trim(),
            sourceNo: input.sourceNo || null,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.referenceNo || null,
            description: input.description || null,
            currencyCode: String(input.currencyCode || 'ILS').trim().toUpperCase(),
            exchangeRate: Number(input.exchangeRate || 1),
            totalDebit: input.totalDebit ?? null,
            totalCredit: input.totalCredit ?? null,
            postedBy: String(input.postedBy || authenticatedUserId || '').trim(),
            lines: input.lines || [],
        };
        return this.journalEngine.postJournal(command);
    }
    reverseJournal(authenticatedCompanyId, authenticatedUserId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const command = {
            companyId,
            journalId: String(input.journalId || '').trim(),
            reverseDate: String(input.reverseDate || '').trim(),
            sourceType: input.sourceType || null,
            sourceId: input.sourceId || null,
            sourceNo: input.sourceNo || null,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.referenceNo || null,
            reason: input.reason || null,
            postedBy: String(input.postedBy || authenticatedUserId || '').trim(),
        };
        return this.journalEngine.reverseJournal(command);
    }
    getBySource(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const journal = this.journalEngine.getBySource(companyId, String(input.sourceType || '').trim(), String(input.sourceId || '').trim(), input.sourceVersion ?? null);
        return journal ? this.toJournalDto(journal) : null;
    }
    getById(authenticatedCompanyId, journalId) {
        const normalizedJournalId = String(journalId || '').trim();
        if (!normalizedJournalId) {
            throw new errors_1.DomainError('ERR_JOURNAL_ID_REQUIRED', 'Journal id is required');
        }
        const journal = this.journalEngine.getById(authenticatedCompanyId, normalizedJournalId);
        return journal ? this.toJournalDto(journal) : null;
    }
    previewValidation(authenticatedCompanyId, authenticatedBranchId, authenticatedUserId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        return this.journalEngine.previewValidation({
            companyId,
            branchId: String(input.branchId || authenticatedBranchId || '').trim(),
            journalDate: String(input.journalDate || '').trim(),
            fiscalPeriodId: input.fiscalPeriodId || null,
            sourceType: String(input.sourceType || '').trim(),
            sourceId: String(input.sourceId || '').trim(),
            sourceNo: input.sourceNo || null,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.referenceNo || null,
            description: input.description || null,
            currencyCode: String(input.currencyCode || 'ILS').trim().toUpperCase(),
            exchangeRate: Number(input.exchangeRate || 1),
            totalDebit: input.totalDebit ?? null,
            totalCredit: input.totalCredit ?? null,
            postedBy: String(input.postedBy || authenticatedUserId || '').trim(),
            lines: input.lines || [],
        });
    }
    assertCompanyScope(authenticatedCompanyId, requestedCompanyId) {
        const normalizedAuthenticated = String(authenticatedCompanyId || '').trim();
        const normalizedRequested = String(requestedCompanyId || '').trim();
        if (normalizedRequested && normalizedRequested !== normalizedAuthenticated) {
            throw new errors_1.DomainError('INVALID_SCOPE', 'Requested company scope is not allowed');
        }
        return normalizedAuthenticated;
    }
    toJournalDto(journal) {
        return {
            id: journal.id,
            companyId: journal.companyId,
            branchId: journal.branchId,
            journalNo: journal.journalNo,
            journalDate: journal.journalDate,
            fiscalPeriodId: journal.fiscalPeriodId,
            sourceType: journal.sourceType,
            sourceId: journal.sourceId,
            sourceNo: journal.sourceNo,
            sourceVersion: journal.sourceVersion,
            referenceNo: journal.referenceNo,
            description: journal.description,
            status: journal.status,
            currencyCode: journal.currencyCode,
            exchangeRate: journal.exchangeRate,
            totalDebit: journal.totalDebit,
            totalCredit: journal.totalCredit,
            postedBy: journal.postedBy,
            postedAt: journal.postedAt,
            reversedJournalId: journal.reversedJournalId,
            createdAt: journal.createdAt,
            updatedAt: journal.updatedAt,
            lines: journal.lines.map((line) => ({
                id: line.id,
                journalId: line.journalId,
                lineNo: line.lineNo,
                accountId: line.accountId,
                description: line.description,
                debit: line.debit,
                credit: line.credit,
                currencyCode: line.currencyCode,
                exchangeRate: line.exchangeRate,
                baseDebit: line.baseDebit,
                baseCredit: line.baseCredit,
                branchId: line.branchId,
                costCenterId: line.costCenterId,
                expenseTypeId: line.expenseTypeId,
                vehicleId: line.vehicleId,
                partnerId: line.partnerId,
                projectId: line.projectId,
                itemId: line.itemId,
                warehouseId: line.warehouseId,
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
            })),
        };
    }
}
exports.JournalEngineUseCases = JournalEngineUseCases;
