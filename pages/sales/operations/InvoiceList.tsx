import React, { useState, useEffect } from 'react';
import { Plus, ShoppingCart, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabs } from '../../../src/contexts/TabsContext';

export const InvoiceList = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const api = (window as any).electronAPI?.sales;

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getInvoices();
            setInvoices(data || []);
        } catch (error) {
            console.error("Failed to load invoices", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-[#f0f2f5] h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">فواتير المبيعات</h1>
                        <p className="text-xs text-gray-500">سجل الفواتير والمستحقات</p>
                    </div>
                </div>
                <button
                    onClick={() => navigateInTab('/sales/invoices/new', 'فاتورة جديدة')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                    <Plus size={18} /> فاتورة جديدة
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-600 font-bold text-xs sticky top-0">
                            <tr>
                                <th className="p-3">رقم الفاتورة</th>
                                <th className="p-3">الزبون</th>
                                <th className="p-3">التاريخ</th>
                                <th className="p-3">تاريخ الاستحقاق</th>
                                <th className="p-3">الإجمالي</th>
                                <th className="p-3 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoices.map(inv => (
                                <tr
                                    key={inv.id}
                                    className="hover:bg-pink-50/50 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/sales/invoices/${inv.id}`)}
                                >
                                    <td className="p-3 font-mono text-pink-600 font-bold">{inv.invoice_no}</td>
                                    <td className="p-3 font-medium text-gray-800">{inv.customer_name}</td>
                                    <td className="p-3 text-gray-600 font-mono text-sm">{inv.date}</td>
                                    <td className="p-3 text-gray-600 font-mono text-sm">{inv.due_date}</td>
                                    <td className="p-3 font-bold text-emerald-600 font-mono">{inv.grand_total?.toFixed(2)}</td>
                                    <td className="p-3 text-center flex items-center justify-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${inv.status === 'POSTED' ? 'bg-green-100 text-green-600' : ''}
                                            ${inv.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : ''}
                                        `}>
                                            {inv.status}
                                        </span>
                                        {inv.status === 'POSTED' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/sales/return', { state: { sourceInvoiceId: inv.id, customerId: inv.customer_id } });
                                                }}
                                                className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 border border-red-100 transition-colors"
                                                title="إنشاء مردود مبيعات"
                                            >
                                                مردود
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {invoices.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FileText size={48} className="mb-2 opacity-20" />
                            <p>لا توجد فواتير مسجلة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
