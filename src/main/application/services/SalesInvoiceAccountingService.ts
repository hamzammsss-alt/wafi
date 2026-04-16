import { DomainError } from '../../domain/errors';
import { JournalDto, JournalEngineUseCases } from '../useCases/JournalEngineUseCases';
import { SalesInvoicePostingBuilder, SALES_JOURNAL_SOURCE_TYPE, SALES_SOURCE_MODULE, SALES_SOURCE_TYPE } from './SalesInvoicePostingBuilder';
import { SalesInvoiceAccountingRepositoryPort, SalesInvoiceHeaderRecord } from '../ports/SalesInvoiceAccountingPorts';

type AccountingContext = {
    companyId: string;
    branchId: string;
    userId: string;
};

export interface PostSalesInvoiceAccountingResult {
    invoiceId: string;
    sourceModule: string;
    sourceType: string;
    sourceId: string;
    documentNo: string;
    status: 'POSTED' | 'ALREADY_POSTED';
    journalId: string;
    journalNo: string;
    sourceVersion: number;
}

export interface ReverseSalesInvoiceAccountingResult {
    invoiceId: string;
    sourceModule: string;
    sourceType: string;
    sourceId: string;
    documentNo: string;
    status: 'REVERSED' | 'ALREADY_REVERSED';
    originalJournalId: string;
    reversalJournalId: string;
    reversalJournalNo: string;
}

export interface SalesInvoicePostingStatusResult {
    invoiceId: string;
    sourceModule: string;
    sourceType: string;
    sourceId: string;
    documentNo: string | null;
    invoiceStatus: string;
    sourceVersion: number;
    isPosted: boolean;
    isReversed: boolean;
    journalId: string | null;
    journalNo: string | null;
    journalStatus: string | null;
    reversalJournalId: string | null;
    reversalJournalNo: string | null;
}

export interface ReverseSalesInvoiceAccountingInput {
    invoiceId: string;
    reverseDate: string;
    reason?: string | null;
}

export class SalesInvoiceAccountingService {
    constructor(
        private readonly repository: SalesInvoiceAccountingRepositoryPort,
        private readonly postingBuilder: SalesInvoicePostingBuilder,
        private readonly journalEngineUseCases: JournalEngineUseCases,
    ) {
        this.repository.ensureSchema();
    }

    async postAccounting(
        context: AccountingContext,
        invoiceId: string,
    ): Promise<PostSalesInvoiceAccountingResult> {
        const header = this.requireInvoiceHeader(context.companyId, context.branchId, invoiceId);
        this.assertInvoiceCanPost(header.status);

        const customer = this.repository.getCustomerById(header.customerId);
        if (!customer || !customer.isActive) {
            throw new DomainError('VALIDATION_ERROR', 'Customer was not found for sales invoice posting', {
                messageKey: 'validation.sales_invoice.customer_required',
                details: {
                    invoiceId,
                    customerId: header.customerId,
                },
            });
        }

        const lines = this.repository.getInvoiceLinesByInvoiceId(invoiceId);
        if (!lines.length) {
            throw new DomainError('VALIDATION_ERROR', 'Sales invoice lines are required for posting', {
                messageKey: 'validation.sales_invoice.lines_required',
                details: { invoiceId },
            });
        }

        const sourceVersion = Number(header.version || 1) + 1;
        const existingJournal =
            (header.journalId ? this.journalEngineUseCases.getById(context.companyId, header.journalId) : null)
            || this.findBySource(context.companyId, invoiceId, sourceVersion)
            || this.findBySource(context.companyId, invoiceId, null);

        if (existingJournal) {
            this.repository.savePostingState(
                context.companyId,
                context.branchId,
                invoiceId,
                existingJournal.id,
                context.userId,
            );
            return {
                invoiceId,
                sourceModule: SALES_SOURCE_MODULE,
                sourceType: SALES_SOURCE_TYPE,
                sourceId: invoiceId,
                documentNo: header.invoiceNo,
                status: 'ALREADY_POSTED',
                journalId: existingJournal.id,
                journalNo: existingJournal.journalNo,
                sourceVersion,
            };
        }

        const command = await this.postingBuilder.build({
            companyId: context.companyId,
            branchId: context.branchId,
            userId: context.userId,
            sourceVersion,
            header,
            lines,
            perpetualInventoryEnabled: this.repository.isPerpetualInventoryEnabled(context.companyId),
        });

        try {
            const result = this.journalEngineUseCases.postJournal(
                context.companyId,
                context.branchId,
                context.userId,
                command,
            );

            this.repository.savePostingState(
                context.companyId,
                context.branchId,
                invoiceId,
                result.journalId,
                context.userId,
            );

            return {
                invoiceId,
                sourceModule: SALES_SOURCE_MODULE,
                sourceType: SALES_SOURCE_TYPE,
                sourceId: invoiceId,
                documentNo: header.invoiceNo,
                status: 'POSTED',
                journalId: result.journalId,
                journalNo: result.journalNo,
                sourceVersion,
            };
        } catch (error: any) {
            if (String(error?.code || '') === 'ERR_SOURCE_ALREADY_POSTED') {
                const duplicate = this.findBySource(context.companyId, invoiceId, sourceVersion)
                    || this.findBySource(context.companyId, invoiceId, null);

                if (duplicate) {
                    this.repository.savePostingState(
                        context.companyId,
                        context.branchId,
                        invoiceId,
                        duplicate.id,
                        context.userId,
                    );

                    return {
                        invoiceId,
                        sourceModule: SALES_SOURCE_MODULE,
                        sourceType: SALES_SOURCE_TYPE,
                        sourceId: invoiceId,
                        documentNo: header.invoiceNo,
                        status: 'ALREADY_POSTED',
                        journalId: duplicate.id,
                        journalNo: duplicate.journalNo,
                        sourceVersion,
                    };
                }
            }

            throw error;
        }
    }

    reverseAccounting(
        context: AccountingContext,
        input: ReverseSalesInvoiceAccountingInput,
    ): ReverseSalesInvoiceAccountingResult {
        const invoiceId = String(input.invoiceId || '').trim();
        const reverseDate = String(input.reverseDate || '').trim();
        if (!invoiceId) {
            throw new DomainError('VALIDATION_ERROR', 'Invoice id is required', {
                messageKey: 'validation.sales_invoice.id_required',
            });
        }
        if (!reverseDate) {
            throw new DomainError('VALIDATION_ERROR', 'Reverse date is required', {
                messageKey: 'validation.sales_invoice.reverse_date_required',
            });
        }

        const header = this.requireInvoiceHeader(context.companyId, context.branchId, invoiceId);
        const original = this.resolveOriginalJournal(context.companyId, header, invoiceId);
        if (!original) {
            throw new DomainError('VALIDATION_ERROR', 'Sales invoice has not been posted yet', {
                messageKey: 'error.sales_invoice.accounting.not_posted',
                details: { invoiceId },
            });
        }

        const existingReversal = this.resolveExistingReversal(context.companyId, original);
        if (existingReversal) {
            this.repository.saveReversalState(
                context.companyId,
                context.branchId,
                invoiceId,
                existingReversal.id,
                context.userId,
            );
            return {
                invoiceId,
                sourceModule: SALES_SOURCE_MODULE,
                sourceType: SALES_SOURCE_TYPE,
                sourceId: invoiceId,
                documentNo: header.invoiceNo,
                status: 'ALREADY_REVERSED',
                originalJournalId: original.id,
                reversalJournalId: existingReversal.id,
                reversalJournalNo: existingReversal.journalNo,
            };
        }

        try {
            const result = this.journalEngineUseCases.reverseJournal(context.companyId, context.userId, {
                companyId: context.companyId,
                journalId: original.id,
                reverseDate,
                sourceType: `${SALES_JOURNAL_SOURCE_TYPE}_REVERSAL`,
                sourceId: invoiceId,
                sourceNo: header.invoiceNo,
                sourceVersion: Number(header.version || 1) + 1,
                referenceNo: header.invoiceNo,
                reason: input.reason || `Reverse sales invoice ${header.invoiceNo}`,
                postedBy: context.userId,
            });

            this.repository.saveReversalState(
                context.companyId,
                context.branchId,
                invoiceId,
                result.reversalJournalId,
                context.userId,
            );

            return {
                invoiceId,
                sourceModule: SALES_SOURCE_MODULE,
                sourceType: SALES_SOURCE_TYPE,
                sourceId: invoiceId,
                documentNo: header.invoiceNo,
                status: 'REVERSED',
                originalJournalId: result.originalJournalId,
                reversalJournalId: result.reversalJournalId,
                reversalJournalNo: result.reversalJournalNo,
            };
        } catch (error: any) {
            if (String(error?.code || '') === 'ERR_SOURCE_ALREADY_POSTED') {
                const refreshedOriginal = this.journalEngineUseCases.getById(context.companyId, original.id);
                const duplicateReversal = this.resolveExistingReversal(context.companyId, refreshedOriginal || original);
                if (duplicateReversal) {
                    this.repository.saveReversalState(
                        context.companyId,
                        context.branchId,
                        invoiceId,
                        duplicateReversal.id,
                        context.userId,
                    );
                    return {
                        invoiceId,
                        sourceModule: SALES_SOURCE_MODULE,
                        sourceType: SALES_SOURCE_TYPE,
                        sourceId: invoiceId,
                        documentNo: header.invoiceNo,
                        status: 'ALREADY_REVERSED',
                        originalJournalId: original.id,
                        reversalJournalId: duplicateReversal.id,
                        reversalJournalNo: duplicateReversal.journalNo,
                    };
                }
            }
            throw error;
        }
    }

    getPostingStatus(
        context: Pick<AccountingContext, 'companyId' | 'branchId'>,
        invoiceId: string,
    ): SalesInvoicePostingStatusResult {
        const header = this.requireInvoiceHeader(context.companyId, context.branchId, invoiceId);
        const sourceVersion = Number(header.version || 1) + 1;
        const originalJournal =
            (header.journalId ? this.journalEngineUseCases.getById(context.companyId, header.journalId) : null)
            || this.findBySource(context.companyId, invoiceId, sourceVersion)
            || this.findBySource(context.companyId, invoiceId, null);

        const reversalJournal = this.resolveExistingReversal(context.companyId, originalJournal);
        return {
            invoiceId,
            sourceModule: SALES_SOURCE_MODULE,
            sourceType: SALES_SOURCE_TYPE,
            sourceId: invoiceId,
            documentNo: header.invoiceNo || null,
            invoiceStatus: header.status,
            sourceVersion,
            isPosted: Boolean(originalJournal),
            isReversed: Boolean(reversalJournal),
            journalId: originalJournal?.id || null,
            journalNo: originalJournal?.journalNo || null,
            journalStatus: originalJournal?.status || null,
            reversalJournalId: reversalJournal?.id || header.reversalJournalId || null,
            reversalJournalNo: reversalJournal?.journalNo || null,
        };
    }

    private resolveOriginalJournal(companyId: string, header: SalesInvoiceHeaderRecord, invoiceId: string): JournalDto | null {
        const sourceVersion = Number(header.version || 1) + 1;
        return (header.journalId ? this.journalEngineUseCases.getById(companyId, header.journalId) : null)
            || this.findBySource(companyId, invoiceId, sourceVersion)
            || this.findBySource(companyId, invoiceId, null);
    }

    private resolveExistingReversal(companyId: string, original: JournalDto | null): JournalDto | null {
        if (!original) return null;
        if (String(original.status || '').toUpperCase() === 'REVERSED' && original.reversedJournalId) {
            return this.journalEngineUseCases.getById(companyId, original.reversedJournalId);
        }
        if (original.reversedJournalId) {
            return this.journalEngineUseCases.getById(companyId, original.reversedJournalId);
        }
        return null;
    }

    private findBySource(companyId: string, invoiceId: string, sourceVersion: number | null): JournalDto | null {
        return this.journalEngineUseCases.getBySource(companyId, {
            sourceType: SALES_JOURNAL_SOURCE_TYPE,
            sourceId: invoiceId,
            sourceVersion,
        });
    }

    private requireInvoiceHeader(companyId: string, branchId: string, invoiceId: string): SalesInvoiceHeaderRecord {
        const normalizedId = String(invoiceId || '').trim();
        if (!normalizedId) {
            throw new DomainError('VALIDATION_ERROR', 'Invoice id is required', {
                messageKey: 'validation.sales_invoice.id_required',
            });
        }
        const header = this.repository.getInvoiceHeaderById(companyId, branchId, normalizedId);
        if (!header) {
            throw new DomainError('DOCUMENT_NOT_FOUND', `Sales invoice ${normalizedId} was not found`, {
                messageKey: 'error.sales_invoice.not_found',
                details: { invoiceId: normalizedId },
            });
        }
        return header;
    }

    private assertInvoiceCanPost(status: string): void {
        const normalized = String(status || '').trim().toUpperCase();
        if (!normalized) {
            throw new DomainError('VALIDATION_ERROR', 'Invoice status is required', {
                messageKey: 'validation.sales_invoice.status_required',
            });
        }

        if (normalized === 'DRAFT') {
            throw new DomainError('INVALID_TRANSITION', 'Draft invoice cannot be posted', {
                messageKey: 'error.sales_invoice.posting.draft_not_allowed',
            });
        }

        if (normalized === 'CANCELLED' || normalized === 'VOID') {
            throw new DomainError('INVALID_TRANSITION', 'Cancelled invoice cannot be posted', {
                messageKey: 'error.sales_invoice.posting.cancelled_not_allowed',
            });
        }
    }
}
