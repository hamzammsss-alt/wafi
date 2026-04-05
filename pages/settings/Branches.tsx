import React, { useState, useEffect } from 'react';
import { Save, Edit, Trash2, MapPin, Phone, Building2, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

export const Branches = () => {
    const [branches, setBranches] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState<any>({
        name_ar: '', name_en: '', address: '', phone: '', is_active: 1
    });
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const api = (window as any).electronAPI?.branch;

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = async () => {
        if (!api) return;
        try {
            const data = await api.getBranches();
            setBranches(data || []);
        } catch (error) {
            console.error("Failed to load branches");
        }
    };

    const handleSave = async () => {
        if (!current.name_ar) {
            setFeedback({ type: 'error', message: 'يرجى إدخال اسم الفرع (عربي)' });
            return;
        }

        try {
            if (isEditing) {
                await api.saveBranch(current); // Note: Our service uses same method or update? Preload exposes saveBranch which calls update or create in main.ts
            } else {
                await api.saveBranch(current);
            }

            setFeedback({ type: 'success', message: 'تم حفظ البيانات بنجاح' });
            loadBranches();
            resetForm();
        } catch (error: any) {
            setFeedback({ type: 'error', message: 'حدث خطأ: ' + error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;
        try {
            await api.deleteBranch(id);
            setFeedback({ type: 'success', message: 'تم الحذف بنجاح' });
            loadBranches();
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        }
    };

    const handleEdit = (b: any) => {
        setCurrent(b);
        setIsEditing(true);
        setFeedback(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrent({ name_ar: '', name_en: '', address: '', phone: '', is_active: 1 });
        setTimeout(() => setFeedback(null), 3000);
    };

    return (
        <div className="p-6 bg-[#f8f9fa] h-full overflow-auto font-cairo" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Building2 className="text-blue-600" size={24} />
                    <span>إدارة الفروع</span>
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm h-fit border border-gray-100">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                {isEditing ? <Edit size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                                {isEditing ? 'تعديل بيانات فرع' : 'إضافة فرع جديد'}
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفرع (AR) <span className="text-red-500">*</span></label>
                                <input
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                                    placeholder="الفرع الرئيسي"
                                    value={current.name_ar}
                                    onChange={e => setCurrent({ ...current, name_ar: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفرع (EN)</label>
                                <input
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                                    placeholder="Main Branch"
                                    value={current.name_en || ''}
                                    onChange={e => setCurrent({ ...current, name_en: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                                <div className="relative">
                                    <input
                                        className="w-full p-2 pr-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                                        placeholder="المدينة - الحي"
                                        value={current.address || ''}
                                        onChange={e => setCurrent({ ...current, address: e.target.value })}
                                    />
                                    <MapPin size={14} className="absolute top-3 right-2.5 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                                <div className="relative">
                                    <input
                                        className="w-full p-2 pr-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
                                        placeholder="02-xxxxxxx"
                                        value={current.phone || ''}
                                        onChange={e => setCurrent({ ...current, phone: e.target.value })}
                                    />
                                    <Phone size={14} className="absolute top-3 right-2.5 text-gray-400" />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                    checked={current.is_active === 1}
                                    onChange={e => setCurrent({ ...current, is_active: e.target.checked ? 1 : 0 })}
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700 select-none cursor-pointer">نشط</label>
                            </div>

                            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2 mt-4 transition shadow-sm">
                                <Save size={18} /> {isEditing ? 'حفظ التعديلات' : 'حفظ الفرع'}
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-sm">
                                <tr>
                                    <th className="p-4">اسم الفرع</th>
                                    <th className="p-4">تفاصيل الاتصال</th>
                                    <th className="p-4 text-center">النوع</th>
                                    <th className="p-4 text-center">الحالة</th>
                                    <th className="p-4 text-center">أدوات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {branches.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50 transition">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{b.name_ar}</div>
                                            <div className="text-xs text-slate-500">{b.name_en}</div>
                                            {b.id === current.id && <span className="text-xs text-blue-500">(جاري التعديل)</span>}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-1"><MapPin size={12} /> {b.address || '-'}</div>
                                            <div className="flex items-center gap-1 mt-1"><Phone size={12} /> {b.phone || '-'}</div>
                                        </td>
                                        <td className="p-4 text-center text-xs">
                                            <span className={`px-2 py-1 rounded border ${b.type === 'MAIN' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {b.type === 'MAIN' ? 'رئيسي' : 'فرع'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-xs">
                                            {b.is_active ?
                                                <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">نشط</span> :
                                                <span className="text-red-500 bg-red-50 px-2 py-1 rounded">غير نشط</span>
                                            }
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(b)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"><Edit size={16} /></button>
                                                {b.type !== 'MAIN' && (
                                                    <button onClick={() => handleDelete(b.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>
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
