import React, { useState, useEffect } from 'react';
import { Save, Edit, Trash2, Coins, Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const Currencies = () => {
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState<any>({
        code: '', name_ar: '', name_en: '', symbol: '', exchange_rate: 1.0, is_base: 0
    });
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const api = (window as any).electronAPI?.currency;

    useEffect(() => {
        loadCurrencies();
    }, []);

    const loadCurrencies = async () => {
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getCurrencies();
            setCurrencies(data || []);
        } catch (error) {
            console.error("Failed to load currencies");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!current.code || !current.name_ar) {
            setFeedback({ type: 'error', message: 'يرجى إدخال الرمز والاسم (عربي)' });
            return;
        }

        try {
            if (isEditing) {
                await api.updateCurrency(current);
            } else {
                await api.createCurrency(current);
            }

            setFeedback({ type: 'success', message: 'تم حفظ العملة بنجاح' });
            loadCurrencies();
            resetForm();
        } catch (error: any) {
            setFeedback({ type: 'error', message: 'حدث خطأ: ' + error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه العملة؟')) return;
        try {
            await api.deleteCurrency(id);
            setFeedback({ type: 'success', message: 'تم الحذف بنجاح' });
            loadCurrencies();
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        }
    };

    const handleEdit = (c: any) => {
        setCurrent(c);
        setIsEditing(true);
        setFeedback(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrent({ code: '', name_ar: '', name_en: '', symbol: '', exchange_rate: 1.0, is_base: 0 });
        setTimeout(() => setFeedback(null), 3000);
    };

    return (
        <div className="p-6 bg-[#f8f9fa] h-full overflow-auto font-cairo" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Coins className="text-blue-600" size={24} />
                        <span>إدارة العملات</span>
                    </h1>
                    <button onClick={loadCurrencies} className="p-2 bg-white rounded-lg border hover:bg-gray-50 text-gray-600" title="تحديث">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm h-fit border border-gray-100">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                {isEditing ? <Edit size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                                {isEditing ? 'تعديل عملة' : 'إضافة عملة جديدة'}
                            </h2>
                            {isEditing && (
                                <button onClick={resetForm} className="text-xs text-red-500 hover:text-red-700">إلغاء</button>
                            )}
                        </div>

                        {feedback && (
                            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm font-bold ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {feedback.message}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الرمز <span className="text-red-500">*</span></label>
                                    <input
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition font-mono uppercase"
                                        placeholder="USD"
                                        value={current.code}
                                        onChange={e => setCurrent({ ...current, code: e.target.value.toUpperCase() })}
                                        disabled={isEditing} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الرمز الرمزي</label>
                                    <input
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                                        placeholder="$"
                                        value={current.symbol || ''}
                                        onChange={e => setCurrent({ ...current, symbol: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العملة (AR) <span className="text-red-500">*</span></label>
                                <input
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                                    placeholder="دولار أمريكي"
                                    value={current.name_ar}
                                    onChange={e => setCurrent({ ...current, name_ar: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العملة (EN)</label>
                                <input
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                                    placeholder="US Dollar"
                                    value={current.name_en || ''}
                                    onChange={e => setCurrent({ ...current, name_en: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">سعر الصرف (مقابل الأساس)</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                                    value={current.exchange_rate}
                                    onChange={e => setCurrent({ ...current, exchange_rate: parseFloat(e.target.value) })}
                                    disabled={current.is_base === 1} // Base currency rate is always 1
                                />
                                {current.is_base === 1 && <p className="text-xs text-slate-400 mt-1">العملة الأساسية سعرها دائماً 1</p>}
                            </div>

                            <div className="flex items-center gap-2 pt-2 bg-slate-50 p-2 rounded border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="isBase"
                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                    checked={current.is_base === 1}
                                    onChange={e => setCurrent({ ...current, is_base: e.target.checked ? 1 : 0, exchange_rate: e.target.checked ? 1.0 : current.exchange_rate })}
                                />
                                <label htmlFor="isBase" className="text-sm font-bold text-gray-700 select-none cursor-pointer flex-1">عملة أساسية</label>
                                {current.is_base === 1 && <span className="text-xs text-amber-600 font-medium">سيتم إلغاء الأساس السابق</span>}
                            </div>

                            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2 mt-4 transition shadow-sm">
                                <Save size={18} /> {isEditing ? 'حفظ التعديلات' : 'إضافة العملة'}
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-sm">
                                <tr>
                                    <th className="p-4">الرمز</th>
                                    <th className="p-4">اسم العملة</th>
                                    <th className="p-4 text-center">سعر الصرف</th>
                                    <th className="p-4 text-center">النوع</th>
                                    <th className="p-4 text-center">أدوات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {currencies.map(c => (
                                    <tr key={c.id} className={`hover:bg-slate-50 transition ${c.is_base ? 'bg-amber-50/30' : ''}`}>
                                        <td className="p-4 font-mono font-bold text-slate-700">{c.code} <span className="text-slate-400 text-xs mx-1">({c.symbol})</span></td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{c.name_ar}</div>
                                            <div className="text-xs text-slate-500">{c.name_en}</div>
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-600 font-bold">
                                            {c.exchange_rate.toFixed(4)}
                                        </td>
                                        <td className="p-4 text-center text-xs">
                                            {c.is_base === 1 ? 
                                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">أساسية</span> : 
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">أجنبية</span>
                                            }
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"><Edit size={16} /></button>
                                                {c.is_base !== 1 && (
                                                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
