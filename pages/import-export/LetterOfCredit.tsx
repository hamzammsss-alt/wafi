import React, { useState } from 'react';
import { FileText, Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';

// Mock Data for LCs
const MOCK_LCS = [
    { id: '1', file_no: 'LC-2026-001', bank: 'البنك العربي', amount: 50000, currency: 'USD', rate: 3.50, status: 'OPEN', date: '2026-01-10' },
    { id: '2', file_no: 'LC-2026-002', bank: 'بنك فلسطين', amount: 12000, currency: 'EUR', rate: 4.10, status: 'CLOSED', date: '2025-12-25' },
];

export const LetterOfCredit = () => {
    const [lcs, setLcs] = useState(MOCK_LCS);
    const [showForm, setShowForm] = useState(false);
    const [newLC, setNewLC] = useState({ file_no: '', bank: '', amount: 0, currency: 'USD', rate: 1, status: 'OPEN' });

    const handleSave = () => {
        const lc = { ...newLC, id: Date.now().toString(), date: new Date().toISOString().split('T')[0] };
        setLcs([...lcs, lc as any]);
        setShowForm(false);
        setNewLC({ file_no: '', bank: '', amount: 0, currency: 'USD', rate: 1, status: 'OPEN' });
    };

    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-indigo-600" /> ملف الاعتماد المستندي (LC File)
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">إدارة ملفات الاستيراد وحالتها</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                    <Plus size={18} /> فتح ملف جديد
                </button>
            </div>

            {/* List View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                        <tr>
                            <th className="p-4">رقم الملف</th>
                            <th className="p-4">تاريخ الفتح</th>
                            <th className="p-4">البنك</th>
                            <th className="p-4">قيمة الاعتماد</th>
                            <th className="p-4">سعر الصرف</th>
                            <th className="p-4">القيمة (NIS)</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {lcs.map(lc => (
                            <tr key={lc.id} className="hover:bg-gray-50 transition">
                                <td className="p-4 font-bold text-indigo-900">{lc.file_no}</td>
                                <td className="p-4">{lc.date}</td>
                                <td className="p-4">{lc.bank}</td>
                                <td className="p-4 font-mono font-bold">{lc.amount.toLocaleString()} {lc.currency}</td>
                                <td className="p-4 font-mono text-gray-500">{lc.rate}</td>
                                <td className="p-4 font-mono font-bold text-indigo-700">{(lc.amount * lc.rate).toLocaleString()}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${lc.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {lc.status === 'OPEN' ? 'مفتوح (Active)' : 'مغلق (Closed)'}
                                    </span>
                                </td>
                                <td className="p-4 flex gap-2">
                                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"><Eye size={16} /></button>
                                    <button className="p-2 text-amber-600 hover:bg-amber-50 rounded"><Edit size={16} /></button>
                                    <button className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple Modal for New LC */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 border-b pb-2">فتح ملف استيراد جديد</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">رقم الملف (مرجع)</label>
                                <input
                                    value={newLC.file_no}
                                    onChange={e => setNewLC({ ...newLC, file_no: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="مثال: LC-2026-003"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">قيمة الاعتماد</label>
                                    <input
                                        type="number"
                                        value={newLC.amount}
                                        onChange={e => setNewLC({ ...newLC, amount: Number(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">العملة</label>
                                    <select
                                        value={newLC.currency}
                                        onChange={e => setNewLC({ ...newLC, currency: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="USD">دولار أمريكي (USD)</option>
                                        <option value="EUR">يورو (EUR)</option>
                                        <option value="JOD">دينار أردني (JOD)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">سعر التحويل (تقديري)</label>
                                    <input
                                        type="number"
                                        value={newLC.rate}
                                        onChange={e => setNewLC({ ...newLC, rate: Number(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">البنك الممول</label>
                                    <input
                                        value={newLC.bank}
                                        onChange={e => setNewLC({ ...newLC, bank: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="اسم البنك"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold">إلغاء</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">حفظ الملف</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
