import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Anchor, Package, FileText, CheckCircle, Clock, Plus, BarChart3, AlertTriangle, ArrowLeft, TrendingUp } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTabs } from '../../src/contexts/TabsContext';

export const ImportDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const [stats, setStats] = useState({
        activeShipments: 0,
        pendingProformas: 0,
        arrivingContainers: 0,
        clearingFiles: 0
    });

    const [recentShipments, setRecentShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const handleNavigate = (path: string, title: string) => {
        navigateInTab(path, title);
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch Real Stats from Backend
            const realStats = await window.electronAPI.import.getDashboardStats();
            const shipments = await window.electronAPI.import.getShipments({ limit: 10 }) || [];

            setStats(realStats || {
                activeShipments: 0,
                pendingProformas: 0,
                arrivingContainers: 0,
                clearingFiles: 0
            });

            setRecentShipments(shipments.slice(0, 5));
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 font-sans" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="text-blue-600" />
                        لوحة تحكم الاستيراد
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">نظرة عامة على حالة الشحنات، الحاويات، وعروض الأسعار.</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button
                        onClick={() => handleNavigate('/import/proformas/new', 'عرض سعر جديد')}
                        className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition flex items-center gap-2 font-bold shadow-sm"
                    >
                        <FileText size={18} />
                        عرض سعر جديد
                    </button>
                    <button
                        onClick={() => handleNavigate('/import/shipments/new', 'ملف استيراد جديد')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-bold shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={18} />
                        ملف استيراد جديد
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="الشحنات النشطة"
                    value={stats.activeShipments}
                    icon={<Anchor className="text-blue-600" size={28} />}
                    color="bg-blue-50 border-blue-100"
                    iconBg="bg-blue-100"
                    onClick={() => handleNavigate('/import/shipments', 'ملفات الاستيراد')}
                />
                <KPICard
                    title="عروض الأسعار المعلقة"
                    value={stats.pendingProformas}
                    icon={<FileText className="text-orange-600" size={28} />}
                    color="bg-orange-50 border-orange-100"
                    iconBg="bg-orange-100"
                    onClick={() => handleNavigate('/import/proformas', 'عروض الأسعار')}
                />
                <KPICard
                    title="حاويات قادمة"
                    value={stats.arrivingContainers}
                    icon={<Package className="text-purple-600" size={28} />}
                    color="bg-purple-50 border-purple-100"
                    iconBg="bg-purple-100"
                    onClick={() => handleNavigate('/import/containers', 'تتبع الحاويات')}
                />
                <KPICard
                    title="في مرحلة التخليص"
                    value={stats.clearingFiles}
                    icon={<CheckCircle className="text-emerald-600" size={28} />}
                    color="bg-emerald-50 border-emerald-100"
                    iconBg="bg-emerald-100"
                    onClick={() => handleNavigate('/import/shipments', 'ملفات الاستيراد')}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Shipments */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Anchor size={20} className="text-gray-500" />
                                أحدث الشحنات
                            </CardTitle>
                            <button
                                onClick={() => handleNavigate('/import/shipments', 'ملفات الاستيراد')}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                عرض الكل
                            </button>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
                            ) : recentShipments.length > 0 ? (
                                <div className="space-y-3">
                                    {recentShipments.map((shipment) => (
                                        <div key={shipment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition cursor-pointer" onClick={() => handleNavigate(`/import/shipments/${shipment.id}`, `شحنة ${shipment.shipment_no}`)}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 text-gray-500">
                                                    <Anchor size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{shipment.shipment_no}</p>
                                                    <p className="text-xs text-gray-500">{shipment.supplier_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <StatusBadge status={shipment.status} />
                                                <p className="text-xs text-gray-400 mt-1">{shipment.arrival_date_est || shipment.opening_date || 'No Date'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <Package size={48} className="mb-2 opacity-20" />
                                    <p>لا توجد شحنات حديثة</p>
                                    <button
                                        onClick={() => handleNavigate('/import/shipments/new', 'ملف استيراد جديد')}
                                        className="mt-2 text-sm text-blue-600 hover:underline"
                                    >
                                        أضف شحنة جديدة
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Alerts & Reports */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Reports Section */}
                    <Card className="border-blue-100 shadow-sm">
                        <CardHeader className="border-b border-blue-50 pb-3">
                            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                التقارير والتحليلات
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <div className="space-y-1">
                                <ReportLink
                                    title="تحليل تكلفة الصنف (Trends)"
                                    icon={<TrendingUp size={16} />}
                                    onClick={() => handleNavigate('/import/report/cost-comparison', 'مقارنة التكاليف')}
                                />
                                <ReportLink
                                    title="تتبع الحاويات والأرضيات"
                                    icon={<Package size={16} />}
                                    onClick={() => handleNavigate('/import/report/containers', 'تقرير الحاويات')}
                                />
                                <ReportLink
                                    title="إحصائيات الموردين"
                                    icon={<FileText size={16} />}
                                    onClick={() => handleNavigate('/reports/purchases/import', 'تقارير الاستيراد')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-100 shadow-sm bg-red-50/50">
                        <CardHeader className="border-b border-red-100 pb-3">
                            <CardTitle className="text-lg font-bold text-red-800 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                تنبيهات التتبع
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                                <Clock size={32} className="mb-2 text-red-200" />
                                <p className="text-xs text-center font-medium">لا توجد تنبيهات عاجلة</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// UI Components

const KPICard = ({ title, value, icon, color, iconBg, onClick }: any) => (
    <div
        onClick={onClick}
        className={`p-5 rounded-2xl border ${color} shadow-sm transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer bg-white group`}
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-bold text-gray-500 mb-1">{title}</p>
                <h3 className="text-3xl font-black text-gray-800 group-hover:text-blue-600 transition-colors">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${iconBg} bg-opacity-80`}>
                {icon}
            </div>
        </div>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    let classes = 'bg-gray-100 text-gray-700';
    let label = status;

    switch (status?.toLowerCase()) {
        case 'open':
            classes = 'bg-blue-100 text-blue-700 border border-blue-200';
            label = 'مفتوح';
            break;
        case 'shipped':
            classes = 'bg-orange-100 text-orange-700 border border-orange-200';
            label = 'في الطريق';
            break;
        case 'arrived':
            classes = 'bg-purple-100 text-purple-700 border border-purple-200';
            label = 'واصل الميناء';
            break;
        case 'cleared':
            classes = 'bg-green-100 text-green-700 border border-green-200';
            label = 'تم التخليص';
            break;
        case 'closed':
            classes = 'bg-slate-100 text-slate-600 border border-slate-200';
            label = 'مغلق';
            break;
        default:
            break;
    }

    return (
        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${classes}`}>
            {label}
        </span>
    );
};
const ReportLink = ({ title, icon, onClick }: any) => (
    <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition-colors group"
    >
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                {icon}
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{title}</span>
        </div>
        <ArrowLeft size={14} className="text-slate-300 group-hover:text-blue-400 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </button>
);
