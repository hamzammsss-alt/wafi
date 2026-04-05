import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Wallet, ShoppingCart, Users, ShoppingBag, FileText,
    ArrowUpRight, ArrowDownRight, Package, DollarSign, Building, Truck,
    Clock, Target, UserPlus, Coins, BarChart3, PieChart, Activity,
    MoreHorizontal, ChevronRight, Receipt, Banknote, Sparkles, Bot, Settings, X, Search, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TOP_MENU_ITEMS, MenuItem } from '../../config/menuData';
import { useTabs } from '../../src/contexts/TabsContext';

// Import Widgets
import { ChartWidget } from './widgets/ChartWidget';
import { TableWidget, Column } from './widgets/TableWidget';
import { QuickAction } from './widgets/QuickActions';

// --- HELPERS ---
const flattenMenuItems = (items: Record<string, MenuItem[]>) => {
    let flat: MenuItem[] = [];
    Object.values(items).forEach(group => {
        group.forEach(item => {
            if (item.subItems) {
                flat.push(...item.subItems);
            } else if (!item.header && !item.divider && item.path) {
                flat.push(item);
            }
        });
    });
    return flat;
};

const ALL_ACTIONS = flattenMenuItems(TOP_MENU_ITEMS);

// --- BENTO COMPONENTS ---

// 1. Bento Box Wrapper
const BentoBox: React.FC<{
    className?: string;
    children: React.ReactNode;
    title?: string;
    action?: React.ReactNode;
    transparent?: boolean;
    onClick?: () => void;
}> = ({ className = '', children, title, action, transparent = false, onClick }) => (
    <div
        onClick={onClick}
        className={`
        ${transparent ? '' : 'bg-white shadow-sm hover:shadow-md border border-slate-200/60'}
        rounded-3xl p-6 flex flex-col transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
    `}>
        {title && (
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
            </div>
        )}
        {children}
    </div>
);

// 2. Bento KPI
const BentoKPI: React.FC<{
    title: string;
    value: number | string;
    icon: any;
    color: string;
    trend?: { value: number; direction: 'up' | 'down' };
    subValue?: string;
    onClick?: () => void;
}> = ({ title, value, icon: Icon, color, trend, subValue, onClick }) => {
    const colors: any = {
        indigo: 'text-indigo-600 bg-indigo-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        rose: 'text-rose-600 bg-rose-50',
        blue: 'text-blue-600 bg-blue-50',
        amber: 'text-amber-600 bg-amber-50',
        purple: 'text-purple-600 bg-purple-50',
    };

    return (
        <BentoBox className="cursor-pointer group hover:-translate-y-1" onClick={onClick}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${colors[color] || colors.indigo} transition-transform group-hover:scale-110 duration-300`}>
                    <Icon size={24} strokeWidth={2} />
                </div>
                {trend && (
                    <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend.direction === 'up' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                        {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
                    </div>
                )}
            </div>
            <div className="mt-auto">
                <h4 className="text-slate-500 text-sm font-medium mb-1">{title}</h4>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                    {typeof value === 'number' ? value.toLocaleString('en-US') : value}
                </div>
                {subValue && <p className="text-xs text-slate-400 mt-2 font-medium">{subValue}</p>}
            </div>
        </BentoBox>
    );
};

// 3. Action Grid Item
const ActionItem: React.FC<{
    label: string;
    icon: any;
    color: string;
    onClick: () => void;
    isEditing?: boolean;
    onEdit?: () => void;
}> = ({ label, icon: Icon, color, onClick, isEditing, onEdit }) => (
    <button
        onClick={isEditing ? onEdit : onClick}
        className={`
            relative flex flex-col items-center justify-center p-4 rounded-3xl border shadow-sm transition-all duration-300 group h-full w-full
            ${isEditing ? 'bg-slate-50 border-dashed border-2 border-indigo-300 animate-pulse cursor-pointer hover:bg-indigo-50' : 'bg-white border-slate-200 hover:shadow-md hover:border-indigo-200 hover:-translate-y-1'}
        `}
    >
        {isEditing && (
            <div className="absolute top-2 right-2 bg-indigo-100 text-indigo-600 p-1 rounded-full">
                <Settings size={14} />
            </div>
        )}
        <Icon size={24} className={`mb-3 ${isEditing ? 'text-indigo-400' : 'text-slate-400 group-hover:text-' + color + '-600'} transition-colors`} />
        <span className={`text-xs font-bold ${isEditing ? 'text-indigo-600' : 'text-slate-600 group-hover:text-slate-900'}`}>{label}</span>
    </button>
);

// --- QUICK ACTIONS MANAGER ---
interface SavedAction {
    path: string;
    color: string;
    label?: string; // Optional override
}

const DEFAULT_ACTIONS: SavedAction[] = [
    { path: '/sales/invoices/new', color: 'indigo', label: 'فاتورة جديدة' },
    { path: '/treasury/receipt', color: 'emerald' },
    { path: '/treasury/payroll', color: 'rose' },
    { path: '/system/users-guide', color: 'blue', label: 'المستخدمين' },
    { path: '/inventory/transfer', color: 'amber' },
    { path: '/reports/financial/soa-interactive', color: 'purple', label: 'كشف حساب' }
];

const ActionSelectorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: MenuItem) => void;
}> = ({ isOpen, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredActions = ALL_ACTIONS.filter(item =>
        item.label.includes(searchTerm) || (item.path && item.path.includes(searchTerm))
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">اختر الإجراء الجديد</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 bg-slate-50">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Search size={18} className="text-slate-400 ml-2" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="ابحث عن صفحة أو إجراء..."
                            className="flex-1 bg-transparent border-none outline-none text-slate-700 font-medium placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredActions.map((item, idx) => {
                        const Icon = item.icon || FileText;
                        return (
                            <button
                                key={idx}
                                onClick={() => onSelect(item)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-xl transition-colors group text-right"
                            >
                                <div className="p-2 bg-slate-100 group-hover:bg-white rounded-lg text-slate-500 group-hover:text-indigo-600 transition-colors shadow-sm">
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-700 group-hover:text-indigo-700 text-sm">{item.label}</h4>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">{item.path}</p>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Common Types
interface DashboardProps {
    data: any;
    navigate: any;
}

// ===========================================
// 1. ADMIN DASHBOARD (Bento Grid)
// ===========================================
export const AdminDashboard: React.FC<DashboardProps> = ({ data, navigate }) => {
    const { openTab } = useTabs();

    // Quick Actions State
    const [quickActions, setQuickActions] = useState<SavedAction[]>(DEFAULT_ACTIONS);
    const [isEditing, setIsEditing] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('wafi_quick_actions_v2'); // New key to force reset
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setQuickActions(parsed);
                } else {
                    setQuickActions(DEFAULT_ACTIONS);
                }
            } catch (e) {
                console.error('Failed to parse saved actions', e);
                setQuickActions(DEFAULT_ACTIONS);
            }
        } else {
            // First time or reset: Use defaults and save
            setQuickActions(DEFAULT_ACTIONS);
            localStorage.setItem('wafi_quick_actions_v2', JSON.stringify(DEFAULT_ACTIONS));
        }
    }, [data /* re-run if data loads, but mainly once on mount */]);

    const saveActions = (newActions: SavedAction[]) => {
        setQuickActions(newActions);
        localStorage.setItem('wafi_quick_actions_v2', JSON.stringify(newActions));
    };

    const handleActionSelect = (item: MenuItem) => {
        if (editingIndex === null || !item.path) return;

        const newActions = [...quickActions];
        newActions[editingIndex] = {
            path: item.path,
            color: newActions[editingIndex].color, // Keep original color slot logic? Or Randomize? Let's keep slot color for consistency
            label: item.label
        };

        saveActions(newActions);
        setEditingIndex(null);
    };

    // Helper function to navigate using the tab system
    const navigateToPage = (path: string, title?: string) => {
        openTab({
            id: path,
            path: path,
            title: title || path.split('/').pop() || 'صفحة جديدة',
            isClosable: true
        });
    };

    const topCustomersColumns: Column[] = [
        { key: 'name', label: 'العميل', align: 'right', render: (val) => <span className="font-bold text-slate-700 text-sm">{val}</span> },
        { key: 'total', label: 'الإجمالي', align: 'left', render: (val) => <span className="font-bold text-emerald-600 text-sm">{val.toLocaleString()}</span> },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">

            {/* Selection Modal */}
            <ActionSelectorModal
                isOpen={editingIndex !== null}
                onClose={() => setEditingIndex(null)}
                onSelect={handleActionSelect}
            />

            {/* ROW 1: Key Metrics */}
            <BentoKPI title="إجمالي المبيعات" value={data.kpis.totalSales} icon={TrendingUp} color="indigo" trend={{ value: 12.5, direction: 'up' }} onClick={() => navigateToPage('/reports/sales/analytics')} />
            <BentoKPI title="صافي الربح" value={data.kpis.netProfit} icon={Coins} color="emerald" trend={{ value: 8.3, direction: 'up' }} onClick={() => navigateToPage('/reports/financial/pl')} />
            <BentoKPI title="السيولة النقدية" value={data.kpis.cashBalance} icon={Wallet} color="blue" subValue="جاهزة للاستعمال" onClick={() => navigateToPage('/reports/financial/cashflow')} />
            <BentoKPI title="قيمة المخزون" value={data.kpis.inventoryValue} icon={Package} color="amber" subValue="تحديث قبل دقيقة" onClick={() => navigateToPage('/reports/inventory/valuation')} />

            {/* ROW 2: Big Chart + Quick Actions */}
            <BentoBox
                className="md:col-span-2 lg:col-span-3 min-h-[350px] cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => navigateToPage('/reports/sales/analytics')}
            >
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">تحليل الأداء المالي</h3>
                        <p className="text-xs text-slate-400">مقارنة الإيرادات والمصاريف خلال الفترة الماضية</p>
                    </div>
                    <select
                        className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl px-3 py-2 outline-none"
                        onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking select
                    >
                        <option>آخر 30 يوم</option>
                        <option>هذا العام</option>
                    </select>
                </div>
                <div className="w-full" style={{ height: '250px' }}>
                    {data?.charts?.salesTrend && data.charts.salesTrend.length > 0 ? (
                        <ChartWidget
                            id="sales-trend"
                            title=""
                            type="area"
                            data={data.charts.salesTrend}
                            dataKeys={{ x: 'date', y: 'value' }}
                            colors={['#4f46e5']}
                            height={250}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            لا توجد بيانات لعرضها
                        </div>
                    )}
                </div>
            </BentoBox>

            {/* Quick Actions Grid (Unchanged in structure, just ensuring no conflict) */}
            <div className="relative grid grid-cols-2 gap-4 md:col-span-2 lg:col-span-1 content-start">

                {/* Header with Edit Toggle */}
                <div className="col-span-2 flex justify-between items-end mb-1 px-1">
                    <span className="text-xs font-bold text-slate-400">الإجراءات السريعة</span>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`
                            p-1.5 rounded-lg transition-all text-[10px] font-bold flex items-center gap-1
                            ${isEditing ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}
                        `}
                    >
                        {isEditing ? <Check size={12} /> : <Settings size={12} />}
                        {isEditing ? 'حفظ' : 'تخصيص'}
                    </button>
                </div>

                {quickActions.map((action, idx) => {
                    // Resolve Icon and Label from ALL_ACTIONS or Fallback
                    const originalItem = ALL_ACTIONS.find(a => a.path === action.path);
                    const Label = action.label || originalItem?.label || 'غير معروف';
                    const Icon = originalItem?.icon || FileText; // Default Icon

                    return (
                        <ActionItem
                            key={idx}
                            label={Label}
                            icon={Icon}
                            color={action.color}
                            isEditing={isEditing}
                            onEdit={() => setEditingIndex(idx)}
                            onClick={() => navigateToPage(action.path, Label)}
                        />
                    );
                })}


            </div>

            {/* WAFI AI Widget REMOVED upon request */}

            {/* ROW 3: Secondary Charts & Lists */}
            <BentoBox
                className="md:col-span-1 lg:col-span-2 min-h-[300px]"
                title="أهم العملاء"
                action={
                    <button
                        onClick={() => navigateToPage('/reports/top-customers', 'أهم العملاء')}
                        className="text-indigo-600 text-xs font-bold flex items-center hover:underline"
                    >
                        عرض الكل <ChevronRight size={14} />
                    </button>
                }
            >
                <TableWidget
                    id="top-cust"
                    title=""
                    columns={topCustomersColumns}
                    data={data.topCustomers}
                    searchable={false}
                    maxHeight={200}
                />
            </BentoBox>

            <BentoBox
                className="md:col-span-1 lg:col-span-1 min-h-[300px] cursor-pointer hover:border-emerald-300 transition-colors"
                title="توزيع الدخل"
                onClick={() => navigateToPage('/reports/financial/pl')}
            >
                <div className="w-full" style={{ height: '220px', minHeight: '220px' }}>
                    {data?.charts?.revenueBreakdown && data.charts.revenueBreakdown.length > 0 ? (
                        <ChartWidget
                            id="revenue-donut"
                            title=""
                            type="donut"
                            data={data.charts.revenueBreakdown}
                            dataKeys={{ name: 'name', y: 'value' }}
                            colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444']}
                            height={220}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            لا توجد بيانات لعرضها
                        </div>
                    )}
                </div>
            </BentoBox>

            <BentoBox
                className="md:col-span-2 lg:col-span-1 min-h-[300px] cursor-pointer hover:border-blue-300 transition-colors"
                title="نشاطات حديثة"
                onClick={() => navigateToPage('/system/logs')}
            >
                <div className="flex flex-col gap-4">
                    {data.activities?.slice(0, 4).map((act: any, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start">
                            <div className="w-2 h-2 rounded-full bg-slate-300 mt-2 shrink-0"></div>
                            <div>
                                <p className="text-sm font-medium text-slate-800 leading-tight">{act.title}</p>
                                <span className="text-[10px] text-slate-400">{act.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </BentoBox>
        </div>
    );
};


// 2. SALES DASHBOARD
export const SalesDashboard: React.FC<DashboardProps> = ({ data, navigate }) => {
    const { openTab } = useTabs();

    const navigateToPage = (path: string, title?: string) => {
        openTab({
            id: path,
            path: path,
            title: title || path.split('/').pop() || 'صفحة جديدة',
            isClosable: true
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
            <BentoKPI title="مبيعات الفريق" value={data.kpis.teamSales} icon={ShoppingCart} color="indigo" trend={{ value: 5.2, direction: 'up' }} onClick={() => navigateToPage('/reports/sales/analytics')} />
            <BentoKPI title="الهدف الشهري" value={data.kpis.monthlyTarget} icon={Target} color="emerald" subValue="متبقي 20,000" onClick={() => navigateToPage('/reports/sales/analytics')} />
            <BentoKPI title="عملاء جدد" value={data.kpis.newCustomers} icon={Users} color="blue" trend={{ value: 15, direction: 'up' }} onClick={() => navigateToPage('/reports/customers/balances')} />
            <BentoKPI title="عروض معلقة" value={data.kpis.pendingQuotes} icon={Clock} color="amber" onClick={() => navigateToPage('/sales/quotations')} />

            <BentoBox
                className="md:col-span-2 lg:col-span-3 min-h-[350px] cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => navigateToPage('/reports/sales/analytics')}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">أداء المبيعات</h3>
                </div>
                <div className="w-full text-indigo-600" style={{ height: '280px' }}>
                    <ChartWidget id="sp" title="" type="area" data={data.charts.salesPerformance} dataKeys={{ x: 'date', y: 'value' }} colors={['#8b5cf6']} height="100%" />
                </div>
            </BentoBox>

            <div className="grid grid-cols-1 gap-4 lg:col-span-1">
                <BentoBox className="h-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 flex flex-col justify-center items-center text-center p-8">
                    <Target size={48} className="mb-4 text-indigo-200" />
                    <h3 className="text-2xl font-bold mb-1">الهدف الشهري</h3>
                    <p className="text-indigo-200 text-sm mb-6">لقد حققت 85% من هدفك هذا الشهر</p>
                    <button onClick={() => navigateToPage('/sales/quotations/new')} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm w-full hover:bg-indigo-50 transition-colors">
                        اضافة هدف جديد
                    </button>
                </BentoBox>
            </div>
        </div>
    );
};

// 3. FINANCIAL & INVENTORY Placeholders
export const FinancialDashboard: React.FC<DashboardProps> = ({ data, navigate }) => <AdminDashboard data={data} navigate={navigate} />;
export const InventoryDashboard: React.FC<DashboardProps> = ({ data, navigate }) => <AdminDashboard data={data} navigate={navigate} />;
