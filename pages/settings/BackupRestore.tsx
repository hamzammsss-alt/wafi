import React, { useState } from 'react';
import { Database, Upload, Download, AlertTriangle, CheckCircle } from 'lucide-react';

export const BackupRestore = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', msg: '' });

    const handleBackup = async () => {
        setLoading(true);
        setStatus({ type: '', msg: '' });
        try {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const res = await window.electronAPI.backupDatabase();
                if (res.success) {
                    setStatus({ type: 'success', msg: `تم إنشاء نسخة احتياطية بنجاح في: ${res.path}` });
                } else {
                    setStatus({ type: '', msg: '' }); // Cancelled
                }
            }
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!confirm("تحذير: استرجاع نسخة احتياطية سيؤدي إلى حذف جميع البيانات الحالية! هل أنت متأكد؟")) return;

        setLoading(true);
        try {
            // @ts-ignore
            // In this version, we act conservatively as replacing open DB file is risky without app restart logic in main process.
            // We will instruct user via UI for now or call standard handler.
            // @ts-ignore
            const res = await window.electronAPI.restoreDatabase();
            if (res && res.message) alert(res.message);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-8 items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl w-full text-center">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                    <Database size={40} />
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">النسخ الاحتياطي والاسترجاع</h1>
                <p className="text-gray-500 mb-8">حماية بياناتك هي أولويتنا. قم بإنشاء نسخ احتياطية دورية لتجنب فقدان البيانات.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Backup Card */}
                    <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 hover:bg-blue-50 transition cursor-pointer group" onClick={handleBackup}>
                        <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                            <Download />
                        </div>
                        <h3 className="font-bold text-lg text-gray-800">تصدير نسخة احتياطية</h3>
                        <p className="text-sm text-gray-400 mt-2">حفظ ملف قاعدة البيانات (wafi.db) في مكان آمن.</p>
                    </div>

                    {/* Restore Card */}
                    <div className="border-2 border-dashed border-red-200 rounded-xl p-6 hover:bg-red-50 transition cursor-pointer group" onClick={handleRestore}>
                        <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 group-hover:scale-110 transition-transform">
                            <Upload />
                        </div>
                        <h3 className="font-bold text-lg text-gray-800">استرجاع نسخة سابقة</h3>
                        <p className="text-sm text-gray-400 mt-2">استبدال البيانات الحالية بنسخة محفوظة سابقاً.</p>
                    </div>
                </div>

                {status.msg && (
                    <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {status.type === 'success' ? <CheckCircle /> : <AlertTriangle />}
                        <span className="font-bold text-sm text-right flex-1">{status.msg}</span>
                    </div>
                )}

                {loading && <p className="mt-4 text-sm text-gray-500 animate-pulse">جاري العمل...</p>}

                <div className="mt-8 bg-yellow-50 p-4 rounded-lg flex gap-3 text-right">
                    <AlertTriangle className="text-yellow-600 shrink-0" />
                    <p className="text-xs text-yellow-800 leading-relaxed">
                        <strong>تنبيه هام:</strong> عملية الاسترجاع لا يمكن التراجع عنها. تأكد دائماً من أخذ نسخة احتياطية حديثة قبل القيام بأي عملية استرجاع أو تحديث للنظام.
                    </p>
                </div>
            </div>
        </div>
    );
};
