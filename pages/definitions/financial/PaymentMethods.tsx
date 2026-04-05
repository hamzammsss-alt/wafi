import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Plus,
    Search,
    Trash2,
    Edit,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Wallet,
    Building2,
    Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountPicker } from '../../../components/AccountPicker';

export const PaymentMethods = () => {
    const [methods, setMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAccountPicker, setShowAccountPicker] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name_ar: '',
        name_en: '',
        type: 'CASH',
        gl_account_id: '',
        commission_rate: 0,
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = (window as any).electronAPI?.masterData;

    useEffect(() => {
        loadMethods();
    }, []);

    const loadMethods = async () => {
        try {
            setLoading(true);
            const data = await api.getPaymentMethods();
            setMethods(data);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل طرق الدفع');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (method: any) => {
        setFormData({
            name_ar: method.name_ar,
            name_en: method.name_en || '',
            type: method.type || 'CASH',
            gl_account_id: method.gl_account_id || '',
            commission_rate: method.commission_rate || 0,
            is_active: method.is_active ? true : false
        });
        setEditingId(method.id);
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({
            name_ar: '',
            name_en: '',
            type: 'CASH',
            gl_account_id: '',
            commission_rate: 0,
            is_active: true
        });
        setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name_ar) {
            setError('اسم طريقة الدفع مطلوب');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                is_active: formData.is_active ? 1 : 0
            };

            if (editingId) {
                await api.savePaymentMethod({ id: editingId, ...payload });
            } else {
                await api.savePaymentMethod(payload);
            }

            // Success
            handleClose();
            loadMethods();
        } catch (err: any) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    // Note: Delete might allow generic crud or handled internally
    // Assuming api.deletePaymentMethod exists or we skip delete for now if not exposed
    // The previous code didn't have delete, let's keep it safe.

    const filteredMethods = methods.filter(m =>
        m.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
        m.name_en?.toLowerCase().includes(search.toLowerCase())
    );

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'CASH': return <Wallet size={16} />;
            case 'CHECK': return <Building2 size={16} />;
            case 'CREDIT_CARD': return <CreditCard size={16} />;
            case 'ELECTRONIC_WALLET': return <Smartphone size={16} />;
            default: return <CreditCard size={16} />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'CASH': return 'نقد (Cash)';
            case 'CHECK': return 'شيك (Check)';
            case 'CREDIT_CARD': return 'بطاقة ائتمان';
            case 'BANK_TRANSFER': return 'حوالة بنكية';
            case 'ELECTRONIC_WALLET': return 'محفظة إلكترونية';
            default: return type;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <CreditCard size={24} />
                        </div>
                        طرق الدفع (Payment Methods)
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">تعريف وسائل الدفع (نقدي، شبكة، تحويل) وربطها بالحسابات</p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة طريقة دفع
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    {error}
                    <button onClick={() => setError(null)} className="mr-auto hover:bg-red-100 p-1 rounded">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Search & Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث عن طريقة دفع..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-blue-600 font-bold">{methods.length}</span>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                        <p>جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    /* Table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-[#f8fafc] text-gray-600 font-semibold text-sm uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-4">الاسم (عربي)</th>
                                    <th className="px-6 py-4">الاسم (English)</th>
                                    <th className="px-6 py-4">النوع</th>
                                    <th className="px-6 py-4">الحساب المرتبط</th>
                                    <th className="px-6 py-4">عمولة %</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredMethods.length > 0 ? (
                                    filteredMethods.map((method, index) => (
                                        <tr key={method.id || `method-${index}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">{method.name_ar}</td>
                                            <td className="px-6 py-4 text-gray-600">{method.name_en || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-700 text-sm">
                                                    {getTypeIcon(method.type)}
                                                    {getTypeLabel(method.type)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                {method.gl_account_id || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {method.commission_rate > 0 ? `${method.commission_rate}%` : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${method.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {method.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                    {method.is_active ? 'فعال' : 'غير فعال'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(method)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-gray-50 p-4 rounded-full">
                                                    <Search size={32} className="text-gray-300" />
                                                </div>
                                                <p>لا توجد طرق دفع مطابقة للبحث</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {editingId ? <Edit className="text-blue-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                                {editingId ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع جديدة'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (عربي) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name_ar}
                                        onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-right"
                                        placeholder="مثال: نقدي"
                                        dir="rtl"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (English)</label>
                                    <input
                                        type="text"
                                        value={formData.name_en}
                                        onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. Cash"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع الدفع</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="CASH">نقد (Cash)</option>
                                        <option value="CHECK">شيك (Check)</option>
                                        <option value="CREDIT_CARD">بطاقة ائتمان</option>
                                        <option value="BANK_TRANSFER">حوالة بنكية</option>
                                        <option value="ELECTRONIC_WALLET">محفظة إلكترونية</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">عمولة البنك %</label>
                                    <input
                                        type="number"
                                        value={formData.commission_rate}
                                        onChange={e => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">الحساب المحاسبي المرتبط</label>
                                <div
                                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 cursor-pointer hover:bg-white hover:border-blue-300 transition-all flex justify-between items-center"
                                    onClick={() => setShowAccountPicker(true)}
                                >
                                    <span className={formData.gl_account_id ? 'text-gray-900' : 'text-gray-400'}>
                                        {formData.gl_account_id || 'اضغط لاختيار الحساب...'}
                                    </span>
                                    <Edit size={16} className="text-gray-400" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">فعال</span>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm shadow-blue-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                                >
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    {editingId ? 'حفظ التعديلات' : 'إضافة طريقة الدفع'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AccountPicker
                isOpen={showAccountPicker}
                onClose={() => setShowAccountPicker(false)}
                onSelect={(acc) => {
                    setFormData({ ...formData, gl_account_id: acc.id });
                    setShowAccountPicker(false);
                }}
                showTransactionalOnly={true}
            />
        </div>
    );
};
