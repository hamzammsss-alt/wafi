import React, { useState, useEffect, useRef } from 'react';
import {
    Save, Printer, Plus, Trash2, Calendar, FileText,
    ArrowRight, Calculator, Hash, CreditCard, Search,
    ChevronDown, Menu
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { toArabicWords } from '../../../src/utils/tafqeet';
import { useEnterNavigation } from '../../../src/hooks/useEnterNavigation';

// --- Interfaces ---
interface JournalHeader {
    voucherNo: string;
    manualRef: string;
    date: string;
    currency: string;
    rate: number;
    branchId: string;
    costCenterId: string;
    description: string;
    status: 'Posted' | 'Draft';
}

interface JournalLine {
    id: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    description: string;
    costCenterId: string;
    debit: number;
    credit: number;
    fcAmount: number;
    fcCurrency: string;
    fcRate: number;
    key?: string; // For react keys
}

interface Account {
    id: string;
    account_code: string;
    name_ar: string;
    name_en: string;
    currency_id: string;
}

type JournalLineField = 'accountCode' | 'description' | 'costCenterId' | 'debit' | 'credit';

// --- Component ---
export const JournalVoucher = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');

    // Add Container Ref for Navigation
    const containerRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(containerRef);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Master Data
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [costCenters, setCostCenters] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);

    // Form State
    const [header, setHeader] = useState<JournalHeader>({
        voucherNo: 'NEW',
        manualRef: '',
        date: new Date().toISOString().split('T')[0],
        currency: 'ILS',
        rate: 1,
        branchId: '',
        costCenterId: '',
        description: '',
        status: 'Draft'
    });

    const [lines, setLines] = useState<JournalLine[]>([
        { id: uuidv4(), accountId: '', accountCode: '', accountName: '', description: '', costCenterId: '', debit: 0, credit: 0, fcAmount: 0, fcCurrency: 'ILS', fcRate: 1 }
    ]);

    // Account Search State
    const [accountSearchOpen, setAccountSearchOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Load Data ---
    useEffect(() => {
        loadMasterData();
    }, [id]); // Reload if ID changes

    const loadMasterData = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (!api) return;

            const [accs, brs, ccs, currs, nextNo] = await Promise.all([
                api.getAccounts(),
                api.masterData.getBranches(),
                api.masterData.getCostCenters(),
                api.currency.getCurrencies(),
                api.journal.getNextVoucherNo('JV')
            ]);

            setAccounts(accs?.filter((a: any) => a.is_transactional) || []);
            setBranches(brs || []);
            setCostCenters(ccs || []);
            setCurrencies(currs || []);

            const mainBranch = brs?.find((b: any) => b.is_main);

            if (!id || id === 'new') {
                setHeader(h => ({
                    ...h,
                    voucherNo: nextNo,
                    branchId: mainBranch ? mainBranch.id : (brs?.[0]?.id || '')
                }));
                // Initialize with 2 empty lines
                setLines([
                    { id: uuidv4(), accountId: '', accountCode: '', accountName: '', description: '', costCenterId: '', debit: 0, credit: 0, fcAmount: 0, fcCurrency: 'ILS', fcRate: 1 },
                    { id: uuidv4(), accountId: '', accountCode: '', accountName: '', description: '', costCenterId: '', debit: 0, credit: 0, fcAmount: 0, fcCurrency: 'ILS', fcRate: 1 }
                ]);
            } else {
                // Load existing entry
                const entry = await api.journal.getEntry(id);
                if (entry) {
                    setHeader({
                        voucherNo: entry.voucher_no,
                        manualRef: entry.reference_no || '',
                        date: entry.date,
                        currency: entry.currency_id || 'ILS',
                        rate: entry.exchange_rate || 1,
                        branchId: entry.branch_id || '',
                        costCenterId: entry.cost_center_id || '',
                        description: entry.description || '',
                        status: entry.status
                    });
                    if (entry.lines && entry.lines.length > 0) {
                        setLines(entry.lines.map((l: any) => ({
                            id: l.id || uuidv4(),
                            accountId: l.account_id,
                            accountCode: l.account_code || '',
                            accountName: l.account_name || '',
                            description: l.line_description || '',
                            costCenterId: l.cost_center_id || '',
                            debit: l.debit || 0,
                            credit: l.credit || 0,
                            fcAmount: l.fc_amount || 0,
                            fcCurrency: l.fc_currency_id || 'ILS',
                            fcRate: l.exchange_rate || 1
                        })));
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- Calculations ---
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    const difference = totalDebit - totalCredit;
    const isBalanced = Math.abs(difference) < 0.01;

    const updateLine = (id: string, field: keyof JournalLine, value: any) => {
        setLines(prev => prev.map(l => {
            if (l.id !== id) return l;

            const updated = { ...l, [field]: value };

            if (field === 'debit' && value > 0) updated.credit = 0;
            if (field === 'credit' && value > 0) updated.debit = 0;

            return updated;
        }));
    };

    const handleAccountCodeBlur = (lineId: string, code: string) => {
        if (!code) return;

        // Find account by code
        const acc = accounts.find(a => a.account_code === code);

        setLines(prev => prev.map(l => {
            if (l.id !== lineId) return l;

            if (acc) {
                return {
                    ...l,
                    accountId: acc.id,
                    accountCode: acc.account_code,
                    accountName: acc.name_ar || acc.name_en,
                    fcCurrency: acc.currency_id || 'ILS'
                };
            } else {
                return {
                    ...l,
                    accountId: '',
                    accountName: '--- حساب غير موجود ---',
                };
            }
        }));
    };

    const handleAccountSelect = (account: Account) => {
        if (!activeLineId) return;
        setLines(prev => prev.map(l => {
            if (l.id !== activeLineId) return l;
            return {
                ...l,
                accountId: account.id,
                accountCode: account.account_code,
                accountName: account.name_ar || account.name_en,
                fcCurrency: account.currency_id || 'ILS'
            };
        }));
        setAccountSearchOpen(false);
        setActiveLineId(null);
        setSearchTerm('');
    };

    const addNewLine = () => {
        setLines(prev => [...prev, {
            id: uuidv4(), accountId: '', accountCode: '', accountName: '', description: header.description || '',
            costCenterId: header.costCenterId || '', debit: 0, credit: 0, fcAmount: 0, fcCurrency: 'ILS', fcRate: 1
        }]);
    };

    const focusLineField = (rowIndex: number, field: JournalLineField) => {
        const element = document.getElementById(`jv-${field}-${rowIndex}`) as
            | HTMLInputElement
            | HTMLSelectElement
            | null;
        if (!element) return;
        element.focus();
        if (element instanceof HTMLInputElement && element.type !== 'date' && element.type !== 'time') {
            element.select();
        }
    };

    const moveToNextLineField = (rowIndex: number, field: JournalLineField) => {
        if (field === 'accountCode') {
            window.setTimeout(() => focusLineField(rowIndex, 'description'), 0);
            return;
        }
        if (field === 'description') {
            window.setTimeout(() => focusLineField(rowIndex, 'costCenterId'), 0);
            return;
        }
        if (field === 'costCenterId') {
            window.setTimeout(() => focusLineField(rowIndex, 'debit'), 0);
            return;
        }
        if (field === 'debit') {
            window.setTimeout(() => focusLineField(rowIndex, 'credit'), 0);
            return;
        }

        const nextRowIndex = rowIndex + 1;
        if (rowIndex === lines.length - 1) {
            addNewLine();
            window.setTimeout(() => focusLineField(nextRowIndex, 'accountCode'), 40);
            return;
        }
        window.setTimeout(() => focusLineField(nextRowIndex, 'accountCode'), 0);
    };

    const handleLineEnter = (
        event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
        rowIndex: number,
        field: JournalLineField
    ) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        moveToNextLineField(rowIndex, field);
    };

    const removeLine = (id: string) => {
        if (lines.length > 2) {
            setLines(prev => prev.filter(l => l.id !== id));
        }
    };

    const handleSave = async (post: boolean = false) => {
        if (!isBalanced) { alert(`القيد غير متوازن. الفرق: ${difference.toFixed(2)}`); return; }
        if (lines.some(l => l.debit === 0 && l.credit === 0)) { alert('يجب إدخال مبالغ لجميع الأسطر'); return; }
        if (lines.some(l => !l.accountId)) { alert('يجب تحديد الحساب لجميع الأسطر'); return; }

        setSubmitting(true);
        try {
            const payload = {
                header: {
                    id: id || uuidv4(),
                    voucher_no: header.voucherNo,
                    voucher_type: 'JV',
                    date: header.date,
                    reference_no: header.manualRef,
                    description: header.description,
                    currency_id: header.currency,
                    exchange_rate: header.rate,
                    branch_id: header.branchId,
                    cost_center_id: header.costCenterId,
                    status: post ? 'Posted' : 'Draft'
                },
                lines: lines.map(l => ({
                    account_id: l.accountId,
                    debit: l.debit,
                    credit: l.credit,
                    line_description: l.description,
                    cost_center_id: l.costCenterId,
                    // FC logic can be expanded
                }))
            };

            const api = (window as any).electronAPI;

            const res = await api.journal.createEntry(
                { ...payload.header, id: undefined },
                payload.lines
            );

            if (res.success) {
                alert(`تم حفظ سند القيد بنجاح رقم ${res.voucher_no}`);
                navigate('/gl/journal-entries');
            }
        } catch (e: any) {
            console.error(e);
            alert(`خطأ في الحفظ: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrint = () => window.print();

    return (
        <div ref={containerRef} className="flex flex-col h-screen bg-gray-50/50" dir="rtl">
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .printable { display: block !important; }
                    body { background: white; }
                    @page { size: A4; margin: 10px; }
                }
                .printable { display: none; }
            `}</style>

            <div className="no-print h-full flex flex-col">
                {/* --- HEADER --- */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/gl/journal-entries')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <ArrowRight className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="w-7 h-7 text-indigo-600" />
                                سند قيد يومية (Journal Voucher)
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">تسجيل الحركات المالية اليدوية</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${isBalanced ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                            <span>{isBalanced ? 'متوازن' : 'غير متوازن'}</span>
                            {!isBalanced && <span>({difference.toFixed(2)})</span>}
                        </div>

                        <button onClick={handlePrint} className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors flex items-center gap-2">
                            <Printer className="w-5 h-5" />
                            <span className="hidden md:inline text-sm font-bold">طباعة</span>
                        </button>
                        <button
                            onClick={() => handleSave(true)}
                            disabled={submitting}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-indigo-500/20 transition-all ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30'
                                }`}
                        >
                            <Save className="w-5 h-5" />
                            <span>{submitting ? 'جاري الحفظ...' : 'حفظ وترحيل'}</span>
                        </button>
                    </div>
                </div>

                {/* --- CONTENT --- */}
                <div className="flex-1 overflow-auto p-6 space-y-6">

                    {/* 1. Header Fields */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                            <div className="md:col-span-1 space-y-4 border-l pl-6 border-gray-100">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">الرقم التسلسلي</label>
                                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                                        <span className="font-mono font-bold text-gray-700">{header.voucherNo}</span>
                                        <Hash className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">التاريخ</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={header.date}
                                            onChange={e => setHeader({ ...header, date: e.target.value })}
                                            className="w-full pl-3 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-gray-700"
                                        />
                                        <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-3 grid grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">المرجع اليدوي</label>
                                    <input
                                        type="text"
                                        value={header.manualRef}
                                        onChange={e => setHeader({ ...header, manualRef: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                                        placeholder="مرجع سندي / يدوي"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">البيان العام</label>
                                    <input
                                        type="text"
                                        value={header.description}
                                        onChange={e => setHeader({ ...header, description: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                                        placeholder="شرح عام للسند..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">الفرع</label>
                                    <select
                                        value={header.branchId}
                                        onChange={e => setHeader({ ...header, branchId: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm bg-white"
                                    >
                                        <option value="">تلقائي</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">مركز التكلفة (عام)</label>
                                    <select
                                        value={header.costCenterId}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setHeader({ ...header, costCenterId: val });
                                        }}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm bg-white"
                                    >
                                        <option value="">بدون مركز</option>
                                        {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name_ar}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">العملة</label>
                                    <select
                                        value={header.currency}
                                        onChange={e => {
                                            const curr = currencies.find(c => c.code === e.target.value);
                                            setHeader({ ...header, currency: e.target.value, rate: curr?.exchange_rate || 1 });
                                        }}
                                        className="w-full px-2 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm bg-white"
                                    >
                                        {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Items Grid */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-3">
                            <div className="col-span-2">رقم الحساب</div>
                            <div className="col-span-2">اسم الحساب</div>
                            <div className="col-span-3">البيان</div>
                            <div className="col-span-2">مركز التكلفة</div>
                            <div className="col-span-1 text-center">مدين</div>
                            <div className="col-span-2 text-center">دائن</div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {lines.map((line, index) => (
                                <div key={line.id} className="grid grid-cols-12 gap-3 items-center p-2 rounded-lg hover:bg-gray-50 group border border-transparent hover:border-gray-200 transition-all">
                                    {/* Account Code - Input for Number */}
                                    <div className="col-span-2 relative">
                                        <div className="flex items-center">
                                            <input
                                                id={`jv-accountCode-${index}`}
                                                data-enter-nav="manual"
                                                type="text"
                                                value={line.accountCode}
                                                onChange={(e) => updateLine(line.id, 'accountCode', e.target.value)}
                                                onBlur={(e) => handleAccountCodeBlur(line.id, e.target.value)}
                                                onKeyDown={(event) => handleLineEnter(event, index, 'accountCode')}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono text-sm h-10"
                                                placeholder="رقم الحساب"
                                            />
                                            <button
                                                onClick={() => { setActiveLineId(line.id); setAccountSearchOpen(true); }}
                                                className="p-2 text-gray-400 hover:text-indigo-600"
                                                tabIndex={-1}
                                            >
                                                <Search className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Account Name - Read Only */}
                                    <div className="col-span-2">
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 truncate h-10 flex items-center">
                                            {line.accountName || '---'}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="col-span-3">
                                        <input
                                            id={`jv-description-${index}`}
                                            data-enter-nav="manual"
                                            type="text"
                                            value={line.description}
                                            onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                                            onKeyDown={(event) => handleLineEnter(event, index, 'description')}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-sm h-10"
                                            placeholder="شرح الحركة..."
                                        />
                                    </div>

                                    {/* Cost Center */}
                                    <div className="col-span-2">
                                        <select
                                            id={`jv-costCenterId-${index}`}
                                            data-enter-nav="manual"
                                            value={line.costCenterId}
                                            onChange={(e) => updateLine(line.id, 'costCenterId', e.target.value)}
                                            onKeyDown={(event) => handleLineEnter(event, index, 'costCenterId')}
                                            className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-sm bg-white h-10"
                                        >
                                            <option value="">عام</option>
                                            {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name_ar}</option>)}
                                        </select>
                                    </div>

                                    {/* Debit */}
                                    <div className="col-span-1">
                                        <input
                                            id={`jv-debit-${index}`}
                                            data-enter-nav="manual"
                                            type="number"
                                            value={line.debit}
                                            onChange={(e) => updateLine(line.id, 'debit', Number(e.target.value))}
                                            onKeyDown={(event) => handleLineEnter(event, index, 'debit')}
                                            className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono font-bold text-center h-10"
                                            min="0"
                                        />
                                    </div>

                                    {/* Credit */}
                                    <div className="col-span-2 flex items-center gap-2">
                                        <input
                                            id={`jv-credit-${index}`}
                                            data-enter-nav="manual"
                                            type="number"
                                            value={line.credit}
                                            onChange={(e) => updateLine(line.id, 'credit', Number(e.target.value))}
                                            onKeyDown={(event) => handleLineEnter(event, index, 'credit')}
                                            className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono font-bold text-center h-10"
                                            min="0"
                                        />
                                        <button
                                            onClick={() => removeLine(line.id)}
                                            tabIndex={-1}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addNewLine}
                                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium mt-4"
                            >
                                <Plus className="w-4 h-4" />
                                <span>إضافة سطر جديد</span>
                            </button>
                        </div>

                        {/* Grid Footer Totals */}
                        <div className="bg-gray-50 border-t border-gray-200 p-4 grid grid-cols-12 gap-3 text-sm">
                            <div className="col-span-8 text-left pl-4 font-bold text-gray-500 pt-2">الإجمالي (Total)</div>
                            <div className="col-span-2 text-center bg-white border border-gray-200 rounded py-2 font-mono font-bold text-indigo-600 shadow-sm">
                                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="col-span-2 text-center bg-white border border-gray-200 rounded py-2 font-mono font-bold text-indigo-600 shadow-sm">
                                {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                </div>

                {/* --- FOOTER --- */}
                <div className="bg-white border-t border-gray-200 px-8 py-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex items-center justify-between">
                        <div className="text-gray-500 text-sm">
                            <span className="font-medium text-gray-900 ml-2">المبلغ كتابة:</span>
                            {totalDebit > 0 ? toArabicWords(totalDebit, header.currency) : '...'}
                        </div>
                    </div>
                </div>

            </div>

            {/* Modals */}
            {accountSearchOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Search className="w-5 h-5 text-indigo-600" />
                                دليل الحسابات
                            </h3>
                            <button onClick={() => setAccountSearchOpen(false)} className="text-gray-400 hover:text-red-500">إغلاق</button>
                        </div>
                        <div className="p-4 border-b border-gray-200">
                            <input
                                type="text"
                                placeholder="بحث بالاسم أو الرقم..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {accounts
                                .filter(a => a.name_ar.includes(searchTerm) || a.account_code.includes(searchTerm) || a.name_en?.includes(searchTerm))
                                .slice(0, 100)
                                .map((acc) => (
                                    <div
                                        key={acc.id}
                                        onClick={() => handleAccountSelect(acc)}
                                        className="flex items-center justify-between p-3 hover:bg-indigo-50 rounded-xl cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                                    >
                                        <div>
                                            <div className="font-bold text-gray-900">{acc.name_ar}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">{acc.account_code}</div>
                                        </div>
                                        <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                            {acc.currency_id || 'ILS'}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Print Template */}
            <div className="printable">
                <PrintTemplate header={header} lines={lines} total={totalDebit} />
            </div>

        </div>
    );
};

// --- PRINT TEMPLATE ---
const PrintTemplate = ({ header, lines, total }: any) => {
    return (
        <div className="p-10 border-2 border-gray-800 h-full flex flex-col justify-between text-gray-900 font-sans" dir="rtl">
            <div>
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-gray-800 pb-8 mb-8">
                    <div className="text-right">
                        <h1 className="text-4xl font-black text-gray-900 mb-2">سند قيد يومية</h1>
                        <h2 className="text-xl font-bold text-gray-600 uppercase tracking-widest">Journal Voucher</h2>
                    </div>
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300 mx-auto mb-2">
                            <FileText className="w-12 h-12 text-gray-400" />
                        </div>
                        <p className="font-bold text-lg">شركة وافي للتكنولوجيا</p>
                    </div>
                    <div className="text-left space-y-2">
                        <div className="flex items-center justify-end gap-3">
                            <span className="font-bold text-gray-900 text-xl font-mono">{header.voucherNo}</span>
                            <span className="text-gray-500 font-medium">:رقم السند</span>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <span className="font-medium text-xl text-gray-800">{header.date}</span>
                            <span className="text-gray-500 font-medium">:التاريخ</span>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <span className="text-xs font-bold text-gray-500 uppercase block mb-1">البيان (Description)</span>
                        <div className="font-medium text-gray-900">{header.description}</div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex-1">
                            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">العملة</span>
                            <div className="font-mono font-bold">{header.currency}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex-1">
                            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">المرجع</span>
                            <div className="font-mono">{header.manualRef || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Lines Table */}
                <div className="mb-8">
                    <table className="dense-table w-full">
                        <thead>
                            <tr className="bg-gray-900 text-white text-sm">
                                <th className="py-3 px-4 text-right rounded-tr-lg w-1/4">رقم الحساب</th>
                                <th className="py-3 px-4 text-right">اسم الحساب</th>
                                <th className="py-3 px-4 text-right w-1/3">البيان</th>
                                <th className="py-3 px-4 text-center w-32">مدين</th>
                                <th className="py-3 px-4 text-center w-32 rounded-tl-lg">دائن</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="py-3 px-4 font-mono text-gray-600">{line.accountCode}</td>
                                    <td className="py-3 px-4 font-bold text-gray-900">{line.accountName}</td>
                                    <td className="py-3 px-4 text-gray-600 text-sm">{line.description}</td>
                                    <td className="py-3 px-4 text-center font-mono font-bold">{line.debit > 0 ? Number(line.debit).toFixed(2) : '-'}</td>
                                    <td className="py-3 px-4 text-center font-mono font-bold">{line.credit > 0 ? Number(line.credit).toFixed(2) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100 border-t-2 border-gray-900">
                                <td colSpan={3} className="py-3 px-4 text-left font-bold text-gray-800">الإجمالي</td>
                                <td className="py-3 px-4 text-center font-bold font-mono text-lg">{total.toFixed(2)}</td>
                                <td className="py-3 px-4 text-center font-bold font-mono text-lg">{total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex items-center gap-2 text-gray-600 mt-4 bg-gray-50 p-3 rounded border border-gray-200">
                    <span className="font-bold">المبلغ كتابة: </span>
                    <span>{toArabicWords(total, header.currency)}</span>
                </div>
            </div>

            {/* Footer Signatures */}
            <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                <div className="border-t border-gray-300 pt-4">
                    <p className="font-bold text-gray-700">المدير المالي</p>
                </div>
                <div className="border-t border-gray-300 pt-4">
                    <p className="font-bold text-gray-700">المحاسب</p>
                </div>
                <div className="border-t border-gray-300 pt-4">
                    <p className="font-bold text-gray-700">المستلم</p>
                </div>
            </div>
        </div>
    );
};
