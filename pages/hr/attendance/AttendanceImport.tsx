import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const AttendanceImport = () => {
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<any[]>([]);
    const [step, setStep] = useState(1); // 1: Input, 2: Preview
    const [loading, setLoading] = useState(false);

    const parseData = () => {
        // Simple CSV parser: EmployeeCode, Date, Time (or DateTime)
        // Format assumed: CODE, YYYY-MM-DD HH:MM:SS
        const lines = text.split('\n');
        const parsed = [];
        for (const line of lines) {
            const parts = line.split(/[,\t]+/).map(s => s.trim()); // Split by comma or tab
            if (parts.length >= 2) {
                // Try to detect format
                let code = parts[0];
                let timestamp = parts[1];
                if (parts.length === 3) timestamp = `${parts[1]} ${parts[2]}`; // Date and Time separate

                if (code && timestamp) {
                    parsed.push({
                        employee_code: code,
                        timestamp: timestamp, // Should be validated
                        source: 'MANUAL_IMPORT'
                    });
                }
            }
        }
        setPreview(parsed);
        if (parsed.length > 0) setStep(2);
        else alert('No valid data found. Use format: Code, Date, Time');
    };

    const handleImport = async () => {
        setLoading(true);
        try {
            await window.electronAPI.hr.importAttendance(preview);

            alert(`Successfully imported ${preview.length} records.`);
            setText('');
            setPreview([]);
            setStep(1);
        } catch (error) {
            alert('Import failed: ' + error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen rtl font-sans" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">استيراد بصمات الدوام</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                {step === 1 ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold">تنسيق البيانات</h4>
                                <p className="text-sm mt-1">يرجى نسخ ولصق البيانات بالتنسيق التالي (فاصلة أو Tab):</p>
                                <code className="block mt-2 bg-white/50 p-2 rounded text-xs font-mono" dir="ltr">
                                    EMP001, 2024-01-01 08:00:00<br />
                                    EMP001, 2024-01-01 16:00:00
                                </code>
                            </div>
                        </div>

                        <textarea
                            className="w-full h-64 p-4 border rounded-lg font-mono text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="الصق بيانات البصمة هنا..."
                            value={text}
                            onChange={e => setText(e.target.value)}
                        ></textarea>

                        <div className="flex justify-end">
                            <button onClick={parseData} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md flex items-center">
                                <FileText className="w-4 h-4 ml-2" />
                                معاينة البيانات
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">معاينة ({preview.length} سجل)</h3>
                            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">تعديل البيانات</button>
                        </div>

                        <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="p-3">رقم الموظف</th>
                                        <th className="p-3">التوقيت</th>
                                        <th className="p-3">المصدر</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {preview.map((r, i) => (
                                        <tr key={i}>
                                            <td className="p-3 font-mono">{r.employee_code}</td>
                                            <td className="p-3 font-mono" dir="ltr">{r.timestamp}</td>
                                            <td className="p-3 text-gray-400">{r.source}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-4 gap-3">
                            <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">إلغاء</button>
                            <button onClick={handleImport} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 shadow-md flex items-center">
                                <Upload className="w-4 h-4 ml-2" />
                                {loading ? 'جاري الاستيراد...' : 'تأكيد وحفظ'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceImport; // Fixed export: was AttendanceImportPage in thought but code used AttendanceImport. Routes use AttendanceImport.
