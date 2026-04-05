import React, { useState, useEffect } from 'react';
import {
    Activity, Clock, DollarSign, Package, TrendingUp, AlertCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const WIPDashboard = () => {
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    // Safe Render Logic
    const chartRef = React.useRef<HTMLDivElement>(null);
    const [shouldRenderChart, setShouldRenderChart] = useState(false);

    useEffect(() => {
        if (!chartRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setShouldRenderChart(width > 0 && height > 0);
            }
        });
        observer.observe(chartRef.current);
        return () => observer.disconnect();
    }, []);

    const loadData = async () => {
        try {
            // @ts-ignore
            const data = await window.electronAPI.manufacturing.getWIPReport();
            setOrders(data || []);
        } catch (e) { console.error(e); }
    };

    const totalMaterial = orders.reduce((sum, o) => sum + (o.material_cost || 0), 0);
    const totalLabor = orders.reduce((sum, o) => sum + (o.labor_cost || 0), 0);
    const totalWIP = totalMaterial + totalLabor;

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Activity className="text-purple-600" />
                إنتاج تحت التشغيل (WIP Dashboard)
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><AlertCircle size={20} /></div>
                        <span className="text-slate-400 text-xs font-bold">أوامر مفتوحة</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{orders.length}</div>
                    <div className="text-xs text-slate-500 mt-1">أوامر قيد التنفيذ</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Package size={20} /></div>
                        <span className="text-slate-400 text-xs font-bold">تكلفة المواد</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{totalMaterial.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">ريال (مواد منصرفة)</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Clock size={20} /></div>
                        <span className="text-slate-400 text-xs font-bold">تكلفة العمالة</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{totalLabor.toFixed(2)}</div>
                    <div className="text-xs text-slate-500 mt-1">ريال (بناءً على الساعات)</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign size={20} /></div>
                        <span className="text-slate-400 text-xs font-bold">إجمالي WIP</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-700">{totalWIP.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">القيمة الإجمالية المعلقة</div>
                </div>
            </div>

            {/* Charts & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} /> تحليل التكاليف لكل أمر
                    </h3>
                    <div ref={chartRef} className="h-80" style={{ minWidth: 200, minHeight: 200, width: '100%', display: 'block' }}>
                        {shouldRenderChart && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50} debounce={300}>
                                <BarChart data={orders}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="order_number" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="material_cost" name="مواد" fill="#3b82f6" stackId="a" />
                                    <Bar dataKey="labor_cost" name="عمالة" fill="#f97316" stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <h3 className="font-bold text-slate-700 mb-4">تفاصيل الأوامر</h3>
                    <div className="space-y-4 overflow-y-auto max-h-80 pr-2">
                        {orders.map(order => (
                            <div key={order.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-slate-800">#{order.order_number}</span>
                                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{order.status}</span>
                                </div>
                                <p className="text-sm text-slate-600 mb-2 truncate">{order.product_name}</p>
                                <div className="flex justify-between text-xs text-slate-500 border-t border-slate-200 pt-2">
                                    <span>المواد: <b>{order.material_cost?.toFixed(0)}</b></span>
                                    <span>العمل: <b>{order.labor_cost?.toFixed(0)}</b></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WIPDashboard;
