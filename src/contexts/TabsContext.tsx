import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface Tab {
    id: string;
    path: string;
    title: string;
    icon?: ReactNode; // Optional icon for the tab
    isClosable?: boolean; // Dashboard might not be closable
    component?: ReactNode; // The actual component to render (for keep-alive)
}

interface TabsContextType {
    tabs: Tab[];
    activeTabPath: string;
    openTab: (tab: Tab) => void;
    closeTab: (path: string) => void;
    switchTab: (path: string) => void;
    navigateInTab: (path: string, title?: string) => void;
    updateTabTitle: (path: string, newTitle: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const TabsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tabs, setTabs] = useState<Tab[]>([
        { id: 'dashboard', path: '/', title: 'الرئيسية', isClosable: false }
    ]);
    const [activeTabPath, setActiveTabPath] = useState<string>('/');
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

    return (
        <TabsContext.Provider value={{ tabs, activeTabPath, openTab, closeTab, switchTab, navigateInTab, updateTabTitle }}>
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
