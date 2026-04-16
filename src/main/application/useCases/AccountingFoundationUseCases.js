"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingFoundationUseCases = void 0;
const errors_1 = require("../../domain/errors");
const Account_1 = require("../../domain/accountingFoundation/entities/Account");
const FinancialDefinition_1 = require("../../domain/accountingFoundation/entities/FinancialDefinition");
const AccountMappingKey_1 = require("../../domain/accountingFoundation/enums/AccountMappingKey");
const AccountingErrorCode_1 = require("../../domain/accountingFoundation/enums/AccountingErrorCode");
const AccountScopeType_1 = require("../../domain/accountingFoundation/enums/AccountScopeType");
const FinancialDefinitionScopeType_1 = require("../../domain/accountingFoundation/enums/FinancialDefinitionScopeType");
const AccountResolutionEngine_1 = require("../../domain/accountingFoundation/services/AccountResolutionEngine");
const ChartOfAccountsPolicy_1 = require("../../domain/accountingFoundation/services/ChartOfAccountsPolicy");
const FinancialDefinitionPolicy_1 = require("../../domain/accountingFoundation/services/FinancialDefinitionPolicy");
class AccountingFoundationUseCases {
    constructor(accountRepo, definitionRepo) {
        this.accountRepo = accountRepo;
        this.definitionRepo = definitionRepo;
        this.resolutionEngine = new AccountResolutionEngine_1.AccountResolutionEngine();
    }
    async listAccounts(companyId, includeInactive = false) {
        const accounts = await this.accountRepo.list(companyId, includeInactive);
        return accounts.map((account) => this.toAccountDto(account));
    }
    async listPostableAccounts(companyId) {
        const accounts = await this.accountRepo.getPostable(companyId);
        return accounts.map((account) => this.toAccountDto(account));
    }
    async getAccountTree(companyId, includeInactive = false) {
        const accounts = await this.accountRepo.list(companyId, includeInactive);
        const mapById = new Map();
        const roots = [];
        for (const account of accounts) {
            mapById.set(account.id, { ...this.toAccountDto(account), children: [] });
        }
        for (const account of accounts) {
            const node = mapById.get(account.id);
            if (!node)
                continue;
            if (!account.parentId) {
                roots.push(node);
                continue;
            }
            const parent = mapById.get(account.parentId);
            if (parent) {
                parent.children.push(node);
            }
            else {
                roots.push(node);
            }
        }
        const sortNodes = (nodes) => {
            nodes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
            for (const node of nodes) {
                sortNodes(node.children);
            }
        };
        sortNodes(roots);
        return roots;
    }
    async saveAccount(companyId, currentBranchId, input) {
        const normalizedCode = ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.normalizeCode(input.accountCode);
        const existing = input.id ? await this.accountRepo.getById(companyId, input.id) : null;
        const parentId = input.parentId || null;
        const parent = parentId ? await this.accountRepo.getById(companyId, parentId) : null;
        if (parentId && !parent) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_PARENT_NOT_FOUND, `Parent account ${parentId} was not found`, { messageKey: 'error.account.parent.not_found' });
        }
        const duplicate = await this.accountRepo.getByCode(companyId, normalizedCode);
        const accountId = existing ? existing.id : this.accountRepo.nextIdentity();
        if (duplicate && duplicate.id !== accountId) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_CODE_DUPLICATE, `Account code ${normalizedCode} already exists`, { messageKey: 'error.account.code.duplicate' });
        }
        const hasChildren = existing ? await this.accountRepo.hasChildren(companyId, existing.id) : false;
        const wasAlreadyPosting = existing ? Boolean(existing.postingAllowed) : false;
        if (!wasAlreadyPosting) {
            ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.validatePostingInvariant(hasChildren, input.postingAllowed);
        }
        const isStructureChanged = !existing
            || String(existing.parentId || '') !== String(parentId || '')
            || String(existing.accountCode || '').toUpperCase() !== normalizedCode
            || Boolean(existing.postingAllowed) !== Boolean(input.postingAllowed);
        if (isStructureChanged) {
            ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.validatePostingParent(parent, input.postingAllowed);
            ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.validateCodeHierarchy(parent, normalizedCode);
        }
        ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.validateCategoryByType(input.accountType, input.accountCategory);
        ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.validateSubtype(input.accountSubtype);
        ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.assertScope(input.scopeType, input.scopeType === AccountScopeType_1.AccountScopeType.BRANCH ? (input.branchId || currentBranchId) : null);
        ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.validateCurrency(input.currencyBehavior, input.currencyCode || null);
        const resolvedBranchId = input.scopeType === 'BRANCH'
            ? String(input.branchId || currentBranchId || '').trim() || null
            : null;
        const account = Account_1.Account.create({
            id: accountId,
            companyId,
            branchId: resolvedBranchId,
            accountCode: normalizedCode,
            name: String(input.name || '').trim(),
            parentId: parent ? parent.id : null,
            level: ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.deriveLevel(parent),
            accountType: input.accountType,
            accountCategory: input.accountCategory,
            accountSubtype: input.accountSubtype,
            postingAllowed: Boolean(input.postingAllowed),
            currencyBehavior: input.currencyBehavior,
            currencyCode: input.currencyCode ? String(input.currencyCode).trim().toUpperCase() : null,
            scopeType: input.scopeType,
            status: input.status,
            requiresCostCenter: Boolean(input.requiresCostCenter),
            requiresAnalysisCode: Boolean(input.requiresAnalysisCode),
        });
        if (isStructureChanged) {
            ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.validateParentChild(parent, account);
        }
        await this.accountRepo.save(account);
        return this.toAccountDto(account);
    }
    async deleteAccount(companyId, accountId) {
        const account = await this.accountRepo.getById(companyId, accountId);
        if (!account)
            return;
        const hasChildren = await this.accountRepo.hasChildren(companyId, accountId);
        const hasReferences = await this.accountRepo.hasReferences(companyId, accountId);
        ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.assertCanDelete(hasChildren, hasReferences);
        await this.accountRepo.delete(companyId, accountId);
    }
    async setAccountStatus(companyId, accountId, status) {
        const existing = await this.accountRepo.getById(companyId, accountId);
        if (!existing) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_NOT_FOUND, `Account ${accountId} was not found`, { messageKey: 'error.account.not_found' });
        }
        if (existing.status === status) {
            return this.toAccountDto(existing);
        }
        const payload = existing.toJSON();
        const updated = Account_1.Account.rehydrate({
            ...payload,
            status,
        });
        await this.accountRepo.save(updated);
        return this.toAccountDto(updated);
    }
    async listFinancialDefinitions(companyId, includeInactive = false) {
        const definitions = await this.definitionRepo.listDefinitions(companyId, includeInactive);
        return definitions.map((definition) => this.toFinancialDefinitionDto(definition));
    }
    async saveFinancialDefinition(companyId, currentBranchId, input) {
        const account = await this.accountRepo.getById(companyId, input.accountId);
        if (!account) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_MAPPING_NOT_FOUND, `Account ${input.accountId} was not found`, { messageKey: 'error.financial_definition.account.not_found' });
        }
        account.assertCanPost();
        ChartOfAccountsPolicy_1.ChartOfAccountsPolicy.assertActiveForUpdate(account.status);
        FinancialDefinitionPolicy_1.FinancialDefinitionPolicy.assertMappingAccountCompatibility(input.mappingKey, account);
        const definitionId = input.id || this.definitionRepo.nextIdentity();
        const explicitBranchId = String(input.branchId || '').trim() || null;
        const resolvedBranchId = input.scopeType === FinancialDefinitionScopeType_1.FinancialDefinitionScopeType.BRANCH
            ? explicitBranchId || String(currentBranchId || '').trim() || null
            : explicitBranchId;
        const definition = FinancialDefinition_1.FinancialDefinition.create({
            id: definitionId,
            companyId,
            branchId: resolvedBranchId,
            scopeType: input.scopeType,
            scopeId: String(input.scopeId || '').trim(),
            mappingKey: input.mappingKey,
            accountId: input.accountId,
            priority: Number.isFinite(input.priority) ? Number(input.priority) : 100,
            isActive: input.isActive !== false,
            validFrom: input.validFrom || null,
            validTo: input.validTo || null,
            documentType: FinancialDefinitionPolicy_1.FinancialDefinitionPolicy.normalizeQualifier(input.documentType),
            lineType: FinancialDefinitionPolicy_1.FinancialDefinitionPolicy.normalizeQualifier(input.lineType),
            taxProfileId: FinancialDefinitionPolicy_1.FinancialDefinitionPolicy.normalizeQualifier(input.taxProfileId),
            updatedAt: null,
        });
        if (definition.isActive) {
            await this.definitionRepo.deactivateActiveDuplicates({
                companyId,
                branchId: definition.branchId,
                scopeType: definition.scopeType,
                scopeId: definition.scopeId,
                mappingKey: definition.mappingKey,
                documentType: definition.documentType,
                lineType: definition.lineType,
                taxProfileId: definition.taxProfileId,
                excludeId: definition.id,
            });
        }
        await this.definitionRepo.saveDefinition(definition);
        return this.toFinancialDefinitionDto(definition);
    }
    async deleteFinancialDefinition(companyId, definitionId) {
        await this.definitionRepo.deleteDefinition(companyId, definitionId);
    }
    async resolveAccounts(companyId, branchId, input) {
        const normalizedMappingKeys = Array.from(new Set((input.mappingKeys || []).map((key) => String(key || '').trim().toUpperCase()))).filter((key) => Object.values(AccountMappingKey_1.AccountMappingKey).includes(key));
        const context = {
            documentType: String(input.documentType || '').trim().toUpperCase(),
            companyId,
            branchId: branchId || null,
            postingDate: String(input.postingDate || '').trim(),
            itemId: input.itemId || null,
            itemGroupId: input.itemGroupId || null,
            warehouseId: input.warehouseId || null,
            partnerId: input.partnerId || null,
            taxProfileId: FinancialDefinitionPolicy_1.FinancialDefinitionPolicy.normalizeQualifier(input.taxProfileId),
            lineType: FinancialDefinitionPolicy_1.FinancialDefinitionPolicy.normalizeQualifier(input.lineType),
            mappingKeys: normalizedMappingKeys,
        };
        if (!context.documentType) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_RESOLUTION_CONTEXT_INVALID, 'Document type is required', {
                messageKey: 'error.account_resolution.document_type.required',
            });
        }
        if (!context.postingDate) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_RESOLUTION_CONTEXT_INVALID, 'Posting date is required', {
                messageKey: 'error.account_resolution.posting_date.required',
            });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(context.postingDate)) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_RESOLUTION_CONTEXT_INVALID, 'Posting date must be YYYY-MM-DD', {
                messageKey: 'error.account_resolution.posting_date.format_invalid',
            });
        }
        if (!context.mappingKeys.length) {
            throw new errors_1.DomainError(AccountingErrorCode_1.AccountingErrorCode.ERR_ACCOUNT_RESOLUTION_CONTEXT_INVALID, 'At least one mapping key is required', {
                messageKey: 'error.account_resolution.mapping_keys.required',
            });
        }
        const definitions = await this.definitionRepo.listForResolution({
            companyId,
            branchId: context.branchId,
            postingDate: context.postingDate,
            mappingKeys: context.mappingKeys,
            documentType: context.documentType,
            lineType: context.lineType,
            taxProfileId: context.taxProfileId,
            itemId: context.itemId,
            itemGroupId: context.itemGroupId,
            warehouseId: context.warehouseId,
            partnerId: context.partnerId,
        });
        const accountIds = Array.from(new Set(definitions.map((item) => item.accountId)));
        const accounts = await this.accountRepo.getByIds(companyId, accountIds);
        const accountsById = new Map(accounts.map((account) => [
            account.id,
            {
                id: account.id,
                companyId: account.companyId,
                branchId: account.branchId,
                accountCode: account.accountCode,
                accountName: account.name,
                status: account.status,
                postingAllowed: account.postingAllowed,
                scopeType: account.scopeType,
            },
        ]));
        return this.resolutionEngine.resolve({
            context,
            definitions,
            accountsById,
        });
    }
    toAccountDto(account) {
        return {
            id: account.id,
            companyId: account.companyId,
            branchId: account.branchId,
            accountCode: account.accountCode,
            name: account.name,
            parentId: account.parentId,
            level: account.level,
            accountType: account.accountType,
            accountCategory: account.accountCategory,
            accountSubtype: account.accountSubtype,
            postingAllowed: account.postingAllowed,
            currencyBehavior: account.currencyBehavior,
            currencyCode: account.currencyCode,
            scopeType: account.scopeType,
            status: account.status,
            requiresCostCenter: account.requiresCostCenter,
            requiresAnalysisCode: account.requiresAnalysisCode,
        };
    }
    toFinancialDefinitionDto(definition) {
        return {
            id: definition.id,
            companyId: definition.companyId,
            branchId: definition.branchId,
            scopeType: definition.scopeType,
            scopeId: definition.scopeId,
            mappingKey: definition.mappingKey,
            accountId: definition.accountId,
            priority: definition.priority,
            isActive: definition.isActive,
            validFrom: definition.validFrom,
            validTo: definition.validTo,
            documentType: definition.documentType,
            lineType: definition.lineType,
            taxProfileId: definition.taxProfileId,
            updatedAt: definition.updatedAt,
        };
    }
}
exports.AccountingFoundationUseCases = AccountingFoundationUseCases;
