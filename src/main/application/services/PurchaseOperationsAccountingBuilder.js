"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOperationsAccountingBuilder = void 0;
const errors_1 = require("../../domain/errors");
const FinancialAccountRole_1 = require("../../domain/accountingResolution/enums/FinancialAccountRole");
const ResolutionDirection_1 = require("../../domain/accountingResolution/enums/ResolutionDirection");
const EPSILON = 0.000001;
class PurchaseOperationsAccountingBuilder {
    constructor(accountResolutionUseCases, repository) {
        this.accountResolutionUseCases = accountResolutionUseCases;
        this.repository = repository;
    }
    async buildReceiptJournal(input) {
        const bucket = new Map();
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
            if (!item || !item.isStockItem)
                continue;
            const warehouseId = this.normalizeNullable(line.warehouseId || input.header.warehouseId);
            const qty = this.round(line.qty);
            const unitCost = this.round(line.unitCost ?? item.defaultUnitCost);
            const totalCost = this.round(qty * unitCost);
            if (totalCost <= EPSILON)
                continue;
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
                direction: ResolutionDirection_1.ResolutionDirection.PURCHASE,
                requiredRoles: [FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT, FinancialAccountRole_1.FinancialAccountRole.SUSPENSE_ACCOUNT],
                optionalRoles: [FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT],
            });
            if (!resolution.success) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Purchase receipt account resolution failed', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }
            const inventory = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT];
            const clearing = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.SUSPENSE_ACCOUNT]
                || resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT]
                || null;
            if (!inventory || !clearing) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Required inventory/GRNI accounts were not resolved', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        requiredRoles: [FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT, FinancialAccountRole_1.FinancialAccountRole.SUSPENSE_ACCOUNT],
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
    async buildReturnJournal(input) {
        const bucket = new Map();
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
            if (!item || !item.isStockItem)
                continue;
            const warehouseId = this.normalizeNullable(line.warehouseId || input.header.warehouseId);
            const qty = this.round(line.qty);
            const unitCost = this.round(line.unitCost ?? item.defaultUnitCost);
            const totalCost = this.round(qty * unitCost);
            if (totalCost <= EPSILON)
                continue;
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
                direction: ResolutionDirection_1.ResolutionDirection.RETURN,
                requiredRoles: [FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT],
                optionalRoles: [
                    FinancialAccountRole_1.FinancialAccountRole.PURCHASE_RETURN_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.SUSPENSE_ACCOUNT,
                ],
            });
            if (!resolution.success) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Purchase return account resolution failed', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }
            const inventory = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT] || null;
            const returnClearing = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.PURCHASE_RETURN_ACCOUNT]
                || resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT]
                || resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.SUSPENSE_ACCOUNT]
                || null;
            if (!inventory || !returnClearing) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Required inventory return accounts were not resolved', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        requiredRoles: [
                            FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT,
                            FinancialAccountRole_1.FinancialAccountRole.PURCHASE_RETURN_ACCOUNT,
                            FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT,
                            FinancialAccountRole_1.FinancialAccountRole.SUSPENSE_ACCOUNT,
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
    buildJournalFromBucket(bucket, input) {
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
        if (!lines.length)
            return null;
        const totalDebit = this.round(lines.reduce((sum, line) => sum + line.debit, 0));
        const totalCredit = this.round(lines.reduce((sum, line) => sum + line.credit, 0));
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Purchase operations journal is not balanced', {
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
            lines: lines,
        };
    }
    addToBucket(bucket, entry) {
        const debit = this.round(entry.debit);
        const credit = this.round(entry.credit);
        if (debit <= EPSILON && credit <= EPSILON)
            return;
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
    normalizeNullable(value) {
        const normalized = String(value || '').trim();
        return normalized || null;
    }
    normalizeRequired(value, message, details) {
        const normalized = this.normalizeNullable(value);
        if (!normalized) {
            throw new errors_1.DomainError('VALIDATION_ERROR', message, {
                messageKey: 'error.validation',
                details,
            });
        }
        return normalized;
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
exports.PurchaseOperationsAccountingBuilder = PurchaseOperationsAccountingBuilder;
