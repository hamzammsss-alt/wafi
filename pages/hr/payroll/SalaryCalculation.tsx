import React, { useState } from 'react';
import { Play, FileCheck, CheckCircle, BarChart, Settings, Printer, AlertOctagon } from 'lucide-react';

const SalaryCalculation = () => {
    const [step, setStep] = useState(1);
    const [period, setPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [preview, setPreview] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalTransfers: 0, totalDeductions: 0, count: 0 });

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.hr.generatePayroll(period.month, period.year);
            setPreview(data);

            // Calc Stats
            let total = 0;
            let ded = 0;
            data.forEach((s: any) => {
                total += s.net_salary || 0;
                ded += (s.absent_days_deduction || 0) + (s.advance_deduction || 0) + (s.penalty_deduction || 0);
            });
            setStats({ totalTransfers: total, totalDeductions: ded, count: data.length });

            setStep(2);
        } catch (error) {
            alert('Error Calculating: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async () => {
        if (!confirm('هل أنت متأكد من اعتماد المسير؟ لا يمكن التراجع عن هذه العملية.')) return;
        setLoading(true);
        try {
            await window.electronAPI.hr.postPayroll(period.month, period.year, preview);
            setStep(3);
        } catch (error) {
            alert('Error Posting: ' + error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen rtl font-sans" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BarChart className="text-blue-600" /> مسير الرواتب
            </h1>

            {/* Stepper */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center gap-4">
                    <Step number={1} label="اختيار الفترة" active={step === 1} completed={step > 1} />
                    <div className={`w-12 h-1 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <Step number={2} label="مراجعة الرواتب" active={step === 2} completed={step > 2} />
                    <div className={`w-12 h-1 ${step > 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <Step number={3} label="الاعتماد والترحيل" active={step === 3} completed={step > 3} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-5xl mx-auto">
                {step === 1 && (
                    <div className="max-w-md mx-auto py-10">
                        <h3 className="text-lg font-bold text-center mb-6 text-gray-700">احتساب رواتب شهر جديد</h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">الشهر</label>
                                <select className="w-full border p-2 rounded-lg" value={period.month} onChange={e => setPeriod({ ...period, month: +e.target.value })}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ar-EG', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">السنة</label>
                                <input type="number" className="w-full border p-2 rounded-lg" value={period.year} onChange={e => setPeriod({ ...period, year: +e.target.value })} />
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 text-sm text-blue-800">
                            <h4 className="font-bold flex items-center gap-2 mb-2"><Settings className="w-4 h-4" /> معايير الاحتساب:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                <li>سيتم اعتماد سجلات الحضور والانصراف للشهر المختار.</li>
                                <li>سيتم خصم الغيابات والتأخيرات تلقائياً.</li>
                                <li>سيتم إضافة ساعات العمل الإضافي المعتمدة.</li>
                                <li>سيتم خصم أقساط السلف المستحقة.</li>
                            </ul>
                        </div>

                        <button onClick={handleCalculate} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex justify-center items-center gap-2 transition-all">
                            {loading ? 'جاري الاحتساب...' : <><Play className="w-5 h-5" /> بدء الاحتساب</>}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">مسودة الرواتب - {period.month}/{period.year}</h3>
                                <p className="text-gray-500 text-sm">يرجى مراجعة البيانات قبل الاعتماد النهائي</p>
                            </div>
                            <div className="flex gap-4 text-left">
                                <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                                    <div className="text-xs text-green-600">صافي الرواتب</div>
                                    <div className="font-bold text-green-800 font-mono text-lg">{stats.totalTransfers.toFixed(2)}</div>
                                </div>
                                <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                                    <div className="text-xs text-red-600">إجمالي الخصومات</div>
                                    <div className="font-bold text-red-800 font-mono text-lg">{stats.totalDeductions.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto border rounded-xl mb-6 max-h-[500px]">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-100 font-bold text-gray-600 sticky top-0">
                                    <tr>
                                        <th className="p-3">الموظف</th>
                                        <th className="p-3 text-xs">النظام</th>
                                        <th className="p-3">الراتب الأساسي</th>
                                        <th className="p-3">بدلات</th>
                                        <th className="p-3">إضافي</th>
                                        <th className="p-3 text-emerald-600">عمولات</th>
                                        <th className="p-3 text-emerald-600">إنتاج (قطعة)</th>
                                        <th className="p-3 text-red-600">غ</th>
                                        <th className="p-3 text-red-600">سلف</th>
                                        <th className="p-3 text-red-600">جزاءات</th>
                                        <th className="p-3 bg-gray-200">الصافي</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {preview.map((row, i) => (
                                        <tr key={i} className="hover:bg-blue-50/50">
                                            <td className="p-3 font-medium">{row.employee_name}</td>
                                            <td className="p-3 text-xs text-gray-500">{row.salary_type === 'FIXED' ? 'راتب ثابت' : row.salary_type === 'COMMISSION' ? 'عمولة' : row.salary_type === 'PRODUCTION' ? 'قطعة' : 'مختلط'}</td>
                                            <td className="p-3 font-mono">{row.basic_salary.toFixed(2)}</td>
                                            <td className="p-3 font-mono">{row.total_allowances.toFixed(2)}</td>
                                            <td className="p-3 font-mono">{row.overtime_amount.toFixed(2)}</td>
                                            <td className="p-3 font-mono text-emerald-600 font-bold">{row.commission_amount?.toFixed(2) || '0.00'}</td>
                                            <td className="p-3 font-mono text-emerald-600 font-bold">{row.production_amount?.toFixed(2) || '0.00'}</td>
                                            <td className="p-3 font-mono text-red-500">{row.absent_days_deduction.toFixed(2)}</td>
                                            <td className="p-3 font-mono text-red-500">{row.advance_deduction.toFixed(2)}</td>
                                            <td className="p-3 font-mono text-red-500">{row.penalty_deduction.toFixed(2)}</td>
                                            <td className="p-3 font-mono font-bold bg-gray-50">{row.net_salary.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between pt-4 border-t">
                            <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700">تراجع وتعديل</button>
                            <button onClick={handlePost} disabled={loading} className="bg-green-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2">
                                <FileCheck className="w-5 h-5" />
                                {loading ? 'جاري الترحيل...' : 'اعتماد وترحيل المسير'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="text-center py-16 animate-in zoom-in">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">تم اعتماد المسير بنجاح!</h2>
                        <p className="text-gray-500 mb-8">تم ترحيل القيود المالية وإصدار قسائم الرواتب للموظفين.</p>

                        <div className="flex justify-center gap-4">
                            <button onClick={() => window.print()} className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                                <Printer className="w-4 h-4" /> طباعة الكشف
                            </button>
                            <button onClick={() => setStep(1)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                العودة للرئيسية
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Step = ({ number, label, active, completed }: any) => {
    return (
        <div className="flex flex-col items-center gap-2 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${completed ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}`}>
                {completed ? <CheckCircle className="w-6 h-6" /> : number}
            </div>
            <span className={`text-sm font-medium ${active || completed ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
        </div>
    );
};

export default SalaryCalculation;
