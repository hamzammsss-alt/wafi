import React, { useState } from 'react';
import { PackageMinus, ArrowLeft } from 'lucide-react';

export const MaterialIssue = () => {
    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><PackageMinus className="text-red-500" /> صرف مواد خام للإنتاج</h1>
                        <p className="text-sm text-gray-500">أمر صرف مخزني مرتبط بأمر تصنيع</p>
                    </div>
                    <div className="text-right">
                        <label className="text-xs text-gray-500 block">رقم أمر التصنيع</label>
                        <select className="border rounded p-1 font-bold bg-gray-50 text-indigo-700">
                            <option>MO-2024-001 - طاولة مكتبية</option>
                        </select>
                    </div>
                </div>

                <div className="p-6">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-bold">
                            <tr>
                                <th className="p-3">المادة</th>
                                <th className="p-3">الرصيد المتوفر</th>
                                <th className="p-3">الكمية المطلوبة (BOM)</th>
                                <th className="p-3">الكمية المصروفة</th>
                                <th className="p-3">المستودع</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr>
                                <td className="p-3">ألوح خشب زان 2سم</td>
                                <td className="p-3 text-green-600 font-bold">500 م2</td>
                                <td className="p-3 font-bold text-gray-800">125 م2</td>
                                <td className="p-3">
                                    <input type="number" className="border rounded w-20 p-1 text-center font-bold" defaultValue={125} />
                                </td>
                                <td className="p-3">
                                    <select className="border rounded p-1 text-xs"><option>مستودع الخامات</option></select>
                                </td>
                            </tr>
                            <tr>
                                <td className="p-3">لاصق خشب ممتاز</td>
                                <td className="p-3 text-green-600 font-bold">50 عبوة</td>
                                <td className="p-3 font-bold text-gray-800">10 عبوات</td>
                                <td className="p-3">
                                    <input type="number" className="border rounded w-20 p-1 text-center font-bold" defaultValue={10} />
                                </td>
                                <td className="p-3">
                                    <select className="border rounded p-1 text-xs"><option>مستودع الخامات</option></select>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-sm">تأكيد الصرف</button>
                </div>
            </div>
        </div>
    );
};
