import { DomainError } from '../../domain/errors';
import { FinancialAccountRole } from '../../domain/accountingResolution/enums/FinancialAccountRole';
import { ResolutionDirection } from '../../domain/accountingResolution/enums/ResolutionDirection';
import { PostingLineInput } from '../../domain/journalEngine/types/PostingTypes';
import {
    InventoryAdjustmentDirection,
    InventoryDocumentHeaderEntity,
    InventoryDocumentLineEntity,
} from '../../domain/inventoryDocuments/types/InventoryDocumentTypes';
import { InventoryDocumentRepositoryPort } from '../ports/InventoryDocumentPorts';
import { PostJournalInput } from '../useCases/JournalEngineUseCases';
import { AccountingResolutionUseCases } from '../useCases/AccountingResolutionUseCases';

type InventoryPostingBuildInput = {
    companyId: string;
    branchId: string;
    userId: string;
    sourceVersion: number;
    header: InventoryDocumentHeaderEntity;
    lines: InventoryDocumentLineEntity[];
    perpetualInventoryEnabled: boolean;
};

export interface InventoryPostingBuildResult {
    command: PostJournalInput | null;
    requiresFinancialPosting: boolean;
}

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

export const INVENTORY_SOURCE_MODULE = 'INVENTORY';

export class InventoryPostingBuilder {
    constructor(
        private readonly accountResolutionUseCases: AccountingResolutionUseCases,
        private readonly repository: InventoryDocumentRepositoryPort,
    ) {}

    async build(input: InventoryPostingBuildInput): Promise<InventoryPostingBuildResult> {
        const currencyCode = this.repository.resolveCurrencyCode(input.header.currencyCode);
        const exchangeRate = this.toRate(input.header.currencyRate);
        const docDate = String(input.header.docDate || '').slice(0, 10);
        const docNo = String(input.header.docNo || '').trim();

        if (!docDate) {
            throw new DomainError('VALIDATION_ERROR', 'Document date is required for inventory accounting posting', {
                messageKey: 'validation.inventory_document.date_required',
            });
        }
        if (!docNo) {
            throw new DomainError('VALIDATION_ERROR', 'Document number is required for inventory accounting posting', {
                messageKey: 'validation.inventory_document.doc_no_required',
            });
        }

        const bucket = new Map<string, BucketEntry>();

        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            const amount = this.roundAmount(line.totalCost);
            if (amount <= EPSILON || !input.perpetualInventoryEnabled) {
                continue;
            }

            const item = this.repository.getItemById(line.itemId);
            const itemGroupId = item?.itemGroupId || null;

            const baseDimensions = {
                costCenterId: this.normalizeNullableId(line.costCenterId),
                expenseTypeId: this.normalizeNullableId(line.expenseTypeId),
                vehicleId: this.normalizeNullableId(line.vehicleId),
                partnerId: this.normalizeNullableId(line.partnerId),
                projectId: this.normalizeNullableId(line.projectId),
                itemId: this.normalizeNullableId(line.itemId),
            };

            if (input.header.docType === 'GOODS_RECEIPT') {
                const warehouseId = this.normalizeNullableId(line.toWarehouseId || input.header.warehouseId || input.header.toWarehouseId);
                const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                    companyId: input.companyId,
                    branchId: input.branchId,
                    documentType: 'GOODS_RECEIPT',
                    documentId: input.header.id,
                    lineType: 'INVENTORY',
                    itemId: baseDimensions.itemId,
                    itemGroupId,
                    warehouseId,
                    partnerId: baseDimensions.partnerId,
                    taxProfileId: null,
                    isService: false,
                    requiresInventory: true,
                    requiresTax: false,
                    currencyCode,
                    direction: ResolutionDirection.PURCHASE,
                    requiredRoles: [FinancialAccountRole.INVENTORY_ACCOUNT, FinancialAccountRole.SUSPENSE_ACCOUNT],
                    optionalRoles: [FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT],
                });

                if (!resolution.success) {
                    throw this.buildResolutionError(index, resolution.missingRoles.map((m) => m.role));
                }

                const inventory = resolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT];
                const clearing = resolution.resolvedAccounts[FinancialAccountRole.SUSPENSE_ACCOUNT];

                if (!inventory || !clearing) {
                    throw this.buildResolutionError(index, [
                        FinancialAccountRole.INVENTORY_ACCOUNT,
                        FinancialAccountRole.SUSPENSE_ACCOUNT,
                    ]);
                }

                this.addToBucket(bucket, {
                    accountId: inventory.accountId,
                    description: `Inventory receipt ${docNo}`,
                    debit: amount,
                    credit: 0,
                    currencyCode,
                    exchangeRate,
                    branchId: input.branchId,
                    ...baseDimensions,
                    warehouseId,
                });

                this.addToBucket(bucket, {
                    accountId: clearing.accountId,
                    description: `Inventory clearing ${docNo}`,
                    debit: 0,
                    credit: amount,
                    currencyCode,
                    exchangeRate,
                    branchId: input.branchId,
                    ...baseDimensions,
                    warehouseId,
                });

                continue;
            }

            if (input.header.docType === 'GOODS_ISSUE') {
                const warehouseId = this.normalizeNullableId(line.fromWarehouseId || input.header.warehouseId);
                const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                    companyId: input.companyId,
                    branchId: input.branchId,
                    documentType: 'GOODS_ISSUE',
                    documentId: input.header.id,
                    lineType: 'CONSUMPTION',
                    itemId: baseDimensions.itemId,
                    itemGroupId,
                    warehouseId,
                    partnerId: baseDimensions.partnerId,
                    taxProfileId: null,
                    isService: false,
                    requiresInventory: true,
                    requiresTax: false,
                    currencyCode,
                    direction: ResolutionDirection.ADJUSTMENT,
                    requiredRoles: [FinancialAccountRole.EXPENSE_ACCOUNT, FinancialAccountRole.INVENTORY_ACCOUNT],
                    optionalRoles: [FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT],
                });

                if (!resolution.success) {
                    throw this.buildResolutionError(index, resolution.missingRoles.map((m) => m.role));
                }

                const expense = resolution.resolvedAccounts[FinancialAccountRole.EXPENSE_ACCOUNT];
                const inventory = resolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT];

                if (!expense || !inventory) {
                    throw this.buildResolutionError(index, [
                        FinancialAccountRole.EXPENSE_ACCOUNT,
                        FinancialAccountRole.INVENTORY_ACCOUNT,
                    ]);
                }

                this.addToBucket(bucket, {
                    accountId: expense.accountId,
                    description: `Inventory issue expense ${docNo}`,
                    debit: amount,
                    credit: 0,
                    currencyCode,
                    exchangeRate,
                    branchId: input.branchId,
                    ...baseDimensions,
                    warehouseId,
                });

                this.addToBucket(bucket, {
                    accountId: inventory.accountId,
                    description: `Inventory issue out ${docNo}`,
                    debit: 0,
                    credit: amount,
                    currencyCode,
                    exchangeRate,
                    branchId: input.branchId,
                    ...baseDimensions,
                    warehouseId,
                });

                continue;
            }

            if (input.header.docType === 'STOCK_TRANSFER') {
                const fromWarehouseId = this.normalizeNullableId(line.fromWarehouseId || input.header.warehouseId);
                const toWarehouseId = this.normalizeNullableId(line.toWarehouseId || input.header.toWarehouseId);

                const sourceResolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                    companyId: input.companyId,
                    branchId: input.branchId,
                    documentType: 'STOCK_TRANSFER',
                    documentId: input.header.id,
                    lineType: 'TRANSFER_OUT',
                    itemId: baseDimensions.itemId,
                    itemGroupId,
                    warehouseId: fromWarehouseId,
                    partnerId: baseDimensions.partnerId,
                    taxProfileId: null,
                    isService: false,
                    requiresInventory: true,
                    requiresTax: false,
                    currencyCode,
                    direction: ResolutionDirection.TRANSFER,
                    requiredRoles: [FinancialAccountRole.INVENTORY_ACCOUNT],
                    optionalRoles: [],
                });

                const destinationResolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                    companyId: input.companyId,
                    branchId: input.branchId,
                    documentType: 'STOCK_TRANSFER',
                    documentId: input.header.id,
                    lineType: 'TRANSFER_IN',
                    itemId: baseDimensions.itemId,
                    itemGroupId,
                    warehouseId: toWarehouseId,
                    partnerId: baseDimensions.partnerId,
                    taxProfileId: null,
                    isService: false,
                    requiresInventory: true,
                    requiresTax: false,
                    currencyCode,
                    direction: ResolutionDirection.TRANSFER,
                    requiredRoles: [FinancialAccountRole.INVENTORY_ACCOUNT],
                    optionalRoles: [],
                });

                if (!sourceResolution.success || !destinationResolution.success) {
                    throw this.buildResolutionError(index, [FinancialAccountRole.INVENTORY_ACCOUNT]);
                }

                const sourceInventory = sourceResolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT];
                const destinationInventory = destinationResolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT];

                if (!sourceInventory || !destinationInventory) {
                    throw this.buildResolutionError(index, [FinancialAccountRole.INVENTORY_ACCOUNT]);
                }

                if (sourceInventory.accountId === destinationInventory.accountId) {
                    continue;
                }

                this.addToBucket(bucket, {
                    accountId: destinationInventory.accountId,
                    description: `Transfer in ${docNo}`,
                    debit: amount,
                    credit: 0,
                    currencyCode,
                    exchangeRate,
                    branchId: input.branchId,
                    ...baseDimensions,
                    warehouseId: toWarehouseId,
                });

                this.addToBucket(bucket, {
                    accountId: sourceInventory.accountId,
                    description: `Transfer out ${docNo}`,
                    debit: 0,
                    credit: amount,
                    currencyCode,
                    exchangeRate,
                    branchId: input.branchId,
                    ...baseDimensions,
                    warehouseId: fromWarehouseId,
                });

                continue;
            }

            if (input.header.docType === 'STOCK_ADJUSTMENT') {
                const adjustmentDirection = this.resolveAdjustmentDirection(input.header, line);
                const warehouseId = adjustmentDirection === 'IN'
                    ? this.normalizeNullableId(line.toWarehouseId || input.header.warehouseId || input.header.toWarehouseId)
                    : this.normalizeNullableId(line.fromWarehouseId || input.header.warehouseId);

                const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                    companyId: input.companyId,
                    branchId: input.branchId,
                    documentType: 'STOCK_ADJUSTMENT',
                    documentId: input.header.id,
                    lineType: adjustmentDirection === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                    itemId: baseDimensions.itemId,
                    itemGroupId,
                    warehouseId,
                    partnerId: baseDimensions.partnerId,
                    taxProfileId: null,
                    isService: false,
                    requiresInventory: true,
                    requiresTax: false,
                    currencyCode,
                    direction: ResolutionDirection.ADJUSTMENT,
                    requiredRoles: adjustmentDirection === 'IN'
                        ? [FinancialAccountRole.INVENTORY_ACCOUNT, FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT]
                        : [FinancialAccountRole.EXPENSE_ACCOUNT, FinancialAccountRole.INVENTORY_ACCOUNT],
                    optionalRoles: [FinancialAccountRole.SUSPENSE_ACCOUNT],
                });

                if (!resolution.success) {
                    throw this.buildResolutionError(index, resolution.missingRoles.map((m) => m.role));
                }

                const inventory = resolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ACCOUNT];
                const gain = resolution.resolvedAccounts[FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT];
                const loss = resolution.resolvedAccounts[FinancialAccountRole.EXPENSE_ACCOUNT];

                if (adjustmentDirection === 'IN') {
                    if (!inventory || !gain) {
                        throw this.buildResolutionError(index, [
                            FinancialAccountRole.INVENTORY_ACCOUNT,
                            FinancialAccountRole.INVENTORY_ADJUSTMENT_ACCOUNT,
                        ]);
                    }

                    this.addToBucket(bucket, {
                        accountId: inventory.accountId,
                        description: `Adjustment gain ${docNo}`,
                        debit: amount,
                        credit: 0,
                        currencyCode,
                        exchangeRate,
                        branchId: input.branchId,
                        ...baseDimensions,
                        warehouseId,
                    });

                    this.addToBucket(bucket, {
                        accountId: gain.accountId,
                        description: `Adjustment offset ${docNo}`,
                        debit: 0,
                        credit: amount,
                        currencyCode,
                        exchangeRate,
                        branchId: input.branchId,
                        ...baseDimensions,
                        warehouseId,
                    });
                } else {
                    if (!inventory || !loss) {
                        throw this.buildResolutionError(index, [
                            FinancialAccountRole.EXPENSE_ACCOUNT,
                            FinancialAccountRole.INVENTORY_ACCOUNT,
                        ]);
                    }

                    this.addToBucket(bucket, {
                        accountId: loss.accountId,
                        description: `Adjustment loss ${docNo}`,
                        debit: amount,
                        credit: 0,
                        currencyCode,
                        exchangeRate,
                        branchId: input.branchId,
                        ...baseDimensions,
                        warehouseId,
                    });

                    this.addToBucket(bucket, {
                        accountId: inventory.accountId,
                        description: `Adjustment inventory out ${docNo}`,
                        debit: 0,
                        credit: amount,
                        currencyCode,
                        exchangeRate,
                        branchId: input.branchId,
                        ...baseDimensions,
                        warehouseId,
                    });
                }
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
            return {
                command: null,
                requiresFinancialPosting: false,
            };
        }

        const totalDebit = this.roundAmount(postingLines.reduce((sum, line) => sum + line.debit, 0));
        const totalCredit = this.roundAmount(postingLines.reduce((sum, line) => sum + line.credit, 0));

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new DomainError('VALIDATION_ERROR', 'Inventory posting command is not balanced', {
                messageKey: 'error.journal.post.unbalanced',
                details: {
                    totalDebit,
                    totalCredit,
                },
            });
        }

        return {
            command: {
                companyId: input.companyId,
                branchId: input.branchId,
                journalDate: docDate,
                sourceType: input.header.docType,
                sourceId: input.header.id,
                sourceNo: docNo,
                sourceVersion: Number(input.sourceVersion || 1),
                referenceNo: input.header.referenceNo || docNo,
                description: `Inventory ${input.header.docType} ${docNo}`,
                currencyCode,
                exchangeRate,
                totalDebit,
                totalCredit,
                postedBy: input.userId,
                lines: postingLines as PostingLineInput[],
            },
            requiresFinancialPosting: true,
        };
    }

    private resolveAdjustmentDirection(
        header: InventoryDocumentHeaderEntity,
        line: InventoryDocumentLineEntity,
    ): InventoryAdjustmentDirection {
        const explicitDirection = String(line.adjustmentDirection || '').trim().toUpperCase();
        if (explicitDirection === 'IN') return 'IN';
        if (explicitDirection === 'OUT') return 'OUT';

        const fromWarehouse = this.normalizeNullableId(line.fromWarehouseId || header.warehouseId);
        const toWarehouse = this.normalizeNullableId(line.toWarehouseId || header.toWarehouseId);
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

    private buildResolutionError(lineIndex: number, requiredRoles: FinancialAccountRole[]): DomainError {
        return new DomainError('VALIDATION_ERROR', `Account resolution failed for inventory document line ${lineIndex + 1}`, {
            messageKey: 'error.account_resolution.mapping_not_found',
            details: {
                lineNo: lineIndex + 1,
                requiredRoles,
            },
        });
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

    private normalizeNullableId(value: string | null | undefined): string | null {
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
