import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const CreditLimitControl = () => {
    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="text-red-600" /> مراقبة حدود الائتمان
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 text-gray-700 font-bold">
                        <tr>
                            <th className="p-4">العميل</th>
                            <th className="p-4">سقف الدين</th>
                            <th className="p-4">الرصيد الحالي</th>
                            <th className="p-4">المتاح</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        <tr className="hover:bg-red-50/50">
                            <td className="p-4 font-bold">سوبرماركت المدينة</td>
                            <td className="p-4">50,000</td>
                            <td className="p-4 text-red-600 font-bold">55,200</td>
                            <td className="p-4 text-red-600 font-bold">-5,200</td>
                            <td className="p-4"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">تجاوز الحد</span></td>
                            <td className="p-4"><button className="text-blue-600 hover:underline text-sm font-bold">رفع الحد مؤقتاً</button></td>
                        </tr>
                        <tr>
                            <td className="p-4 font-bold">محلات السلام</td>
                            <td className="p-4">20,000</td>
                            <td className="p-4">12,000</td>
                            <td className="p-4 text-green-600 font-bold">8,000</td>
                            <td className="p-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">مسموح</span></td>
                            <td className="p-4"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
