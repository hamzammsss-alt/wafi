import React, { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, Calendar, Archive, ArrowRightCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabs } from '../../../src/contexts/TabsContext';

export const PurchaseRequestList = () => {
    // const navigate = useNavigate(); // Removed in favor of Tabs
    const { openTab, navigateInTab } = useTabs(); // Use Tabs Context
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const data = await window.electronAPI.purchase.getRequests();
            setRequests(data);
        } catch (error) {
            console.error("Failed to load requests", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
            try {
                await window.electronAPI.purchase.deleteRequest(id);
                loadRequests();
            } catch (error: any) {
                alert("فشل الحذف: " + error.message);
            }
        }
    };

    // Helper for navigation
    const openRequest = (id: string, requestNo: string) => {
        openTab({
            id: `/purchasing/requests/${id}`,
            path: `/purchasing/requests/${id}`,
            title: `طلب شراء ${requestNo}`,
            isClosable: true
        });
    };

    const createNewRequest = () => {
        openTab({
            id: '/purchasing/requests/new',
            path: '/purchasing/requests/new',
            title: 'طلب شراء جديد',
            isClosable: true
        });
    };

    const createOrder = (id: string) => {
        openTab({
            id: `/purchasing/orders/new?requestId=${id}`,
            path: `/purchasing/orders/new?requestId=${id}`,
            title: 'طلبية شراء جديدة',
            isClosable: true
        });
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">طلبات الشراء</h1>
                    <p className="text-gray-500">إدارة طلبات المواد من المستودعات والأقسام</p>
                </div>
                <button
                    onClick={createNewRequest}
                    className="flex items-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    طلب شراء جديد
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                        <tr>
                            <th className="p-4">رقم الطلب</th>
                            <th className="p-4">تاريخ الطلب</th>
                            <th className="p-4">المستودع الطالب</th>
                            <th className="p-4">مقدم الطلب</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">ملاحظات</th>
                            <th className="p-4 w-32">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-6 text-center text-gray-500">جاري التحميل...</td></tr>
                        ) : requests.length === 0 ? (
                            <tr><td colSpan={6} className="p-12 text-center text-gray-400 flex flex-col items-center gap-4">
                                <Archive className="w-12 h-12 opacity-50" />
                                لا توجد طلبات شراء مسجلة
                            </td></tr>
                        ) : (
                            requests.map((r) => (
                                <tr
                                    key={r.id}
                                    onClick={() => openRequest(r.id, r.request_no)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                                >
                                    <td className="p-4 font-mono font-bold text-orange-600">{r.request_no}</td>
                                    <td className="p-4 flex items-center gap-2 text-gray-600">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        {r.date}
                                    </td>
                                    <td className="p-4">{r.warehouse_name || '-'}</td>
                                    <td className="p-4 text-sm text-gray-600 font-medium">{r.requester_name || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' :
                                            r.status === 'ORDERED' ? 'bg-green-100 text-green-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                            {r.status === 'DRAFT' ? 'مسودة' : r.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm truncate max-w-xs">{r.notes}</td>
                                    <td className="p-4 flex items-center gap-2">
                                        <button className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {r.status === 'DRAFT' && (
                                            <button
                                                onClick={(e) => handleDelete(r.id, e)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg group-hover:opacity-100 opacity-0 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                createOrder(r.id);
                                            }}
                                            title="تحويل إلى طلبية شراء"
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <ArrowRightCircle className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
