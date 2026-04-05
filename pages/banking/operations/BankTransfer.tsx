import React, { useState } from 'react';
import { ArrowLeftRight, Landmark } from 'lucide-react';

export const BankTransfer = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center text-center" dir="rtl">
            <ArrowLeftRight size={64} className="text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold text-gray-700">التحويل بين الحسابات</h1>
            <p className="text-gray-500 mb-8 max-w-md">نقل الأموال بين حسابات الشركة البنكية أو تغذية الصناديق.</p>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-lg">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">من حساب</label>
                        <select className="w-full border p-2 rounded"><option>البنك العربي - ILS</option></select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">إلى حساب</label>
                        <select className="w-full border p-2 rounded"><option>صندوق النثرية</option></select>
                    </div>
                </div>
                <input type="number" placeholder="المبلغ" className="w-full border p-2 rounded mb-4 font-bold text-center" />
                <button className="w-full bg-indigo-600 text-white py-2 rounded font-bold">إتمام التحويل</button>
            </div>
        </div>
    );
};
