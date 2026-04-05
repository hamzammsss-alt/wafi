import React, { useState, useEffect } from 'react';
import { Search, FileText, ArrowRight, Printer } from 'lucide-react';

export const AccountStatements = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<{ openingBalance: number, moves: any[] } | null>(null);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        // @ts-ignore
        if (!window.electronAPI) return;
        try {
            // @ts-ignore
            const accs = await window.electronAPI.account.getAccounts();
            setAccounts(accs || []);
        } catch (error) {
            console.error(error);
        }
    };

    const loadReport = async () => {
        if (!selectedAccountId) return;
        setLoading(true);
        try {
            // @ts-ignore
            const data = await window.electronAPI.getAccountStatement({
                accountId: selectedAccountId,
                fromDate,
                toDate
            });
            setReportData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Calculate running balance
    let runningBalance = reportData ? parseFloat(reportData.openingBalance as any) : 0;

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-blue-600" /> كشف حساب تفصيلي
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">الحساب</label>
                        <select
                            className="w-full border rounded-lg p-3 bg-gray-50"
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                        >
                            <option value="">اختر الحساب...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">من تاريخ</label>
                        <input
                            type="date"
                            className="w-full border rounded-lg p-3 bg-gray-50"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">إلى تاريخ</label>
                        <input
                            type="date"
                            className="w-full border rounded-lg p-3 bg-gray-50"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <button
                            onClick={loadReport}
                            disabled={loading || !selectedAccountId}
                            className="bg-indigo-600 text-white w-full py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-300 transition"
                        >
                            {loading ? 'جاري التحميل...' : 'عرض الكشف'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                {!reportData ? (
                    <div className="p-12 text-center text-gray-400 flex-1 flex items-center justify-center flex-col gap-4">
                        <Search className="w-12 h-12 opacity-20" />
                        <p>قم باختيار حساب وتحديد الفترة لعرض الحركات</p>
                    </div>
                ) : (
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">التاريخ</th>
                                    <th className="px-6 py-3">نوع الحركة</th>
                                    <th className="px-6 py-3">المرجع</th>
                                    <th className="px-6 py-3">البيان</th>
                                    <th className="px-6 py-3 text-green-700">مدين</th>
                                    <th className="px-6 py-3 text-red-700">دائن</th>
                                    <th className="px-6 py-3">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {/* Opening Balance Row */}
                                <tr className="bg-yellow-50 font-bold text-gray-700">
                                    <td colSpan={6} className="px-6 py-4 text-center">رصيد افتتاحي (ما قبل {fromDate})</td>
                                    <td className="px-6 py-4 ltr text-left">{formatCurrency(runningBalance)}</td>
                                </tr>

                                {reportData.moves.map((move: any, idx: number) => {
                                    const debit = parseFloat(move.debit || 0);
                                    const credit = parseFloat(move.credit || 0);
                                    runningBalance = runningBalance + (debit - credit);

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{move.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold bg-gray-100 rounded text-center w-fit">{move.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{move.ref_no}</td>
                                            <td className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate" title={move.description}>{move.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{debit > 0 ? formatCurrency(debit) : '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{credit > 0 ? formatCurrency(credit) : '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 ltr text-left">{formatCurrency(runningBalance)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
