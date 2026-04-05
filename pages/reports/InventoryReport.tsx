import React, { useState } from 'react';
import { Package, Calendar, Filter, Download } from 'lucide-react';

export const InventoryReport: React.FC = () => {
    return (
        <div className="h-full bg-gray-50 p-6" dir="rtl">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Package size={24} className="text-purple-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">تقرير جرد المخزون</h1>
                                <p className="text-sm text-gray-500">حالة المخزون الحالية</p>
                            </div>
                        </div>
                        <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
                            <Download size={18} />
                            تصدير Excel
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-2">إجمالي الأصناف</p>
                        <p className="text-3xl font-bold text-purple-600">156</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-2">قيمة المخزون</p>
                        <p className="text-3xl font-bold text-green-600">125,450 ₪</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-2">أصناف قليلة</p>
                        <p className="text-3xl font-bold text-orange-600">8</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-2">أصناف راكدة</p>
                        <p className="text-3xl font-bold text-red-600">12</p>
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الرمز</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">اسم الصنف</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الكمية</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الحد الأدنى</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">القيمة</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="px-6 py-4 text-sm font-mono">ITM001</td>
                                <td className="px-6 py-4 text-sm">لابتوب HP</td>
                                <td className="px-6 py-4 text-sm font-bold">10</td>
                                <td className="px-6 py-4 text-sm">5</td>
                                <td className="px-6 py-4 text-sm font-bold text-green-600">25,000 ₪</td>
                                <td className="px-6 py-4">
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        متوفر
                                    </span>
                                </td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="px-6 py-4 text-sm font-mono">ITM002</td>
                                <td className="px-6 py-4 text-sm">ماوس لاسلكي</td>
                                <td className="px-6 py-4 text-sm font-bold text-orange-600">8</td>
                                <td className="px-6 py-4 text-sm">10</td>
                                <td className="px-6 py-4 text-sm font-bold text-green-600">600 ₪</td>
                                <td className="px-6 py-4">
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                        قليل
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
