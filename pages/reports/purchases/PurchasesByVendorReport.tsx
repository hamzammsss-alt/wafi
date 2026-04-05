import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToCSV } from '../../../utils/export';

const PurchasesByVendorReport = () => {
    const navigate = useNavigate();
    const [range, setRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getPurchasesByVendor(range);
            setData(result || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        exportToCSV(data, `Purchases_By_Vendor_${range.startDate}_${range.endDate}.csv`);
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
                            <ShoppingBag className="w-6 h-6 text-blue-600" />
                            مشتريات حسب المورد
                        </h1>
                        <span className="text-sm text-gray-500">تحليل المشتريات المجمعة لكل مورد</span>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    disabled={data.length === 0}
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
                            <th className="p-4">المورد</th>
                            <th className="p-4">عدد الفواتير</th>
                            <th className="p-4">إجمالي المشتريات</th>
                            <th className="p-4">المدفوع</th>
                            <th className="p-4">المتبقي</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{row.vendor_name}</td>
                                <td className="p-4">{row.bill_count || 0}</td>
                                <td className="p-4 font-bold text-blue-600">{formatCurrency(row.total_amount)}</td>
                                <td className="p-4 text-green-600">{formatCurrency(row.total_paid)}</td>
                                <td className="p-4 text-red-600 font-bold">{formatCurrency(row.balance_due)}</td>
                            </tr>
                        ))}
                        {data.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-400">لا توجد بيانات</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchasesByVendorReport;
