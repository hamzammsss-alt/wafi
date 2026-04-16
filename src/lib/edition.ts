export type AppEdition = 'STANDARD' | 'NGO' | 'GOVERNMENT';

export interface EditionProfile {
    id: AppEdition;
    label: string;
    description: string;
    blockedRoutePrefixes: string[];
    verticalApps: string[];
}

const EDITION_STORAGE_KEY = 'wafi.edition';
const EDITION_EVENT = 'wafi:edition-changed';

export const EDITION_PROFILES: Record<AppEdition, EditionProfile> = {
    STANDARD: {
        id: 'STANDARD',
        label: 'Standard ERP',
        description: 'General-purpose commercial ERP with full cross-module coverage.',
        blockedRoutePrefixes: [],
        verticalApps: ['retail_pos', 'distribution', 'manufacturing', 'import_export'],
    },
    NGO: {
        id: 'NGO',
        label: 'NGO Edition',
        description: 'Program/project funding controls and donor-focused operational workflows.',
        blockedRoutePrefixes: ['/trade/sales/pos'],
        verticalApps: ['ngo_programs', 'distribution', 'import_export'],
    },
    GOVERNMENT: {
        id: 'GOVERNMENT',
        label: 'Government Edition',
        description: 'Public-sector procurement, approvals, and budget-compliance operations.',
        blockedRoutePrefixes: ['/trade/sales/pos', '/manufacturing/order'],
        verticalApps: ['gov_procurement', 'distribution', 'import_export'],
    },
};

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const normalizePath = (path: string): string => {
    const raw = String(path || '').trim();
    if (!raw) return '/';
    const withoutHash = raw.replace(/^#/, '');
    const noQuery = withoutHash.split('?')[0] || withoutHash;
    const noFragment = noQuery.split('#')[0] || noQuery;
    return noFragment || '/';
};

const isValidEdition = (value: string): value is AppEdition =>
    value === 'STANDARD' || value === 'NGO' || value === 'GOVERNMENT';

export const getCurrentEdition = (): AppEdition => {
    if (!isBrowser()) return 'STANDARD';
    const value = localStorage.getItem(EDITION_STORAGE_KEY) || 'STANDARD';
    return isValidEdition(value) ? value : 'STANDARD';
};

export const setCurrentEdition = (edition: AppEdition): void => {
    if (!isBrowser()) return;
    localStorage.setItem(EDITION_STORAGE_KEY, edition);
    window.dispatchEvent(new CustomEvent(EDITION_EVENT, { detail: { edition } }));
};

export const getEditionProfile = (edition: AppEdition = getCurrentEdition()): EditionProfile =>
    EDITION_PROFILES[edition];

export const getEditionProfiles = (): EditionProfile[] =>
    Object.values(EDITION_PROFILES);

export const onEditionChange = (callback: (edition: AppEdition) => void): (() => void) => {
    if (!isBrowser()) return () => undefined;

    const onCustom = (event: Event) => {
        const custom = event as CustomEvent<{ edition?: AppEdition }>;
        const edition = custom?.detail?.edition;
        callback(isValidEdition(String(edition || '')) ? edition! : getCurrentEdition());
    };

    const onStorage = (event: StorageEvent) => {
        if (event.key !== EDITION_STORAGE_KEY) return;
        callback(getCurrentEdition());
    };

    window.addEventListener(EDITION_EVENT, onCustom as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
        window.removeEventListener(EDITION_EVENT, onCustom as EventListener);
        window.removeEventListener('storage', onStorage);
    };
};

export const isRouteAllowedForEdition = (
    path: string,
    edition: AppEdition = getCurrentEdition()
): boolean => {
    const normalized = normalizePath(path);
    const blockedPrefixes = getEditionProfile(edition).blockedRoutePrefixes;
    return !blockedPrefixes.some((prefix) => {
        const blocked = normalizePath(prefix);
        return normalized === blocked || normalized.startsWith(`${blocked}/`);
    });
};

export interface EditionMenuNode {
    path?: string;
    subItems?: EditionMenuNode[];
    divider?: boolean;
    header?: boolean;
}

export const filterMenuItemsForEdition = <T extends EditionMenuNode>(
    items: T[],
    edition: AppEdition = getCurrentEdition()
): T[] => {
    const filtered = (items || [])
        .map((item) => {
            if (item.subItems?.length) {
                const subItems = filterMenuItemsForEdition(item.subItems as T[], edition);
                if (!subItems.length) return null;
                return { ...item, subItems };
            }

            if (item.path && !isRouteAllowedForEdition(item.path, edition)) {
                return null;
            }

            return item;
        })
        .filter(Boolean) as T[];

    return filtered;
};

export const countActionableMenuItems = <T extends EditionMenuNode>(items: T[]): number => {
    let count = 0;
    for (const item of items || []) {
        if (item.subItems?.length) {
            count += countActionableMenuItems(item.subItems as T[]);
            continue;
        }
        if (!item.header && !item.divider && !!item.path) {
            count += 1;
        }
    }
    return count;
};
