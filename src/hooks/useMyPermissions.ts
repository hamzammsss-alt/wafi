import { useCallback, useEffect, useMemo, useState } from 'react';

type PermissionSnapshot = {
    capabilities?: string[];
    permissions?: string[];
    companyAclVersion?: number;
    branchAclVersion?: number;
    generatedAt?: string;
};

const REFRESH_INTERVAL_MS = 60_000;

const CAPABILITY_ALIASES: Record<string, string[]> = {
    'sales.invoice.create': ['ti.sales.invoice.create', 'sales.create'],
    'sales.invoice.read': ['sales.view', 'sales.create', 'ti.sales.invoice.create'],
    'sales.invoice.update': ['sales.edit', 'ti.sales.invoice.create'],
    'sales.invoice.post': ['ti.sales.invoice.post', 'sales.post', 'DOC.POST'],
    'sales.invoice.void': ['sales.void', 'DOC.VOID'],
};

function resolveDeniedKey(capabilityKey: string): string {
    if (!capabilityKey) return 'error.permission_denied';

    const specificKey = `error.permission_denied.${capabilityKey}`;
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        try {
            const translated = String(i18n.t(specificKey) || '');
            if (translated && translated !== specificKey) {
                return specificKey;
            }
        } catch {
            // Ignore i18n runtime faults and fallback to generic key.
        }
    }

    return 'error.permission_denied';
}

export function useMyPermissions() {
    const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastError, setLastError] = useState<string | null>(null);

    const permissionKeys = useMemo(() => {
        const capabilities = Array.isArray(snapshot?.capabilities) ? snapshot!.capabilities! : [];
        const permissions = Array.isArray(snapshot?.permissions) ? snapshot!.permissions! : [];
        return Array.from(new Set([...capabilities, ...permissions])).sort();
    }, [snapshot]);

    const permissionMap = useMemo(() => {
        const map: Record<string, boolean> = {};
        for (const key of permissionKeys) {
            map[key] = true;
        }
        return map;
    }, [permissionKeys]);

    const can = useCallback((capabilityKey: string): boolean => {
        if (!capabilityKey) return true;
        const aliases = CAPABILITY_ALIASES[capabilityKey] || [];
        return Boolean(
            permissionMap['ALL'] ||
            permissionMap['*.*'] ||
            permissionMap[capabilityKey] ||
            aliases.some((alias) => permissionMap[alias])
        );
    }, [permissionMap]);

    const whyNot = useCallback((capabilityKey: string): string | null => {
        if (can(capabilityKey)) return null;
        return resolveDeniedKey(capabilityKey);
    }, [can]);

    const refresh = useCallback(async (force = false) => {
        try {
            if (force) setIsLoading(true);
            const securityApi = (window as any)?.electronAPI?.security;
            const permissionsApi = (window as any)?.electronAPI?.permissions;
            const getSnapshot =
                permissionsApi?.getSnapshot ||
                securityApi?.getSnapshot ||
                securityApi?.getMySnapshot;
            const refreshSnapshot =
                permissionsApi?.refreshSnapshot ||
                securityApi?.refreshPermissions ||
                securityApi?.refreshSnapshot;

            if (!getSnapshot) {
                setSnapshot(null);
                setLastError('error.auth.unauthenticated');
                return;
            }
            const fresh = force && refreshSnapshot
                ? await refreshSnapshot()
                : await getSnapshot();
            setSnapshot((fresh || null) as PermissionSnapshot | null);
            setLastError(null);
        } catch (err: any) {
            const code = String(err?.code || '');
            const messageKey = String(err?.messageKey || '');
            if (code === 'UNAUTHENTICATED' || messageKey === 'error.auth.unauthenticated') {
                setLastError('error.auth.unauthenticated');
            } else if (code === 'STALE_PERMISSIONS' || messageKey === 'error.permissions.stale') {
                setLastError('error.permissions.stale');
            } else {
                setLastError('error.permissions.fetch_failed');
            }
            setSnapshot(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const guardedRefresh = async (force = false) => {
            if (!mounted) return;
            await refresh(force);
        };

        guardedRefresh(true);

        const timer = window.setInterval(() => {
            guardedRefresh(false);
        }, REFRESH_INTERVAL_MS);

        const onFocus = () => {
            guardedRefresh(false);
        };
        const onStorage = (ev: StorageEvent) => {
            const key = String(ev.key || '');
            if (key === 'branchId' || key === 'token' || key === 'user') {
                guardedRefresh(true);
            }
        };
        const onBranchChanged = () => {
            guardedRefresh(true);
        };

        window.addEventListener('focus', onFocus);
        window.addEventListener('storage', onStorage);
        window.addEventListener('wafi:branch-changed', onBranchChanged as EventListener);

        return () => {
            mounted = false;
            window.clearInterval(timer);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('wafi:branch-changed', onBranchChanged as EventListener);
        };
    }, [refresh]);

    const hasPermission = useCallback((key: string) => can(key), [can]);

    return {
        snapshot,
        permissions: permissionMap,
        permissionKeys,
        isLoading,
        lastError,
        can,
        whyNot,
        hasPermission,
        refresh,
    };
}
