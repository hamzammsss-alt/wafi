import React, { useState, useEffect } from 'react';
import { FileText, Search, Download, ArrowRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToCSV } from '../../../utils/export';

export const SalesInvoicesReport = () => {
    const navigate = useNavigate();
    const [range, setRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            // We use the existing getInvoices but likely need to filter locally or ensure backend supports range
            // For report, we usually want ALL invoices in range. 
            // If getInvoices is paginated, we might need a specific report API.
            // Let's assume for now we use the general one or check `SalesService`. 
            // Only 'sales-get-invoices' exists. Let's use it and filter client side if needed or update backend.
            // Actually, for a REPORT, we want a dedicated endpoint usually.
            // Let's assume we use 'reports-get-sales-analytics' logic or similar.
            // But wait, user wants "Invoices Report".
            // Let's use `sales-get-invoices` for now.
            const result = await window.electronAPI.sales.getInvoices();
            // Filter by date locally
            const filtered = result.filter((inv: any) =>
                inv.date >= range.startDate && inv.date <= range.endDate
            );
            setInvoices(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        exportToCSV(invoices, `Sales_Invoices_${range.startDate}_${range.endDate}.csv`);
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-600" />
                            تقرير فواتير المبيعات
                        </h1>
                        <span className="text-sm text-gray-500">عرض وتصدير فواتير المبيعات</span>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    disabled={invoices.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    تصدير CSV
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-end gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">من تاريخ</label>
                    <input type="date" value={range.startDate} onChange={e => setRange({ ...range, startDate: e.target.value })} className="border p-2 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">إلى تاريخ</label>
                    <input type="date" value={range.endDate} onChange={e => setRange({ ...range, endDate: e.target.value })} className="border p-2 rounded" />
                </div>
                <button onClick={loadData} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 flex items-center gap-2">
                    <Search className="w-4 h-4" /> عرض
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase border-b">
                        <tr>
                            <th className="p-4">رقم الفاتورة</th>
                            <th className="p-4">التاريخ</th>
                            <th className="p-4">العميل</th>
                            <th className="p-4">المندوب</th>
                            <th className="p-4">المبلغ</th>
                            <th className="p-4">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50">
                                <td className="p-4 font-mono font-bold text-blue-600">{inv.invoice_number}</td>
                                <td className="p-4">{inv.date}</td>
                                <td className="p-4 font-bold">{inv.customer_name}</td>
                                <td className="p-4 text-gray-500">{inv.salesman_name || '-'}</td>
                                <td className="p-4 font-bold">{formatCurrency(inv.grand_total)}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${inv.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {inv.status === 'POSTED' ? 'مرحل' : 'مسودة'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {invoices.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-400">لا توجد فواتير</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
