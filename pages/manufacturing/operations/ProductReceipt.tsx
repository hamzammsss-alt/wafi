import React from 'react';
import { PackagePlus } from 'lucide-react';

export const ProductReceipt = () => {
    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b bg-green-50 flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full text-green-600 shadow-sm"><PackagePlus size={24} /></div>
                    <div>
                        <h1 className="text-xl font-bold text-green-900">استلام منتج جاهز</h1>
                        <p className="text-sm text-green-700">تخزين المنتجات النهائية في مستودع الإنتاج التام</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">أمر التصنيع المصدر</label>
                            <select className="w-full border rounded-lg p-3 bg-gray-50">
                                <option>MO-2024-001 - طاولة مكتبية</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الاستلام</label>
                            <input type="date" className="w-full border rounded-lg p-3" />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border">
                        <div className="flex justify-between font-bold text-gray-700 mb-2">
                            <span>المنتج: طاولة مكتبية - خشب زان</span>
                            <span>الكمية المخططة: 50</span>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                            <label className="font-bold text-gray-800">الكمية المستلمة (المنتجة فعلياً):</label>
                            <input type="number" className="border-2 border-green-500 rounded-lg p-2 w-32 text-center text-xl font-bold bg-white" placeholder="0" />
                            <span className="text-gray-500">قطعة</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">المستودع المستلم</label>
                        <select className="w-full border rounded-lg p-3 bg-white">
                            <option>المستودع الرئيسي - قسم الإنتاج التام</option>
                        </select>
                    </div>

                    <button className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-100 mt-4">إتمام عملية الاستلام</button>
                </div>
            </div>
        </div>
    );
};
