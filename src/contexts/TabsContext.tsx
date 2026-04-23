import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRouteByPath } from '../../config/routes';

export interface Tab {
    id: string;
    path: string;
    title: string;
    icon?: ReactNode; // Optional icon for the tab
    isClosable?: boolean; // Dashboard might not be closable
    component?: ReactNode; // The actual component to render (for keep-alive)
}

export interface WorkspaceOverlay {
    id: string;
    title: string;
    content: ReactNode;
    widthClassName?: string;
}

type WorkspaceViewMode = 'single' | 'grid';

interface TabsContextType {
    tabs: Tab[];
    activeTabPath: string;
    workspaceViewMode: WorkspaceViewMode;
    overlays: WorkspaceOverlay[];
    openTab: (tab: Tab) => void;
    closeTab: (path: string) => void;
    switchTab: (path: string) => void;
    navigateInTab: (path: string, title?: string) => void;
    updateTabTitle: (path: string, newTitle: string) => void;
    setWorkspaceViewMode: (mode: WorkspaceViewMode) => void;
    toggleWorkspaceViewMode: () => void;
    openOverlay: (overlay: WorkspaceOverlay) => void;
    closeOverlay: (id: string) => void;
    closeTopOverlay: () => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const buildPathWithSearch = (location: { pathname?: string; search?: string }) => {
    const pathname = String(location?.pathname || '/').trim() || '/';
    const search = String(location?.search || '').trim();
    return `${pathname}${search}`;
};

export const TabsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tabs, setTabs] = useState<Tab[]>([
        { id: 'dashboard', path: '/', title: 'الرئيسية', isClosable: false }
    ]);
    const [activeTabPath, setActiveTabPath] = useState<string>('/');
    const [workspaceViewMode, setWorkspaceViewMode] = useState<WorkspaceViewMode>('single');
    const [overlays, setOverlays] = useState<WorkspaceOverlay[]>([]);
    const navigate = useNavigate();
    const location = useLocation();

    // Sync internal state with URL changes if needed, 
    // but for a true tab system, the interaction usually drives the URL.
    // Sync internal state with URL changes if needed, 
    // but for a true tab system, the interaction usually drives the URL.

    const openTab = useCallback((tab: Tab) => {
        setTabs(prev => {
            const existing = prev.find(t => t.path === tab.path);
            if (existing) return prev;
            return [...prev, { ...tab, isClosable: tab.isClosable ?? true }];
        });
        setActiveTabPath(tab.path);
        navigate(tab.path);
    }, [navigate]);

    const navigateInTab = useCallback((path: string, title?: string) => {
        setTabs(prev => prev.map(t => {
            if (t.path === activeTabPath) {
                return { ...t, path: path, title: title || t.title, id: path };
            }
            return t;
        }));
        setActiveTabPath(path);
        navigate(path);
    }, [activeTabPath, navigate]);

    const closeTab = useCallback((path: string) => {
        // Verify tab exists and filter
        const tabToDeleteIndex = tabs.findIndex(t => t.path === path);
        if (tabToDeleteIndex === -1) return;

        const newTabs = tabs.filter(t => t.path !== path);
        setTabs(newTabs);

        // If we closed the active tab, navigate to the last remaining one
        if (path === activeTabPath) {
            if (newTabs.length > 0) {
                const lastTab = newTabs[newTabs.length - 1];
                setActiveTabPath(lastTab.path);
                navigate(lastTab.path);
            } else {
                navigate('/');
            }
        }
    }, [tabs, activeTabPath, navigate]);

    const switchTab = useCallback((path: string) => {
        setActiveTabPath(path);
        navigate(path);
    }, [navigate]);

    const updateTabTitle = useCallback((path: string, newTitle: string) => {
        setTabs(prev => prev.map(t => t.path === path ? { ...t, title: newTitle } : t));
    }, []);

    const toggleWorkspaceViewMode = useCallback(() => {
        setWorkspaceViewMode((prev) => (prev === 'single' ? 'grid' : 'single'));
    }, []);

    const openOverlay = useCallback((overlay: WorkspaceOverlay) => {
        setOverlays((prev) => {
            const next = prev.filter((item) => item.id !== overlay.id);
            next.push(overlay);
            return next;
        });
    }, []);

    const closeOverlay = useCallback((id: string) => {
        setOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
    }, []);

    const closeTopOverlay = useCallback(() => {
        setOverlays((prev) => prev.slice(0, -1));
    }, []);

    useEffect(() => {
        const currentPath = buildPathWithSearch(location);
        if (!currentPath || currentPath === '/system/login') return;

        setActiveTabPath((prev) => (prev === currentPath ? prev : currentPath));
        setTabs((prev) => {
            if (prev.some((tab) => tab.path === currentPath)) return prev;

            const route = getRouteByPath(currentPath);
            return [
                ...prev,
                {
                    id: currentPath,
                    path: currentPath,
                    title: route?.description || currentPath,
                    isClosable: currentPath !== '/',
                },
            ];
        });
    }, [location]);

    return (
        <TabsContext.Provider
            value={{
                tabs,
                activeTabPath,
                workspaceViewMode,
                overlays,
                openTab,
                closeTab,
                switchTab,
                navigateInTab,
                updateTabTitle,
                setWorkspaceViewMode,
                toggleWorkspaceViewMode,
                openOverlay,
                closeOverlay,
                closeTopOverlay,
            }}
        >
            {children}
        </TabsContext.Provider>
    );
};

export const useTabs = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('useTabs must be used within a TabsProvider');
    }
    return context;
};
