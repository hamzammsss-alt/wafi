import React, { useState } from 'react';
import { Factory, Save, Plus } from 'lucide-react';

interface BOMItem {
    item_id: number;
    item_name: string;
    quantity: number;
    unit: string;
}

export const BOM: React.FC = () => {
    const [bom, setBom] = useState({
        product_id: null,
        product_name: '',
        output_quantity: 1,
        materials: [] as BOMItem[],
        labor_cost: 0,
        overhead_cost: 0
    });

    return (
        <div className="app-page h-full" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="card p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Factory size={24} className="text-purple-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">معادلة التصنيع (BOM)</h1>
                                <p className="text-sm text-gray-500">تعريف مكونات المنتج النهائي</p>
                            </div>
                        </div>
                        <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
                            <Save size={18} />
                            حفظ المعادلة
                        </button>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">المنتج النهائي</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">اختر منتج...</option>
                                <option value="1">طاولة خشبية</option>
                                <option value="2">كرسي مكتبي</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">كمية الإنتاج</label>
                            <input
                                type="number"
                                value={bom.output_quantity}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="1"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-bold text-gray-700">المواد الخام المطلوبة</label>
                            <button className="text-purple-600 hover:bg-purple-50 px-3 py-1 rounded-lg transition flex items-center gap-2 text-sm">
                                <Plus size={16} />
                                إضافة مادة
                            </button>
                        </div>
                        <table className="w-full border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-bold">المادة</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold">الكمية</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold">الوحدة</th>
                                    <th className="px-4 py-3 text-center text-sm font-bold">حذف</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t">
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                        لا توجد مواد خام مضافة
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">تكلفة العمالة</label>
                            <input
                                type="number"
                                value={bom.labor_cost}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">المصاريف الإضافية</label>
                            <input
                                type="number"
                                value={bom.overhead_cost}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

