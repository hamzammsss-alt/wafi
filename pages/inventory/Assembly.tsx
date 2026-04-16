import React from 'react';
import { Boxes, Hammer, ArrowDown, ArrowUp } from 'lucide-react';

export const Assembly = () => {
    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Boxes className="text-indigo-600" /> تجميع / تفكيك الأصناف
            </h1>

            <div className="card max-w-3xl mx-auto p-8">
                <div className="flex border-b mb-6">
                    <button className="flex-1 pb-4 border-b-2 border-indigo-600 text-indigo-600 font-bold flex justify-center gap-2">
                        <Hammer size={18} /> تجميع (Assembly)
                    </button>
                    <button className="flex-1 pb-4 text-gray-400 hover:text-gray-600 font-bold flex justify-center gap-2">
                        <Boxes size={18} /> تفكيك (Disassembly)
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">الصنف المجمع (المنتج النهائي)</label>
                        <select className="w-full p-3 border rounded-lg bg-gray-50">
                            <option>اختر صنف مجمع...</option>
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">الكمية المراد إنتاجها</label>
                            <input type="number" className="w-full p-3 border rounded-lg font-bold text-lg text-center" placeholder="1" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">المستودع</label>
                            <select className="w-full p-3 border rounded-lg">
                                <option>المستودع الرئيسي</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-bold text-sm text-gray-500 mb-3">المكونات المطلوبة (BOM):</h4>
                        <div className="text-center text-gray-400 py-4">
                            يرجى اختيار صنف لعرض مكوناته
                        </div>
                    </div>

                    <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                        تنفيذ العملية
                    </button>
                </div>
            </div>
        </div>
    );
};
