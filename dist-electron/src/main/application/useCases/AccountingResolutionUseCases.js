"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingResolutionUseCases = void 0;
const errors_1 = require("../../domain/errors");
const FinancialDefinitionEntity_1 = require("../../domain/accountingResolution/entities/FinancialDefinitionEntity");
const FinancialAccountRole_1 = require("../../domain/accountingResolution/enums/FinancialAccountRole");
const FinancialDefinitionOwnerType_1 = require("../../domain/accountingResolution/enums/FinancialDefinitionOwnerType");
const ResolutionDirection_1 = require("../../domain/accountingResolution/enums/ResolutionDirection");
const AccountResolutionEngine_1 = require("../../domain/accountingResolution/services/AccountResolutionEngine");
const AccountResolutionPrecedence_1 = require("../../domain/accountingResolution/services/AccountResolutionPrecedence");
const DocumentResolutionPresets_1 = require("../../domain/accountingResolution/services/DocumentResolutionPresets");
class AccountingResolutionUseCases {
    constructor(repository, accountResolutionEngine) {
        this.repository = repository;
        this.engine = accountResolutionEngine || new AccountResolutionEngine_1.AccountResolutionEngine();
    }
    async listFinancialDefinitionsByOwner(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const ownerType = this.normalizeOwnerType(input.ownerType);
        const ownerId = this.normalizeOwnerId(input.ownerId);
        const rows = await this.repository.listFinancialDefinitionsByOwner(companyId, ownerType, ownerId, Boolean(input.includeInactive));
        const accountIds = Array.from(new Set(rows.map((row) => row.accountId)));
        const accounts = await this.repository.getAccountsByIds(companyId, accountIds);
        const accountById = new Map(accounts.map((account) => [account.id, account]));
        return rows.map((row) => this.toDefinitionDto(row, accountById.get(row.accountId) || null));
    }
    async upsertFinancialDefinition(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const ownerType = this.normalizeOwnerType(input.ownerType);
        const ownerId = this.normalizeOwnerId(input.ownerId);
        const accountRole = this.normalizeAccountRole(input.accountRole);
        const accountId = String(input.accountId || '').trim();
        if (!accountId) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ACCOUNT_REQUIRED', 'Account is required', {
                messageKey: 'error.financial_definition.account.required',
            });
        }
        const account = await this.repository.getAccountById(companyId, accountId);
        if (!account) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ACCOUNT_NOT_FOUND', `Account ${accountId} was not found`, {
                messageKey: 'error.financial_definition.account.not_found',
                details: { accountId },
            });
        }
        if (!account.isPosting) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ACCOUNT_NOT_POSTING', 'Account must be posting', {
                messageKey: 'error.financial_definition.account.must_be_posting',
                details: { accountId: account.id, code: account.code },
            });
        }
        if (!input.allowInactiveAccount && !account.isActive) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ACCOUNT_INACTIVE', 'Inactive accounts are not allowed', {
                messageKey: 'error.financial_definition.account.inactive_not_allowed',
                details: { accountId: account.id, code: account.code },
            });
        }
        this.assertSubledgerControlRule(accountRole, account.systemTag, account.allowManualEntry);
        const existingByOwnerRole = await this.repository.findFinancialDefinitionByOwnerRole(companyId, ownerType, ownerId, accountRole);
        const explicitId = String(input.id || '').trim() || null;
        const id = explicitId || existingByOwnerRole?.id || this.repository.nextIdentity();
        const existing = explicitId
            ? await this.repository.findFinancialDefinition(companyId, explicitId)
            : existingByOwnerRole;
        if (explicitId && !existing) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_NOT_FOUND', `Financial definition ${explicitId} not found`, {
                messageKey: 'error.financial_definition.not_found',
            });
        }
        const entity = FinancialDefinitionEntity_1.FinancialDefinitionEntity.create({
            id,
            companyId,
            ownerType,
            ownerId,
            accountRole,
            accountId: account.id,
            notes: input.notes || null,
            isActive: input.isActive !== false,
            createdAt: existing?.createdAt,
        });
        if (existing) {
            await this.repository.updateFinancialDefinition(entity);
        }
        else {
            await this.repository.createFinancialDefinition(entity);
        }
        return this.toDefinitionDto(entity, account);
    }
    async bulkSaveFinancialDefinitionsForOwner(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const ownerType = this.normalizeOwnerType(input.ownerType);
        const ownerId = this.normalizeOwnerId(input.ownerId);
        const deactivateMissing = input.deactivateMissing !== false;
        const saved = [];
        const incomingRoles = new Set();
        for (const row of input.definitions || []) {
            const accountRole = this.normalizeAccountRole(row.accountRole);
            incomingRoles.add(accountRole);
            const savedRow = await this.upsertFinancialDefinition(companyId, {
                id: row.id,
                companyId,
                ownerType,
                ownerId,
                accountRole,
                accountId: row.accountId,
                notes: row.notes || null,
                isActive: row.isActive !== false,
                allowInactiveAccount: row.allowInactiveAccount,
            });
            saved.push(savedRow);
        }
        let deactivatedCount = 0;
        if (deactivateMissing) {
            const existing = await this.repository.listFinancialDefinitionsByOwner(companyId, ownerType, ownerId, false);
            for (const row of existing) {
                if (!incomingRoles.has(row.accountRole)) {
                    await this.repository.deactivateFinancialDefinition(companyId, row.id);
                    deactivatedCount += 1;
                }
            }
        }
        return {
            ownerType,
            ownerId,
            saved,
            deactivatedCount,
        };
    }
    async deactivateFinancialDefinition(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const id = String(input.id || '').trim();
        if (!id) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ID_REQUIRED', 'Financial definition id is required', {
                messageKey: 'error.financial_definition.id.required',
            });
        }
        await this.repository.deactivateFinancialDefinition(companyId, id);
        return { success: true };
    }
    async resolveRequiredAccounts(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const context = this.normalizeContext(input, companyId);
        const needs = {
            requiredRoles: this.normalizeRoleArray(input.requiredRoles || []),
            optionalRoles: this.normalizeRoleArray(input.optionalRoles || []),
        };
        const candidateOwners = this.collectOwnerCandidates(context, [
            ...needs.requiredRoles,
            ...(needs.optionalRoles || []),
        ]);
        const definitions = await this.repository.resolveDefinitionsByOwners({
            companyId,
            owners: candidateOwners,
            accountRoles: Array.from(new Set([...needs.requiredRoles, ...(needs.optionalRoles || [])])),
            includeInactive: false,
        });
        const accountIds = Array.from(new Set(definitions.map((definition) => definition.accountId)));
        const accounts = await this.repository.getAccountsByIds(companyId, accountIds);
        const accountsById = new Map(accounts.map((account) => [account.id, account]));
        return this.engine.resolve({
            context,
            needs,
            definitions,
            accountsById,
        });
    }
    async previewSalesInvoice(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const context = {
            companyId,
            branchId: this.normalizeNullable(input.branchId),
            documentType: String(input.documentType || 'SALES_INVOICE').trim().toUpperCase(),
            lineType: this.normalizeNullable(input.lineType),
            itemId: this.normalizeNullable(input.itemId),
            itemGroupId: this.normalizeNullable(input.itemGroupId),
            warehouseId: this.normalizeNullable(input.warehouseId),
            partnerId: this.normalizeNullable(input.partnerId),
            taxProfileId: this.normalizeNullable(input.taxProfileId),
            isService: Boolean(input.isService),
            requiresInventory: Boolean(input.requiresInventory),
            requiresTax: Boolean(input.requiresTax),
            currencyCode: this.normalizeNullable(input.currencyCode),
            direction: ResolutionDirection_1.ResolutionDirection.SALE,
        };
        const needs = (0, DocumentResolutionPresets_1.getSalesInvoiceRequiredRoles)(context);
        return this.resolveRequiredAccounts(companyId, {
            ...context,
            requiredRoles: needs.requiredRoles,
            optionalRoles: needs.optionalRoles,
        });
    }
    async previewPurchaseInvoice(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const context = {
            companyId,
            branchId: this.normalizeNullable(input.branchId),
            documentType: String(input.documentType || 'PURCHASE_INVOICE').trim().toUpperCase(),
            lineType: this.normalizeNullable(input.lineType),
            itemId: this.normalizeNullable(input.itemId),
            itemGroupId: this.normalizeNullable(input.itemGroupId),
            warehouseId: this.normalizeNullable(input.warehouseId),
            partnerId: this.normalizeNullable(input.partnerId),
            taxProfileId: this.normalizeNullable(input.taxProfileId),
            isService: Boolean(input.isService),
            requiresInventory: Boolean(input.requiresInventory),
            requiresTax: Boolean(input.requiresTax),
            currencyCode: this.normalizeNullable(input.currencyCode),
            direction: ResolutionDirection_1.ResolutionDirection.PURCHASE,
        };
        const needs = (0, DocumentResolutionPresets_1.getPurchaseInvoiceRequiredRoles)(context);
        return this.resolveRequiredAccounts(companyId, {
            ...context,
            requiredRoles: needs.requiredRoles,
            optionalRoles: needs.optionalRoles,
        });
    }
    async previewInventoryAdjustment(authenticatedCompanyId, input) {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const context = {
            companyId,
            branchId: this.normalizeNullable(input.branchId),
            documentType: String(input.documentType || 'INVENTORY_ADJUSTMENT').trim().toUpperCase(),
            lineType: this.normalizeNullable(input.lineType),
            itemId: this.normalizeNullable(input.itemId),
            itemGroupId: this.normalizeNullable(input.itemGroupId),
            warehouseId: this.normalizeNullable(input.warehouseId),
            partnerId: this.normalizeNullable(input.partnerId),
            taxProfileId: this.normalizeNullable(input.taxProfileId),
            isService: false,
            requiresInventory: true,
            requiresTax: false,
            currencyCode: this.normalizeNullable(input.currencyCode),
            direction: ResolutionDirection_1.ResolutionDirection.ADJUSTMENT,
        };
        const needs = (0, DocumentResolutionPresets_1.getInventoryAdjustmentRequiredRoles)(context);
        return this.resolveRequiredAccounts(companyId, {
            ...context,
            requiredRoles: needs.requiredRoles,
            optionalRoles: needs.optionalRoles,
        });
    }
    validateResolutionResult(result) {
        if (result.success) {
            return { isValid: true, errors: [] };
        }
        return {
            isValid: false,
            errors: result.missingRoles.map((missing) => ({
                role: missing.role,
                reason: missing.reason,
                attemptedOwnerScopes: missing.attemptedOwnerScopes.map((owner) => `${owner.ownerType}:${owner.ownerId}`),
            })),
        };
    }
    collectOwnerCandidates(context, roles) {
        const ownerMap = new Map();
        for (const role of roles) {
            const precedence = (0, AccountResolutionPrecedence_1.getPrecedenceForRole)(role);
            for (const ownerType of precedence) {
                const ids = this.buildOwnerIds(context, ownerType);
                if (!ids.length)
                    continue;
                if (!ownerMap.has(ownerType)) {
                    ownerMap.set(ownerType, new Set());
                }
                const set = ownerMap.get(ownerType);
                if (!set)
                    continue;
                for (const id of ids) {
                    set.add(id);
                }
            }
        }
        return Array.from(ownerMap.entries()).map(([ownerType, ids]) => ({
            ownerType,
            ownerIds: Array.from(ids),
        }));
    }
    buildOwnerIds(context, ownerType) {
        switch (ownerType) {
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.ITEM:
                return this.single(context.itemId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.ITEM_GROUP:
                return this.single(context.itemGroupId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.WAREHOUSE:
                return this.single(context.warehouseId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.PARTNER:
                return this.single(context.partnerId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.TAX_PROFILE:
                return this.single(context.taxProfileId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.BRANCH:
                return this.single(context.branchId);
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.DOCUMENT_TYPE_DEFAULT: {
                const docType = String(context.documentType || '').trim().toUpperCase();
                const lineType = String(context.lineType || '').trim().toUpperCase();
                const ids = [];
                if (docType && lineType)
                    ids.push(`${docType}:${lineType}`);
                if (docType)
                    ids.push(docType);
                return ids;
            }
            case FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType.COMPANY:
                return ['DEFAULT', String(context.companyId || '').trim()].filter(Boolean);
            default:
                return [];
        }
    }
    single(value) {
        const normalized = this.normalizeNullable(value);
        return normalized ? [normalized] : [];
    }
    normalizeContext(input, companyId) {
        const documentType = String(input.documentType || '').trim().toUpperCase();
        if (!documentType) {
            throw new errors_1.DomainError('ERR_RESOLUTION_DOCUMENT_TYPE_REQUIRED', 'Document type is required', {
                messageKey: 'error.account_resolution.document_type.required',
            });
        }
        return {
            companyId,
            branchId: this.normalizeNullable(input.branchId),
            documentType,
            documentId: this.normalizeNullable(input.documentId),
            lineType: this.normalizeNullable(input.lineType),
            itemId: this.normalizeNullable(input.itemId),
            itemGroupId: this.normalizeNullable(input.itemGroupId),
            warehouseId: this.normalizeNullable(input.warehouseId),
            partnerId: this.normalizeNullable(input.partnerId),
            taxProfileId: this.normalizeNullable(input.taxProfileId),
            isService: Boolean(input.isService),
            inventoryMode: this.normalizeNullable(input.inventoryMode),
            requiresInventory: Boolean(input.requiresInventory),
            requiresTax: Boolean(input.requiresTax),
            currencyCode: this.normalizeNullable(input.currencyCode),
            direction: input.direction || null,
        };
    }
    normalizeOwnerType(ownerType) {
        if (!Object.values(FinancialDefinitionOwnerType_1.FinancialDefinitionOwnerType).includes(ownerType)) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_OWNER_TYPE_INVALID', 'Owner type is invalid', {
                messageKey: 'error.financial_definition.owner_type.invalid',
            });
        }
        return ownerType;
    }
    normalizeOwnerId(ownerId) {
        const normalized = String(ownerId || '').trim();
        if (!normalized) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_OWNER_ID_REQUIRED', 'Owner id is required', {
                messageKey: 'error.financial_definition.owner_id.required',
            });
        }
        return normalized;
    }
    normalizeAccountRole(role) {
        if (!Object.values(FinancialAccountRole_1.FinancialAccountRole).includes(role)) {
            throw new errors_1.DomainError('ERR_FIN_DEFINITION_ACCOUNT_ROLE_INVALID', 'Account role is invalid', {
                messageKey: 'error.financial_definition.account_role.invalid',
                details: { role },
            });
        }
        return role;
    }
    normalizeRoleArray(roles) {
        const output = [];
        const seen = new Set();
        for (const role of roles || []) {
            const normalized = this.normalizeAccountRole(role);
            if (seen.has(normalized))
                continue;
            seen.add(normalized);
            output.push(normalized);
        }
        return output;
    }
    normalizeNullable(value) {
        const normalized = String(value || '').trim();
        return normalized || null;
    }
    assertCompanyScope(authenticatedCompanyId, payloadCompanyId) {
        const authCompanyId = String(authenticatedCompanyId || '').trim();
        const requestCompanyId = String(payloadCompanyId || '').trim();
        if (!authCompanyId || !requestCompanyId || authCompanyId !== requestCompanyId) {
            throw new errors_1.DomainError('ERR_SCOPE_INVALID', 'Company scope mismatch', {
                messageKey: 'error.scope.invalid',
                details: { authCompanyId, requestCompanyId },
            });
        }
        return requestCompanyId;
    }
    assertSubledgerControlRule(accountRole, systemTag, allowManualEntry) {
        if (accountRole === FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT) {
            if (systemTag !== 'AR_CONTROL' || allowManualEntry) {
                throw new errors_1.DomainError('ERR_FIN_DEFINITION_AR_CONTROL_REQUIRED', 'Receivable role must reference AR control account (subledger-ready, non-manual)', {
                    messageKey: 'error.financial_definition.receivable.ar_control_required',
                    details: { systemTag, allowManualEntry },
                });
            }
        }
        if (accountRole === FinancialAccountRole_1.FinancialAccountRole.PAYABLE_ACCOUNT) {
            if (systemTag !== 'AP_CONTROL' || allowManualEntry) {
                throw new errors_1.DomainError('ERR_FIN_DEFINITION_AP_CONTROL_REQUIRED', 'Payable role must reference AP control account (subledger-ready, non-manual)', {
                    messageKey: 'error.financial_definition.payable.ap_control_required',
                    details: { systemTag, allowManualEntry },
                });
            }
        }
    }
    toDefinitionDto(definition, account) {
        return {
            id: definition.id,
            companyId: definition.companyId,
            ownerType: definition.ownerType,
            ownerId: definition.ownerId,
            accountRole: definition.accountRole,
            accountId: definition.accountId,
            accountCode: account?.code || null,
            accountName: account?.name || null,
            notes: definition.notes,
            isActive: definition.isActive,
            createdAt: definition.createdAt,
            updatedAt: definition.updatedAt,
        };
    }
}
exports.AccountingResolutionUseCases = AccountingResolutionUseCases;
