import React, { useState, useEffect, useRef } from 'react';
import {
    Save, Printer, Search, Plus, Trash2,
    ArrowRight, Hash, DollarSign, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedPartnerPicker, UnifiedPartner } from '../../../components/UnifiedPartnerPicker';
import { AccountPicker } from '../../../components/AccountPicker';
import { v4 as uuidv4 } from 'uuid';
import { toArabicWords } from '../../../src/utils/tafqeet';
import { useEnterNavigation } from '../../../src/hooks/useEnterNavigation';

// ============ Types ============

interface ReceiptHeader {
    voucherNo: string;
    date: string;
    partnerId: string | null;
    partnerCode: string;
    partnerName: string;
    payeeType: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
    salesRepCode: string;
    salesRepName: string;
    outstandingBalance: number;
    currentBalance: number;
    collectionRate: number;
    description: string;
    branchId: string;
    costCenterId: string;
    manualRef: string;
}

/** Receipt tab line — Debit side */
interface ReceiptLine {
    id: string;
    accountId: string | null;
    accountCode: string;
    accountName: string;
    lineCurrency: string;
    subAccountId: string;
    subAccountName?: string;
    subAccountCode?: string;
    creditCard: boolean;
    paymentDate: string;
    lineRef: string;
    debitForeign: number;   // Amount in foreign currency
    debitLocal: number;     // Amount in local currency (auto-calculated)
    dueDate: string;        // Cheque due date
    endorser: string;       // مجيّر
    originalSource: string; // المصدر الأصلي
    chequeNo: string;
    bankId: string;
    bankName: string;
    bankAccountType: string;
    bankAccountNo: string;
}

/** Against tab line — Credit side */
interface AgainstLine {
    id: string;
    accountId: string | null;
    accountCode: string;
    accountName: string;
    lineCurrency: string;
    subAccountId: string;
    subAccountName?: string;
    subAccountCode?: string;
    lineRef: string; // Customer code for linking
    debitForeign: number;
    debit: number;
    creditForeign: number;
    credit: number;
    taxRef: string;
    invoiceDate: string;
}

interface Bank { id: string; name_ar: string; bank_code?: string; }
interface Currency { id: string; code: string; name_ar: string; exchange_rate: number; }
interface CostCenter { id: string; name_ar: string; code: string; }
interface Branch { id: string; name_ar: string; is_main: number; }

// ============ Helpers ============

const emptyReceiptLine = (): ReceiptLine => ({
    id: uuidv4(), accountId: null, accountCode: '', accountName: '',
    lineCurrency: 'ILS', subAccountId: '', subAccountName: '', subAccountCode: '', creditCard: false, paymentDate: '',
    lineRef: '', debitForeign: 0, debitLocal: 0, dueDate: '', endorser: '',
    originalSource: '', chequeNo: '', bankId: '', bankName: '',
    bankAccountType: '', bankAccountNo: ''
});

const emptyAgainstLine = (): AgainstLine => ({
    id: uuidv4(), accountId: null, accountCode: '', accountName: '',
    lineCurrency: 'ILS', subAccountId: '', subAccountName: '', subAccountCode: '', lineRef: '',
    debitForeign: 0, debit: 0, creditForeign: 0, credit: 0,
    taxRef: '', invoiceDate: ''
});

// ============ Component ============

export const ReceiptVoucher = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(containerRef);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'RECEIPT' | 'AGAINST'>('RECEIPT');

    // Master Data
    const [banks, setBanks] = useState<Bank[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [allPartners, setAllPartners] = useState<any[]>([]);

    const [header, setHeader] = useState<ReceiptHeader>({
        voucherNo: 'NEW', date: new Date().toISOString().split('T')[0],
        partnerId: null, partnerCode: '', partnerName: '',
        payeeType: 'CUSTOMER', salesRepCode: '', salesRepName: '',
        outstandingBalance: 0, currentBalance: 0, collectionRate: 0,
        description: '', branchId: '', costCenterId: '', manualRef: ''
    });

    const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([emptyReceiptLine()]);
    const [againstLines, setAgainstLines] = useState<AgainstLine[]>([emptyAgainstLine()]);

    // Pickers
    const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
    const [accountPickerOpen, setAccountPickerOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const [pickerTarget, setPickerTarget] = useState<'RECEIPT' | 'AGAINST'>('RECEIPT');
    const [pickingSubAccount, setPickingSubAccount] = useState(false);

    // ============ Load Data ============
    const { id } = useParams();

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (!api) return;
            const [bks, curs, ccs, brs, nextNo, partners] = await Promise.all([
                api.masterData.getBanks(),
                api.currency.getCurrencies(),
                api.masterData.getCostCenters(),
                api.masterData.getBranches(),
                id && id !== 'new' ? null : api.journal.getNextVoucherNo('REC'),
                api.partner.getPartners('CUSTOMER')
            ]);
            setBanks(bks || []); setCurrencies(curs || []);
            setCostCenters(ccs || []); setBranches(brs || []);
            setAllPartners(partners || []);

            if (brs && brs.length > 0) {
                const mainBranch = brs.find((b: any) => b.is_main);
                setHeader(prev => ({ ...prev, branchId: mainBranch?.id || brs[0].id }));
            }

            if (id && id !== 'new') {
                // FETCH EXISTING
                const data = await api.treasury.getReceipt(id);
                if (data && data.header) {
                    const h = data.header;
                    setHeader({
                        voucherNo: h.voucher_no, date: h.date,
                        partnerId: h.partner_id, partnerCode: '', // Need to find code from partners list if not in header
                        partnerName: h.customer_name || h.description || '', // Fallback
                        payeeType: 'CUSTOMER',
                        salesRepCode: h.sales_rep_code || '', salesRepName: '',
                        outstandingBalance: 0, currentBalance: 0, collectionRate: 0,
                        description: h.description, branchId: h.branch_id,
                        costCenterId: h.cost_center_id || '', manualRef: h.manual_ref || ''
                    });

                    // Map Partner Code
                    const p = partners?.find((x: any) => x.id === h.partner_id);
                    if (p) {
                        setHeader(prev => ({ ...prev, partnerCode: p.code, partnerName: p.name_ar || p.name_en }));
                    }

                    // Map Receipt Lines (Debit Side) -> Cash/Bank + Checks
                    const newLines: ReceiptLine[] = [];

                    // 1. Checks
                    if (data.checks && data.checks.length > 0) {
                        data.checks.forEach((c: any) => {
                            // Find associated journal line for account info if possible, or just use check data
                            newLines.push({
                                id: uuidv4(),
                                accountId: null, // We might need to find the account from journal lines matching this check amount?? 
                                // Actually usually check debits "Cheques in Box".
                                accountCode: '', accountName: 'شيكات برسم التحصيل', // Default?
                                lineCurrency: c.currency_id || 'ILS',
                                subAccountId: '', subAccountName: '', creditCard: false, paymentDate: c.received_date,
                                lineRef: '', debitForeign: c.amount, debitLocal: c.amount, // TODO: Rate
                                dueDate: c.due_date, endorser: c.endorser || '',
                                originalSource: '', chequeNo: c.cheque_no,
                                bankId: c.bank_id || '', bankName: c.bank_name,
                                bankAccountType: '', bankAccountNo: ''
                            });
                        });
                    }

                    // 2. Cash/Bank (lines from getReceipt)
                    if (data.lines && data.lines.length > 0) {
                        data.lines.forEach((l: any) => {
                            // Filter out "Cheques in Box" if we already added checks? 
                            // Or maybe `getReceipt` already separates them?
                            // Current `getReceipt` returns ALL debit lines in `lines`.
                            // If we have checks, usually there is a debit line for "Checks in Box".
                            // We should probably rely on the journal lines primarily?
                            // But the UI separates "Checks" input fields.

                            // If this line matches a check amount, it might be the check line.
                            // Simpler approach: Just map everything for now, user can verify.
                            if (l.line_description && l.line_description.includes('شيكات')) {
                                // Skip checks summary line if we have detailed checks
                                if (data.checks?.length > 0) return;
                            }

                            newLines.push({
                                id: uuidv4(),
                                accountId: l.account_id,
                                accountCode: l.account_code || '',
                                accountName: l.account_name || '',
                                lineCurrency: 'ILS', // Journal lines are normalized to base? OR we need currency from somewhere
                                subAccountId: l.cost_center_id || '', subAccountName: '', creditCard: l.type === 'CREDIT_CARD', paymentDate: h.date,
                                lineRef: '', debitForeign: l.debit, debitLocal: l.debit,
                                dueDate: '', endorser: '', originalSource: '',
                                chequeNo: '', bankId: '', bankName: '', bankAccountType: '', bankAccountNo: ''
                            });
                        });
                    }
                    if (newLines.length > 0) setReceiptLines(newLines);

                    // Map Against Lines (Credit Side)
                    if (data.against && data.against.length > 0) {
                        const agLines: AgainstLine[] = data.against.map((l: any) => ({
                            id: uuidv4(),
                            accountId: l.account_id,
                            accountCode: l.account_code || '',
                            accountName: l.account_name || '',
                            lineCurrency: 'ILS', subAccountId: '', lineRef: '',
                            debitForeign: 0, debit: 0, creditForeign: l.credit, credit: l.credit,
                            taxRef: '', invoiceDate: ''
                        }));
                        setAgainstLines(agLines);
                    }
                }
            } else {
                setHeader(prev => ({ ...prev, voucherNo: nextNo }));
            }

        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // ============ Totals (computed before partner handlers that reference them) ============

    const totalReceiptDebit = receiptLines.reduce((s, l) => s + (Number(l.debitLocal) || 0), 0);
    const totalAgainstCredit = againstLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const difference = Math.round((totalReceiptDebit - totalAgainstCredit) * 100) / 100;

    // ============ Partner Logic ============

    const handlePartnerSelect = async (partner: UnifiedPartner) => {
        let balance = 0;
        try {
            if (partner.linked_account_id) {
                const b = await (window as any).electronAPI.treasury.getBookBalance(partner.linked_account_id, header.date);
                balance = b || 0;
            }
        } catch (e) { console.error(e); }

        setHeader(prev => ({
            ...prev, partnerId: partner.id, partnerCode: partner.code,
            partnerName: partner.name, payeeType: partner.type,
            currentBalance: balance, outstandingBalance: Math.abs(balance)
        }));

        // Auto-fill first against line with customer account + credit = current receipt total
        if (partner.linked_account_id) {
            try {
                const acc = await (window as any).electronAPI.account.getAccount(partner.linked_account_id);
                if (acc) {
                    setAgainstLines([{
                        ...emptyAgainstLine(),
                        accountId: acc.id,
                        accountCode: acc.account_code || acc.code || '',
                        accountName: acc.name_ar || '',
                        lineRef: partner.code,
                        lineCurrency: 'ILS',
                        credit: totalReceiptDebit, // Auto-fill credit with receipt total
                        creditForeign: totalReceiptDebit
                    }]);
                }
            } catch (e) { console.error(e); }
        }

        setPartnerPickerOpen(false);
    };

    // Auto-sync against credit when receipt total changes (only if single against line)
    useEffect(() => {
        if (againstLines.length === 1 && againstLines[0].accountId && totalReceiptDebit > 0) {
            setAgainstLines(prev => prev.map((l, i) =>
                i === 0 ? { ...l, credit: totalReceiptDebit, creditForeign: totalReceiptDebit } : l
            ));
        }
    }, [totalReceiptDebit]);

    const handlePartnerCodeBlur = async () => {
        if (!header.partnerCode) return;
        const match = allPartners?.find((p: any) => p.code === header.partnerCode);
        if (match) {
            const unified: UnifiedPartner = {
                id: match.id, type: header.payeeType,
                code: match.code, name: match.name_ar || match.name_en,
                linked_account_id: match.linked_account_id, raw_data: match
            };
            await handlePartnerSelect(unified);
        } else {
            setHeader(prev => ({ ...prev, partnerName: '⚠ غير موجود' }));
        }
    };

    // ============ Account Picker ============

    const openAccountPicker = (lineId: string, target: 'RECEIPT' | 'AGAINST', isSub: boolean = false) => {
        setActiveLineId(lineId);
        setPickerTarget(target);
        setPickingSubAccount(isSub);
        setAccountPickerOpen(true);
    };

    const handleAccountSelect = (account: any) => {
        if (!activeLineId) return;

        if (pickingSubAccount) {
            // Sub Account Selection
            if (pickerTarget === 'RECEIPT') {
                setReceiptLines(prev => prev.map(l => l.id === activeLineId
                    ? { ...l, subAccountId: account.id, subAccountName: account.name_ar }
                    : l));
            } else {
                setAgainstLines(prev => prev.map(l => l.id === activeLineId
                    ? { ...l, subAccountId: account.id }
                    : l));
            }
        } else {
            // Main Account Selection
            if (pickerTarget === 'RECEIPT') {
                const isCheque = account.name_ar && account.name_ar.includes('شيك');
                setReceiptLines(prev => prev.map(l => {
                    if (l.id !== activeLineId) return l;
                    const updates: Partial<ReceiptLine> = {
                        accountId: account.id,
                        accountCode: account.account_code || account.code || '',
                        accountName: account.name_ar
                    };
                    if (!isCheque) {
                        updates.chequeNo = ''; updates.bankId = ''; updates.bankName = '';
                        updates.dueDate = ''; updates.endorser = ''; updates.originalSource = '';
                        updates.bankAccountType = ''; updates.bankAccountNo = '';
                    }
                    return { ...l, ...updates };
                }));
            } else {
                setAgainstLines(prev => prev.map(l => l.id === activeLineId
                    ? { ...l, accountId: account.id, accountCode: account.account_code || account.code || '', accountName: account.name_ar }
                    : l));
            }
        }
        setAccountPickerOpen(false);
        setActiveLineId(null);
        setPickingSubAccount(false);
    };

    // Helper to get active parent ID for sub-account picking
    const getActiveParentId = () => {
        if (!activeLineId || !pickingSubAccount) return undefined;
        if (pickerTarget === 'RECEIPT') {
            return receiptLines.find(l => l.id === activeLineId)?.accountId || undefined;
        } else {
            return againstLines.find(l => l.id === activeLineId)?.accountId || undefined;
        }
    };

    // Direct code entry → auto-resolve on blur
    const handleAccountCodeBlur = async (lineId: string, code: string, target: 'RECEIPT' | 'AGAINST') => {
        if (!code || !code.trim()) return;
        try {
            // @ts-ignore
            const tree = await window.electronAPI.getAccountTree();
            const flat: any[] = [];
            const flatten = (nodes: any[]) => {
                for (const n of nodes) {
                    flat.push(n);
                    if (n.children) flatten(n.children);
                }
            };
            flatten(tree);
            const acc = flat.find((a: any) => (a.account_code || a.code) === code.trim());
            if (acc && acc.is_transactional) {
                if (target === 'RECEIPT') {
                    const isCheque = acc.name_ar && acc.name_ar.includes('شيك');
                    setReceiptLines(prev => prev.map(l => {
                        if (l.id !== lineId) return l;
                        const updates: Partial<ReceiptLine> = {
                            accountId: acc.id,
                            accountCode: acc.account_code || acc.code || '',
                            accountName: acc.name_ar
                        };
                        if (!isCheque) {
                            updates.chequeNo = ''; updates.bankId = ''; updates.bankName = '';
                            updates.dueDate = ''; updates.endorser = ''; updates.originalSource = '';
                            updates.bankAccountType = ''; updates.bankAccountNo = '';
                        }
                        return { ...l, ...updates };
                    }));
                } else {
                    setAgainstLines(prev => prev.map(l => l.id === lineId
                        ? { ...l, accountId: acc.id, accountCode: acc.account_code || acc.code || '', accountName: acc.name_ar }
                        : l));
                }
            }
        } catch (err) {
            console.error('[AccountCodeBlur]', err);
        }
    };

    // ============ Receipt Lines Logic ============

    const updateReceiptLine = (id: string, field: keyof ReceiptLine, value: any) => {
        setReceiptLines(prev => prev.map(l => {
            if (l.id !== id) return l;
            const updated = { ...l, [field]: value };

            // Auto-convert foreign → local
            if (field === 'debitForeign' || field === 'lineCurrency') {
                const curr = currencies.find(c => c.code === (field === 'lineCurrency' ? value : updated.lineCurrency));
                const rate = curr?.exchange_rate || 1;
                const foreignAmt = field === 'debitForeign' ? Number(value) : updated.debitForeign;
                updated.debitLocal = Math.round(foreignAmt * rate * 100) / 100;
            }

            if (field === 'bankId') {
                const bank = banks.find(b => b.id === value);
                updated.bankName = bank?.name_ar || '';
            }

            return updated;
        }));
    };

    const updateAgainstLine = (id: string, field: keyof AgainstLine, value: any) => {
        setAgainstLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    // (Totals already computed above partner logic)

    // ============ Save ============

    const handleSave = async () => {
        if (!header.partnerId) { alert('الرجاء اختيار العميل / الدافع'); return; }
        if (totalReceiptDebit <= 0) { alert('الرجاء إدخال مبالغ القبض'); return; }
        if (Math.abs(difference) > 0.01) { alert(`السند غير متوازن! الفرق = ${difference.toLocaleString()}`); return; }

        const invalidReceipt = receiptLines.find(l => !l.accountId || l.debitLocal <= 0);
        if (invalidReceipt) { alert('الرجاء تعبئة جميع حقول تبويب قبض (الحساب والمبلغ)'); return; }
        const invalidAgainst = againstLines.find(l => !l.accountId || l.credit <= 0);
        if (invalidAgainst) { alert('الرجاء تعبئة جميع حقول تبويب مقابل (الحساب والمبلغ)'); return; }

        setSubmitting(true);
        try {
            // ALL receipt lines produce debit journal entries
            // Cheque lines also need cheque-table inserts
            const chequeLines = receiptLines.filter(l => l.chequeNo);

            const payload = {
                header: {
                    voucher_no: header.voucherNo,
                    date: header.date,
                    partner_id: header.partnerId,
                    branch_id: header.branchId,
                    amount: totalReceiptDebit,
                    currency_id: 'ILS',
                    exchange_rate: 1,
                    description: header.description,
                    manual_ref: header.manualRef,
                    cost_center_id: header.costCenterId,
                    sales_rep_code: header.salesRepCode,
                    payee_type: header.payeeType
                },
                // All receipt lines → debit journal entries
                details: receiptLines.map(l => ({
                    type: l.chequeNo ? 'CHEQUE' : (l.creditCard ? 'CREDIT_CARD' : 'CASH'),
                    account_id: l.accountId,
                    amount: l.debitLocal,
                    description: l.lineRef,
                    cost_center_id: l.subAccountId || header.costCenterId,
                    currency: l.lineCurrency,
                    foreign_amount: l.debitForeign,
                    payment_date: l.paymentDate
                })),
                // Cheque lines → cheques table inserts (no journal, already in details)
                checks: chequeLines.map(l => ({
                    cheque_no: l.chequeNo,
                    bank_name: l.bankName,
                    bank_id: l.bankId,
                    amount: l.debitLocal,
                    due_date: l.dueDate,
                    drawer_name: l.originalSource || '',
                    endorser: l.endorser,
                    currency: l.lineCurrency,
                    foreign_amount: l.debitForeign,
                    bank_account_type: l.bankAccountType,
                    bank_account_no: l.bankAccountNo
                })),
                against: againstLines.map(l => ({
                    account_id: l.accountId,
                    credit: l.credit,
                    credit_foreign: l.creditForeign,
                    currency: l.lineCurrency,
                    reference: l.lineRef,
                    sub_account_id: l.subAccountId,
                    tax_ref: l.taxRef,
                    invoice_date: l.invoiceDate
                }))
            };

            const res = await (window as any).electronAPI.treasury.createReceipt(payload);
            if (res.success) {
                alert(`✅ تم حفظ سند القبض رقم ${res.voucher_no}`);
                // Reset
                await loadData();
                setReceiptLines([emptyReceiptLine()]);
                setAgainstLines([emptyAgainstLine()]);
                setHeader(prev => ({
                    ...prev, partnerId: null, partnerCode: '', partnerName: '',
                    description: '', manualRef: '', salesRepCode: '', salesRepName: '',
                    outstandingBalance: 0, currentBalance: 0, collectionRate: 0
                }));
                setActiveTab('RECEIPT');
            }
        } catch (e: any) {
            console.error(e);
            alert(`❌ خطأ: ${e.message}`);
        } finally { setSubmitting(false); }
    };

    // ============ Render ============

    return (
        <div ref={containerRef} className="flex flex-col h-full bg-slate-50/50" dir="rtl">
            <style>{`
                @media print { .no-print { display: none !important; } .printable { display: block !important; } body { background: white; } @page { size: A4 landscape; margin: 8mm; } }
                .printable { display: none; }
                .grid-input { width: 100%; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; outline: none; transition: border-color 0.15s; background: white; }
                .grid-input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
                .grid-input:disabled { background: #f8fafc; color: #94a3b8; }
                .grid-input-num { text-align: center; font-family: 'Courier New', monospace; font-weight: 700; }
                .grid-select { width: 100%; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; outline: none; background: white; }
                .grid-select:focus { border-color: #6366f1; }
                .tab-btn { padding: 10px 24px; font-weight: 700; font-size: 14px; border-bottom: 3px solid transparent; transition: all 0.15s; cursor: pointer; }
                .tab-btn:hover { background: #f1f5f9; }
                .tab-active { border-bottom-color: #6366f1; color: #4338ca; background: #eef2ff; }
            `}</style>

            <UnifiedPartnerPicker isOpen={partnerPickerOpen} onClose={() => setPartnerPickerOpen(false)} onSelect={handlePartnerSelect} />
            <AccountPicker isOpen={accountPickerOpen} onClose={() => setAccountPickerOpen(false)} onSelect={handleAccountSelect}
                allowedPrefixes={(!pickingSubAccount && pickerTarget === 'RECEIPT') ? ['111', '112', '114'] : undefined}
                parentId={getActiveParentId()}
            />

            {/* ===== Top Bar ===== */}
            <div className="no-print bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowRight size={22} /></button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">سند قبض (Receipt Voucher)</h1>
                        <p className="text-[11px] font-bold text-slate-400">Double Entry — Bisan Style</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Balance indicator */}
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${Math.abs(difference) < 0.01 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {Math.abs(difference) < 0.01 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span>الفرق: {difference.toLocaleString()}</span>
                    </div>
                    <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Printer size={18} /><span>طباعة</span></button>
                    <button onClick={handleSave} disabled={submitting || Math.abs(difference) > 0.01}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Save size={18} /><span>{submitting ? 'جاري الحفظ...' : 'حفظ السند'}</span>
                    </button>
                </div>
            </div>

            {/* ===== Content ===== */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-print">
                <div className="max-w-[1600px] mx-auto space-y-4">

                    {/* ===== Header Card ===== */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <div className="grid grid-cols-12 gap-4">
                            {/* Partner */}
                            <div className="col-span-12 md:col-span-5">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">دليل (كود العميل)</label>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="الكود" value={header.partnerCode}
                                        onChange={e => setHeader({ ...header, partnerCode: e.target.value })}
                                        onBlur={handlePartnerCodeBlur}
                                        className="w-28 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none focus:border-indigo-500 font-mono text-sm font-bold" />
                                    <div className="flex-1 cursor-pointer" onClick={() => setPartnerPickerOpen(true)}>
                                        <input readOnly value={header.partnerName} placeholder="اضغط للبحث..."
                                            className="w-full bg-slate-50 hover:bg-white border border-slate-200 rounded-lg py-2.5 px-3 outline-none cursor-pointer text-sm font-bold" />
                                    </div>
                                </div>
                            </div>

                            {/* Sales Rep */}
                            <div className="col-span-6 md:col-span-3">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">مندوب مبيعات</label>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="كود" value={header.salesRepCode}
                                        onChange={e => setHeader({ ...header, salesRepCode: e.target.value })}
                                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-2 outline-none focus:border-indigo-500 font-mono text-sm" />
                                    <input type="text" placeholder="اسم المندوب" value={header.salesRepName}
                                        onChange={e => setHeader({ ...header, salesRepName: e.target.value })}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm" />
                                </div>
                            </div>

                            {/* Voucher No */}
                            <div className="col-span-3 md:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">رقم السند</label>
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                    <Hash size={14} className="text-slate-400" />
                                    <span className="font-mono font-bold text-slate-700 text-sm">{header.voucherNo}</span>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="col-span-3 md:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">تاريخ</label>
                                <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm font-bold" />
                            </div>

                            {/* Balance Info Row */}
                            <div className="col-span-4 md:col-span-3">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">الرصيد المستحق</label>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg py-2 px-3 text-amber-800 font-bold font-mono text-sm">
                                    {header.outstandingBalance.toLocaleString()}
                                </div>
                            </div>
                            <div className="col-span-4 md:col-span-3">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">رصيد حالي</label>
                                <div className={`border rounded-lg py-2 px-3 font-bold font-mono text-sm ${header.currentBalance < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                    {header.currentBalance.toLocaleString()}
                                </div>
                            </div>
                            <div className="col-span-4 md:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">معدل التحصيل</label>
                                <input type="number" value={header.collectionRate}
                                    onChange={e => setHeader({ ...header, collectionRate: Number(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none text-sm font-mono text-center" />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">البيان</label>
                                <input type="text" value={header.description} onChange={e => setHeader({ ...header, description: e.target.value })}
                                    placeholder="بيان عام للسند..." className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* ===== Tabs + Grid ===== */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 bg-slate-50">
                            <button className={`tab-btn ${activeTab === 'RECEIPT' ? 'tab-active' : 'text-slate-500'}`}
                                onClick={() => setActiveTab('RECEIPT')}>
                                قبض <span className="text-[10px] mr-1 opacity-60">(مدين)</span>
                            </button>
                            <button className={`tab-btn ${activeTab === 'AGAINST' ? 'tab-active' : 'text-slate-500'}`}
                                onClick={() => setActiveTab('AGAINST')}>
                                مقابل <span className="text-[10px] mr-1 opacity-60">(دائن)</span>
                            </button>
                            {/* Totals in tabs bar */}
                            <div className="mr-auto flex items-center gap-6 px-6 text-sm">
                                <span className="text-slate-400">مجموع القبض: <b className="text-indigo-600 font-mono">{totalReceiptDebit.toLocaleString()}</b></span>
                                <span className="text-slate-400">مجموع المقابل: <b className="text-indigo-600 font-mono">{totalAgainstCredit.toLocaleString()}</b></span>
                            </div>
                        </div>

                        {/* Receipt Tab Grid */}
                        {activeTab === 'RECEIPT' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm" style={{ minWidth: '1400px' }}>
                                    <thead className="bg-slate-50/80 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-2 py-2.5 w-[100px]">حساب</th>
                                            <th className="px-2 py-2.5 w-[70px]">عملة</th>
                                            <th className="px-2 py-2.5 w-[80px]">حساب فرعي</th>
                                            <th className="px-2 py-2.5 w-[90px]">بطاقة ائتمان</th>
                                            <th className="px-2 py-2.5 w-[100px]">تاريخ الدفعة</th>
                                            <th className="px-2 py-2.5 w-[100px]">مرجع</th>
                                            <th className="px-2 py-2.5 w-[100px]">قيمة مدين</th>
                                            <th className="px-2 py-2.5 w-[100px]">مدين</th>
                                            <th className="px-2 py-2.5 w-[100px]">تاريخ الاستحقاق</th>
                                            <th className="px-2 py-2.5 w-[90px]">مجيّر</th>
                                            <th className="px-2 py-2.5 w-[100px]">المصدر الأصلي</th>
                                            <th className="px-2 py-2.5 w-[90px]">رقم الشيك</th>
                                            <th className="px-2 py-2.5 w-[80px]">بنك</th>
                                            <th className="px-2 py-2.5 w-[80px]">نوع الحساب</th>
                                            <th className="px-2 py-2.5 w-[90px]">رقم حساب</th>
                                            <th className="px-2 py-2.5 w-[40px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {receiptLines.map(line => (
                                            <tr key={line.id} className="hover:bg-indigo-50/30 transition-colors">
                                                {/* حساب */}
                                                <td className="p-1.5">
                                                    <div className="flex gap-1">
                                                        <input value={line.accountCode || ''}
                                                            onChange={e => updateReceiptLine(line.id, 'accountCode', e.target.value)}
                                                            onBlur={e => handleAccountCodeBlur(line.id, e.target.value, 'RECEIPT')}
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); openAccountPicker(line.id, 'RECEIPT'); } }}
                                                            placeholder="كود..."
                                                            className="grid-input font-mono flex-1" title={line.accountName} />
                                                        <button onClick={() => openAccountPicker(line.id, 'RECEIPT')}
                                                            className="px-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="بحث">
                                                            <Search size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* عملة */}
                                                <td className="p-1.5">
                                                    <select value={line.lineCurrency} onChange={e => updateReceiptLine(line.id, 'lineCurrency', e.target.value)} className="grid-select">
                                                        {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                                                        {currencies.length === 0 && <option value="ILS">ILS</option>}
                                                    </select>
                                                </td>
                                                {/* حساب فرعي */}
                                                <td className="p-1.5">
                                                    <div className="flex gap-1">
                                                        <input type="text" value={line.subAccountId || ''}
                                                            onChange={e => updateReceiptLine(line.id, 'subAccountId', e.target.value)}
                                                            className="grid-input" title={line.subAccountName} />
                                                        <button onClick={() => openAccountPicker(line.id, 'RECEIPT', true)}
                                                            disabled={!line.accountId}
                                                            className={`px-1.5 transition-colors ${!line.accountId ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`} title="بحث حساب فرعي">
                                                            <Search size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* بطاقة ائتمان */}
                                                <td className="p-1 text-center border-r border-slate-100/50">
                                                    <div className="flex justify-center items-center h-full">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.creditCard}
                                                            onChange={e => updateReceiptLine(line.id, 'creditCard', e.target.checked)}
                                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </div>
                                                </td>
                                                {/* تاريخ الدفعة */}
                                                <td className="p-1.5"><input type="date" value={line.paymentDate} onChange={e => updateReceiptLine(line.id, 'paymentDate', e.target.value)} className="grid-input" /></td>
                                                {/* مرجع */}
                                                <td className="p-1.5"><input type="text" value={line.lineRef} onChange={e => updateReceiptLine(line.id, 'lineRef', e.target.value)} className="grid-input" /></td>
                                                {/* قيمة مدين (foreign) */}
                                                <td className="p-1.5"><input type="number" value={line.debitForeign || ''} onChange={e => updateReceiptLine(line.id, 'debitForeign', e.target.value)} className="grid-input grid-input-num" /></td>
                                                {/* مدين (local) */}
                                                <td className="p-1.5">
                                                    <input type="number" value={line.debitLocal || ''}
                                                        onChange={e => updateReceiptLine(line.id, 'debitLocal', Number(e.target.value))}
                                                        className="grid-input grid-input-num text-indigo-700" />
                                                </td>
                                                {/* تاريخ الاستحقاق */}
                                                <td className="p-1.5"><input type="date" disabled={!line.accountName?.includes('شيك')} value={line.dueDate} onChange={e => updateReceiptLine(line.id, 'dueDate', e.target.value)} className="grid-input" /></td>
                                                {/* مجيّر */}
                                                <td className="p-1.5"><input type="text" disabled={!line.accountName?.includes('شيك')} value={line.endorser} onChange={e => updateReceiptLine(line.id, 'endorser', e.target.value)} className="grid-input" /></td>
                                                {/* المصدر الأصلي */}
                                                <td className="p-1.5"><input type="text" disabled={!line.accountName?.includes('شيك')} value={line.originalSource} onChange={e => updateReceiptLine(line.id, 'originalSource', e.target.value)} className="grid-input" /></td>
                                                {/* رقم الشيك */}
                                                <td className="p-1.5"><input type="text" disabled={!line.accountName?.includes('شيك')} value={line.chequeNo} onChange={e => updateReceiptLine(line.id, 'chequeNo', e.target.value)} className="grid-input font-mono" /></td>
                                                {/* بنك */}
                                                <td className="p-1.5">
                                                    <select disabled={!line.accountName?.includes('شيك')} value={line.bankId} onChange={e => updateReceiptLine(line.id, 'bankId', e.target.value)} className="grid-select">
                                                        <option value="">--</option>
                                                        {banks.map(b => <option key={b.id} value={b.id}>{b.bank_code || b.name_ar}</option>)}
                                                    </select>
                                                </td>
                                                {/* نوع الحساب */}
                                                <td className="p-1.5"><input type="text" disabled={!line.accountName?.includes('شيك')} value={line.bankAccountType} onChange={e => updateReceiptLine(line.id, 'bankAccountType', e.target.value)} className="grid-input" /></td>
                                                {/* رقم حساب */}
                                                <td className="p-1.5"><input type="text" disabled={!line.accountName?.includes('شيك')} value={line.bankAccountNo} onChange={e => updateReceiptLine(line.id, 'bankAccountNo', e.target.value)} className="grid-input font-mono" /></td>
                                                {/* Delete */}
                                                <td className="p-1.5 text-center">
                                                    <button onClick={() => { if (receiptLines.length > 1) setReceiptLines(prev => prev.filter(x => x.id !== line.id)); }}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-indigo-50/50 font-bold text-sm">
                                            <td colSpan={6} className="p-2 text-slate-500">إجمالي</td>
                                            <td className="p-2 text-center font-mono text-indigo-600">{receiptLines.reduce((s, l) => s + (Number(l.debitForeign) || 0), 0).toLocaleString()}</td>
                                            <td className="p-2 text-center font-mono text-indigo-700 text-base">{totalReceiptDebit.toLocaleString()}</td>
                                            <td colSpan={8}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <div className="p-3 border-t border-slate-100">
                                    <button onClick={() => setReceiptLines(prev => [...prev, emptyReceiptLine()])}
                                        className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all text-sm">
                                        <Plus size={16} /><span>إضافة سطر</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Against Tab Grid */}
                        {activeTab === 'AGAINST' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm" style={{ minWidth: '900px' }}>
                                    <thead className="bg-slate-50/80 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-2 py-2.5 w-[120px]">حساب</th>
                                            <th className="px-2 py-2.5 w-[70px]">عملة</th>
                                            <th className="px-2 py-2.5 w-[90px]">حساب فرعي</th>
                                            <th className="px-2 py-2.5 w-[120px]">مرجع</th>
                                            <th className="px-2 py-2.5 w-[100px]">قيمة مدين</th>
                                            <th className="px-2 py-2.5 w-[100px]">مدين</th>
                                            <th className="px-2 py-2.5 w-[100px]">قيمة دائن</th>
                                            <th className="px-2 py-2.5 w-[100px]">دائن</th>
                                            <th className="px-2 py-2.5 w-[100px]">مرجع ضريبي</th>
                                            <th className="px-2 py-2.5 w-[100px]">تاريخ الفاتورة</th>
                                            <th className="px-2 py-2.5 w-[40px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {againstLines.map(line => (
                                            <tr key={line.id} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="p-1.5">
                                                    <div className="flex gap-1">
                                                        <input value={line.accountCode || ''}
                                                            onChange={e => updateAgainstLine(line.id, 'accountCode', e.target.value)}
                                                            onBlur={e => handleAccountCodeBlur(line.id, e.target.value, 'AGAINST')}
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); openAccountPicker(line.id, 'AGAINST'); } }}
                                                            placeholder="كود..." className="grid-input font-mono flex-1" title={line.accountName} />
                                                        <button onClick={() => openAccountPicker(line.id, 'AGAINST')}
                                                            className="px-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="بحث">
                                                            <Search size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-1.5">
                                                    <select value={line.lineCurrency} onChange={e => updateAgainstLine(line.id, 'lineCurrency', e.target.value)} className="grid-select">
                                                        {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                                                        {currencies.length === 0 && <option value="ILS">ILS</option>}
                                                    </select>
                                                </td>
                                                <td className="p-1.5">
                                                    <div className="flex gap-1">
                                                        <input type="text" value={line.subAccountId || ''}
                                                            onChange={e => updateAgainstLine(line.id, 'subAccountId', e.target.value)}
                                                            className="grid-input" />
                                                        <button onClick={() => openAccountPicker(line.id, 'AGAINST', true)}
                                                            disabled={!line.accountId}
                                                            className={`px-1.5 transition-colors ${!line.accountId ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'}`} title="بحث حساب فرعي">
                                                            <Search size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-1.5"><input type="text" value={line.lineRef} onChange={e => updateAgainstLine(line.id, 'lineRef', e.target.value)} className="grid-input font-mono" placeholder="كود العميل" /></td>
                                                <td className="p-1.5"><input type="number" value={line.debitForeign || ''} onChange={e => updateAgainstLine(line.id, 'debitForeign', Number(e.target.value))} className="grid-input grid-input-num" /></td>
                                                <td className="p-1.5"><input type="number" value={line.debit || ''} onChange={e => updateAgainstLine(line.id, 'debit', Number(e.target.value))} className="grid-input grid-input-num" /></td>
                                                <td className="p-1.5"><input type="number" value={line.creditForeign || ''} onChange={e => updateAgainstLine(line.id, 'creditForeign', Number(e.target.value))} className="grid-input grid-input-num" /></td>
                                                <td className="p-1.5"><input type="number" value={line.credit || ''} onChange={e => updateAgainstLine(line.id, 'credit', Number(e.target.value))} className="grid-input grid-input-num text-emerald-700 font-bold" /></td>
                                                <td className="p-1.5"><input type="text" value={line.taxRef} onChange={e => updateAgainstLine(line.id, 'taxRef', e.target.value)} className="grid-input" /></td>
                                                <td className="p-1.5"><input type="date" value={line.invoiceDate} onChange={e => updateAgainstLine(line.id, 'invoiceDate', e.target.value)} className="grid-input" /></td>
                                                <td className="p-1.5 text-center">
                                                    <button onClick={() => { if (againstLines.length > 1) setAgainstLines(prev => prev.filter(x => x.id !== line.id)); }}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-indigo-50/50 font-bold text-sm">
                                            <td colSpan={4} className="p-2 text-slate-500">إجمالي</td>
                                            <td className="p-2 text-center font-mono">{againstLines.reduce((s, l) => s + (Number(l.debitForeign) || 0), 0).toLocaleString()}</td>
                                            <td className="p-2 text-center font-mono">{againstLines.reduce((s, l) => s + (Number(l.debit) || 0), 0).toLocaleString()}</td>
                                            <td className="p-2 text-center font-mono">{againstLines.reduce((s, l) => s + (Number(l.creditForeign) || 0), 0).toLocaleString()}</td>
                                            <td className="p-2 text-center font-mono text-emerald-700 text-base">{totalAgainstCredit.toLocaleString()}</td>
                                            <td colSpan={3}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <div className="p-3 border-t border-slate-100">
                                    <button onClick={() => setAgainstLines(prev => [...prev, emptyAgainstLine()])}
                                        className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all text-sm">
                                        <Plus size={16} /><span>إضافة سطر</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ===== Footer Summary ===== */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                                <span className="font-bold text-slate-700 ml-1">المبلغ كتابة:</span>
                                {totalReceiptDebit > 0 ? toArabicWords(totalReceiptDebit, 'ILS') : '...'}
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <div className="text-[11px] text-slate-400 font-bold">مجموع القبض (مدين)</div>
                                    <div className="text-xl font-black text-indigo-600 font-mono">{totalReceiptDebit.toLocaleString()}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[11px] text-slate-400 font-bold">مجموع المقابل (دائن)</div>
                                    <div className="text-xl font-black text-emerald-600 font-mono">{totalAgainstCredit.toLocaleString()}</div>
                                </div>
                                <div className={`text-center px-6 py-2 rounded-xl border-2 ${Math.abs(difference) < 0.01 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                                    <div className="text-[11px] font-bold text-slate-400">الفرق</div>
                                    <div className={`text-2xl font-black font-mono ${Math.abs(difference) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {difference === 0 ? '✓ 0' : difference.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Template */}
            <div className="printable">
                <PrintTemplate header={header} receiptLines={receiptLines} againstLines={againstLines}
                    totalDebit={totalReceiptDebit} totalCredit={totalAgainstCredit} branches={branches} />
            </div>
        </div>
    );
};

// ============ Print Template ============

const PrintTemplate = ({ header, receiptLines, againstLines, totalDebit, totalCredit, branches }: any) => {
    const branchName = branches?.find((b: any) => b.id === header.branchId)?.name_ar || 'الرئيسي';
    return (
        <div className="p-6 border-2 border-gray-800" dir="rtl">
            <div className="flex justify-between border-b-2 border-gray-800 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black">سند قبض</h1>
                    <h2 className="text-lg text-gray-600">Receipt Voucher</h2>
                </div>
                <div className="text-left text-sm space-y-1">
                    <div>رقم: <b className="font-mono">{header.voucherNo}</b></div>
                    <div>تاريخ: <b>{header.date}</b></div>
                    <div>فرع: <b>{branchName}</b></div>
                </div>
            </div>

            <div className="mb-4 p-3 border border-gray-300 rounded">
                <b>استلمنا من:</b> {header.partnerName} ({header.partnerCode})
                {header.salesRepCode && <span className="mr-4">| مندوب: {header.salesRepName} ({header.salesRepCode})</span>}
            </div>

            <h3 className="font-bold text-sm mb-2 bg-gray-100 p-2">تفاصيل القبض (مدين)</h3>
            <table className="w-full border-collapse border border-gray-300 text-xs mb-4">
                <thead><tr className="bg-gray-100">
                    <th className="border border-gray-300 p-1">#</th>
                    <th className="border border-gray-300 p-1">حساب</th>
                    <th className="border border-gray-300 p-1">عملة</th>
                    <th className="border border-gray-300 p-1">قيمة مدين</th>
                    <th className="border border-gray-300 p-1">مدين</th>
                    <th className="border border-gray-300 p-1">شيك</th>
                    <th className="border border-gray-300 p-1">بنك</th>
                    <th className="border border-gray-300 p-1">استحقاق</th>
                    <th className="border border-gray-300 p-1">مرجع</th>
                </tr></thead>
                <tbody>
                    {receiptLines.map((l: any, i: number) => (
                        <tr key={i}>
                            <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                            <td className="border border-gray-300 p-1">{l.accountCode} {l.accountName}</td>
                            <td className="border border-gray-300 p-1 text-center">{l.lineCurrency}</td>
                            <td className="border border-gray-300 p-1 text-center font-mono">{Number(l.debitForeign).toLocaleString()}</td>
                            <td className="border border-gray-300 p-1 text-center font-mono font-bold">{Number(l.debitLocal).toLocaleString()}</td>
                            <td className="border border-gray-300 p-1 text-center">{l.chequeNo || '-'}</td>
                            <td className="border border-gray-300 p-1">{l.bankName || '-'}</td>
                            <td className="border border-gray-300 p-1 text-center">{l.dueDate || '-'}</td>
                            <td className="border border-gray-300 p-1">{l.lineRef}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot><tr className="bg-gray-50 font-bold">
                    <td colSpan={4} className="border border-gray-300 p-1 text-left">إجمالي</td>
                    <td className="border border-gray-300 p-1 text-center font-mono">{Number(totalDebit).toLocaleString()}</td>
                    <td colSpan={4}></td>
                </tr></tfoot>
            </table>

            <h3 className="font-bold text-sm mb-2 bg-gray-100 p-2">المقابل (دائن)</h3>
            <table className="w-full border-collapse border border-gray-300 text-xs mb-6">
                <thead><tr className="bg-gray-100">
                    <th className="border border-gray-300 p-1">#</th>
                    <th className="border border-gray-300 p-1">حساب</th>
                    <th className="border border-gray-300 p-1">عملة</th>
                    <th className="border border-gray-300 p-1">مرجع</th>
                    <th className="border border-gray-300 p-1">دائن</th>
                </tr></thead>
                <tbody>
                    {againstLines.map((l: any, i: number) => (
                        <tr key={i}>
                            <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                            <td className="border border-gray-300 p-1">{l.accountCode} {l.accountName}</td>
                            <td className="border border-gray-300 p-1 text-center">{l.lineCurrency}</td>
                            <td className="border border-gray-300 p-1">{l.lineRef}</td>
                            <td className="border border-gray-300 p-1 text-center font-mono font-bold">{Number(l.credit).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot><tr className="bg-gray-50 font-bold">
                    <td colSpan={4} className="border border-gray-300 p-1 text-left">إجمالي</td>
                    <td className="border border-gray-300 p-1 text-center font-mono">{Number(totalCredit).toLocaleString()}</td>
                </tr></tfoot>
            </table>

            <div className="border-t-2 border-gray-800 pt-4 mb-8">
                <p><b>المبلغ كتابة:</b> {toArabicWords(totalDebit, 'ILS')}</p>
            </div>

            <div className="flex justify-between mt-12">
                <div className="text-center w-40"><p className="border-b border-gray-400 pb-2 mb-1 font-bold text-sm">المحاسب</p><p className="text-xs text-gray-400 p-3">............</p></div>
                <div className="text-center w-40"><p className="border-b border-gray-400 pb-2 mb-1 font-bold text-sm">المدير المالي</p><p className="text-xs text-gray-400 p-3">............</p></div>
                <div className="text-center w-40"><p className="border-b border-gray-400 pb-2 mb-1 font-bold text-sm">المستلم</p><p className="text-xs text-gray-400 p-3">............</p></div>
            </div>
        </div>
    );
};
