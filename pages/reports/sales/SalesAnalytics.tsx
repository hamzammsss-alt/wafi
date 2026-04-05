import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Users, MapPin } from 'lucide-react';

export const SalesAnalytics = () => {
    const [range, setRange] = useState({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getSalesAnalytics(range);
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { maximumFractionDigits: 0 });

    return (
        <div className="p-6 bg-gray-50 h-full overflow-y-auto" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BarChart3 className="text-indigo-600" /> تحليلات المبيعات
            </h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-end gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">من تاريخ</label>
                    <input type="date" value={range.startDate} onChange={e => setRange({ ...range, startDate: e.target.value })} className="border p-2 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">إلى تاريخ</label>
                    <input type="date" value={range.endDate} onChange={e => setRange({ ...range, endDate: e.target.value })} className="border p-2 rounded" />
                </div>
                <button onClick={loadData} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700">تحديث</button>
            </div>

            {loading && <div className="text-center p-10">جاري التحميل...</div>}

            {data && !loading && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 font-bold mb-1">إجمالي المبيعات</p>
                                <h3 className="text-3xl font-bold text-indigo-900">{formatCurrency(data.totals?.value)}</h3>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-full"><TrendingUp className="text-indigo-600 w-8 h-8" /></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 font-bold mb-1">عدد الفواتير</p>
                                <h3 className="text-3xl font-bold text-gray-800">{data.totals?.count}</h3>
                            </div>
                            <div className="bg-green-50 p-3 rounded-full"><BarChart3 className="text-green-600 w-8 h-8" /></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sales by Branch */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-gray-400" />
                                المبيعات حسب الفرع
                            </h3>
                            <div className="space-y-4">
                                {data.byRegion?.map((item: any, idx: number) => {
                                    const percentage = data.totals?.value ? (item.value / data.totals.value) * 100 : 0;
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-bold text-gray-700">{item.name}</span>
                                                <span className="font-mono text-gray-600">{formatCurrency(item.value)}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {data.byRegion?.length === 0 && <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>}
                            </div>
                        </div>

                        {/* Top Sales Reps */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border">
                            <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5 text-gray-400" />
                                أفضل المندوبين
                            </h3>
                            <div className="space-y-4">
                                {data.topReps?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {idx + 1}
                                        </div>
                                        <span className="flex-1 font-bold text-gray-700">{item.name || 'System'}</span>
                                        <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                                {data.topReps?.length === 0 && <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
