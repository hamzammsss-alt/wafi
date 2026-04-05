import React from 'react';
import { Receipt, Coins } from 'lucide-react';

export const ClearanceExpenses = () => {
    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Coins className="text-orange-600" /> مصاريف التخليص والشحن
            </h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">ملف الاعتماد</label>
                        <select className="w-full p-2 border rounded-lg bg-gray-50">
                            <option>LC-2026-001</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">نوع المصروف</label>
                        <select className="w-full p-2 border rounded-lg">
                            <option>جمارك (Customs)</option>
                            <option>شحن (Freight)</option>
                            <option>تأمين (Insurance)</option>
                            <option>نقل داخلي</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-4 items-end mb-6">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">الجهة المستفيدة (المورد/المخلص)</label>
                        <select className="w-full p-2 border rounded-lg">
                            <option>شركة التخليص السريع</option>
                        </select>
                    </div>
                    <div className="w-48">
                        <label className="block text-sm font-bold text-gray-700 mb-2">المبلغ</label>
                        <input type="number" className="w-full p-2 border rounded-lg font-bold" placeholder="0.00" />
                    </div>
                    <button className="px-6 py-2 bg-orange-600 text-white font-bold rounded-lg">
                        إضافة
                    </button>
                </div>

                <table className="w-full text-right border rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 font-bold text-gray-700">
                        <tr>
                            <th className="p-3">نوع المصروف</th>
                            <th className="p-3">الجهة</th>
                            <th className="p-3">المبلغ</th>
                            <th className="p-3">التاريخ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-3">شحن بحري</td>
                            <td className="p-3">Maersk Line</td>
                            <td className="p-3 font-bold">12,500.00</td>
                            <td className="p-3 text-gray-500">2026-01-05</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
