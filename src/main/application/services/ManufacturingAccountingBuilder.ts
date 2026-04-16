import { DomainError } from '../../domain/errors';
import { FinancialAccountRole } from '../../domain/accountingResolution/enums/FinancialAccountRole';
import { ResolutionDirection } from '../../domain/accountingResolution/enums/ResolutionDirection';
import { PostingLineInput } from '../../domain/journalEngine/types/PostingTypes';
import {
    ProductionIssueHeaderEntity,
    ProductionIssueLineEntity,
    ProductionOrderEntity,
    ProductionReceiptHeaderEntity,
    ProductionReceiptLineEntity,
} from '../../domain/manufacturing/types/ManufacturingTypes';
import { AccountingResolutionUseCases } from '../useCases/AccountingResolutionUseCases';
import { PostJournalInput } from '../useCases/JournalEngineUseCases';
import { ManufacturingRepositoryPort } from '../ports/ManufacturingPorts';

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

export class ManufacturingAccountingBuilder {
    constructor(
        private readonly accountResolutionUseCases: AccountingResolutionUseCases,
        private readonly repository: ManufacturingRepositoryPort,
    ) {}

    async buildIssueJournal(input: {
        companyId: string;
        branchId: string;
        userId: string;
        sourceVersion: number;
        order: ProductionOrderEntity;
        header: ProductionIssueHeaderEntity;
        lines: ProductionIssueLineEntity[];
    }): Promise<PostJournalInput | null> {
        const bucket = new Map<string, BucketEntry>();
        const currencyCode = this.repository.resolveCurrencyCode('ILS');
        const exchangeRate = 1;

        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            const item = this.repository.getItemById(line.componentItemId);
            if (!item || !item.isStockItem) continue;

            const qty = this.round(line.qty);
            const unitCost = this.round(line.unitCost || item.defaultUnitCost);
            const totalCost = this.round(qty * unitCost);
            if (totalCost <= EPSILON) continue;

            const warehouseId = this.normalizeNullable(line.warehouseId);
            const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                companyId: input.companyId,
                branchId: input.branchId,
                documentType: 'PRODUCTION_MATERIAL_ISSUE',
                documentId: input.header.id,
                lineType: 'MFG_COMPONENT',
                itemId: line.componentItemId,
                itemGroupId: item.itemGroupId,
                warehouseId,
                partnerId: null,
                taxProfileId: null,
                isService: false,
                requiresInventory: true,
                requiresTax: false,
                currencyCode,
                direction: ResolutionDirection.ADJUSTMENT,
                requiredRoles: [FinancialAccountRole.WIP_INVENTORY_ACCOUNT],
                optionalRoles: [
                    FinancialAccountRole.RAW_MATERIAL_INVENTORY_ACCOUNT,
                    FinancialAccountRole.INVENTORY_ACCOUNT,
                ],
            });

            if (!resolution.success) {
                throw new DomainError('VALIDATION_ERROR', 'Production issue account resolution failed', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }

            const wip = resolution.resolvedAccounts[FinancialAccountRole.WIP_INVENTORY_ACCOUNT] || null;
            const rawInventory =
                resolution.resolvedAccounts[FinancialAccountRole.RAW_MATERIAL_INVENTORY_ACCOUNT]
                || resolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT]
                || null;

            if (!wip || !rawInventory) {
                throw new DomainError('VALIDATION_ERROR', 'Required WIP/raw inventory accounts were not resolved', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        requiredRoles: [
                            FinancialAccountRole.WIP_INVENTORY_ACCOUNT,
                            FinancialAccountRole.RAW_MATERIAL_INVENTORY_ACCOUNT,
                            FinancialAccountRole.INVENTORY_ACCOUNT,
                        ],
                    },
                });
            }

            const dimensions = {
                branchId: input.branchId,
                costCenterId: this.normalizeNullable(input.order.costCenterId),
                expenseTypeId: null,
                vehicleId: null,
                partnerId: null,
                projectId: this.normalizeNullable(input.order.projectId),
                itemId: this.normalizeNullable(line.componentItemId),
                warehouseId,
            };

            this.addToBucket(bucket, {
                accountId: wip.accountId,
                description: `Production issue WIP ${input.header.issueNo}`,
                debit: totalCost,
                credit: 0,
                currencyCode,
                exchangeRate,
                ...dimensions,
            });

            this.addToBucket(bucket, {
                accountId: rawInventory.accountId,
                description: `Production issue raw material ${input.header.issueNo}`,
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
            sourceType: 'PRODUCTION_MATERIAL_ISSUE',
            sourceId: input.header.id,
            sourceNo: input.header.issueNo,
            sourceDate: input.header.issueDate,
            referenceNo: input.header.referenceNo || input.header.issueNo,
            description: `Production issue ${input.header.issueNo}`,
            currencyCode,
            exchangeRate,
        });
    }

    async buildReceiptJournal(input: {
        companyId: string;
        branchId: string;
        userId: string;
        sourceVersion: number;
        order: ProductionOrderEntity;
        header: ProductionReceiptHeaderEntity;
        lines: ProductionReceiptLineEntity[];
    }): Promise<PostJournalInput | null> {
        const bucket = new Map<string, BucketEntry>();
        const currencyCode = this.repository.resolveCurrencyCode('ILS');
        const exchangeRate = 1;

        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            const item = this.repository.getItemById(line.itemId);
            if (!item || !item.isStockItem) continue;

            const qty = this.round(line.qtyReceived);
            const unitCost = this.round(line.unitCost || item.defaultUnitCost);
            const totalCost = this.round(qty * unitCost);
            if (totalCost <= EPSILON) continue;

            const warehouseId = this.normalizeNullable(line.warehouseId);
            const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                companyId: input.companyId,
                branchId: input.branchId,
                documentType: 'PRODUCTION_RECEIPT',
                documentId: input.header.id,
                lineType: 'MFG_FINISHED_GOOD',
                itemId: line.itemId,
                itemGroupId: item.itemGroupId,
                warehouseId,
                partnerId: null,
                taxProfileId: null,
                isService: false,
                requiresInventory: true,
                requiresTax: false,
                currencyCode,
                direction: ResolutionDirection.ADJUSTMENT,
                requiredRoles: [FinancialAccountRole.WIP_INVENTORY_ACCOUNT],
                optionalRoles: [
                    FinancialAccountRole.FINISHED_GOODS_INVENTORY_ACCOUNT,
                    FinancialAccountRole.INVENTORY_ACCOUNT,
                ],
            });

            if (!resolution.success) {
                throw new DomainError('VALIDATION_ERROR', 'Production receipt account resolution failed', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }

            const wip = resolution.resolvedAccounts[FinancialAccountRole.WIP_INVENTORY_ACCOUNT] || null;
            const finishedGoods =
                resolution.resolvedAccounts[FinancialAccountRole.FINISHED_GOODS_INVENTORY_ACCOUNT]
                || resolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT]
                || null;

            if (!wip || !finishedGoods) {
                throw new DomainError('VALIDATION_ERROR', 'Required WIP/finished goods accounts were not resolved', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        requiredRoles: [
                            FinancialAccountRole.WIP_INVENTORY_ACCOUNT,
                            FinancialAccountRole.FINISHED_GOODS_INVENTORY_ACCOUNT,
                            FinancialAccountRole.INVENTORY_ACCOUNT,
                        ],
                    },
                });
            }

            const dimensions = {
                branchId: input.branchId,
                costCenterId: this.normalizeNullable(input.order.costCenterId),
                expenseTypeId: null,
                vehicleId: null,
                partnerId: null,
                projectId: this.normalizeNullable(input.order.projectId),
                itemId: this.normalizeNullable(line.itemId),
                warehouseId,
            };

            this.addToBucket(bucket, {
                accountId: finishedGoods.accountId,
                description: `Production receipt FG ${input.header.receiptNo}`,
                debit: totalCost,
                credit: 0,
                currencyCode,
                exchangeRate,
                ...dimensions,
            });

            this.addToBucket(bucket, {
                accountId: wip.accountId,
                description: `Production receipt WIP ${input.header.receiptNo}`,
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
            sourceType: 'PRODUCTION_RECEIPT',
            sourceId: input.header.id,
            sourceNo: input.header.receiptNo,
            sourceDate: input.header.receiptDate,
            referenceNo: input.header.referenceNo || input.header.receiptNo,
            description: `Production receipt ${input.header.receiptNo}`,
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
            throw new DomainError('VALIDATION_ERROR', 'Manufacturing journal is not balanced', {
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

    private round(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }
}
