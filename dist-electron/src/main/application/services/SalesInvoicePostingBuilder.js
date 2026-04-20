"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoicePostingBuilder = exports.SALES_JOURNAL_SOURCE_TYPE = exports.SALES_SOURCE_TYPE = exports.SALES_SOURCE_MODULE = void 0;
const errors_1 = require("../../domain/errors");
const FinancialAccountRole_1 = require("../../domain/accountingResolution/enums/FinancialAccountRole");
const ResolutionDirection_1 = require("../../domain/accountingResolution/enums/ResolutionDirection");
const EPSILON = 0.000001;
exports.SALES_SOURCE_MODULE = 'SALES';
exports.SALES_SOURCE_TYPE = 'INVOICE';
exports.SALES_JOURNAL_SOURCE_TYPE = `${exports.SALES_SOURCE_MODULE}_${exports.SALES_SOURCE_TYPE}`;
class SalesInvoicePostingBuilder {
    constructor(accountResolutionUseCases, repository) {
        this.accountResolutionUseCases = accountResolutionUseCases;
        this.repository = repository;
    }
    async build(input) {
        const currencyCode = this.repository.resolveCurrencyCode(input.header.currencyCode);
        const exchangeRate = this.toRate(input.header.currencyRate);
        const invoiceDate = String(input.header.invoiceDate || '').slice(0, 10);
        const invoiceNo = String(input.header.invoiceNo || '').trim();
        if (!invoiceDate) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Invoice date is required for accounting posting', {
                messageKey: 'validation.sales_invoice.date_required',
            });
        }
        if (!invoiceNo) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Invoice number is required for accounting posting', {
                messageKey: 'validation.sales_invoice.invoice_no_required',
            });
        }
        const linesBucket = new Map();
        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            const itemId = this.normalizeNullableId(line.itemId);
            const warehouseId = this.normalizeNullableId(line.warehouseId || input.header.warehouseId);
            const projectId = this.normalizeNullableId(line.projectId || input.header.projectId);
            const costCenterId = this.normalizeNullableId(line.costCenterId || input.header.costCenterId);
            const expenseTypeId = this.normalizeNullableId(line.expenseTypeId || input.header.expenseTypeId);
            const vehicleId = this.normalizeNullableId(line.vehicleId || input.header.vehicleId);
            const partnerId = this.normalizeNullableId(input.header.customerId);
            const itemMeta = itemId ? this.repository.getItemMeta(itemId, warehouseId) : null;
            const isService = !!itemMeta?.isService;
            const itemGroupId = itemMeta?.itemGroupId || null;
            const qty = this.roundAmount(line.qty);
            const unitPrice = this.roundAmount(line.unitPrice);
            const gross = this.roundAmount(qty * unitPrice);
            const discountAmount = this.roundAmount(line.discountAmount);
            const inferredTaxable = this.roundAmount(Math.max(0, gross - discountAmount));
            const taxableAmount = this.roundAmount(line.taxableAmount > 0
                ? line.taxableAmount
                : line.lineSubtotal > 0
                    ? line.lineSubtotal
                    : inferredTaxable);
            const vatAmount = this.roundAmount(Math.max(0, line.vatAmount));
            const lineTotal = this.roundAmount(line.lineTotal > 0
                ? line.lineTotal
                : taxableAmount + vatAmount);
            if (lineTotal <= EPSILON && taxableAmount <= EPSILON && vatAmount <= EPSILON) {
                continue;
            }
            const requiresInventory = input.perpetualInventoryEnabled && !isService && Boolean(itemId);
            const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                companyId: input.companyId,
                branchId: input.branchId,
                documentType: 'SALES_INVOICE',
                documentId: input.header.id,
                lineType: isService ? 'SERVICE' : 'ITEM',
                itemId,
                itemGroupId,
                warehouseId,
                partnerId,
                taxProfileId: null,
                isService,
                requiresInventory,
                requiresTax: vatAmount > EPSILON,
                currencyCode,
                direction: ResolutionDirection_1.ResolutionDirection.SALE,
                requiredRoles: [
                    FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT,
                    ...(isService ? [FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT] : [FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT]),
                    ...(vatAmount > EPSILON ? [FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT] : []),
                    ...(requiresInventory ? [FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT, FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT] : []),
                ],
                optionalRoles: [
                    FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.SALES_DISCOUNT_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT,
                ],
            });
            if (!resolution.success) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Account resolution failed for sales invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    lineNo: index + 1,
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }
            const receivable = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT];
            const revenue = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT] ||
                resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT];
            const vatOutput = vatAmount > EPSILON
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT] || null
                : null;
            const cogs = requiresInventory
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT] || null
                : null;
            const inventory = requiresInventory
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT] || null
                : null;
            if (!receivable) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Missing receivable account for sales invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: { lineNo: index + 1, role: FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT },
                });
            }
            if (!revenue) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Missing revenue account for sales invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: { lineNo: index + 1, role: FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT },
                });
            }
            if (vatAmount > EPSILON && !vatOutput) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Missing VAT output account for sales invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: { lineNo: index + 1, role: FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT },
                });
            }
            if (requiresInventory && (!cogs || !inventory)) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Missing inventory COGS accounts for sales invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        requiredRoles: [FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT, FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT],
                    },
                });
            }
            this.addToBucket(linesBucket, {
                accountId: receivable.accountId,
                description: `Sales invoice ${invoiceNo}`,
                debit: lineTotal,
                credit: 0,
                currencyCode,
                exchangeRate,
                branchId: input.branchId,
                costCenterId,
                expenseTypeId,
                vehicleId,
                partnerId,
                projectId,
                itemId: null,
                warehouseId: null,
            });
            this.addToBucket(linesBucket, {
                accountId: revenue.accountId,
                description: `Sales revenue ${invoiceNo}`,
                debit: 0,
                credit: taxableAmount,
                currencyCode,
                exchangeRate,
                branchId: input.branchId,
                costCenterId,
                expenseTypeId,
                vehicleId,
                partnerId,
                projectId,
                itemId,
                warehouseId,
            });
            if (vatAmount > EPSILON && vatOutput) {
                this.addToBucket(linesBucket, {
                    accountId: vatOutput.accountId,
                    description: `Sales VAT output ${invoiceNo}`,
                    debit: 0,
                    credit: vatAmount,
                    currencyCode,
                    exchangeRate,
                    branchId: input.branchId,
                    costCenterId,
                    expenseTypeId,
                    vehicleId,
                    partnerId,
                    projectId,
                    itemId,
                    warehouseId,
                });
            }
            if (requiresInventory && cogs && inventory) {
                const lineCostAmount = this.resolveLineCostAmount(line.costAmount, itemMeta?.costAmount || 0, qty);
                if (lineCostAmount > EPSILON) {
                    this.addToBucket(linesBucket, {
                        accountId: cogs.accountId,
                        description: `Sales COGS ${invoiceNo}`,
                        debit: lineCostAmount,
                        credit: 0,
                        currencyCode,
                        exchangeRate,
                        branchId: input.branchId,
                        costCenterId,
                        expenseTypeId,
                        vehicleId,
                        partnerId,
                        projectId,
                        itemId,
                        warehouseId,
                    });
                    this.addToBucket(linesBucket, {
                        accountId: inventory.accountId,
                        description: `Sales inventory out ${invoiceNo}`,
                        debit: 0,
                        credit: lineCostAmount,
                        currencyCode,
                        exchangeRate,
                        branchId: input.branchId,
                        costCenterId,
                        expenseTypeId,
                        vehicleId,
                        partnerId,
                        projectId,
                        itemId,
                        warehouseId,
                    });
                }
            }
        }
        const postingLines = Array.from(linesBucket.values())
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
            throw new errors_1.DomainError('VALIDATION_ERROR', 'No accounting lines generated for sales invoice', {
                messageKey: 'validation.sales_invoice.lines_required',
            });
        }
        const totalDebit = this.roundAmount(postingLines.reduce((sum, line) => sum + line.debit, 0));
        const totalCredit = this.roundAmount(postingLines.reduce((sum, line) => sum + line.credit, 0));
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Sales invoice posting command is not balanced', {
                messageKey: 'error.journal.post.unbalanced',
                details: {
                    totalDebit,
                    totalCredit,
                },
            });
        }
        return {
            companyId: input.companyId,
            branchId: input.branchId,
            journalDate: invoiceDate,
            sourceType: exports.SALES_JOURNAL_SOURCE_TYPE,
            sourceId: input.header.id,
            sourceNo: invoiceNo,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: invoiceNo,
            description: `Sales invoice ${invoiceNo}`,
            currencyCode,
            exchangeRate,
            totalDebit,
            totalCredit,
            postedBy: input.userId,
            lines: postingLines,
        };
    }
    addToBucket(bucket, entry) {
        const debit = this.roundAmount(entry.debit);
        const credit = this.roundAmount(entry.credit);
        if (debit <= EPSILON && credit <= EPSILON)
            return;
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
    resolveLineCostAmount(explicitCostAmount, fallbackUnitCost, qty) {
        const direct = this.roundAmount(explicitCostAmount);
        if (direct > EPSILON)
            return direct;
        const inferred = this.roundAmount(this.roundAmount(fallbackUnitCost) * this.roundAmount(qty));
        return inferred > EPSILON ? inferred : 0;
    }
    normalizeNullableId(value) {
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
exports.SalesInvoicePostingBuilder = SalesInvoicePostingBuilder;
