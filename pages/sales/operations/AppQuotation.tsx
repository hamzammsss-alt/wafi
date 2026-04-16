import React from 'react';
import { FileText, Save, Printer, Plus, Trash2, Calendar, User } from 'lucide-react';

export const AppQuotation = () => {
    return (
        <div className="app-page h-full flex flex-col gap-4" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-indigo-600" /> عرض سعر جديد
                </h1>
                <div className="flex gap-2">
                    <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                        <Save size={18} /> حفظ العرض
                    </button>
                    <button className="bg-white text-gray-700 border px-4 py-2 rounded-lg font-bold hover:bg-gray-50 shadow-sm flex items-center gap-2">
                        <Printer size={18} /> طباعة
                    </button>
                </div>
            </div>

            {/* Master Data */}
            <div className="card p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">العميل</label>
                        <div className="relative">
                            <input type="text" className="w-full border rounded-lg p-3 pr-10 bg-gray-50 font-bold" placeholder="ابحث عن عميل..." />
                            <User className="absolute left-3 top-3 text-gray-400" size={20} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ العرض</label>
                        <div className="relative">
                            <input type="date" className="w-full border rounded-lg p-3 bg-gray-50" defaultValue="2024-02-10" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">صالح لغاية</label>
                        <div className="relative">
                            <input type="date" className="w-full border rounded-lg p-3 bg-gray-50" defaultValue="2024-02-17" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Grid */}
            <div className="card flex-1 flex flex-col overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="dense-table w-full text-right">
                        <thead className="bg-gray-50 font-bold text-gray-700 border-b">
                            <tr>
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4">الصنف</th>
                                <th className="p-4 w-32">الكمية</th>
                                <th className="p-4 w-32">الوحدة</th>
                                <th className="p-4 w-32">السعر</th>
                                <th className="p-4 w-32">الخصم %</th>
                                <th className="p-4 w-40">الإجمالي</th>
                                <th className="p-4 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr className="hover:bg-gray-50/50">
                                <td className="p-4 text-center font-mono text-gray-500">1</td>
                                <td className="p-4">
                                    <input type="text" className="w-full border-none bg-transparent focus:ring-0 font-bold text-gray-700 placeholder-gray-300" placeholder="اضغط لاختيار صنف..." autoFocus />
                                </td>
                                <td className="p-4"><input type="number" className="w-full border rounded p-1 text-center bg-gray-50" defaultValue={1} /></td>
                                <td className="p-4 text-gray-500 text-sm">قطعة</td>
                                <td className="p-4"><input type="number" className="w-full border rounded p-1 text-center bg-gray-50" defaultValue={0} /></td>
                                <td className="p-4"><input type="number" className="w-full border rounded p-1 text-center bg-gray-50" defaultValue={0} /></td>
                                <td className="p-4 font-bold text-gray-800">0.00</td>
                                <td className="p-4 text-center"><button className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button></td>
                            </tr>
                        </tbody>
                    </table>
                    <button className="w-full py-3 text-indigo-600 font-bold hover:bg-gray-50 border-t flex items-center justify-center gap-2">
                        <Plus size={18} /> إضافة سطر جديد
                    </button>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 border-t p-6">
                    <div className="flex justify-end gap-12">
                        <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">المجموع الفرعي</div>
                            <div className="font-bold text-lg">0.00</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">الخصم</div>
                            <div className="font-bold text-lg text-red-500">0.00</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">الضريبة (16%)</div>
                            <div className="font-bold text-lg text-gray-700">0.00</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">الإجمالي النهائي</div>
                            <div className="font-bold text-2xl text-indigo-600">0.00</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

