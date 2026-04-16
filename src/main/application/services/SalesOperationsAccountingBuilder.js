"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesOperationsAccountingBuilder = void 0;
const errors_1 = require("../../domain/errors");
const FinancialAccountRole_1 = require("../../domain/accountingResolution/enums/FinancialAccountRole");
const ResolutionDirection_1 = require("../../domain/accountingResolution/enums/ResolutionDirection");
const EPSILON = 0.000001;
class SalesOperationsAccountingBuilder {
    constructor(accountResolutionUseCases, repository) {
        this.accountResolutionUseCases = accountResolutionUseCases;
        this.repository = repository;
    }
    async buildDeliveryCostJournal(input) {
        return this.buildCostJournal(input, {
            sourceType: 'DELIVERY_NOTE',
            descriptionPrefix: 'Sales delivery cost',
            lineType: 'DELIVERY_COGS',
            direction: ResolutionDirection_1.ResolutionDirection.SALE,
            isReturn: false,
        });
    }
    async buildReturnCostJournal(input) {
        return this.buildCostJournal(input, {
            sourceType: 'SALES_RETURN',
            descriptionPrefix: 'Sales return cost reversal',
            lineType: 'RETURN_COGS',
            direction: ResolutionDirection_1.ResolutionDirection.RETURN,
            isReturn: true,
        });
    }
    async buildCostJournal(input, config) {
        const bucket = new Map();
        const currencyCode = this.repository.resolveCurrencyCode(input.header.currencyCode);
        const exchangeRate = this.toRate(input.header.currencyRate);
        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            const item = this.repository.getItemById(line.itemId);
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
                lineType: config.lineType,
                itemId: line.itemId,
                itemGroupId: item.itemGroupId,
                warehouseId,
                partnerId: input.header.customerId,
                taxProfileId: null,
                isService: false,
                requiresInventory: true,
                requiresTax: false,
                currencyCode,
                direction: config.direction,
                requiredRoles: [FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT, FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT],
                optionalRoles: [],
            });
            if (!resolution.success) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Sales cost posting account resolution failed', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }
            const cogs = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT];
            const inventory = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT];
            if (!cogs || !inventory) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Required COGS/Inventory accounts were not resolved', {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        requiredRoles: [FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT, FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT],
                    },
                });
            }
            const debitAccount = config.isReturn ? inventory.accountId : cogs.accountId;
            const creditAccount = config.isReturn ? cogs.accountId : inventory.accountId;
            const dimensions = {
                branchId: input.branchId,
                costCenterId: this.normalizeNullable(line.costCenterId),
                expenseTypeId: null,
                vehicleId: null,
                partnerId: this.normalizeNullable(line.partnerId || input.header.customerId),
                projectId: this.normalizeNullable(line.projectId),
                itemId: this.normalizeNullable(line.itemId),
                warehouseId,
            };
            this.addToBucket(bucket, {
                accountId: debitAccount,
                description: `${config.descriptionPrefix} ${input.header.docNo}`,
                debit: totalCost,
                credit: 0,
                currencyCode,
                exchangeRate,
                ...dimensions,
            });
            this.addToBucket(bucket, {
                accountId: creditAccount,
                description: `${config.descriptionPrefix} ${input.header.docNo}`,
                debit: 0,
                credit: totalCost,
                currencyCode,
                exchangeRate,
                ...dimensions,
            });
        }
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
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Sales cost journal is not balanced', {
                messageKey: 'error.journal.post.unbalanced',
                details: { totalDebit, totalCredit },
            });
        }
        return {
            companyId: input.companyId,
            branchId: input.branchId,
            journalDate: String(input.header.docDate || '').slice(0, 10),
            sourceType: config.sourceType,
            sourceId: input.header.id,
            sourceNo: input.header.docNo,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: input.header.referenceNo || input.header.docNo,
            description: `${config.descriptionPrefix} ${input.header.docNo}`,
            currencyCode,
            exchangeRate,
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
exports.SalesOperationsAccountingBuilder = SalesOperationsAccountingBuilder;
