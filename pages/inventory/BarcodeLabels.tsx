import React, { useState } from 'react';
import { Printer, Search, Barcode, Check } from 'lucide-react';

export const BarcodeLabels = () => {
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Barcode className="text-purple-600" /> طباعة ملصقات الباركود
            </h1>

            <div className="card p-6 flex flex-col gap-6">
                {/* Search & Selection */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <input
                            className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                            placeholder="بحث عن صنف لإضافته..."
                        />
                        <Search className="absolute top-3.5 right-3 text-gray-400" size={18} />
                    </div>
                </div>

                {/* Print Queue */}
                <div className="border rounded-lg overflow-hidden">
                    <table className="dense-table w-full text-right">
                        <thead className="bg-gray-50 font-bold text-gray-700 border-b">
                            <tr>
                                <th className="p-3">رمز الصنف</th>
                                <th className="p-3">اسم الصنف</th>
                                <th className="p-3">سعر البيع</th>
                                <th className="p-3 w-32">عدد الملصقات</th>
                                <th className="p-3 w-20">حذف</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="text-gray-500 text-center py-8">
                                <td colSpan={5} className="p-8">لا يوجد أصناف في قائمة الطباعة</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 flex items-center gap-2">
                        <Printer size={18} /> طباعة الملصقات
                    </button>
                </div>
            </div>
        </div>
    );
};

