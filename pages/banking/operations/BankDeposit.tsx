import React, { useState } from 'react';
import { Landmark, ArrowRight } from 'lucide-react';

export const BankDeposit = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center text-center" dir="rtl">
            <Landmark size={64} className="text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold text-gray-700">الإيداع البنكي</h1>
            <p className="text-gray-500 mb-8 max-w-md">إيداع النقد أو الشيكات الواردة في الحسابات البنكية.</p>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <p>قيد الإنشاء...</p>
            </div>
        </div>
    );
};
