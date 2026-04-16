import React from 'react';
import { Percent, Plus, Megaphone } from 'lucide-react';

export const Promotions = () => {
    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Megaphone className="text-pink-600" /> العروض والخصومات
                </h1>
                <button className="px-4 py-2 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 flex items-center gap-2">
                    <Plus size={18} /> عرض جديد
                </button>
            </div>

            <div className="card p-12 text-center">
                <Percent size={64} className="mx-auto text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-500">لا توجد عروض نشطة حالياً</h3>
                <p className="text-gray-400 mt-2">قم بإنشاء حملات ترويجية وخصومات لزيادة المبيعات</p>
            </div>
        </div>
    );
};
