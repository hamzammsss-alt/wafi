import React from 'react';
import { MapPin, Plus, Save, Trash2, Edit } from 'lucide-react';

export const RoutePlan = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="text-indigo-600" /> مسارات التوزيع
                </h1>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                    <Plus size={18} /> مسار جديد
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 text-gray-700 font-bold">
                        <tr>
                            <th className="p-4">اسم المسار</th>
                            <th className="p-4">المنطقة</th>
                            <th className="p-4">المندوب المسؤول</th>
                            <th className="p-4">عدد العملاء</th>
                            <th className="p-4">أيام الزيارة</th>
                            <th className="p-4">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        <tr className="hover:bg-gray-50">
                            <td className="p-4 font-bold">مسار الشمال 1</td>
                            <td className="p-4">نابلس - رفيديا</td>
                            <td className="p-4">أحمد المصري</td>
                            <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">45 عميل</span></td>
                            <td className="p-4 text-sm text-gray-500">سبت - اثنين - أربعاء</td>
                            <td className="p-4 flex gap-2">
                                <button className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit size={16} /></button>
                                <button className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={16} /></button>
                            </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                            <td className="p-4 font-bold">مسار رام الله المركزي</td>
                            <td className="p-4">رام الله - الإرسال</td>
                            <td className="p-4">خالد العلي</td>
                            <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">60 عميل</span></td>
                            <td className="p-4 text-sm text-gray-500">يومياً</td>
                            <td className="p-4 flex gap-2">
                                <button className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit size={16} /></button>
                                <button className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
