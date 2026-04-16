import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTabs } from '../../src/contexts/TabsContext';
import { ChevronDown, ChevronLeft, Search, Bell, Settings, Globe, Sun, Moon, Monitor, Check, User, Key, LogOut } from 'lucide-react';

import { TOP_MENU_ITEMS, MenuItem } from '../../config/menuData';
import { authService } from '../../services/authService';
import { useEdition } from '../../src/hooks/useEdition';
import { countActionableMenuItems, filterMenuItemsForEdition } from '../../src/lib/edition';
import { FloatingDropdown, floatingMenuItemClass } from '../../src/components/ui/FloatingDropdown';
import { useMyPermissions } from '../../src/hooks/useMyPermissions';
import ZoomControls from '../../src/components/ZoomControls';

// Helper Component for Side Flyout Items
const MenuFlyoutItem: React.FC<{
    item: MenuItem;
    handleNavigation: (path: string, title: string) => void;
    can: (capabilityKey: string) => boolean;
    whyNot: (capabilityKey: string) => string | null;
}> = ({
    item,
    handleNavigation,
    can,
    whyNot,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [coords, setCoords] = useState<{ top: number, right: number } | null>(null);
    const itemRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (itemRef.current) {
            const rect = itemRef.current.getBoundingClientRect();
            // RTL: The flyout should appear to the LEFT of the element.
            setCoords({
                top: rect.top,
                right: window.innerWidth - rect.left
            });
            setIsHovered(true);
        }
    };

    return (
        <div
            ref={itemRef}
            className="relative px-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                className={`w-full text-right px-3 py-2 text-[12px] flex items-center justify-between transition-colors rounded-sm ${isHovered ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-emerald-50 hover:text-emerald-700'}`}
            >
                <div className="flex items-center gap-2">
                    {item.icon && <item.icon size={14} className="text-slate-400" />}
                    <span>{item.label}</span>
                </div>
                <ChevronLeft size={12} className="text-slate-400" />
            </button>

            {isHovered && coords && createPortal(
                <div
                    className="fixed z-[9999] w-56 py-1"
                    style={{
                        top: coords.top,
                        right: coords.right - 5,
                        direction: 'rtl'
                    }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="bg-white rounded-sm shadow-xl border border-slate-200 py-2 text-slate-700 animate-in fade-in zoom-in-95 duration-75">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-50 mb-1">{item.label}</div>
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {item.subItems?.map((subItem, subIdx) => {
                                if (subItem.divider) return <div key={`s-${subIdx}`} className="h-px bg-slate-100 my-1"></div>;
                                const isAllowed = !subItem.capabilityKey || can(subItem.capabilityKey);
                                const denyReason = subItem.capabilityKey ? whyNot(subItem.capabilityKey) : null;
                                return (
                                    <button
                                        key={`s-${subIdx}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isAllowed) return;
                                            handleNavigation(subItem.path || '#', subItem.label);
                                            setIsHovered(false); // Close on click
                                        }}
                                        onKeyDown={(e) => {
                                            if (!isAllowed && (e.key === 'Enter' || e.key === ' ')) {
                                                e.preventDefault();
                                            }
                                        }}
                                        aria-disabled={!isAllowed}
                                        title={denyReason || ''}
                                        className={`w-full text-right px-4 py-2 text-[12px] flex items-center gap-2 transition-colors ${isAllowed ? 'hover:bg-emerald-50 hover:text-emerald-700' : 'opacity-60 cursor-not-allowed text-slate-400'}`}
                                    >
                                        {subItem.icon && <subItem.icon size={13} className="text-slate-400" />}
                                        <span>{subItem.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export const TopMenuBar: React.FC = () => {
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
    const { openTab } = useTabs();
    const menuRef = useRef<HTMLDivElement>(null);
    const { edition } = useEdition();
    const { can, whyNot } = useMyPermissions();

    const editionMenu = useMemo(() => {
        const mapped: Record<string, MenuItem[]> = {};
        for (const [category, items] of Object.entries(TOP_MENU_ITEMS)) {
            const filtered = filterMenuItemsForEdition(items as MenuItem[], edition) as MenuItem[];
            if (countActionableMenuItems(filtered) > 0) {
                mapped[category] = filtered;
            }
        }
        return mapped;
    }, [edition]);

    const handleNavigation = (path: string, title: string) => {
        if (!path || path === '#') return;

        openTab({
            id: path,
            path: path,
            title: title,
            isClosable: true
        });
        setHoveredMenu(null);
        setOpenMenu(null);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const outsideMenu = menuRef.current && !menuRef.current.contains(target);

            if (outsideMenu) {
                setOpenMenu(null);
            }
        };

        if (openMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenu]);

    return (
        <div className="relative z-[60] mx-1.5 mt-1.5 overflow-visible rounded-[18px] border border-slate-800/80 bg-slate-950/85 text-white shadow-[0_14px_24px_rgba(2,6,23,0.32)] backdrop-blur md:mx-2" ref={menuRef}>
            {/* Single Row: Logo, Menus, Search, Notifications */}
            <div className="flex h-9 items-center justify-between gap-2 px-2.5 select-none xl:h-10">
                {/* Logo Section */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-sky-500 text-[10px] font-extrabold shadow-md xl:h-7 xl:w-7 xl:text-xs">
                        W
                    </div>
                </div>

                {/* Professional Top Menu (Restored) */}
                <div className="flex min-w-0 flex-1 items-center gap-0.5 px-1">
                    {Object.keys(editionMenu).map((category) => (
                        <div
                            key={category}
                            className="relative group"
                            onMouseEnter={() => setHoveredMenu(category)}
                            onMouseLeave={() => setHoveredMenu(null)}
                        >
                            <button className={`whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-medium transition-colors xl:px-2.5 xl:text-[12px] ${hoveredMenu === category ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                                {category}
                            </button>

                            {/* Dropdown */}
                            {hoveredMenu === category && (
                                <div className="absolute top-full right-0 z-[70] mt-0 w-56 pt-1">
                                    <div className="bg-white rounded-sm shadow-xl border border-slate-200 py-2 text-slate-700 animate-in fade-in zoom-in-95 duration-75 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                        {editionMenu[category].map((item, idx) => {
                                            if (item.divider) return <div key={idx} className="h-px bg-slate-100 my-1"></div>;

                                            // Handle Group Headers (Nested Menus) - SIDE FLYOUT STYLE
                                            if (item.subItems) {
                                                return (
                                                    <MenuFlyoutItem
                                                        key={idx}
                                                        item={item}
                                                        handleNavigation={handleNavigation}
                                                        can={can}
                                                        whyNot={whyNot}
                                                    />
                                                );
                                            }

                                            // Original single-level header check (kept for compatibility)
                                            if (item.header) return <div key={idx} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</div>;

                                            // Standard Item
                                            const Icon = item.icon;
                                            const isAllowed = !item.capabilityKey || can(item.capabilityKey);
                                            const denyReason = item.capabilityKey ? whyNot(item.capabilityKey) : null;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (!isAllowed) return;
                                                        handleNavigation(item.path!, item.label);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (!isAllowed && (e.key === 'Enter' || e.key === ' ')) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    aria-disabled={!isAllowed}
                                                    title={denyReason || ''}
                                                    className={`w-full text-right px-4 py-2 text-[12px] flex items-center gap-2 transition-colors ${isAllowed ? 'hover:bg-emerald-50 hover:text-emerald-700' : 'opacity-60 cursor-not-allowed text-slate-400'}`}
                                                >
                                                    {Icon && <Icon size={14} className="text-slate-400" />}
                                                    <span>{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Global Search (Compact) */}
                <div className="relative hidden max-w-[170px] shrink-0 xl:block">
                    <Search size={14} className="absolute right-2 top-2 text-slate-400" />
                    <input
                        className="h-7 w-full rounded-lg border border-slate-700/80 bg-slate-900/85 pr-7 pl-2 text-[11px] text-slate-300 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                        placeholder="بحث سريع (Ctrl+Space)"
                    />
                </div>

                {/* User & Notifications Section */}
                <div className="flex shrink-0 items-center gap-2 text-slate-300">

                    {/* Zoom Controls */}
                    <div className="hidden lg:block">
                        <ZoomControls />
                    </div>

                    {/* 1. Language Switcher */}
                    <FloatingDropdown
                        isOpen={openMenu === 'lang'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={140}
                        align="left"
                        trigger={
                            <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'lang' ? null : 'lang'); }}
                                className={`p-1 rounded hover:bg-slate-700 transition-colors ${openMenu === 'lang' ? 'bg-slate-700 text-emerald-400' : ''}`}
                                title="اللغة / Language"
                            >
                                <Globe size={16} />
                            </button>
                        }
                    >
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center justify-between`} onClick={() => setOpenMenu(null)}>
                            <span>العربية</span>
                            <Check size={14} className="text-emerald-600" />
                        </button>
                        <button role="menuitem" className={floatingMenuItemClass} onClick={() => setOpenMenu(null)}>
                            English
                        </button>
                    </FloatingDropdown>

                    {/* 2. Theme Switcher */}
                    <FloatingDropdown
                        isOpen={openMenu === 'theme'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={140}
                        align="left"
                        trigger={
                            <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'theme' ? null : 'theme'); }}
                                className={`p-1 rounded hover:bg-slate-700 transition-colors ${openMenu === 'theme' ? 'bg-slate-700 text-emerald-400' : ''}`}
                                title="المظهر"
                            >
                                <Sun size={16} />
                            </button>
                        }
                    >
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => setOpenMenu(null)}>
                            <Sun size={14} /> <span>نهاري</span>
                        </button>
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => setOpenMenu(null)}>
                            <Moon size={14} /> <span>ليلي</span>
                        </button>
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => setOpenMenu(null)}>
                            <Monitor size={14} /> <span>تلقائي</span>
                        </button>
                    </FloatingDropdown>

                    {/* 3. Notifications Dropdown */}
                    <FloatingDropdown
                        isOpen={openMenu === 'notif'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={280}
                        align="left"
                        trigger={
                            <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'notif' ? null : 'notif'); }}
                                className={`relative p-1 rounded hover:bg-slate-700 transition-colors ${openMenu === 'notif' ? 'bg-slate-700 text-amber-400' : 'hover:text-amber-400'}`}
                                title="الإشعارات"
                            >
                                <Bell size={16} />
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-[#1e293b]"></span>
                            </button>
                        }
                    >
                        <div className="flex justify-between items-center px-1 pb-2 mb-1 border-b border-sky-100/60">
                            <span className="text-[12px] font-bold text-slate-700">الإشعارات</span>
                            <span className="text-[11px] text-blue-600 cursor-pointer hover:underline">مسح الكل</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto -mx-1.5">
                            <div className="px-3 py-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>
                                    <div>
                                        <p className="text-[12px] font-medium text-slate-800">اكتمل النسخ الاحتياطي</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">تم حفظ النسخة الاحتياطية بنجاح في local/db/backup.sql</p>
                                        <p className="text-[9px] text-slate-400 mt-1">منذ 5 دقيقة</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-3 py-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></div>
                                    <div>
                                        <p className="text-[12px] font-medium text-slate-800">تنبيه مخزون منخفض</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">الصنف "كرسي مكتب فاخر" وصل إلى حد الطلب (5).</p>
                                        <p className="text-[9px] text-slate-400 mt-1">منذ 2 ساعة</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-3 py-3 hover:bg-emerald-50 cursor-pointer">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
                                    <div>
                                        <p className="text-[12px] font-medium text-slate-800">تحديث النظام</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">يتوفر تحديث جديد للنظام (v2.1.0). يرجى التحديث.</p>
                                        <p className="text-[9px] text-slate-400 mt-1">منذ يوم أمس</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 mt-1 border-t border-sky-100/60 text-center">
                            <button role="menuitem" className="text-[11px] text-emerald-600 hover:underline">عرض كل الإشعارات</button>
                        </div>
                    </FloatingDropdown>

                    {/* Settings Dropdown */}
                    <FloatingDropdown
                        isOpen={openMenu === 'settings'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={210}
                        align="left"
                        title="الإعدادات"
                        trigger={
                            <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'settings' ? null : 'settings'); }}
                                className={`p-1 rounded hover:bg-slate-700 transition-colors ${openMenu === 'settings' ? 'bg-slate-700 text-emerald-400' : 'hover:text-amber-400'}`}
                                title="الإعدادات"
                            >
                                <Settings size={16} />
                            </button>
                        }
                    >
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">النظام</div>
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => handleNavigation('/settings/preferences', 'خيارات عامة')}>
                            <Settings size={14} /> <span>خيارات عامة</span>
                        </button>
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => handleNavigation('/settings/company', 'معلومات الشركة')}>
                            <div className="w-3.5 h-3.5 border-2 border-slate-500 rounded-sm"></div> <span>معلومات الشركة</span>
                        </button>
                        <div className="h-px bg-slate-100 my-1 -mx-1.5"></div>
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">الأمان والإدارة</div>
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => handleNavigation('/system/users-guide', 'المستخدمين')}>
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-400"></div> <span>المستخدمين</span>
                        </button>
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => handleNavigation('/system/backup', 'النسخ الاحتياطي')}>
                            <div className="w-3.5 h-3.5 bg-slate-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div> <span>النسخ الاحتياطي</span>
                        </button>
                    </FloatingDropdown>

                    <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 border-l border-slate-700 pl-3 ml-1">
                        <div className="flex flex-col items-end">
                            <span className="font-medium text-slate-300">الفرع الرئيسي</span>
                            <span className="text-[10px]">2026</span>
                        </div>
                    </div>

                    <div className="w-px h-3 bg-slate-600"></div>

                    {/* User Profile Dropdown */}
                    <FloatingDropdown
                        isOpen={openMenu === 'user'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={220}
                        align="left"
                        trigger={
                            <div
                                className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors cursor-pointer ${openMenu === 'user' ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-600 hover:border-emerald-500'}`}
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'user' ? null : 'user'); }}
                                title="المستخدم"
                            >
                                <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-[10px]">
                                    {authService.getCurrentUser()?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="text-[11px]">{authService.getCurrentUser()?.full_name || authService.getCurrentUser()?.username}</span>
                            </div>
                        }
                    >
                        <div className="flex items-center gap-3 px-1 pb-2 mb-1 border-b border-sky-100/60">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {authService.getCurrentUser()?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-[13px]">{authService.getCurrentUser()?.full_name || authService.getCurrentUser()?.username}</p>
                                <p className="text-[10px] text-slate-500">{authService.getCurrentUser()?.role}</p>
                            </div>
                        </div>
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => handleNavigation('/system/users-guide', 'ملفي الشخصي')}>
                            <User size={14} className="text-slate-400" /> <span>ملفي الشخصي</span>
                        </button>
                        <button role="menuitem" className={`${floatingMenuItemClass} flex items-center gap-2`} onClick={() => handleNavigation('/system/password', 'تغيير كلمة المرور')}>
                            <Key size={14} className="text-slate-400" /> <span>تغيير كلمة المرور</span>
                        </button>
                        <div className="h-px bg-slate-100 my-1 -mx-1.5"></div>
                        <button
                            role="menuitem"
                            className={`${floatingMenuItemClass} flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700`}
                            onClick={() => {
                                authService.logout();
                                localStorage.removeItem('branchId');
                                localStorage.removeItem('fiscalYear');
                                window.location.href = '#/system/login';
                                window.location.reload();
                            }}
                        >
                            <LogOut size={14} /> <span>تسجيل الخروج</span>
                        </button>
                    </FloatingDropdown>
                </div>
            </div>
        </div>
    );
};
