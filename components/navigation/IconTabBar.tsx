import React from 'react';
import { RIBBON_TABS } from '../../config/menuData';

interface IconTabBarProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export const IconTabBar: React.FC<IconTabBarProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="bg-white border-b border-slate-200 px-2 flex items-center gap-1 overflow-x-auto scrollbar-hide shadow-sm z-[40] relative">
            {RIBBON_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            flex flex-col items-center gap-1 px-4 py-2 min-w-[80px] transition-all border-b-2 outline-none
                            ${isActive
                                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}
                        `}
                    >
                        <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="mb-0.5" />
                        <span className="text-[11px] font-medium whitespace-nowrap">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
