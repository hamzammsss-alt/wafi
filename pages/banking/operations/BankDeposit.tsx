import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Landmark, RefreshCw, Save, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentSupportDock } from '../../../src/components/workspace/DocumentSupportDock';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { getBankDepositSupportSections } from '../../../src/components/workspace/documentSupportSections';
import { useEnterNavigation } from '../../../src/hooks/useEnterNavigation';

type BankAccountOption = {
    id: string;
    account_name?: string;
    bank_name?: string;
    account_number?: string;
    currency_id?: string;
};

type ChequeRow = {
    id: string;
    cheque_no?: string;
    check_number?: string;
    bank_name?: string;
    amount?: number;
    currency_id?: string;
    due_date?: string;
    partner_name?: string;
    customer_name?: string;
    payee_name?: string;
    status?: string;
};

const ON_HAND_STATUSES = new Set(['ON_HAND', 'HOLDING', 'IN_SAFE', 'HOLDING_RECEIVED']);

function normalizeText(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

function onlyDate(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return raw.includes('T') ? raw.split('T')[0] : raw;
}

function chequeNumber(row: ChequeRow): string {
    return String(row.cheque_no || row.check_number || '').trim();
}

function chequePartner(row: ChequeRow): string {
    return String(row.partner_name || row.customer_name || row.payee_name || '').trim();
}

function statusLabel(status: unknown): string {
    const value = String(status || '').trim().toUpperCase();
    if (value === 'ON_HAND' || value === 'HOLDING' || value === 'IN_SAFE') return 'جاهز للإيداع';
    if (value === 'UNDER_COLLECTION' || value === 'DEPOSITED') return 'تم إيداعه';
    if (value === 'CLEARED' || value === 'COLLECTED') return 'محصل';
    if (value === 'BOUNCED' || value === 'RETURNED') return 'راجع';
    return value || '-';
}

function statusClass(status: unknown): string {
    const value = String(status || '').trim().toUpperCase();
    if (value === 'UNDER_COLLECTION' || value === 'DEPOSITED') return 'bg-sky-100 text-sky-700';
    if (value === 'CLEARED' || value === 'COLLECTED') return 'bg-emerald-100 text-emerald-700';
    if (value === 'BOUNCED' || value === 'RETURNED') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
}

export const BankDeposit = () => {
    const navigate = useNavigate();
    const pageRef = useRef<HTMLDivElement | null>(null);
    const helperSections = useMemo(() => getBankDepositSupportSections(), []);

    useEnterNavigation(pageRef);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
    const [cheques, setCheques] = useState<ChequeRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
    const [bankAccountId, setBankAccountId] = useState('');
    const [reason, setReason] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            const [accountsRes, chequesRes] = await Promise.all([
                api?.masterData?.getBankAccounts?.() || Promise.resolve([]),
                api?.cheques?.getCheques?.({ type: 'INCOMING' }) || Promise.resolve([]),
            ]);

            const resolvedAccounts = Array.isArray(accountsRes) ? accountsRes : [];
            const rawCheques = Array.isArray(chequesRes) ? chequesRes : [];
            const resolvedCheques = rawCheques.filter((row: any) => {
                const status = String(row?.status || '').trim().toUpperCase();
                return ON_HAND_STATUSES.has(status);
            });

            setBankAccounts(resolvedAccounts);
            setCheques(resolvedCheques);
            setSelectedIds((prev) => prev.filter((id) => resolvedCheques.some((row: any) => String(row?.id) === id)));

            if (!bankAccountId && resolvedAccounts.length > 0) {
                setBankAccountId(String(resolvedAccounts[0].id || ''));
            }
        } catch (error) {
            console.error('Failed to load bank deposit data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const filteredCheques = useMemo(() => {
        const query = normalizeText(search);
        if (!query) return cheques;

        return cheques.filter((row) => {
            const haystack = [
                chequeNumber(row),
                row.bank_name,
                chequePartner(row),
                row.currency_id,
                row.status,
                onlyDate(row.due_date),
            ].map(normalizeText);

            return haystack.some((value) => value.includes(query));
        });
    }, [cheques, search]);

    const selectedCheques = useMemo(
        () => cheques.filter((row) => selectedIds.includes(String(row.id))),
        [cheques, selectedIds],
    );

    const selectedTotal = useMemo(
        () => selectedCheques.reduce((sum, row) => sum + Number(row.amount || 0), 0),
        [selectedCheques],
    );

    const selectedBankAccount = bankAccounts.find((account) => String(account.id) === String(bankAccountId || ''));
    const allVisibleSelected = filteredCheques.length > 0 && filteredCheques.every((row) => selectedIds.includes(String(row.id)));

    const toggleCheque = (id: string) => {
        setSelectedIds((prev) => (
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        ));
    };

    const toggleVisible = () => {
        if (allVisibleSelected) {
            setSelectedIds((prev) => prev.filter((id) => !filteredCheques.some((row) => String(row.id) === id)));
            return;
        }

        setSelectedIds((prev) => {
            const merged = new Set(prev);
            filteredCheques.forEach((row) => merged.add(String(row.id)));
            return Array.from(merged);
        });
    };

    const handleDeposit = async () => {
        if (!bankAccountId) {
            alert('الرجاء اختيار الحساب البنكي الذي سيتم الإيداع فيه.');
            return;
        }
        if (selectedIds.length === 0) {
            alert('الرجاء تحديد شيك واحد على الأقل للإيداع.');
            return;
        }

        setSaving(true);
        try {
            const api = (window as any).electronAPI;
            for (const chequeId of selectedIds) {
                if (api?.treasuryCheque?.deposit) {
                    await api.treasuryCheque.deposit({
                        chequeId,
                        bankAccountId,
                        date: depositDate,
                        reason: reason || null,
                    });
                } else if (api?.cheques?.updateStatus) {
                    await api.cheques.updateStatus({
                        id: chequeId,
                        status: 'UNDER_COLLECTION',
                        date: depositDate,
                        options: {
                            bankAccountId,
                            reason,
                        },
                    });
                } else {
                    throw new Error('خدمة إيداع الشيكات غير متاحة حالياً.');
                }
            }

            alert(`تم إيداع ${selectedIds.length} شيك بنجاح.`);
            setSelectedIds([]);
            setReason('');
            await loadData();
        } catch (error: any) {
            console.error('Bank deposit failed:', error);
            alert(`فشل تنفيذ الإيداع: ${error?.message || 'خطأ غير معروف'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div ref={pageRef} className="flex flex-col h-full bg-slate-50 p-4 md:p-6" dir="rtl">
            <div className="max-w-[1500px] mx-auto w-full space-y-5">
                <WorkspaceHeader
                    icon={<Landmark size={22} />}
                    title="سند إيداع بنكي"
                    subtitle="إيداع الشيكات الجاهزة في الحساب البنكي المختار من خلال جدول سريع وسهل التنقل."
                    badges={[
                        { label: `${selectedIds.length} محدد`, tone: 'info' },
                        { label: `${selectedTotal.toLocaleString()} إجمالي`, tone: 'success' },
                    ]}
                    actions={(
                        <>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="app-toolbar-btn app-focus-ring"
                            >
                                <ArrowRight size={16} />
                                <span>رجوع</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => void loadData()}
                                className="app-toolbar-btn app-focus-ring"
                            >
                                <RefreshCw size={16} />
                                <span>تحديث</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDeposit()}
                                disabled={saving || selectedIds.length === 0 || !bankAccountId}
                                className="rounded-xl bg-gradient-to-r from-teal-600 to-sky-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Save size={16} />
                                    <span>{saving ? 'جاري الإيداع...' : 'تنفيذ الإيداع'}</span>
                                </span>
                            </button>
                        </>
                    )}
                />

                <DocumentSupportDock
                    sections={helperSections}
                    title="تعريفات الإيداع البنكي"
                    description="افتح محفظة الشيكات والحسابات البنكية والبنوك من فوق سند الإيداع مباشرة."
                />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-sm font-extrabold text-slate-800 mb-4">بيانات الإيداع</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الحساب البنكي</label>
                                    <select
                                        value={bankAccountId}
                                        onChange={(event) => setBankAccountId(event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    >
                                        <option value="">اختر الحساب البنكي...</option>
                                        {bankAccounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.account_name || account.bank_name || account.account_number || account.id}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedBankAccount && (
                                        <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                            <div>{selectedBankAccount.bank_name || '-'}</div>
                                            <div className="font-mono">{selectedBankAccount.account_number || '-'}</div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ الإيداع</label>
                                    <input
                                        type="date"
                                        value={depositDate}
                                        onChange={(event) => setDepositDate(event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">ملاحظة / سبب</label>
                                    <textarea
                                        value={reason}
                                        onChange={(event) => setReason(event.target.value)}
                                        rows={4}
                                        placeholder="ملاحظة اختيارية تظهر مع حركة الإيداع..."
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="text-xs font-bold text-slate-400">عدد الشيكات المحددة</div>
                                <div className="mt-2 text-2xl font-extrabold text-slate-900">{selectedIds.length}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="text-xs font-bold text-slate-400">إجمالي المحدد</div>
                                <div className="mt-2 text-2xl font-extrabold text-emerald-700">{selectedTotal.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[520px] flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-800">الشيكات الجاهزة للإيداع</h2>
                                <p className="mt-1 text-xs text-slate-500">حدد الشيكات ثم نفّذ الإيداع دفعة واحدة.</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="بحث برقم الشيك أو البنك أو الجهة..."
                                    className="w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">
                                            <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} />
                                        </th>
                                        <th className="px-4 py-3">رقم الشيك</th>
                                        <th className="px-4 py-3">الجهة</th>
                                        <th className="px-4 py-3">البنك</th>
                                        <th className="px-4 py-3">تاريخ الاستحقاق</th>
                                        <th className="px-4 py-3">المبلغ</th>
                                        <th className="px-4 py-3">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                                                جاري تحميل الشيكات...
                                            </td>
                                        </tr>
                                    ) : filteredCheques.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                                                لا توجد شيكات جاهزة للإيداع حالياً.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCheques.map((row) => {
                                            const id = String(row.id);
                                            const selected = selectedIds.includes(id);
                                            return (
                                                <tr key={id} className={selected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleCheque(id)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{chequeNumber(row) || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-600">{chequePartner(row) || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-600">{row.bank_name || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-600">{onlyDate(row.due_date) || '-'}</td>
                                                    <td className="px-4 py-3 font-bold text-emerald-700">
                                                        {Number(row.amount || 0).toLocaleString()}
                                                        <span className="mr-2 text-xs text-slate-400">{row.currency_id || ''}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                                                            {statusLabel(row.status)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
