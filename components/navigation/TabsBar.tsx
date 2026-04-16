import React from 'react';
import { X, Home } from 'lucide-react';
import { useTabs } from '../../src/contexts/TabsContext';

export const TabsBar: React.FC = () => {
    const { tabs, activeTabPath, switchTab, closeTab } = useTabs();

    return (
        <div className="scrollbar-hide flex items-end gap-1 overflow-x-auto border-b border-slate-200/90 bg-gradient-to-r from-white/85 via-slate-50/90 to-white/85 px-1.5 pt-1.5 select-none">
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
                        {/* Icon */}
                        {tab.path === '/' ? <Home size={14} /> : null}

                        {/* Title */}
                        <span className="flex-1 truncate text-[11px] font-semibold">{tab.title}</span>

                        {/* Close Button */}
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
    );
};
