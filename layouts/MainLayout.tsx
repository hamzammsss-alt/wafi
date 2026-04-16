import React from 'react';
import { AIChatAssistant } from '../components/AIChatAssistant';
import { TopMenuBar } from '../components/navigation/TopMenuBar';
import { SideMenu } from '../components/navigation/SideMenu';
import { TabsBar } from '../components/navigation/TabsBar';
import { Database, MapPin } from 'lucide-react';
import { useTabs } from '../src/contexts/TabsContext';
import { getRouteByPath } from '../config/routes';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { useEdition } from '../src/hooks/useEdition';
import { isRouteAllowedForEdition } from '../src/lib/edition';
import { useMyPermissions } from '../src/hooks/useMyPermissions';
import { RouteRenderBoundary } from '../src/components/ui/RouteRenderBoundary';

interface MainLayoutProps {
  children?: React.ReactNode;
}

import { useGlobalShortcuts } from '../src/hooks/useGlobalShortcuts';

export const MainLayout: React.FC<MainLayoutProps> = () => {
  const [isAIOpen, setIsAIOpen] = React.useState(false);
  const [isSideMenuCollapsed, setIsSideMenuCollapsed] = React.useState(false);
  const { tabs, activeTabPath, closeTab } = useTabs();
  const { edition } = useEdition();
  const { can, whyNot } = useMyPermissions();
  const currentDir =
    (typeof document !== 'undefined' && document?.documentElement?.dir) || 'rtl';

  const handleEscapeClose = React.useCallback(() => {
    if (isAIOpen) {
      setIsAIOpen(false);
      return;
    }

    const activeTab = tabs.find((tab) => tab.path === activeTabPath);
    if (!activeTab || activeTab.isClosable === false || activeTab.path === '/') {
      return;
    }

    closeTab(activeTab.path);
  }, [activeTabPath, closeTab, isAIOpen, tabs]);

  // Enable Global "Enter as Tab" navigation
  useGlobalShortcuts({ onCancel: handleEscapeClose });



  return (
    <div
      className={`app-shell relative flex h-screen flex-col overflow-hidden ${currentDir === 'rtl' ? 'font-rtl' : 'font-ui'}`}
      dir={currentDir}
      style={{ position: 'relative', isolation: 'isolate' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-28 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl" />
      </div>

      {/* 0. COMBINED TITLE BAR & TOP MENU */}
      <TopMenuBar />

      {/* 2. MAIN LAYOUT BODY */}
      <div className="relative z-10 flex flex-1 gap-1.5 overflow-hidden px-1.5 pb-1.5 pt-1 md:px-2 md:pb-2">

        {/* SIDE MENU */}
        <SideMenu
          isCollapsed={isSideMenuCollapsed}
          toggleCollapse={() => setIsSideMenuCollapsed(!isSideMenuCollapsed)}
        />

        {/* WORKSPACE */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/75 shadow-[0_18px_34px_rgba(15,23,42,0.08)] backdrop-blur">
          {/* TABS BAR (Moved inside workspace) */}
          <TabsBar />

          <main className="custom-scrollbar relative z-0 flex-1 overflow-auto p-2 md:p-2.5">
            <div className="h-full min-h-full w-full">
              {tabs.map((tab) => {
                const route = getRouteByPath(tab.path);
                const isActive = tab.path === activeTabPath;
                const isAllowed = isRouteAllowedForEdition(tab.path, edition);
                const hasRoutePermission = !route?.capabilityKey || can(route.capabilityKey);
                const deniedKey = route?.capabilityKey ? whyNot(route.capabilityKey) : null;
                const routeElement = route?.component;
                const renderedRouteComponent = React.isValidElement(routeElement)
                  ? React.cloneElement(routeElement, { key: `${tab.path}::route` })
                  : routeElement;

                return (
                  <div
                    key={tab.path}
                    style={{ display: isActive ? 'block' : 'none', height: '100%' }}
                    className="animate-in fade-in duration-200"
                  >
                    {/* Render the component mapped in routes, or a placeholder if not found */}
                    {!route ? (
                      <PlaceholderPage title="صفحة غير موجودة" category="System" />
                    ) : !isAllowed ? (
                      <PlaceholderPage title="غير متاح في النسخة الحالية" category="Editions" />
                    ) : !hasRoutePermission ? (
                      <PlaceholderPage title={deniedKey || 'error.permission_denied'} category="Security" />
                    ) : (
                      <RouteRenderBoundary routePath={tab.path}>
                        {renderedRouteComponent}
                      </RouteRenderBoundary>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      {/* 3. FOOTER */}
      <footer className="relative z-10 mx-1.5 mb-1.5 flex h-7 shrink-0 items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 px-2.5 text-[10px] text-slate-600 shadow-sm backdrop-blur md:mx-2 md:mb-2">
        <div className="flex gap-4">
          <span className="flex cursor-pointer items-center gap-1 hover:text-teal-700"><Database size={11} /> WAFI_DB_2026</span>
          <span className="flex cursor-pointer items-center gap-1 hover:text-teal-700"><MapPin size={11} /> الفرع الرئيسي</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-700">متصل</span>
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></div>
        </div>
      </footer>

      <AIChatAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
};
