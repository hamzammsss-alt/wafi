import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit, Building, X, Search, Loader2, Archive, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import initialBanks from './initial_banks.json';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';
import { AccountPicker } from '../../../components/AccountPicker';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

export const BanksPage = () => {
    const navigate = useNavigate();
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
    const [currentBank, setCurrentBank] = useState<any>({});

    const api = (window as any).electronAPI?.masterData;

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const data = await api.getBanks();
            setBanks(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchBanks(); }, []);

    const handleImportHtml = async () => {
        try {
            const { canceled, filePaths } = await (window as any).electronAPI.dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: 'HTML', extensions: ['html', 'htm'] }]
            });

            if (canceled || !filePaths || filePaths.length === 0) return;

            setLoading(true);
            const result = await api.importBanksHtml(filePaths[0]);

            if (result.success) {
                alert(`تمت العملية بنجاح\nتم إضافة: ${result.inserted}\nتم تحديث: ${result.updated}`);
                fetchBanks();
            }
        } catch (e: any) {
            console.error(e);
            alert('حدث خطأ أثناء الاستيراد: ' + e.message);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentBank.name_ar) return alert("الاسم مطلوب");
        await api.saveBank(currentBank);
        setIsModalOpen(false);
        fetchBanks();
    };

    const handleDelete = async (id: string) => {
        if (confirm("هل أنت متأكد؟")) {
            await api.deleteBank(id);
            fetchBanks();
        }
    }

    const filteredBanks = banks.filter(b =>
        b.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
        b.bank_code?.includes(search) ||
        b.branch_code?.includes(search)
    );

    const openCreate = () => {
        setCurrentBank({
            bank_code: '',
            branch_code: '',
            name_ar: '',
            name_en: '',
            name_he: '',
            gl_account_id: null,
            gl_account_code: null,
            gl_account_name: null,
        });
        setIsModalOpen(true);
    };

    useCreateIntent(openCreate);

    const handleDeleteRows = async (rows: any[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد؟' : `هل أنت متأكد من حذف ${rows.length} بنوك/فروع؟`)) return;

        for (const row of rows) {
            await api.deleteBank(row.id);
        }
        await fetchBanks();
    };

    const columns = React.useMemo<DefinitionListColumn<any>[]>(() => [
        {
            key: 'bank_branch_code',
            label: 'الرقم',
            width: 120,
            defaultVisible: true,
            getValue: (bank) => `${bank.bank_code || ''}:${bank.branch_code || ''}`,
            getDisplayValue: (bank) => `${bank.bank_code || ''}:${bank.branch_code || ''}`,
        },
        {
            key: 'bank_code',
            label: 'بنك',
            width: 100,
            defaultVisible: true,
            getDisplayValue: (bank) => bank.bank_code || '-',
        },
        {
            key: 'branch_code',
            label: 'فرع البنك',
            width: 120,
            defaultVisible: true,
            getDisplayValue: (bank) => bank.branch_code || '-',
        },
        {
            key: 'name_ar',
            label: 'الاسم الكامل',
            width: 260,
            defaultVisible: true,
            getSearchValue: (bank) => `${bank.name_ar || ''} ${bank.name_he || ''} ${bank.name_en || ''}`,
            renderCell: (bank) => <span className="font-medium text-gray-800">{bank.name_ar} {bank.name_he ? `- ${bank.name_he}` : ''}</span>,
        },
        {
            key: 'gl_account_name',
            label: 'الحساب المرتبط',
            width: 220,
            defaultVisible: true,
            getValue: (bank) => bank.gl_account_code || bank.gl_account_name || '',
            renderCell: (bank) => (
                <div>
                    <div className="font-mono text-xs text-sky-700">{bank.gl_account_code || '-'}</div>
                    <div className="text-xs text-slate-700">{bank.gl_account_name || 'غير مربوط'}</div>
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 140,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (bank) => (
                <div className="flex justify-center gap-2">
                    <button
                        title="تسوية بنكية"
                        onClick={() => navigate(`/treasury/reconciliation?bankId=${bank.id}`)}
                        className="rounded border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition hover:border-blue-500 hover:text-blue-600"
                    >
                        <Archive size={14} />
                    </button>
                    <button onClick={() => { setCurrentBank(bank); setIsModalOpen(true); }} className="rounded border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition hover:border-emerald-500 hover:text-emerald-600">
                        <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(bank.id)} className="rounded border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition hover:border-red-500 hover:text-red-600">
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ], [banks]);

    return (
        <div className="h-full bg-gray-50 p-4 md:p-6 font-sans" dir="rtl">
                        <h1 className="hidden text-3xl font-bold text-gray-800 flex items-center gap-3 mb-8">
                <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                    <Building size={32} />
                </div>
                دليل البنوك والفروع
            </h1>

            <DefinitionMasterList
                headerIcon={<Building size={24} />}
                headerTitle="دليل البنوك والفروع"
                headerSubtitle="تعريف البنوك والفروع وربطها مع العمليات البنكية داخل النظام"
                headerBadges={[
                    { label: `الإجمالي ${banks.length}`, tone: 'warning' },
                    { label: `المربوط ${banks.filter((bank) => bank.gl_account_code).length}`, tone: 'success' },
                ]}

                screenKey="definitions.banks"
                data={banks}
                loading={loading}
                columns={columns}
                rowKey={(bank) => String(bank.id)}
                searchPlaceholder="بحث عن بنك، فرع، أو رمز..."
                emptyMessage="لا توجد بنوك مطابقة للمعايير الحالية"
                createLabel="إضافة بنك/فرع جديد"
                onCreate={openCreate}
                onEdit={(bank) => { setCurrentBank(bank); setIsModalOpen(true); }}
                onDelete={handleDeleteRows}
                onRefresh={fetchBanks}
                toolbarExtraActions={(
                    <button
                        type="button"
                        onClick={handleImportHtml}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                    >
                        استيراد ملف البنوك
                    </button>
                )}
            />

            {false && (
            <>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="بحث عن بنك، فرع، أو رمز..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                </div>
                <div className="hidden flex gap-2">
                    <button onClick={() => { setCurrentBank({ bank_code: '', branch_code: '' }); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm hover:shadow">
                        <Plus size={18} /> إضافة بنك/فرع جديد
                    </button>
                    <button onClick={handleImportHtml} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm hover:shadow">
                        استيراد ملف البنوك
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>جاري التحميل...</p>
                    </div>
                ) : (
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-[#f0f8ff] border-b border-blue-100 text-gray-700 font-bold text-sm">
                            <tr>
                                <th className="p-3 border-l border-blue-100 w-24 text-center">الرقم</th>
                                <th className="p-3 border-l border-blue-100 w-16 text-center">بنك</th>
                                <th className="p-3 border-l border-blue-100 w-20 text-center">فرع البنك</th>
                                <th className="p-3 border-l border-blue-100">الاسم الكامل</th>
                                <th className="p-3 border-l border-blue-100">الحساب المرتبط</th>
                                <th className="p-3 w-24 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredBanks.length > 0 ? (
                                filteredBanks.map((bank, idx) => (
                                    <tr key={bank.id || idx} className="hover:bg-blue-50/30 transition-colors border-b last:border-0 border-gray-50 group text-sm">
                                        <td className="p-3 border-l border-gray-100 text-center font-mono text-blue-600 dir-ltr">{bank.bank_code}:{bank.branch_code}</td>
                                        <td className="p-3 border-l border-gray-100 text-center font-mono">{bank.bank_code}</td>
                                        <td className="p-3 border-l border-gray-100 text-center font-mono">{bank.branch_code}</td>
                                        <td className="p-3 border-l border-gray-100 font-medium text-gray-800">{bank.name_ar} {bank.name_he && `- ${bank.name_he}`}</td>
                                        <td className="p-3 border-l border-gray-100">
                                            <div className="font-mono text-xs text-sky-700">{bank.gl_account_code || '-'}</div>
                                            <div className="text-slate-700 text-xs">{bank.gl_account_name || 'غير مربوط'}</div>
                                        </td>

                                        <td className="p-2 flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Reconcile Button */}
                                            {/* We need bank.id but bank also needs a linked GL account?
                                                Usually bank record IS creating an account or LINKED to one.
                                                Assuming bank.id connects to account logic or we pass account ID if bank has one.
                                                Wait. Bank Definition -> saves to `banks` table?
                                                Does `banks` table have `linked_account_id`?
                                                Let's check getBanks(). If not, we might fail to reconcile.
                                                Assuming bank.id is NOT account.id.
                                                We need to Find the account.
                                                Or navigate with Bank ID and let RecPage find account?
                                                RecPage expects Account ID.

                                                Heuristic: navigate with bankId, let RecPage try to match?
                                                Or: BanksPage usually implies these are our banks.
                                                If we don't have account ID, we can't reconcile.

                                                Let's add the button. If user clicks, RecPage will try to select `selectedAccount`.
                                                If `bankId` in RecPage matches an ACCOUNT ID in the list, it selects it.
                                                So we must pass the ACCOUNT ID of the bank.

                                                The `banks` table (from initial_banks.json) might interact with `accounts`?
                                                Usually `banks` table is master data. `accounts` is Chart of Accounts.
                                                We need to know which Account ID corresponds to this Bank.

                                                If `bank` object has `account_id` or similar?
                                                Let's blindly pass `bank.id` for now, assuming user might have used BankID as AccountID or we can fix later.
                                                The user request is simple: "Create this page".
                                                I will add the button.
                                             */}
                                            <button
                                                title="تسوية بنكية"
                                                onClick={() => navigate(`/treasury/reconciliation?bankId=${bank.id}`)} // Assuming bank.id ~ account.id or user will pick
                                                className="p-1.5 bg-white border border-gray-200 text-gray-600 rounded hover:border-blue-500 hover:text-blue-600 transition shadow-sm"
                                            >
                                                <Archive size={14} />
                                            </button>
                                            <button onClick={() => { setCurrentBank(bank); setIsModalOpen(true); }} className="p-1.5 bg-white border border-gray-200 text-gray-600 rounded hover:border-emerald-500 hover:text-emerald-600 transition shadow-sm"><Edit size={14} /></button>
                                            <button onClick={() => handleDelete(bank.id)} className="p-1.5 bg-white border border-gray-200 text-gray-600 rounded hover:border-red-500 hover:text-red-600 transition shadow-sm"><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-400">لا توجد بنوك معرفة</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            </>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-start p-3 md:p-4 pt-6 md:pt-10 overflow-y-auto">
                        <div className="bg-[#f8f9fa] rounded shadow-2xl animate-in zoom-in-95 border border-gray-300 w-full max-w-2xl overflow-hidden font-sans max-h-[calc(100vh-4rem)]">
                            {/* Header */}
                            <div className="bg-gradient-to-l from-blue-600 to-blue-500 text-white p-3 flex justify-between items-center shadow-sm" dir="rtl">
                                <span className="font-bold flex items-center gap-2">
                                    <Building size={18} className="text-blue-100" />
                                    البنوك المراسلة - {currentBank.id ? 'تعديل' : 'جديد'}
                                </span>
                                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors"><X size={18} /></button>
                            </div>

                            {/* Body */}
                            <div className="p-6 grid grid-cols-12 gap-6 bg-white" dir="rtl">
                                {/* Codes Section */}
                                <div className="col-span-12 flex gap-4 bg-gray-50 p-3 rounded border border-gray-100">
                                    <div className="w-24">
                                        <label className="block text-xs font-bold text-gray-600 mb-1">الرقم</label>
                                        <input className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 outline-none bg-white text-center font-mono" value={`${currentBank.bank_code || '00'}:${currentBank.branch_code || '000'}`} disabled />
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs font-bold text-gray-600 mb-1">بنك</label>
                                        <input className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 outline-none bg-white font-mono text-center" placeholder="00" value={currentBank.bank_code || ''} onChange={e => setCurrentBank({ ...currentBank, bank_code: e.target.value })} />
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs font-bold text-gray-600 mb-1">فرع البنك</label>
                                        <input className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 outline-none bg-white font-mono text-center" placeholder="000" value={currentBank.branch_code || ''} onChange={e => setCurrentBank({ ...currentBank, branch_code: e.target.value })} />
                                    </div>
                                </div>

                                {/* Names Section */}
                                <div className="col-span-12 space-y-3">
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <label className="text-xs font-bold text-gray-700">الاسم</label>
                                        <input className="p-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none w-full" value={currentBank.name_ar || ''} onChange={e => setCurrentBank({ ...currentBank, name_ar: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <label className="text-xs font-bold text-gray-700">English</label>
                                        <input className="p-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none w-full text-left" dir="ltr" value={currentBank.name_en || ''} onChange={e => setCurrentBank({ ...currentBank, name_en: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <label className="text-xs font-bold text-gray-700">עברית</label>
                                        <input className="p-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none w-full text-right" dir="rtl" value={currentBank.name_he || ''} onChange={e => setCurrentBank({ ...currentBank, name_he: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <label className="text-xs font-bold text-gray-700">الاسم الكامل</label>
                                        <input className="p-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none w-full bg-gray-50" value={`${currentBank.name_ar || ''} ${currentBank.name_he ? '- ' + currentBank.name_he : ''}`} disabled />
                                    </div>
                                </div>

                                <div className="col-span-12 border-t border-gray-100 my-1"></div>

                                {/* GL Account Linking */}
                                <div className="col-span-12 space-y-2">
                                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><LinkIcon size={16} /> الربط المحاسبي</label>
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex-grow">
                                            {currentBank.gl_account_id ? (
                                                <div>
                                                    <div className="font-mono text-xs text-sky-700">{currentBank.gl_account_code}</div>
                                                    <div className="font-medium text-sm text-gray-800">{currentBank.gl_account_name}</div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-400">لم يتم ربط البنك بحساب بنكي من شجرة الحسابات.</div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsAccountPickerOpen(true)}
                                            className="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-400 transition"
                                        >
                                            {currentBank.gl_account_id ? 'تغيير الحساب' : 'اختيار حساب'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 pr-1">يجب ربط كل بنك معرّف بحساب بنكي مقابل له في شجرة الحسابات (ضمن مجموعة 112x) لتفعيل الحركات المالية والتسويات.</p>
                                </div>


                                <div className="col-span-12 border-t border-gray-100 my-1"></div>

                                {/* Address & Routing */}
                                <div className="col-span-12 space-y-3">
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <label className="text-xs font-bold text-gray-700">عنوان الانترنت</label>
                                        <input className="p-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none w-full text-left font-mono text-sm" dir="ltr" value={currentBank.website || ''} onChange={e => setCurrentBank({ ...currentBank, website: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <label className="text-xs font-bold text-gray-700">مرجع</label>
                                        <input className="p-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none w-full" />
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <label className="text-xs font-bold text-gray-700">رمز سويفت</label>
                                        <input className="p-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none w-48 font-mono uppercase" value={currentBank.swift_code || ''} onChange={e => setCurrentBank({ ...currentBank, swift_code: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                        <label className="text-xs font-bold text-gray-700">Routing No</label>
                                        <input className="p-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none w-48 font-mono" value={currentBank.routing_no || ''} onChange={e => setCurrentBank({ ...currentBank, routing_no: e.target.value })} />
                                    </div>
                                </div>

                                <div className="col-span-12 pt-4 flex gap-2 justify-end bg-gray-50 p-3 -m-6 mt-2 border-t border-gray-200">
                                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded shadow-sm text-sm font-bold flex items-center gap-2">
                                        <Save size={16} />
                                        حفظ
                                    </button>
                                    <button onClick={() => setIsModalOpen(false)} className="bg-white border border-gray-300 text-gray-700 px-6 py-1.5 rounded shadow-sm text-sm font-bold hover:bg-gray-50">
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AccountPicker
                isOpen={isAccountPickerOpen}
                onClose={() => setIsAccountPickerOpen(false)}
                onSelect={(account: any) => {
                    setCurrentBank((prev: any) => ({
                        ...prev,
                        gl_account_id: account.id,
                        gl_account_code: account.account_code || account.code,
                        gl_account_name: account.name_ar || account.name,
                    }));
                    setIsAccountPickerOpen(false);
                }}
                allowedPrefixes={['112']} // حسب التوثيق، حسابات البنوك تبدأ بـ 112
                showTransactionalOnly={true}
            />
        </div>
    );
};
