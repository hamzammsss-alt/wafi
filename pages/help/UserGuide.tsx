import React from 'react';
import { BookOpen, Video, FileText } from 'lucide-react';

export const UserGuide = () => {
    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BookOpen className="text-indigo-600" /> دليل المستخدم
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { title: 'أساسيات النظام', icon: <FileText size={40} />, color: 'text-blue-500' },
                    { title: 'المبيعات والعملاء', icon: <FileText size={40} />, color: 'text-green-500' },
                    { title: 'المحاسبة والتقارير', icon: <Video size={40} />, color: 'text-red-500' },
                    { title: 'إدارة المخزون', icon: <FileText size={40} />, color: 'text-orange-500' },
                    { title: 'الموارد البشرية', icon: <Video size={40} />, color: 'text-purple-500' },
                ].map((item, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer flex flex-col items-center text-center">
                        <div className={`mb-4 ${item.color}`}>{item.icon}</div>
                        <h3 className="font-bold text-gray-800 text-lg">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-2">اضغط لعرض الشروحات والمقالات</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
