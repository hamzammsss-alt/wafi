import React, { useState } from 'react';
import { TrendingUp, Calendar, Filter } from 'lucide-react';

export const SalesReport: React.FC = () => {
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    return (
        <div className="h-full bg-gray-50 p-6" dir="rtl">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <TrendingUp size={24} className="text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">تقرير المبيعات</h1>
                            <p className="text-sm text-gray-500">تحليل شامل للمبيعات</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} />
                                من تاريخ
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} />
                                إلى تاريخ
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">العميل</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">الكل</option>
                                <option value="1">شركة التقنية المتقدمة</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                                <Filter size={18} />
                                عرض التقرير
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-2">إجمالي المبيعات</p>
                        <p className="text-3xl font-bold text-green-600">15,450 ₪</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-2">عدد الفواتير</p>
                        <p className="text-3xl font-bold text-blue-600">24</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-2">متوسط الفاتورة</p>
                        <p className="text-3xl font-bold text-purple-600">643 ₪</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <p className="text-sm text-gray-500 mb-2">صافي الربح</p>
                        <p className="text-3xl font-bold text-orange-600">4,320 ₪</p>
                    </div>
                </div>

                {/* Details Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">رقم الفاتورة</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">التاريخ</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">العميل</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المبلغ</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="px-6 py-4 text-sm font-mono">INV-2026-001</td>
                                <td className="px-6 py-4 text-sm">2026-01-05</td>
                                <td className="px-6 py-4 text-sm">شركة التقنية المتقدمة</td>
                                <td className="px-6 py-4 text-sm font-bold text-green-600">2,500 ₪</td>
                                <td className="px-6 py-4">
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        مدفوعة
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
