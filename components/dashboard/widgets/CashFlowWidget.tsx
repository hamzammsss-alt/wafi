import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export interface CashFlowData {
    date: string;
    in_flow: number;
    out_flow: number;
}

export interface CashFlowWidgetProps {
    data: CashFlowData[];
    title?: string;
    height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-100">
                <p className="text-sm font-bold text-slate-700 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-600">{entry.name}:</span>
                        <span className="font-bold text-slate-800">{entry.value.toLocaleString('ar-EG')}</span>
                    </div>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="text-slate-600">الصافي:</span>
                        <span className={payload[0].value - payload[1].value >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {(payload[0].value - payload[1].value).toLocaleString('ar-EG')}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export const CashFlowWidget: React.FC<CashFlowWidgetProps> = ({
    data,
    title = 'التدفقات النقدية',
    height = 300
}) => {
    const totalInFlow = data.reduce((sum, d) => sum + d.in_flow, 0);
    const totalOutFlow = data.reduce((sum, d) => sum + d.out_flow, 0);
    const netFlow = totalInFlow - totalOutFlow;

    // Safe Render Logic
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = React.useState(false);

    React.useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setShouldRender(width > 0 && height > 0);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            {/* Header with Summary */}
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>

                <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <TrendingUp className="text-emerald-600" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-600 font-medium">وارد</p>
                            <p className="text-lg font-bold text-emerald-700">
                                {totalInFlow.toLocaleString('ar-EG')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl">
                        <div className="p-2 bg-rose-100 rounded-lg">
                            <TrendingDown className="text-rose-600" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-rose-600 font-medium">صادر</p>
                            <p className="text-lg font-bold text-rose-700">
                                {totalOutFlow.toLocaleString('ar-EG')}
                            </p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-xl ${netFlow >= 0 ? 'bg-indigo-50' : 'bg-amber-50'
                        }`}>
                        <div className={`p-2 rounded-lg ${netFlow >= 0 ? 'bg-indigo-100' : 'bg-amber-100'
                            }`}>
                            <DollarSign className={netFlow >= 0 ? 'text-indigo-600' : 'text-amber-600'} size={20} />
                        </div>
                        <div>
                            <p className={`text-xs font-medium ${netFlow >= 0 ? 'text-indigo-600' : 'text-amber-600'
                                }`}>
                                الصافي
                            </p>
                            <p className={`text-lg font-bold ${netFlow >= 0 ? 'text-indigo-700' : 'text-amber-700'
                                }`}>
                                {netFlow.toLocaleString('ar-EG')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div ref={containerRef} style={{ height, minWidth: 200, minHeight: 200, width: '100%', display: 'block' }}>
                {shouldRender && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50} debounce={300}>
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorInFlow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorOutFlow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                iconType="circle"
                            />
                            <Area
                                type="monotone"
                                dataKey="in_flow"
                                name="وارد"
                                stroke="#10B981"
                                fill="url(#colorInFlow)"
                                strokeWidth={2}
                            />
                            <Area
                                type="monotone"
                                dataKey="out_flow"
                                name="صادر"
                                stroke="#EF4444"
                                fill="url(#colorOutFlow)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
