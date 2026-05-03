import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountForm } from './AccountForm';
import { tAccountingModule as t } from './accounting.i18n';
import DefinitionMasterList, { DefinitionListColumn } from '../../../../components/definitions/DefinitionMasterList';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronsDownUp, ChevronsUpDown, CircleOff, Edit, Layers, Lock, RefreshCw } from 'lucide-react';
import {
    AccountFormErrors,
    AccountFormModel,
    AccountQueryInput,
    AccountRowDto,
    AccountTreeNode,
    AccountType,
    CurrencyBehavior,
    FlattenedAccountRow,
    ScopeType,
} from './accounting.types';
import {
    collectInitialExpandedIds,
    flattenVisibleTree,
    normalizeAccountTree,
} from './accountTree.utils';

const EMPTY_FORM: AccountFormModel = {
    accountCode: '',
    name: '',
    parentId: null,
    accountType: 'ASSET',
    accountCategory: 'GENERAL',
    accountSubtype: 'GENERAL',
    postingAllowed: true,
    currencyBehavior: 'BASE_ONLY',
    currencyCode: '',
    referenceType: 'NONE',
    scopeType: 'COMPANY',
    branchId: '',
    status: 'ACTIVE',
    requiresCostCenter: false,
    requiresAnalysisCode: false,
};

const EMPTY_QUERY: AccountQueryInput = {
    searchText: '',
    category: 'ALL',
    structure: 'ALL',
    includeInactive: true,
};

const SUBTYPES_BY_TYPE: Record<AccountFormModel['accountType'], string[]> = {
    ASSET: ['GENERAL', 'CASH', 'BANK', 'RECEIVABLE', 'INVENTORY', 'TAX_RECEIVABLE', 'DISCOUNT', 'ROUNDING'],
    LIABILITY: ['GENERAL', 'PAYABLE', 'TAX_PAYABLE', 'DISCOUNT', 'ROUNDING'],
    EQUITY: ['GENERAL', 'ROUNDING'],
    REVENUE: ['GENERAL', 'REVENUE', 'DISCOUNT', 'ROUNDING'],
    EXPENSE: ['GENERAL', 'EXPENSE', 'COGS', 'DISCOUNT', 'ROUNDING'],
};

const CATEGORIES_BY_TYPE: Record<AccountFormModel['accountType'], string[]> = {
    ASSET: ['CURRENT_ASSET', 'NON_CURRENT_ASSET', 'CONTROL', 'TAX', 'GENERAL'],
    LIABILITY: ['CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY', 'CONTROL', 'TAX', 'GENERAL'],
    EQUITY: ['EQUITY', 'GENERAL'],
    REVENUE: ['OPERATING_REVENUE', 'OTHER_REVENUE', 'GENERAL'],
    EXPENSE: ['OPERATING_EXPENSE', 'OTHER_EXPENSE', 'GENERAL'],
};

const CATEGORY_DEFAULT_BY_TYPE: Record<AccountFormModel['accountType'], string> = {
    ASSET: 'CURRENT_ASSET',
    LIABILITY: 'CURRENT_LIABILITY',
    EQUITY: 'EQUITY',
    REVENUE: 'OPERATING_REVENUE',
    EXPENSE: 'OPERATING_EXPENSE',
};

const REFERENCE_BY_SUBTYPE_DEFAULT: Record<string, AccountFormModel['referenceType']> = {
    RECEIVABLE: 'GUIDE',
    PAYABLE: 'GUIDE',
    BANK: 'BANK_CHEQUE',
    CASH: 'USER',
};

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const CURRENCY_BEHAVIORS: CurrencyBehavior[] = ['BASE_ONLY', 'FIXED_CURRENCY', 'MULTI_CURRENCY'];
const SCOPE_TYPES: ScopeType[] = ['COMPANY', 'BRANCH'];

function normalizeAccountCodeInput(value: string): string {
    return String(value || '')
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/\D+/g, '');
}

function toFormModel(row: AccountRowDto): AccountFormModel {
    return {
        id: row.id,
        accountCode: row.accountCode,
        name: row.name,
        parentId: row.parentId,
        accountType: row.accountType,
        accountCategory: row.accountCategory,
        accountSubtype: row.accountSubtype,
        postingAllowed: row.postingAllowed,
        currencyBehavior: row.currencyBehavior,
        currencyCode: row.currencyCode || '',
        referenceType: row.referenceType || 'NONE',
        scopeType: row.scopeType,
        branchId: row.branchId || '',
        status: row.status,
        requiresCostCenter: row.requiresCostCenter,
        requiresAnalysisCode: row.requiresAnalysisCode,
    };
}

export default function ChartOfAccountsPage() {
    const api = window.electronAPI?.accountingFoundation;
    const [tree, setTree] = useState<AccountTreeNode[]>([]);
    const [flatAccounts, setFlatAccounts] = useState<AccountRowDto[]>([]);
    const [query, setQuery] = useState<AccountQueryInput>(EMPTY_QUERY);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string>('');
    const [form, setForm] = useState<AccountFormModel>(EMPTY_FORM);
    const [errors, setErrors] = useState<AccountFormErrors>({});
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [busy, setBusy] = useState<boolean>(false);

    const firstFormFieldRef = useRef<HTMLInputElement | null>(null);

    const loadData = useCallback(async (): Promise<void> => {
        if (!api?.getAccountTree || !api?.listAccounts) {
            return;
        }
        setBusy(true);
        try {
            const [treeRows, listRows] = await Promise.all([
                api.getAccountTree(true),
                api.listAccounts(true),
            ]);
            const normalizedTree = normalizeAccountTree(treeRows);
            setTree(normalizedTree);
            setFlatAccounts(Array.isArray(listRows) ? listRows : []);
            setExpandedIds((prev) => (prev.size ? prev : collectInitialExpandedIds(normalizedTree)));
        } finally {
            setBusy(false);
        }
    }, [api]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const parentOptions = useMemo(
        () =>
            flatAccounts.filter((item) => {
                if (form.id && item.id === form.id) return false;
                return !item.postingAllowed;
            }),
        [flatAccounts, form.id],
    );

    const categories = useMemo(
        () => Array.from(new Set(flatAccounts.map((item) => item.accountCategory).filter(Boolean))).sort(),
        [flatAccounts],
    );

    const subtypes = useMemo(
        () => Array.from(new Set(flatAccounts.map((item) => item.accountSubtype).filter(Boolean))).sort(),
        [flatAccounts],
    );

    const rows = useMemo(() => flattenVisibleTree(tree, expandedIds, query), [tree, expandedIds, query]);
    const suggestNextChildCode = useCallback(
        (parentId: string | null): string => {
            if (!parentId) return '';
            const parent = flatAccounts.find((item) => item.id === parentId);
            if (!parent) return '';

            const parentCode = String(parent.accountCode || '').trim().toUpperCase();
            if (!parentCode) return '';

            const siblings = flatAccounts
                .filter((item) => item.parentId === parentId)
                .map((item) => String(item.accountCode || '').trim().toUpperCase())
                .filter((code) => code.startsWith(parentCode));

            if (!siblings.length) return `${parentCode}01`;

            let maxNumeric = 0;
            let width = 2;
            for (const code of siblings) {
                const suffix = code.slice(parentCode.length);
                if (!/^\d+$/.test(suffix)) continue;
                const numeric = Number(suffix);
                if (Number.isFinite(numeric) && numeric >= maxNumeric) {
                    maxNumeric = numeric;
                    width = Math.max(width, suffix.length);
                }
            }

            return `${parentCode}${String(maxNumeric + 1).padStart(width, '0')}`;
        },
        [flatAccounts],
    );

    useEffect(() => {
        if (!rows.length) {
            setSelectedId('');
            return;
        }
        if (!selectedId || !rows.some((item) => item.node.id === selectedId)) {
            setSelectedId(rows[0].node.id);
        }
    }, [rows, selectedId]);

    useEffect(() => {
        if (!selectedId) return;
        const row = flatAccounts.find((item) => item.id === selectedId);
        if (!row) return;
        setForm(toFormModel(row));
        setErrors({});
    }, [selectedId, flatAccounts]);

    const validateForm = useCallback((): AccountFormErrors => {
        const nextErrors: AccountFormErrors = {};
        const normalizedAccountCode = normalizeAccountCodeInput(form.accountCode);
        if (!normalizedAccountCode) {
            nextErrors.accountCode = t('coa.form.error.accountCode.required');
        } else if (normalizedAccountCode !== form.accountCode.trim()) {
            nextErrors.accountCode = 'كود الحساب يجب أن يحتوي على أرقام فقط.';
        }
        if (!form.name.trim()) {
            nextErrors.name = t('coa.form.error.name.required');
        }
        if (!form.accountCategory.trim()) {
            nextErrors.accountCategory = t('coa.form.error.accountCategory.required');
        }
        if (!form.accountSubtype.trim()) {
            nextErrors.accountSubtype = t('coa.form.error.accountSubtype.required');
        }
        if (form.parentId && !flatAccounts.some((item) => item.id === form.parentId)) {
            nextErrors.parentId = t('coa.form.error.parent.invalid');
        }
        const allowedCategories = CATEGORIES_BY_TYPE[form.accountType] || [];
        if (form.accountCategory && allowedCategories.length && !allowedCategories.includes(form.accountCategory)) {
            nextErrors.accountCategory = 'تصنيف الحساب غير متوافق مع نوع الحساب المختار.';
        }
        if (form.parentId) {
            const parent = flatAccounts.find((item) => item.id === form.parentId);
            if (parent && parent.accountType !== form.accountType) {
                nextErrors.accountType = 'نوع الحساب الفرعي يجب أن يطابق نوع الحساب الأب.';
            }
        }
        if (form.postingAllowed && !form.parentId) {
            nextErrors.parentId = 'الحساب الحركي يجب أن يكون له حساب أب (رئيسي).';
        }
        if (form.scopeType === 'BRANCH' && !form.branchId.trim()) {
            nextErrors.branchId = t('coa.form.error.branch.required');
        }
        if (form.parentId) {
            const parent = flatAccounts.find((item) => item.id === form.parentId);
            if (parent) {
                const childCode = normalizedAccountCode;
                const parentCode = String(parent.accountCode || '').trim().toUpperCase();
                if (childCode && parentCode && !childCode.startsWith(parentCode)) {
                    nextErrors.accountCode = 'كود الحساب الفرعي يجب أن يبدأ بكود الحساب الأب.';
                }
            }
        }
        if (form.currencyBehavior === 'FIXED_CURRENCY' && !form.currencyCode.trim()) {
            nextErrors.currencyCode = 'عند اختيار عملة ثابتة يجب تحديد رمز العملة.';
        }
        return nextErrors;
    }, [form, flatAccounts]);

    const updateForm = (patch: Partial<AccountFormModel>): void => {
        setForm((prev) => {
            const next: AccountFormModel = { ...prev, ...patch };
            const previousType = prev.accountType;

            if (patch.parentId !== undefined) {
                const parent = flatAccounts.find((item) => item.id === patch.parentId);
                if (parent) {
                    next.accountType = parent.accountType;
                    if (!prev.id) {
                        next.accountCategory = parent.accountCategory;
                    }
                }
            }

            const effectiveTypeChanged = previousType !== next.accountType;
            if (patch.accountType || effectiveTypeChanged) {
                const allowed = SUBTYPES_BY_TYPE[next.accountType] || [];
                if (!allowed.includes(next.accountSubtype)) {
                    next.accountSubtype = allowed[0] || 'GENERAL';
                }

                const allowedCategories = CATEGORIES_BY_TYPE[next.accountType] || [];
                if (!allowedCategories.includes(next.accountCategory)) {
                    next.accountCategory = CATEGORY_DEFAULT_BY_TYPE[next.accountType] || allowedCategories[0] || 'GENERAL';
                }

                if (!patch.referenceType) {
                    next.referenceType = REFERENCE_BY_SUBTYPE_DEFAULT[next.accountSubtype] || 'NONE';
                }
            }

            if (patch.accountSubtype && !patch.referenceType) {
                next.referenceType = REFERENCE_BY_SUBTYPE_DEFAULT[patch.accountSubtype] || 'NONE';
            }

            if (patch.parentId !== undefined && !prev.id) {
                const hasCode = String(next.accountCode || '').trim().length > 0;
                if (!hasCode) {
                    next.accountCode = suggestNextChildCode(next.parentId);
                }
            }

            if (patch.currencyBehavior && patch.currencyBehavior !== 'FIXED_CURRENCY') {
                next.currencyCode = '';
            }

            return next;
        });
    };

    const createNewForm = useCallback((): void => {
        const selected = flatAccounts.find((item) => item.id === selectedId);
        const suggestedParentId = selected && !selected.postingAllowed ? selected.id : null;
        const parent = suggestedParentId ? flatAccounts.find((item) => item.id === suggestedParentId) : null;
        const nextType = parent?.accountType || EMPTY_FORM.accountType;
        const nextSubtypes = SUBTYPES_BY_TYPE[nextType] || ['GENERAL'];
        const nextCategories = CATEGORIES_BY_TYPE[nextType] || ['GENERAL'];
        const nextSubtype = nextSubtypes[0] || 'GENERAL';
        setSelectedId('');
        setForm({
            ...EMPTY_FORM,
            parentId: suggestedParentId,
            accountCode: suggestNextChildCode(suggestedParentId),
            accountType: nextType,
            accountSubtype: nextSubtype,
            accountCategory: nextCategories[0] || 'GENERAL',
            referenceType: REFERENCE_BY_SUBTYPE_DEFAULT[nextSubtype] || 'NONE',
        });
        setErrors({});
        setStatusMessage('');
        setTimeout(() => firstFormFieldRef.current?.focus(), 0);
    }, [flatAccounts, selectedId, suggestNextChildCode]);

    const saveForm = useCallback(async (): Promise<void> => {
        if (!api?.saveAccount) return;
        const validation = validateForm();
        setErrors(validation);
        if (Object.keys(validation).length > 0) {
            return;
        }

        const payload = {
            id: form.id,
            accountCode: normalizeAccountCodeInput(form.accountCode),
            name: form.name.trim(),
            parentId: form.parentId || null,
            accountType: form.accountType,
            accountCategory: form.accountCategory.trim(),
            accountSubtype: form.accountSubtype.trim(),
            postingAllowed: form.postingAllowed,
            currencyBehavior: form.currencyBehavior,
            currencyCode: form.currencyCode.trim() || null,
            referenceType: form.referenceType,
            scopeType: form.scopeType,
            branchId: form.branchId.trim() || null,
            status: form.status,
            requiresCostCenter: form.requiresCostCenter,
            requiresAnalysisCode: form.requiresAnalysisCode,
        } as const;

        try {
            const saved = await api.saveAccount(payload);
            await loadData();
            if (saved?.id) {
                setSelectedId(String(saved.id));
            }
            setStatusMessage(t('coa.feedback.saved'));
        } catch (error: any) {
            setStatusMessage(String(error?.messageKey || error?.message || ''));
        }
    }, [api, form, loadData, validateForm]);

    const toggleActive = useCallback(async (): Promise<void> => {
        if (!selectedId || !api) return;
        const selected = flatAccounts.find((item) => item.id === selectedId);
        if (!selected) return;
        try {
            if (selected.status === 'ACTIVE') {
                if (api.deactivateAccount) {
                    await api.deactivateAccount(selected.id);
                } else {
                    await api.saveAccount({ ...toFormModel(selected), id: selected.id, status: 'INACTIVE' });
                }
            } else if (api.activateAccount) {
                await api.activateAccount(selected.id);
            } else {
                await api.saveAccount({ ...toFormModel(selected), id: selected.id, status: 'ACTIVE' });
            }
            await loadData();
            setSelectedId(selected.id);
            setStatusMessage(t('coa.feedback.status_updated'));
        } catch (error: any) {
            setStatusMessage(String(error?.messageKey || error?.message || ''));
        }
    }, [api, flatAccounts, loadData, selectedId]);

    const allExpandableIds = useMemo(() => {
        const ids = new Set<string>();
        const walk = (nodes: AccountTreeNode[]) => {
            for (const node of nodes) {
                if (node.children.length > 0) ids.add(node.id);
                walk(node.children);
            }
        };
        walk(tree);
        return ids;
    }, [tree]);

    const selectedAccount = useMemo(
        () => flatAccounts.find((item) => item.id === selectedId) || null,
        [flatAccounts, selectedId],
    );

    const headerStats = useMemo(() => {
        const active = flatAccounts.filter((item) => item.status === 'ACTIVE').length;
        const inactive = flatAccounts.length - active;
        const postable = flatAccounts.filter((item) => item.postingAllowed).length;
        const headers = flatAccounts.length - postable;
        return { active, inactive, postable, headers };
    }, [flatAccounts]);

    const accountTypeOptions = useMemo(
        () => ACCOUNT_TYPES.map((item) => ({ value: item, label: t(`accounting.foundation.enum.${item}`) })),
        [],
    );

    const categoryOptions = useMemo(
        () => categories.map((item) => ({ value: item, label: t(`accounting.foundation.enum.${item}`) })),
        [categories],
    );

    const subtypeOptions = useMemo(
        () => subtypes.map((item) => ({ value: item, label: t(`accounting.foundation.enum.${item}`) })),
        [subtypes],
    );

    const currencyBehaviorOptions = useMemo(
        () => CURRENCY_BEHAVIORS.map((item) => ({ value: item, label: t(`accounting.foundation.enum.${item}`) })),
        [],
    );

    const scopeOptions = useMemo(
        () => SCOPE_TYPES.map((item) => ({ value: item, label: t(`accounting.foundation.enum.${item}`) })),
        [],
    );

    const openRows = useCallback(() => {
        setExpandedIds(new Set(allExpandableIds));
    }, [allExpandableIds]);

    const closeRows = useCallback(() => {
        setExpandedIds(new Set());
    }, []);

    const editRow = useCallback((row: FlattenedAccountRow) => {
        setSelectedId(row.node.id);
        setTimeout(() => firstFormFieldRef.current?.focus(), 0);
    }, []);

    const handleSelectedRowsChange = useCallback((selectedRows: FlattenedAccountRow[]) => {
        if (selectedRows.length === 1) {
            setSelectedId(selectedRows[0].node.id);
        }
    }, []);

    const handleDeleteRows = useCallback(async (selectedRows: FlattenedAccountRow[]) => {
        if (!api?.deleteAccount || selectedRows.length === 0) return;
        const text = selectedRows.length === 1
            ? 'هل تريد حذف الحساب المحدد؟'
            : `هل تريد حذف ${selectedRows.length} حسابات محددة؟`;
        if (!window.confirm(text)) return;

        setBusy(true);
        try {
            for (const row of selectedRows) {
                await api.deleteAccount(row.node.id);
            }
            setSelectedId('');
            await loadData();
            setStatusMessage('تم حذف الحسابات المحددة.');
        } catch (error: any) {
            setStatusMessage(String(error?.messageKey || error?.message || 'تعذر حذف الحسابات المحددة.'));
        } finally {
            setBusy(false);
        }
    }, [api, loadData]);

    const columns = useMemo<DefinitionListColumn<FlattenedAccountRow>[]>(() => [
        {
            key: 'accountCode',
            label: 'الرمز',
            type: 'text',
            filterType: 'text',
            width: 150,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.node.accountCode,
            getDisplayValue: (row) => row.node.accountCode,
            getSearchValue: (row) => `${row.node.accountCode} ${row.node.name}`,
            renderCell: (row) => (
                <span className="font-mono font-bold text-slate-800" dir="ltr">
                    {row.node.accountCode}
                </span>
            ),
        },
        {
            key: 'name',
            label: 'اسم الحساب',
            type: 'text',
            filterType: 'text',
            width: 320,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.node.name,
            getDisplayValue: (row) => row.node.name,
            getSearchValue: (row) => `${row.node.accountCode} ${row.node.name}`,
            renderCell: (row) => (
                <div className="flex min-w-0 items-center gap-2" style={{ paddingRight: `${row.depth * 18}px` }}>
                    {row.hasChildren ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setExpandedIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(row.node.id)) next.delete(row.node.id);
                                    else next.add(row.node.id);
                                    return next;
                                });
                            }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                            aria-label={row.isExpanded ? 'طي الحساب' : 'فتح الحساب'}
                            title={row.isExpanded ? 'طي الحساب' : 'فتح الحساب'}
                        >
                            {row.isExpanded ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}
                        </button>
                    ) : (
                        <span className="h-7 w-7 shrink-0" />
                    )}
                    <span className={`truncate ${row.node.postingAllowed ? 'font-semibold text-slate-800' : 'font-extrabold text-slate-900'}`}>
                        {row.node.name}
                    </span>
                </div>
            ),
        },
        {
            key: 'postingAllowed',
            label: 'نوع الحساب',
            type: 'boolean',
            filterType: 'boolean',
            width: 145,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => (row.node.postingAllowed ? 1 : 0),
            getDisplayValue: (row) => (row.node.postingAllowed ? 'ترحيل' : 'رئيسي'),
            renderCell: (row) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${row.node.postingAllowed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {row.node.postingAllowed ? <CheckCircle2 size={12} /> : <Layers size={12} />}
                    {row.node.postingAllowed ? 'ترحيل' : 'رئيسي'}
                </span>
            ),
        },
        {
            key: 'accountType',
            label: 'النموذج',
            type: 'enum',
            filterType: 'enum',
            options: accountTypeOptions,
            width: 155,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.node.accountType,
            getDisplayValue: (row) => t(`accounting.foundation.enum.${row.node.accountType}`),
        },
        {
            key: 'accountCategory',
            label: 'التصنيف',
            type: 'enum',
            filterType: 'enum',
            options: categoryOptions,
            width: 180,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.node.accountCategory,
            getDisplayValue: (row) => t(`accounting.foundation.enum.${row.node.accountCategory}`),
        },
        {
            key: 'accountSubtype',
            label: 'التصنيف الفرعي',
            type: 'enum',
            filterType: 'enum',
            options: subtypeOptions,
            width: 180,
            defaultVisible: false,
            align: 'center',
            getValue: (row) => row.node.accountSubtype,
            getDisplayValue: (row) => t(`accounting.foundation.enum.${row.node.accountSubtype}`),
        },
        {
            key: 'currencyBehavior',
            label: 'سلوك العملة',
            type: 'enum',
            filterType: 'enum',
            options: currencyBehaviorOptions,
            width: 170,
            defaultVisible: false,
            align: 'center',
            getValue: (row) => row.node.currencyBehavior,
            getDisplayValue: (row) => t(`accounting.foundation.enum.${row.node.currencyBehavior}`),
        },
        {
            key: 'currencyCode',
            label: 'رمز العملة',
            type: 'text',
            filterType: 'text',
            width: 120,
            defaultVisible: false,
            align: 'center',
            getValue: (row) => row.node.currencyCode || '',
            getDisplayValue: (row) => row.node.currencyCode || '-',
            renderCell: (row) => <span className="font-mono text-slate-600">{row.node.currencyCode || '-'}</span>,
        },
        {
            key: 'scopeType',
            label: 'النطاق',
            type: 'enum',
            filterType: 'enum',
            options: scopeOptions,
            width: 130,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.node.scopeType,
            getDisplayValue: (row) => t(`accounting.foundation.enum.${row.node.scopeType}`),
        },
        {
            key: 'requiresCostCenter',
            label: 'مركز تكلفة',
            type: 'boolean',
            filterType: 'boolean',
            width: 125,
            defaultVisible: false,
            align: 'center',
            getValue: (row) => (row.node.requiresCostCenter ? 1 : 0),
            getDisplayValue: (row) => (row.node.requiresCostCenter ? 'نعم' : 'لا'),
        },
        {
            key: 'requiresAnalysisCode',
            label: 'رمز تحليل',
            type: 'boolean',
            filterType: 'boolean',
            width: 125,
            defaultVisible: false,
            align: 'center',
            getValue: (row) => (row.node.requiresAnalysisCode ? 1 : 0),
            getDisplayValue: (row) => (row.node.requiresAnalysisCode ? 'نعم' : 'لا'),
        },
        {
            key: 'level',
            label: 'المستوى',
            type: 'number',
            filterType: 'number',
            width: 110,
            defaultVisible: false,
            align: 'center',
            getValue: (row) => row.node.level,
            getDisplayValue: (row) => String(row.node.level),
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            options: [
                { value: 'ACTIVE', label: 'نشط' },
                { value: 'INACTIVE', label: 'غير نشط' },
            ],
            width: 125,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.node.status,
            getDisplayValue: (row) => (row.node.status === 'ACTIVE' ? 'نشط' : 'غير نشط'),
            renderCell: (row) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${row.node.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {row.node.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : <CircleOff size={12} />}
                    {row.node.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 110,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (row) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        editRow(row);
                    }}
                    className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                    title="تعديل"
                    aria-label="تعديل"
                >
                    <Edit size={16} />
                </button>
            ),
        },
    ], [accountTypeOptions, categoryOptions, currencyBehaviorOptions, editRow, scopeOptions, subtypeOptions]);

    useEffect(() => {
        const handler = (event: KeyboardEvent): void => {
            if (event.ctrlKey && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                createNewForm();
                return;
            }
            if (event.ctrlKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                void saveForm();
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                if (selectedId) {
                    const selected = flatAccounts.find((item) => item.id === selectedId);
                    setForm(selected ? toFormModel(selected) : EMPTY_FORM);
                    setErrors({});
                } else {
                    setForm(EMPTY_FORM);
                    setErrors({});
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [createNewForm, flatAccounts, saveForm, selectedId]);

    return (
        <div className="h-full overflow-auto bg-slate-50 p-6" dir="rtl">
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
                <div className="min-w-0">
                    <DefinitionMasterList
                        headerIcon={<Layers className="h-5 w-5" />}
                        headerTitle="دليل الحسابات"
                        headerSubtitle="إدارة شجرة الحسابات الأساسية مع نفس خصائص الجداول الموحدة في النظام."
                        headerBadges={[
                            { label: `${flatAccounts.length} حساب`, tone: 'info', mono: true },
                            { label: `${headerStats.postable} ترحيل`, tone: 'success', mono: true },
                            { label: `${headerStats.headers} رئيسي`, tone: 'neutral', mono: true },
                            { label: `${headerStats.inactive} غير نشط`, tone: 'warning', mono: true },
                        ]}
                        screenKey="gl.chart-of-accounts"
                        data={rows}
                        loading={busy}
                        columns={columns}
                        rowKey={(row) => row.node.id}
                        searchPlaceholder="بحث برقم الحساب أو اسم الحساب..."
                        emptyMessage="لا توجد حسابات مطابقة للمعايير الحالية"
                        createLabel="حساب جديد"
                        onCreate={createNewForm}
                        onEdit={editRow}
                        onDelete={api?.deleteAccount ? handleDeleteRows : undefined}
                        onRefresh={loadData}
                        onRowDoubleClick={editRow}
                        onSelectedRowsChange={handleSelectedRowsChange}
                        defaultSort={{ key: 'accountCode', direction: 'asc' }}
                        toolbarExtraActions={(
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={openRows}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                                    title="فتح كل مستويات الشجرة"
                                >
                                    <ChevronsUpDown size={16} />
                                    <span>فتح الكل</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={closeRows}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                                    title="طي كل مستويات الشجرة"
                                >
                                    <ChevronsDownUp size={16} />
                                    <span>طي الكل</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void toggleActive()}
                                    disabled={!selectedAccount}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="تفعيل أو تعطيل الحساب المحدد"
                                >
                                    <Lock size={16} />
                                    <span>تفعيل/تعطيل</span>
                                </button>
                                <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={query.includeInactive}
                                        onChange={(event) => setQuery((prev) => ({ ...prev, includeInactive: event.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-300"
                                    />
                                    <span>إظهار غير النشطة</span>
                                </label>
                            </div>
                        )}
                    />

                    <div className="mt-3 flex min-h-10 flex-wrap items-center gap-2 text-sm">
                        {busy ? (
                            <span className="inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 font-semibold text-sky-700">
                                <RefreshCw size={14} className="animate-spin" />
                                جاري التحديث...
                            </span>
                        ) : null}
                        {statusMessage ? (
                            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 shadow-sm">
                                {statusMessage}
                            </span>
                        ) : null}
                    </div>
                </div>

                <aside className="min-w-0 xl:sticky xl:top-4">
                    <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">نموذج الحساب</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {selectedAccount
                                        ? `${selectedAccount.accountCode} - ${selectedAccount.name}`
                                        : 'أدخل بيانات الحساب أو اختر حسابًا من الجدول.'}
                                </p>
                            </div>
                            {selectedAccount ? (
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${selectedAccount.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {selectedAccount.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <AccountForm
                        form={form}
                        errors={errors}
                        parentOptions={parentOptions}
                        firstFieldRef={firstFormFieldRef}
                        onChange={updateForm}
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={createNewForm}
                            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                        >
                            حساب جديد
                        </button>
                        <button
                            type="button"
                            onClick={() => void saveForm()}
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-900/15 transition hover:bg-sky-700"
                        >
                            حفظ
                        </button>
                        <button
                            type="button"
                            onClick={() => void loadData()}
                            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                        >
                            تحديث
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
