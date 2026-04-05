import React from 'react';
import { StickyNote, Save, Trash2 } from 'lucide-react';

export const NotepadApp = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <StickyNote className="text-yellow-500" /> المفكرة السريعة
                </h1>
                <div className="flex gap-2">
                    <button className="bg-white border text-red-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-50">
                        <Trash2 size={18} /> مسح
                    </button>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm">
                        <Save size={18} /> حفظ الملاحظات
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-yellow-50 rounded-xl shadow-inner border border-yellow-200 p-6 relative">
                <div className="absolute top-0 left-8 w-4 h-full border-l-2 border-red-200/50 pointer-events-none"></div>
                <textarea
                    className="w-full h-full bg-transparent border-none focus:ring-0 resize-none text-gray-700 text-lg leading-loose font-medium"
                    placeholder="اكتب ملاحظاتك هنا..."
                    defaultValue="- مراجعة تقرير المبيعات الشهري مع المدير العام.&#10;- الاتصال بالمورد بخصوص الشحنة المتأخرة.&#10;- تحديث أسعار الصرف في النظام."
                ></textarea>
            </div>
        </div>
    );
};
