import React, { useState, useEffect } from 'react';
import { Scale, ArrowRight, RefreshCcw, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToCSV } from '../../utils/export';

const TrialBalance = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await window.electronAPI.reports.getTrialBalance();
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        exportToCSV(data, `Trial_Balance_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const totalDebit = data.reduce((acc, curr) => acc + curr.total_debit, 0);
    const totalCredit = data.reduce((acc, curr) => acc + curr.total_credit, 0);

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans" dir="rtl">

            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Scale className="w-6 h-6 text-purple-600" />
                            ميزان المراجعة
                        </h1>
                        <span className="text-sm text-gray-500">ملخص أرصدة الحسابات ومطابقتها</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-bold hover:bg-green-100 transition-colors">
                        <Download className="w-4 h-4" />
                        تصدير Excel
                    </button>
                    <button
                        onClick={loadData}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                        <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Trial Balance Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">رقم الحساب</th>
                            <th className="px-6 py-3">اسم الحساب</th>
                            <th className="px-6 py-3 bg-green-50/50">مجاميع مدينة</th>
                            <th className="px-6 py-3 bg-red-50/50">مجاميع دائنة</th>
                            <th className="px-6 py-3">صافي الرصيد</th>
                            <th className="px-6 py-3">نوع الرصيد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, index) => {
                            if (row.total_debit === 0 && row.total_credit === 0) return null; // Skip zero accounts? Optional.
                            return (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono font-bold">{row.account_code}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{row.name_ar}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 bg-green-50/30">{row.total_debit.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 bg-red-50/30">{row.total_credit.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-100">
                                        {Math.abs(row.net_balance).toLocaleString()}
                                    </td>
                                    <td className={`px-6 py-4 text-xs font-bold ${row.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {row.net_balance > 0 ? 'مدين' : (row.net_balance < 0 ? 'دائن' : '-')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-purple-50 font-bold border-t border-purple-100">
                        <tr>
                            <td colSpan={2} className="px-6 py-4 text-center">الإجماليات</td>
                            <td className="px-6 py-4 text-purple-900">{totalDebit.toLocaleString()}</td>
                            <td className="px-6 py-4 text-purple-900">{totalCredit.toLocaleString()}</td>
                            <td colSpan={2} className="px-6 py-4 text-center text-sm text-purple-600">
                                {totalDebit === totalCredit
                                    ? <span className="flex items-center gap-2 justify-center"><Scale className="w-4 h-4" /> الميزان متطابق</span>
                                    : <span className="flex items-center gap-2 justify-center text-red-600">غير متطابق! (الفرق: {Math.abs(totalDebit - totalCredit)})</span>
                                }
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

        </div>
    );
};

export { TrialBalance };
