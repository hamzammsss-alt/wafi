import React, { useState, useEffect } from 'react';
import { Search, Printer, FileText } from 'lucide-react';

export const AccountStatement = () => {
    const [filters, setFilters] = useState({
        accountId: '',
        accountName: '',
        fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // أول السنة
        toDate: new Date().toISOString().split('T')[0]
    });

    const [data, setData] = useState({ openingBalance: 0, moves: [] });
    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        // جلب قائمة الحسابات للبحث
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            window.electronAPI.getAccounts().then(setAccounts);
        }
    }, []);

    const runReport = async () => {
        if (!filters.accountId) return;
        // @ts-ignore
        const result = await window.electronAPI.getAccountStatement(filters);
        setData(result);
    };

    // حساب الرصيد التراكمي (Running Balance)
    let currentBalance = data.openingBalance;

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-4">
            {/* 1. Header & Filters */}
            <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-300 mb-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" /> كشف حساب تفصيلي
                </h2>

                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">الحساب</label>
                        <select
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            onChange={e => setFilters({ ...filters, accountId: e.target.value })}
                            value={filters.accountId}
                        >
                            <option value="">-- اختر الحساب --</option>
                            {accounts.map((a: any) => (
                                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">من تاريخ</label>
                        <input type="date" value={filters.fromDate} onChange={e => setFilters({ ...filters, fromDate: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">إلى تاريخ</label>
                        <input type="date" value={filters.toDate} onChange={e => setFilters({ ...filters, toDate: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <button onClick={runReport} className="bg-blue-600 text-white px-6 py-1.5 rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
                        <Search size={16} /> عرض
                    </button>
                    <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-gray-800 flex items-center gap-2">
                        <Printer size={16} /> طباعة
                    </button>
                </div>
            </div>

            {/* 2. Report Grid */}
            <div className="flex-1 bg-white border border-gray-300 overflow-auto shadow-sm">
                <table className="w-full text-right text-sm dense-grid border-collapse">
                    <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="w-24 p-2 border">التاريخ</th>
                            <th className="w-20 p-2 border">النوع</th>
                            <th className="w-24 p-2 border">الرقم</th>
                            <th className="p-2 border">البيان</th>
                            <th className="w-24 p-2 border text-left">مدين</th>
                            <th className="w-24 p-2 border text-left">دائن</th>
                            <th className="w-32 p-2 border text-left bg-gray-200">الرصيد</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Opening Balance Row */}
                        <tr className="bg-yellow-50 font-bold text-gray-700">
                            <td colSpan={4} className="p-2 border text-center">-- الرصيد الافتتاحي (سابق) --</td>
                            <td className="p-2 border text-left">{data.openingBalance > 0 ? data.openingBalance.toFixed(2) : '0.00'}</td>
                            <td className="p-2 border text-left">{data.openingBalance < 0 ? Math.abs(data.openingBalance).toFixed(2) : '0.00'}</td>
                            <td className="p-2 border text-left bg-yellow-100 dir-ltr">{data.openingBalance.toFixed(2)}</td>
                        </tr>

                        {/* Transactions Rows */}
                        {data.moves.map((row: any, idx) => {
                            currentBalance += (row.debit - row.credit);
                            return (
                                <tr key={idx} className="hover:bg-blue-50">
                                    <td className="p-2 border font-mono">{row.date}</td>
                                    <td className="p-2 border text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${row.type === 'INV' ? 'bg-green-500' : row.type === 'JV' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                            {row.type}
                                        </span>
                                    </td>
                                    <td className="p-2 border font-mono">{row.ref_no}</td>
                                    <td className="p-2 border">{row.description}</td>
                                    <td className="p-2 border text-left font-mono">{row.debit ? row.debit.toFixed(2) : ''}</td>
                                    <td className="p-2 border text-left font-mono">{row.credit ? row.credit.toFixed(2) : ''}</td>
                                    <td className={`p-2 border text-left font-bold font-mono dir-ltr bg-gray-50 ${currentBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                        {currentBalance.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-800 text-white font-bold sticky bottom-0">
                        <tr>
                            <td colSpan={6} className="p-3 text-center">الرصيد النهائي</td>
                            <td className="p-3 text-left dir-ltr text-lg">{currentBalance.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
