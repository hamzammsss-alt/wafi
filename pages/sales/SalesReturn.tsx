import React, { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';

export const SalesReturn: React.FC = () => {
    return (
        <div className="app-page h-full" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <RotateCcw size={24} className="text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">مردودات مبيعات</h1>
                            <p className="text-sm text-gray-500">إرجاع بضاعة من العميل</p>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">رقم المردود</label>
                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" placeholder="SR-2026-001" readOnly />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">التاريخ</label>
                            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">العميل</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">اختر عميل...</option>
                                <option value="1">شركة التقنية المتقدمة</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الفاتورة الأصلية</label>
                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="INV-2026-001" />
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-sm text-red-700 mb-6">
                        <p><strong>تنبيه:</strong> المردود يزيد المخزون ويصدر إشعار دائن للعميل</p>
                    </div>

                    <div className="flex justify-end">
                        <button className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                            <Save size={18} />
                            حفظ المردود
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

