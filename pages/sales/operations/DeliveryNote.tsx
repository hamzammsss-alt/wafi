import React from 'react';
import { Truck, Save, Printer, PackageCheck } from 'lucide-react';

export const DeliveryNote = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Truck className="text-orange-600" /> إرسالية مبيعات (DN)
                </h1>
                <div className="flex gap-2">
                    <button className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 shadow-sm flex items-center gap-2">
                        <Save size={18} /> حفظ وترحيل مخزني
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">استيراد من طلبية</label>
                        <select className="w-full border rounded-lg p-3 bg-gray-50">
                            <option value="">اختيار طلبية لتنفيذها...</option>
                            <option value="1">SO-2024-001 (شركة الاتحاد)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">أمين المستودع</label>
                        <input type="text" className="w-full border rounded-lg p-3 bg-gray-200" value="المستخدم الحالي" readOnly />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">المستودع المصدر</label>
                        <select className="w-full border rounded-lg p-3 bg-gray-50 font-bold">
                            <option>المستودع الرئيسي - رام الله</option>
                            <option>مستودع الخليل</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 p-6 flex items-center justify-center text-gray-400">
                قائمة الأصناف المراد تسليمها
            </div>
        </div>
    );
};
