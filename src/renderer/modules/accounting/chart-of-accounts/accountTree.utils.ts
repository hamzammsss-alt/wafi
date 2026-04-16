import { AccountQueryInput, AccountTreeNode, FlattenedAccountRow } from './accounting.types';

export function normalizeAccountTree(nodes: Array<any>): AccountTreeNode[] {
    const visit = (node: any): AccountTreeNode => {
        const children = Array.isArray(node?.children) ? node.children.map(visit) : [];
        return {
            id: String(node?.id || ''),
            companyId: String(node?.companyId || ''),
            branchId: node?.branchId ? String(node.branchId) : null,
            accountCode: String(node?.accountCode || ''),
            name: String(node?.name || ''),
            parentId: node?.parentId ? String(node.parentId) : null,
            level: Number(node?.level || 1),
            accountType: node?.accountType || 'ASSET',
            accountCategory: String(node?.accountCategory || 'GENERAL'),
            accountSubtype: String(node?.accountSubtype || 'GENERAL'),
            postingAllowed: Boolean(node?.postingAllowed),
            currencyBehavior: node?.currencyBehavior || 'BASE_ONLY',
            currencyCode: node?.currencyCode ? String(node.currencyCode) : null,
            scopeType: node?.scopeType || 'COMPANY',
            status: node?.status || 'ACTIVE',
            requiresCostCenter: Boolean(node?.requiresCostCenter),
            requiresAnalysisCode: Boolean(node?.requiresAnalysisCode),
            children,
        };
    };
    return (Array.isArray(nodes) ? nodes : []).map(visit);
}

export function collectInitialExpandedIds(nodes: AccountTreeNode[]): Set<string> {
    const expanded = new Set<string>();
    for (const node of nodes) {
        if (node.children.length > 0) {
            expanded.add(node.id);
        }
    }
    return expanded;
}

export function flattenVisibleTree(
    nodes: AccountTreeNode[],
    expandedIds: Set<string>,
    query: AccountQueryInput,
): FlattenedAccountRow[] {
    const result: FlattenedAccountRow[] = [];
    const search = query.searchText.trim().toUpperCase();

    const matches = (node: AccountTreeNode): boolean => {
        if (!query.includeInactive && node.status !== 'ACTIVE') {
            return false;
        }
        if (query.category !== 'ALL' && node.accountCategory !== query.category) {
            return false;
        }
        if (query.structure === 'POSTING' && !node.postingAllowed) {
            return false;
        }
        if (query.structure === 'HEADER' && node.postingAllowed) {
            return false;
        }
        if (search) {
            const text = `${node.accountCode} ${node.name}`.toUpperCase();
            if (!text.includes(search)) {
                return false;
            }
        }
        return true;
    };

    const hasDescendantMatch = (node: AccountTreeNode): boolean => {
        for (const child of node.children) {
            if (matches(child) || hasDescendantMatch(child)) {
                return true;
            }
        }
        return false;
    };

    const visit = (node: AccountTreeNode, depth: number): void => {
        const include = matches(node) || hasDescendantMatch(node);
        if (!include) {
            return;
        }

        const hasChildren = node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);
        result.push({
            node,
            depth,
            hasChildren,
            isExpanded,
        });

        if (hasChildren && isExpanded) {
            for (const child of node.children) {
                visit(child, depth + 1);
            }
        }
    };

    for (const root of nodes) {
        visit(root, 0);
    }
    return result;
}

export function buildParentMap(nodes: AccountTreeNode[]): Map<string, string | null> {
    const parentMap = new Map<string, string | null>();
    const walk = (node: AccountTreeNode, parentId: string | null): void => {
        parentMap.set(node.id, parentId);
        for (const child of node.children) {
            walk(child, node.id);
        }
    };
    for (const root of nodes) {
        walk(root, null);
    }
    return parentMap;
}

