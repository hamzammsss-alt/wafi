import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Menu, Search, X, LayoutGrid } from 'lucide-react';
import { SIDE_MENU_ITEMS, MenuItem } from '../../config/menuData';
import { getSlug } from '../../config/categorySlugs';
import { useTabs } from '../../src/contexts/TabsContext';
import { authService } from '../../services/authService';

interface SideMenuProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

// ... imports remain same ...

export const SideMenu: React.FC<SideMenuProps> = ({ isCollapsed, toggleCollapse }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { openTab } = useTabs();

    // State for Search
    const [searchTerm, setSearchTerm] = useState('');

    const handleCategoryClick = (title: string) => {
        const slug = getSlug(title);
        // Navigate or Open Tab? Ideally Open Tab for main navigation feel
        openTab({
            id: `hub-${slug}`,
            path: `/hub/${slug}`,
            title: title,
            isClosable: true,
            icon: <LayoutGrid size={16} />
        });
    };

    return (
        <div
            className={`
                h-full bg-[#1e293b] text-slate-300 transition-all duration-300 flex flex-col border-l border-slate-700
                ${isCollapsed ? 'w-14' : 'w-56'}
            `}
        >
            {/* Header / Toggle */}
            <div className="h-9 flex items-center justify-between px-3 border-b border-slate-700 shrink-0 bg-[#11182750]">
                {!isCollapsed && <span className="font-bold text-lg text-emerald-500 tracking-wide font-sans">WAFI ERP</span>}
                <button onClick={toggleCollapse} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                    {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2 space-y-0.5">
                {SIDE_MENU_ITEMS.filter(section => {
                    // RBAC Filtering (Same as before)
                    if (section.title === 'إدارة النظام' && !authService.hasPermission('ALL')) return false;
                    if (section.title === 'الحسابات العامة' && !authService.hasPermission('Financials')) return false;
                    if (section.title === 'الخزينة والبنوك' && !authService.hasPermission('Treasury')) return false;
                    if (section.title === 'المبيعات والعملاء' && !authService.hasPermission('Sales')) return false;
                    if (section.title === 'المشتريات' && !authService.hasPermission('Purchasing')) return false;
                    if (section.title === 'المخزون' && !authService.hasPermission('Inventory')) return false;
                    if (section.title === 'الموارد البشرية' && !authService.hasPermission('HR')) return false;
                    if (section.title === 'التصنيع' && !authService.hasPermission('Manufacturing')) return false;
                    return true;
                }).map((section) => {
                    const SectionIcon = section.icon;
                    const slug = getSlug(section.title);
                    const isActive = location.pathname.includes(`/hub/${slug}`);

                    return (
                        <button
                            key={section.title}
                            onClick={() => handleCategoryClick(section.title)}
                            className={`
                                w-full flex items-center rounded-lg transition-all duration-200 group
                                ${isCollapsed ? 'justify-center py-3 px-0' : 'justify-between px-3 py-2.5'}
                                ${isActive
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'}
                            `}
                            title={isCollapsed ? section.title : ''}
                        >
                            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                                <SectionIcon
                                    size={isCollapsed ? 20 : 18}
                                    strokeWidth={1.5}
                                    className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}
                                />
                                {!isCollapsed && <span className="font-medium text-[13px]">{section.title}</span>}
                            </div>

                            {!isCollapsed && isActive && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            {!isCollapsed && (
                <div className="p-2 border-t border-slate-700 text-[10px] text-slate-500 text-center bg-[#11182750]">
                    v1.0.0 (Beta)
                </div>
            )}
        </div>
    );
};

