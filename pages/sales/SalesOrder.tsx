import React, { useState } from 'react';
import { FileText, Calendar, DollarSign } from 'lucide-react';

export const SalesOrder: React.FC = () => {
    return (
        <div className="h-full bg-gray-50 p-6" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <FileText size={24} className="text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">طلبية مبيعات</h1>
                            <p className="text-sm text-gray-500">حجز كميات للعميل</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <FileText size={16} />
                                رقم الطلبية
                            </label>
                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" placeholder="SO-2026-001" readOnly />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} />
                                التاريخ
                            </label>
                            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">العميل</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">اختر عميل...</option>
                                <option value="1">شركة التقنية المتقدمة</option>
                                <option value="2">مؤسسة النور التجارية</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ التسليم المتوقع</label>
                            <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-sm text-green-700">
                        <p><strong>ملاحظة:</strong> الطلبية تحجز الكميات في المخزون ولا تؤثر على الحسابات المالية</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
