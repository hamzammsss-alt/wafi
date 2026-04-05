import React from 'react';
import { AIChatAssistant } from '../components/AIChatAssistant';
import { TopMenuBar } from '../components/navigation/TopMenuBar';
import { SideMenu } from '../components/navigation/SideMenu';
import { TabsBar } from '../components/navigation/TabsBar';
import { Database, MapPin } from 'lucide-react';
import { useTabs } from '../src/contexts/TabsContext';
import { getRouteByPath } from '../config/routes';
import { PlaceholderPage } from '../pages/PlaceholderPage';

interface MainLayoutProps {
  children?: React.ReactNode;
}

import { useGlobalShortcuts } from '../src/hooks/useGlobalShortcuts';

export const MainLayout: React.FC<MainLayoutProps> = () => {
  const [isAIOpen, setIsAIOpen] = React.useState(false);
  const [isSideMenuCollapsed, setIsSideMenuCollapsed] = React.useState(false);
  const { tabs, activeTabPath } = useTabs();

  // Enable Global "Enter as Tab" navigation
  useGlobalShortcuts({});



  return (
    <div
      className="flex flex-col h-screen bg-[#f1f5f9] font-sans text-right overflow-hidden border-t-4 border-emerald-600"
      dir="rtl"
      style={{ position: 'relative', isolation: 'isolate' }}
    >
      {/* 0. COMBINED TITLE BAR & TOP MENU */}
      <TopMenuBar />

      {/* 2. MAIN LAYOUT BODY */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* SIDE MENU */}
        <SideMenu
          isCollapsed={isSideMenuCollapsed}
          toggleCollapse={() => setIsSideMenuCollapsed(!isSideMenuCollapsed)}
        />

        {/* WORKSPACE */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* TABS BAR (Moved inside workspace) */}
          <TabsBar />

          <main className="flex-1 overflow-auto bg-[#f1f5f9] relative z-0 p-4 custom-scrollbar">
            <div className="max-w-[1900px] mx-auto min-h-full h-full">
              {tabs.map((tab) => {
                const route = getRouteByPath(tab.path);
                const isActive = tab.path === activeTabPath;

                return (
                  <div
                    key={tab.path}
                    style={{ display: isActive ? 'block' : 'none', height: '100%' }}
                    className="animate-in fade-in duration-200"
                  >
                    {/* Render the component mapped in routes, or a placeholder if not found */}
                    {route ? route.component : <PlaceholderPage title="صفحة غير موجودة" category="System" />}
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      {/* 3. FOOTER */}
      <footer className="h-6 bg-[#f8fafc] text-slate-500 text-[10px] flex items-center justify-between px-3 select-none shrink-0 border-t border-slate-300 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 hover:text-emerald-600 cursor-pointer"><Database size={10} /> WAFI_DB_2026</span>
          <span className="flex items-center gap-1 hover:text-emerald-600 cursor-pointer"><MapPin size={10} /> الفرع الرئيسي</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 font-bold">متصل</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      </footer>

      <AIChatAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
};

