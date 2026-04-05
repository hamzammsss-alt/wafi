import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Building, CreditCard, X, Search, Loader2, Save, Printer, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountPicker } from '../../components/AccountPicker';

export const OurAccountsPage = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [current, setCurrent] = useState<any>({});
    const [search, setSearch] = useState('');

    // Picker State: 'gl' or 'commission' or 'parent' or null
    const [pickerTarget, setPickerTarget] = useState<'gl' | 'commission' | 'parent' | null>(null);
    const [loading, setLoading] = useState(false);

    const api = (window as any).electronAPI;

    const fetchData = async () => {
        setLoading(true);
        // Fetch independently to avoid one failure blocking all
        try {
            const accs = await api.masterData.getBankAccounts();
            setAccounts(accs || []);
        } catch (e) { console.error("Failed to load accounts", e); }

        try {
            const bks = await api.masterData.getBanks();
            console.log("Banks loaded:", bks?.length);
            setBanks(bks || []);
        } catch (e) { console.error("Failed to load banks", e); }

        try {
            const curs = await api.currency.getCurrencies(); // Ensure api.currency exists
            console.log("Currencies loaded:", curs?.length);
            setCurrencies(curs || []);
        } catch (e) {
            console.error("Failed to load currencies", e);
            // Fallback if api.currency is missing (old preload?)
            if (api.getCurrencies) {
                try {
                    const cursLegacy = await api.getCurrencies(); // Try legacy top-level
                    setCurrencies(cursLegacy || []);
                } catch (ex) { console.error("Legacy currency fetch failed", ex); }
            }
        }

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        if (!current.bank_id || !current.account_number) return alert("البنك ورقم الحساب مطلوبان");
        try {
            const res = await api.masterData.saveBankAccount(current);
            if (res && res.success) {
                setIsModalOpen(false);
                fetchData();
            } else {
                alert("حدث خطأ أثناء الحفظ");
                console.error("Save response:", res);
            }
        } catch (err: any) {
            alert("فشل الحفظ: " + (err.message || err));
            console.error("Save error:", err);
        }
    };

    const handleAccountSelect = (acc: any) => {
        if (pickerTarget === 'gl') {
            setCurrent({ ...current, gl_account_id: acc.id, gl_account_name: acc.name });
        } else if (pickerTarget === 'commission') {
            setCurrent({ ...current, commission_account_id: acc.id, commission_account_name: acc.name });
        } else if (pickerTarget === 'parent') {
            setCurrent({ ...current, parent_gl_id: acc.id, parent_gl_name: acc.name });
        }
        setPickerTarget(null);
    };

    const filteredAccounts = accounts.filter(a =>
        a.bank_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.account_number?.includes(search) ||
        a.branch?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 bg-gray-50/50 min-h-screen font-sans" dir="rtl">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-8">
                <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shadow-sm">
                    <Building size={28} />
                </div>
                حساباتنا في البنوك
            </h1>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm checkbox-wrapper">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="بحث عن حساب بنكي..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                </div>
                <button onClick={() => { setCurrent({}); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:shadow-md transition-all active:scale-95">
                    <Plus size={18} /> إضافة حساب جديد
                </button>
            </div>

            {/* Data Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
                {loading ? (
                    <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin mb-3 text-emerald-500" size={40} />
                        <p className="font-medium animate-pulse">جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-bold text-sm">
                            <tr>
                                <th className="p-4 w-16 text-center">#</th>
                                <th className="p-4">اسم الحساب</th>
                                <th className="p-4">البنك / الفرع</th>
                                <th className="p-4 w-24 text-center">العملة</th>
                                <th className="p-4 font-mono text-left" dir="ltr">رقم الحساب</th>
                                <th className="p-4 font-mono text-left" dir="ltr">IBAN</th>
                                <th className="p-4">حساب GL</th>
                                <th className="p-4 w-28 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredAccounts.length > 0 ? (
                                filteredAccounts.map((acc, idx) => (
                                    <tr key={acc.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4 text-center text-gray-400 font-mono text-xs">{acc.code || idx + 1}</td>
                                        <td className="p-4 font-bold text-gray-800">{acc.account_name || '-'}</td>
                                        <td className="p-4 font-medium text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                                    {(acc.bank_name?.[0] || 'B').toUpperCase()}
                                                </div>
                                                {acc.bank_name}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold border border-emerald-100">{acc.currency_id}</span>
                                        </td>
                                        <td className="p-4 font-mono text-gray-700 text-sm text-left" dir="ltr">{acc.account_number}</td>
                                        <td className="p-4 font-mono text-xs text-gray-500 text-left" dir="ltr">{acc.iban || '-'}</td>
                                        <td className="p-4 text-sm">
                                            {acc.gl_account_id ? (
                                                <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded max-w-fit">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    <span className="truncate max-w-[150px]">{acc.gl_account_name || acc.gl_account_id}</span>
                                                </div>
                                            ) : <span className="text-gray-300 italic text-xs">غير مربوط</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <button onClick={() => { setCurrent(acc); setIsModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="تعديل"><Edit size={16} /></button>
                                                <button onClick={() => { if (confirm("هل أنت متأكد من الحذف؟")) { api.masterData.deleteBankAccount(acc.id); fetchData(); } }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm" title="حذف"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="p-16 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <Building size={32} className="opacity-20" />
                                            </div>
                                            <p>لا توجد حسابات بنكية مضافة حتى الآن</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 md:p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] overflow-hidden border border-gray-100"
                        >
                            {/* Header */}
                            <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center select-none sticky top-0 z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        {current.id ? 'تعديل حساب بنكي' : 'إضافة حساب جديد'}
                                    </h3>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {current.id ? 'تعديل بيانات الحساب البنكي المحدد' : 'أدخل بيانات الحساب البنكي الجديد أدناه'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold shadow-sm shadow-emerald-200 transition-all active:scale-95 text-sm">
                                        <Save size={18} /> حفظ
                                    </button>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6" dir="rtl">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                                    {/* Left Panel - Main Info */}
                                    <div className="md:col-span-8 space-y-6">

                                        {/* Basic Identity Card */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-sm">
                                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-50 text-sm">
                                                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                                معلومات الحساب الأساسية
                                            </h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600">الرقم المرجعي</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="w-full border border-gray-200 p-2.5 text-sm rounded-lg text-center font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-300"
                                                            value={current.code || ''}
                                                            onChange={e => setCurrent({ ...current, code: e.target.value })}
                                                            placeholder="Custom ID"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600 flex justify-between">
                                                        الحالة
                                                        <span className="text-[10px] text-gray-400 font-normal">هل الحساب نشط؟</span>
                                                    </label>
                                                    <div onClick={() => setCurrent({ ...current, is_active: current.is_active === 0 ? 1 : 0 })} className={`w-full p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${current.is_active !== 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                        <span className="text-sm font-bold">{current.is_active !== 0 ? 'نشط' : 'غير نشط'}</span>
                                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${current.is_active !== 0 ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${current.is_active !== 0 ? 'left-0.5' : 'right-0.5'}`}></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-span-1 md:col-span-2 space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600">اسم الحساب <span className="text-red-500">*</span></label>
                                                    <input
                                                        className="w-full border border-gray-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-gray-700"
                                                        value={current.account_name || ''}
                                                        onChange={e => setCurrent({ ...current, account_name: e.target.value })}
                                                        placeholder="مثال: الحساب الجاري - الرئيسي"
                                                        dir="rtl"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bank Details Card */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-sm">
                                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-50 text-sm">
                                                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                                تفاصيل البنك والعملة
                                            </h4>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600">البنك / الفرع <span className="text-red-500">*</span></label>
                                                    <select
                                                        className="w-full border border-gray-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                                                        value={current.bank_id || ''}
                                                        onChange={e => setCurrent({ ...current, bank_id: e.target.value })}
                                                    >
                                                        <option value="">اختر البنك...</option>
                                                        {banks.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {b.name_ar} {b.branch_code ? ` - فرع ${b.branch_code}` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600">عملة الحساب</label>
                                                    <select
                                                        className="w-full border border-gray-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white font-mono"
                                                        value={current.currency_id || ''}
                                                        onChange={e => setCurrent({ ...current, currency_id: e.target.value })}
                                                    >
                                                        <option value="">اختر العملة...</option>
                                                        {currencies.map(c => <option key={c.id} value={c.code}>{c.code} - {c.name}</option>)}
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600">رقم الحساب</label>
                                                    <input className="w-full border border-gray-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-left placeholder:text-right" dir="ltr" placeholder="Account No" value={current.account_number || ''} onChange={e => setCurrent({ ...current, account_number: e.target.value })} />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600">الايبان (IBAN)</label>
                                                    <input className="w-full border border-gray-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-left placeholder:text-right" dir="ltr" placeholder="IBAN" value={current.iban || ''} onChange={e => setCurrent({ ...current, iban: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Accounting Links Card */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-sm">
                                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-50 text-sm">
                                                <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                                الربط المحاسبي
                                            </h4>

                                            <div className="space-y-4">
                                                {/* Parent GL Account (For New Accounts) */}
                                                {!current.id && (
                                                    <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                                                        <label className="text-xs font-bold text-gray-600">الحساب الرئيسي (في الدليل)</label>
                                                        <div className="flex gap-2">
                                                            <div
                                                                className="flex-1 border border-gray-200 bg-gray-50/50 p-2.5 text-sm rounded-lg cursor-pointer flex justify-between items-center px-4 hover:bg-gray-100 hover:border-gray-300 transition-all group"
                                                                onClick={() => setPickerTarget('parent')}
                                                            >
                                                                <span className={`truncate ${current.parent_gl_id ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                                                                    {current.parent_gl_name || current.parent_gl_id || 'اضغط لاختيار حساب البنوك الرئيسي...'}
                                                                </span>
                                                                <Search size={16} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                                                            </div>
                                                            {current.parent_gl_id && (
                                                                <button onClick={() => setCurrent({ ...current, parent_gl_id: null, parent_gl_name: null })} className="bg-red-50 text-red-500 hover:bg-red-100 p-2.5 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 col-start-2">سيتم إنشاء حساب فرعي تلقائياً تحت هذا الحساب</p>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                                                    <label className="text-xs font-bold text-gray-600">حساب الأستاذ العام</label>
                                                    <div className="flex gap-2">
                                                        <div
                                                            className={`flex-1 border border-gray-200 p-2.5 text-sm rounded-lg flex justify-between items-center px-4 transition-all group ${current.parent_gl_id ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'bg-gray-50/50 cursor-pointer hover:bg-gray-100'}`}
                                                            onClick={() => !current.parent_gl_id && setPickerTarget('gl')}
                                                        >
                                                            <span className={`truncate ${current.gl_account_id ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                                                                {current.parent_gl_id ? '(سيتم إنشاؤه تلقائياً)' : (current.gl_account_name || current.gl_account_id || 'اضغط للاختيار من الدليل المحاسبي...')}
                                                            </span>
                                                            {!current.parent_gl_id && <Search size={16} className="text-gray-400 group-hover:text-purple-500 transition-colors" />}
                                                        </div>
                                                        {current.gl_account_id && !current.parent_gl_id && (
                                                            <button onClick={() => setCurrent({ ...current, gl_account_id: null, gl_account_name: null })} className="bg-red-50 text-red-500 hover:bg-red-100 p-2.5 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                                                    <label className="text-xs font-bold text-gray-600">حساب العمولات</label>
                                                    <div className="flex gap-2">
                                                        <div
                                                            className="flex-1 border border-gray-200 bg-gray-50/50 p-2.5 text-sm rounded-lg cursor-pointer flex justify-between items-center px-4 hover:bg-gray-100 hover:border-gray-300 transition-all group"
                                                            onClick={() => setPickerTarget('commission')}
                                                        >
                                                            <span className={`truncate ${current.commission_account_id ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                                                                {current.commission_account_name || current.commission_account_id || 'اضغط لاختيار حساب المصاريف...'}
                                                            </span>
                                                            <Search size={16} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                                                        </div>
                                                        {current.commission_account_id && (
                                                            <button onClick={() => setCurrent({ ...current, commission_account_id: null, commission_account_name: null })} className="bg-red-50 text-red-500 hover:bg-red-100 p-2.5 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Panel - Settings & Extra */}
                                    <div className="md:col-span-4 space-y-6">

                                        {/* Configuration Card */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-sm h-full">
                                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-50 text-sm">
                                                <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                                                إعدادات إضافية
                                            </h4>

                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600">الحد الأدنى للرصيد</label>
                                                    <input type="number" className="w-full border border-gray-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" placeholder="0.00" />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-600">تاريخ الإغلاق</label>
                                                    <input type="date" className="w-full border border-gray-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-600" defaultValue={new Date().toISOString().split('T')[0]} />
                                                </div>

                                                <div className="pt-4 space-y-3">
                                                    <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors select-none">
                                                        <div className="relative flex items-center">
                                                            <input type="checkbox" className="peer w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                                        </div>
                                                        <span className="font-medium">تطابق تلقائي</span>
                                                    </label>
                                                    <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors select-none">
                                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                                        <span className="font-medium">اعتماد "حوالة بنكية" افتراضياً</span>
                                                    </label>
                                                </div>

                                                <div className="border-t border-gray-100 my-4 pt-4">
                                                    <button className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                                        <Printer size={16} /> طباعة بيانات الحساب
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            <AccountPicker
                                isOpen={pickerTarget !== null}
                                onClose={() => setPickerTarget(null)}
                                onSelect={handleAccountSelect}
                                showTransactionalOnly={pickerTarget !== 'parent'}
                                currencyId={pickerTarget === 'parent' ? current.currency_id : undefined}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
