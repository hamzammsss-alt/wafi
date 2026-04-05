import React, { useState } from 'react';
import { Play, Calendar, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const Depreciation = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleRun = async () => {
        setIsCalculating(true);
        // Simulate calculation
        setTimeout(() => {
            setResult({
                count: 15,
                total_depreciation: 12500,
                journal_id: 'JV-2024-0058',
                details: [
                    { asset: 'سيارة نقل', amount: 800 },
                    { asset: 'مكتب إدارة', amount: 120 },
                    // ...
                ]
            });
            setIsCalculating(false);
        }, 1500);
    };

    return (
        <div className="p-6 bg-gray-50 h-full flex items-center justify-center font-sans" dir="rtl">
            <div className="max-w-2xl w-full">

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">احتساب الإهلاك الدوري</h1>
                    <p className="text-gray-500">سيقوم النظام بحساب قسط الإهلاك لجميع الأصول الفعالة حتى التاريخ المحدد وإنشاء قيد يومية تلقائي.</p>
                </div>

                {!result ? (
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <div className="flex flex-col gap-6">

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm">
                                <AlertTriangle className="shrink-0" />
                                <p>تنبيه: هذه العملية لا يمكن التراجع عنها بسهولة. تأكد من أن جميع الأصول محدثة قبل المتابعة.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الاحتساب (حتى نهاية)</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 text-center font-bold text-lg"
                                    />
                                    <Calendar className="absolute left-4 top-3.5 text-gray-400" />
                                </div>
                            </div>

                            <button
                                onClick={handleRun}
                                disabled={isCalculating}
                                className="bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isCalculating ? (
                                    <>جاري المعالجة...</>
                                ) : (
                                    <>
                                        <Play size={24} fill="currentColor" /> بدء الاحتساب
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">تمت العملية بنجاح!</h2>
                        <p className="text-gray-500 mb-6">تم إنشاء قيد الإهلاك رقم <span className="font-mono font-bold text-indigo-600">{result.journal_id}</span></p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <span className="block text-sm text-gray-500 mb-1">عدد الأصول</span>
                                <span className="text-xl font-bold text-gray-800">{result.count}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <span className="block text-sm text-gray-500 mb-1">إجمالي الإهلاك</span>
                                <span className="text-xl font-bold text-green-600">{result.total_depreciation.toLocaleString()} ₪</span>
                            </div>
                        </div>

                        <button onClick={() => setResult(null)} className="text-indigo-600 font-bold hover:underline">عودة</button>
                    </div>
                )}

            </div>
        </div>
    );
};
