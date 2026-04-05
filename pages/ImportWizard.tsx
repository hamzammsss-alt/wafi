import React, { useState } from 'react';
import { Upload, Database, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';

export const ImportWizard = () => {
    const [importType, setImportType] = useState<'products' | 'customers'>('products');
    const [rawData, setRawData] = useState<string>('');
    const [preview, setPreview] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);

    const handleParse = () => {
        // Simple TSV parser (Excel copy-paste)
        const rows = rawData.trim().split('\n').map(row => row.split('\t'));
        if (rows.length < 1) return;

        // Assume headers are row 0? No, let's assume direct data for simplicity or ask user
        // Format: Name | Barcode | Price | Cost | Quantity
        const parsed = rows.map(r => {
            if (importType === 'products') {
                return { name: r[0], barcode: r[1], price: r[2], cost: r[3], quantity: r[4] };
            } else {
                return { name: r[0], code: r[1], balance: r[2] };
            }
        });

        setPreview(parsed);
    };

    const executeImport = async () => {
        if (preview.length === 0) return;

        try {
            // @ts-ignore
            const result = await window.electronAPI.importData(importType, preview);
            setLogs(prev => [...prev, `✅ تم استيراد ${result.count} سجل بنجاح!`]);
            setPreview([]);
            setRawData('');
        } catch (err: any) {
            setLogs(prev => [...prev, `❌ خطأ: ${err.message}`]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-6 gap-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Database className="text-blue-600" /> معالج استيراد البيانات (The Bridge) 🌉
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

                {/* Step 1: Input */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                        اختر النوع والصق البيانات
                    </h2>

                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setImportType('products')}
                            className={`flex-1 py-2 rounded font-bold border ${importType === 'products' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50 text-gray-500'}`}
                        >
                            أصناف
                        </button>
                        <button
                            onClick={() => setImportType('customers')}
                            className={`flex-1 py-2 rounded font-bold border ${importType === 'customers' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50 text-gray-500'}`}
                        >
                            عملاء
                        </button>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 mb-2 border border-yellow-200">
                        <AlertTriangle size={14} className="inline ml-1" />
                        <span>تنسيق النسخ من الإكسل:</span>
                        {importType === 'products' ? (
                            <div className="font-mono mt-1 font-bold">الاسم | الباركود | سعر البيع | التكلفة | الكمية</div>
                        ) : (
                            <div className="font-mono mt-1 font-bold">الاسم | الكود | الرصيد الافتتاحي</div>
                        )}
                    </div>

                    <textarea
                        className="flex-1 w-full border p-2 rounded font-mono text-sm bg-gray-50 focus:bg-white transition"
                        placeholder="الصق خلايا الإكسل هنا..."
                        value={rawData}
                        onChange={e => setRawData(e.target.value)}
                    ></textarea>

                    <button
                        onClick={handleParse}
                        className="mt-4 bg-gray-800 text-white py-3 rounded font-bold hover:bg-black transition flex items-center justify-center gap-2"
                    >
                        <FileSpreadsheet size={18} /> تحليل البيانات
                    </button>
                </div>

                {/* Step 2: Preview & Execution */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            المراجعة والتنفيذ
                        </h2>
                        {preview.length > 0 && (
                            <button
                                onClick={executeImport}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow-lg animate-pulse flex items-center gap-2"
                            >
                                <Upload size={18} /> استيراد {preview.length} سجل
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto border rounded bg-gray-50 custom-scrollbar">
                        {preview.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Database size={48} className="mb-4 opacity-20" />
                                <p>لا توجد بيانات للمعاينة</p>
                            </div>
                        ) : (
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-200 font-bold text-gray-700 sticky top-0">
                                    <tr>
                                        <th className="p-2">#</th>
                                        <th className="p-2">الاسم</th>
                                        {importType === 'products' ? (
                                            <>
                                                <th className="p-2">الباركود</th>
                                                <th className="p-2">السعر</th>
                                                <th className="p-2">التكلفة</th>
                                                <th className="p-2">الكمية</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="p-2">الكود</th>
                                                <th className="p-2">الرصيد</th>
                                            </>
                                        )}
                                        <th className="p-2">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, idx) => (
                                        <tr key={idx} className="border-b hover:bg-blue-50 transition">
                                            <td className="p-2 text-gray-500">{idx + 1}</td>
                                            <td className="p-2 font-bold">{row.name}</td>
                                            {importType === 'products' ? (
                                                <>
                                                    <td className="p-2 font-mono">{row.barcode}</td>
                                                    <td className="p-2 text-green-600">{row.price}</td>
                                                    <td className="p-2 text-red-500">{row.cost}</td>
                                                    <td className="p-2 font-bold">{row.quantity}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-2 font-mono">{row.code}</td>
                                                    <td className="p-2 font-bold">{row.balance}</td>
                                                </>
                                            )}
                                            <td className="p-2 text-green-600"><CheckCircle size={14} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Logs */}
                    <div className="h-32 mt-4 bg-black text-green-400 font-mono text-xs p-4 rounded overflow-auto">
                        <div className="opacity-50 border-b border-gray-700 mb-2 pb-1">System Log...</div>
                        {logs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                </div>

            </div>
        </div>
    );
};
