import React, { useState, useEffect } from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, Printer, Download } from 'lucide-react';
import { exportToCSV } from '../../../utils/export';

export const TaxReports = () => {
    const [data, setData] = useState<any>({ outputTax: 0, inputTax: 0, netTax: 0, details: [] });
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getTaxReport(dateRange);
            setData(result || { outputTax: 0, inputTax: 0, netTax: 0, details: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data.details || data.details.length === 0) return alert('لا توجد بيانات لتصديرها');
        exportToCSV(data.details, `VAT_Detailed_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Landmark className="text-blue-700" /> التقارير الضريبية
            </h1>

            <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                    <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="border rounded-lg p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                    <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="border rounded-lg p-2" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Output Tax */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 hover:border-red-300 transition">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-bold text-sm mb-1">ضريبة المخرجات (مبيعات)</p>
                            <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(data.outputTax)}</h2>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <ArrowUpRight />
                        </div>
                    </div>
                    <div className="text-sm text-gray-400">مستحقة للدفع</div>
                </div>

                {/* Input Tax */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 hover:border-green-300 transition">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-bold text-sm mb-1">ضريبة المدخلات (مشتريات)</p>
                            <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(data.inputTax)}</h2>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <ArrowDownRight />
                        </div>
                    </div>
                    <div className="text-sm text-gray-400">قابلة للخصم</div>
                </div>

                {/* Net Tax */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 hover:border-blue-300 transition">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-bold text-sm mb-1">صافي الضريبة المستحقة</p>
                            <h2 className={`text-3xl font-bold ${data.netTax >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {formatCurrency(Math.abs(data.netTax))}
                            </h2>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Landmark />
                        </div>
                    </div>
                    <div className="text-sm font-bold text-gray-500">
                        {data.netTax >= 0 ? 'مبلغ واجب الدفع' : 'رصيد دائن (رديات)'}
                    </div>
                </div>

            </div>

            {/* Detailed Table Section */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b font-bold text-gray-700 flex justify-between items-center bg-gray-50">
                    <span>تفاصيل الفواتير والحركات الضريبية</span>
                    <button onClick={handleExport} className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm font-bold bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-green-100">
                        <Download size={16} /> تصدير CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white font-bold text-gray-600 border-b border-gray-200">
                            <tr>
                                <th className="p-4">التاريخ</th>
                                <th className="p-4">رقم المرجع (الفاتورة)</th>
                                <th className="p-4">نوع الحركة</th>
                                <th className="p-4">البيان</th>
                                <th className="p-4">المبلغ الخاضع للضريبة</th>
                                <th className="p-4">قيمة الضريبة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.details && data.details.length > 0 ? (
                                data.details.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="p-4 whitespace-nowrap text-gray-600">{row.date}</td>
                                        <td className="p-4 font-mono text-gray-800 font-medium">{row.invoice_ref || row.reference_no || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${row.tax_type === 'OUTPUT' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                                {row.tax_type === 'OUTPUT' ? 'مبيعات (مخرجات)' : 'مشتريات (مدخلات)'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600">{row.description}</td>
                                        <td className="p-4 font-medium text-gray-800">{formatCurrency(row.base_amount)}</td>
                                        <td className="p-4 font-bold text-gray-900">{formatCurrency(row.tax_amount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-400">
                                        {loading ? 'جاري التحميل...' : 'لا توجد تفاصيل ضريبية في هذه الفترة'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
