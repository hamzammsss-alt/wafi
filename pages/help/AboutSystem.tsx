import React from 'react';
import { Info, ShieldCheck } from 'lucide-react';

export const AboutSystem = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center text-center" dir="rtl">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl transform rotate-3">
                <span className="text-white font-bold text-3xl">W</span>
            </div>

            <h1 className="text-4xl font-bold text-gray-800 mb-2">WAFI ERP PRO</h1>
            <p className="text-gray-500 font-bold mb-8">Version 3.5.0 (Build 20240210)</p>

            <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-lg w-full mb-8">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <span className="text-gray-600">المرخص له:</span>
                    <span className="font-bold text-gray-800">شركة المثال للتجارة العامة</span>
                </div>
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <span className="text-gray-600">نوع النسخة:</span>
                    <span className="font-bold text-indigo-600">Enterprise Edition</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">تاريخ الانتهاء:</span>
                    <span className="font-bold text-green-600">مدى الحياة</span>
                </div>
            </div>

            <div className="flex items-center gap-2 text-gray-400 text-sm">
                <ShieldCheck size={16} />
                <span>جميع الحقوق محفوظة © 2024 شركة وافي للبرمجيات</span>
            </div>
        </div>
    );
};
