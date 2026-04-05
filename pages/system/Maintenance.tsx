import React, { useState } from 'react';
import { Database, ShieldCheck, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

export const SystemMaintenance = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleIntegrityCheck = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await window.electronAPI.system.checkIntegrity();
            setResult(res);
        } catch (err: any) {
            setResult({ success: false, message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 bg-[#f8f9fa] min-h-screen font-cairo">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Database className="text-blue-600" /> صيانة النظام
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-50 rounded-full">
                            <ShieldCheck className="text-blue-600" size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">فحص سلامة البيانات</h3>
                            <p className="text-sm text-slate-500">التحقق من سلامة قاعدة البيانات وتحسين الأداء (VACUUM)</p>
                        </div>
                    </div>

                    <div className="my-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
                        <ul className="list-disc list-inside space-y-1">
                            <li>فحص سلامة الملفات (Integrity Check)</li>
                            <li>إعادة بناء الفهارس (Re-index)</li>
                            <li>ضغط حجم قاعدة البيانات (Vacuum)</li>
                            <li>تحديث إحصائيات الأداء (Analyze)</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleIntegrityCheck}
                        disabled={loading}
                        className={`w-full py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition
                            ${loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 active:scale-95'}
                        `}
                    >
                        {loading ? <Activity className="animate-spin" /> : <ShieldCheck />}
                        {loading ? 'جاري الفحص والصيانة...' : 'بدء عملية الصيانة'}
                    </button>

                    {result && (
                        <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 border ${result.success ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                            {result.success ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                            <div>
                                <div className="font-bold">{result.success ? 'تمت العملية بنجاح' : 'فشلت العملية'}</div>
                                <div className="text-sm opacity-90">{result.message}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
