import { DomainError } from '../../domain/errors';
import { FinancialAccountRole } from '../../domain/accountingResolution/enums/FinancialAccountRole';
import { ResolutionDirection } from '../../domain/accountingResolution/enums/ResolutionDirection';
import { PostingLineInput } from '../../domain/journalEngine/types/PostingTypes';
import { PurchaseOperationsRepositoryPort } from '../ports/PurchaseOperationsPorts';
import { AccountingResolutionUseCases } from '../useCases/AccountingResolutionUseCases';
import { PostJournalInput } from '../useCases/JournalEngineUseCases';
import {
    PurchaseOperationHeaderEntity,
    PurchaseOperationLineEntity,
} from '../../domain/purchaseOperations/types/PurchaseOperationsTypes';

type BuildInput = {
    companyId: string;
    branchId: string;
    userId: string;
    sourceVersion: number;
    header: PurchaseOperationHeaderEntity;
    lines: PurchaseOperationLineEntity[];
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

export class PurchaseOperationsAccountingBuilder {
    constructor(
        private readonly accountResolutionUseCases: AccountingResolutionUseCases,
        private readonly repository: PurchaseOperationsRepositoryPort,
    ) {}

    async buildReceiptJournal(input: BuildInput): Promise<PostJournalInput | null> {
        const bucket = new Map<string, BucketEntry>();
        const currencyCode = this.repository.resolveCurrencyCode(input.header.currencyCode);
        const exchangeRate = this.toRate(input.header.currencyRate);

        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            if (line.lineType !== 'INVENTORY') {
                continue;
            }

            const itemId = this.normalizeRequired(line.itemId, 'Inventory line item is required', {
                lineNo: index + 1,
                documentId: input.header.id,
            });
            const item = this.repository.getItemById(itemId);
            if (!item || !item.isStockItem) continue;

            const warehouseId = this.normalizeNullable(line.warehouseId || input.header.warehouseId);
            const qty = this.round(line.qty);
            const unitCost = this.round(line.unitCost ?? item.defaultUnitCost);
            const totalCost = this.round(qty * unitCost);
            if (totalCost <= EPSILON) continue;

            const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                companyId: input.companyId,
                branchId: input.branchId,
                documentType: input.header.docType,
                documentId: input.header.id,
                lineType: line.lineType,
                itemId,
                itemGroupId: item.itemGroupId,
                warehouseId,
                partnerId: this.normalizeNullable(input.header.vendorId),
                taxProfileId: null,
                isService: false,
                requiresInventory: true,
                requiresTax: false,
                currencyCode,
                direction: ResolutionDirection.PURCHASE,
                requiredRoles: [FinancialAccountRole.INVENTORY_ACCOUNT, FinancialAccountRole.SUSPENSE_ACCOUNT],
                optionalRoles: [FinancialAccountRole.PAYABLE_ACCOUNT],
            });

            if (!resolution.success) {
                throw new DomainError('VALIDATION_ERROR', 'Purchase receipt account resolution failed', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }

            const inventory = resolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT];
            const clearing =
                resolution.resolvedAccounts[FinancialAccountRole.SUSPENSE_ACCOUNT]
                || resolution.resolvedAccounts[FinancialAccountRole.PAYABLE_ACCOUNT]
                || null;
            if (!inventory || !clearing) {
                throw new DomainError('VALIDATION_ERROR', 'Required inventory/GRNI accounts were not resolved', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        requiredRoles: [FinancialAccountRole.INVENTORY_ACCOUNT, FinancialAccountRole.SUSPENSE_ACCOUNT],
                    },
                });
            }

            const dimensions = {
                branchId: input.branchId,
                costCenterId: this.normalizeNullable(line.costCenterId),
                expenseTypeId: this.normalizeNullable(line.expenseTypeId),
                vehicleId: this.normalizeNullable(line.vehicleId),
                partnerId: this.normalizeNullable(line.partnerId || input.header.vendorId),
                projectId: this.normalizeNullable(line.projectId),
                itemId,
                warehouseId,
            };

            this.addToBucket(bucket, {
                accountId: inventory.accountId,
                description: `Purchase receipt inventory ${input.header.docNo}`,
                debit: totalCost,
                credit: 0,
                currencyCode,
                exchangeRate,
                ...dimensions,
            });

            this.addToBucket(bucket, {
                accountId: clearing.accountId,
                description: `Purchase receipt clearing ${input.header.docNo}`,
                debit: 0,
                credit: totalCost,
                currencyCode,
                exchangeRate,
                ...dimensions,
            });
        }

        return this.buildJournalFromBucket(bucket, {
            companyId: input.companyId,
            branchId: input.branchId,
            userId: input.userId,
            sourceVersion: input.sourceVersion,
            sourceType: 'GOODS_RECEIPT_NOTE',
            sourceId: input.header.id,
            sourceNo: input.header.docNo,
            sourceDate: input.header.docDate,
            referenceNo: input.header.referenceNo || input.header.docNo,
            description: `Purchase receipt ${input.header.docNo}`,
            currencyCode,
            exchangeRate,
        });
    }

    async buildReturnJournal(input: BuildInput): Promise<PostJournalInput | null> {
        const bucket = new Map<string, BucketEntry>();
        const currencyCode = this.repository.resolveCurrencyCode(input.header.currencyCode);
        const exchangeRate = this.toRate(input.header.currencyRate);

        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            if (line.lineType !== 'INVENTORY') {
                continue;
            }

            const itemId = this.normalizeRequired(line.itemId, 'Inventory line item is required', {
                lineNo: index + 1,
                documentId: input.header.id,
            });
            const item = this.repository.getItemById(itemId);
            if (!item || !item.isStockItem) continue;

            const warehouseId = this.normalizeNullable(line.warehouseId || input.header.warehouseId);
            const qty = this.round(line.qty);
            const unitCost = this.round(line.unitCost ?? item.defaultUnitCost);
            const totalCost = this.round(qty * unitCost);
            if (totalCost <= EPSILON) continue;

            const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                companyId: input.companyId,
                branchId: input.branchId,
                documentType: input.header.docType,
                documentId: input.header.id,
                lineType: line.lineType,
                itemId,
                itemGroupId: item.itemGroupId,
                warehouseId,
                partnerId: this.normalizeNullable(input.header.vendorId),
                taxProfileId: null,
                isService: false,
                requiresInventory: true,
                requiresTax: false,
                currencyCode,
                direction: ResolutionDirection.RETURN,
                requiredRoles: [FinancialAccountRole.INVENTORY_ACCOUNT],
                optionalRoles: [
                    FinancialAccountRole.PURCHASE_RETURN_ACCOUNT,
                    FinancialAccountRole.PAYABLE_ACCOUNT,
                    FinancialAccountRole.SUSPENSE_ACCOUNT,
                ],
            });

            if (!resolution.success) {
                throw new DomainError('VALIDATION_ERROR', 'Purchase return account resolution failed', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }

            const inventory = resolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT] || null;
            const returnClearing =
                resolution.resolvedAccounts[FinancialAccountRole.PURCHASE_RETURN_ACCOUNT]
                || resolution.resolvedAccounts[FinancialAccountRole.PAYABLE_ACCOUNT]
                || resolution.resolvedAccounts[FinancialAccountRole.SUSPENSE_ACCOUNT]
                || null;
            if (!inventory || !returnClearing) {
                throw new DomainError('VALIDATION_ERROR', 'Required inventory return accounts were not resolved', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        requiredRoles: [
                            FinancialAccountRole.INVENTORY_ACCOUNT,
                            FinancialAccountRole.PURCHASE_RETURN_ACCOUNT,
                            FinancialAccountRole.PAYABLE_ACCOUNT,
                            FinancialAccountRole.SUSPENSE_ACCOUNT,
                        ],
                    },
                });
            }

            const dimensions = {
                branchId: input.branchId,
                costCenterId: this.normalizeNullable(line.costCenterId),
                expenseTypeId: this.normalizeNullable(line.expenseTypeId),
                vehicleId: this.normalizeNullable(line.vehicleId),
                partnerId: this.normalizeNullable(line.partnerId || input.header.vendorId),
                projectId: this.normalizeNullable(line.projectId),
                itemId,
                warehouseId,
            };

            this.addToBucket(bucket, {
                accountId: returnClearing.accountId,
                description: `Purchase return clearing ${input.header.docNo}`,
                debit: totalCost,
                credit: 0,
                currencyCode,
                exchangeRate,
                ...dimensions,
            });

            this.addToBucket(bucket, {
                accountId: inventory.accountId,
                description: `Purchase return inventory ${input.header.docNo}`,
                debit: 0,
                credit: totalCost,
                currencyCode,
                exchangeRate,
                ...dimensions,
            });
        }

        return this.buildJournalFromBucket(bucket, {
            companyId: input.companyId,
            branchId: input.branchId,
            userId: input.userId,
            sourceVersion: input.sourceVersion,
            sourceType: 'PURCHASE_RETURN',
            sourceId: input.header.id,
            sourceNo: input.header.docNo,
            sourceDate: input.header.docDate,
            referenceNo: input.header.referenceNo || input.header.docNo,
            description: `Purchase return ${input.header.docNo}`,
            currencyCode,
            exchangeRate,
        });
    }

    private buildJournalFromBucket(
        bucket: Map<string, BucketEntry>,
        input: {
            companyId: string;
            branchId: string;
            userId: string;
            sourceVersion: number;
            sourceType: string;
            sourceId: string;
            sourceNo: string;
            sourceDate: string;
            referenceNo: string | null;
            description: string;
            currencyCode: string;
            exchangeRate: number;
        },
    ): PostJournalInput | null {
        const lines = Array.from(bucket.values())
            .map((entry, index) => ({
                lineNo: index + 1,
                accountId: entry.accountId,
                description: entry.description,
                debit: this.round(entry.debit),
                credit: this.round(entry.credit),
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

        if (!lines.length) return null;

        const totalDebit = this.round(lines.reduce((sum, line) => sum + line.debit, 0));
        const totalCredit = this.round(lines.reduce((sum, line) => sum + line.credit, 0));
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new DomainError('VALIDATION_ERROR', 'Purchase operations journal is not balanced', {
                messageKey: 'error.journal.post.unbalanced',
                details: { totalDebit, totalCredit },
            });
        }

        return {
            companyId: input.companyId,
            branchId: input.branchId,
            journalDate: String(input.sourceDate || '').slice(0, 10),
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            sourceNo: input.sourceNo,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.referenceNo,
            description: input.description,
            currencyCode: input.currencyCode,
            exchangeRate: input.exchangeRate,
            totalDebit,
            totalCredit,
            postedBy: input.userId,
            lines: lines as PostingLineInput[],
        };
    }

    private addToBucket(bucket: Map<string, BucketEntry>, entry: BucketEntry): void {
        const debit = this.round(entry.debit);
        const credit = this.round(entry.credit);
        if (debit <= EPSILON && credit <= EPSILON) return;

        const key = [
            entry.accountId,
            entry.currencyCode,
            this.round(entry.exchangeRate),
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

        existing.debit = this.round(existing.debit + debit);
        existing.credit = this.round(existing.credit + credit);
    }

    private normalizeNullable(value: string | null | undefined): string | null {
        const normalized = String(value || '').trim();
        return normalized || null;
    }

    private normalizeRequired(value: string | null | undefined, message: string, details?: Record<string, unknown>): string {
        const normalized = this.normalizeNullable(value);
        if (!normalized) {
            throw new DomainError('VALIDATION_ERROR', message, {
                messageKey: 'error.validation',
                details,
            });
        }
        return normalized;
    }

    private toRate(value: number): number {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric <= 0) return 1;
        return numeric;
    }

    private round(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
