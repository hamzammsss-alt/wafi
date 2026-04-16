import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export const CalendarApp = () => {
    return (
        <div className="app-page h-full flex flex-col" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CalendarIcon className="text-indigo-600" /> الرزنامة
                </h1>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm">
                    <Plus size={18} /> حدث جديد
                </button>
            </div>

            <div className="flex-1 card flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800">فبراير 2024</h2>
                        <div className="flex gap-1">
                            <button className="p-1 hover:bg-gray-200 rounded"><ChevronRight /></button>
                            <button className="p-1 hover:bg-gray-200 rounded"><ChevronLeft /></button>
                        </div>
                    </div>
                    <div className="flex gap-2 text-sm font-bold text-gray-500">
                        <button className="px-3 py-1 bg-white border rounded shadow-sm text-indigo-600">شهر</button>
                        <button className="px-3 py-1 hover:bg-white hover:shadow-sm rounded">أسبوع</button>
                        <button className="px-3 py-1 hover:bg-white hover:shadow-sm rounded">يوم</button>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-7 grid-rows-5 text-right divide-x divide-x-reverse divide-y">
                    {/* Days Header */}
                    {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => (
                        <div key={d} className="p-2 text-sm font-bold text-gray-500 bg-gray-50 border-b">{d}</div>
                    ))}

                    {/* Calendar Grid Simulator */}
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="p-2 min-h-[100px] hover:bg-gray-50 transition relative group">
                            <span className={`text-sm ${i === 15 ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-400'}`}>{i + 1 > 31 ? i - 30 : i + 1}</span>
                            {i === 10 && (
                                <div className="mt-2 text-xs bg-blue-100 text-blue-700 p-1 rounded border-r-4 border-blue-500 font-bold truncate">
                                    اجتماع مجلس الإدارة
                                </div>
                            )}
                            {i === 15 && (
                                <div className="mt-2 text-xs bg-green-100 text-green-700 p-1 rounded border-r-4 border-green-500 font-bold truncate">
                                    صرف الرواتب
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

