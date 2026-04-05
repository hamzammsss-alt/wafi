import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export interface KPICardProps {
    id: string;
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'teal';
    trend?: {
        value: number;
        direction: 'up' | 'down';
        label?: string;
    };
    sparklineData?: Array<{ value: number }>;
    subValue?: string;
    onClick?: () => void;
    loading?: boolean;
}

const colorStyles: Record<string, any> = {
    emerald: {
        bg: 'bg-emerald-500',
        light: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-100',
        gradient: 'from-emerald-500 to-teal-400',
        ring: 'ring-emerald-500/20'
    },
    blue: {
        bg: 'bg-blue-500',
        light: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-100',
        gradient: 'from-blue-500 to-indigo-400',
        ring: 'ring-blue-500/20'
    },
    purple: {
        bg: 'bg-purple-500',
        light: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-100',
        gradient: 'from-purple-500 to-fuchsia-400',
        ring: 'ring-purple-500/20'
    },
    amber: {
        bg: 'bg-amber-500',
        light: 'bg-amber-50',
        text: 'text-amber-600',
        border: 'border-amber-100',
        gradient: 'from-amber-500 to-orange-400',
        ring: 'ring-amber-500/20'
    },
    rose: {
        bg: 'bg-rose-500',
        light: 'bg-rose-50',
        text: 'text-rose-600',
        border: 'border-rose-100',
        gradient: 'from-rose-500 to-red-400',
        ring: 'ring-rose-500/20'
    },
    indigo: {
        bg: 'bg-indigo-500',
        light: 'bg-indigo-50',
        text: 'text-indigo-600',
        border: 'border-indigo-100',
        gradient: 'from-indigo-500 to-violet-400',
        ring: 'ring-indigo-500/20'
    },
    cyan: {
        bg: 'bg-cyan-500',
        light: 'bg-cyan-50',
        text: 'text-cyan-600',
        border: 'border-cyan-100',
        gradient: 'from-cyan-500 to-blue-400',
        ring: 'ring-cyan-500/20'
    },
    teal: {
        bg: 'bg-teal-500',
        light: 'bg-teal-50',
        text: 'text-teal-600',
        border: 'border-teal-100',
        gradient: 'from-teal-500 to-emerald-400',
        ring: 'ring-teal-500/20'
    }
};

export const KPICard: React.FC<KPICardProps> = ({
    id,
    title,
    value,
    icon: Icon,
    color,
    trend,
    sparklineData,
    subValue,
    onClick,
    loading = false
}) => {
    const styles = colorStyles[color] || colorStyles.blue;

    // Safe Render Logic
    const chartContainerRef = React.useRef<HTMLDivElement>(null);
    const [shouldRenderChart, setShouldRenderChart] = React.useState(false);

    React.useEffect(() => {
        if (!chartContainerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setShouldRenderChart(width > 0 && height > 0);
            }
        });
        observer.observe(chartContainerRef.current);
        return () => observer.disconnect();
    }, [sparklineData]); // Re-attach if data changes (though ref stays same, good practice to check deps if conditional)

    if (loading) {
        return (
            <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-xl ${styles.light}`} />
                    <div className="w-16 h-6 bg-slate-100 rounded-full" />
                </div>
                <div className="space-y-2">
                    <div className="h-8 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-100 group transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : ''
                }`}
            onClick={onClick}
        >
            {/* Background Decoration */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${styles.light} blur-3xl opacity-50 group-hover:scale-125 transition-transform duration-500`} />

            {/* Sparkline Background */}
            {sparklineData && sparklineData.length > 0 && (
                <div ref={chartContainerRef} className="absolute bottom-0 left-0 right-0 h-20 opacity-10" style={{ minWidth: 50, minHeight: 50, display: 'block' }}>
                    {shouldRenderChart && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50} debounce={300}>
                            <AreaChart data={sparklineData}>
                                <defs>
                                    <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={`var(--${color}-500)`} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={`var(--${color}-500)`} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={`var(--${color}-500)`}
                                    fill={`url(#gradient-${id})`}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}

            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${styles.light} shadow-inner`}>
                        <Icon className={styles.text} size={24} />
                    </div>

                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${trend.direction === 'up'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                            }`}>
                            {trend.direction === 'up' ? (
                                <TrendingUp size={14} />
                            ) : (
                                <TrendingDown size={14} />
                            )}
                            {trend.value}%
                        </div>
                    )}
                </div>

                {/* Value */}
                <div>
                    <h3 className="text-3xl font-bold text-slate-800 tracking-tight mb-1 transition-colors group-hover:text-slate-900">
                        {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">{title}</p>
                    {subValue && (
                        <p className="text-xs text-slate-400 mt-1">{subValue}</p>
                    )}
                    {trend?.label && (
                        <p className="text-xs text-slate-400 mt-1">{trend.label}</p>
                    )}
                </div>
            </div>

            {/* Hover Effect Ring */}
            {onClick && (
                <div className={`absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:${styles.ring} transition-all duration-300`} />
            )}
        </div>
    );
};
