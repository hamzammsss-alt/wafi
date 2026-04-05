import React, { useState } from 'react';
import { PackagePlus, Save, Search } from 'lucide-react';

export const StockIn: React.FC = () => {
    const [formData, setFormData] = useState({
        ref_no: '',
        date: new Date().toISOString().split('T')[0],
        warehouse_id: 1,
        notes: '',
        items: [{ item_id: null, quantity: 0, cost: 0 }]
    });

    return (
        <div className="h-full bg-gray-50 p-6" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <PackagePlus size={24} className="text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">سند إدخال مخزون</h1>
                            <p className="text-sm text-gray-500">إضافة بضاعة للمخزون</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">رقم السند</label>
                            <input
                                type="text"
                                value={formData.ref_no}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                placeholder="تلقائي"
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">التاريخ</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">المستودع</label>
                            <select
                                value={formData.warehouse_id}
                                onChange={(e) => setFormData({ ...formData, warehouse_id: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="1">المستودع الرئيسي</option>
                                <option value="2">فرع الخليل</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">الأصناف</label>
                        <table className="w-full border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-bold">الصنف</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold">الكمية</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold">التكلفة</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t">
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="ابحث عن صنف..."
                                                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-bold">0.00</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            rows={3}
                            placeholder="ملاحظات إضافية..."
                        />
                    </div>

                    <div className="flex justify-end">
                        <button className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                            <Save size={18} />
                            حفظ السند
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
