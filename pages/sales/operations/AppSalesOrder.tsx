import React from 'react';
import { ShoppingCart, Save, Printer, Plus, Trash2, Calendar, User, Truck } from 'lucide-react';

export const AppSalesOrder = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ShoppingCart className="text-blue-600" /> طلبية مبيعات جديدة
                </h1>
                <div className="flex gap-2">
                    <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                        <Save size={18} /> حفظ الطلبية
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">العميل</label>
                        <div className="relative">
                            <input type="text" className="w-full border rounded-lg p-3 pr-10 bg-gray-50 font-bold" placeholder="ابحث عن عميل..." />
                            <User className="absolute left-3 top-3 text-gray-400" size={20} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ التسليم المتوقع</label>
                        <div className="relative">
                            <input type="date" className="w-full border rounded-lg p-3 bg-gray-50" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">طريقة الشحن</label>
                        <div className="relative">
                            <select className="w-full border rounded-lg p-3 bg-gray-50 font-bold">
                                <option>استلام من المعرض</option>
                                <option>توصيل (شركة شحن)</option>
                                <option>سيارات الشركة</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                <div className="p-12 text-center text-gray-400 font-bold">
                    شبكة الأصناف (مطابقة لشاشة عرض الأسعار)
                </div>
                {/* Reusing Grid Structure Conceptually */}
            </div>
        </div>
    );
};
