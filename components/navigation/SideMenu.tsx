import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, Menu, Search, X, LayoutGrid } from 'lucide-react';
import { SIDE_MENU_ITEMS, MenuItem } from '../../config/menuData';
import { getSlug } from '../../config/categorySlugs';
import { useTabs } from '../../src/contexts/TabsContext';
import { useEdition } from '../../src/hooks/useEdition';
import { countActionableMenuItems, filterMenuItemsForEdition } from '../../src/lib/edition';
import { useMyPermissions } from '../../src/hooks/useMyPermissions';

interface SideMenuProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ isCollapsed, toggleCollapse }) => {
    const location = useLocation();
    const { openTab } = useTabs();
    const { edition } = useEdition();
    const { can, whyNot } = useMyPermissions();

    const [searchTerm, setSearchTerm] = useState('');
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filteredSections = useMemo(
        () =>
            SIDE_MENU_ITEMS
                .map((section) => ({
                    ...section,
                    items: filterMenuItemsForEdition(section.items as MenuItem[], edition) as MenuItem[],
                }))
                .filter((section) => countActionableMenuItems(section.items) > 0),
        [edition]
    );

    const visibleSections = useMemo(() => {
        if (!normalizedSearch) return filteredSections;
        return filteredSections.filter((section) => {
            if (section.title.toLowerCase().includes(normalizedSearch)) return true;
            return section.items.some((item) => {
                if (String(item.label || '').toLowerCase().includes(normalizedSearch)) return true;
                return (item.subItems || []).some((sub) =>
                    String(sub.label || '').toLowerCase().includes(normalizedSearch)
                );
            });
        });
    }, [filteredSections, normalizedSearch]);

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
                relative h-full rounded-[18px] border border-slate-200/70 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-slate-200 shadow-[0_16px_26px_rgba(15,23,42,0.35)]
                transition-all duration-300 flex flex-col
                ${isCollapsed ? 'w-14' : 'w-56'}
            `}
        >
            <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_40%)]" />

            {/* Header / Toggle */}
            <div className="relative z-10 flex h-10 shrink-0 items-center justify-between border-b border-white/10 px-2.5">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-sky-500 text-[10px] font-extrabold text-white shadow-lg shadow-cyan-500/20">
                            W
                        </div>
                        <span className="text-xs font-extrabold tracking-wide text-white">WAFI ERP</span>
                    </div>
                )}
                <button onClick={toggleCollapse} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                    {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {!isCollapsed && (
                <div className="relative z-10 border-b border-white/10 p-2.5">
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute inset-y-0 right-2 my-auto text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث في القوائم..."
                            className="h-8 w-full rounded-lg border border-white/10 bg-slate-900/60 pr-8 pl-8 text-[11px] text-slate-100 outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/30"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 left-1 my-auto rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Menu Items */}
            <div className="custom-scrollbar relative z-10 flex-1 space-y-1 overflow-y-auto p-1.5">
                {visibleSections.map((section) => {
                    const SectionIcon = section.icon;
                    const slug = getSlug(section.title);
                    const isActive = location.pathname.includes(`/hub/${slug}`);
                    const isAllowed = !section.capabilityKey || can(section.capabilityKey);
                    const denyReason = section.capabilityKey ? whyNot(section.capabilityKey) : null;

                    return (
                        <button
                            key={section.title}
                            onClick={() => {
                                if (!isAllowed) return;
                                handleCategoryClick(section.title);
                            }}
                            onKeyDown={(e) => {
                                if (!isAllowed && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                }
                            }}
                            aria-disabled={!isAllowed}
                            className={`
                                group flex w-full items-center rounded-xl transition-all duration-200
                                ${isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-2.5 py-2'}
                                ${isActive && isAllowed
                                    ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-900/30'
                                    : isAllowed
                                        ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        : 'cursor-not-allowed text-slate-500 opacity-60'}
                            `}
                            title={isCollapsed ? section.title : (denyReason || '')}
                        >
                            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                                <SectionIcon
                                    size={isCollapsed ? 20 : 18}
                                    strokeWidth={1.5}
                                    className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-300'}
                                />
                                {!isCollapsed && <span className="text-[12px] font-semibold">{section.title}</span>}
                            </div>

                            {!isCollapsed && isActive && (
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></div>
                            )}
                        </button>
                    );
                })}

                {!visibleSections.length && !isCollapsed && (
                    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-center text-xs text-slate-400">
                        لا توجد نتائج مطابقة
                    </div>
                )}
            </div>

            {/* Footer */}
            {!isCollapsed && (
                <div className="relative z-10 border-t border-white/10 p-2 text-center text-[10px] text-slate-500">
                    v1.0.0 (Beta)
                </div>
            )}
        </div>
    );
};

