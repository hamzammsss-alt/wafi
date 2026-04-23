import React from 'react';
import { Grid2x2, Home, Rows3, X } from 'lucide-react';
import { useTabs } from '../../src/contexts/TabsContext';

export const TabsBar: React.FC = () => {
    const { tabs, activeTabPath, switchTab, closeTab, workspaceViewMode, toggleWorkspaceViewMode } = useTabs();

    return (
        <div className="flex items-center gap-2 border-b border-slate-200/90 bg-gradient-to-r from-white/85 via-slate-50/90 to-white/85 px-1.5 pt-1.5 select-none">
            <div className="scrollbar-hide flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = tab.path === activeTabPath;
                    return (
                        <div
                            key={tab.path}
                            onClick={() => switchTab(tab.path)}
                            className={`
                  group relative flex min-w-[116px] max-w-[200px] cursor-pointer items-center gap-1.5 rounded-t-xl border border-b-0 px-3 py-1.5 transition-all
                  ${isActive
                                    ? 'z-10 border-slate-300/90 bg-white text-teal-700 shadow-[0_-6px_18px_rgba(15,23,42,0.08)]'
                                    : 'border-transparent bg-slate-200/70 text-slate-600 hover:border-slate-200 hover:bg-white/75 hover:text-slate-800'}
                `}
                        >
                            {tab.path === '/' ? <Home size={14} /> : null}

                            <span className="flex-1 truncate text-[11px] font-semibold">{tab.title}</span>

                            {tab.isClosable && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTab(tab.path);
                                    }}
                                    className={`
                      rounded-full p-0.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-500
                      ${isActive ? 'opacity-100' : ''}
                    `}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={toggleWorkspaceViewMode}
                className="mb-1 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
                title={workspaceViewMode === 'grid' ? 'العودة إلى العرض المفرد' : 'عرض عدة شاشات معًا'}
            >
                {workspaceViewMode === 'grid' ? <Rows3 size={14} /> : <Grid2x2 size={14} />}
                <span>{workspaceViewMode === 'grid' ? 'عرض مفرد' : 'عرض متعدد'}</span>
            </button>
        </div>
    );
};
