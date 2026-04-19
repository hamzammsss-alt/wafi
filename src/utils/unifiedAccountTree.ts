export interface UnifiedAccountNode {
    id: string;
    account_code: string;
    code: string;
    name_ar: string;
    name: string;
    name_en?: string;
    account_type: string;
    parent_id?: string;
    parentId?: string | null;
    balance: number;
    is_active?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    account_level?: number;
    level?: number;
    is_transactional: number;
    postingAllowed?: boolean;
    currency_id?: string;
    currency_code?: string;
    currencyCode?: string | null;
    requires_cost_center?: number;
    requiresCostCenter?: boolean;
    account_category?: string;
    accountCategory?: string;
    account_subtype?: string;
    accountSubtype?: string;
    reference_type?: string;
    referenceType?: string;
    scope_type?: string;
    scopeType?: string;
    branch_id?: string | null;
    branchId?: string | null;
    system_type?: string;
    children?: UnifiedAccountNode[];
}

const normalizeText = (value: unknown): string => String(value ?? '').trim();

const toBooleanFlag = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (!normalized) return fallback;
        if (normalized === 'true' || normalized === '1' || normalized === 'active') return true;
        if (normalized === 'false' || normalized === '0' || normalized === 'inactive') return false;
    }
    return fallback;
};

export const normalizeUnifiedAccountTree = (
    nodes: unknown[],
    inheritedParentId: string | null = null,
): UnifiedAccountNode[] => {
    const visit = (node: any, fallbackParentId: string | null): UnifiedAccountNode => {
        const id = normalizeText(node?.id);
        const parentId = normalizeText(node?.parent_id ?? node?.parentId ?? fallbackParentId) || null;
        const accountCode = normalizeText(node?.account_code ?? node?.accountCode ?? node?.code);
        const name = normalizeText(node?.name_ar ?? node?.name ?? node?.name_en);
        const rawStatus = normalizeText(node?.status).toUpperCase();
        const status: 'ACTIVE' | 'INACTIVE' =
            rawStatus === 'INACTIVE' || !toBooleanFlag(node?.is_active ?? 1, true) ? 'INACTIVE' : 'ACTIVE';
        const postingAllowed = toBooleanFlag(
            node?.postingAllowed ?? node?.posting_allowed ?? node?.is_transactional,
            true,
        );
        const children = Array.isArray(node?.children)
            ? node.children.map((child: any) => visit(child, id))
            : [];

        return {
            id,
            account_code: accountCode,
            code: accountCode,
            name_ar: name,
            name,
            name_en: normalizeText(node?.name_en) || undefined,
            account_type: normalizeText(node?.account_type ?? node?.accountType) || 'ASSET',
            parent_id: parentId || undefined,
            parentId,
            balance: Number(node?.balance || 0),
            is_active: status === 'ACTIVE' ? 1 : 0,
            status,
            account_level: Number(node?.account_level ?? node?.level ?? 0) || undefined,
            level: Number(node?.level ?? node?.account_level ?? 0) || undefined,
            is_transactional: postingAllowed ? 1 : 0,
            postingAllowed,
            currency_id: normalizeText(node?.currency_id ?? node?.currencyId) || undefined,
            currency_code:
                normalizeText(node?.currency_code ?? node?.currencyCode ?? node?.currency_id ?? node?.currencyId)
                || undefined,
            currencyCode:
                normalizeText(node?.currencyCode ?? node?.currency_code ?? node?.currency_id ?? node?.currencyId)
                || null,
            requires_cost_center: toBooleanFlag(node?.requires_cost_center ?? node?.requiresCostCenter) ? 1 : 0,
            requiresCostCenter: toBooleanFlag(node?.requiresCostCenter ?? node?.requires_cost_center),
            account_category: normalizeText(node?.account_category ?? node?.accountCategory) || undefined,
            accountCategory: normalizeText(node?.accountCategory ?? node?.account_category) || undefined,
            account_subtype: normalizeText(node?.account_subtype ?? node?.accountSubtype) || undefined,
            accountSubtype: normalizeText(node?.accountSubtype ?? node?.account_subtype) || undefined,
            reference_type: normalizeText(node?.reference_type ?? node?.referenceType) || undefined,
            referenceType: normalizeText(node?.referenceType ?? node?.reference_type) || undefined,
            scope_type: normalizeText(node?.scope_type ?? node?.scopeType) || undefined,
            scopeType: normalizeText(node?.scopeType ?? node?.scope_type) || undefined,
            branch_id: normalizeText(node?.branch_id ?? node?.branchId) || null,
            branchId: normalizeText(node?.branchId ?? node?.branch_id) || null,
            system_type: normalizeText(node?.system_type ?? node?.systemType) || undefined,
            children,
        };
    };

    return (Array.isArray(nodes) ? nodes : []).map((node) => visit(node, inheritedParentId));
};

export const flattenUnifiedAccountTree = (nodes: UnifiedAccountNode[]): UnifiedAccountNode[] => {
    const flat: UnifiedAccountNode[] = [];
    const visit = (list: UnifiedAccountNode[]) => {
        for (const node of list || []) {
            flat.push(node);
            if (Array.isArray(node.children) && node.children.length > 0) {
                visit(node.children);
            }
        }
    };
    visit(nodes);
    return flat;
};

export const loadUnifiedAccountTree = async (api: any, includeInactive = true): Promise<UnifiedAccountNode[]> => {
    if (!api) return [];

    const modernTreeGetter = api.accountingFoundation?.getAccountTree;
    if (typeof modernTreeGetter === 'function') {
        const rows = await modernTreeGetter(includeInactive);
        return normalizeUnifiedAccountTree(rows);
    }

    const legacyTreeGetter = api.getAccountTree || api.account?.getTree;
    if (typeof legacyTreeGetter === 'function') {
        const rows = await legacyTreeGetter();
        return normalizeUnifiedAccountTree(rows);
    }

    return [];
};
