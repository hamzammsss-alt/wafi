import React from 'react';
import { ClipboardList, Printer } from 'lucide-react';

export const StocktakeSheets = () => {
    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ClipboardList className="text-teal-600" /> أوراق الجرد (Stocktake Sheets)
            </h1>

            <div className="card p-6 max-w-2xl">
                <p className="text-gray-600 mb-6">
                    طباعة نماذج فارغة لتعبئة الجرد الفعلي يدوياً في المستودعات.
                </p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">المستودع</label>
                        <select className="w-full p-2 border rounded-lg">
                            <option>الكل</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">تصفية حسب المجموعة</label>
                        <select className="w-full p-2 border rounded-lg">
                            <option>الكل</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 rounded text-teal-600" defaultChecked />
                        <span className="text-sm">إخفاء الكميات الدفترية (جرد أعمى)</span>
                    </div>
                </div>

                <button className="w-full py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 flex items-center justify-center gap-2">
                    <Printer size={18} /> معاينة وطباعة
                </button>
            </div>
        </div>
    );
};
