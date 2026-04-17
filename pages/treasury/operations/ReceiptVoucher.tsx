import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Save, Printer, Search, Plus, Trash2,
    ArrowRight, Hash, DollarSign, AlertTriangle, CheckCircle2, Filter
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedPartnerPicker, UnifiedPartner } from '../../../components/UnifiedPartnerPicker';
import { AccountPicker } from '../../../components/AccountPicker';
import { v4 as uuidv4 } from 'uuid';
import { toArabicWords } from '../../../src/utils/tafqeet';
import { useEnterNavigation } from '../../../src/hooks/useEnterNavigation';
import { useTabs } from '../../../src/contexts/TabsContext';
import { DocumentSupportDock } from '../../../src/components/workspace/DocumentSupportDock';
import { getTreasurySupportSections } from '../../../src/components/workspace/documentSupportSections';
import { getFloatingMenuPositionFromRect, getFloatingMenuPositionFromPoint } from '../../../src/lib/floatingMenu';

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
interface PartnerOption {
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
    code: string;
    name: string;
    linked_account_id?: string;
    raw: any;
}
interface SalesRepOption {
    id: string;
    code: string;
    name: string;
    raw: any;
}

const normalizeText = (value: unknown): string => String(value ?? '').trim();
const toUniqueTextList = (rows: unknown[]): string[] =>
    Array.from(new Set(rows.map(normalizeText).filter(Boolean)));

const inferReferenceTypeFromAgainstLine = (line: AgainstLine, header: ReceiptHeader): string => {
    const ref = normalizeText(line.lineRef).toLowerCase();
    if (ref.includes('عميل') || ref.includes('customer')) return 'CUSTOMER';
    if (ref.includes('مورد') || ref.includes('supplier')) return 'SUPPLIER';
    if (ref.includes('موظف') || ref.includes('employee')) return 'EMPLOYEE';
    if (normalizeText(line.lineRef) === normalizeText(header.partnerCode)) {
        return normalizeText(header.payeeType) || 'GENERAL';
    }
    return 'GENERAL';
};

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
    const { openTab } = useTabs();
    const containerRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(containerRef);
    const helperSections = useMemo(() => getTreasurySupportSections(), []);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'RECEIPT' | 'AGAINST'>('RECEIPT');
    const [lastSavedVoucherNo, setLastSavedVoucherNo] = useState<string | null>(null);
    const [isPosted, setIsPosted] = useState(false);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);
    const [showOptionalHeader, setShowOptionalHeader] = useState(false);
    const [showSupportDock, setShowSupportDock] = useState(false);
    const [showChequeColumns, setShowChequeColumns] = useState(false);
    const [autoSyncAgainst, setAutoSyncAgainst] = useState(true);

    // Master Data
    const [banks, setBanks] = useState<Bank[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [allPartners, setAllPartners] = useState<PartnerOption[]>([]);
    const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
    const [descriptionOptions, setDescriptionOptions] = useState<string[]>([]);
    const [lineRefOptions, setLineRefOptions] = useState<string[]>([]);

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

    // Grid Filtering State
    const [activeColumnMenu, setActiveColumnMenu] = useState<{
        tab: 'RECEIPT' | 'AGAINST';
        colKey: string;
        label: string;
        position: any;
    } | null>(null);
    const [receiptFilters, setReceiptFilters] = useState<Record<string, string>>({});
    const [againstFilters, setAgainstFilters] = useState<Record<string, string>>({});

    const handleFilterChange = (tab: 'RECEIPT' | 'AGAINST', colKey: string, value: string) => {
        if (tab === 'RECEIPT') setReceiptFilters(prev => ({ ...prev, [colKey]: value }));
        else setAgainstFilters(prev => ({ ...prev, [colKey]: value }));
    };

    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-column-filter-menu="1"]') && !target.closest('[data-column-filter-trigger="1"]')) {
                setActiveColumnMenu(null);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveColumnMenu(null);
        };
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    const openFilterMenu = (e: React.MouseEvent, tab: 'RECEIPT' | 'AGAINST', colKey: string, label: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        let position;
        if (e.type === 'contextmenu') {
            position = getFloatingMenuPositionFromPoint(e.clientX, e.clientY, { menuWidth: 280, menuHeight: 180, preferredAlign: 'right', offset: 8, margin: 14, minHeight: 150 });
        } else {
            const target = e.currentTarget as HTMLElement;
            position = getFloatingMenuPositionFromRect(target.getBoundingClientRect(), { menuWidth: 280, menuHeight: 180, preferredAlign: 'right', offset: 8, margin: 14, minHeight: 150 });
        }
        setActiveColumnMenu({ tab, colKey, label, position });
    };

    const clearFilter = (tab: 'RECEIPT' | 'AGAINST', colKey: string) => {
        if (tab === 'RECEIPT') setReceiptFilters(prev => { const n = { ...prev }; delete n[colKey]; return n; });
        else setAgainstFilters(prev => { const n = { ...prev }; delete n[colKey]; return n; });
        setActiveColumnMenu(null);
    };

    const filteredReceiptLines = useMemo(() => receiptLines.filter(line => Object.entries(receiptFilters).every(([key, val]) => !val || String((line as any)[key] || '').toLowerCase().includes(val.toLowerCase()))), [receiptLines, receiptFilters]);
    const filteredAgainstLines = useMemo(() => againstLines.filter(line => Object.entries(againstFilters).every(([key, val]) => !val || String((line as any)[key] || '').toLowerCase().includes(val.toLowerCase()))), [againstLines, againstFilters]);

    const openPortalTab = (path: string, title: string) => {
        openTab({
            id: path,
            path,
            title,
            isClosable: true
        });
    };

    // ============ Load Data ============
    const { id } = useParams();

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (!api) return;
            const [bks, curs, ccs, brs, nextNo, customerRows, supplierRows, employeeRows, salesRepRows, receiptRows] = await Promise.all([
                api.masterData.getBanks(),
                api.currency.getCurrencies(),
                api.masterData.getCostCenters(),
                api.masterData.getBranches(),
                id && id !== 'new' ? null : api.journal.getNextVoucherNo('REC'),
                api.partner.getPartners('CUSTOMER'),
                api.partner.getPartners('SUPPLIER'),
                api.hr?.getEmployees ? api.hr.getEmployees() : Promise.resolve([]),
                api.partner?.getSalesReps ? api.partner.getSalesReps() : Promise.resolve([]),
                api.treasury.getReceipts ? api.treasury.getReceipts({}) : Promise.resolve([])
            ]);
            setBanks(bks || []); setCurrencies(curs || []);
            setCostCenters(ccs || []); setBranches(brs || []);
            const currencyRows = Array.isArray(curs) ? curs : [];
            const resolveExchangeRate = (currencyCode: unknown): number => {
                const code = normalizeText(currencyCode).toUpperCase();
                if (!code || code === 'ILS') return 1;
                const matched = currencyRows.find((currency: any) => normalizeText(currency?.code).toUpperCase() === code);
                const rawRate = Number(matched?.exchange_rate);
                return Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 1;
            };

            const mapPartner = (
                row: any,
                type: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE'
            ): PartnerOption | null => {
                const partnerId = normalizeText(row?.id);
                const code = normalizeText(row?.code || row?.employee_code);
                const name = normalizeText(row?.name_ar || row?.name || row?.name_en || row?.full_name);
                if (!partnerId || (!code && !name)) return null;
                return {
                    id: partnerId,
                    type,
                    code,
                    name,
                    linked_account_id: row?.linked_account_id,
                    raw: row
                };
            };

            const partners = [
                ...(customerRows || []).map((row: any) => mapPartner(row, 'CUSTOMER')),
                ...(supplierRows || []).map((row: any) => mapPartner(row, 'SUPPLIER')),
                ...(employeeRows || []).map((row: any) => mapPartner(row, 'EMPLOYEE'))
            ].filter(Boolean) as PartnerOption[];
            setAllPartners(partners);

            const reps = (salesRepRows || [])
                .map((row: any): SalesRepOption | null => {
                    const code = normalizeText(row?.code || row?.rep_code || row?.sales_rep_code);
                    const name = normalizeText(row?.name_ar || row?.name || row?.name_en);
                    if (!code && !name) return null;
                    return {
                        id: normalizeText(row?.id || code || name),
                        code,
                        name,
                        raw: row
                    };
                })
                .filter(Boolean) as SalesRepOption[];
            setSalesReps(reps);

            const receiptList = Array.isArray(receiptRows) ? receiptRows : [];
            const historicalDescriptions = toUniqueTextList(receiptList.map((row: any) => row?.description));
            setDescriptionOptions(historicalDescriptions);
            setLineRefOptions(
                toUniqueTextList([
                    ...receiptList.map((row: any) => row?.manual_ref),
                    ...receiptList.map((row: any) => row?.sales_rep_code),
                    ...partners.map((partner) => partner.code),
                    ...reps.map((rep) => rep.code)
                ])
            );

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
                    const p = partners.find((x: any) => x.id === String(h.partner_id));
                    if (p) {
                        setHeader(prev => ({ ...prev, partnerCode: p.code, partnerName: p.name }));
                    }

                    // Map Receipt Lines (Debit Side) -> Cash/Bank + Checks
                    const newLines: ReceiptLine[] = [];

                    // 1. Checks
                    if (data.checks && data.checks.length > 0) {
                        data.checks.forEach((c: any) => {
                            const lineCurrency = normalizeText(c.currency_id || c.currency || 'ILS').toUpperCase() || 'ILS';
                            const exchangeRate = resolveExchangeRate(lineCurrency);
                            const debitForeign = Number(c.amount) || 0;
                            const debitLocal = Math.round(debitForeign * exchangeRate * 100) / 100;
                            // Find associated journal line for account info if possible, or just use check data
                            newLines.push({
                                id: uuidv4(),
                                accountId: null, // We might need to find the account from journal lines matching this check amount?? 
                                // Actually usually check debits "Cheques in Box".
                                accountCode: '', accountName: 'شيكات برسم التحصيل', // Default?
                                lineCurrency,
                                subAccountId: '', subAccountName: '', creditCard: false, paymentDate: c.received_date,
                                lineRef: '', debitForeign, debitLocal,
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
                                subAccountId: l.sub_account_id || l.cost_center_id || '', subAccountName: '', creditCard: l.type === 'CREDIT_CARD', paymentDate: h.date,
                                lineRef: l.invoice_ref || '', debitForeign: l.debit, debitLocal: l.debit,
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
                            lineCurrency: 'ILS', subAccountId: l.sub_account_id || '', lineRef: l.invoice_ref || '',
                            debitForeign: 0, debit: 0, creditForeign: l.credit, credit: l.credit,
                            taxRef: l.tax_ref || '', invoiceDate: l.due_date || ''
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

    const invalidReceiptRows = useMemo(() => {
        return receiptLines.filter((line) => {
            if (!line.accountId || Number(line.debitLocal) <= 0) return true;
            if (line.chequeNo && (!line.bankId || !line.dueDate)) return true;
            return false;
        }).length;
    }, [receiptLines]);

    const invalidAgainstRows = useMemo(() => {
        return againstLines.filter((line) => !line.accountId || Number(line.credit) <= 0).length;
    }, [againstLines]);

    const chequeLinesCount = useMemo(() => receiptLines.filter((line) => Boolean(line.chequeNo)).length, [receiptLines]);
    const hasChequeDetails = useMemo(() => {
        return receiptLines.some((line) => (
            Boolean(line.chequeNo) || Boolean(line.bankId) || Boolean(line.dueDate) || Boolean(line.endorser)
            || Boolean(line.originalSource) || Boolean(line.bankAccountType) || Boolean(line.bankAccountNo)
        ));
    }, [receiptLines]);

    const canSave = useMemo(() => {
        if (!header.partnerId) return false;
        if (totalReceiptDebit <= 0) return false;
        if (Math.abs(difference) > 0.01) return false;
        if (invalidReceiptRows > 0 || invalidAgainstRows > 0) return false;
        return true;
    }, [header.partnerId, totalReceiptDebit, difference, invalidReceiptRows, invalidAgainstRows]);

    const systemSignals = useMemo(() => {
        const signals: Array<{ tone: 'ok' | 'warn' | 'error'; text: string }> = [];
        if (!header.partnerId) signals.push({ tone: 'warn', text: 'لم يتم اختيار العميل/الدافع بعد.' });
        if (totalReceiptDebit <= 0) signals.push({ tone: 'warn', text: 'لا يوجد مبلغ قبض فعلي.' });
        if (invalidReceiptRows > 0) signals.push({ tone: 'error', text: `يوجد ${invalidReceiptRows} سطر غير مكتمل في تبويب قبض.` });
        if (invalidAgainstRows > 0) signals.push({ tone: 'error', text: `يوجد ${invalidAgainstRows} سطر غير مكتمل في تبويب مقابل.` });
        if (Math.abs(difference) > 0.01) signals.push({ tone: 'error', text: `القيد غير متوازن. الفرق الحالي = ${difference.toLocaleString()}` });
        if (chequeLinesCount > 0) signals.push({ tone: 'ok', text: `تم اكتشاف ${chequeLinesCount} سطر شيك مع تتبع تاريخ الاستحقاق.` });
        if (signals.length === 0) signals.push({ tone: 'ok', text: 'السند جاهز للحفظ والترحيل.' });
        return signals;
    }, [header.partnerId, totalReceiptDebit, invalidReceiptRows, invalidAgainstRows, difference, chequeLinesCount]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const withCtrl = event.ctrlKey || event.metaKey;

            if (withCtrl && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (!submitting && canSave) {
                    void handleSave();
                }
                return;
            }

            if (event.altKey && event.key === '1') {
                event.preventDefault();
                setActiveTab('RECEIPT');
                return;
            }

            if (event.altKey && event.key === '2') {
                event.preventDefault();
                setActiveTab('AGAINST');
                return;
            }

            if (withCtrl && event.key === 'Enter') {
                event.preventDefault();
                if (activeTab === 'RECEIPT') {
                    setReceiptLines((prev) => [...prev, emptyReceiptLine()]);
                    setReceiptFilters({});
                } else {
                    setAgainstLines((prev) => [...prev, emptyAgainstLine()]);
                    setAgainstFilters({});
                }
                return;
            }

            if (withCtrl && event.key === 'Backspace') {
                event.preventDefault();
                if (activeTab === 'RECEIPT' && receiptLines.length > 1) {
                    setReceiptLines((prev) => prev.slice(0, -1));
                } else if (activeTab === 'AGAINST' && againstLines.length > 1) {
                    setAgainstLines((prev) => prev.slice(0, -1));
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [submitting, canSave, activeTab, receiptLines.length, againstLines.length]);

    // ============ Grid Keyboard Navigation ============
    const handleGridKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

        const target = e.target as HTMLElement;
        if (!['INPUT', 'SELECT', 'BUTTON'].includes(target.tagName)) return;

        // عدم التعارض مع القوائم المنسدلة (Datalists)
        if (target.tagName === 'INPUT' && target.hasAttribute('list') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;

        const cell = target.closest('td');
        const row = target.closest('tr');
        const tbody = target.closest('tbody');
        if (!cell || !row || !tbody) return;

        const allRows = Array.from(tbody.querySelectorAll('tr'));
        const rowIndex = allRows.indexOf(row);
        const allCells = Array.from(row.querySelectorAll('td'));
        const colIndex = allCells.indexOf(cell);

        // التنقل العامودي (أعلى / أسفل)
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            let nextRowIndex = rowIndex;
            if (e.key === 'ArrowUp') {
                nextRowIndex = Math.max(0, rowIndex - 1);
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                nextRowIndex = Math.min(allRows.length - 1, rowIndex + 1);
                e.preventDefault();
            }

            if (nextRowIndex !== rowIndex) {
                const targetRow = allRows[nextRowIndex];
                if (targetRow) {
                    const targetCell = targetRow.querySelectorAll('td')[colIndex];
                    if (targetCell) {
                        const focusable = targetCell.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), button:not([disabled])') as HTMLElement;
                        if (focusable) {
                            focusable.focus();
                            if (focusable.tagName === 'INPUT') {
                                setTimeout(() => { try { (focusable as HTMLInputElement).select(); } catch(err) {} }, 0);
                            }
                        }
                    }
                }
            }
            return;
        }

        // التنقل الأفقي (يمين / يسار)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'checkbox') {
                const input = target as HTMLInputElement;
                let isSelected = false, isAtStart = true, isAtEnd = true;
                try {
                    isSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
                    isAtStart = input.selectionStart === 0;
                    isAtEnd = input.selectionStart === input.value.length;
                } catch (err) {
                    // معالجة استثنائية لحقول الأرقام التي لا تدعم selectionStart في بعض المتصفحات
                    isSelected = true;
                }

                // في واجهة RTL: السهم الأيمن ينقل لليمين فيزيائياً (وهو بداية النص)
                if (e.key === 'ArrowRight' && !isSelected && !isAtStart) return;
                if (e.key === 'ArrowLeft' && !isSelected && !isAtEnd) return;
            }

            let checkCol = colIndex + (e.key === 'ArrowRight' ? -1 : 1);
            e.preventDefault();
            
            while (checkCol >= 0 && checkCol < allCells.length) {
                const targetCell = row.querySelectorAll('td')[checkCol];
                if (targetCell) {
                    const focusable = targetCell.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), button:not([disabled])') as HTMLElement;
                    if (focusable) {
                        focusable.focus();
                        if (focusable.tagName === 'INPUT') {
                            setTimeout(() => { try { (focusable as HTMLInputElement).select(); } catch(err) {} }, 0);
                        }
                        break;
                    }
                }
                checkCol += (e.key === 'ArrowRight' ? -1 : 1);
            }
        }
    };

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
        if (!autoSyncAgainst) return;
        if (againstLines.length === 1 && againstLines[0].accountId && totalReceiptDebit > 0) {
            setAgainstLines(prev => prev.map((l, i) =>
                i === 0 ? { ...l, credit: totalReceiptDebit, creditForeign: totalReceiptDebit } : l
            ));
        }
    }, [totalReceiptDebit, autoSyncAgainst]);

    const handlePartnerCodeBlur = async () => {
        if (!header.partnerCode) return;
        const typedCode = normalizeText(header.partnerCode);
        const match = allPartners?.find((partner) => normalizeText(partner.code) === typedCode);
        if (match) {
            const unified: UnifiedPartner = {
                id: match.id,
                type: match.type,
                code: match.code,
                name: match.name,
                linked_account_id: match.linked_account_id,
                raw_data: match.raw
            };
            await handlePartnerSelect(unified);
        } else {
            setHeader(prev => ({ ...prev, partnerName: '-- غير موجود --' }));
        }
    };

    const fillSalesRepByCode = (codeValue: string) => {
        const typedCode = normalizeText(codeValue);
        if (!typedCode) return;
        const match = salesReps.find((rep) => normalizeText(rep.code) === typedCode);
        if (!match) return;
        setHeader((prev) => ({
            ...prev,
            salesRepCode: match.code || typedCode,
            salesRepName: match.name || prev.salesRepName
        }));
    };

    const fillSalesRepByName = (nameValue: string) => {
        const typedName = normalizeText(nameValue);
        if (!typedName) return;
        const match = salesReps.find((rep) => normalizeText(rep.name) === typedName);
        if (!match) return;
        setHeader((prev) => ({
            ...prev,
            salesRepCode: match.code || prev.salesRepCode,
            salesRepName: match.name
        }));
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
        if (field === 'credit' || field === 'creditForeign' || field === 'debit' || field === 'debitForeign') {
            setAutoSyncAgainst(false);
        }
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
                    sub_account_id: l.subAccountId || null,
                    reference: l.lineRef || null,
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
                    reference_type: inferReferenceTypeFromAgainstLine(l, header),
                    sub_account_id: l.subAccountId,
                    tax_ref: l.taxRef,
                    invoice_date: l.invoiceDate
                }))
            };

            const res = await (window as any).electronAPI.treasury.createReceipt(payload);
            if (res.success) {
                alert(`✅ تم حفظ سند القبض رقم ${res.voucher_no}`);
                setLastSavedVoucherNo(res.voucher_no || null);
                setIsPosted(true);
                setSaveNotice(`تم الحفظ والترحيل بنجاح • رقم السند ${res.voucher_no}`);
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

    const FilterableHeader = ({ tab, colKey, label, widthClass }: { tab: 'RECEIPT' | 'AGAINST', colKey: string, label: string, widthClass?: string }) => {
        const filters = tab === 'RECEIPT' ? receiptFilters : againstFilters;
        const isActive = !!filters[colKey];

        return (
            <th
                className={`border-b border-l border-slate-200 bg-slate-50 p-2.5 align-middle select-none hover:bg-sky-50 transition-colors cursor-context-menu ${widthClass || ''}`}
                onContextMenu={(e) => openFilterMenu(e, tab, colKey, label)}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <span className="block truncate text-[12px] font-bold text-slate-700">{label}</span>
                        {isActive && <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">مفلتر</span>}
                    </div>
                    <button
                        type="button"
                        data-column-filter-trigger="1"
                        onClick={(e) => openFilterMenu(e, tab, colKey, label)}
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition ${isActive ? 'border-sky-300 bg-sky-100 text-sky-700 shadow-sm' : 'border-transparent text-slate-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'}`}
                    >
                        <Filter size={13} />
                    </button>
                </div>
            </th>
        );
    };

    return (
        <div ref={containerRef} className="relative z-10 flex h-full flex-col bg-slate-50/50" dir="rtl">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_12%,rgba(99,102,241,0.11),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(16,185,129,0.10),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_56%)]" />
            <style>{`
                @media print { .no-print { display: none !important; } .printable { display: block !important; } body { background: white; } @page { size: A4 landscape; margin: 8mm; } }
                .printable { display: none; }
                .grid-input { width: 100%; padding: 6px 8px; border: 1px solid transparent; border-radius: 4px; font-size: 13px; outline: none; transition: all 0.15s; background: transparent; }
                .grid-input:hover:not(:disabled) { border-color: #cbd5e1; background: white; }
                .grid-input:focus:not(:disabled) { border-color: #6366f1; background: white; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
                .grid-input:disabled { background: transparent; color: #94a3b8; border-color: transparent; }
                .grid-input-num { text-align: center; font-family: 'Courier New', monospace; font-weight: 700; }
                .grid-select { width: 100%; padding: 6px 8px; border: 1px solid transparent; border-radius: 4px; font-size: 13px; outline: none; background: transparent; transition: all 0.15s; }
                .grid-select:hover:not(:disabled) { border-color: #cbd5e1; background: white; }
                .grid-select:focus:not(:disabled) { border-color: #6366f1; background: white; }
                .tab-btn { padding: 10px 24px; font-weight: 700; font-size: 14px; border-bottom: 3px solid transparent; transition: all 0.15s; cursor: pointer; }
                .tab-btn:hover { background: #f1f5f9; }
                .tab-active { border-bottom-color: #6366f1; color: #4338ca; background: #eef2ff; }
            `}</style>

            <UnifiedPartnerPicker isOpen={partnerPickerOpen} onClose={() => setPartnerPickerOpen(false)} onSelect={handlePartnerSelect} />
            <AccountPicker isOpen={accountPickerOpen} onClose={() => setAccountPickerOpen(false)} onSelect={handleAccountSelect}
                parentId={getActiveParentId()}
            />

            {/* ===== Top Bar ===== */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur"
            >
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowRight size={22} /></button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">سند قبض (Receipt Voucher)</h1>
                        <p className="text-[11px] font-bold text-slate-400">Double Entry — Bisan Style</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isPosted && (
                        <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                            مُرحّل
                        </div>
                    )}
                    {/* Balance indicator */}
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${Math.abs(difference) < 0.01 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {Math.abs(difference) < 0.01 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span>الفرق: {difference.toLocaleString()}</span>
                    </div>
                    <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Printer size={18} /><span>طباعة</span></button>
                    <button onClick={handleSave} disabled={submitting || !canSave}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                        <CheckCircle2 size={18} /><span>{submitting ? 'جاري التنفيذ...' : 'حفظ + ترحيل'}</span>
                    </button>
                </div>
            </motion.div>

            {/* ===== Content ===== */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-print">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="mx-auto max-w-[1600px] space-y-4"
                >
                    {saveNotice && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                            {saveNotice}
                            {lastSavedVoucherNo ? ` • آخر سند: ${lastSavedVoucherNo}` : ''}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-sm">
                            <div className="text-[11px] text-slate-400 font-bold">حالة القيد</div>
                            <div className={`mt-1 text-xl font-black ${Math.abs(difference) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {Math.abs(difference) < 0.01 ? 'متوازن' : 'غير متوازن'}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
                            <div className="text-[11px] text-slate-400 font-bold">القبض (مدين)</div>
                            <div className="mt-1 text-xl font-black text-indigo-700">{totalReceiptDebit.toLocaleString()}</div>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                            <div className="text-[11px] text-slate-400 font-bold">المقابل (دائن)</div>
                            <div className="mt-1 text-xl font-black text-emerald-700">{totalAgainstCredit.toLocaleString()}</div>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3 shadow-sm">
                            <div className="text-[11px] text-slate-400 font-bold">عدد سطور الشيكات</div>
                            <div className="mt-1 text-xl font-black text-amber-700">{chequeLinesCount}</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowSupportDock((prev) => !prev)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                            {showSupportDock ? 'إخفاء أدوات الدعم' : 'إظهار أدوات الدعم'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowOptionalHeader((prev) => !prev)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                            {showOptionalHeader ? 'إخفاء التفاصيل الاختيارية' : 'إظهار التفاصيل الاختيارية'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowChequeColumns((prev) => !prev)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                            {showChequeColumns ? 'إخفاء أعمدة الشيك' : 'إظهار أعمدة الشيك'}
                        </button>
                        {!autoSyncAgainst && (
                            <button
                                type="button"
                                onClick={() => {
                                    setAutoSyncAgainst(true);
                                    if (againstLines.length === 1) {
                                        setAgainstLines((prev) => prev.map((line, idx) => idx === 0 ? {
                                            ...line,
                                            credit: totalReceiptDebit,
                                            creditForeign: totalReceiptDebit
                                        } : line));
                                    }
                                }}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                            >
                                إعادة مزامنة المقابل تلقائيًا
                            </button>
                        )}
                    </div>

                    {showSupportDock && (
                        <DocumentSupportDock
                            sections={helperSections}
                            title="تعريفات سند القبض"
                            description="افتح العملاء والحسابات والبنوك ومراكز التكلفة والقوائم المرجعية من داخل السند مباشرة."
                        />
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 text-xs font-black text-slate-500">الإشعارات والقواعد</div>
                        <div className="space-y-1.5">
                            {systemSignals.map((signal, index) => (
                                <div
                                    key={`${signal.text}-${index}`}
                                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${signal.tone === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : signal.tone === 'warn' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}
                                >
                                    {signal.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ===== Header Card ===== */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <div className="grid grid-cols-12 gap-4">
                            {/* Partner */}
                            <div className="col-span-12 md:col-span-5">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">دليل (كود العميل)</label>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openPortalTab('/master/partners', 'بوابة الشركاء')}
                                        className="px-2.5 py-1 text-xs border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
                                    >
                                        بوابة الشركاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openPortalTab('/master/customer-card', 'بطاقة عميل')}
                                        className="px-2.5 py-1 text-xs border border-indigo-200 bg-indigo-50 rounded-md text-indigo-700 hover:bg-indigo-100 transition-colors"
                                    >
                                        بطاقة عميل
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="الكود" value={header.partnerCode}
                                        list="receipt-partner-code-list"
                                        onChange={e => setHeader({ ...header, partnerCode: e.target.value })}
                                        onBlur={handlePartnerCodeBlur}
                                        className="w-28 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none focus:border-indigo-500 font-mono text-sm font-bold" />
                                    <datalist id="receipt-partner-code-list">
                                        {allPartners.map((partner) => (
                                            <option
                                                key={`${partner.type}-${partner.id}`}
                                                value={partner.code}
                                                label={partner.name}
                                            />
                                        ))}
                                    </datalist>
                                    <div className="flex-1 cursor-pointer" onClick={() => setPartnerPickerOpen(true)}>
                                        <input readOnly value={header.partnerName} placeholder="اضغط للبحث..."
                                            className="w-full bg-slate-50 hover:bg-white border border-slate-200 rounded-lg py-2.5 px-3 outline-none cursor-pointer text-sm font-bold" />
                                    </div>
                                </div>
                            </div>

                            {/* Sales Rep */}
                            <div className="col-span-6 md:col-span-3">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">مندوب مبيعات</label>
                                <div className="mb-2">
                                    <button
                                        type="button"
                                        onClick={() => openPortalTab('/master/salesmen', 'بوابة المندوبين')}
                                        className="px-2.5 py-1 text-xs border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
                                    >
                                        قائمة المندوبين
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="كود" value={header.salesRepCode}
                                        list="receipt-sales-rep-code-list"
                                        onChange={e => setHeader({ ...header, salesRepCode: e.target.value })}
                                        onBlur={e => fillSalesRepByCode(e.target.value)}
                                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-2 outline-none focus:border-indigo-500 font-mono text-sm" />
                                    <datalist id="receipt-sales-rep-code-list">
                                        {salesReps.map((rep) => (
                                            <option key={`${rep.id}-code`} value={rep.code} label={rep.name} />
                                        ))}
                                    </datalist>
                                    <input type="text" placeholder="اسم المندوب" value={header.salesRepName}
                                        list="receipt-sales-rep-name-list"
                                        onChange={e => setHeader({ ...header, salesRepName: e.target.value })}
                                        onBlur={e => fillSalesRepByName(e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm" />
                                    <datalist id="receipt-sales-rep-name-list">
                                        {salesReps.map((rep) => (
                                            <option key={`${rep.id}-name`} value={rep.name} label={rep.code} />
                                        ))}
                                    </datalist>
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

                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">الفرع</label>
                                <select
                                    value={header.branchId}
                                    onChange={(e) => setHeader({ ...header, branchId: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm"
                                >
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
                                    ))}
                                </select>
                            </div>

                            {showOptionalHeader && (
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">مركز التكلفة</label>
                                <select
                                    value={header.costCenterId}
                                    onChange={(e) => setHeader({ ...header, costCenterId: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm"
                                >
                                    <option value="">--</option>
                                    {costCenters.map((center) => (
                                        <option key={center.id} value={center.id}>{center.code} - {center.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            )}

                            {showOptionalHeader && (
                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">مرجع يدوي</label>
                                <input
                                    type="text"
                                    value={header.manualRef}
                                    onChange={(e) => setHeader({ ...header, manualRef: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm font-mono"
                                />
                            </div>
                            )}

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
                                    list="receipt-description-list"
                                    placeholder="بيان عام للسند..." className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 outline-none text-sm" />
                                <datalist id="receipt-description-list">
                                    {descriptionOptions.map((description, index) => (
                                        <option key={`${description}-${index}`} value={description} />
                                    ))}
                                </datalist>
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
                                <span className="mr-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">{receiptLines.length}</span>
                                {invalidReceiptRows > 0 && <span className="mr-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">{invalidReceiptRows}!</span>}
                            </button>
                            <button className={`tab-btn ${activeTab === 'AGAINST' ? 'tab-active' : 'text-slate-500'}`}
                                onClick={() => setActiveTab('AGAINST')}>
                                مقابل <span className="text-[10px] mr-1 opacity-60">(دائن)</span>
                                <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">{againstLines.length}</span>
                                {invalidAgainstRows > 0 && <span className="mr-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">{invalidAgainstRows}!</span>}
                            </button>
                            {/* Totals in tabs bar */}
                            <div className="mr-auto flex items-center gap-6 px-6 text-sm">
                                <span className="text-slate-400">مجموع القبض: <b className="text-indigo-600 font-mono">{totalReceiptDebit.toLocaleString()}</b></span>
                                <span className="text-slate-400">مجموع المقابل: <b className="text-indigo-600 font-mono">{totalAgainstCredit.toLocaleString()}</b></span>
                            </div>
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                            {/* Receipt Tab Grid */}
                            {activeTab === 'RECEIPT' && (
                            <motion.div
                                key="RECEIPT"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="overflow-x-auto"
                            >
                                <table className="w-full border-separate border-spacing-0 text-right text-[13px] text-slate-700" style={{ minWidth: '1400px' }}>
                                    <thead className="sticky top-0 z-20 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                                        <tr>
                                            <FilterableHeader tab="RECEIPT" colKey="accountCode" label="حساب" widthClass="first:border-r w-[160px]" />
                                            <FilterableHeader tab="RECEIPT" colKey="lineCurrency" label="عملة" widthClass="w-[80px]" />
                                            <FilterableHeader tab="RECEIPT" colKey="subAccountId" label="حساب فرعي" widthClass="w-[120px]" />
                                            <th className="border-b border-l border-slate-200 bg-slate-50 p-2.5 align-middle w-[90px] text-center">بطاقة ائتمان</th>
                                            <FilterableHeader tab="RECEIPT" colKey="paymentDate" label="تاريخ الدفعة" widthClass="w-[120px]" />
                                            <FilterableHeader tab="RECEIPT" colKey="lineRef" label="مرجع" widthClass="w-[120px]" />
                                            <FilterableHeader tab="RECEIPT" colKey="debitForeign" label="قيمة مدين" widthClass="w-[110px]" />
                                            <FilterableHeader tab="RECEIPT" colKey="debitLocal" label="مدين" widthClass="w-[110px]" />
                                            {(showChequeColumns || hasChequeDetails) && <FilterableHeader tab="RECEIPT" colKey="dueDate" label="تاريخ الاستحقاق" widthClass="w-[120px]" />}
                                            {(showChequeColumns || hasChequeDetails) && <FilterableHeader tab="RECEIPT" colKey="endorser" label="مجيّر" widthClass="w-[110px]" />}
                                            {(showChequeColumns || hasChequeDetails) && <FilterableHeader tab="RECEIPT" colKey="originalSource" label="المصدر الأصلي" widthClass="w-[120px]" />}
                                            {(showChequeColumns || hasChequeDetails) && <FilterableHeader tab="RECEIPT" colKey="chequeNo" label="رقم الشيك" widthClass="w-[110px]" />}
                                            {(showChequeColumns || hasChequeDetails) && <FilterableHeader tab="RECEIPT" colKey="bankId" label="بنك" widthClass="w-[100px]" />}
                                            {(showChequeColumns || hasChequeDetails) && <FilterableHeader tab="RECEIPT" colKey="bankAccountType" label="نوع الحساب" widthClass="w-[100px]" />}
                                            {(showChequeColumns || hasChequeDetails) && <FilterableHeader tab="RECEIPT" colKey="bankAccountNo" label="رقم حساب" widthClass="w-[110px]" />}
                                            <th className="border-b border-l border-slate-200 bg-slate-50 p-2.5 align-middle w-[50px] text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody onKeyDown={handleGridKeyDown}>
                                        {filteredReceiptLines.map(line => (
                                            <tr key={line.id} className="bg-white hover:bg-sky-50 transition-colors group">
                                                {/* حساب */}
                                                <td className="border border-[#d7e9fb] p-1 relative">
                                                    <div className="flex gap-1">
                                                        <input value={line.accountCode || ''}
                                                            onChange={e => updateReceiptLine(line.id, 'accountCode', e.target.value)}
                                                            onBlur={e => handleAccountCodeBlur(line.id, e.target.value, 'RECEIPT')}
                                                            placeholder="كود..."
                                                            className={`grid-input font-mono flex-1 ${!line.accountId ? 'border-red-300 bg-red-50/40' : ''}`} title={line.accountName} />
                                                        <button onClick={() => openAccountPicker(line.id, 'RECEIPT')}
                                                            className="px-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="بحث">
                                                            <Search size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* عملة */}
                                                <td className="border border-[#d7e9fb] p-1 relative">
                                                    <select value={line.lineCurrency} onChange={e => updateReceiptLine(line.id, 'lineCurrency', e.target.value)} className="grid-select">
                                                        {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                                                        {currencies.length === 0 && <option value="ILS">ILS</option>}
                                                    </select>
                                                </td>
                                                {/* حساب فرعي */}
                                                <td className="border border-[#d7e9fb] p-1 relative">
                                                    <div className="flex gap-1">
                                                        <input type="text" value={line.subAccountId || ''}
                                                            onChange={e => updateReceiptLine(line.id, 'subAccountId', e.target.value)}
                                                            className="grid-input" title={line.subAccountName} />
                                                        <button onClick={() => openAccountPicker(line.id, 'RECEIPT', true)}
                                                            className="px-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="بحث حساب فرعي">
                                                            <Search size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* بطاقة ائتمان */}
                                                <td className="border border-[#d7e9fb] p-1 relative text-center">
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
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="date" value={line.paymentDate} onChange={e => updateReceiptLine(line.id, 'paymentDate', e.target.value)} className="grid-input" /></td>
                                                {/* مرجع */}
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="text" value={line.lineRef} list="receipt-line-ref-list" onChange={e => updateReceiptLine(line.id, 'lineRef', e.target.value)} className="grid-input" /></td>
                                                {/* قيمة مدين (foreign) */}
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="number" value={line.debitForeign || ''} onChange={e => updateReceiptLine(line.id, 'debitForeign', e.target.value)} className={`grid-input grid-input-num ${Number(line.debitLocal) <= 0 ? 'border-red-300 bg-red-50/40' : ''}`} /></td>
                                                {/* مدين (local) */}
                                                <td className="border border-[#d7e9fb] p-1 relative">
                                                    <input type="number" value={line.debitLocal || ''}
                                                        onChange={e => updateReceiptLine(line.id, 'debitLocal', Number(e.target.value))}
                                                        className={`grid-input grid-input-num text-indigo-700 ${Number(line.debitLocal) <= 0 ? 'border-red-300 bg-red-50/40' : ''}`} />
                                                </td>
                                                {/* تاريخ الاستحقاق */}
                                                {(showChequeColumns || hasChequeDetails) && <td className="border border-[#d7e9fb] p-1 relative"><input type="date" value={line.dueDate} onChange={e => updateReceiptLine(line.id, 'dueDate', e.target.value)} className={`grid-input ${line.chequeNo && !line.dueDate ? 'border-red-300 bg-red-50/40' : ''}`} /></td>}
                                                {/* مجيّر */}
                                                {(showChequeColumns || hasChequeDetails) && <td className="border border-[#d7e9fb] p-1 relative"><input type="text" value={line.endorser} onChange={e => updateReceiptLine(line.id, 'endorser', e.target.value)} className="grid-input" /></td>}
                                                {/* المصدر الأصلي */}
                                                {(showChequeColumns || hasChequeDetails) && <td className="border border-[#d7e9fb] p-1 relative"><input type="text" value={line.originalSource} onChange={e => updateReceiptLine(line.id, 'originalSource', e.target.value)} className="grid-input" /></td>}
                                                {/* رقم الشيك */}
                                                {(showChequeColumns || hasChequeDetails) && <td className="border border-[#d7e9fb] p-1 relative"><input type="text" value={line.chequeNo} onChange={e => updateReceiptLine(line.id, 'chequeNo', e.target.value)} className="grid-input font-mono" /></td>}
                                                {/* بنك */}
                                                {(showChequeColumns || hasChequeDetails) && <td className="border border-[#d7e9fb] p-1 relative">
                                                    <select value={line.bankId} onChange={e => updateReceiptLine(line.id, 'bankId', e.target.value)} className="grid-select">
                                                        <option value="">--</option>
                                                        {banks.map(b => <option key={b.id} value={b.id}>{b.bank_code || b.name_ar}</option>)}
                                                    </select>
                                                </td>}
                                                {/* نوع الحساب */}
                                                {(showChequeColumns || hasChequeDetails) && <td className="border border-[#d7e9fb] p-1 relative"><input type="text" value={line.bankAccountType} onChange={e => updateReceiptLine(line.id, 'bankAccountType', e.target.value)} className="grid-input" /></td>}
                                                {/* رقم حساب */}
                                                {(showChequeColumns || hasChequeDetails) && <td className="border border-[#d7e9fb] p-1 relative"><input type="text" value={line.bankAccountNo} onChange={e => updateReceiptLine(line.id, 'bankAccountNo', e.target.value)} className="grid-input font-mono" /></td>}
                                                {/* Delete */}
                                                <td className="border border-[#d7e9fb] p-1 relative text-center">
                                                    <button onClick={() => { if (receiptLines.length > 1) setReceiptLines(prev => prev.filter(x => x.id !== line.id)); }}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-bold text-sm bg-slate-100 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                                            <td colSpan={6} className="border-t border-[#d7e9fb] p-2 text-slate-500 text-left">إجمالي</td>
                                            <td className="border-t border-[#d7e9fb] p-2 text-center font-mono text-indigo-600">{receiptLines.reduce((s, l) => s + (Number(l.debitForeign) || 0), 0).toLocaleString()}</td>
                                            <td className="border-t border-[#d7e9fb] p-2 text-center font-mono text-indigo-700 text-base">{totalReceiptDebit.toLocaleString()}</td>
                                            <td colSpan={(showChequeColumns || hasChequeDetails) ? 8 : 1} className="border-t border-[#d7e9fb]"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <div className="p-3 border-t border-slate-100">
                                    <button onClick={() => {
                                        setReceiptLines(prev => [...prev, emptyReceiptLine()]);
                                        setReceiptFilters({});
                                    }}
                                        className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all text-sm">
                                        <Plus size={16} /><span>إضافة سطر</span>
                                    </button>
                                </div>
                            </motion.div>
                            )}

                            {/* Against Tab Grid */}
                            {activeTab === 'AGAINST' && (
                            <motion.div
                                key="AGAINST"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="overflow-x-auto"
                            >
                                <table className="w-full border-separate border-spacing-0 text-right text-[13px] text-slate-700" style={{ minWidth: '900px' }}>
                                    <thead className="sticky top-0 z-20 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                                        <tr>
                                            <FilterableHeader tab="AGAINST" colKey="accountCode" label="حساب" widthClass="first:border-r w-[220px]" />
                                            <FilterableHeader tab="AGAINST" colKey="lineCurrency" label="عملة" widthClass="w-[90px]" />
                                            <FilterableHeader tab="AGAINST" colKey="subAccountId" label="حساب فرعي" widthClass="w-[120px]" />
                                            <FilterableHeader tab="AGAINST" colKey="lineRef" label="مرجع" widthClass="w-[140px]" />
                                            <FilterableHeader tab="AGAINST" colKey="debitForeign" label="قيمة مدين" widthClass="w-[120px]" />
                                            <FilterableHeader tab="AGAINST" colKey="debit" label="مدين" widthClass="w-[120px]" />
                                            <FilterableHeader tab="AGAINST" colKey="creditForeign" label="قيمة دائن" widthClass="w-[120px]" />
                                            <FilterableHeader tab="AGAINST" colKey="credit" label="دائن" widthClass="w-[120px]" />
                                            <FilterableHeader tab="AGAINST" colKey="taxRef" label="مرجع ضريبي" widthClass="w-[120px]" />
                                            <FilterableHeader tab="AGAINST" colKey="invoiceDate" label="تاريخ الفاتورة" widthClass="w-[120px]" />
                                            <th className="border-b border-l border-slate-200 bg-slate-50 p-2.5 align-middle w-[50px] text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody onKeyDown={handleGridKeyDown}>
                                        {filteredAgainstLines.map(line => (
                                            <tr key={line.id} className="bg-white hover:bg-sky-50 transition-colors group">
                                                <td className="border border-[#d7e9fb] p-1 relative">
                                                    <div className="flex gap-1">
                                                        <input value={line.accountCode || ''}
                                                            onChange={e => updateAgainstLine(line.id, 'accountCode', e.target.value)}
                                                            onBlur={e => handleAccountCodeBlur(line.id, e.target.value, 'AGAINST')}
                                                            placeholder="كود..." className="grid-input font-mono flex-1" title={line.accountName} />
                                                        <button onClick={() => openAccountPicker(line.id, 'AGAINST')}
                                                            className="px-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="بحث">
                                                            <Search size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="border border-[#d7e9fb] p-1 relative">
                                                    <select value={line.lineCurrency} onChange={e => updateAgainstLine(line.id, 'lineCurrency', e.target.value)} className="grid-select">
                                                        {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                                                        {currencies.length === 0 && <option value="ILS">ILS</option>}
                                                    </select>
                                                </td>
                                                <td className="border border-[#d7e9fb] p-1 relative">
                                                    <div className="flex gap-1">
                                                        <input type="text" value={line.subAccountId || ''}
                                                            onChange={e => updateAgainstLine(line.id, 'subAccountId', e.target.value)}
                                                            className="grid-input" />
                                                        <button onClick={() => openAccountPicker(line.id, 'AGAINST', true)}
                                                            className="px-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="بحث حساب فرعي">
                                                            <Search size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="text" value={line.lineRef} list="receipt-line-ref-list" onChange={e => updateAgainstLine(line.id, 'lineRef', e.target.value)} className="grid-input font-mono" placeholder="كود العميل" /></td>
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="number" value={line.debitForeign || ''} onChange={e => updateAgainstLine(line.id, 'debitForeign', Number(e.target.value))} className="grid-input grid-input-num" /></td>
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="number" value={line.debit || ''} onChange={e => updateAgainstLine(line.id, 'debit', Number(e.target.value))} className="grid-input grid-input-num" /></td>
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="number" value={line.creditForeign || ''} onChange={e => updateAgainstLine(line.id, 'creditForeign', Number(e.target.value))} className="grid-input grid-input-num" /></td>
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="number" value={line.credit || ''} onChange={e => updateAgainstLine(line.id, 'credit', Number(e.target.value))} className={`grid-input grid-input-num text-emerald-700 font-bold ${(!line.accountId || Number(line.credit) <= 0) ? 'border-red-300 bg-red-50/40' : ''}`} /></td>
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="text" value={line.taxRef} onChange={e => updateAgainstLine(line.id, 'taxRef', e.target.value)} className="grid-input" /></td>
                                                <td className="border border-[#d7e9fb] p-1 relative"><input type="date" value={line.invoiceDate} onChange={e => updateAgainstLine(line.id, 'invoiceDate', e.target.value)} className="grid-input" /></td>
                                                <td className="border border-[#d7e9fb] p-1 relative text-center">
                                                    <button onClick={() => { if (againstLines.length > 1) setAgainstLines(prev => prev.filter(x => x.id !== line.id)); }}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-bold text-sm bg-slate-100 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                                            <td colSpan={4} className="border-t border-[#d7e9fb] p-2 text-slate-500 text-left">إجمالي</td>
                                            <td className="border-t border-[#d7e9fb] p-2 text-center font-mono">{againstLines.reduce((s, l) => s + (Number(l.debitForeign) || 0), 0).toLocaleString()}</td>
                                            <td className="border-t border-[#d7e9fb] p-2 text-center font-mono">{againstLines.reduce((s, l) => s + (Number(l.debit) || 0), 0).toLocaleString()}</td>
                                            <td className="border-t border-[#d7e9fb] p-2 text-center font-mono">{againstLines.reduce((s, l) => s + (Number(l.creditForeign) || 0), 0).toLocaleString()}</td>
                                            <td className="border-t border-[#d7e9fb] p-2 text-center font-mono text-emerald-700 text-base">{totalAgainstCredit.toLocaleString()}</td>
                                            <td colSpan={3} className="border-t border-[#d7e9fb]"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <div className="p-3 border-t border-slate-100">
                                    <button onClick={() => {
                                        setAgainstLines(prev => [...prev, emptyAgainstLine()]);
                                        setAgainstFilters({});
                                    }}
                                        className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all text-sm">
                                        <Plus size={16} /><span>إضافة سطر</span>
                                    </button>
                                </div>
                            </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <datalist id="receipt-line-ref-list">
                        {lineRefOptions.map((lineRef, index) => (
                            <option key={`${lineRef}-${index}`} value={lineRef} />
                        ))}
                    </datalist>

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
                </motion.div>
            </div>

            {/* Print Template */}
            <div className="printable">
                <PrintTemplate header={header} receiptLines={receiptLines} againstLines={againstLines}
                    totalDebit={totalReceiptDebit} totalCredit={totalAgainstCredit} branches={branches} />
            </div>

                <AnimatePresence>
                {activeColumnMenu && createPortal(
                    <motion.div
                        data-column-filter-menu="1"
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 4 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed z-[9999] w-[18rem] overflow-hidden rounded-[20px] border border-sky-100/80 bg-white/95 text-right shadow-[0_24px_60px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5 backdrop-blur-xl"
                        style={{
                            top: activeColumnMenu.position.top,
                            left: activeColumnMenu.position.left,
                            maxHeight: activeColumnMenu.position.maxHeight,
                            transformOrigin: activeColumnMenu.position.transformOrigin,
                        }}
                        dir="rtl"
                    >
                        <div className="border-b border-slate-100 bg-gradient-to-l from-sky-50/90 via-white to-cyan-50/80 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-extrabold text-slate-800">{activeColumnMenu.label}</div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">اكتب قيمة لتصفية هذا العمود مباشرة.</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 p-4">
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">قيمة التصفية</label>
                                <input
                                    autoFocus
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                    placeholder={`تصفية ${activeColumnMenu.label}...`}
                                    value={(activeColumnMenu.tab === 'RECEIPT' ? receiptFilters : againstFilters)[activeColumnMenu.colKey] || ''}
                                    onChange={(e) => handleFilterChange(activeColumnMenu.tab, activeColumnMenu.colKey, e.target.value)}
                                />
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                <button type="button" onClick={() => clearFilter(activeColumnMenu.tab, activeColumnMenu.colKey)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100">مسح</button>
                                <button type="button" onClick={() => setActiveColumnMenu(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900">إغلاق</button>
                            </div>
                        </div>
                    </motion.div>,
                    document.body
                )}
                </AnimatePresence>
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
