"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseInvoicePostingBuilder = exports.PURCHASE_JOURNAL_SOURCE_TYPE = exports.PURCHASE_SOURCE_TYPE = exports.PURCHASE_SOURCE_MODULE = void 0;
const errors_1 = require("../../domain/errors");
const FinancialAccountRole_1 = require("../../domain/accountingResolution/enums/FinancialAccountRole");
const ResolutionDirection_1 = require("../../domain/accountingResolution/enums/ResolutionDirection");
const EPSILON = 0.000001;
exports.PURCHASE_SOURCE_MODULE = 'PURCHASE';
exports.PURCHASE_SOURCE_TYPE = 'INVOICE';
exports.PURCHASE_JOURNAL_SOURCE_TYPE = `${exports.PURCHASE_SOURCE_MODULE}_${exports.PURCHASE_SOURCE_TYPE}`;
class PurchaseInvoicePostingBuilder {
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
                messageKey: 'validation.purchase_invoice.date_required',
            });
        }
        if (!invoiceNo) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Invoice number is required for accounting posting', {
                messageKey: 'validation.purchase_invoice.invoice_no_required',
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
            const partnerId = this.normalizeNullableId(input.header.vendorId);
            const itemMeta = itemId ? this.repository.getItemMeta(itemId) : null;
            const isServiceByItem = Boolean(itemMeta?.isService);
            const explicitLineType = String(line.lineType || '').trim().toUpperCase();
            const effectiveLineType = isServiceByItem
                ? 'SERVICE'
                : explicitLineType === 'SERVICE'
                    ? 'SERVICE'
                    : explicitLineType === 'EXPENSE'
                        ? 'EXPENSE'
                        : 'INVENTORY';
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
            const requiresInventory = input.perpetualInventoryEnabled
                && effectiveLineType === 'INVENTORY'
                && Boolean(itemId);
            const resolution = await this.accountResolutionUseCases.resolveRequiredAccounts(input.companyId, {
                companyId: input.companyId,
                branchId: input.branchId,
                documentType: 'PURCHASE_INVOICE',
                documentId: input.header.id,
                lineType: effectiveLineType,
                itemId,
                itemGroupId: itemMeta?.itemGroupId || null,
                warehouseId,
                partnerId,
                taxProfileId: null,
                isService: effectiveLineType === 'SERVICE',
                requiresInventory,
                requiresTax: vatAmount > EPSILON,
                currencyCode,
                direction: ResolutionDirection_1.ResolutionDirection.PURCHASE,
                requiredRoles: [
                    FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT,
                    ...(requiresInventory ? [FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT] : [FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT]),
                    ...(vatAmount > EPSILON ? [FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT] : []),
                ],
                optionalRoles: [
                    FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.PURCHASE_DISCOUNT_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.FREIGHT_IN_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT,
                ],
            });
            if (!resolution.success) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Account resolution failed for purchase invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: {
                        lineNo: index + 1,
                        missingRoles: resolution.missingRoles,
                    },
                });
            }
            const payable = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT];
            const inventory = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT];
            const expense = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT];
            const vatInput = vatAmount > EPSILON
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT] || null
                : null;
            if (!payable) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Missing payable account for purchase invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: { lineNo: index + 1, role: FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT },
                });
            }
            const costAccount = requiresInventory ? inventory : expense;
            const expectedCostRole = requiresInventory
                ? FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT
                : FinancialAccountRole_1.FinancialAccountRole.EXPENSE_ACCOUNT;
            if (!costAccount) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Missing cost account for purchase invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: { lineNo: index + 1, role: expectedCostRole },
                });
            }
            if (vatAmount > EPSILON && !vatInput) {
                throw new errors_1.DomainError('VALIDATION_ERROR', `Missing VAT input account for purchase invoice line ${index + 1}`, {
                    messageKey: 'error.account_resolution.mapping_not_found',
                    details: { lineNo: index + 1, role: FinancialAccountRole_1.FinancialAccountRole.VAT_INPUT_ACCOUNT },
                });
            }
            this.addToBucket(linesBucket, {
                accountId: costAccount.accountId,
                description: requiresInventory
                    ? `Purchase inventory ${invoiceNo}`
                    : `Purchase expense ${invoiceNo}`,
                debit: taxableAmount,
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
            if (vatAmount > EPSILON && vatInput) {
                this.addToBucket(linesBucket, {
                    accountId: vatInput.accountId,
                    description: `Purchase VAT input ${invoiceNo}`,
                    debit: vatAmount,
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
            }
            this.addToBucket(linesBucket, {
                accountId: payable.accountId,
                description: `Purchase payable ${invoiceNo}`,
                debit: 0,
                credit: lineTotal,
                currencyCode,
                exchangeRate,
                branchId: input.branchId,
                costCenterId: null,
                expenseTypeId: null,
                vehicleId: null,
                partnerId,
                projectId: null,
                itemId: null,
                warehouseId: null,
            });
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
            throw new errors_1.DomainError('VALIDATION_ERROR', 'No accounting lines generated for purchase invoice', {
                messageKey: 'validation.purchase_invoice.lines_required',
            });
        }
        const totalDebit = this.roundAmount(postingLines.reduce((sum, line) => sum + line.debit, 0));
        const totalCredit = this.roundAmount(postingLines.reduce((sum, line) => sum + line.credit, 0));
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Purchase invoice posting command is not balanced', {
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
            sourceType: exports.PURCHASE_JOURNAL_SOURCE_TYPE,
            sourceId: input.header.id,
            sourceNo: invoiceNo,
            sourceVersion: Number(input.sourceVersion || 1),
            referenceNo: invoiceNo,
            description: `Purchase invoice ${invoiceNo}`,
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
exports.PurchaseInvoicePostingBuilder = PurchaseInvoicePostingBuilder;
