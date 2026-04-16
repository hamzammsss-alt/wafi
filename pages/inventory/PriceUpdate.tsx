import React, { useState } from 'react';
import { Tag, Save, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

export const PriceUpdate = () => {
    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Tag className="text-blue-600" /> تعديل أسعار جماعي
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
                        تحديد الأصناف
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">المجموعة</label>
                            <select className="w-full p-2 border rounded-lg">
                                <option>الكل</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">الماركة</label>
                            <select className="w-full p-2 border rounded-lg">
                                <option>الكل</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span>
                        طريقة التعديل
                    </h2>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="method" className="w-4 h-4" defaultChecked />
                                <span>نسبة مئوية %</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="method" className="w-4 h-4" />
                                <span>قيمة ثابتة</span>
                            </label>
                        </div>
                        <div className="flex gap-2 items-center">
                            <select className="p-2 border rounded-lg bg-gray-50">
                                <option value="inc">زيادة (+)</option>
                                <option value="dec">نقصان (-)</option>
                            </select>
                            <input
                                type="number"
                                className="flex-1 p-2 border rounded-lg font-bold text-center"
                                placeholder="القيمة..."
                            />
                        </div>
                        <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 mt-4 flex items-center justify-center gap-2">
                            <Save size={18} /> تنفيذ التعديل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
