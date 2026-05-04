import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building, Edit, Printer, Save, Search, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountPicker } from '../../components/AccountPicker';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

type BankAccountRow = {
    id: string;
    code?: string;
    bank_name?: string;
    branch?: string;
    account_name?: string;
    account_number?: string;
    iban?: string;
    currency_id?: string;
    currency?: string;
    gl_account_id?: string;
    gl_account_code?: string;
    gl_account_name?: string;
    commission_account_id?: string;
    commission_account_name?: string;
    sub_account_code?: string;
    sub_account_name?: string;
    is_active?: number | boolean;
};

function text(value: unknown) {
    return String(value || '').trim();
}

function isActive(value: unknown) {
    return value !== 0 && value !== false;
}

export const OurAccountsPage = () => {
    const [accounts, setAccounts] = useState<BankAccountRow[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [current, setCurrent] = useState<any>({});

    // Picker State: 'gl' or 'commission' or 'parent' or null
    const [pickerTarget, setPickerTarget] = useState<'gl' | 'commission' | 'parent' | null>(null);
    const [loading, setLoading] = useState(false);

    const api = (window as any).electronAPI;

    const fetchData = useCallback(async () => {
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
    }, [api]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const handleSave = async () => {
        if (!current.bank_id || !current.account_number) return alert("البنك ورقم الحساب مطلوبان");
        try {
            const res = await api.masterData.saveBankAccount(current);
            if (res && res.success) {
                setIsModalOpen(false);
                void fetchData();
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

    const openCreateModal = useCallback(() => {
        setCurrent({ is_active: 1, currency_id: 'ILS' });
        setIsModalOpen(true);
    }, []);

    const openEditModal = useCallback((account: BankAccountRow) => {
        setCurrent(account);
        setIsModalOpen(true);
    }, []);

    const deleteAccounts = useCallback(async (rows: BankAccountRow[]) => {
        if (rows.length === 0) return;
        const message = rows.length === 1
            ? 'هل أنت متأكد من حذف الحساب البنكي المحدد؟'
            : `هل أنت متأكد من حذف ${rows.length} حسابات بنكية؟`;
        if (!confirm(message)) return;

        await Promise.all(rows.filter((row) => row.id).map((row) => api.masterData.deleteBankAccount(row.id)));
        await fetchData();
    }, [api, fetchData]);

    const headerStats = useMemo(() => {
        const active = accounts.filter((account) => isActive(account.is_active)).length;
        const linked = accounts.filter((account) => text(account.gl_account_id)).length;
        const currenciesCount = new Set(accounts.map((account) => text(account.currency_id || account.currency)).filter(Boolean)).size;
        return { active, linked, currenciesCount };
    }, [accounts]);

    const columns = useMemo<DefinitionListColumn<BankAccountRow>[]>(() => [
        {
            key: 'code',
            label: '#',
            type: 'text',
            filterType: 'text',
            width: 90,
            defaultVisible: true,
            align: 'center',
            getValue: (account) => account.code || account.account_number || account.id,
            getDisplayValue: (account) => text(account.code || account.account_number || account.id),
            renderCell: (account) => (
                <span className="font-mono text-xs font-bold text-slate-500">
                    {account.code || account.account_number || '-'}
                </span>
            ),
        },
        {
            key: 'account_name',
            label: 'اسم الحساب',
            type: 'text',
            filterType: 'text',
            width: 240,
            defaultVisible: true,
            align: 'right',
            getValue: (account) => account.account_name || '',
            getSearchValue: (account) => [
                account.account_name,
                account.bank_name,
                account.branch,
                account.account_number,
                account.iban,
                account.gl_account_name,
                account.gl_account_code,
            ].map(text).join(' '),
            getDisplayValue: (account) => text(account.account_name || '-'),
            renderCell: (account) => (
                <div className="min-w-0">
                    <div className="truncate font-extrabold text-slate-800">{account.account_name || '-'}</div>
                    <div className="mt-1 truncate font-mono text-[11px] text-slate-400" dir="ltr">
                        {account.account_number || ''}
                    </div>
                </div>
            ),
        },
        {
            key: 'bank_name',
            label: 'البنك / الفرع',
            type: 'text',
            filterType: 'text',
            width: 210,
            defaultVisible: true,
            align: 'right',
            getValue: (account) => `${account.bank_name || ''} ${account.branch || ''}`,
            getDisplayValue: (account) => text([account.bank_name, account.branch].filter(Boolean).join(' / ') || '-'),
            renderCell: (account) => (
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-extrabold text-blue-700">
                        {(account.bank_name?.[0] || 'ب').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate font-bold text-slate-700">{account.bank_name || '-'}</div>
                        {account.branch && <div className="truncate text-[11px] text-slate-400">{account.branch}</div>}
                    </div>
                </div>
            ),
        },
        {
            key: 'currency_id',
            label: 'العملة',
            type: 'enum',
            filterType: 'enum',
            width: 110,
            defaultVisible: true,
            align: 'center',
            options: currencies.map((currency: any) => ({
                value: text(currency.code || currency.id),
                label: text(currency.code || currency.name || currency.id),
            })).filter((option) => option.value),
            getValue: (account) => text(account.currency_id || account.currency),
            getDisplayValue: (account) => text(account.currency_id || account.currency || '-'),
            renderCell: (account) => (
                <span className="inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1 font-mono text-xs font-extrabold text-emerald-700">
                    {account.currency_id || account.currency || '-'}
                </span>
            ),
        },
        {
            key: 'account_number',
            label: 'رقم الحساب',
            type: 'text',
            filterType: 'text',
            width: 160,
            defaultVisible: true,
            align: 'left',
            getValue: (account) => account.account_number || '',
            getDisplayValue: (account) => text(account.account_number || '-'),
            renderCell: (account) => <span className="font-mono text-sm text-slate-700" dir="ltr">{account.account_number || '-'}</span>,
        },
        {
            key: 'iban',
            label: 'IBAN',
            type: 'text',
            filterType: 'text',
            width: 210,
            defaultVisible: true,
            align: 'left',
            getValue: (account) => account.iban || '',
            getDisplayValue: (account) => text(account.iban || '-'),
            renderCell: (account) => (
                <span className={`font-mono text-xs ${account.iban ? 'text-slate-600' : 'text-slate-300'}`} dir="ltr">
                    {account.iban || '-'}
                </span>
            ),
        },
        {
            key: 'gl_account',
            label: 'حساب GL',
            type: 'text',
            filterType: 'text',
            width: 230,
            defaultVisible: true,
            align: 'right',
            getValue: (account) => `${account.gl_account_code || ''} ${account.gl_account_name || ''} ${account.gl_account_id || ''}`,
            getDisplayValue: (account) => text(account.gl_account_name || account.gl_account_id || 'غير مربوط'),
            renderCell: (account) => account.gl_account_id ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span className="truncate">{account.gl_account_code ? `${account.gl_account_code} - ` : ''}{account.gl_account_name || account.gl_account_id}</span>
                </span>
            ) : (
                <span className="text-xs italic text-slate-300">غير مربوط</span>
            ),
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 120,
            defaultVisible: true,
            align: 'center',
            getValue: (account) => (isActive(account.is_active) ? 1 : 0),
            getDisplayValue: (account) => (isActive(account.is_active) ? 'نشط' : 'غير نشط'),
            renderCell: (account) => (
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${isActive(account.is_active) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                    {isActive(account.is_active) ? 'نشط' : 'غير نشط'}
                </span>
            ),
        },
        {
            key: 'sub_account',
            label: 'الحساب الفرعي',
            type: 'text',
            filterType: 'text',
            width: 190,
            defaultVisible: false,
            align: 'right',
            getValue: (account) => `${account.sub_account_code || ''} ${account.sub_account_name || ''}`,
            getDisplayValue: (account) => text(account.sub_account_name || account.sub_account_code || '-'),
        },
        {
            key: 'actions',
            label: 'الإجراءات',
            width: 120,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (account) => (
                <div className="flex justify-center gap-1.5">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(account);
                        }}
                        className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                        title="تعديل"
                        aria-label="تعديل"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            void deleteAccounts([account]);
                        }}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        title="حذف"
                        aria-label="حذف"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ], [currencies, deleteAccounts, openEditModal]);

    return (
        <div className="h-full overflow-auto bg-slate-50 p-6 font-sans" dir="rtl">
            <DefinitionMasterList
                headerIcon={<Building className="h-5 w-5" />}
                headerTitle="حساباتنا في البنوك"
                headerSubtitle="إدارة الحسابات البنكية وربطها بالحسابات العامة والعملات بنفس خصائص الجداول الموحدة."
                headerBadges={[
                    { label: `${accounts.length} حساب`, tone: 'info', mono: true },
                    { label: `${headerStats.active} نشط`, tone: 'success', mono: true },
                    { label: `${headerStats.linked} مربوط`, tone: 'neutral', mono: true },
                    { label: `${headerStats.currenciesCount} عملات`, tone: 'warning', mono: true },
                ]}
                screenKey="banking.our-accounts"
                data={accounts}
                loading={loading}
                columns={columns}
                rowKey={(account) => String(account.id || account.code || account.account_number)}
                searchPlaceholder="بحث باسم الحساب أو البنك أو رقم الحساب أو IBAN..."
                emptyMessage="لا توجد حسابات بنكية مطابقة للمعايير الحالية"
                createLabel="إضافة حساب جديد"
                onCreate={openCreateModal}
                onEdit={openEditModal}
                onDelete={deleteAccounts}
                onRefresh={fetchData}
                onRowDoubleClick={openEditModal}
                defaultSort={{ key: 'bank_name', direction: 'asc' }}
            />

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
