import { DomainError } from '../../domain/errors';
import { AccountEntity } from '../../domain/chartOfAccounts/entities/AccountEntity';
import { ChartOfAccountsValidationService } from '../../domain/chartOfAccounts/services/ChartOfAccountsValidationService';
import {
    AccountQueryInput,
    AccountRowDto,
    AccountTreeNode,
    CreateAccountInput,
    SeedDefaultChartInput,
    SeedDefaultChartResultDto,
    SeedDuplicateStrategy,
    UpdateAccountInput,
} from '../dtos/ChartOfAccountsDtos';
import {
    AccountListQuery,
    AccountTreeNodeEntity,
    ChartOfAccountsRepositoryPort,
    ChartOfAccountsSeedPort,
} from '../ports/ChartOfAccountsPorts';

export class ChartOfAccountsUseCases {
    private readonly validation = new ChartOfAccountsValidationService();

    constructor(
        private readonly repository: ChartOfAccountsRepositoryPort,
        private readonly seedService: ChartOfAccountsSeedPort,
    ) {}

    async seedDefaultChart(
        authenticatedCompanyId: string,
        input: SeedDefaultChartInput,
    ): Promise<SeedDefaultChartResultDto> {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const strategy = this.normalizeSeedStrategy(input.strategy);
        const result = await this.seedService.seedDefaultChartOfAccounts(companyId, strategy);
        return {
            companyId,
            strategy,
            inserted: result.inserted,
            skipped: result.skipped,
            total: result.total,
        };
    }

    async listFlat(
        authenticatedCompanyId: string,
        query?: AccountQueryInput,
    ): Promise<AccountRowDto[]> {
        const normalizedQuery = this.normalizeListQuery(query);
        const rows = await this.repository.listFlatAccounts(authenticatedCompanyId, normalizedQuery);
        const byId = new Map(rows.map((row) => [row.id, row]));
        return rows.map((row) => this.toDto(row, byId.get(row.parentId || '')?.code || null));
    }

    async listTree(
        authenticatedCompanyId: string,
        query?: AccountQueryInput,
    ): Promise<AccountTreeNode[]> {
        const normalizedQuery = this.normalizeListQuery(query);
        const roots = await this.repository.listAccountTree(authenticatedCompanyId, normalizedQuery);
        const byId = this.buildLookupFromTree(roots);
        return roots.map((node) => this.toTreeDto(node, byId));
    }

    async findByCode(authenticatedCompanyId: string, code: string): Promise<AccountRowDto | null> {
        const normalizedCode = String(code || '').trim();
        if (!normalizedCode) {
            throw new DomainError('ERR_ACCOUNT_CODE_REQUIRED', 'Account code is required', {
                messageKey: 'error.account.code.required',
            });
        }
        const account = await this.repository.findByCode(authenticatedCompanyId, normalizedCode);
        if (!account) return null;
        let parentCode: string | null = null;
        if (account.parentId) {
            const parent = await this.repository.findById(authenticatedCompanyId, account.parentId);
            parentCode = parent?.code || null;
        }
        return this.toDto(account, parentCode);
    }

    async createAccount(
        authenticatedCompanyId: string,
        input: CreateAccountInput,
    ): Promise<AccountRowDto> {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const normalizedCode = this.normalizeCode(input.code);
        const parentCode = this.normalizeCodeOptional(input.parentCode);
        const systemTag = this.normalizeSystemTag(input.systemTag);
        const parent = await this.resolveParent(companyId, parentCode);
        const level = parent ? parent.level + 1 : 1;
        const path = parent ? `${parent.path}/${normalizedCode}` : normalizedCode;

        const account = AccountEntity.create({
            id: this.repository.nextIdentity(),
            companyId,
            code: normalizedCode,
            name: this.normalizeName(input.name),
            category: input.category,
            subtype: input.subtype,
            parentId: parent?.id || null,
            isPosting: Boolean(input.isPosting),
            normalBalance: input.normalBalance,
            systemTag,
            allowManualEntry: Boolean(input.allowManualEntry),
            isActive: Boolean(input.isActive),
            level,
            path,
        });

        const [existingByCode, existingBySystemTag] = await Promise.all([
            this.repository.findByCode(companyId, account.code),
            account.systemTag ? this.repository.findBySystemTag(companyId, account.systemTag) : Promise.resolve(null),
        ]);

        this.validation.validateBeforeCreate({
            account,
            parent,
            existingByCode,
            existingBySystemTag,
        });

        await this.repository.createAccount(account);
        return this.toDto(account, parent?.code || null);
    }

    async updateAccount(
        authenticatedCompanyId: string,
        input: UpdateAccountInput,
    ): Promise<AccountRowDto> {
        const companyId = this.assertCompanyScope(authenticatedCompanyId, input.companyId);
        const id = String(input.id || '').trim();
        if (!id) {
            throw new DomainError('ERR_ACCOUNT_ID_REQUIRED', 'Account id is required', {
                messageKey: 'error.account.id.required',
            });
        }

        const existing = await this.repository.findById(companyId, id);
        if (!existing) {
            throw new DomainError('ERR_ACCOUNT_NOT_FOUND', `Account ${id} was not found`, {
                messageKey: 'error.account.not_found',
            });
        }

        const normalizedCode = this.normalizeCode(input.code);
        const parentCode = input.parentCode === undefined
            ? await this.resolveParentCode(companyId, existing.parentId)
            : this.normalizeCodeOptional(input.parentCode);
        const parent = await this.resolveParent(companyId, parentCode);
        const level = parent ? parent.level + 1 : 1;
        const path = parent ? `${parent.path}/${normalizedCode}` : normalizedCode;
        const systemTag = this.normalizeSystemTag(input.systemTag);

        const next = AccountEntity.create({
            id: existing.id,
            companyId,
            code: normalizedCode,
            name: this.normalizeName(input.name),
            category: input.category,
            subtype: input.subtype,
            parentId: parent?.id || null,
            isPosting: Boolean(input.isPosting),
            normalBalance: input.normalBalance,
            systemTag,
            allowManualEntry: Boolean(input.allowManualEntry),
            isActive: Boolean(input.isActive),
            level,
            path,
            createdAt: existing.createdAt,
        });

        const [existingByCode, existingBySystemTag, hasChildren] = await Promise.all([
            this.repository.findByCode(companyId, next.code),
            next.systemTag ? this.repository.findBySystemTag(companyId, next.systemTag) : Promise.resolve(null),
            this.repository.hasChildren(companyId, next.id),
        ]);

        this.validation.validateBeforeUpdate({
            existing,
            next,
            parent,
            existingByCode,
            existingBySystemTag,
            hasChildren,
        });

        await this.repository.updateAccount(next);
        return this.toDto(next, parent?.code || null);
    }

    private toTreeDto(
        node: AccountTreeNodeEntity,
        byId: Map<string, AccountEntity>,
    ): AccountTreeNode {
        const parentCode = node.account.parentId ? byId.get(node.account.parentId)?.code || null : null;
        return {
            ...this.toDto(node.account, parentCode),
            children: node.children.map((child) => this.toTreeDto(child, byId)),
        };
    }

    private buildLookupFromTree(roots: AccountTreeNodeEntity[]): Map<string, AccountEntity> {
        const map = new Map<string, AccountEntity>();
        const walk = (node: AccountTreeNodeEntity): void => {
            map.set(node.account.id, node.account);
            for (const child of node.children) {
                walk(child);
            }
        };
        for (const root of roots) {
            walk(root);
        }
        return map;
    }

    private toDto(account: AccountEntity, parentCode: string | null): AccountRowDto {
        return {
            id: account.id,
            companyId: account.companyId,
            code: account.code,
            name: account.name,
            category: account.category,
            subtype: account.subtype,
            parentId: account.parentId,
            parentCode,
            isPosting: account.isPosting,
            normalBalance: account.normalBalance,
            systemTag: account.systemTag,
            allowManualEntry: account.allowManualEntry,
            isActive: account.isActive,
            level: account.level,
            path: account.path,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
        };
    }

    private normalizeListQuery(query?: AccountQueryInput): AccountListQuery {
        return {
            includeInactive: Boolean(query?.includeInactive),
            search: query?.search ? String(query.search).trim() : null,
            category: !query?.category || query.category === 'ALL' ? null : query.category,
            posting: query?.posting || 'ALL',
        };
    }

    private normalizeSeedStrategy(strategy?: SeedDuplicateStrategy): SeedDuplicateStrategy {
        const value = String(strategy || 'skip').trim().toLowerCase();
        return value === 'fail' ? 'fail' : 'skip';
    }

    private normalizeCode(code: string): string {
        const normalized = String(code || '').trim();
        if (!normalized) {
            throw new DomainError('ERR_ACCOUNT_CODE_REQUIRED', 'Account code is required', {
                messageKey: 'error.account.code.required',
            });
        }
        return normalized;
    }

    private normalizeCodeOptional(code: string | null | undefined): string | null {
        const normalized = String(code || '').trim();
        return normalized || null;
    }

    private normalizeName(name: string): string {
        const normalized = String(name || '').trim();
        if (!normalized) {
            throw new DomainError('ERR_ACCOUNT_NAME_REQUIRED', 'Account name is required', {
                messageKey: 'error.account.name.required',
            });
        }
        return normalized;
    }

    private normalizeSystemTag(systemTag: string | null | undefined): string | null {
        const normalized = String(systemTag || '').trim().toUpperCase();
        return normalized || null;
    }

    private async resolveParent(companyId: string, parentCode: string | null): Promise<AccountEntity | null> {
        if (!parentCode) return null;
        const parent = await this.repository.findByCode(companyId, parentCode);
        if (!parent) {
            throw new DomainError('ERR_ACCOUNT_PARENT_NOT_FOUND', `Parent code ${parentCode} was not found`, {
                messageKey: 'error.account.parent.not_found',
                details: { parentCode },
            });
        }
        return parent;
    }

    private async resolveParentCode(companyId: string, parentId: string | null): Promise<string | null> {
        if (!parentId) return null;
        const parent = await this.repository.findById(companyId, parentId);
        return parent?.code || null;
    }

    private assertCompanyScope(authenticatedCompanyId: string, payloadCompanyId: string): string {
        const normalizedAuthCompanyId = String(authenticatedCompanyId || '').trim();
        const normalizedPayloadCompanyId = String(payloadCompanyId || '').trim();
        if (!normalizedPayloadCompanyId) {
            throw new DomainError('ERR_ACCOUNT_COMPANY_REQUIRED', 'Company id is required', {
                messageKey: 'error.account.company.required',
            });
        }
        if (!normalizedAuthCompanyId) {
            throw new DomainError('ERR_SCOPE_INVALID', 'Authenticated company scope is missing', {
                messageKey: 'error.scope.invalid',
            });
        }
        if (normalizedAuthCompanyId !== normalizedPayloadCompanyId) {
            throw new DomainError('ERR_ACCOUNT_COMPANY_SCOPE_MISMATCH', 'Company scope mismatch', {
                messageKey: 'error.account.company.scope_mismatch',
            });
        }
        return normalizedPayloadCompanyId;
    }
}
