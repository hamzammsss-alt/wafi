import React, { useState } from 'react';
import { Calendar, Lock, AlertTriangle, CheckCircle, ArrowRightLeft } from 'lucide-react';

export const CloseYear = () => {
    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [completed, setCompleted] = useState(false);

    const handleCloseYear = async () => {
        setProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setProcessing(false);
            setCompleted(true);
            setStep(3);
        }, 3000);
    };

    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen font-cairo flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-red-600 p-6 text-white flex items-center justify-between">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Lock size={24} /> إغلاق السنة المالية
                    </h1>
                    <span className="bg-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-400">
                        للعام الحالي 2026
                    </span>
                </div>

                {/* Content */}
                <div className="p-8">
                    {!completed ? (
                        <>
                            <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 mb-6">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    </div>
                                    <div className="mr-3">
                                        <h3 className="text-sm font-bold text-yellow-800">تحذير هام</h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <p>إغلاق السنة المالية سيؤدي إلى:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                <li>تدوير الأرصدة الختامية إلى السنة الجديدة.</li>
                                                <li>إغلاق حسابات المصاريف والإيرادات.</li>
                                                <li>منع التعديل على أي سندات تاريخها ضمن السنة المغلقة.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">متطلبات الإغلاق:</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-2 text-green-600 text-sm">
                                        <CheckCircle size={16} /> ترحيل جميع السندات اليومية
                                    </li>
                                    <li className="flex items-center gap-2 text-green-600 text-sm">
                                        <CheckCircle size={16} /> مطابقة الأرصدة البنكية
                                    </li>
                                    <li className="flex items-center gap-2 text-green-600 text-sm">
                                        <CheckCircle size={16} /> احتساب إهلاك الأصول
                                    </li>
                                    <li className="flex items-center gap-2 text-gray-400 text-sm">
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div> إجراء نسخ احتياطي (موصى به)
                                    </li>
                                </ul>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t">
                                <button className="px-4 py-2 border border-slate-300 rounded text-slate-600 bg-white hover:bg-slate-50 transition-colors">
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleCloseYear}
                                    disabled={processing}
                                    className="px-6 py-2 bg-red-600 text-white rounded font-bold shadow hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <ArrowRightLeft className="animate-spin" size={18} />
                                            جاري المعالجة...
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={18} /> تأكيد وإغلاق السنة
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">تم الإغلاق بنجاح</h2>
                            <p className="text-slate-500 mb-6">تم تدوير جميع الأرصدة بنجاح للسنة المالية الجديدة 2027</p>
                            <button className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900 transition-colors">
                                العودة للقائمة الرئيسية
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
