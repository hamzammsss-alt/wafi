import { DomainError } from '../../domain/errors';
import { Account, AccountStatus } from '../../domain/accountingFoundation/entities/Account';
import { FinancialDefinition } from '../../domain/accountingFoundation/entities/FinancialDefinition';
import { AccountMappingKey } from '../../domain/accountingFoundation/enums/AccountMappingKey';
import { AccountingErrorCode } from '../../domain/accountingFoundation/enums/AccountingErrorCode';
import { AccountScopeType } from '../../domain/accountingFoundation/enums/AccountScopeType';
import { FinancialDefinitionScopeType } from '../../domain/accountingFoundation/enums/FinancialDefinitionScopeType';
import { AccountResolutionEngine } from '../../domain/accountingFoundation/services/AccountResolutionEngine';
import { ChartOfAccountsPolicy } from '../../domain/accountingFoundation/services/ChartOfAccountsPolicy';
import { FinancialDefinitionPolicy } from '../../domain/accountingFoundation/services/FinancialDefinitionPolicy';
import { AccountResolutionContext } from '../../domain/accountingFoundation/types/AccountResolutionContext';
import {
    AccountDto,
    AccountTreeNodeDto,
    FinancialDefinitionDto,
    ResolveAccountsInput,
    SaveAccountInput,
    SaveFinancialDefinitionInput,
} from '../dtos/AccountingFoundationDtos';
import { AccountRepositoryPort, FinancialDefinitionRepositoryPort } from '../ports/AccountingFoundationPorts';

export class AccountingFoundationUseCases {
    private readonly resolutionEngine: AccountResolutionEngine;

    constructor(
        private readonly accountRepo: AccountRepositoryPort,
        private readonly definitionRepo: FinancialDefinitionRepositoryPort,
    ) {
        this.resolutionEngine = new AccountResolutionEngine();
    }

    async listAccounts(companyId: string, includeInactive = false): Promise<AccountDto[]> {
        const accounts = await this.accountRepo.list(companyId, includeInactive);
        return accounts.map((account) => this.toAccountDto(account));
    }

    async listPostableAccounts(companyId: string): Promise<AccountDto[]> {
        const accounts = await this.accountRepo.getPostable(companyId);
        return accounts.map((account) => this.toAccountDto(account));
    }

    async getAccountTree(companyId: string, includeInactive = false): Promise<AccountTreeNodeDto[]> {
        const accounts = await this.accountRepo.list(companyId, includeInactive);
        const mapById = new Map<string, AccountTreeNodeDto>();
        const roots: AccountTreeNodeDto[] = [];

        for (const account of accounts) {
            mapById.set(account.id, { ...this.toAccountDto(account), children: [] });
        }

        for (const account of accounts) {
            const node = mapById.get(account.id);
            if (!node) continue;
            if (!account.parentId) {
                roots.push(node);
                continue;
            }
            const parent = mapById.get(account.parentId);
            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }

        const sortNodes = (nodes: AccountTreeNodeDto[]): void => {
            nodes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
            for (const node of nodes) {
                sortNodes(node.children);
            }
        };
        sortNodes(roots);

        return roots;
    }

    async saveAccount(companyId: string, currentBranchId: string, input: SaveAccountInput): Promise<AccountDto> {
        const normalizedCode = ChartOfAccountsPolicy.normalizeCode(input.accountCode);
        const existing = input.id ? await this.accountRepo.getById(companyId, input.id) : null;
        const parentId = input.parentId || null;
        const parent = parentId ? await this.accountRepo.getById(companyId, parentId) : null;

        if (parentId && !parent) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_PARENT_NOT_FOUND,
                `Parent account ${parentId} was not found`,
                { messageKey: 'error.account.parent.not_found' },
            );
        }

        const duplicate = await this.accountRepo.getByCode(companyId, normalizedCode);
        const accountId = existing ? existing.id : this.accountRepo.nextIdentity();
        if (duplicate && duplicate.id !== accountId) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_CODE_DUPLICATE,
                `Account code ${normalizedCode} already exists`,
                { messageKey: 'error.account.code.duplicate' },
            );
        }

        const hasChildren = existing ? await this.accountRepo.hasChildren(companyId, existing.id) : false;
        // Only enforce "posting cannot have children" when the account is being changed
        // from non-posting → posting. If it was already posting with children (legacy data),
        // allow editing other fields without error.
        const wasAlreadyPosting = existing ? Boolean(existing.postingAllowed) : false;
        if (!wasAlreadyPosting) {
            ChartOfAccountsPolicy.validatePostingInvariant(hasChildren, input.postingAllowed);
        }

        const isStructureChanged =
            !existing ||
            String(existing.parentId || '') !== String(parentId || '') ||
            String(existing.accountCode || '').toUpperCase() !== normalizedCode ||
            Boolean(existing.postingAllowed) !== Boolean(input.postingAllowed);

        if (isStructureChanged) {
            ChartOfAccountsPolicy.validatePostingParent(parent, input.postingAllowed);
            ChartOfAccountsPolicy.validateCodeHierarchy(parent, normalizedCode);
        }

        ChartOfAccountsPolicy.validateCategoryByType(input.accountType, input.accountCategory);
        ChartOfAccountsPolicy.validateSubtypeByType(input.accountType, input.accountSubtype);

        const resolvedReferenceType = input.referenceType || ChartOfAccountsPolicy.defaultReferenceTypeForSubtype(input.accountSubtype);
        ChartOfAccountsPolicy.validateReferenceTypeBySubtype(input.accountSubtype, resolvedReferenceType);

        ChartOfAccountsPolicy.assertScope(
            input.scopeType,
            input.scopeType === AccountScopeType.BRANCH ? (input.branchId || currentBranchId) : null,
        );
        ChartOfAccountsPolicy.validateCurrency(input.currencyBehavior, input.currencyCode || null);

        const resolvedBranchId =
            input.scopeType === 'BRANCH'
                ? String(input.branchId || currentBranchId || '').trim() || null
                : null;
        const account = Account.create({
            id: accountId,
            companyId,
            branchId: resolvedBranchId,
            accountCode: normalizedCode,
            name: String(input.name || '').trim(),
            parentId: parent ? parent.id : null,
            level: ChartOfAccountsPolicy.deriveLevel(parent),
            accountType: input.accountType,
            accountCategory: input.accountCategory,
            accountSubtype: input.accountSubtype,
            postingAllowed: Boolean(input.postingAllowed),
            currencyBehavior: input.currencyBehavior,
            currencyCode: input.currencyCode ? String(input.currencyCode).trim().toUpperCase() : null,
            referenceType: resolvedReferenceType,
            scopeType: input.scopeType,
            status: input.status,
            requiresCostCenter: Boolean(input.requiresCostCenter),
            requiresAnalysisCode: Boolean(input.requiresAnalysisCode),
        });

        // Only validate parent-child relationship when structure changes (parent, code, or posting status).
        // Skipping this when unchanged avoids blocking edits on accounts with legacy data inconsistencies.
        if (isStructureChanged) {
            ChartOfAccountsPolicy.validateParentChild(parent, account);
        }

        await this.accountRepo.save(account);
        return this.toAccountDto(account);
    }

    async deleteAccount(companyId: string, accountId: string): Promise<void> {
        const account = await this.accountRepo.getById(companyId, accountId);
        if (!account) return;

        const hasChildren = await this.accountRepo.hasChildren(companyId, accountId);
        const hasReferences = await this.accountRepo.hasReferences(companyId, accountId);
        ChartOfAccountsPolicy.assertCanDelete(hasChildren, hasReferences);
        await this.accountRepo.delete(companyId, accountId);
    }

    async setAccountStatus(companyId: string, accountId: string, status: AccountStatus): Promise<AccountDto> {
        const existing = await this.accountRepo.getById(companyId, accountId);
        if (!existing) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_NOT_FOUND,
                `Account ${accountId} was not found`,
                { messageKey: 'error.account.not_found' },
            );
        }
        if (existing.status === status) {
            return this.toAccountDto(existing);
        }

        const payload = existing.toJSON();
        const updated = Account.rehydrate({
            ...payload,
            status,
        });
        await this.accountRepo.save(updated);
        return this.toAccountDto(updated);
    }

    async listFinancialDefinitions(companyId: string, includeInactive = false): Promise<FinancialDefinitionDto[]> {
        const definitions = await this.definitionRepo.listDefinitions(companyId, includeInactive);
        return definitions.map((definition) => this.toFinancialDefinitionDto(definition));
    }

    async saveFinancialDefinition(
        companyId: string,
        currentBranchId: string,
        input: SaveFinancialDefinitionInput,
    ): Promise<FinancialDefinitionDto> {
        const account = await this.accountRepo.getById(companyId, input.accountId);
        if (!account) {
            throw new DomainError(
                AccountingErrorCode.ERR_ACCOUNT_MAPPING_NOT_FOUND,
                `Account ${input.accountId} was not found`,
                { messageKey: 'error.financial_definition.account.not_found' },
            );
        }

        account.assertCanPost();
        ChartOfAccountsPolicy.assertActiveForUpdate(account.status);
        FinancialDefinitionPolicy.assertMappingAccountCompatibility(input.mappingKey, account);

        const definitionId = input.id || this.definitionRepo.nextIdentity();
        const explicitBranchId = String(input.branchId || '').trim() || null;
        const resolvedBranchId =
            input.scopeType === FinancialDefinitionScopeType.BRANCH
                ? explicitBranchId || String(currentBranchId || '').trim() || null
                : explicitBranchId;

        const definition = FinancialDefinition.create({
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
            documentType: FinancialDefinitionPolicy.normalizeQualifier(input.documentType),
            lineType: FinancialDefinitionPolicy.normalizeQualifier(input.lineType),
            taxProfileId: FinancialDefinitionPolicy.normalizeQualifier(input.taxProfileId),
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

    async deleteFinancialDefinition(companyId: string, definitionId: string): Promise<void> {
        await this.definitionRepo.deleteDefinition(companyId, definitionId);
    }

    async resolveAccounts(companyId: string, branchId: string, input: ResolveAccountsInput) {
        const normalizedMappingKeys = Array.from(
            new Set(
                (input.mappingKeys || []).map((key) => String(key || '').trim().toUpperCase()),
            ),
        ).filter((key): key is AccountMappingKey => Object.values(AccountMappingKey).includes(key as AccountMappingKey));

        const context: AccountResolutionContext = {
            documentType: String(input.documentType || '').trim().toUpperCase(),
            companyId,
            branchId: branchId || null,
            postingDate: String(input.postingDate || '').trim(),
            itemId: input.itemId || null,
            itemGroupId: input.itemGroupId || null,
            warehouseId: input.warehouseId || null,
            partnerId: input.partnerId || null,
            taxProfileId: FinancialDefinitionPolicy.normalizeQualifier(input.taxProfileId),
            lineType: FinancialDefinitionPolicy.normalizeQualifier(input.lineType),
            mappingKeys: normalizedMappingKeys,
        };

        if (!context.documentType) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_RESOLUTION_CONTEXT_INVALID, 'Document type is required', {
                messageKey: 'error.account_resolution.document_type.required',
            });
        }
        if (!context.postingDate) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_RESOLUTION_CONTEXT_INVALID, 'Posting date is required', {
                messageKey: 'error.account_resolution.posting_date.required',
            });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(context.postingDate)) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_RESOLUTION_CONTEXT_INVALID, 'Posting date must be YYYY-MM-DD', {
                messageKey: 'error.account_resolution.posting_date.format_invalid',
            });
        }
        if (!context.mappingKeys.length) {
            throw new DomainError(AccountingErrorCode.ERR_ACCOUNT_RESOLUTION_CONTEXT_INVALID, 'At least one mapping key is required', {
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
        const accountsById = new Map(
            accounts.map((account) => [
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
            ]),
        );

        return this.resolutionEngine.resolve({
            context,
            definitions,
            accountsById,
        });
    }

    private toAccountDto(account: Account): AccountDto {
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
            referenceType: account.referenceType,
            scopeType: account.scopeType,
            status: account.status,
            requiresCostCenter: account.requiresCostCenter,
            requiresAnalysisCode: account.requiresAnalysisCode,
        };
    }

    private toFinancialDefinitionDto(definition: FinancialDefinition): FinancialDefinitionDto {
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
