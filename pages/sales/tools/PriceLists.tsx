import React from 'react';
import { Tags } from 'lucide-react';

export const PriceLists = () => {
    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Tags className="text-purple-600" /> قوائم الأسعار
            </h1>

            <div className="flex gap-4 mb-6">
                {['سعر الجمهور (الافتراضي)', 'أسعار الجملة', 'موزعين VIP', 'خصم خاص'].map((l, i) => (
                    <div key={l} className={`p-4 rounded-xl border cursor-pointer min-w-[200px] ${i === 1 ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white hover:border-purple-200'}`}>
                        <div className="font-bold text-gray-800 mb-1">{l}</div>
                        <div className="text-xs text-gray-500">250 صنف مرتبط</div>
                    </div>
                ))}
                <button className="p-4 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50">+ قائمة جديدة</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b font-bold text-gray-700 bg-gray-50">تفاصيل قائمة: أسعار الجملة</div>
                <table className="w-full text-right text-sm">
                    <thead className="bg-white border-b text-gray-600">
                        <tr>
                            <th className="p-3">رمز الصنف</th>
                            <th className="p-3">اسم الصنف</th>
                            <th className="p-3">السعر الأساسي</th>
                            <th className="p-3">سعر القائمة</th>
                            <th className="p-3">الخصم %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        <tr>
                            <td className="p-3 font-mono">1001</td>
                            <td className="p-3">سخان كهربائي 50 لتر</td>
                            <td className="p-3 text-gray-500 line-through">450.00</td>
                            <td className="p-3 font-bold text-purple-700">400.00</td>
                            <td className="p-3 text-green-600 font-bold">11%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
