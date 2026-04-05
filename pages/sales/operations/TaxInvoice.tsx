import React from 'react';
import { FileBadge, Save, Printer, CreditCard } from 'lucide-react';

export const TaxInvoice = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileBadge className="text-green-600" /> فاتورة مبيعات ضريبية
                </h1>
                <div className="flex gap-2">
                    <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-sm flex items-center gap-2">
                        <Save size={18} /> حفظ وترحيل مالي
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">العميل</label>
                        <input type="text" className="w-full border rounded-lg p-3 bg-gray-50 font-bold" placeholder="ابحث عن عميل..." />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">طريقة الدفع</label>
                        <select className="w-full border rounded-lg p-3 bg-gray-50 font-bold">
                            <option>ذمم (Credit)</option>
                            <option>نقدي (Cash)</option>
                            <option>شيك (Cheque)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">رقم الإرسالية (اختياري)</label>
                        <input type="text" className="w-full border rounded-lg p-3 bg-gray-50 font-bold" placeholder="ربط بإرسالية..." />
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 p-6 flex items-center justify-center text-gray-400">
                شبكة تفاصيل الفاتورة
            </div>
        </div>
    );
};
