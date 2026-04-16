import React, { useState, useEffect } from 'react';
import { Save, Search, Calculator, ArrowRightLeft } from 'lucide-react';

export const OpeningBalances = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const data = await window.electronAPI.getTransactionalAccounts(); // Get leaf accounts only
            // Initialize with existing opening balances if any, or 0
            const mapped = data.map((acc: any) => ({
                ...acc,
                debit: acc.opening_debit || 0,
                credit: acc.opening_credit || 0
            }));
            setAccounts(mapped);
        } else {
            // Mock
            setAccounts([
                { id: 1, code: '101', name: 'Cash', debit: 1000, credit: 0 },
                { id: 2, code: '201', name: 'Capital', debit: 0, credit: 1000 },
            ]);
        }
        setLoading(false);
    };

    const handleChange = (id: number, field: 'debit' | 'credit', value: string) => {
        const val = parseFloat(value) || 0;
        setAccounts(prev => prev.map(acc => {
            if (acc.id === id) {
                return { ...acc, [field]: val, [field === 'debit' ? 'credit' : 'debit']: 0 }; // Toggle: if debit entered, credit 0
            }
            return acc;
        }));
    };

    const handleSave = async () => {
        const totalDebit = accounts.reduce((sum, acc) => sum + acc.debit, 0);
        const totalCredit = accounts.reduce((sum, acc) => sum + acc.credit, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            alert(`القيد غير متوازن!\nالمدين: ${totalDebit}\nالدائن: ${totalCredit}\nالفرق: ${Math.abs(totalDebit - totalCredit)}`);
            return;
        }

        try {
            // @ts-ignore
            await window.electronAPI.saveOpeningBalances(accounts);
            alert('تم حفظ الأرصدة الافتتاحية بنجاح');
        } catch (error) {
            alert('فشل الحفظ');
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.code.includes(searchTerm) || acc.name.includes(searchTerm)
    );

    const totalDebit = accounts.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredit = accounts.reduce((sum, acc) => sum + acc.credit, 0);
    const diff = totalDebit - totalCredit;

    return (
        <div className="flex flex-col app-page h-full" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ArrowRightLeft className="text-indigo-600" /> الأرصدة الافتتاحية
                    </h1>
                    <p className="text-sm text-gray-500">إدخال أرصدة بداية المدة للحسابات</p>
                </div>
                <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                    <Save size={18} /> حفظ الأرصدة
                </button>
            </div>

            <div className="card flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <div className="relative w-96">
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث برقم أو اسم الحساب..."
                            className="w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-6 font-mono text-sm">
                        <div className="text-center">
                            <span className="text-gray-500 block text-xs">إجمالي المدين</span>
                            <span className="font-bold text-green-600 text-lg">{totalDebit.toLocaleString()}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-gray-500 block text-xs">إجمالي الدائن</span>
                            <span className="font-bold text-red-600 text-lg">{totalCredit.toLocaleString()}</span>
                        </div>
                        <div className={`text-center px-4 py-1 rounded ${Math.abs(diff) < 0.01 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            <span className="text-gray-500 block text-xs">الفرق</span>
                            <span className="font-bold text-lg">{Math.abs(diff).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="dense-table w-full">
                        <thead className="bg-gray-100 sticky top-0 z-10 text-xs font-bold text-gray-600 uppercase">
                            <tr>
                                <th className="px-6 py-3 text-right">رقم الحساب</th>
                                <th className="px-6 py-3 text-right">اسم الحساب</th>
                                <th className="px-6 py-3 text-right w-48 text-green-700">مدين</th>
                                <th className="px-6 py-3 text-right w-48 text-red-700">دائن</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAccounts.map(acc => (
                                <tr key={acc.id} className="hover:bg-indigo-50/30 transition">
                                    <td className="px-6 py-2 font-mono text-sm text-gray-600 font-bold">{acc.code}</td>
                                    <td className="px-6 py-2 text-sm font-medium">{acc.name}</td>
                                    <td className="px-6 py-2">
                                        <input
                                            type="number"
                                            value={acc.debit > 0 ? acc.debit : ''}
                                            onChange={e => handleChange(acc.id, 'debit', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full border-gray-200 bg-gray-50 focus:bg-white rounded p-1 text-center font-mono font-bold focus:ring-2 focus:ring-green-500 outline-none transition"
                                        />
                                    </td>
                                    <td className="px-6 py-2">
                                        <input
                                            type="number"
                                            value={acc.credit > 0 ? acc.credit : ''}
                                            onChange={e => handleChange(acc.id, 'credit', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full border-gray-200 bg-gray-50 focus:bg-white rounded p-1 text-center font-mono font-bold focus:ring-2 focus:ring-red-500 outline-none transition"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

