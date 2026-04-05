import React from 'react';
import { Calculator, DollarSign } from 'lucide-react';

export const CostCalculation = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center" dir="rtl">
            <div className="max-w-2xl w-full text-center">
                <Calculator size={64} className="mx-auto text-indigo-200 mb-6" />
                <h1 className="text-3xl font-bold text-gray-800 mb-2">احتساب تكلفة المنتج النهائي</h1>
                <p className="text-gray-500 mb-8">يقوم النظام بتجميع تكلفة المواد الخام المصروفة + التكاليف الإضافية (أجور، طاقة، إهلاك) وتقسيمها على الكمية المنتجة لتحديث تكلفة الصنف.</p>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 text-right">
                    <h3 className="font-bold border-b pb-2 mb-4 text-gray-700">معاينة الاحتساب (لأمر تصنيع MO-2024-001)</h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">تكلفة المواد الخام (المباشرة)</span>
                            <span className="font-bold text-gray-800">12,500.00</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">أجور عمال (ساعات فعلية)</span>
                            <span className="font-bold text-gray-800">3,200.00</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">تكاليف صناعية غير مباشرة (Overheads)</span>
                            <span className="font-bold text-gray-800">1,500.00</span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold text-lg text-indigo-700 bg-indigo-50 p-2 rounded">
                            <span>إجمالي التكلفة</span>
                            <span>17,200.00</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2 px-2">
                            <span className="text-gray-500">الكمية المنتجة: 50 | تكلفة الوحدة الواحدة</span>
                            <span className="font-mono font-bold text-xl text-green-600">344.00</span>
                        </div>
                    </div>

                    <button className="w-full mt-6 bg-indigo-800 text-white py-3 rounded-lg font-bold hover:bg-indigo-900 shadow-lg">اعتماد وتحديث التكلفة</button>
                </div>
            </div>
        </div>
    );
};
