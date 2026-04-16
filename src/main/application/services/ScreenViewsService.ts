import { v4 as uuidv4 } from 'uuid';
import { FilterOperator, ScreenDefinition } from '../../../config/screenRegistry';
import { AuditContext } from '../../domain/audit/AuditTypes';
import { SqliteScreenViewsRepo } from '../../infrastructure/adapters/SqliteScreenViewsRepo';
import { diffPlainObjects } from './AuditDiffService';
import { AuditService, getGlobalAuditService } from './AuditService';
import { ScreenQueryBuilder, ColumnStateItem, FilterStateItem, SortStateItem } from './ScreenQueryBuilder';
import { ScreenRegistry } from './ScreenRegistry';

export type ScreenViewScope = 'user' | 'branch' | 'company';

export type RequestContext = {
    userId: string;
    companyId: string;
    branchId: string;
    sessionId?: string;
    correlationId?: string;
    ipcid?: string;
    permissions?: string[];
    capabilities?: string[];
};

export type SaveViewInput = {
    id?: string;
    screenKey: string;
    scope?: ScreenViewScope;
    name: string;
    nameI18nKey?: string;
    filters?: FilterStateItem[];
    columns?: ColumnStateItem[];
    sort?: SortStateItem[];
    isDefault?: boolean;
    isShared?: boolean;
};

export type ApplyViewInput = {
    screenKey: string;
    filters?: FilterStateItem[];
    columns?: ColumnStateItem[];
    sort?: SortStateItem[];
    page?: number;
    pageSize?: number;
    includeTotal?: boolean;
};

export class ScreenViewsService {
    private readonly repo: SqliteScreenViewsRepo;
    private readonly registry: ScreenRegistry;
    private readonly queryBuilder: ScreenQueryBuilder;
    private readonly auditService: AuditService | null;

    constructor(
        repo: SqliteScreenViewsRepo,
        registry = new ScreenRegistry(),
        queryBuilder = new ScreenQueryBuilder(),
        auditService?: AuditService | null,
    ) {
        this.repo = repo;
        this.registry = registry;
        this.queryBuilder = queryBuilder;
        this.auditService = auditService || getGlobalAuditService();
    }

    listViews(ctx: RequestContext, screenKey: string) {
        const definition = this.registry.require(screenKey);
        this.ensureScreenCapability(ctx, definition);

        const rows = this.repo.listVisibleViews({
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            userId: ctx.userId,
            screenKey,
        });

        return rows.map((row) => this.toViewModel(row));
    }

    saveView(ctx: RequestContext, input: SaveViewInput) {
        const screenKey = this.normalizeText(input.screenKey, 'screenKey');
        const definition = this.registry.require(screenKey);
        this.ensureScreenCapability(ctx, definition);
        this.ensureCapability(ctx, 'view.manage');

        const scope: ScreenViewScope = (input.scope || 'user') as ScreenViewScope;
        if (!['user', 'branch', 'company'].includes(scope)) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.views.scope_invalid',
                message: `Invalid view scope: ${scope}`,
            };
        }

        if (scope !== 'user' || input.isShared) {
            this.ensureCapability(ctx, 'view.share');
        }

        const name = this.normalizeText(input.name, 'name');
        const sanitizedFilters = this.queryBuilder.sanitizeFilters(definition, input.filters);
        const sanitizedColumns = this.queryBuilder.sanitizeColumns(definition, input.columns);
        const sanitizedSort = this.queryBuilder.sanitizeSort(definition, input.sort);

        const normalizedScope = this.normalizeScopeContext(ctx, scope);
        const isDefault = input.isDefault ? 1 : 0;
        const isShared = scope === 'user' ? 0 : 1;

        const id = String(input.id || '').trim() || uuidv4();

        const existing = String(input.id || '').trim() ? this.repo.getViewById(id) : null;
        const beforeViewModel = existing ? this.toViewModel(existing) : null;
        if (existing) {
            this.ensureMutateScope(ctx, existing.scope as ScreenViewScope, existing.user_id, existing.branch_id);
        }

        if (isDefault === 1) {
            this.repo.clearDefaultForScope({
                companyId: ctx.companyId,
                screenKey,
                scope,
                branchId: normalizedScope.branchId,
                userId: normalizedScope.userId,
            });
        }

        try {
            if (existing) {
                this.repo.updateView({
                    id,
                    companyId: ctx.companyId,
                    branchId: normalizedScope.branchId,
                    userId: normalizedScope.userId,
                    scope,
                    name,
                    nameI18nKey: input.nameI18nKey || null,
                    filtersJson: JSON.stringify(sanitizedFilters),
                    columnsJson: JSON.stringify(sanitizedColumns),
                    sortJson: JSON.stringify(sanitizedSort),
                    isDefault,
                    isShared,
                });
            } else {
                this.repo.insertView({
                    id,
                    companyId: ctx.companyId,
                    branchId: normalizedScope.branchId,
                    userId: normalizedScope.userId,
                    screenKey,
                    scope,
                    name,
                    nameI18nKey: input.nameI18nKey || null,
                    filtersJson: JSON.stringify(sanitizedFilters),
                    columnsJson: JSON.stringify(sanitizedColumns),
                    sortJson: JSON.stringify(sanitizedSort),
                    isDefault,
                    isShared,
                });
            }
        } catch (error: any) {
            const message = String(error?.message || '');
            if (message.toLowerCase().includes('unique')) {
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.name_already_exists',
                    message: 'View name already exists for this scope',
                };
            }
            throw error;
        }

        const saved = this.repo.getViewById(id);
        if (!saved) {
            throw {
                code: 'INTERNAL_ERROR',
                messageKey: 'error.views.save_failed',
                message: 'Unable to load saved view',
            };
        }

        const savedView = this.toViewModel(saved);

        const viewChanges = diffPlainObjects(beforeViewModel || {}, savedView, {
            basePath: 'view',
            ignoreKeys: ['id', 'createdAt', 'updatedAt'],
            maxChanges: 200,
        });
        this.recordAudit(
            ctx,
            {
                entityType: 'screen_view',
                entityId: savedView.id,
                eventType: 'view.save',
                summaryI18nKey: 'audit.event.view.save',
                meta: {
                    screenKey,
                    scope,
                    operation: existing ? 'update' : 'create',
                    viewId: savedView.id,
                },
            },
            viewChanges,
        );

        if (scope !== 'user') {
            this.recordAudit(
                ctx,
                {
                    entityType: 'screen_view',
                    entityId: savedView.id,
                    eventType: 'view.share',
                    summaryI18nKey: 'audit.event.view.share',
                    meta: {
                        screenKey,
                        scope,
                        action: 'share',
                        viewId: savedView.id,
                    },
                },
                [],
            );
        }

        return savedView;
    }

    setDefault(ctx: RequestContext, viewId: string) {
        this.ensureCapability(ctx, 'view.manage');
        const id = this.normalizeText(viewId, 'viewId');
        const view = this.repo.getViewById(id);
        if (!view || view.company_id !== ctx.companyId) {
            throw {
                code: 'INVALID_SCOPE',
                messageKey: 'error.scope.invalid',
                message: 'View not found in current company scope',
            };
        }

        this.ensureMutateScope(ctx, view.scope, view.user_id, view.branch_id);

        this.repo.clearDefaultForScope({
            companyId: ctx.companyId,
            screenKey: view.screen_key,
            scope: view.scope,
            branchId: view.branch_id,
            userId: view.user_id,
        });
        this.repo.setDefaultById(id, ctx.companyId);

        const updated = this.repo.getViewById(id);
        const updatedView = updated ? this.toViewModel(updated) : null;
        if (updatedView) {
            this.recordAudit(
                ctx,
                {
                    entityType: 'screen_view',
                    entityId: updatedView.id,
                    eventType: 'view.set_default',
                    summaryI18nKey: 'audit.event.view.set_default',
                    meta: {
                        screenKey: updatedView.screenKey,
                        scope: updatedView.scope,
                        viewId: updatedView.id,
                        action: 'set_default',
                    },
                },
                [
                    {
                        fieldPath: 'view.isDefault',
                        oldValue: false,
                        newValue: true,
                    },
                ],
            );
        }
        return updatedView;
    }

    deleteView(ctx: RequestContext, viewId: string) {
        this.ensureCapability(ctx, 'view.manage');
        const id = this.normalizeText(viewId, 'viewId');
        const view = this.repo.getViewById(id);
        if (!view || view.company_id !== ctx.companyId) {
            throw {
                code: 'INVALID_SCOPE',
                messageKey: 'error.scope.invalid',
                message: 'View not found in current company scope',
            };
        }

        this.ensureMutateScope(ctx, view.scope, view.user_id, view.branch_id);
        const beforeView = this.toViewModel(view);
        this.repo.deleteView(id, ctx.companyId);

        this.recordAudit(
            ctx,
            {
                entityType: 'screen_view',
                entityId: id,
                eventType: 'view.delete',
                summaryI18nKey: 'audit.event.view.delete',
                meta: {
                    screenKey: beforeView.screenKey,
                    scope: beforeView.scope,
                    viewId: id,
                    action: 'delete',
                },
            },
            diffPlainObjects(beforeView, {}, {
                basePath: 'view',
                ignoreKeys: ['id', 'createdAt', 'updatedAt'],
                maxChanges: 200,
            }),
        );

        return { success: true, viewId: id };
    }

    apply(ctx: RequestContext, input: ApplyViewInput) {
        const screenKey = this.normalizeText(input.screenKey, 'screenKey');
        const definition = this.registry.require(screenKey);
        this.ensureScreenCapability(ctx, definition);

        const built = this.queryBuilder.build(definition, {
            filters: input.filters,
            columns: input.columns,
            sort: input.sort,
            page: input.page,
            pageSize: input.pageSize,
        });

        const rows = this.repo.runRowsQuery<any>(built.listSql, built.listParams);
        const total = input.includeTotal === false ? rows.length : this.repo.runCountQuery(built.countSql, built.countParams);

        const result: any = {
            screenKey,
            rows,
            total,
            pageSize: built.limit,
            offset: built.offset,
            applied: {
                filters: built.appliedFilters,
                columns: built.appliedColumns,
                sort: built.appliedSort,
            },
        };

        if (screenKey === 'reports.account_statement') {
            result.summary = {
                openingBalance: this.computeAccountStatementOpeningBalance(
                    built.appliedFilters,
                ),
            };
        }

        return result;
    }

    private computeAccountStatementOpeningBalance(filters: FilterStateItem[]): number {
        const accountFilter = filters.find((f) => f.key === 'account_id' && f.enabled !== false && (f.operator === 'eq' || f.operator === 'in'));
        const dateFilter = filters.find((f) => f.key === 'date' && f.enabled !== false);

        const accountId = this.extractSingleFilterValue(accountFilter?.value);
        if (!accountId) return 0;

        const fromDate = this.extractFromDate(dateFilter);
        if (!fromDate) return 0;

        const sql = `
            SELECT COALESCE(SUM(CAST(tl.debit AS REAL) - CAST(tl.credit AS REAL)), 0) AS opening_balance
            FROM transaction_lines tl
            INNER JOIN transactions t ON t.id = tl.transaction_id
            WHERE tl.account_id = ?
              AND date(t.date) < date(?)
        `;

        return this.repo.runScalarQuery(sql, [accountId, fromDate]);
    }

    private extractFromDate(filter?: FilterStateItem): string | null {
        if (!filter) return null;

        if (filter.operator === 'between') {
            return this.isDate(filter.value) ? String(filter.value) : null;
        }
        if (filter.operator === 'gte' || filter.operator === 'eq') {
            return this.isDate(filter.value) ? String(filter.value) : null;
        }

        return null;
    }

    private extractSingleFilterValue(value: unknown): string | null {
        if (Array.isArray(value)) {
            const first = value.find((x) => x !== null && x !== undefined && String(x).trim());
            return first ? String(first).trim() : null;
        }
        if (value === null || value === undefined) return null;
        const text = String(value).trim();
        return text || null;
    }

    private isDate(value: unknown): boolean {
        if (value === null || value === undefined) return false;
        return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
    }

    private normalizeScopeContext(ctx: RequestContext, scope: ScreenViewScope): {
        branchId: string | null;
        userId: string | null;
    } {
        if (scope === 'company') {
            return { branchId: null, userId: null };
        }
        if (scope === 'branch') {
            return { branchId: ctx.branchId, userId: null };
        }
        return { branchId: ctx.branchId, userId: ctx.userId };
    }

    private ensureMutateScope(ctx: RequestContext, scope: ScreenViewScope, userId: string | null, branchId: string | null) {
        if (scope === 'company' || scope === 'branch') {
            this.ensureCapability(ctx, 'view.share');
        }

        if (scope === 'user' && userId !== ctx.userId) {
            this.ensureCapability(ctx, 'view.share');
        }

        if (scope === 'branch' && branchId !== ctx.branchId) {
            throw {
                code: 'INVALID_SCOPE',
                messageKey: 'error.scope.invalid',
                message: 'Cannot mutate branch view from another branch context',
            };
        }
    }

    private ensureScreenCapability(ctx: RequestContext, definition: ScreenDefinition) {
        this.ensureCapability(ctx, definition.capabilityKey);
    }

    private ensureCapability(ctx: RequestContext, capabilityKey: string) {
        const permissions = Array.isArray(ctx.permissions) ? ctx.permissions : [];
        const capabilities = Array.isArray(ctx.capabilities) ? ctx.capabilities : [];
        const granted = new Set<string>([...permissions, ...capabilities]);

        if (granted.has('ALL') || granted.has('*.*') || granted.has(capabilityKey)) {
            return;
        }

        throw {
            code: 'PERMISSION_DENIED',
            messageKey: `error.permission_denied.${capabilityKey}`,
            message: `Missing permission: ${capabilityKey}`,
        };
    }

    private toViewModel(row: any) {
        return {
            id: row.id,
            companyId: row.company_id,
            branchId: row.branch_id || null,
            userId: row.user_id || null,
            screenKey: row.screen_key,
            scope: row.scope,
            name: row.name,
            nameI18nKey: row.name_i18n_key || null,
            filters: this.safeJsonArray(row.filters_json),
            columns: this.safeJsonArray(row.columns_json),
            sort: this.safeJsonArray(row.sort_json),
            isDefault: Number(row.is_default || 0) === 1,
            isShared: Number(row.is_shared || 0) === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private safeJsonArray(value: unknown): any[] {
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string' || !value.trim()) return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private normalizeText(value: unknown, fieldName: string): string {
        const text = String(value || '').trim();
        if (!text) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.views.required_field',
                message: `${fieldName} is required`,
                details: { field: fieldName },
            };
        }
        return text;
    }

    private recordAudit(
        ctx: RequestContext,
        event: {
            entityType: string;
            entityId: string;
            eventType: string;
            summaryI18nKey?: string;
            meta?: Record<string, unknown>;
        },
        fieldChanges: Array<{ fieldPath: string; oldValue?: unknown; newValue?: unknown }>,
    ) {
        if (!this.auditService) return;
        try {
            const auditContext: AuditContext = {
                companyId: ctx.companyId,
                branchId: ctx.branchId,
                userId: ctx.userId,
                sessionId: ctx.sessionId || null,
                correlationId: ctx.correlationId || null,
                ipcid: ctx.ipcid || null,
            };

            this.auditService.recordEvent(
                auditContext,
                {
                    entityType: event.entityType,
                    entityId: event.entityId,
                    eventType: event.eventType,
                    summaryI18nKey: event.summaryI18nKey || null,
                    correlationId: ctx.correlationId || null,
                    ipcid: ctx.ipcid || null,
                    meta: event.meta || null,
                },
                fieldChanges,
            );
        } catch (error) {
            console.warn('[ScreenViewsService] audit record failed:', error);
        }
    }
}
