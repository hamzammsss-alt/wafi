import React from 'react';
import { Database, Layers3, MapPin, X } from 'lucide-react';
import { AIChatAssistant } from '../components/AIChatAssistant';
import { SideMenu } from '../components/navigation/SideMenu';
import { TabsBar } from '../components/navigation/TabsBar';
import { TopMenuBar } from '../components/navigation/TopMenuBar';
import { getRouteByPath } from '../config/routes';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { RouteRenderBoundary } from '../src/components/ui/RouteRenderBoundary';
import { useTabs } from '../src/contexts/TabsContext';
import { useEdition } from '../src/hooks/useEdition';
import { useGlobalShortcuts } from '../src/hooks/useGlobalShortcuts';
import { useMyPermissions } from '../src/hooks/useMyPermissions';
import { isRouteAllowedForEdition } from '../src/lib/edition';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = () => {
  const [isAIOpen, setIsAIOpen] = React.useState(false);
  const [isSideMenuCollapsed, setIsSideMenuCollapsed] = React.useState(false);
  const {
    tabs,
    activeTabPath,
    closeTab,
    workspaceViewMode,
    overlays,
    closeOverlay,
    closeTopOverlay,
    switchTab,
  } = useTabs();
  const { edition } = useEdition();
  const { can, whyNot } = useMyPermissions();
  const currentDir =
    (typeof document !== 'undefined' && document?.documentElement?.dir) || 'rtl';

  const handleEscapeClose = React.useCallback(() => {
    if (isAIOpen) {
      setIsAIOpen(false);
      return;
    }

    if (overlays.length > 0) {
      closeTopOverlay();
      return;
    }

    const activeTab = tabs.find((tab) => tab.path === activeTabPath);
    if (!activeTab || activeTab.isClosable === false || activeTab.path === '/') {
      return;
    }

    closeTab(activeTab.path);
  }, [activeTabPath, closeTab, closeTopOverlay, isAIOpen, overlays.length, tabs]);

  const renderTabSurface = React.useCallback((tab: (typeof tabs)[number]) => {
    const route = getRouteByPath(tab.path);
    const isAllowed = isRouteAllowedForEdition(tab.path, edition);
    const hasRoutePermission = !route?.capabilityKey || can(route.capabilityKey);
    const deniedKey = route?.capabilityKey ? whyNot(route.capabilityKey) : null;
    const routeElement = route?.component;
    const renderedRouteComponent = React.isValidElement(routeElement)
      ? React.cloneElement(routeElement, { key: `${tab.path}::route` })
      : routeElement;

    if (!route) {
      return <PlaceholderPage title="صفحة غير موجودة" category="System" />;
    }
    if (!isAllowed) {
      return <PlaceholderPage title="غير متاح في النسخة الحالية" category="Editions" />;
    }
    if (!hasRoutePermission) {
      return <PlaceholderPage title={deniedKey || 'error.permission_denied'} category="Security" />;
    }

    return (
      <RouteRenderBoundary routePath={tab.path}>
        {renderedRouteComponent}
      </RouteRenderBoundary>
    );
  }, [can, edition, whyNot]);

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

      <TopMenuBar />

      <div className="relative z-10 flex flex-1 gap-1.5 overflow-hidden px-1.5 pb-1.5 pt-1 md:px-2 md:pb-2">
        <SideMenu
          isCollapsed={isSideMenuCollapsed}
          toggleCollapse={() => setIsSideMenuCollapsed(!isSideMenuCollapsed)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
          <TabsBar />

          <main className="custom-scrollbar relative z-20 flex-1 overflow-auto p-2 md:p-2.5">
            {workspaceViewMode === 'grid' ? (
              <div className="grid min-h-full w-full grid-cols-1 gap-3 xl:grid-cols-2">
                {tabs.map((tab) => {
                  const isActive = tab.path === activeTabPath;
                  return (
                    <section
                      key={tab.path}
                      className={`flex min-h-[420px] min-w-0 flex-col rounded-[22px] border bg-white/90 shadow-sm transition ${
                        isActive ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => switchTab(tab.path)}
                        className={`flex w-full items-center justify-between rounded-t-[21px] border-b px-4 py-2.5 text-right ${
                          isActive ? 'border-sky-200 bg-sky-50/80' : 'border-slate-200 bg-slate-50/80'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-800">{tab.title}</div>
                          <div className="truncate text-[11px] text-slate-500">{tab.path}</div>
                        </div>
                        <div className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-sky-700 shadow-sm">
                          {isActive ? 'نشطة' : 'فتح'}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0 p-2">
                        {renderTabSurface(tab)}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="h-full min-h-full w-full">
                {tabs.map((tab) => (
                  <div
                    key={tab.path}
                    style={{ display: tab.path === activeTabPath ? 'block' : 'none', height: '100%' }}
              className="h-full"
                  >
                    {renderTabSurface(tab)}
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

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

      {overlays.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40">
          {overlays.map((overlay, index) => {
            const isTop = index === overlays.length - 1;
            const widthClassName = overlay.widthClassName || 'max-w-[min(96vw,1500px)]';
            return (
              <div
                key={overlay.id}
                className={`absolute inset-0 flex items-center justify-center p-3 md:p-6 ${
                  isTop ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
                style={{ zIndex: 60 + index }}
              >
                <div
                  className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
                  onClick={() => {
                    if (isTop) closeOverlay(overlay.id);
                  }}
                />
                <section className={`relative flex h-[92vh] w-full ${widthClassName} overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]`}>
                  <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-teal-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                        <Layers3 size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-800">{overlay.title}</div>
                        <div className="truncate text-[11px] text-slate-500">شاشة مرجعية فوق الشاشة الحالية</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => closeOverlay(overlay.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                      aria-label={`إغلاق ${overlay.title}`}
                    >
                      <X size={18} />
                    </button>
                  </header>
                <div className="custom-scrollbar min-h-0 flex-1 overflow-auto bg-[#eef3fb] p-2 md:p-3">
                  <div className="flex min-h-full flex-col rounded-[22px] border border-slate-200 bg-white shadow-sm">
                      {overlay.content}
                    </div>
                  </div>
                </section>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
