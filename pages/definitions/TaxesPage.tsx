import React, { useState, useEffect } from 'react';
import { Percent, Plus, Trash2, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Tax, Account } from '../../types';

export const TaxesPage: React.FC = () => {
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTax, setCurrentTax] = useState<Partial<Tax>>({ name_ar: '', rate: 16, is_active: 1 });
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                const api = (window.electronAPI as any);
                const [fetchedTaxes, fetchedAccounts] = await Promise.all([
                    api.finance.getTaxes(),
                    api.getAccounts()
                ]);
                setTaxes(fetchedTaxes || []);
                setAccounts(fetchedAccounts?.filter((a: Account) => a.account_type === 'Liability' || a.account_type === 'Asset') || []);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentTax.name_ar) {
            setFeedback({ type: 'error', message: 'اسم الضريبة مطلوب' });
            return;
        }

        try {
            // @ts-ignore
            await window.electronAPI.finance.saveTax(currentTax);
            setFeedback({ type: 'success', message: 'تم الحفظ بنجاح' });
            setIsModalOpen(false);
            loadData();
            setTimeout(() => setFeedback(null), 3000);
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: 'حدث خطأ أثناء الحفظ' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            // @ts-ignore
            await window.electronAPI.finance.deleteTax(id);
            loadData();
        } catch (error) {
            console.error(error);
            alert('لا يمكن حذف الضريبة، قد تكون مستخدمة');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Percent className="text-blue-600" />
                        الضرائب والرسوم
                    </h1>
                    <p className="text-gray-500 mt-1">إعداد نسب ضريبة القيمة المضافة والضرائب الأخرى</p>
                </div>
                <button
                    onClick={() => { setCurrentTax({ name_ar: '', rate: 16, is_active: 1 }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium shadow-lg shadow-blue-100"
                >
                    <Plus size={18} />
                    ضريبة جديدة
                </button>
            </div>

            {feedback && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold">{feedback.message}</span>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                        <tr>
                            <th className="p-4">اسم الضريبة</th>
                            <th className="p-4">النسبة %</th>
                            <th className="p-4">الحساب المرتبط</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {taxes.map(tax => (
                            <tr key={tax.id} className="hover:bg-blue-50 transition group">
                                <td className="p-4 font-medium text-gray-800">{tax.name_ar}</td>
                                <td className="p-4">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-bold">
                                        {tax.rate}%
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600">
                                    {accounts.find(a => a.id === tax.account_id)?.name_ar || '-'}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${tax.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {tax.is_active ? 'فعال' : 'غير فعال'}
                                    </span>
                                </td>
                                <td className="p-4 flex gap-2">
                                    <button
                                        onClick={() => { setCurrentTax(tax); setIsModalOpen(true); }}
                                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                    >
                                        <Save size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tax.id)}
                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!isLoading && taxes.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        <Percent size={48} className="mx-auto mb-4 opacity-20" />
                        <p>لا يوجد ضرائب معرفة بعد</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                {currentTax.id ? 'تعديل ضريبة' : 'إضافة ضريبة جديدة'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الضريبة (عربي) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                    value={currentTax.name_ar || ''}
                                    onChange={e => setCurrentTax({ ...currentTax, name_ar: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">النسبة المئوية %</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                    value={currentTax.rate}
                                    onChange={e => setCurrentTax({ ...currentTax, rate: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الحساب المرتبط (GL Account)</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                    value={currentTax.account_id || ''}
                                    onChange={e => setCurrentTax({ ...currentTax, account_id: e.target.value })}
                                >
                                    <option value="">-- اختر حساب --</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">حساب الالتزامات (أمانات ضريبية) أو الأصول (ضريبة مشتريات)</p>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    className="w-4 h-4 text-blue-600 rounded"
                                    checked={currentTax.is_active === 1}
                                    onChange={e => setCurrentTax({ ...currentTax, is_active: e.target.checked ? 1 : 0 })}
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer select-none">الضريبة فعالة</label>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition">إلغاء</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition">حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
