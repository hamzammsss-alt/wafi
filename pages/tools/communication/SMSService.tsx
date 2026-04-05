import React from 'react';
import { MessageSquare, Send } from 'lucide-react';

export const SMSService = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <MessageSquare className="text-blue-500" /> خدمة الرسائل القصيرة SMS
            </h1>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">إرسال رسالة جديدة</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">اسم المرسل (Sender ID)</label>
                            <select className="w-full border rounded-lg p-3 bg-gray-50">
                                <option>WAFI-ERP</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">إلى (أرقام الهواتف)</label>
                            <textarea className="w-full border rounded-lg p-3 bg-gray-50 h-24 font-mono text-sm" placeholder="أدخل الأرقام مفصولة بفاصلة..."></textarea>
                            <div className="text-xs text-gray-400 mt-1 flex justify-between">
                                <span>يمكنك أيضاً اختيار مجموعة من جهات الاتصال</span>
                                <button className="text-indigo-600 font-bold hover:underline">اختيار من العملاء</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">نص الرسالة</label>
                            <textarea className="w-full border rounded-lg p-3 bg-gray-50 h-32" placeholder="اكتب نص الرسالة..."></textarea>
                            <div className="text-xs text-gray-400 mt-1 text-left">0 / 70 حرف (1 رسالة)</div>
                        </div>
                        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2 w-fit">
                            <Send size={18} className="ml-1" /> إرسال الآن
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                        <div className="text-sm text-gray-500 mb-1">الرصيد المتبقي</div>
                        <div className="text-4xl font-bold text-blue-600">1,250</div>
                        <div className="text-xs text-gray-400 mt-2">رسالة</div>
                        <button className="mt-4 w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-bold text-sm hover:bg-gray-200">شحن الرصيد</button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-700 mb-4 text-sm">آخر العمليات</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="text-gray-600">تهنئة العيد</span>
                                <span className="font-bold text-xs bg-green-100 text-green-700 px-2 rounded">تم الإرسال</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="text-gray-600">تذكير بالدفع</span>
                                <span className="font-bold text-xs bg-red-100 text-red-700 px-2 rounded">فشل 5</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
