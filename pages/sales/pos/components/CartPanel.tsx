import React from 'react';
import { Trash, Minus, Plus, PauseCircle } from 'lucide-react';

export const CartPanel = () => {
    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <div className="font-bold text-gray-800">السلة الحالية (3)</div>
                <button className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded transition flex items-center gap-1">
                    <Trash size={12} /> مسح الكل
                </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-3 border rounded-xl flex gap-3 items-center group hover:border-indigo-200 transaction">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0"></div>
                        <div className="flex-1">
                            <div className="font-bold text-sm text-gray-800">وجبة برغر دبل</div>
                            <div className="text-xs text-gray-500">35.00</div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                                <button className="w-6 h-6 rounded bg-white shadow-sm flex items-center justify-center hover:bg-gray-100"><Plus size={12} /></button>
                                <span className="font-bold text-sm w-4 text-center">2</span>
                                <button className="w-6 h-6 rounded bg-white shadow-sm flex items-center justify-center hover:bg-gray-100"><Minus size={12} /></button>
                            </div>
                            <div className="font-bold text-sm text-indigo-600">70.00</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المجموع الفرعي</span>
                    <span className="font-bold">140.00</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">الضريبة</span>
                    <span className="font-bold">22.40</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                    <span className="text-gray-800">الإجمالي</span>
                    <span className="text-indigo-600">162.40</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button className="bg-orange-100 text-orange-700 py-3 rounded-xl font-bold hover:bg-orange-200 flex items-center justify-center gap-2">
                        <PauseCircle size={18} /> تعليق
                    </button>
                    <button className="bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200">
                        دفع (Space)
                    </button>
                </div>
            </div>
        </div>
    );
};
