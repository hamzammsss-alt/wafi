import React, { useState } from 'react';
import { FileCheck, Activity, ArrowLeftRight } from 'lucide-react';

export const SalaryEntry = () => {
    const [period, setPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.generateSalaryEntry(period);
            setResult(data);
        } catch (error) {
            alert('Error: ' + error);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center text-center" dir="rtl">
            <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-lg w-full">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 mx-auto">
                    <FileCheck size={40} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">توليد قيد الرواتب المحاسبي</h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    من هنا يمكنك توليد القيد المحاسبي الإجمالي للرواتب وترحيله إلى الحسابات العامة.
                    تأكد من اعتماد المسير أولاً.
                </p>

                <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-sm font-bold mb-1 text-right">الشهر</label>
                        <select className="w-full border p-2 rounded-lg" value={period.month} onChange={e => setPeriod({ ...period, month: +e.target.value })}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ar-EG', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-1/3">
                        <label className="block text-sm font-bold mb-1 text-right">السنة</label>
                        <input type="number" className="w-full border p-2 rounded-lg" value={period.year} onChange={e => setPeriod({ ...period, year: +e.target.value })} />
                    </div>
                </div>

                {!result ? (
                    <button onClick={handleGenerate} disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg flex justify-center items-center gap-2">
                        {loading ? 'جاري المعالجة...' : <><Activity size={20} /> توليد القيد</>}
                    </button>
                ) : (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2 justify-center">
                            <FileCheck size={18} /> تم توليد القيد بنجاح!
                        </h3>
                        <div className="text-sm text-green-700 space-y-1 mb-4">
                            <div className="flex justify-between">
                                <span>إجمالي الاستحقاقات:</span>
                                <span className="font-bold">{result.summary.total_earnings?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>صافي الرواتب:</span>
                                <span className="font-bold">{result.summary.total_net?.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                            {result.lines.map((l: any, i: number) => (
                                <div key={i} className="flex justify-between mb-1 border-b pb-1 last:border-0">
                                    <span>{l.description}</span>
                                    <div className="font-mono">
                                        <span className="text-green-600">{l.debit > 0 ? l.debit.toFixed(2) + ' Dr' : ''}</span>
                                        <span className="text-red-600">{l.credit > 0 ? l.credit.toFixed(2) + ' Cr' : ''}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
