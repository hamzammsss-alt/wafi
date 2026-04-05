import React from 'react';
import { FileText } from 'lucide-react';

export const BankEntries = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center text-center" dir="rtl">
            <FileText size={64} className="text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold text-gray-700">القيود البنكية المباشرة</h1>
            <p className="text-gray-500 mb-8 max-w-md">إثبات المصاريف البنكية والفوائد والعمولات.</p>
            <button className="bg-gray-800 text-white px-6 py-2 rounded-lg">إنشاء قيد جديد</button>
        </div>
    );
};
