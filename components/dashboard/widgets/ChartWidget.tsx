import React from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Maximize2 } from 'lucide-react';

export interface ChartWidgetProps {
    id: string;
    title: string;
    type: 'line' | 'bar' | 'area' | 'pie' | 'donut';
    data: any[];
    dataKeys?: {
        x?: string;
        y?: string | string[];
        name?: string;
    };
    colors?: string[];
    height?: number | string;
    loading?: boolean;
    onExport?: () => void;
    onMaximize?: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

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
            </div>
        );
    }
    return null;
};

export const ChartWidget: React.FC<ChartWidgetProps> = ({
    id,
    title,
    type,
    data,
    dataKeys = { x: 'date', y: 'value' },
    colors = COLORS,
    height = 300,
    loading = false,
    onExport,
    onMaximize
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse" />
                    <div className="flex gap-2">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
                        <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
                    </div>
                </div>
                <div className={`bg-slate-100 rounded-xl animate-pulse w-full`} style={{ height, minHeight: 100 }} />
            </div>
        );
    }

    const renderChart = () => {
        const commonProps = {
            data,
            margin: { top: 10, right: 10, left: 0, bottom: 0 }
        };

        switch (type) {
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey={dataKeys.x} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        {Array.isArray(dataKeys.y) ? (
                            dataKeys.y.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            ))
                        ) : (
                            <Line
                                type="monotone"
                                dataKey={dataKeys.y}
                                stroke={colors[0]}
                                strokeWidth={3}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                    </LineChart>
                );

            case 'bar':
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey={dataKeys.x} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        {Array.isArray(dataKeys.y) ? (
                            dataKeys.y.map((key, index) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={colors[index % colors.length]}
                                    radius={[8, 8, 0, 0]}
                                />
                            ))
                        ) : (
                            <Bar dataKey={dataKeys.y} fill={colors[0]} radius={[8, 8, 0, 0]} />
                        )}
                    </BarChart>
                );

            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            {Array.isArray(dataKeys.y) ? (
                                dataKeys.y.map((key, index) => (
                                    <linearGradient key={key} id={`gradient-${id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0} />
                                    </linearGradient>
                                ))
                            ) : (
                                <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                                </linearGradient>
                            )}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey={dataKeys.x} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        {Array.isArray(dataKeys.y) ? (
                            dataKeys.y.map((key, index) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={colors[index % colors.length]}
                                    fill={`url(#gradient-${id}-${index})`}
                                    strokeWidth={2}
                                />
                            ))
                        ) : (
                            <Area
                                type="monotone"
                                dataKey={dataKeys.y}
                                stroke={colors[0]}
                                fill={`url(#gradient-${id})`}
                                strokeWidth={2}
                            />
                        )}
                    </AreaChart>
                );

            case 'pie':
            case 'donut':
                return (
                    <PieChart>
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                        />
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={type === 'donut' ? '50%' : 0}
                            outerRadius="70%"
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey={dataKeys.y as string || 'value'}
                        // Label removed to prevent overlap, Legend used instead
                        // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                );

            default:
                return null;
        }
    };

    // Safe Render Logic using ResizeObserver
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = React.useState(false);

    React.useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    // console.log(`Chart ${title || id} resize:`, width, height);
                    setShouldRender(true);
                } else {
                    setShouldRender(false);
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [title, id]);

    // If no title, render chart directly without wrapper
    if (!title) {
        return (
            <div ref={containerRef} style={{ height: typeof height === 'number' ? height : 300, width: '100%', minWidth: 100, minHeight: 100, position: 'relative', display: 'block' }}>
                {shouldRender && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50} debounce={300}>
                        {/* @ts-ignore */}
                        {renderChart() as any}
                    </ResponsiveContainer>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 group hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onExport && (
                        <button
                            onClick={onExport}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="تصدير"
                        >
                            <Download size={18} className="text-slate-500" />
                        </button>
                    )}
                    {onMaximize && (
                        <button
                            onClick={onMaximize}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="تكبير"
                        >
                            <Maximize2 size={18} className="text-slate-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div ref={containerRef} style={{ width: '100%', height: typeof height === 'number' ? height : 300, minHeight: 100, minWidth: 100, position: 'relative', display: 'block' }}>
                {shouldRender && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50} debounce={300}>
                        {/* @ts-ignore */}
                        {renderChart() as any}
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
