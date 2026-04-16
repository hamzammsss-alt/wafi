import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { DocumentSupportDock } from '../../../src/components/workspace/DocumentSupportDock';
import { getTreasurySupportSections } from '../../../src/components/workspace/documentSupportSections';

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
    outstandingBalance?: number;
    paymentRate?: number;
    supplierDiscountRate?: number;
    discountUntilDate?: string;
    costCenterId?: string;
    branchId?: string;
    salesRepCode?: string;
}

interface PaymentLine {
    id: string;
    type: 'CASH' | 'CHEQUE' | 'TRANSFER';
    lineCurrency: string;
    amountForeign: number;
    amountLocal: number;
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
interface PaymentAgainstLine {
    id: string;
    accountId: string | null;
    accountCode: string;
    accountName: string;
    lineCurrency: string;
    subAccountCode?: string;
    reference?: string;
    debitForeign: number;
    debitLocal: number;
    taxRef?: string;
    fromDate?: string;
    toDate?: string;
    permitNo?: string;
    permitHolderName?: string;
}
interface PaymentAdditionalInfo {
    expenseReference: string;
    dueDate: string;
    beneficiaryName: string;
    identityNumber: string;
    notes: string;
}

interface Bank { id: string; name_ar: string; bank_code?: string; account_id?: string; }
interface BankAccountOption {
    id: string;
    bank_name: string;
    account_name?: string;
    account_number: string;
    currency_id: string;
    gl_account_id?: string;
    gl_account_name?: string;
    is_active: number;
}
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
interface CurrencyRateHistoryEntry {
    date: string;
    rate: number;
}

interface AccountTreeNodeLike {
    id: string;
    parent_id?: string;
    account_code?: string;
    code?: string;
    name_ar?: string;
    name?: string;
    system_type?: string;
    children?: AccountTreeNodeLike[];
}

interface AccountIndexItem {
    id: string;
    parentId: string;
    code: string;
    name: string;
    systemType: string;
    isTransactional: boolean;
}

interface ReferenceOption {
    value: string;
    label: string;
}

const normalizeText = (value: unknown): string => String(value ?? '').trim();
const toUniqueTextList = (rows: unknown[]): string[] =>
    Array.from(new Set(rows.map(normalizeText).filter(Boolean)));
const buildGuideAccountReference = (accountCode: string, accountName: string) => {
    const code = normalizeText(accountCode);
    const name = normalizeText(accountName);
    if (code && name) return `${code} - ${name}`;
    return code || name;
};

const getAccountTypeHints = (accountMeta?: AccountIndexItem | null): Array<'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE'> => {
    if (!accountMeta) return [];

    const systemType = normalizeText(accountMeta.systemType).toUpperCase();
    if (systemType === 'CUSTOMER') return ['CUSTOMER'];
    if (systemType === 'SUPPLIER') return ['SUPPLIER'];
    if (systemType === 'EMPLOYEE') return ['EMPLOYEE'];

    const text = `${normalizeText(accountMeta.code)} ${normalizeText(accountMeta.name)}`.toLowerCase();
    if (/customer|customers|عميل|عملاء|زبون|زبائن/.test(text)) return ['CUSTOMER'];
    if (/supplier|suppliers|مورد|موردين/.test(text)) return ['SUPPLIER'];
    if (/employee|employees|موظف|موظفين/.test(text)) return ['EMPLOYEE'];

    return [];
};

const inferReferenceTypeFromAccountMeta = (accountMeta?: AccountIndexItem | null): string => {
    const hints = getAccountTypeHints(accountMeta);
    if (hints.includes('CUSTOMER')) return 'CUSTOMER';
    if (hints.includes('SUPPLIER')) return 'SUPPLIER';
    if (hints.includes('EMPLOYEE')) return 'EMPLOYEE';
    if (isBankLikeAccount(accountMeta)) return 'BANK';
    return 'GENERAL';
};

const flattenAccountTree = (nodes: AccountTreeNodeLike[], parentId: string = ''): Record<string, AccountIndexItem> => {
    const map: Record<string, AccountIndexItem> = {};

    const visit = (list: AccountTreeNodeLike[], inheritedParentId: string) => {
        for (const node of list || []) {
            const id = normalizeText(node?.id);
            if (!id) continue;
            const directParentId = normalizeText(node?.parent_id) || inheritedParentId;
            map[id] = {
                id,
                parentId: directParentId,
                code: normalizeText(node?.account_code || node?.code),
                name: normalizeText(node?.name_ar || node?.name),
                systemType: normalizeText(node?.system_type),
                isTransactional: Boolean((node as any)?.is_transactional)
            };
            if (Array.isArray(node?.children) && node.children.length > 0) {
                visit(node.children, id);
            }
        }
    };

    visit(nodes, parentId);
    return map;
};

const isBankLikeAccount = (accountMeta?: AccountIndexItem | null) => {
    if (!accountMeta) return false;
    const systemType = normalizeText(accountMeta.systemType).toUpperCase();
    if (systemType === 'BANK') return true;

    const code = normalizeText(accountMeta.code);
    const name = normalizeText(accountMeta.name).toLowerCase();
    return code.startsWith('112') || name.includes('بنك') || name.includes('bank');
};

const isSameOrDescendantAccount = (accountId: string, selectedAccountId: string, accountIndexById: Record<string, AccountIndexItem>) => {
    const target = normalizeText(accountId);
    const root = normalizeText(selectedAccountId);
    if (!target || !root) return false;
    if (target === root) return true;

    let cursor = target;
    const guard = new Set<string>();

    while (cursor && !guard.has(cursor)) {
        guard.add(cursor);
        const current = accountIndexById[cursor];
        if (!current?.parentId) return false;
        if (current.parentId === root) return true;
        cursor = current.parentId;
    }

    return false;
};
const PAYMENT_ACCOUNT_PREFIXES = ['111', '112', '1141'];
const emptyAgainstLine = (): PaymentAgainstLine => ({
    id: uuidv4(),
    accountId: null,
    accountCode: '',
    accountName: '',
    lineCurrency: 'ILS',
    subAccountCode: '',
    reference: '',
    debitForeign: 0,
    debitLocal: 0,
    taxRef: '',
    fromDate: '',
    toDate: '',
    permitNo: '',
    permitHolderName: ''
});
const emptyAdditionalInfo = (): PaymentAdditionalInfo => ({
    expenseReference: '',
    dueDate: '',
    beneficiaryName: '',
    identityNumber: '',
    notes: ''
});

export const PaymentVoucher = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(containerRef);
    const helperSections = useMemo(() => getTreasurySupportSections(), []);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'PAYMENT' | 'AGAINST' | 'ADDITIONAL'>('PAYMENT');

    const [banks, setBanks] = useState<Bank[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [partnerOptions, setPartnerOptions] = useState<PartnerOption[]>([]);
    const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
    const [accountIndexById, setAccountIndexById] = useState<Record<string, AccountIndexItem>>({});
    const [currencyHistoryMap, setCurrencyHistoryMap] = useState<Record<string, CurrencyRateHistoryEntry[]>>({});
    const [headerDescriptionOptions, setHeaderDescriptionOptions] = useState<string[]>([]);
    const [lineDescriptionOptions, setLineDescriptionOptions] = useState<string[]>([]);

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
        outstandingBalance: 0,
        paymentRate: 0,
        supplierDiscountRate: 0,
        discountUntilDate: '',
        costCenterId: '',
        branchId: '',
        salesRepCode: ''
    });

    const [lines, setLines] = useState<PaymentLine[]>([
        {
            id: uuidv4(), type: 'CASH', lineCurrency: 'ILS', amountForeign: 0, amountLocal: 0,
            accountId: null, accountName: '', amount: 0, description: ''
        }
    ]);
    const [againstLines, setAgainstLines] = useState<PaymentAgainstLine[]>([emptyAgainstLine()]);
    const [additionalInfo, setAdditionalInfo] = useState<PaymentAdditionalInfo>(emptyAdditionalInfo());

    const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
    const [accountPickerOpen, setAccountPickerOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const [pickerTarget, setPickerTarget] = useState<'PAYMENT' | 'AGAINST'>('PAYMENT');

    // ============ Load Data ============
    const { id } = useParams();

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (!api) return;

            const [bks, bankAccountRows, curs, ccs, brs, customerRows, supplierRows, employeeRows, salesRepRows, paymentRows, accountTreeRows] = await Promise.all([
                api.masterData.getBanks(),
                api.masterData.getBankAccounts ? api.masterData.getBankAccounts() : Promise.resolve([]),
                api.currency.getCurrencies(),
                api.masterData.getCostCenters(),
                api.masterData.getBranches(),
                api.partner.getPartners('CUSTOMER'),
                api.partner.getPartners('SUPPLIER'),
                api.hr?.getEmployees ? api.hr.getEmployees() : Promise.resolve([]),
                api.partner?.getSalesReps ? api.partner.getSalesReps() : Promise.resolve([]),
                api.treasury.getPayments ? api.treasury.getPayments({}) : Promise.resolve([]),
                api.getAccountTree ? api.getAccountTree() : Promise.resolve([])
            ]);

            setBanks(bks || []); setBankAccounts((bankAccountRows || []).filter((row: any) => row?.is_active)); setCurrencies(curs || []);
            setCostCenters(ccs || []); setBranches(brs || []);
            setAccountIndexById(flattenAccountTree(Array.isArray(accountTreeRows) ? accountTreeRows : []));

            const mapPartner = (
                row: any,
                type: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE'
            ): PartnerOption | null => {
                const id = normalizeText(row?.id);
                const code = normalizeText(row?.code || row?.employee_code);
                const name = normalizeText(row?.name_ar || row?.name || row?.name_en || row?.full_name);
                if (!id || (!code && !name)) return null;
                return {
                    id,
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
            setPartnerOptions(partners);

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

            const paymentList = Array.isArray(paymentRows) ? paymentRows : [];
            const historicalHeaderDescriptions = toUniqueTextList(paymentList.map((row: any) => row?.description));
            const historicalLineDescriptions = toUniqueTextList(
                paymentList.flatMap((row: any) => [row?.line_description, row?.description, row?.manual_ref])
            );
            setHeaderDescriptionOptions(historicalHeaderDescriptions);
            setLineDescriptionOptions(historicalLineDescriptions);

            if (brs && brs.length > 0) {
                const mainBranch = brs.find((b: any) => b.is_main);
                setHeader(prev => ({ ...prev, branchId: mainBranch?.id || brs[0].id }));
            }

            if (id && id !== 'new') {
                // FETCH EXISTING
                const data = await (api.treasury.getPayment ? api.treasury.getPayment(id) : api.treasury.getPaymentVoucher(id));
                if (data && data.header) {
                    const h = data.header;
                    const p = partners.find((x) => x.id === String(h.partner_id));

                    let linkedAccountName = '';
                    let partnerBalance = 0;
                    let payeeType: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' = 'SUPPLIER'; // Default
                    let extraData: any = {};
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

                        payeeType = p.type;
                    }

                    try {
                        extraData = h?.extra_data ? JSON.parse(h.extra_data || '{}') : {};
                    } catch (error) {
                        console.error('Failed to parse payment voucher extra_data', error);
                        extraData = {};
                    }

                    setHeader({
                        voucherNo: h.voucher_no, manualRef: h.manual_ref || '',
                        date: h.date.split('T')[0], currency: 'ILS', rate: 1,
                        partnerId: h.partner_id, partnerCode: p?.code || '',
                        partnerName: p?.name || h.payee_name || '',
                        payeeType: payeeType,
                        description: h.description, status: h.status,
                        amount: h.amount, linkedAccountName: linkedAccountName, partnerBalance: partnerBalance,
                        outstandingBalance: partnerBalance,
                        paymentRate: Number(extraData?.paymentRate || 0) || 0,
                        supplierDiscountRate: Number(extraData?.supplierDiscountRate || 0) || 0,
                        discountUntilDate: extraData?.discountUntilDate || '',
                        costCenterId: h.cost_center_id || '', branchId: h.branch_id,
                        salesRepCode: h.sales_rep_code || ''
                    });

                    setAdditionalInfo({
                        expenseReference: extraData?.expenseReference || '',
                        dueDate: extraData?.dueDate || '',
                        beneficiaryName: extraData?.beneficiaryName || '',
                        identityNumber: extraData?.identityNumber || '',
                        notes: extraData?.notes || ''
                    });

                    // Map Lines (Payment Means - Credits + Cheques)
                    const newLines: PaymentLine[] = [];

                    // 1. Checks
                    if (data.checks && data.checks.length > 0) {
                        data.checks.forEach((c: any) => {
                            newLines.push({
                                id: uuidv4(), type: 'CHEQUE',
                                lineCurrency: normalizeText(c.currency || 'ILS').toUpperCase() || 'ILS',
                                amountForeign: Number(c.foreign_amount || c.amount) || 0,
                                amountLocal: Number(c.amount) || 0,
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
                                    lineCurrency: 'ILS',
                                    amountForeign: Number(l.credit) || 0,
                                    amountLocal: Number(l.credit) || 0,
                                    accountId: l.account_id,
                                    accountName: l.account_name || '',
                                    amount: l.credit,
                                    description: l.line_description || ''
                                });
                            }
                        });
                    }
                    if (newLines.length > 0) setLines(newLines);
                    else setLines([{
                        id: uuidv4(), type: 'CASH', lineCurrency: 'ILS', amountForeign: 0, amountLocal: 0,
                        accountId: null, accountName: '', amount: 0, description: ''
                    }]); // Ensure at least one line

                    if (data.debits && data.debits.length > 0) {
                        setAgainstLines(data.debits.map((line: any) => ({
                            id: uuidv4(),
                            accountId: line.account_id,
                            accountCode: line.account_code || '',
                            accountName: line.account_name || '',
                            lineCurrency: 'ILS',
                            subAccountCode: line.sub_account_id || line.cost_center_id || line.cost_center || '',
                            reference: line.line_description || '',
                            debitForeign: Number(line.debit) || 0,
                            debitLocal: Number(line.debit) || 0,
                            taxRef: '',
                            fromDate: '',
                            toDate: '',
                            permitNo: '',
                            permitHolderName: ''
                        })));
                    }
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
    const resolvePartnerSalesRepCode = (partnerLike: any): string => {
        const raw = partnerLike?.raw_data || partnerLike?.raw || {};
        const repId = normalizeText(raw?.sales_rep_id || partnerLike?.sales_rep_id);
        const repCode = normalizeText(raw?.sales_rep_code || partnerLike?.sales_rep_code);

        if (repId) {
            const byId = salesReps.find((rep) => normalizeText(rep.id) === repId || normalizeText(rep.raw?.id) === repId);
            if (byId?.code) return byId.code;
        }
        if (repCode) {
            const byCode = salesReps.find((rep) => normalizeText(rep.code) === repCode);
            if (byCode?.code) return byCode.code;
            return repCode;
        }
        return '';
    };

    const resolveAccountById = async (accountId: string) => {
        const normalizedId = normalizeText(accountId);
        if (!normalizedId) return null;

        const api = (window as any).electronAPI;
        if (!api) return null;

        try {
            const account = await api.account?.getAccount?.(normalizedId);
            if (account) return account;
        } catch (error) {
            console.error('Failed to resolve account by account.getAccount', error);
        }

        try {
            const allAccounts = await api.getAccounts?.();
            if (Array.isArray(allAccounts)) {
                return allAccounts.find((row: any) => normalizeText(row?.id) === normalizedId) || null;
            }
        } catch (error) {
            console.error('Failed to resolve account from getAccounts list', error);
        }

        return null;
    };

    const handlePartnerSelect = async (partner: UnifiedPartner) => {
        let accName = '';
        let linkedAccountId = normalizeText(partner.linked_account_id);
        let linkedAccountCode = '';
        let linkedAccountDisplayName = '';
        if (partner.linked_account_id) {
            try {
                const acc = await resolveAccountById(partner.linked_account_id);
                if (acc) {
                    accName = `${acc.account_code || acc.code} - ${partner.code}`;
                    linkedAccountId = acc.id || partner.linked_account_id;
                    linkedAccountCode = acc.account_code || acc.code || '';
                    linkedAccountDisplayName = acc.name_ar || acc.name || '';
                }
            } catch (e) { console.error(e); }
        }

        if (linkedAccountId && !linkedAccountCode) {
            linkedAccountCode = linkedAccountId;
        }

        let balance = 0;
        try {
            const balanceRes = await (window as any).electronAPI.treasury.getBookBalance(partner.linked_account_id, new Date().toISOString().split('T')[0]);
            balance = balanceRes || 0;
        } catch (e) { console.error(e); }

        const autoSalesRepCode = partner.type === 'CUSTOMER' ? resolvePartnerSalesRepCode(partner) : '';

        setHeader(prev => ({
            ...prev,
            partnerId: partner.id,
            partnerCode: partner.code,
            partnerName: partner.name,
            payeeType: partner.type,
            linkedAccountName: accName,
            partnerBalance: balance,
            outstandingBalance: balance,
            salesRepCode: partner.type === 'CUSTOMER' ? autoSalesRepCode : prev.salesRepCode || ''
        }));

        if (linkedAccountId) {
            setAgainstLines((prev) => {
                const partnerReference = normalizeText(partner.code) && normalizeText(partner.name)
                    ? `${partner.code} - ${partner.name}`
                    : (normalizeText(partner.code) || normalizeText(partner.name));
                const accountReference = partnerReference || buildGuideAccountReference(linkedAccountCode, linkedAccountDisplayName) || partner.code || '';
                if (!prev.length) {
                    return [{
                        ...emptyAgainstLine(),
                        accountId: linkedAccountId,
                        accountCode: linkedAccountCode,
                        accountName: linkedAccountDisplayName,
                        reference: accountReference
                    }];
                }

                return prev.map((line, index) => {
                    if (index !== 0) return line;
                    return {
                        ...line,
                        accountId: linkedAccountId,
                        accountCode: linkedAccountCode,
                        accountName: linkedAccountDisplayName,
                        reference: accountReference
                    };
                });
            });
        }

        setPartnerPickerOpen(false);
    };

    const handlePartnerCodeBlurEnhanced = async () => {
        if (!header.partnerCode) return;
        try {
            const typedCode = normalizeText(header.partnerCode);
            const match = partnerOptions.find((p) =>
                normalizeText(p.code) === typedCode && p.type === header.payeeType
            ) || partnerOptions.find((p) => normalizeText(p.code) === typedCode);

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
                setHeader(prev => ({ ...prev, partnerName: '--- غير موجود ---' }));
            }
        } catch (e) { console.error(e); }
    };

    // --- Line Logic ---
    const inferPaymentType = (accountLike: any): PaymentLine['type'] => {
        const code = normalizeText(accountLike?.account_code || accountLike?.code);
        const name = normalizeText(accountLike?.name_ar || accountLike?.name || accountLike?.account_name).toLowerCase();

        if (code.startsWith('1141') || name.includes('شيكات بالصندوق') || name.includes('شيكات برسم التحصيل')) {
            return 'CHEQUE';
        }
        if (code.startsWith('112') || name.includes('بنك') || name.includes('bank')) {
            return 'TRANSFER';
        }
        return 'CASH';
    };

    const findBankAccountByGlAccount = (glAccountId: string | null | undefined) => {
        if (!glAccountId) return null;
        return bankAccounts.find((row) => normalizeText(row.gl_account_id) === normalizeText(glAccountId)) || null;
    };

    const getReferenceOptionsForAgainstLine = (line: PaymentAgainstLine) => {
        const selectedAccountId = normalizeText(line.accountId);
        if (!selectedAccountId) return [] as ReferenceOption[];

        const accountMeta = accountIndexById[selectedAccountId] || null;
        const typeHints = getAccountTypeHints(accountMeta);

        const partnerReferenceOptions: ReferenceOption[] = partnerOptions
            .filter((partner) => {
                const linkedId = normalizeText(partner.linked_account_id);
                if (!linkedId) return false;
                const sameBranch = isSameOrDescendantAccount(linkedId, selectedAccountId, accountIndexById);
                if (!sameBranch) return false;
                if (typeHints.length === 0) return true;
                return typeHints.includes(partner.type);
            })
            .map((partner) => ({
                value: `${partner.code} - ${partner.name}`,
                label: partner.name
            }));

        // For bank accounts, allow cheque reference numbers from issued cheque lines.
        const chequeReferenceOptions: ReferenceOption[] = isBankLikeAccount(accountMeta)
            ? Array.from(new Set(
                lines
                    .filter((paymentLine) => paymentLine.type === 'CHEQUE')
                    .map((paymentLine) => normalizeText(paymentLine.chequeNo))
                    .filter(Boolean)
            )).map((chequeRef) => ({
                value: chequeRef,
                label: `مرجع شيك: ${chequeRef}`
            }))
            : [];

        const merged = [...chequeReferenceOptions, ...partnerReferenceOptions];
        const deduplicated = Array.from(new Map(merged.map((option) => [option.value, option])).values());

        return deduplicated;
    };

    const getSubAccountOptionsForAgainstLine = (line: PaymentAgainstLine) => {
        const selectedAccountId = normalizeText(line.accountId);
        if (!selectedAccountId) return [] as AccountIndexItem[];

        const directChildren = Object.values(accountIndexById)
            .filter((account) => normalizeText(account.parentId) === selectedAccountId)
            .filter((account) => account.isTransactional)
            .sort((left, right) => normalizeText(left.code).localeCompare(normalizeText(right.code)));

        if (directChildren.length > 0) return directChildren;

        const descendants = Object.values(accountIndexById)
            .filter((account) => account.id !== selectedAccountId)
            .filter((account) => isSameOrDescendantAccount(account.id, selectedAccountId, accountIndexById))
            .filter((account) => account.isTransactional)
            .sort((left, right) => normalizeText(left.code).localeCompare(normalizeText(right.code)));

        return descendants;
    };

    const getPreferredReferenceForAgainstLine = (line: PaymentAgainstLine, referenceOptions: ReferenceOption[]) => {
        const accountMeta = accountIndexById[normalizeText(line.accountId)] || null;
        if (isBankLikeAccount(accountMeta)) {
            const firstChequeReference = referenceOptions.find((option) =>
                lines.some((paymentLine) => paymentLine.type === 'CHEQUE' && normalizeText(paymentLine.chequeNo) === option.value)
            );
            if (firstChequeReference) return firstChequeReference.value;
        }

        const preferredPartner = partnerOptions.find((partner) =>
            normalizeText(partner.id) === normalizeText(header.partnerId) &&
            referenceOptions.some((option) => option.value === `${partner.code} - ${partner.name}`)
        );
        if (preferredPartner) return `${preferredPartner.code} - ${preferredPartner.name}`;

        if (referenceOptions.length === 1) return referenceOptions[0].value;
        return '';
    };

    const handleAccountSelect = (account: any) => {
        if (activeLineId) {
            if (pickerTarget === 'PAYMENT') {
                setLines(prev => prev.map(l => {
                    if (l.id !== activeLineId) return l;

                    const lineType = inferPaymentType(account);
                    const matchedBankAccount = findBankAccountByGlAccount(account.id);

                    return {
                        ...l,
                        type: lineType,
                        accountId: account.id,
                        accountName: account.name_ar || account.name || '',
                        bankAccountId: lineType === 'TRANSFER' ? (matchedBankAccount?.id || l.bankAccountId || '') : lineType === 'CHEQUE' ? (l.bankAccountId || '') : '',
                        bankName: lineType === 'TRANSFER' ? (matchedBankAccount?.bank_name || l.bankName || '') : lineType === 'CHEQUE' ? (l.bankName || '') : '',
                        chequeNo: lineType === 'CHEQUE' ? l.chequeNo || '' : '',
                        dueDate: lineType === 'CHEQUE' ? l.dueDate || '' : '',
                        bankId: lineType === 'CHEQUE' ? l.bankId || '' : ''
                    };
                }));
            } else {
                setAgainstLines(prev => prev.map(line => line.id === activeLineId ? {
                    ...(() => {
                        const updatedLine: PaymentAgainstLine = {
                            ...line,
                            accountId: account.id,
                            accountCode: account.account_code || account.code || '',
                            accountName: account.name_ar || account.name || '',
                            subAccountCode: '',
                            reference: ''
                        };

                        const referenceOptions = getReferenceOptionsForAgainstLine(updatedLine);
                        updatedLine.reference = getPreferredReferenceForAgainstLine(updatedLine, referenceOptions);

                        return updatedLine;
                    })()
                } : line));
            }
            setAccountPickerOpen(false);
            setActiveLineId(null);
        }
    };

    const addNewLine = () => {
        setLines(prev => [...prev, {
            id: uuidv4(), type: 'CASH', accountId: null, accountName: '',
            lineCurrency: 'ILS', amountForeign: 0, amountLocal: 0,
            amount: 0, description: header.description || '', costCenterId: header.costCenterId
        }]);
    };

    const removeLine = (id: string) => {
        if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id));
    };

    const updateAgainstLine = (id: string, field: keyof PaymentAgainstLine, value: any) => {
        setAgainstLines(prev => prev.map(line => {
            if (line.id !== id) return line;
            const updated = { ...line, [field]: value };
            if (field === 'lineCurrency' || field === 'debitForeign') {
                const fx = Number(field === 'debitForeign' ? value : updated.debitForeign) || 0;
                const local = Math.round(fx * resolveRateForDate(field === 'lineCurrency' ? String(value) : updated.lineCurrency, header.date) * 100) / 100;
                updated.debitForeign = fx;
                updated.debitLocal = local;
            }
            return updated;
        }));
    };

    const resolveRateForDate = (
        code: string,
        voucherDate: string,
        historyMap: Record<string, CurrencyRateHistoryEntry[]> = currencyHistoryMap
    ) => {
        const normalizedCode = normalizeText(code).toUpperCase();
        if (!normalizedCode || normalizedCode === 'ILS') return 1;

        const datedHistory = (historyMap[normalizedCode] || [])
            .filter((entry) => normalizeText(entry.date) && normalizeText(entry.date) <= voucherDate)
            .sort((left, right) => normalizeText(right.date).localeCompare(normalizeText(left.date)));

        if (datedHistory.length > 0) {
            const historicRate = Number(datedHistory[0].rate);
            if (Number.isFinite(historicRate) && historicRate > 0) return historicRate;
        }

        const curr = currencies.find((currency) => normalizeText(currency.code).toUpperCase() === normalizedCode);
        const fallbackRate = Number(curr?.exchange_rate || 1);
        return Number.isFinite(fallbackRate) && fallbackRate > 0 ? fallbackRate : 1;
    };

    const recalculateLineAmounts = (
        rows: PaymentLine[],
        historyMap: Record<string, CurrencyRateHistoryEntry[]> = currencyHistoryMap
    ) => rows.map((line) => {
        const fx = Number(line.amountForeign) || 0;
        const local = Math.round(fx * resolveRateForDate(line.lineCurrency, header.date, historyMap) * 100) / 100;
        return {
            ...line,
            amountLocal: local,
            amount: local
        };
    });

    useEffect(() => {
        const targetCodes = Array.from(new Set(
            lines
                .map((line) => normalizeText(line.lineCurrency).toUpperCase())
                .filter((code) => code && code !== 'ILS')
        ));

        let cancelled = false;

        const syncCurrencyRates = async () => {
            const api = (window as any).electronAPI;
            const missingCodes = targetCodes.filter((code) => !currencyHistoryMap[code]);
            let nextHistoryMap = currencyHistoryMap;

            if (missingCodes.length > 0 && api?.currency?.getCurrencyHistory) {
                const fetchedEntries = await Promise.all(
                    missingCodes.map(async (code) => {
                        try {
                            const history = await api.currency.getCurrencyHistory(code, 3650);
                            return [code, Array.isArray(history) ? history : []] as const;
                        } catch (error) {
                            console.error(`Failed to load currency history for ${code}`, error);
                            return [code, []] as const;
                        }
                    })
                );

                if (cancelled) return;

                nextHistoryMap = {
                    ...currencyHistoryMap,
                    ...Object.fromEntries(fetchedEntries)
                };
                setCurrencyHistoryMap(nextHistoryMap);
            }

            if (cancelled) return;

            setLines((prev) => {
                const recalculated = recalculateLineAmounts(prev, nextHistoryMap);
                const changed = recalculated.some((line, index) =>
                    Number(line.amountLocal) !== Number(prev[index]?.amountLocal) ||
                    Number(line.amount) !== Number(prev[index]?.amount)
                );
                return changed ? recalculated : prev;
            });
        };

        void syncCurrencyRates();

        return () => {
            cancelled = true;
        };
    }, [header.date, lines, currencies, currencyHistoryMap]);

    const updateLine = (id: string, field: keyof PaymentLine, value: any) => {
        setLines(prev => prev.map(l => {
            if (l.id !== id) return l;
            const updated = { ...l, [field]: value };

            if (field === 'lineCurrency' || field === 'amountForeign') {
                const fx = Number(field === 'amountForeign' ? value : updated.amountForeign) || 0;
                const rate = resolveRateForDate(field === 'lineCurrency' ? String(value) : updated.lineCurrency, header.date);
                const local = Math.round(fx * rate * 100) / 100;
                updated.amountForeign = fx;
                updated.amountLocal = local;
                updated.amount = local;
            }

            if (field === 'bankId') {
                const bank = banks.find(b => b.id === value);
                updated.bankName = bank ? bank.name_ar : '';
            }
            if (field === 'bankAccountId') {
                const bankAccount = bankAccounts.find((row) => normalizeText(row.id) === normalizeText(value));
                if (bankAccount) {
                    updated.bankName = bankAccount.bank_name;
                    if (updated.type === 'TRANSFER') {
                        updated.accountId = bankAccount.gl_account_id || updated.accountId;
                        updated.accountName = bankAccount.gl_account_name || bankAccount.account_name || updated.accountName;
                    }
                }
            }
            return updated;
        }));
    };

    useEffect(() => {
        const firstChequeReference = lines
            .filter((line) => line.type === 'CHEQUE')
            .map((line) => normalizeText(line.chequeNo))
            .find(Boolean);

        if (!firstChequeReference) return;

        setAgainstLines((prev) => {
            let changed = false;
            const next = prev.map((line) => {
                const accountMeta = accountIndexById[normalizeText(line.accountId)] || null;
                if (!isBankLikeAccount(accountMeta)) return line;

                if (!normalizeText(line.reference)) {
                    changed = true;
                    return { ...line, reference: firstChequeReference };
                }

                return line;
            });
            return changed ? next : prev;
        });
    }, [lines, accountIndexById]);

    const totalAmount = lines.reduce((sum, l) => sum + (Number(l.amountLocal) || Number(l.amount) || 0), 0);
    const totalAgainstAmount = againstLines.reduce((sum, line) => sum + (Number(line.debitLocal) || 0), 0);
    const voucherDifference = Math.round((totalAgainstAmount - totalAmount) * 100) / 100;
    const hasPartnerSelected = Boolean(header.partnerId);
    useEffect(() => { setHeader(prev => ({ ...prev, amount: totalAmount })); }, [totalAmount]);

    const handleSave = async () => {
        if (!header.partnerId) { alert('الرجاء اختيار المستفيد'); return; }
        if (totalAmount <= 0) { alert('الرجاء إدخال المبلغ'); return; }
        const invalid = lines.find(l => {
            if (!l.accountId) return true;
            if (l.type === 'CHEQUE' && (!l.chequeNo || !l.bankAccountId || !l.dueDate)) return true;
            if (l.type === 'TRANSFER' && !l.bankAccountId) return true;
            return false;
        });
        if (invalid) { alert('الرجاء تعبئة جميع الحقول المطلوبة'); return; }
        const invalidAgainst = againstLines.find((line) => !line.accountId || Number(line.debitLocal) <= 0);
        if (invalidAgainst) { alert('الرجاء تعبئة تبويب المقابل بشكل صحيح'); setActiveTab('AGAINST'); return; }
        if (Math.abs(voucherDifference) > 0.01) { alert('يجب أن يتساوى مجموع الصرف مع مجموع المقابل'); return; }

        setSubmitting(true);
        try {
            const extraData = {
                paymentRate: header.paymentRate || 0,
                supplierDiscountRate: header.supplierDiscountRate || 0,
                discountUntilDate: header.discountUntilDate || '',
                expenseReference: additionalInfo.expenseReference,
                dueDate: additionalInfo.dueDate,
                beneficiaryName: additionalInfo.beneficiaryName,
                identityNumber: additionalInfo.identityNumber,
                notes: additionalInfo.notes
            };
            const payload = {
                header: {
                    ...header, voucher_no: header.voucherNo, currency_id: 'ILS',
                    partner_id: header.partnerId, total_amount: totalAmount,
                    exchange_rate: 1, manual_ref: header.manualRef,
                    cost_center_id: header.costCenterId, branch_id: header.branchId,
                    sales_rep_code: header.salesRepCode || null,
                    extra_data: JSON.stringify(extraData)
                },
                details: lines.filter(l => l.type !== 'CHEQUE').map(l => ({
                    type: l.type, account_id: l.accountId, amount: l.amountLocal,
                    description: l.description, cost_center_id: l.costCenterId,
                    currency: l.lineCurrency,
                    foreign_amount: l.amountForeign,
                    bank_account_id: l.type === 'TRANSFER' ? l.bankAccountId : null // Pass for transfers
                })),
                checks: lines.filter(l => l.type === 'CHEQUE').map(l => ({
                    cheque_no: l.chequeNo,
                    bank_name: l.bankName,
                    bank_account_id: l.bankAccountId, // Send this!
                    amount: l.amountLocal,
                    currency: l.lineCurrency,
                    foreign_amount: l.amountForeign,
                    due_date: l.dueDate, drawer_name: 'Self'
                })),
                against: againstLines.map((line) => ({
                    account_id: line.accountId,
                    debit: line.debitLocal,
                    debit_foreign: line.debitForeign,
                    currency: line.lineCurrency,
                    reference: line.reference,
                    reference_type: inferReferenceTypeFromAccountMeta(accountIndexById[normalizeText(line.accountId)] || null),
                    sub_account_id: line.subAccountCode || null,
                    tax_ref: line.taxRef || null,
                    invoice_date: line.fromDate || null,
                    cost_center_id: header.costCenterId || null
                }))
            };
            const res = await (window as any).electronAPI.treasury.createPayment(payload);
            if (res.success) {
                alert(`تم حفظ السند بنجاح رقم ${res.voucher_no}`);
                await loadData();
                setLines([{
                    id: uuidv4(), type: 'CASH', lineCurrency: 'ILS', amountForeign: 0, amountLocal: 0,
                    accountId: null, accountName: '', amount: 0, description: ''
                }]);
                setAgainstLines([emptyAgainstLine()]);
                setAdditionalInfo(emptyAdditionalInfo());
                setHeader(prev => ({ ...prev, description: '', amount: 0, manualRef: '', partnerId: null, partnerCode: '', partnerName: '', linkedAccountName: '', partnerBalance: 0, outstandingBalance: 0, paymentRate: 0, supplierDiscountRate: 0, discountUntilDate: '' }));
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
            <AccountPicker isOpen={accountPickerOpen} onClose={() => setAccountPickerOpen(false)} onSelect={handleAccountSelect} showTransactionalOnly={pickerTarget === 'PAYMENT'} allowedPrefixes={pickerTarget === 'PAYMENT' ? PAYMENT_ACCOUNT_PREFIXES : undefined} />

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
                    <DocumentSupportDock
                        sections={helperSections}
                        title="تعريفات سند الصرف"
                        description="تحكم في العملاء والموردين والحسابات والبنوك ومراكز التكلفة دون مغادرة سند الصرف."
                    />

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">الدليل</label>
                                <div className="mb-2 flex items-center gap-2">
                                    <button type="button" onClick={() => setPartnerPickerOpen(true)} className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">الدليل</button>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="الكود"
                                        value={header.partnerCode}
                                        list="payment-partner-code-list"
                                        onChange={e => setHeader({ ...header, partnerCode: e.target.value })}
                                        onBlur={handlePartnerCodeBlurEnhanced}
                                        className="w-28 bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none focus:border-red-500 font-mono text-sm"
                                    />
                                    <div className="flex-1 cursor-pointer" onClick={() => setPartnerPickerOpen(true)}>
                                        <input readOnly value={header.partnerName} placeholder="اختر المستفيد..." className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none cursor-pointer text-sm font-bold" />
                                    </div>
                                </div>
                                <datalist id="payment-partner-code-list">
                                    {partnerOptions
                                        .filter((partner) => partner.type === header.payeeType)
                                        .map((partner) => (
                                            <option key={`${partner.type}-${partner.id}`} value={partner.code} label={partner.name} />
                                        ))}
                                </datalist>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">رقم السند</label>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                    <Hash size={16} className="text-slate-400" />
                                    <span className="font-mono font-bold text-slate-700 text-sm">{header.voucherNo}</span>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">التاريخ</label>
                                <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">مندوب المبيعات</label>
                                <select value={header.salesRepCode || ''} onChange={e => setHeader({ ...header, salesRepCode: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm">
                                    <option value="">اختر مندوب...</option>
                                    {salesReps.map((rep) => (
                                        <option key={rep.id} value={rep.code}>{rep.code ? `${rep.code} - ${rep.name}` : rep.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">الرصيد المستحق</label>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg py-2.5 px-3 text-amber-800 font-bold font-mono text-sm">{Number(header.outstandingBalance || 0).toLocaleString()}</div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">معدل الدفعات</label>
                                <input type="number" value={header.paymentRate || ''} onChange={e => setHeader({ ...header, paymentRate: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm font-mono" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">مرجع</label>
                                <input type="text" value={header.manualRef} onChange={e => setHeader({ ...header, manualRef: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الإضافة</label>
                                <input type="date" value={additionalInfo.dueDate || ''} onChange={e => setAdditionalInfo(prev => ({ ...prev, dueDate: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">نسبة خصم المورد</label>
                                <input type="number" value={header.supplierDiscountRate || ''} onChange={e => setHeader({ ...header, supplierDiscountRate: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm font-mono" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">خصم حتى تاريخ</label>
                                <input type="date" value={header.discountUntilDate || ''} onChange={e => setHeader({ ...header, discountUntilDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm" />
                            </div>

                            <div className="md:col-span-12">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">البيان العام</label>
                                <input type="text" value={header.description} list="payment-header-description-list" onChange={e => setHeader({ ...header, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm" placeholder="بيان عام للسند..." />
                                <datalist id="payment-header-description-list">
                                    {headerDescriptionOptions.map((description, index) => (
                                        <option key={`${description}-${index}`} value={description} />
                                    ))}
                                </datalist>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="flex border-b border-slate-200 bg-slate-50">
                            <button onClick={() => setActiveTab('PAYMENT')} className={`px-5 py-3 text-sm font-bold ${activeTab === 'PAYMENT' ? 'bg-white text-red-600 border-b-2 border-red-500' : 'text-slate-500'}`}>صرف</button>
                            <button onClick={() => hasPartnerSelected && setActiveTab('AGAINST')} disabled={!hasPartnerSelected} className={`px-5 py-3 text-sm font-bold ${activeTab === 'AGAINST' ? 'bg-white text-red-600 border-b-2 border-red-500' : 'text-slate-500'} ${!hasPartnerSelected ? 'opacity-40 cursor-not-allowed' : ''}`}>مقابل</button>
                            <button onClick={() => hasPartnerSelected && setActiveTab('ADDITIONAL')} disabled={!hasPartnerSelected} className={`px-5 py-3 text-sm font-bold ${activeTab === 'ADDITIONAL' ? 'bg-white text-red-600 border-b-2 border-red-500' : 'text-slate-500'} ${!hasPartnerSelected ? 'opacity-40 cursor-not-allowed' : ''}`}>إضافي</button>
                            <div className="mr-auto flex items-center gap-6 px-6 text-sm text-slate-500">
                                <span>قيمة الصرف: <b className="font-mono text-red-600">{totalAmount.toLocaleString()}</b></span>
                                <span>قيمة المقابل: <b className="font-mono text-emerald-600">{totalAgainstAmount.toLocaleString()}</b></span>
                            </div>
                        </div>

                        {activeTab === 'PAYMENT' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right" style={{ minWidth: '1180px' }}>
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 w-[220px]">الحساب (الصندوق/البنك)</th>
                                            <th className="px-4 py-3 w-[100px]">العملة</th>
                                            <th className="px-4 py-3 w-[120px]">المبلغ عملة</th>
                                            <th className="px-4 py-3 w-[120px]">المبلغ محلي</th>
                                            <th className="px-4 py-3 w-[120px]">رقم الشيك</th>
                                            <th className="px-4 py-3 w-[160px]">البنك</th>
                                            <th className="px-4 py-3 w-[140px]">تاريخ الاستحقاق</th>
                                            <th className="px-4 py-3">البيان</th>
                                            <th className="px-4 py-3 w-[50px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {lines.map((line) => (
                                            <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-2 relative">
                                                    <button type="button" onClick={() => { setPickerTarget('PAYMENT'); setActiveLineId(line.id); setAccountPickerOpen(true); }} className="w-full p-2 bg-white cursor-pointer border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 text-right">
                                                        <div className="font-medium text-slate-800 truncate">{line.accountName || 'اختر حساب الصندوق أو البنك أو صندوق الشيكات...'}</div>
                                                        <div className="text-[11px] text-slate-400 mt-1">{line.type === 'CHEQUE' ? 'شيك' : line.type === 'TRANSFER' ? 'بنك' : 'صندوق'}</div>
                                                    </button>
                                                </td>
                                                <td className="p-2"><select value={line.lineCurrency} onChange={(e) => updateLine(line.id, 'lineCurrency', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500">{currencies.map((currency) => (<option key={currency.id} value={currency.code}>{currency.code}</option>))}</select></td>
                                                <td className="p-2"><input type="number" step="0.01" value={line.amountForeign} onChange={e => updateLine(line.id, 'amountForeign', e.target.value)} disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:border-red-500 ${line.accountId ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} /></td>
                                                <td className="p-2"><input type="number" step="0.01" value={line.amountLocal} readOnly className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-red-600 outline-none" title="يتم احتساب المبلغ المحلي تلقائياً حسب سعر الصرف في تاريخ السند" /></td>
                                                <td className="p-2"><input type="text" value={line.chequeNo || ''} onChange={e => updateLine(line.id, 'chequeNo', e.target.value)} disabled={line.type !== 'CHEQUE'} className={`w-full p-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-red-500 ${line.type === 'CHEQUE' ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} /></td>
                                                <td className="p-2"><BankAccountSelect value={line.bankAccountId} onChange={(acc) => { updateLine(line.id, 'bankAccountId', acc?.id); updateLine(line.id, 'bankName', acc?.bank_name); if (line.type === 'TRANSFER') { updateLine(line.id, 'accountId', acc?.gl_account_id); updateLine(line.id, 'accountName', acc?.gl_account_name || acc?.account_name); } }} error={!line.bankAccountId && (line.type === 'CHEQUE' || line.type === 'TRANSFER')} placeholder={line.type === 'CHEQUE' ? 'اختر بنك الشيك...' : line.type === 'TRANSFER' ? 'اختر الحساب البنكي...' : 'غير مطلوب للصندوق'} className={line.type === 'CASH' ? 'pointer-events-none opacity-50' : ''} /></td>
                                                <td className="p-2"><input type="date" value={line.dueDate || ''} onChange={e => updateLine(line.id, 'dueDate', e.target.value)} disabled={line.type !== 'CHEQUE'} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500" /></td>
                                                <td className="p-2"><input type="text" value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)} list="payment-line-description-list" disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} placeholder="ملاحظات..." /></td>
                                                <td className="p-2 text-center"><button onClick={() => removeLine(line.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <datalist id="payment-line-description-list">
                                    {lineDescriptionOptions.map((description, index) => (
                                        <option key={`${description}-${index}`} value={description} />
                                    ))}
                                </datalist>
                                <div className="p-4 border-t border-slate-100 bg-slate-50">
                                    <button onClick={addNewLine} disabled={!hasPartnerSelected} className="flex items-center gap-2 text-red-600 font-bold hover:bg-white hover:shadow-sm px-4 py-2 rounded-lg transition-all border border-transparent hover:border-red-100 disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={18} /><span>إضافة سطر صرف</span></button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'AGAINST' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right" style={{ minWidth: '1320px' }}>
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3 py-3 w-[220px]">حساب</th>
                                            <th className="px-3 py-3 w-[90px]">عملة</th>
                                            <th className="px-3 py-3 w-[110px]">حساب فرعي</th>
                                            <th className="px-3 py-3 w-[120px]">مرجع</th>
                                            <th className="px-3 py-3 w-[120px]">قيمة مدين</th>
                                            <th className="px-3 py-3 w-[120px]">مدين</th>
                                            <th className="px-3 py-3 w-[120px]">مرجع ضريبي</th>
                                            <th className="px-3 py-3 w-[120px]">من تاريخ</th>
                                            <th className="px-3 py-3 w-[120px]">إلى تاريخ</th>
                                            <th className="px-3 py-3 w-[120px]">مشغل مرخص</th>
                                            <th className="px-3 py-3 w-[180px]">اسم المشغل المرخص</th>
                                            <th className="px-3 py-3 w-[50px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {againstLines.map((line) => (
                                            (() => {
                                                const referenceOptions = getReferenceOptionsForAgainstLine(line);
                                                const subAccountOptions = getSubAccountOptionsForAgainstLine(line);
                                                const listId = `payment-against-reference-${line.id}`;
                                                return (
                                            <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-2"><button type="button" onClick={() => { setPickerTarget('AGAINST'); setActiveLineId(line.id); setAccountPickerOpen(true); }} className={`w-full rounded-lg border px-3 py-2 text-right text-sm ${line.accountId ? 'border-slate-200 bg-white text-slate-700' : 'border-red-200 bg-red-50 text-red-600'}`}>{line.accountCode ? `${line.accountCode} - ${line.accountName}` : (line.accountName || 'اختر حساب المقابل...')}</button></td>
                                                <td className="p-2"><select value={line.lineCurrency} onChange={e => updateAgainstLine(line.id, 'lineCurrency', e.target.value)} disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>{currencies.map((currency) => (<option key={currency.id} value={currency.code}>{currency.code}</option>))}</select></td>
                                                <td className="p-2">
                                                    <select
                                                        value={line.subAccountCode || ''}
                                                        onChange={e => updateAgainstLine(line.id, 'subAccountCode', e.target.value)}
                                                        disabled={!line.accountId}
                                                        className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                    >
                                                        <option value="">اختر حسابًا فرعيًا...</option>
                                                        {subAccountOptions.map((subAccount) => {
                                                            const subValue = subAccount.id;
                                                            const subLabel = subAccount.code
                                                                ? `${subAccount.code} - ${subAccount.name}`
                                                                : subAccount.name;
                                                            return <option key={subAccount.id} value={subValue}>{subLabel}</option>;
                                                        })}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={line.reference || ''}
                                                        list={listId}
                                                        onChange={e => updateAgainstLine(line.id, 'reference', e.target.value)}
                                                        disabled={!line.accountId}
                                                        className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                        placeholder="اختر مرجع من دليل الحساب..."
                                                    />
                                                    <datalist id={listId}>
                                                        {referenceOptions.map((option, index) => (
                                                            <option key={`${option.value}-${index}`} value={option.value} label={option.label} />
                                                        ))}
                                                    </datalist>
                                                </td>
                                                <td className="p-2"><input type="number" step="0.01" value={line.debitForeign} onChange={e => updateAgainstLine(line.id, 'debitForeign', e.target.value)} disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:border-red-500 ${line.accountId ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} /></td>
                                                <td className="p-2"><input type="number" step="0.01" value={line.debitLocal} readOnly className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-emerald-600 outline-none" /></td>
                                                <td className="p-2"><input type="text" value={line.taxRef || ''} onChange={e => updateAgainstLine(line.id, 'taxRef', e.target.value)} disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} /></td>
                                                <td className="p-2"><input type="date" value={line.fromDate || ''} onChange={e => updateAgainstLine(line.id, 'fromDate', e.target.value)} disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} /></td>
                                                <td className="p-2"><input type="date" value={line.toDate || ''} onChange={e => updateAgainstLine(line.id, 'toDate', e.target.value)} disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} /></td>
                                                <td className="p-2"><input type="text" value={line.permitNo || ''} onChange={e => updateAgainstLine(line.id, 'permitNo', e.target.value)} disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} /></td>
                                                <td className="p-2"><input type="text" value={line.permitHolderName || ''} onChange={e => updateAgainstLine(line.id, 'permitHolderName', e.target.value)} disabled={!line.accountId} className={`w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-red-500 ${line.accountId ? 'bg-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} /></td>
                                                <td className="p-2 text-center"><button onClick={() => { if (againstLines.length > 1) setAgainstLines(prev => prev.filter(item => item.id !== line.id)); }} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button></td>
                                            </tr>
                                                );
                                            })()
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-4 border-t border-slate-100 bg-slate-50">
                                    <button onClick={() => setAgainstLines(prev => [...prev, emptyAgainstLine()])} disabled={!hasPartnerSelected} className="flex items-center gap-2 text-red-600 font-bold hover:bg-white hover:shadow-sm px-4 py-2 rounded-lg transition-all border border-transparent hover:border-red-100 disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={18} /><span>إضافة سطر مقابل</span></button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ADDITIONAL' && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">مرجع المصروف</label>
                                    <input type="text" value={additionalInfo.expenseReference} onChange={e => setAdditionalInfo(prev => ({ ...prev, expenseReference: e.target.value }))} disabled={!hasPartnerSelected} className={`w-full border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm ${hasPartnerSelected ? 'bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الاستلام</label>
                                    <input type="date" value={additionalInfo.dueDate} onChange={e => setAdditionalInfo(prev => ({ ...prev, dueDate: e.target.value }))} disabled={!hasPartnerSelected} className={`w-full border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm ${hasPartnerSelected ? 'bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم المستلم</label>
                                    <input type="text" value={additionalInfo.beneficiaryName} onChange={e => setAdditionalInfo(prev => ({ ...prev, beneficiaryName: e.target.value }))} disabled={!hasPartnerSelected} className={`w-full border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm ${hasPartnerSelected ? 'bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">رقم الهوية</label>
                                    <input type="text" value={additionalInfo.identityNumber} onChange={e => setAdditionalInfo(prev => ({ ...prev, identityNumber: e.target.value }))} disabled={!hasPartnerSelected} className={`w-full border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm font-mono ${hasPartnerSelected ? 'bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 mb-2">ملاحظة</label>
                                    <textarea value={additionalInfo.notes} onChange={e => setAdditionalInfo(prev => ({ ...prev, notes: e.target.value }))} rows={5} disabled={!hasPartnerSelected} className={`w-full border border-slate-200 rounded-lg py-2.5 px-3 outline-none text-sm resize-none ${hasPartnerSelected ? 'bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-wrap items-end justify-between gap-6">
                        <div>
                            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">المبلغ كتابة</label>
                            <div className="text-xl font-bold text-slate-800 mt-1">{toArabicWords(totalAmount, 'ILS')}</div>
                        </div>
                        <div className="flex items-end gap-8">
                            <div className="text-right">
                                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">مجموع الصرف</label>
                                <div className="text-3xl font-black text-red-600 mt-1">{totalAmount.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">مجموع المقابل</label>
                                <div className="text-3xl font-black text-emerald-600 mt-1">{totalAgainstAmount.toLocaleString()}</div>
                            </div>
                            <div className={`rounded-2xl border px-5 py-3 text-center ${Math.abs(voucherDifference) < 0.01 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                                <div className="text-xs font-bold text-slate-400">الفرق</div>
                                <div className={`text-2xl font-black font-mono ${Math.abs(voucherDifference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>{voucherDifference.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Template */}
            <div className="printable">
                <PrintTemplate header={header} lines={lines} againstLines={againstLines} additionalInfo={additionalInfo} totalAmount={totalAmount} totalAgainstAmount={totalAgainstAmount} branches={branches} />
            </div>
        </div>
    );
};

const PrintTemplate = ({ header, lines, againstLines, additionalInfo, totalAmount, totalAgainstAmount, branches }: any) => {
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
                        <span className="font-bold text-gray-500 w-24 shrink-0">الإجمالي:</span>
                        <span className="font-bold text-xl text-gray-900">{Number(totalAmount).toLocaleString()} ILS</span>
                        <span className="mx-4 text-gray-300">|</span>
                        <span className="font-medium text-gray-600">{toArabicWords(totalAmount, 'ILS')}</span>
                    </div>
                    <div className="col-span-2 border border-gray-300 rounded-lg p-3 flex items-center gap-4">
                        <span className="font-bold text-gray-500 w-24 shrink-0">البيان:</span>
                        <span className="font-medium text-gray-800">{header.description}</span>
                    </div>
                    <div className="col-span-2 border border-gray-300 rounded-lg p-3 flex items-center gap-4">
                        <span className="font-bold text-gray-500 w-24 shrink-0">مرجع:</span>
                        <span className="font-medium text-gray-800">{header.manualRef || '-'}</span>
                        <span className="mx-4 text-gray-300">|</span>
                        <span className="font-bold text-gray-500 w-24 shrink-0">المستلم:</span>
                        <span className="font-medium text-gray-800">{additionalInfo?.beneficiaryName || '-'}</span>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="mb-2 font-bold text-sm text-gray-600">تفاصيل الصرف</div>
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700">
                                <th className="border border-gray-300 px-4 py-2 w-16 text-center">#</th>
                                <th className="border border-gray-300 px-4 py-2 text-right">طريقة الدفع</th>
                                <th className="border border-gray-300 px-4 py-2 text-right">التفاصيل</th>
                                <th className="border border-gray-300 px-4 py-2 text-right">البيان</th>
                                <th className="border border-gray-300 px-4 py-2 text-center w-24">العملة</th>
                                <th className="border border-gray-300 px-4 py-2 text-left w-32">عملة</th>
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
                                    <td className="border border-gray-300 px-4 py-2 text-center font-bold">{line.lineCurrency || 'ILS'}</td>
                                    <td className="border border-gray-300 px-4 py-2 text-left font-mono">{Number(line.amountForeign ?? line.amount).toLocaleString()}</td>
                                    <td className="border border-gray-300 px-4 py-2 text-left font-mono">{Number(line.amountLocal ?? line.amount).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-bold">
                                <td colSpan={5} className="border border-gray-300 px-4 py-2 text-left text-gray-600">الإجمالي المحلي</td>
                                <td className="border border-gray-300 px-4 py-2 text-left text-gray-900 text-lg">{Number(totalAmount).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="mb-8">
                    <div className="mb-2 font-bold text-sm text-gray-600">المقابل</div>
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700">
                                <th className="border border-gray-300 px-4 py-2 w-16 text-center">#</th>
                                <th className="border border-gray-300 px-4 py-2 text-right">الحساب</th>
                                <th className="border border-gray-300 px-4 py-2 text-center w-24">العملة</th>
                                <th className="border border-gray-300 px-4 py-2 text-right">المرجع</th>
                                <th className="border border-gray-300 px-4 py-2 text-left w-32">مدين</th>
                            </tr>
                        </thead>
                        <tbody>
                            {againstLines.map((line: any, idx: number) => (
                                <tr key={`against-${idx}`}>
                                    <td className="border border-gray-300 px-4 py-2 text-center">{idx + 1}</td>
                                    <td className="border border-gray-300 px-4 py-2">{line.accountCode ? `${line.accountCode} - ` : ''}{line.accountName}</td>
                                    <td className="border border-gray-300 px-4 py-2 text-center font-bold">{line.lineCurrency || 'ILS'}</td>
                                    <td className="border border-gray-300 px-4 py-2">{line.reference || '-'}</td>
                                    <td className="border border-gray-300 px-4 py-2 text-left font-mono">{Number(line.debitLocal || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-bold">
                                <td colSpan={4} className="border border-gray-300 px-4 py-2 text-left text-gray-600">إجمالي المقابل</td>
                                <td className="border border-gray-300 px-4 py-2 text-left text-gray-900 text-lg">{Number(totalAgainstAmount).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="mb-6 rounded-lg border border-gray-300 p-4 text-sm text-gray-700">
                    <div><span className="font-bold text-gray-500">مرجع المصروف:</span> {additionalInfo?.expenseReference || '-'}</div>
                    <div className="mt-2"><span className="font-bold text-gray-500">رقم الهوية:</span> {additionalInfo?.identityNumber || '-'}</div>
                    <div className="mt-2"><span className="font-bold text-gray-500">ملاحظات:</span> {additionalInfo?.notes || '-'}</div>
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


