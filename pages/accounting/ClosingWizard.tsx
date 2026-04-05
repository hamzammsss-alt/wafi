
import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

export const ClosingWizard = () => {
    const [step, setStep] = useState(1);

    const steps = [
        { id: 1, title: 'التحقق من البيانات', desc: 'فحص توازن القيود وترحيل جميع السندات المعلقة.' },
        { id: 2, title: 'احتساب الأرباح', desc: 'إغلاق حسابات المصاريف والإيرادات في حساب ملخص الدخل.' },
        { id: 3, title: 'نقل الأرصدة', desc: 'تدوير أرصدة الميزانية العمومية للسنة المالية الجديدة.' },
        { id: 4, title: 'إتمام الإغلاق', desc: 'قفل السنة الحالية ومنع التعديل عليها نهائياً.' }
    ];

    return (
        <div className="p-10 bg-[#f0f2f5] min-h-screen flex flex-col items-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">معالج إغلاق السنة المالية</h1>

            {/* Steps Indicator */}
            <div className="flex w-full max-w-3xl mb-10 justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 -z-10 transform -translate-y-1/2"></div>
                {steps.map(s => (
                    <div key={s.id} className={`flex flex-col items-center bg-[#f0f2f5] px-4`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-colors ${step >= s.id ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                            {step > s.id ? <CheckCircle size={20} /> : s.id}
                        </div>
                        <span className={`text-sm font-bold ${step >= s.id ? 'text-gray-800' : 'text-gray-400'}`}>{s.title}</span>
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl text-center min-h-[300px] flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold mb-4">{steps[step - 1].title}</h2>
                    <p className="text-gray-500 mb-6 text-lg">{steps[step - 1].desc}</p>

                    {step === 1 && (
                        <div className="bg-green-50 text-green-700 p-4 rounded border border-green-200">
                            <CheckCircle className="inline ml-2" /> جميع القيود متزنة. النظام جاهز للمتابعة.
                        </div>
                    )}
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className="px-6 py-2 rounded border hover:bg-gray-50 disabled:opacity-50 text-gray-600 flex items-center gap-2"
                    >
                        <ArrowRight size={18} /> السابق
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={() => setStep(s => Math.min(4, s + 1))}
                            className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-bold flex items-center gap-2"
                        >
                            التالي <ArrowLeft size={18} />
                        </button>
                    ) : (
                        <button className="px-6 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-bold flex items-center gap-2">
                            تنفيذ الإغلاق النهائي
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
