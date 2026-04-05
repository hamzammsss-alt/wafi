import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trophy, TrendingUp, ShoppingCart, Download, Printer } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { TableWidget, Column } from '../../components/dashboard/widgets/TableWidget';
import { ChartWidget } from '../../components/dashboard/widgets/ChartWidget';

export const TopCustomersPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState('30days');

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await dashboardService.getTopCustomers();
            // In a real app, we would pass dateRange to the service
            setCustomers(data);
        } catch (error) {
            console.error('Failed to load top customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns: Column[] = [
        {
            key: 'rank',
            label: '#',
            width: '60px',
            align: 'center',
            render: (_: any, idx: number) => (
                <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-slate-100 text-slate-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'}
                `}>
                    {idx + 1}
                </span>
            )
        },
        {
            key: 'name',
            label: 'اسم العميل',
            render: (val: string) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {val.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-700">{val}</span>
                </div>
            )
        },
        {
            key: 'orders',
            label: 'عدد الطلبات',
            align: 'center',
            render: (val: number) => <span className="text-slate-600 font-mono">{val}</span>
        },
        {
            key: 'total',
            label: 'إجمالي المشتريات',
            align: 'left',
            render: (val: number) => <span className="font-bold text-emerald-600 font-mono">{val.toLocaleString()}</span>
        },
        {
            key: 'status',
            label: 'الحالة',
            align: 'center',
            render: () => <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">نشط</span>
        }
    ];

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">أهم العملاء</h1>
                        <p className="text-slate-500 text-sm mt-1">قائمة بالعملاء الأكثر نشاطاً ومبيعات</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                        <option value="today">اليوم</option>
                        <option value="7days">آخر 7 أيام</option>
                        <option value="30days">آخر 30 يوم</option>
                        <option value="thisYear">هذا العام</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
                        <Printer size={16} /> طباعة
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-sm font-bold">
                        <Download size={16} /> تصدير Excel
                    </button>
                </div>
            </div>

            {/* Visual Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 1. Bar Chart: Top 5 by Revenue */}
                <div className="lg:col-span-2">
                    <ChartWidget
                        id="top-cust-bar"
                        title="أداء العملاء (الأعلى مبيعاً)"
                        type="bar"
                        data={customers.slice(0, 5)}
                        dataKeys={{ x: 'name', y: 'total' }}
                        colors={['#6366f1']}
                        height={300}
                    />
                </div>

                {/* 2. Summary Cards in a Col */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <ShoppingCart size={20} />
                            </div>
                            <span className="text-slate-500 text-sm font-medium">إجمالي المبيعات (أعلى 5)</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800">
                            {customers.slice(0, 5).reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} <span className="text-base font-normal text-slate-400">ر.س</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-slate-500 text-sm font-medium">متوسط قيمة الطلب</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800">
                            {Math.round(customers.reduce((acc, curr) => acc + curr.total, 0) / customers.reduce((acc, curr) => acc + curr.orders, 0) || 0).toLocaleString()} <span className="text-base font-normal text-slate-400">ر.س</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Trophy size={20} />
                            </div>
                            <span className="text-slate-500 text-sm font-medium">العميل المميز</span>
                        </div>
                        <div className="text-lg font-bold text-slate-800 truncate" title={customers[0]?.name}>
                            {customers[0]?.name}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <TableWidget
                    id="top-customers-full"
                    title=""
                    columns={columns}
                    data={customers}
                    searchable={true}
                    maxHeight="calc(100vh - 400px)"
                />
            </div>
        </div>
    );
};
