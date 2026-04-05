import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTabs } from '../../src/contexts/TabsContext';
import { ChevronDown, ChevronLeft, Search, Bell, Settings, Globe, Sun, Moon, Monitor, Check, User, Key, LogOut } from 'lucide-react';

import { TOP_MENU_ITEMS, MenuItem } from '../../config/menuData';
import { authService } from '../../services/authService';

// Helper Component for Side Flyout Items
const MenuFlyoutItem = ({ item, handleNavigation }: { item: MenuItem, handleNavigation: (path: string, title: string) => void }) => {
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
                                return (
                                    <button
                                        key={`s-${subIdx}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNavigation(subItem.path || '#', subItem.label);
                                            setIsHovered(false); // Close on click
                                        }}
                                        className="w-full text-right px-4 py-2 text-[12px] hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors"
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
        <div className="bg-[#1e293b] text-white relative z-[60] border-b border-slate-700" ref={menuRef}>
            {/* Single Row: Logo, Menus, Search, Notifications */}
            <div className="h-9 flex items-center justify-between px-3 select-none gap-3">
                {/* Logo Section */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-5 h-5 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded flex items-center justify-center font-bold text-xs shadow-md">
                        W
                    </div>
                </div>

                {/* Professional Top Menu (Restored) */}
                <div className="flex-1 px-2 flex items-center gap-1">
                    {Object.keys(TOP_MENU_ITEMS).filter(category => {
                        // Basic RBAC Filtering for Top Menu Categories
                        if (category === 'ملف وإدارة النظام' && !authService.hasPermission('ALL')) return false;
                        if (category === 'المحاسبة العامة' && !authService.hasPermission('Financials')) return false;
                        if (category === 'السندات والبنوك' && !authService.hasPermission('Treasury')) return false;
                        if (category === 'المبيعات والعملاء' && !authService.hasPermission('Sales')) return false;
                        if (category === 'المشتريات والاستيراد' && !authService.hasPermission('Purchasing')) return false;
                        if (category === 'المخزون والأصناف' && !authService.hasPermission('Inventory')) return false;
                        if (category === 'الموارد البشرية' && !authService.hasPermission('HR')) return false; // Assuming 'HR' permission exists, currently ALL
                        if (category === 'التصنيع' && !authService.hasPermission('Manufacturing')) return false; // Assuming 'Manufacturing' permission exists
                        return true;
                    }).map((category) => (
                        <div
                            key={category}
                            className="relative group"
                            onMouseEnter={() => setHoveredMenu(category)}
                            onMouseLeave={() => setHoveredMenu(null)}
                        >
                            <button className={`px-3 py-1 text-[13px] font-medium rounded-sm transition-colors whitespace-nowrap ${hoveredMenu === category ? 'text-white bg-slate-700/50' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
                                {category}
                            </button>

                            {/* Dropdown */}
                            {hoveredMenu === category && (
                                <div className="absolute top-full right-0 mt-0 pt-1 w-56 z-[70]">
                                    <div className="bg-white rounded-sm shadow-xl border border-slate-200 py-2 text-slate-700 animate-in fade-in zoom-in-95 duration-75 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                        {TOP_MENU_ITEMS[category].map((item, idx) => {
                                            if (item.divider) return <div key={idx} className="h-px bg-slate-100 my-1"></div>;

                                            // Handle Group Headers (Nested Menus) - SIDE FLYOUT STYLE
                                            if (item.subItems) {
                                                return <MenuFlyoutItem key={idx} item={item} handleNavigation={handleNavigation} />;
                                            }

                                            // Original single-level header check (kept for compatibility)
                                            if (item.header) return <div key={idx} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</div>;

                                            // Standard Item
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleNavigation(item.path!, item.label)}
                                                    className="w-full text-right px-4 py-2 text-[12px] hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors"
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
                <div className="max-w-[160px] hidden lg:block relative shrink-0">
                    <Search size={14} className="absolute top-1.5 right-2 text-slate-400" />
                    <input
                        className="w-full h-7 bg-slate-800 border border-slate-600 rounded text-[12px] pr-7 pl-2 focus:border-emerald-500 focus:outline-none placeholder-slate-500 text-slate-300"
                        placeholder="بحث سريع (Ctrl+Space)"
                    />
                </div>

                {/* User & Notifications Section */}
                <div className="flex items-center gap-3 text-slate-300 shrink-0">

                    {/* 1. Language Switcher */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'lang' ? null : 'lang'); }}
                            className={`p-1 rounded hover:bg-slate-700 transition-colors ${openMenu === 'lang' ? 'bg-slate-700 text-emerald-400' : ''}`}
                            title="اللغة / Language"
                        >
                            <Globe size={16} />
                        </button>
                        {openMenu === 'lang' && (
                            <div className="absolute top-full left-0 mt-2 w-32 bg-white text-slate-700 shadow-xl border border-slate-200 rounded-sm py-1 z-[100] text-[12px] animate-in fade-in zoom-in-95 duration-75">
                                <div className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between" onClick={() => setOpenMenu(null)}>
                                    <span>العربية</span>
                                    <Check size={14} className="text-emerald-600" />
                                </div>
                                <div className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between" onClick={() => setOpenMenu(null)}>
                                    <span>English</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Theme Switcher */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'theme' ? null : 'theme'); }}
                            className={`p-1 rounded hover:bg-slate-700 transition-colors ${openMenu === 'theme' ? 'bg-slate-700 text-emerald-400' : ''}`}
                            title="المظهر"
                        >
                            <Sun size={16} />
                        </button>
                        {openMenu === 'theme' && (
                            <div className="absolute top-full left-0 mt-2 w-32 bg-white text-slate-700 shadow-xl border border-slate-200 rounded-sm py-1 z-[100] text-[12px] animate-in fade-in zoom-in-95 duration-75">
                                <div className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2" onClick={() => setOpenMenu(null)}>
                                    <Sun size={14} /> <span>نهاري</span>
                                </div>
                                <div className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2" onClick={() => setOpenMenu(null)}>
                                    <Moon size={14} /> <span>ليلي</span>
                                </div>
                                <div className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2" onClick={() => setOpenMenu(null)}>
                                    <Monitor size={14} /> <span>تلقائي</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Notifications Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'notif' ? null : 'notif'); }}
                            className={`relative p-1 rounded hover:bg-slate-700 transition-colors ${openMenu === 'notif' ? 'bg-slate-700 text-amber-400' : 'hover:text-amber-400'}`}
                            title="الإشعارات"
                        >
                            <Bell size={16} />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-[#1e293b]"></span>
                        </button>

                        {openMenu === 'notif' && (
                            <div className="absolute top-full -left-20 mt-2 w-64 bg-white text-slate-700 shadow-xl border border-slate-200 rounded-sm z-[100] animate-in fade-in zoom-in-95 duration-75">
                                <div className="px-3 py-2 border-b border-slate-100 font-bold text-[12px] flex justify-between items-center bg-slate-50">
                                    <span>الإشعارات</span>
                                    <span className="text-xs text-blue-600 cursor-pointer hover:underline">مسح الكل</span>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
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
                                <div className="p-2 border-t border-slate-100 text-center">
                                    <button className="text-[11px] text-emerald-600 hover:underline">عرض كل الإشعارات</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Settings Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'settings' ? null : 'settings'); }}
                            className={`p-1 rounded hover:bg-slate-700 transition-colors ${openMenu === 'settings' ? 'bg-slate-700 text-emerald-400' : 'hover:text-amber-400'}`}
                            title="الإعدادات"
                        >
                            <Settings size={16} />
                        </button>
                        {openMenu === 'settings' && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white text-slate-700 shadow-xl border border-slate-200 rounded-sm py-1 z-[100] text-[12px] animate-in fade-in zoom-in-95 duration-75">
                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">النظام</div>
                                <div
                                    className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2"
                                    onClick={() => handleNavigation('/settings/preferences', 'خيارات عامة')}
                                >
                                    <Settings size={14} /> <span>خيارات عامة</span>
                                </div>
                                <div
                                    className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2"
                                    onClick={() => handleNavigation('/settings/company', 'معلومات الشركة')}
                                >
                                    <div className="w-3.5 h-3.5 border-2 border-slate-500 rounded-sm"></div> <span>معلومات الشركة</span>
                                </div>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">الأمان والإدارة</div>
                                <div
                                    className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2"
                                    onClick={() => handleNavigation('/system/users-guide', 'المستخدمين')}
                                >
                                    <div className="w-3.5 h-3.5 rounded-full bg-slate-400"></div> <span>المستخدمين</span>
                                </div>
                                <div
                                    className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2"
                                    onClick={() => handleNavigation('/system/backup', 'النسخ الاحتياطي')}
                                >
                                    <div className="w-3.5 h-3.5 bg-slate-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div> <span>النسخ الاحتياطي</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 border-l border-slate-700 pl-3 ml-1">
                        <div className="flex flex-col items-end">
                            <span className="font-medium text-slate-300">الفرع الرئيسي</span>
                            <span className="text-[10px]">2026</span>
                        </div>
                    </div>

                    <div className="w-px h-3 bg-slate-600"></div>

                    {/* User Profile Dropdown */}
                    <div className="relative">
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

                        {openMenu === 'user' && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white text-slate-700 shadow-xl border border-slate-200 rounded-sm py-1 z-[100] text-[12px] animate-in fade-in zoom-in-95 duration-75">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                        {authService.getCurrentUser()?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{authService.getCurrentUser()?.full_name || authService.getCurrentUser()?.username}</p>
                                        <p className="text-[10px] text-slate-500">{authService.getCurrentUser()?.role}</p>
                                    </div>
                                </div>
                                <div className="py-1">
                                    <div
                                        className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2"
                                        onClick={() => handleNavigation('/system/users-guide', 'ملفي الشخصي')}
                                    >
                                        <User size={14} className="text-slate-400" /> <span>ملفي الشخصي</span>
                                    </div>
                                    <div
                                        className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2"
                                        onClick={() => handleNavigation('/system/password', 'تغيير كلمة المرور')}
                                    >
                                        <Key size={14} className="text-slate-400" /> <span>تغيير كلمة المرور</span>
                                    </div>
                                </div>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <div className="py-1">
                                    <div
                                        className="px-3 py-2 hover:bg-red-50 text-red-600 cursor-pointer flex items-center gap-2"
                                        onClick={() => {
                                            authService.logout();
                                            localStorage.removeItem('branchId');
                                            localStorage.removeItem('fiscalYear');
                                            window.location.href = '#/system/login';
                                            window.location.reload();
                                        }}
                                    >
                                        <LogOut size={14} /> <span>تسجيل الخروج</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
