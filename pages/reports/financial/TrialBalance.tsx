import React, { useState } from 'react';
import { Filter, Search, Printer, Download } from 'lucide-react';

export const TrialBalance = () => {
    const [tab, setTab] = useState('General'); // General, Levels, Periods

    return (
        <div className="app-page h-full flex flex-col gap-4" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800">ميزان المراجعة {tab === 'General' ? '(عام)' : tab === 'Levels' ? '(بالمستويات)' : '(فترات)'}</h1>

            <div className="card p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-bold text-gray-700 mb-1">من تاريخ</label>
                        <input type="date" className="w-full border rounded-lg p-2 bg-gray-50" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-bold text-gray-700 mb-1">إلى تاريخ</label>
                        <input type="date" className="w-full border rounded-lg p-2 bg-gray-50" />
                    </div>
                    <div>
                        <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 h-[42px]">عرض التقرير</button>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 border-b">
                {['General', 'Levels', 'Periods'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-6 py-3 font-bold ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        {t === 'General' ? 'ميزان عام' : t === 'Levels' ? 'حسب المستويات' : 'مقارنة فترات'}
                    </button>
                ))}
            </div>

            <div className="card overflow-hidden flex-1">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 font-bold text-gray-700">
                        <tr>
                            <th className="p-4 w-32">رقم الحساب</th>
                            <th className="p-4">اسم الحساب</th>
                            <th className="p-4 text-center bg-gray-200" colSpan={2}>الأرصدة الافتتاحية</th>
                            <th className="p-4 text-center bg-gray-100" colSpan={2}>الحركات</th>
                            <th className="p-4 text-center bg-indigo-50" colSpan={2}>الأرصدة الختامية</th>
                        </tr>
                        <tr className="text-xs text-gray-500">
                            <th className="p-2"></th>
                            <th className="p-2"></th>
                            <th className="p-2 text-center border-l border-gray-300">مدين</th>
                            <th className="p-2 text-center border-l">دائن</th>
                            <th className="p-2 text-center border-l border-gray-300">مدين</th>
                            <th className="p-2 text-center border-l">دائن</th>
                            <th className="p-2 text-center border-l border-indigo-200 bg-indigo-50">مدين</th>
                            <th className="p-2 text-center bg-indigo-50">دائن</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        <tr className="hover:bg-gray-50 font-bold bg-gray-50">
                            <td className="p-3 font-mono">1</td>
                            <td className="p-3">الأصول</td>
                            <td className="p-3 text-center">100,000</td>
                            <td className="p-3 text-center">0</td>
                            <td className="p-3 text-center">50,000</td>
                            <td className="p-3 text-center">10,000</td>
                            <td className="p-3 text-center bg-indigo-50">140,000</td>
                            <td className="p-3 text-center bg-indigo-50">0</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                            <td className="p-3 font-mono">1101</td>
                            <td className="p-3 pr-8">الصندوق الرئيسي</td>
                            <td className="p-3 text-center text-gray-500">5,000</td>
                            <td className="p-3 text-center text-gray-500">0</td>
                            <td className="p-3 text-center text-gray-500">20,000</td>
                            <td className="p-3 text-center text-gray-500">15,000</td>
                            <td className="p-3 text-center font-bold bg-indigo-50">10,000</td>
                            <td className="p-3 text-center font-bold bg-indigo-50">0</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

