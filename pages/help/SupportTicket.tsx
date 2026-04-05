import React from 'react';
import { LifeBuoy, Send } from 'lucide-react';

export const SupportTicket = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex items-center justify-center" dir="rtl">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 max-w-2xl w-full p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <LifeBuoy className="text-red-500" /> فتح تذكرة دعم فني
                </h1>
                <p className="text-gray-500 mb-8">واجهت مشكلة؟ املأ النموذج أدناه وسيتم الرد عليك في أقرب وقت.</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الكامل</label>
                            <input type="text" className="w-full border rounded-lg p-3 bg-gray-50" defaultValue="أحمد سلطان" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهاتف</label>
                            <input type="text" className="w-full border rounded-lg p-3 bg-gray-50" defaultValue="0599123456" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">نوع المشكلة</label>
                        <select className="w-full border rounded-lg p-3 bg-gray-50">
                            <option>خطأ برمجي (Bug)</option>
                            <option>استفسار عام</option>
                            <option>طلب ميزة جديدة</option>
                            <option>مشكلة في الطباعة</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">تفاصل المشكلة</label>
                        <textarea className="w-full border rounded-lg p-3 bg-gray-50 h-32" placeholder="اشرح المشكلة بالتفصيل..."></textarea>
                    </div>

                    <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2">
                        <Send size={18} /> إرسال التذكرة
                    </button>
                </div>
            </div>
        </div>
    );
};
