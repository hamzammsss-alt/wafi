import { useNavigate } from 'react-router-dom';
import { useTabs } from '../../../src/contexts/TabsContext';
import React, { useState, useEffect } from 'react'; // Re-adding React imports which might have been lost or are needed
import { Plus, Search, FileText, CheckCircle, XCircle, Trash2 } from 'lucide-react'; // Re-adding icons

export const QuotationList = () => {
    const { navigateInTab } = useTabs();
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const api = (window as any).electronAPI?.sales;

    useEffect(() => {
        loadQuotations();
    }, []);

    const loadQuotations = async () => {
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getQuotations();
            setQuotations(data || []);
        } catch (error) {
            console.error("Failed to load quotations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("هل أنت متأكد من حذف عرض السعر هذا؟")) return;
        try {
            await api.deleteQuotation(id);
            loadQuotations();
        } catch (error: any) {
            alert("فشل الحذف: " + error.message);
        }
    };

    return (
        <div className="p-6 bg-[#f0f2f5] h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">عروض الأسعار</h1>
                        <p className="text-xs text-gray-500">إدارة ومتابعة عروض الأسعار المقدمة</p>
                    </div>
                </div>
                <button
                    onClick={() => navigateInTab('/sales/quotations/new', 'عرض سعر جديد')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                    <Plus size={18} /> عرض سعر جديد
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-600 font-bold text-xs sticky top-0">
                            <tr>
                                <th className="p-3">رقم العرض</th>
                                <th className="p-3">الزبون</th>
                                <th className="p-3">التاريخ</th>
                                <th className="p-3">تاريخ الانتهاء</th>
                                <th className="p-3">المبلغ الإجمالي</th>
                                <th className="p-3 text-center">الحالة</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {quotations.map(q => (
                                <tr
                                    key={q.id}
                                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/sales/quotations/${q.id}`)}
                                >
                                    <td className="p-3 font-mono text-indigo-600 font-bold">{q.quotation_no}</td>
                                    <td className="p-3 font-medium text-gray-800">{q.customer_name}</td>
                                    <td className="p-3 text-gray-600 font-mono text-sm">{q.date}</td>
                                    <td className="p-3 text-gray-600 font-mono text-sm">{q.expiry_date || '-'}</td>
                                    <td className="p-3 font-bold text-emerald-600 font-mono">{q.grand_total?.toFixed(2)}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${q.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : ''}
                                            ${q.status === 'CONVERTED' ? 'bg-green-100 text-green-600' : ''}
                                            ${q.status === 'SENT' ? 'bg-blue-100 text-blue-600' : ''}
                                        `}>
                                            {q.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {q.status === 'DRAFT' && (
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/sales/invoices/new?quotation_id=${q.id}`);
                                                    }}
                                                    className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1"
                                                    title="تحويل إلى فاتورة مبيعات"
                                                >
                                                    <CheckCircle size={14} /> تحويل
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, q.id)}
                                                    className="text-gray-400 hover:text-red-500 text-sm px-2 py-1"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {quotations.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FileText size={48} className="mb-2 opacity-20" />
                            <p>لا توجد عروض أسعار مسجلة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
