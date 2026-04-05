import React, { useState, useEffect, useRef } from 'react';
import {
    Save, Printer, Search, Plus, Trash2, ArrowRight, Banknote, Hash, Building2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedPartnerPicker, UnifiedPartner } from '../../../components/UnifiedPartnerPicker';
import { AccountPicker } from '../../../components/AccountPicker';
import { BankAccountSelect } from '../../../components/BankAccountSelect';
import { v4 as uuidv4 } from 'uuid';
import { toArabicWords } from '../../../src/utils/tafqeet';
import { useEnterNavigation } from '../../../src/hooks/useEnterNavigation';

interface PaymentHeader {
    voucherNo: string;
    manualRef: string;
    date: string;
    currency: string;
    rate: number;
    partnerId: string | null;
    partnerCode: string;
    partnerName: string;
    payeeType: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
    description: string;
    status: 'Posted' | 'Draft';
    amount: number;
    linkedAccountName?: string;
    partnerBalance?: number;
    costCenterId?: string;
    branchId?: string;
}

interface PaymentLine {
    id: string;
    type: 'CASH' | 'CHEQUE' | 'TRANSFER';
    accountId: string | null;
    accountName: string;
    amount: number;
    description: string;
    costCenterId?: string;
    chequeNo?: string;
    bankName?: string;
    bankId?: string; // Legacy
    bankAccountId?: string; // New
    dueDate?: string;
}

interface Bank { id: string; name_ar: string; bank_code?: string; account_id?: string; }
interface Currency { id: string; code: string; name_ar: string; exchange_rate: number; }
interface CostCenter { id: string; name_ar: string; code: string; }
interface Branch { id: string; name_ar: string; is_main: number; }

export const PaymentVoucher = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(containerRef);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [banks, setBanks] = useState<Bank[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    const [header, setHeader] = useState<PaymentHeader>({
        voucherNo: 'NEW',
        manualRef: '',
        date: new Date().toISOString().split('T')[0],
        currency: 'ILS',
        rate: 1,
        partnerId: null,
        partnerCode: '',
        partnerName: '',
        payeeType: 'SUPPLIER',
        description: '',
        status: 'Posted',
        amount: 0,
        linkedAccountName: '',
        partnerBalance: 0,
        costCenterId: '',
        branchId: ''
    });

    const [lines, setLines] = useState<PaymentLine[]>([
        { id: uuidv4(), type: 'CASH', accountId: null, accountName: '', amount: 0, description: '' }
    ]);

    const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
    const [accountPickerOpen, setAccountPickerOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);

    // ============ Load Data ============
    const { id } = useParams();

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (!api) return;

            const [bks, curs, ccs, brs] = await Promise.all([
                api.masterData.getBanks(),
                api.currency.getCurrencies(),
                api.masterData.getCostCenters(),
                api.masterData.getBranches(),
            ]);

            setBanks(bks || []); setCurrencies(curs || []);
            setCostCenters(ccs || []); setBranches(brs || []);

            if (brs && brs.length > 0) {
                const mainBranch = brs.find((b: any) => b.is_main);
                setHeader(prev => ({ ...prev, branchId: mainBranch?.id || brs[0].id }));
            }

            if (id && id !== 'new') {
                // FETCH EXISTING
                const data = await api.treasury.getPaymentVoucher(id);
                if (data && data.header) {
                    const h = data.header;
                    // Find partner
                    const allPartners = await api.partner.getAllPartners(); // Need all types
                    const p = allPartners?.find((x: any) => x.id === h.partner_id);

                    let linkedAccountName = '';
                    let partnerBalance = 0;
                    let payeeType: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' = 'SUPPLIER'; // Default
                    if (p) {
                        if (p.linked_account_id) {
                            try {
                                const acc = await api.account.getAccount(p.linked_account_id);
                                if (acc) {
                                    linkedAccountName = `${acc.account_code || acc.code} - ${p.code}`;
                                }
                            } catch (e) { console.error("Failed to get linked account for partner", e); }
                        }
                        try {
                            const balanceRes = await api.treasury.getBookBalance(p.linked_account_id, new Date().toISOString().split('T')[0]);
                            partnerBalance = balanceRes || 0;
                        } catch (e) { console.error("Failed to get partner balance", e); }

                        if (p.type === 'CUSTOMER' || p.type === 'SUPPLIER' || p.type === 'EMPLOYEE') {
                            payeeType = p.type;
                        }
                    }

                    setHeader({
                        voucherNo: h.voucher_no, manualRef: h.manual_ref || '',
                        date: h.date.split('T')[0], currency: h.currency_id, rate: h.exchange_rate,
                        partnerId: h.partner_id, partnerCode: p?.code || '',
                        partnerName: p?.name_ar || p?.name_en || h.payee_name || '',
                        payeeType: payeeType,
                        description: h.description, status: h.status,
                        amount: h.amount, linkedAccountName: linkedAccountName, partnerBalance: partnerBalance,
                        costCenterId: h.cost_center_id || '', branchId: h.branch_id
                    });

                    // Map Lines (Payment Means - Credits + Cheques)
                    const newLines: PaymentLine[] = [];

                    // 1. Checks
                    if (data.checks && data.checks.length > 0) {
                        data.checks.forEach((c: any) => {
                            newLines.push({
                                id: uuidv4(), type: 'CHEQUE',
                                accountId: c.account_id || null, // Assuming cheque has a source bank account
                                accountName: c.account_name || '',
                                amount: c.amount, description: c.description || '',
                                chequeNo: c.cheque_no, bankName: c.bank_name, bankId: c.bank_id,
                                dueDate: c.due_date ? c.due_date.split('T')[0] : ''
                            });
                        });
                    }

                    // 2. Cash/Bank Credits (excluding those linked to checks if possible)
                    if (data.lines && data.lines.length > 0) {
                        data.lines.forEach((l: any) => {
                            // Only consider credit lines (payment means)
                            if (l.credit > 0) {
                                // Attempt to distinguish CASH from TRANSFER based on account type or name
                                let lineType: 'CASH' | 'CHEQUE' | 'TRANSFER' = 'CASH';
                                if (l.account_name && (l.account_name.includes('بنك') || l.account_name.includes('Bank'))) {
                                    lineType = 'TRANSFER';
                                }
                                // If this line is a Bank Credit for a cheque, skip it if we already added the cheque
                                // This is a heuristic and might need refinement based on actual data structure
                                const isChequeRelatedCredit = data.checks?.some((c: any) =>
                                    c.account_id === l.account_id && c.amount === l.credit
                                );
                                if (isChequeRelatedCredit) return;

                                newLines.push({
                                    id: uuidv4(), type: lineType,
                                    accountId: l.account_id,
                                    accountName: l.account_name || '',
                                    amount: l.credit,
                                    description: l.line_description || ''
                                });
                            }
                        });
                    }
                    if (newLines.length > 0) setLines(newLines);
                    else setLines([{ id: uuidv4(), type: 'CASH', accountId: null, accountName: '', amount: 0, description: '' }]); // Ensure at least one line
                }
            } else {
                const nextNo = await api.journal.getNextVoucherNo('PAY');
                setHeader(prev => ({ ...prev, voucherNo: nextNo }));
            }

        } catch (e) {
            console.error("Failed to load initial data or voucher", e);
        } finally {
            setLoading(false);
        }
    };

    // --- Partner Logic ---
    const handlePartnerSelect = async (partner: UnifiedPartner) => {
        let accName = '';
        let detectedCurrency = header.currency;

        if (partner.linked_account_id) {
            try {
                const acc = await (window as any).electronAPI.account.getAccount(partner.linked_account_id);
                if (acc) {
                    accName = `${acc.account_code || acc.code} - ${partner.code}`;
                    if (acc.currency_id) {
                        const curr = currencies.find(c => c.id === acc.currency_id);
                        if (curr) detectedCurrency = curr.code;
                    }
                }
            } catch (e) { console.error(e); }
        }

        let balance = 0;
        try {
            const balanceRes = await (window as any).electronAPI.treasury.getBookBalance(partner.linked_account_id, new Date().toISOString().split('T')[0]);
            balance = balanceRes || 0;
        } catch (e) { console.error(e); }

        setHeader(prev => ({
            ...prev,
            partnerId: partner.id,
            partnerCode: partner.code,
            partnerName: partner.name,
            payeeType: partner.type,
            linkedAccountName: accName,
            partnerBalance: balance,
            currency: detectedCurrency
        }));
        setPartnerPickerOpen(false);
    };

    const handlePartnerCodeBlur = async () => {
        if (!header.partnerCode) return;
        try {
            const api = (window as any).electronAPI;
            let partners = [];
            if (header.payeeType === 'CUSTOMER' || header.payeeType === 'SUPPLIER') {
                partners = await api.partner.getPartners(header.payeeType);
            } else {
                partners = await api.hr.getEmployees();
            }
            const match = partners?.find((p: any) =>
                (p.code === header.partnerCode) || (p.employee_code === header.partnerCode)
            );
            if (match) {
                const unified: UnifiedPartner = {
                    id: match.id, type: header.payeeType,
                    code: match.code || match.employee_code,
                    name: match.name_ar || match.name_en || match.full_name,
                    linked_account_id: match.linked_account_id, raw_data: match
                };
                await handlePartnerSelect(unified);
            } else {
                setHeader(prev => ({ ...prev, partnerName: '--- غير موجود ---' }));
            }
        } catch (e) { console.error(e); }
    };

    // --- Line Logic ---
    const handleAccountSelect = (account: any) => {
        if (activeLineId) {
            setLines(prev => prev.map(l => l.id === activeLineId ? { ...l, accountId: account.id, accountName: account.name_ar } : l));
            setAccountPickerOpen(false);
            setActiveLineId(null);
        }
    };

    const addNewLine = () => {
        setLines(prev => [...prev, {
            id: uuidv4(), type: 'CASH', accountId: null, accountName: '',
            amount: 0, description: header.description || '', costCenterId: header.costCenterId
        }]);
    };

    const removeLine = (id: string) => {
        if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id));
    };

    const updateLine = (id: string, field: keyof PaymentLine, value: any) => {
        setLines(prev => prev.map(l => {
            if (l.id !== id) return l;
            const updated = { ...l, [field]: value };
            if (field === 'bankId') {
                const bank = banks.find(b => b.id === value);
                updated.bankName = bank ? bank.name_ar : '';
            }
            if (field === 'type') {
                if (value === 'CHEQUE') { updated.accountId = null; updated.accountName = ''; }
                else { updated.chequeNo = ''; updated.bankId = ''; updated.bankName = ''; updated.dueDate = ''; }
            }
            return updated;
        }));
    };

    const totalAmount = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    useEffect(() => { setHeader(prev => ({ ...prev, amount: totalAmount })); }, [totalAmount]);

    const handleSave = async () => {
        if (!header.partnerId) { alert('الرجاء اختيار المستفيد'); return; }
        if (totalAmount <= 0) { alert('الرجاء إدخال المبلغ'); return; }
        const invalid = lines.find(l => {
            if (l.type !== 'CHEQUE' && !l.accountId) return true; // Cash/Transfer needs GL Account
            if (l.type === 'CHEQUE' && (!l.chequeNo || !l.bankAccountId || !l.dueDate)) return true; // Cheque needs Bank Account
            return false;
        });
        if (invalid) { alert('الرجاء تعبئة جميع الحقول المطلوبة'); return; }

        setSubmitting(true);
        try {
            const payload = {
                header: {
                    ...header, voucher_no: header.voucherNo, currency_id: header.currency,
                    partner_id: header.partnerId, total_amount: totalAmount,
                    exchange_rate: header.rate, manual_ref: header.manualRef,
                    cost_center_id: header.costCenterId, branch_id: header.branchId
                },
                details: lines.filter(l => l.type !== 'CHEQUE').map(l => ({
                    type: l.type, account_id: l.accountId, amount: l.amount,
                    description: l.description, cost_center_id: l.costCenterId,
                    bank_account_id: l.type === 'TRANSFER' ? l.bankAccountId : null // Pass for transfers
                })),
                checks: lines.filter(l => l.type === 'CHEQUE').map(l => ({
                    cheque_no: l.chequeNo,
                    bank_name: l.bankName,
                    bank_account_id: l.bankAccountId, // Send this!
                    amount: l.amount, due_date: l.dueDate, drawer_name: 'Self'
                }))
            };
            const res = await (window as any).electronAPI.treasury.createPaymentVoucher(payload);
            if (res.success) {
                alert(`تم حفظ السند بنجاح رقم ${res.voucher_no}`);
                await loadData();
                setLines([{ id: uuidv4(), type: 'CASH', accountId: null, accountName: '', amount: 0, description: '' }]);
                setHeader(prev => ({ ...prev, description: '', amount: 0, manualRef: '', partnerId: null, partnerCode: '', partnerName: '', linkedAccountName: '', partnerBalance: 0 }));
            }
        } catch (e: any) {
            console.error(e);
            alert(`خطأ في الحفظ: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrint = () => { window.print(); };

    return (
        <div ref={containerRef} className="flex flex-col h-screen bg-slate-50/50" dir="rtl">
            <style>{`
        @media print { .no-print { display: none !important; } .printable { display: block !important; } body { background: white; } .h-screen { height: auto; } .overflow-y-auto { overflow: visible; } @page { size: A4; margin: 10px; } }
        .printable { display: none; }
    `}</style>

            <UnifiedPartnerPicker isOpen={partnerPickerOpen} onClose={() => setPartnerPickerOpen(false)} onSelect={handlePartnerSelect} />
            <AccountPicker isOpen={accountPickerOpen} onClose={() => setAccountPickerOpen(false)} onSelect={handleAccountSelect} allowedPrefixes={['111', '112', '120']} />

            {/* Header */}
            <div className="no-print bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowRight size={24} /></button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Banknote className="text-red-600" size={28} />
                            سند صرف (Payment Voucher)
                        </h1>
                        <p className="text-xs font-bold text-slate-400 mt-1">Unified Grid Entry</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={handlePrint} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
                        <Printer size={20} /><span>طباعة</span>
                    </button>
                    <button onClick={handleSave} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-200 hover:shadow-red-300 transition-all active:scale-95 disabled:opacity-50">
                        <Save size={20} /><span>حفظ السند</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 no-print">
                <div className="max-w-[1400px] mx-auto space-y-6">

                    {/* Master Details */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">صرفنا إلى السيد / السادة</label>
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <input type="text" placeholder="الكود" value={header.partnerCode}
                                            onChange={e => setHeader({ ...header, partnerCode: e.target.value })}
                                            onBlur={handlePartnerCodeBlur}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-3 outline-none focus:border-red-500 font-mono text-sm" />
                                    </div>
                                    <div className="flex-1 relative cursor-pointer" onClick={() => setPartnerPickerOpen(true)}>
                                        <input readOnly value={header.partnerName} placeholder="اضغط للبحث..."
                                            className="w-full bg-slate-50 hover:bg-white border border-slate-200 rounded-lg py-3 px-4 outline-none cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">رقم السند</label>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                                    <Hash size={18} className="text-slate-400" />
                                    <span className="font-mono font-bold text-slate-700">{header.voucherNo}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">التاريخ</label>
                                <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-2xl py-3 px-4 outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Unified Grid */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 w-[120px]">نوع الدفع</th>
                                        <th className="px-4 py-3 w-[200px]">الحساب (الصندوق/البنك)</th>
                                        <th className="px-4 py-3 w-[120px]">المبلغ</th>
                                        <th className="px-4 py-3 w-[140px]">رقم الشيك</th>
                                        <th className="px-4 py-3 w-[160px]">البنك</th>
                                        <th className="px-4 py-3 w-[140px]">تاريخ الاستحقاق</th>
                                        <th className="px-4 py-3">البيان</th>
                                        <th className="px-4 py-3 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {lines.map((line) => (
                                        <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-2">
                                                <select value={line.type} onChange={e => updateLine(line.id, 'type', e.target.value)}
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500">
                                                    <option value="CASH">نقداً</option>
                                                    <option value="CHEQUE">شيك</option>
                                                    <option value="TRANSFER">حوالة</option>
                                                </select>
                                            </td>
                                            <td className="p-2 relative">
                                                {line.type === 'CASH' ? (
                                                    <input readOnly value={line.accountName || ''}
                                                        placeholder="اختر الصندوق..."
                                                        onClick={() => { setActiveLineId(line.id); setAccountPickerOpen(true); }}
                                                        className="w-full p-2 bg-white cursor-pointer border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500" />
                                                ) : line.type === 'TRANSFER' ? (
                                                    <BankAccountSelect
                                                        value={line.bankAccountId}
                                                        onChange={(acc) => {
                                                            updateLine(line.id, 'bankAccountId', acc?.id);
                                                            updateLine(line.id, 'bankName', acc?.bank_name); /// Display purpose
                                                            updateLine(line.id, 'accountId', acc?.gl_account_id); // Fallback? Logic handles it.
                                                            updateLine(line.id, 'accountName', acc?.account_name);
                                                        }}
                                                        placeholder="اختر البنك المحول منه..."
                                                    />
                                                ) : (
                                                    <input readOnly value={line.bankName || ''}
                                                        placeholder="يتم تحديده من البنك"
                                                        className="w-full p-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-sm outline-none" />
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <input type="number" value={line.amount} onChange={e => updateLine(line.id, 'amount', e.target.value)}
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-red-600 outline-none focus:border-red-500" />
                                            </td>
                                            <td className="p-2">
                                                <input type="text" value={line.chequeNo || ''} onChange={e => updateLine(line.id, 'chequeNo', e.target.value)}
                                                    disabled={line.type !== 'CHEQUE'}
                                                    className={`w-full p-2 border border-slate-200 rounded-lg text-sm font-mono outline-none ${line.type !== 'CHEQUE' ? 'bg-slate-100 text-slate-400' : 'bg-white focus:border-red-500'}`} />
                                            </td>
                                            <td className="p-2">
                                                <BankAccountSelect
                                                    value={line.bankAccountId}
                                                    onChange={(acc) => {
                                                        updateLine(line.id, 'bankAccountId', acc?.id);
                                                        updateLine(line.id, 'bankName', acc?.bank_name);
                                                        // For Cheque, we just need the bank details.
                                                    }}
                                                    error={!line.bankAccountId && line.type === 'CHEQUE'}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input type="date" value={line.dueDate || ''} onChange={e => updateLine(line.id, 'dueDate', e.target.value)}
                                                    disabled={line.type !== 'CHEQUE'}
                                                    className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none ${line.type !== 'CHEQUE' ? 'bg-slate-100 text-slate-400' : 'bg-white focus:border-red-500'}`} />
                                            </td>
                                            <td className="p-2">
                                                <input type="text" value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)}
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500" placeholder="ملاحظات..." />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => removeLine(line.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={addNewLine} className="flex items-center gap-2 text-red-600 font-bold hover:bg-white hover:shadow-sm px-4 py-2 rounded-lg transition-all border border-transparent hover:border-red-100">
                                <Plus size={18} /><span>إضافة سطر جديد</span>
                            </button>
                        </div>
                    </div>

                    {/* Footer Totals */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex justify-between items-end">
                        <div>
                            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">المبلغ كتابة</label>
                            <div className="text-xl font-bold text-slate-800 mt-1">{toArabicWords(totalAmount, header.currency)}</div>
                        </div>
                        <div className="text-right">
                            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">الإجمالي النهائي</label>
                            <div className="text-3xl font-black text-red-600 mt-1">{totalAmount.toLocaleString()} <span className="text-lg text-slate-400">{header.currency}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Template */}
            <div className="printable">
                <PrintTemplate header={header} lines={lines} totalAmount={totalAmount} branches={branches} />
            </div>
        </div>
    );
};

const PrintTemplate = ({ header, lines, totalAmount, branches }: any) => {
    const branchName = branches?.find((b: any) => b.id === header.branchId)?.name_ar || 'الرئيسي';
    return (
        <div className="p-8 border-2 border-gray-800 h-full flex flex-col justify-between" dir="rtl">
            <div>
                <div className="flex items-start justify-between border-b-2 border-gray-800 pb-6 mb-8">
                    <div className="text-right">
                        <h1 className="text-3xl font-black text-gray-900 mb-2">سند صرف</h1>
                        <h2 className="text-xl font-bold text-gray-600 uppercase tracking-widest">Payment Voucher</h2>
                    </div>
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300 mx-auto mb-2">
                            <Building2 className="w-12 h-12 text-gray-400" />
                        </div>
                    </div>
                    <div className="text-left space-y-1">
                        <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-gray-900 text-xl font-mono">{header.voucherNo}</span>
                            <span className="text-gray-500 text-sm">:رقم السند</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <span className="font-medium text-gray-800">{header.date}</span>
                            <span className="text-gray-500 text-sm">:التاريخ</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <span className="font-medium text-gray-800">{branchName}</span>
                            <span className="text-gray-500 text-sm">:الفرع</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                    <div className="col-span-2 border border-gray-300 rounded-lg p-3 bg-gray-50 flex items-center gap-4">
                        <span className="font-bold text-gray-500 w-24 shrink-0">المستفيد:</span>
                        <span className="font-bold text-xl text-gray-900">{header.partnerName}</span>
                    </div>
                    <div className="col-span-2 border border-gray-300 rounded-lg p-3 flex items-center gap-4">
                        <span className="font-bold text-gray-500 w-24 shrink-0">المبلغ:</span>
                        <span className="font-bold text-xl text-gray-900">{Number(totalAmount).toLocaleString()} {header.currency}</span>
                        <span className="mx-4 text-gray-300">|</span>
                        <span className="font-medium text-gray-600">{toArabicWords(totalAmount, header.currency)}</span>
                    </div>
                    <div className="col-span-2 border border-gray-300 rounded-lg p-3 flex items-center gap-4">
                        <span className="font-bold text-gray-500 w-24 shrink-0">البيان:</span>
                        <span className="font-medium text-gray-800">{header.description}</span>
                    </div>
                </div>

                <div className="mb-8">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700">
                                <th className="border border-gray-300 px-4 py-2 w-16 text-center">#</th>
                                <th className="border border-gray-300 px-4 py-2 text-right">طريقة الدفع</th>
                                <th className="border border-gray-300 px-4 py-2 text-right">التفاصيل</th>
                                <th className="border border-gray-300 px-4 py-2 text-right">البيان</th>
                                <th className="border border-gray-300 px-4 py-2 text-left w-32">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="border border-gray-300 px-4 py-2 text-center">{idx + 1}</td>
                                    <td className="border border-gray-300 px-4 py-2 font-bold">
                                        {line.type === 'CASH' ? 'نقدي' : line.type === 'CHEQUE' ? 'شيك' : 'تحويل'}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        {line.type === 'CHEQUE' ? `بنك: ${line.bankName || '-'} / شيك: ${line.chequeNo} / استحقاق: ${line.dueDate}` : line.accountName}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">{line.description}</td>
                                    <td className="border border-gray-300 px-4 py-2 text-left font-mono">{Number(line.amount).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-bold">
                                <td colSpan={4} className="border border-gray-300 px-4 py-2 text-left text-gray-600">الإجمالي</td>
                                <td className="border border-gray-300 px-4 py-2 text-left text-gray-900 text-lg">{Number(totalAmount).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="flex justify-between items-end mt-12 pb-4">
                <div className="text-center w-48">
                    <p className="border-b border-gray-400 pb-2 mb-2 font-bold text-gray-600">المحاسب</p>
                    <p className="text-sm text-gray-400 p-4">.........................</p>
                </div>
                <div className="text-center w-48">
                    <p className="border-b border-gray-400 pb-2 mb-2 font-bold text-gray-600">المدير المالي</p>
                    <p className="text-sm text-gray-400 p-4">.........................</p>
                </div>
                <div className="text-center w-48">
                    <p className="border-b border-gray-400 pb-2 mb-2 font-bold text-gray-600">استلمت المبلغ</p>
                    <p className="text-sm text-gray-400 p-4">.........................</p>
                </div>
            </div>
        </div>
    );
};
