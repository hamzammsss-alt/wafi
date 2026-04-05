import React, { useState, useEffect } from 'react';
import { Plus, Search, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabs } from '../../../src/contexts/TabsContext';

export const SalesOrderList = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const api = (window as any).electronAPI?.sales;

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getOrders();
            setOrders(data || []);
        } catch (error) {
            console.error("Failed to load orders", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("هل أنت متأكد من حذف هذا الأمر؟")) return;
        try {
            await api.deleteOrder(id);
            loadOrders();
        } catch (error: any) {
            alert("فشل الحذف: " + error.message);
        }
    };

    return (
        <div className="p-6 bg-[#f0f2f5] h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">طلبيات المبيعات</h1>
                        <p className="text-xs text-gray-500">متابعة أوامر البيع والتجهيز</p>
                    </div>
                </div>
                <button
                    onClick={() => navigateInTab('/sales/orders/new', 'طلبية جديدة')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                    <Plus size={18} /> طلبية جديدة
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-600 font-bold text-xs sticky top-0">
                            <tr>
                                <th className="p-3">رقم الطلبية</th>
                                <th className="p-3">الزبون</th>
                                <th className="p-3">التاريخ</th>
                                <th className="p-3">أصل الطلب</th>
                                <th className="p-3">المبلغ الإجمالي</th>
                                <th className="p-3 text-center">الحالة</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {orders.map(o => (
                                <tr
                                    key={o.id}
                                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/sales/orders/${o.id}`)}
                                >
                                    <td className="p-3 font-mono text-indigo-600 font-bold">{o.order_no}</td>
                                    <td className="p-3 font-medium text-gray-800">{o.customer_name}</td>
                                    <td className="p-3 text-gray-600 font-mono text-sm">{o.date}</td>
                                    <td className="p-3 text-gray-400 text-xs">{o.quotation_id ? 'عرض سعر' : 'مباشر'}</td>
                                    <td className="p-3 font-bold text-emerald-600 font-mono">{o.grand_total?.toFixed(2)}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${o.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-600' : ''}
                                            ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : ''}
                                            ${o.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : ''}
                                            ${o.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : ''}
                                        `}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-left">
                                        {(o.status === 'DRAFT' || o.status === 'CONFIRMED') && (
                                            <button
                                                onClick={(e) => handleDelete(e, o.id)}
                                                className="text-gray-400 hover:text-red-500 text-sm px-2 py-1"
                                            >
                                                حذف
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {orders.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <ShoppingCart size={48} className="mb-2 opacity-20" />
                            <p>لا توجد طلبيات مسجلة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
