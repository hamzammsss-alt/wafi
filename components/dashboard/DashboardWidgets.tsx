
import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

// --- Types ---
export interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'indigo';
    subValue?: string;
    chartData?: any[]; // Tiny chart data
}

export interface ActionCardProps {
    title: string;
    icon: LucideIcon;
    color: string; // Tailwind color class prefix e.g 'emerald'
    onClick?: () => void;
    description?: string;
}

// --- KPI Card ---
export const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, trend, trendUp, color, subValue, chartData }) => {

    const colorStyles: Record<string, any> = {
        emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', gradient: 'from-emerald-500 to-teal-400' },
        blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', gradient: 'from-blue-500 to-indigo-400' },
        purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', gradient: 'from-purple-500 to-fuchsia-400' },
        amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', gradient: 'from-amber-500 to-orange-400' },
        rose: { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', gradient: 'from-rose-500 to-red-400' },
        indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', gradient: 'from-indigo-500 to-violet-400' },
    };

    const s = colorStyles[color] || colorStyles.blue;

    // Safe Render Logic
    const chartRef = React.useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = React.useState(false);

    React.useEffect(() => {
        if (!chartRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setShouldRender(width > 0 && height > 0);
            }
        });
        observer.observe(chartRef.current);
        return () => observer.disconnect();
    }, [chartData]);

    return (
        <div className="relative overflow-hidden bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-md transition-all duration-300">
            {/* Background Decor */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${s.light} blur-3xl opacity-50 group-hover:scale-125 transition-transform duration-500`}></div>

            <div className="relative z-10 flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${s.light} text-white shadow-inner`}>
                    <Icon className={s.text} size={22} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {trend}
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight mb-1">{value}</h3>
                <p className="text-sm text-slate-500 font-medium">{title}</p>
                {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
            </div>

            {/* Tiny Chart */}
            {chartData && (
                <div ref={chartRef} className="absolute bottom-0 left-0 right-0 h-16 opacity-30" style={{ minWidth: 50, minHeight: 50, display: 'block' }}>
                    {shouldRender && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50} debounce={300}>
                            <AreaChart data={chartData}>
                                <Area type="monotone" dataKey="value" stroke={s.text} fill={s.text} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}

        </div>
    );
};

// --- Action Card ---
export const ActionCard: React.FC<ActionCardProps> = ({ title, icon: Icon, color, onClick, description }) => {
    const colorClasses: any = {
        indigo: "hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600",
        emerald: "hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600",
        orange: "hover:bg-orange-50 hover:border-orange-200 text-orange-600",
        rose: "hover:bg-rose-50 hover:border-rose-200 text-rose-600",
        blue: "hover:bg-blue-50 hover:border-blue-200 text-blue-600",
        purple: "hover:bg-purple-50 hover:border-purple-200 text-purple-600",
    }

    const activeClass = colorClasses[color] || colorClasses.blue;

    return (
        <button
            onClick={onClick}
            className={`w-full text-right flex items-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm transition-all duration-200 group ${activeClass}`}
        >
            <div className={`p-3 rounded-lg bg-slate-50 group-hover:bg-white group-hover:shadow-sm transition-all mr-0 ml-4`}>
                <Icon size={20} className="text-current" />
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{title}</h4>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                {/* Chevron Left for RTL */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </div>
        </button>
    );
};

// --- Financial: Recent Transactions List ---
export const RecentTransactionsList = ({ transactions }: { transactions: any[] }) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex justify-between items-center">
                <span>أحدث المعاملات</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">اليوم</span>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {transactions.map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-full ${tx.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {tx.type === 'in' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{tx.description}</p>
                                <p className="text-xs text-slate-400">{tx.date}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-bold ${tx.type === 'in' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                {tx.type === 'in' ? '+' : '-'}{tx.amount.toLocaleString()}
                            </p>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {tx.status || 'مكتمل'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Inventory: Stock Movements ---
export const StockMovementList = ({ movements }: { movements: any[] }) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">حركة المخزون الأخيرة</h3>
            <div className="relative border-r-2 border-slate-100 mr-2 space-y-6">
                {movements.map((move, idx) => (
                    <div key={idx} className="relative pr-6">
                        <div className={`absolute -right-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ring-1 ${move.type === 'in' ? 'bg-emerald-500 ring-emerald-100' : 'bg-blue-500 ring-blue-100'}`}></div>
                        <div className="flex justify-between items-start bg-slate-50/50 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                            <div>
                                <p className="text-sm font-bold text-slate-700">{move.item}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{move.reason}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${move.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {move.qty} {move.unit}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-1">{move.time}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button className="mt-4 w-full py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors">
                عرض تقرير الحركة الكامل
            </button>
        </div>
    );
};

// --- Sales: Sales Targets ---
export const SalesTargets = ({ data }: { data: any[] }) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex justify-between">
                <span>المستهدف الشهري</span>
                <MoreHorizontal className="text-slate-400 hover:text-slate-600 cursor-pointer" size={20} />
            </h3>
            <div className="space-y-6 flex-1">
                {data.map((target, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-bold text-slate-700">{target.label}</span>
                            <span className="text-slate-500">{target.achieved.toLocaleString()} / {target.goal.toLocaleString()}</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${target.percentage >= 100 ? 'bg-emerald-500' :
                                    target.percentage >= 70 ? 'bg-indigo-500' : 'bg-amber-500'
                                    }`}
                                style={{ width: `${Math.min(target.percentage, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-right mt-1 text-slate-400">{target.percentage}% محقق</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

