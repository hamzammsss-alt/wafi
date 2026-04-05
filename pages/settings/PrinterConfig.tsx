
import React from 'react';
import { Printer } from 'lucide-react';

export const PrinterConfig = () => {
    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Printer className="text-gray-600" /> إعدادات الطابعات
            </h1>
            <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                <p>تخصيص طابعة لكل نوع مستند (الفواتير، السندات، الباركود).</p>
            </div>
        </div>
    );
};
