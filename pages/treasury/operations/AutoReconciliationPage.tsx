import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Check, AlertCircle, Save, ArrowRight, FileText, Plus } from 'lucide-react';
import { Account } from '../../../types';

export const AutoReconciliationPage: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState('');

    // File Stuff
    const [fileData, setFileData] = useState<any[]>([]); // Raw Excel Data
    const [importedItems, setImportedItems] = useState<any[]>([]); // Parsed Items
    const [results, setResults] = useState<any[]>([]); // Matched Results

    const [step, setStep] = useState(1); // 1=Upload, 2=Map, 3=Review

    // Mapping config
    const [colMap, setColMap] = useState({
        date: '',
        desc: '',
        debit: '',
        credit: '',
        ref: ''
    });
    const [headers, setHeaders] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const allAccounts = await window.electronAPI.getAccounts();
                setAccounts(allAccounts.filter((a: any) => a.is_transactional === 1 && (a.name_en?.toLowerCase().includes('bank') || a.name_ar?.includes('بنك'))));
            }
        };
        load();
    }, []);

    // File Handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Array of Arrays

            if (data && data.length > 0) {
                setHeaders(data[0] as string[]);
                setFileData(data.slice(1)); // Remove header
                setStep(2); // Move to Map
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleProcess = async () => {
        // Parse data based on map
        const parsed = fileData.map((row: any) => {
            // Helper to get Val by Index
            const getVal = (colName: string) => {
                const idx = headers.indexOf(colName);
                return idx !== -1 ? row[idx] : null;
            };

            // Parse Date (Excel dates are tricky, assumes string or excel serial)
            let dateVal = getVal(colMap.date);
            // Simple date handling for now
            if (typeof dateVal === 'number') {
                // Excel Serial
                const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                dateVal = d.toISOString().split('T')[0];
            }

            return {
                date: dateVal,
                description: getVal(colMap.desc),
                reference: getVal(colMap.ref),
                debit: Number(getVal(colMap.debit) || 0),
                credit: Number(getVal(colMap.credit) || 0)
            };
        }).filter(i => i.date && (i.debit > 0 || i.credit > 0)); // Valid rows only

        setImportedItems(parsed);
        setIsLoading(true);

        // Call Backend to Match
        try {
            // @ts-ignore
            const api = (window.electronAPI as any).treasury;
            const matchResults = await api.matchImportedItems(selectedAccount, parsed);
            setResults(matchResults);
            setStep(3); // Move to Review
        } catch (e) {
            console.error(e);
            setFeedback({ type: 'error', message: 'فشل المعالجة' });
        } finally {
            setIsLoading(false);
        }
    };

    const confirmMatch = async (importIndex: number, sysId: string) => {
        // Reconcile the system Item
        try {
            const api = (window.electronAPI as any).treasury;
            await api.reconcileItems([sysId]);

            // Mark as done in UI
            setResults(prev => {
                const newRes = [...prev];
                newRes[importIndex].status = 'MATCHED';
                newRes[importIndex].chosenMatchId = sysId;
                return newRes;
            });
        } catch (e) { console.error(e); }
    };

    const confirmAll = async () => {
        // Find all Perfect Matches (Single Candidate)
        const toReconcile: string[] = [];
        const indicesToUpdate: number[] = [];

        results.forEach((res, idx) => {
            if (res.status !== 'MATCHED' && res.matches.length === 1) {
                toReconcile.push(res.matches[0].id);
                indicesToUpdate.push(idx);
            }
        });

        if (toReconcile.length === 0) return;

        try {
            const api = (window.electronAPI as any).treasury;
            await api.reconcileItems(toReconcile);

            setResults(prev => {
                const newRes = [...prev];
                indicesToUpdate.forEach(idx => {
                    newRes[idx].status = 'MATCHED';
                    newRes[idx].chosenMatchId = newRes[idx].matches[0].id;
                });
                return newRes;
            });
            setFeedback({ type: 'success', message: `تم تأكيد ${toReconcile.length} عملية تلقائياً` });
        } catch (e) { console.error(e); }
    };

    const handleQuickExpense = async (idx: number) => {
        // Create Expense Logic (Simplified)
        // Usually opens a modal. For now just placeholder alert.
        alert('ميزة إنشاء القيد السريع (Coming Soon)');
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col p-6 gap-6 overflow-hidden" dir="rtl">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Upload size={24} /></div>
                    التسوية الآلية (Auto Reconciliation)
                </h1>
            </div>

            {/* Steps */}
            {step === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl shadow border border-dashed border-gray-300 gap-4 p-12">
                    <div className="w-full max-w-md">
                        <label className="block font-bold mb-2">اختر الحساب البنكي</label>
                        <select
                            className="w-full px-4 py-3 border rounded-lg mb-6"
                            value={selectedAccount}
                            onChange={e => setSelectedAccount(e.target.value)}
                        >
                            <option value="">-- اختر حساب --</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                        </select>

                        <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition ${selectedAccount ? 'border-blue-400 bg-blue-50 cursor-pointer hover:bg-blue-100' : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'}`}>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={!selectedAccount} accept=".csv, .xlsx, .xls" />
                            <Upload className="mx-auto text-blue-500 mb-2" size={48} />
                            <p className="font-bold text-gray-700">اضغط لرفع ملف الكشف (Excel/CSV)</p>
                            <p className="text-sm text-gray-500">تأكد من اختيار الحساب أولاً</p>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="bg-white p-6 rounded-xl shadow border flex-1 flex flex-col">
                    <h2 className="text-lg font-bold mb-4">تعيين الأعمدة (Mapping)</h2>
                    <div className="grid grid-cols-2 gap-6 max-w-2xl">
                        {['date', 'desc', 'debit', 'credit', 'ref'].map(field => (
                            <div key={field}>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 capitalize">{field}</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={(colMap as any)[field]}
                                    onChange={e => setColMap({ ...colMap, [field]: e.target.value })}
                                >
                                    <option value="">-- تخطي --</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button onClick={handleProcess} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2">
                            معالجة ومطابقة <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Results split view */}
                    <div className="flex-1 bg-white rounded-xl shadow border flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Check size={18} className="text-green-600" /> العمليات المتطابقة (Matches)</h3>
                            <button onClick={confirmAll} className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 font-bold">تأكيد المطابقة التلقائية</button>
                        </div>
                        <div className="overflow-auto flex-1 p-2 space-y-2">
                            {results.filter(r => r.matches.length > 0).map((res, i) => (
                                <div key={i} className={`p-3 rounded border flex justify-between items-center ${res.status === 'MATCHED' ? 'bg-gray-100 opacity-60' : 'bg-green-50 border-green-200'}`}>
                                    <div>
                                        <div className="font-bold text-gray-800">{res.imported.description}</div>
                                        <div className="text-xs text-gray-500 flex gap-4">
                                            <span>تاريخ: {res.imported.date}</span>
                                            <span>قيمة: <span className="font-mono text-gray-900">{Math.max(res.imported.debit, res.imported.credit)}</span></span>
                                        </div>
                                    </div>
                                    <div>
                                        {res.status === 'MATCHED' ? <span className="text-green-600 font-bold text-xs">تمت المطابقة</span> : (
                                            <button onClick={() => confirmMatch(i, res.matches[0].id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">
                                                تأكيد ({res.matches.length} مرشح)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-xl shadow border flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-bold flex items-center gap-2"><AlertCircle size={18} className="text-orange-600" /> استثناءات (Exceptions)</h3>
                        </div>
                        <div className="overflow-auto flex-1 p-2 space-y-2">
                            {results.filter(r => r.matches.length === 0).map((res, i) => (
                                <div key={i} className="p-3 rounded border bg-orange-50 border-orange-200 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-gray-800">{res.imported.description}</div>
                                        <div className="text-xs text-gray-500 flex gap-4">
                                            <span>تاريخ: {res.imported.date}</span>
                                            <span>قيمة: {Math.max(res.imported.debit, res.imported.credit)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <button onClick={() => handleQuickExpense(i)} className="bg-white border hover:bg-gray-50 text-gray-700 px-3 py-1 rounded text-xs flex items-center gap-1">
                                            <Plus size={14} /> إنشاء قيد
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
