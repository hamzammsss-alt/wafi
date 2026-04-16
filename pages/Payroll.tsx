import React, { useState } from 'react';
import { DollarSign, Play, CheckCircle, Printer } from 'lucide-react';

export const Payroll = () => {
    const [step, setStep] = useState(1); // 1: Select Month, 2: Review, 3: Success
    const [date, setDate] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [slips, setSlips] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const calculate = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const result = await window.electronAPI.calculatePayroll(date);
                setSlips(result || []);
                setStep(2);
            } catch (err: any) { alert(err.message); }
            finally { setLoading(false); }
        }
    };

    const confirmPayroll = async () => {
        try {
            setLoading(true);
            // @ts-ignore
            await window.electronAPI.savePayrollRun({ ...date, slips });
            setStep(3);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-50 font-sans p-6" dir="rtl">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                {/* Header */}
                <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700 rounded-lg"><DollarSign /></div>
                        <div>
                            <h1 className="text-xl font-bold">معالج الرواتب والأجور</h1>
                            <p className="text-sm opacity-60">احتساب الرواتب الشهرية وإصدار القسائم</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-mono bg-slate-700 px-3 py-1 rounded">
                        <span>{date.month}/{date.year}</span>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-8 flex flex-col">

                    {/* Step 1: Selection */}
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center flex-1 space-y-8">
                            <h2 className="text-2xl font-bold text-slate-700">اختر الفترة المالية</h2>
                            <div className="flex gap-4">
                                <input
                                    type="number" min="1" max="12"
                                    value={date.month} onChange={e => setDate({ ...date, month: Number(e.target.value) })}
                                    className="border-2 border-slate-200 rounded-xl p-4 text-center text-3xl font-bold w-32 focus:border-blue-500"
                                />
                                <input
                                    type="number" min="2024" max="2030"
                                    value={date.year} onChange={e => setDate({ ...date, year: Number(e.target.value) })}
                                    className="border-2 border-slate-200 rounded-xl p-4 text-center text-3xl font-bold w-48 focus:border-blue-500"
                                />
                            </div>
                            <button
                                onClick={calculate} disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center gap-3 transition transform active:scale-95"
                            >
                                <Play fill="currentColor" />   بدء الاحتساب
                            </button>
                        </div>
                    )}

                    {/* Step 2: Review */}
                    {step === 2 && (
                        <div className="flex flex-col flex-1">
                            <h2 className="text-lg font-bold mb-4 flex justify-between">
                                <span>مراجعة الرواتب المحتسبة</span>
                                <span className="text-blue-600">{slips.length} موظف</span>
                            </h2>
                            <div className="flex-1 overflow-auto border rounded-xl mb-6">
                                <table className="dense-table w-full">
                                    <thead className="bg-slate-100 font-bold sticky top-0">
                                        <tr>
                                            <th className="p-3 text-right">الموظف</th>
                                            <th className="p-3 text-center">الراتب الأساسي</th>
                                            <th className="p-3 text-center text-green-600">بدلات (+)</th>
                                            <th className="p-3 text-center text-red-600">خصومات (-)</th>
                                            <th className="p-3 text-center text-blue-800 bg-blue-50">الصافي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {slips.map(slip => (
                                            <tr key={slip.employee_id} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold">{slip.employee_name}</td>
                                                <td className="p-3 text-center font-mono">{slip.basic_salary.toLocaleString()}</td>
                                                <td className="p-3 text-center font-mono text-green-600">{(slip.housing + slip.transport + slip.overtime).toLocaleString()}</td>
                                                <td className="p-3 text-center font-mono text-red-600">{slip.deductions.toLocaleString()}</td>
                                                <td className="p-3 text-center font-bold font-mono text-blue-800 bg-blue-50 text-lg">{slip.net_salary.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                                <div className="text-lg font-bold text-slate-700">إجمالي الرواتب: <span className="text-blue-600">{slips.reduce((acc, s) => acc + s.net_salary, 0).toLocaleString()} ILS</span></div>
                                <div className="flex gap-3">
                                    <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 hover:bg-slate-200 rounded-lg font-bold">إلغاء</button>
                                    <button onClick={confirmPayroll} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-green-200">
                                        اعتماد وترحيل القيد
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center flex-1 space-y-6">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center animate-bounce">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800">تم ترحيل الرواتب بنجاح!</h2>
                            <p className="text-slate-500">تم إنشاء قيد الاستحقاق وإصدار قسائم الرواتب للموظفين.</p>
                            <div className="flex gap-4 mt-8">
                                <button onClick={() => window.print()} className="flex items-center gap-2 border border-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-50">
                                    <Printer size={18} /> طباعة الكشف
                                </button>
                                <button onClick={() => { setStep(1); setSlips([]); }} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900">
                                    العودة للرئيسية
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
