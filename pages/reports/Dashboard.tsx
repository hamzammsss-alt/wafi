import React from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign, Activity } from 'lucide-react';

export const Dashboard = () => {
    return (
        <div className="p-6 bg-gray-50 h-full overflow-auto" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-green-500 text-sm font-bold flex items-center">+12% <Activity size={12} className="mr-1" /></span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 mb-1">250,400</div>
                    <div className="text-sm text-gray-400">إجمالي المبيعات (شهري)</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                            <Users size={24} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 mb-1">1,205</div>
                    <div className="text-sm text-gray-400">العملاء النشطين</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                            <ShoppingBag size={24} />
                        </div>
                        <span className="text-red-500 text-sm font-bold flex items-center">-5%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 mb-1">45</div>
                    <div className="text-sm text-gray-400">طلبيات جديدة</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 mb-1">85,000</div>
                    <div className="text-sm text-gray-400">التحصيلات النقدية</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
                    <h3 className="font-bold text-gray-700 mb-4">الأداء المالي (إيرادات vs مصاريف)</h3>
                    <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
                        مخطط بياني (Chart Area)
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
                    <h3 className="font-bold text-gray-700 mb-4">توزيع المبيعات</h3>
                    <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
                        مخطط دائري (Donut Chart)
                    </div>
                </div>
            </div>
        </div>
    );
};
