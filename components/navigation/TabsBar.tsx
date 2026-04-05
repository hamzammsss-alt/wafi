import React from 'react';
import { X, Home } from 'lucide-react';
import { useTabs } from '../../src/contexts/TabsContext';

export const TabsBar: React.FC = () => {
    const { tabs, activeTabPath, switchTab, closeTab } = useTabs();

    return (
        <div className="flex items-end gap-1 px-2 pt-2 bg-slate-200 border-b border-slate-300 select-none overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
                const isActive = tab.path === activeTabPath;
                return (
                    <div
                        key={tab.path}
                        onClick={() => switchTab(tab.path)}
                        className={`
              group relative flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-colors min-w-[120px] max-w-[200px]
              ${isActive
                                ? 'bg-[#f1f5f9] text-emerald-700 font-bold border-t border-x border-slate-300 shadow-[0_2px_0_white] z-10'
                                : 'bg-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border-t border-x border-transparent'}
            `}
                    >
                        {/* Icon */}
                        {tab.path === '/' ? <Home size={14} /> : null}

                        {/* Title */}
                        <span className="text-xs truncate flex-1">{tab.title}</span>

                        {/* Close Button */}
                        {tab.isClosable && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.path);
                                }}
                                className={`
                  p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 transition-all
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
