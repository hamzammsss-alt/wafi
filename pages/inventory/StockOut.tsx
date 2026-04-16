import React, { useState } from 'react';
import { PackageMinus, Save, Search } from 'lucide-react';

export const StockOut: React.FC = () => {
    return (
        <div className="app-page h-full" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="card p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <PackageMinus size={24} className="text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">سند إخراج مخزون</h1>
                            <p className="text-sm text-gray-500">إخراج بضاعة من المخزون (تالف، عينات، مسحوبات)</p>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">رقم السند</label>
                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" placeholder="تلقائي" readOnly />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">التاريخ</label>
                            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">السبب</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="damaged">تالف</option>
                                <option value="sample">عينة</option>
                                <option value="personal">مسحوبات شخصية</option>
                                <option value="other">أخرى</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                            <Save size={18} />
                            حفظ السند
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

