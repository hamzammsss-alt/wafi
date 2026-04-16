import { DomainError } from '../../domain/errors';
import { FinancialAccountRole } from '../../domain/accountingResolution/enums/FinancialAccountRole';
import { ResolutionDirection } from '../../domain/accountingResolution/enums/ResolutionDirection';
import { PostingLineInput } from '../../domain/journalEngine/types/PostingTypes';
import {
    TreasuryDocumentHeaderEntity,
    TreasuryDocumentLineEntity,
    TreasuryDocumentType,
} from '../../domain/treasury/types/TreasuryTypes';
import { TreasuryDocumentRepositoryPort } from '../ports/TreasuryPorts';
import { PostJournalInput } from '../useCases/JournalEngineUseCases';
import { AccountingResolutionUseCases } from '../useCases/AccountingResolutionUseCases';

type TreasuryPostingBuildInput = {
    companyId: string;
    branchId: string;
    userId: string;
    sourceVersion: number;
    header: TreasuryDocumentHeaderEntity;
    lines: TreasuryDocumentLineEntity[];
};

type BucketEntry = {
    accountId: string;
    description: string | null;
    debit: number;
    credit: number;
    currencyCode: string;
    exchangeRate: number;
    branchId: string | null;
    costCenterId: string | null;
    expenseTypeId: string | null;
    vehicleId: string | null;
    partnerId: string | null;
    projectId: string | null;
    itemId: string | null;
    warehouseId: string | null;
};

const EPSILON = 0.000001;

export const TREASURY_SOURCE_MODULE = 'TREASURY';

export class TreasuryPostingBuilder {
    constructor(
        private readonly accountResolutionUseCases: AccountingResolutionUseCases,
        private readonly repository: TreasuryDocumentRepositoryPort,
    ) {}

    async build(input: TreasuryPostingBuildInput): Promise<PostJournalInput> {
        const currencyCode = this.repository.resolveCurrencyCode(input.header.currencyCode);
        const exchangeRate = this.toRate(input.header.currencyRate);
        const docDate = String(input.header.docDate || '').slice(0, 10);
        const docNo = String(input.header.docNo || '').trim();

        if (!docDate) {
            throw new DomainError('VALIDATION_ERROR', 'Document date is required for treasury posting', {
                messageKey: 'validation.treasury_document.date_required',
            });
        }
        if (!docNo) {
            throw new DomainError('VALIDATION_ERROR', 'Document number is required for treasury posting', {
                messageKey: 'validation.treasury_document.doc_no_required',
            });
        }

        const controlRole = this.resolveControlRole(input.header.docType);
        const direction = this.resolveDirection(input.header.docType);
        const ownerRefId = this.normalizeNullable(input.header.bankAccountId || input.header.cashAccountId);
        const partnerId = this.normalizeNullable(input.header.partnerId);

        const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
            companyId: input.companyId,
            branchId: input.branchId,
            documentType: input.header.docType,
            documentId: input.header.id,
            lineType: 'CONTROL',
            itemId: null,
            itemGroupId: null,
            warehouseId: ownerRefId,
            partnerId,
            taxProfileId: null,
            isService: false,
            requiresInventory: false,
            requiresTax: false,
            currencyCode,
            direction,
            requiredRoles: [controlRole],
            optionalRoles: [FinancialAccountRole.RECEIVABLE_ACCOUNT, FinancialAccountRole.PAYABLE_ACCOUNT],
        });

        if (!resolution.success) {
            throw new DomainError('VALIDATION_ERROR', 'Treasury control account resolution failed', {
                messageKey: 'error.account_resolution.mapping_not_found',
                details: {
                    requiredRoles: [controlRole],
                    missingRoles: resolution.missingRoles,
                },
            });
        }

        const control = resolution.resolvedAccounts[controlRole];
        if (!control) {
            throw new DomainError('VALIDATION_ERROR', 'Treasury control account was not resolved', {
                messageKey: 'error.account_resolution.mapping_not_found',
                details: { role: controlRole },
            });
        }

        const bucket = new Map<string, BucketEntry>();

        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            const amount = this.roundAmount(line.amount);
            if (amount <= EPSILON) continue;

            const effectivePartnerId = this.normalizeNullable(line.partnerId || partnerId);
            const baseEntry = {
                currencyCode,
                exchangeRate,
                branchId: input.branchId,
                costCenterId: this.normalizeNullable(line.costCenterId),
                expenseTypeId: this.normalizeNullable(line.expenseTypeId),
                vehicleId: this.normalizeNullable(line.vehicleId),
                partnerId: effectivePartnerId,
                projectId: this.normalizeNullable(line.projectId),
                itemId: this.normalizeNullable(line.itemId),
                warehouseId: this.normalizeNullable(line.warehouseId),
            };

            const lineDescription = this.normalizeNullable(line.description) || `Treasury ${input.header.docType} ${docNo}`;

            if (this.isReceiptType(input.header.docType)) {
                this.addToBucket(bucket, {
                    accountId: control.accountId,
                    description: `Treasury control ${docNo}`,
                    debit: amount,
                    credit: 0,
                    ...baseEntry,
                });
                this.addToBucket(bucket, {
                    accountId: line.accountId,
                    description: lineDescription,
                    debit: 0,
                    credit: amount,
                    ...baseEntry,
                });
            } else {
                this.addToBucket(bucket, {
                    accountId: line.accountId,
                    description: lineDescription,
                    debit: amount,
                    credit: 0,
                    ...baseEntry,
                });
                this.addToBucket(bucket, {
                    accountId: control.accountId,
                    description: `Treasury control ${docNo}`,
                    debit: 0,
                    credit: amount,
                    ...baseEntry,
                });
            }
        }

        const postingLines = Array.from(bucket.values())
            .map((entry, index) => ({
                lineNo: index + 1,
                accountId: entry.accountId,
                description: entry.description,
                debit: this.roundAmount(entry.debit),
                credit: this.roundAmount(entry.credit),
                currencyCode: entry.currencyCode,
                exchangeRate: entry.exchangeRate,
                branchId: entry.branchId,
                costCenterId: entry.costCenterId,
                expenseTypeId: entry.expenseTypeId,
                vehicleId: entry.vehicleId,
                partnerId: entry.partnerId,
                projectId: entry.projectId,
                itemId: entry.itemId,
                warehouseId: entry.warehouseId,
            }))
            .filter((line) => line.debit > EPSILON || line.credit > EPSILON);

        if (!postingLines.length) {
            throw new DomainError('VALIDATION_ERROR', 'Treasury posting command has no lines', {
                messageKey: 'validation.treasury_document.lines_required',
            });
        }

        const totalDebit = this.roundAmount(postingLines.reduce((sum, line) => sum + line.debit, 0));
        const totalCredit = this.roundAmount(postingLines.reduce((sum, line) => sum + line.credit, 0));

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new DomainError('VALIDATION_ERROR', 'Treasury posting command is not balanced', {
                messageKey: 'error.journal.post.unbalanced',
                details: { totalDebit, totalCredit },
            });
        }

        return {
            companyId: input.companyId,
            branchId: input.branchId,
            journalDate: docDate,
            sourceType: input.header.docType,
            sourceId: input.header.id,
            sourceNo: docNo,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.header.referenceNo || docNo,
            description: `Treasury ${input.header.docType} ${docNo}`,
            currencyCode,
            exchangeRate,
            totalDebit,
            totalCredit,
            postedBy: input.userId,
            lines: postingLines as PostingLineInput[],
        };
    }

    private resolveControlRole(docType: TreasuryDocumentType): FinancialAccountRole {
        switch (docType) {
            case 'CASH_RECEIPT':
            case 'CASH_PAYMENT':
                return FinancialAccountRole.CASH_ACCOUNT;
            case 'BANK_RECEIPT':
            case 'BANK_PAYMENT':
                return FinancialAccountRole.BANK_ACCOUNT;
            case 'CHEQUE_RECEIPT':
                return FinancialAccountRole.CHEQUE_IN_SAFE_ACCOUNT;
            case 'CHEQUE_PAYMENT':
                return FinancialAccountRole.ISSUED_CHEQUE_ACCOUNT;
            default:
                return FinancialAccountRole.SUSPENSE_ACCOUNT;
        }
    }

    private resolveDirection(docType: TreasuryDocumentType): ResolutionDirection {
        if (this.isReceiptType(docType)) return ResolutionDirection.SALE;
        return ResolutionDirection.PURCHASE;
    }

    private isReceiptType(docType: TreasuryDocumentType): boolean {
        return docType === 'CASH_RECEIPT' || docType === 'BANK_RECEIPT' || docType === 'CHEQUE_RECEIPT';
    }

    private addToBucket(bucket: Map<string, BucketEntry>, entry: BucketEntry): void {
        const debit = this.roundAmount(entry.debit);
        const credit = this.roundAmount(entry.credit);
        if (debit <= EPSILON && credit <= EPSILON) return;

        const key = [
            entry.accountId,
            entry.currencyCode,
            this.roundAmount(entry.exchangeRate),
            entry.branchId || '',
            entry.costCenterId || '',
            entry.expenseTypeId || '',
            entry.vehicleId || '',
            entry.partnerId || '',
            entry.projectId || '',
            entry.itemId || '',
            entry.warehouseId || '',
            entry.description || '',
        ].join('|');

        const existing = bucket.get(key);
        if (!existing) {
            bucket.set(key, { ...entry, debit, credit });
            return;
        }

        existing.debit = this.roundAmount(existing.debit + debit);
        existing.credit = this.roundAmount(existing.credit + credit);
    }

    private normalizeNullable(value: string | null | undefined): string | null {
        const normalized = String(value || '').trim();
        return normalized || null;
    }

    private toRate(value: number): number {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric <= 0) return 1;
        return numeric;
    }

    private roundAmount(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}