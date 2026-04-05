import React from 'react';
import { UserCheck, MapPin } from 'lucide-react';

export const SalesReps = () => {
    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <UserCheck className="text-blue-600" /> إدارة المناديب والمسارات
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xl text-gray-600">
                                {i === 1 ? 'م ع' : i === 2 ? 'س ج' : 'خ م'}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{i === 1 ? 'محمد علي' : i === 2 ? 'سعيد جمال' : 'خالد محمود'}</h3>
                                <div className="text-sm text-gray-500">مشرف مبيعات - منطقة الشمال</div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <MapPin size={16} className="text-red-500" /> مسار اليوم:
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="bg-white px-2 py-1 rounded border text-xs">نابلس</span>
                                <span className="bg-white px-2 py-1 rounded border text-xs">حوارة</span>
                                <span className="bg-white px-2 py-1 rounded border text-xs">جماعين</span>
                            </div>
                        </div>

                        <div className="flex justify-between text-sm font-bold border-t pt-3">
                            <span className="text-gray-500">المبيعات (شهر):</span>
                            <span className="text-green-600">₪120,500</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
