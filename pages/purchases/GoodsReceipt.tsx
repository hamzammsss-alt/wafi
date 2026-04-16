import React, { useState } from 'react';
import { PackageCheck, Save, Search } from 'lucide-react';

export const GoodsReceipt: React.FC = () => {
    return (
        <div className="app-page h-full" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <PackageCheck size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">سند استلام بضاعة (GRN)</h1>
                            <p className="text-sm text-gray-500">إثبات وصول البضاعة للمخازن</p>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">رقم السند</label>
                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" placeholder="GRN-2026-001" readOnly />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">التاريخ</label>
                            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">المورد</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">اختر مورد...</option>
                                <option value="1">شركة الاستيراد العالمية</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">أمر الشراء المرجعي</label>
                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="PO-2026-001" />
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center text-sm text-blue-700 mb-6">
                        <p><strong>ملاحظة:</strong> سند الاستلام يزيد المخزون ولا يؤثر على الحسابات المالية حتى وصول الفاتورة</p>
                    </div>

                    <div className="flex justify-end">
                        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <Save size={18} />
                            حفظ السند
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

