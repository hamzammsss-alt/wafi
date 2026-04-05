import React, { useState } from 'react';
import { Calculator, CheckCircle } from 'lucide-react';

const Payroll = () => {
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [slips, setSlips] = useState<any[]>([]);
    const [processed, setProcessed] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const result = await window.electronAPI.calculatePayroll({ month, year });
            setSlips(result);
            setProcessed(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async () => {
        if (!confirm('هل أنت متأكد من اعتماد المسير وإنشاء القيود المحاسبية؟')) return;

        setLoading(true);
        try {
            await window.electronAPI.savePayrollRun({ month, year, slips });
            setProcessed(true);
            // Show toast
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const totalBasic = slips.reduce((sum, s) => sum + s.basic_salary, 0);
    const totalNet = slips.reduce((sum, s) => sum + s.net_salary, 0);

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">مسير الرواتب</h1>
                    <p className="text-gray-500">احتساب واعتماد رواتب الموظفين الشهرية</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1 bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-fit">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">فترة الراتب</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">الشهر</label>
                            <select
                                value={String(month)}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={String(m)}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600">السنة</label>
                            <select
                                value={String(year)}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            >
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        </div>

                        <button
                            onClick={handleCalculate}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Calculator className="w-4 h-4 ml-2" />
                            احتساب الرواتب
                        </button>
                    </div>
                </div>

                <div className="md:col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <div className="flex flex-row items-center justify-between pb-4 border-b mb-4">
                        <h3 className="text-lg font-bold text-gray-800">كشف الرواتب المقترح</h3>
                        {slips.length > 0 && !processed && (
                            <button
                                onClick={handlePost}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                اعتماد وترحيل (Post)
                            </button>
                        )}
                        {processed && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md flex items-center gap-2 font-medium text-sm">
                                <CheckCircle className="h-4 w-4" />
                                <span>تم اعتماد المسير وترحيل القيود</span>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        {slips.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                                <Calculator className="w-12 h-12 mb-4 opacity-50" />
                                <p>الرجاء اختيار الفترة والضغط على "احتساب" لعرض الكشف</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50 border-y border-gray-100 text-gray-600">
                                        <tr>
                                            <th className="p-3">الموظف</th>
                                            <th className="p-3">الراتب الأساسي</th>
                                            <th className="p-3 text-green-600">إضافي (+)</th>
                                            <th className="p-3 text-red-600">خصومات (-)</th>
                                            <th className="p-3 text-red-600">سلف (-)</th>
                                            <th className="p-3 font-bold">الصافي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {slips.map((slip) => (
                                            <tr key={slip.employee_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="p-3 font-medium text-gray-900">{slip.employee_name}</td>
                                                <td className="p-3">{slip.basic_salary.toLocaleString()}</td>
                                                <td className="p-3 text-green-600">{slip.total_overtime_amount.toLocaleString()}</td>
                                                <td className="p-3 text-red-600">{slip.total_deductions.toLocaleString()}</td>
                                                <td className="p-3 text-red-600">{slip.loan_deduction.toLocaleString()}</td>
                                                <td className="p-3 font-bold text-lg text-gray-900">{slip.net_salary.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                        <span className="text-gray-500">إجمالي الرواتب الأساسية:</span>
                                        <span className="font-medium text-lg">{totalBasic.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                                        <span className="text-gray-500">إجمالي الصافي للدفع:</span>
                                        <span className="font-bold text-xl text-emerald-600">{totalNet.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payroll;
