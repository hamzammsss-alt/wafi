import React, { useState } from 'react';
import { ArrowRightLeft, Save } from 'lucide-react';

export const StockTransfer: React.FC = () => {
    return (
        <div className="h-full bg-gray-50 p-6" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <ArrowRightLeft size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">سند تحويل مخزون</h1>
                            <p className="text-sm text-gray-500">نقل بضاعة من مستودع لآخر</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">من مستودع</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="1">المستودع الرئيسي</option>
                                <option value="2">فرع الخليل</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">إلى مستودع</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="1">المستودع الرئيسي</option>
                                <option value="2">فرع الخليل</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <Save size={18} />
                            تنفيذ التحويل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
