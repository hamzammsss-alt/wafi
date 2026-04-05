import React from 'react';
import { Mail, Inbox, Send, Star, AlertCircle } from 'lucide-react';

export const InternalMail = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col max-h-screen" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Mail className="text-indigo-600" /> البريد الداخلي
            </h1>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50 border-l p-4 flex flex-col gap-2">
                    <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow mb-4">رسالة جديدة</button>
                    <button className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border shadow-sm font-bold text-indigo-600"><Inbox size={18} /> صندوق الوارد <span className="mr-auto bg-red-500 text-white text-xs px-2 rounded-full">3</span></button>
                    <button className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg text-gray-600 font-medium"><Send size={18} /> البريد المرسل</button>
                    <button className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg text-gray-600 font-medium"><Star size={18} /> المميزة</button>
                    <button className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-lg text-gray-600 font-medium"><AlertCircle size={18} /> المسودات</button>
                </div>

                {/* Mail List */}
                <div className="w-96 border-l flex flex-col">
                    <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">الرسائل الواردة</div>
                    <div className="overflow-auto flex-1 divide-y">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`p-4 hover:bg-gray-50 cursor-pointer ${i === 1 ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''}`}>
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-sm text-gray-800">المدير العام</span>
                                    <span className="text-xs text-gray-500">10:30 ص</span>
                                </div>
                                <div className="font-bold text-sm text-indigo-900 mb-1">اجتماع طارئ بخصوص الميزانية</div>
                                <p className="text-xs text-gray-500 truncate">الرجاء الحضور لقاعة الاجتماعات الساعة 12:00 لمناقشة...</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reading Pane */}
                <div className="flex-1 flex flex-col">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">اجتماع طارئ بخصوص الميزانية</h2>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">م ع</div>
                            <div>
                                <div className="font-bold text-sm text-gray-800">المدير العام <span className="text-gray-400 font-normal">&lt;admin@waifi.pro&gt;</span></div>
                                <div className="text-xs text-gray-500">إلى: مدراء الأقسام</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 flex-1 bg-gray-50/50 overflow-auto text-gray-700 leading-relaxed">
                        <p>الزملاء الأعزاء،</p>
                        <br />
                        <p>يرجى العلم بأنه تقرر عقد اجتماع طارئ اليوم في تمام الساعة 12:00 ظهراً في قاعة الاجتماعات الرئيسية لمناقشة التعديلات المقترحة على الميزانية السنوية.</p>
                        <p>يرجى إحطار كافة التقارير المالية المتعلقة بأقسامكم.</p>
                        <br />
                        <p>مع التحية،</p>
                        <p className="font-bold">الإدارة العامة</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
