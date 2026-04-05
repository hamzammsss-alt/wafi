import React from 'react';
import { DollarSign } from 'lucide-react';

export const Costs = () => {
    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <DollarSign className="text-green-600" /> تعريف التكاليف الإضافية (Overheads)
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 text-sm font-bold text-gray-600">
                        <tr>
                            <th className="p-4">اسم التكلفة</th>
                            <th className="p-4">نوع التوزيع</th>
                            <th className="p-4">القيمة الافتراضية</th>
                            <th className="p-4">الحساب المحاسبي</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        <tr className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-800">أجور عمال الإنتاج</td>
                            <td className="p-4">حسب ساعات العمل</td>
                            <td className="p-4">25.00 / ساعة</td>
                            <td className="p-4 text-gray-500">50100 - أجور تشغيل</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-800">الكهرباء والطاقة</td>
                            <td className="p-4">حسب ساعات تشغيل الآلة</td>
                            <td className="p-4">15.00 / ساعة</td>
                            <td className="p-4 text-gray-500">50200 - طاقة</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-800">إهلاك الآلات</td>
                            <td className="p-4">نسبة ثابتة من قيمة المنتج</td>
                            <td className="p-4">2.5%</td>
                            <td className="p-4 text-gray-500">50300 - إهلاك صناعي</td>
                        </tr>
                    </tbody>
                </table>
                <div className="p-4 border-t bg-gray-50">
                    <button className="text-indigo-600 font-bold hover:underline">+ بند تكلفة جديد</button>
                </div>
            </div>
        </div>
    );
};
