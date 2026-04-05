import React, { useState } from 'react';
import { JournalVoucher } from './JournalVoucher';
import { Copy, CalendarClock, Play } from 'lucide-react';

export const RecurringVoucher = () => {
    const [templates, setTemplates] = useState<any[]>([
        { id: 1, name: 'الإيجار الشهري', next_run: '2024-02-01', frequency: 'Monthly', amount: 5000 },
        { id: 2, name: 'رواتب الموظفين', next_run: '2024-01-31', frequency: 'Monthly', amount: 45000 },
    ]);
    const [isCreating, setIsCreating] = useState(false);

    if (isCreating) {
        return (
            <div className="h-full flex flex-col">
                <div className="bg-indigo-50 p-2 flex justify-between items-center border-b border-indigo-100">
                    <span className="font-bold text-indigo-700 text-sm flex items-center gap-2">
                        <Copy size={16} /> تعريف قالب قيد متكرر جديد
                    </span>
                    <button onClick={() => setIsCreating(false)} className="text-xs underline text-indigo-600">عودة للقائمة</button>
                </div>
                {/* We reuse the JournalVoucher component but contextually we'd save as template */}
                <div className="flex-1 relative">
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                            <p className="mb-4 font-bold text-gray-700">هذه الميزة (حفظ كقالب) سيتم تفعيلها قريباً داخل شاشة سند القيد</p>
                            <button onClick={() => setIsCreating(false)} className="bg-gray-800 text-white px-4 py-2 rounded">موافق</button>
                        </div>
                    </div>
                    <JournalVoucher />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarClock className="text-indigo-600" /> القيود المتكررة
                    </h1>
                    <p className="text-sm text-gray-500">إدارة القوالب الآلية للقيود الدورية</p>
                </div>
                <button onClick={() => setIsCreating(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                    <Copy size={18} /> إنشاء قالب جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(temp => (
                    <div key={temp.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                                <Copy size={20} />
                            </div>
                            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">{temp.frequency}</span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 mb-1">{temp.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">تشغيل القيد القادم: <span className="font-mono text-gray-700">{temp.next_run}</span></p>

                        <div className="border-t pt-3 flex items-center justify-between">
                            <div className="font-mono font-bold text-gray-700">{temp.amount.toLocaleString()} ₪</div>
                            <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg flex items-center gap-1 text-sm font-bold" title="تفيذ القيد الآن">
                                <Play size={16} /> تنفيذ
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
