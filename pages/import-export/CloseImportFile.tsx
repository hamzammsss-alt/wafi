import React from 'react';
import { Lock, CheckCheck } from 'lucide-react';

export const CloseImportFile = () => {
    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Lock className="text-red-600" /> إغلاق ملف الاستيراد
            </h1>

            <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCheck size={32} className="text-green-600" />
                </div>

                <h2 className="text-xl font-bold text-gray-800 mb-2">تأكيد إغلاق الملف LC-2026-001</h2>
                <p className="text-gray-500 mb-8">
                    عند إغلاق الملف، لا يمكن إضافة أي فواتير أو مصاريف جديدة عليه. سيتم تثبيت تكاليف الأصناف بشكل نهائي.
                </p>

                <div className="flex gap-4">
                    <button className="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50">
                        إلغاء
                    </button>
                    <button className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200">
                        إغلاق الملف نهائياً
                    </button>
                </div>
            </div>
        </div>
    );
};
