import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, User, ChevronLeft, ChevronRight, Filter, Truck } from 'lucide-react';
import { useTabs } from '../../../src/contexts/TabsContext';

export const PurchaseOrderList = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { openTab } = useTabs();

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await window.electronAPI.purchase.getOrders();
            setOrders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        openTab({
            id: 'new-po',
            title: 'طلبية شراء جديدة',
            path: '/purchasing/orders/new',
            isClosable: true
        });
    };

    const handleOpenOrder = (id: string, no: string) => {
        openTab({
            id: `po-${id}`,
            title: `طلبية ${no}`,
            path: `/purchasing/orders/${id}`,
            isClosable: true
        });
    };

    const filteredOrders = orders.filter(o =>
        o.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.supplier_name && o.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'SENT': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'PARTIAL': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'مسودة';
            case 'SENT': return 'تم الإرسال';
            case 'PARTIAL': return 'استلام جزئي';
            case 'COMPLETED': return 'مكتمل';
            case 'CANCELLED': return 'ملغى';
            default: return status;
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 pb-1 flex items-center gap-2">
                        <Truck className="w-8 h-8 text-blue-600" />
                        طلبيات الشراء (LPO)
                    </h1>
                    <p className="text-slate-500 text-sm">إدارة ومتابعة أوامر الشراء المحلية</p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">طلبية شراء جديدة</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث برقم الطلبية أو اسم المورد..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/50 transition-all outline-none"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <Filter className="w-4 h-4" />
                    <span>تصفية</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">جاري التحميل...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="text-slate-500">لا توجد طلبيات شراء مطابقة</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-right">
                                    <th className="py-4 px-6 font-semibold text-slate-600">رقم الطلبية</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600">المورد</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600">التاريخ</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600">الإجمالي</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600">الحالة</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((o) => (
                                    <tr
                                        key={o.id}
                                        className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                                        onClick={() => handleOpenOrder(o.id, o.order_no)}
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-slate-700 font-mono">{o.order_no}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium text-slate-700">{o.supplier_name || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {o.date}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-bold text-slate-700 font-mono">
                                            {o.grand_total?.toLocaleString()} {o.currency_id || 'ILS'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(o.status)}`}>
                                                {getStatusLabel(o.status)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                                                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination (Static for now) */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                    <span>عرض {filteredOrders.length} من {orders.length} سجلات</span>
                    <div className="flex gap-2">
                        <button className="p-1 hover:bg-slate-100 rounded disabled:opacity-50" disabled><ChevronRight className="w-5 h-5 rtl:rotate-180" /></button>
                        <button className="p-1 hover:bg-slate-100 rounded disabled:opacity-50" disabled><ChevronLeft className="w-5 h-5 rtl:rotate-180" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};


