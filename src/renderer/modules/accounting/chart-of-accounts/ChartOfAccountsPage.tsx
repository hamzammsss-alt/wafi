import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountForm } from './AccountForm';
import { tAccountingModule as t } from './accounting.i18n';
import { AccountTreeGrid } from './AccountTreeGrid';
import {
    AccountFormErrors,
    AccountFormModel,
    AccountQueryInput,
    AccountRowDto,
    AccountTreeNode,
} from './accounting.types';
import {
    buildParentMap,
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

    const searchRef = useRef<HTMLInputElement | null>(null);
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

    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    const parentOptions = useMemo(
        () =>
            flatAccounts.filter((item) => {
                if (form.id && item.id === form.id) return false;
                return !item.postingAllowed;
            }),
        [flatAccounts, form.id],
    );

    const categories = useMemo(
        () => Array.from(new Set(flatAccounts.map((item) => item.accountCategory))).sort(),
        [flatAccounts],
    );

    const parentMap = useMemo(() => buildParentMap(tree), [tree]);
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

    const moveSelection = useCallback((direction: 1 | -1): void => {
        if (!rows.length) return;
        const index = rows.findIndex((item) => item.node.id === selectedId);
        const nextIndex = index < 0 ? 0 : Math.max(0, Math.min(rows.length - 1, index + direction));
        setSelectedId(rows[nextIndex].node.id);
    }, [rows, selectedId]);

    const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!rows.length) return;
        const current = rows.find((item) => item.node.id === selectedId);
        if (!current) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveSelection(1);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveSelection(-1);
            return;
        }
        if (event.key === 'ArrowRight' && current.hasChildren) {
            event.preventDefault();
            setExpandedIds((prev) => {
                const next = new Set(prev);
                next.add(current.node.id);
                return next;
            });
            return;
        }
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            if (current.hasChildren && current.isExpanded) {
                setExpandedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(current.node.id);
                    return next;
                });
                return;
            }
            const parentId = parentMap.get(current.node.id);
            if (parentId) {
                setSelectedId(parentId);
            }
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            firstFormFieldRef.current?.focus();
        }
    };

    useEffect(() => {
        const handler = (event: KeyboardEvent): void => {
            if (event.ctrlKey && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                searchRef.current?.focus();
                searchRef.current?.select();
                return;
            }
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
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">{t('coa.toolbar.title')}</h1>
                    <p className="text-xs text-slate-500">{t('coa.toolbar.subtitle')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('coa.toolbar.shortcuts')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" className="px-3 py-2 border rounded" onClick={createNewForm}>
                        {t('coa.toolbar.new')}
                    </button>
                    <button type="button" className="px-3 py-2 border rounded bg-sky-600 text-white" onClick={() => void saveForm()}>
                        {t('coa.toolbar.save')}
                    </button>
                    <button type="button" className="px-3 py-2 border rounded" onClick={() => void toggleActive()}>
                        {t('coa.toolbar.toggle_active')}
                    </button>
                    <button type="button" className="px-3 py-2 border rounded" onClick={() => void loadData()}>
                        {t('coa.toolbar.refresh')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-7 space-y-2">
                    <div className="grid grid-cols-12 gap-2">
                        <input
                            ref={searchRef}
                            className="col-span-6 border rounded px-2 py-1"
                            value={query.searchText}
                            onChange={(event) => setQuery((prev) => ({ ...prev, searchText: event.target.value }))}
                            placeholder={t('coa.search.placeholder')}
                        />
                        <select
                            className="col-span-3 border rounded px-2 py-1"
                            value={query.category}
                            onChange={(event) => setQuery((prev) => ({ ...prev, category: event.target.value }))}
                        >
                            <option value="ALL">{t('fd.filter.all')}</option>
                            {categories.map((item) => (
                                <option key={item} value={item}>
                                    {t(`accounting.foundation.enum.${item}`)}
                                </option>
                            ))}
                        </select>
                        <select
                            className="col-span-3 border rounded px-2 py-1"
                            value={query.structure}
                            onChange={(event) =>
                                setQuery((prev) => ({ ...prev, structure: event.target.value as AccountQueryInput['structure'] }))
                            }
                        >
                            <option value="ALL">{t('coa.filter.structure.all')}</option>
                            <option value="POSTING">{t('coa.filter.structure.posting')}</option>
                            <option value="HEADER">{t('coa.filter.structure.header')}</option>
                        </select>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={query.includeInactive}
                            onChange={(event) => setQuery((prev) => ({ ...prev, includeInactive: event.target.checked }))}
                        />
                        <span>{t('coa.filter.include_inactive')}</span>
                    </label>

                    <AccountTreeGrid
                        rows={rows}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onToggleExpand={(id) =>
                            setExpandedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                return next;
                            })
                        }
                        onGridKeyDown={onGridKeyDown}
                    />
                </div>

                <div className="col-span-5">
                    <AccountForm
                        form={form}
                        errors={errors}
                        parentOptions={parentOptions}
                        firstFieldRef={firstFormFieldRef}
                        onChange={updateForm}
                    />
                </div>
            </div>

            {busy ? <div className="text-xs text-slate-500">{t('coa.toolbar.refresh')}</div> : null}
            {statusMessage ? <div className="text-xs text-slate-600">{statusMessage}</div> : null}
        </div>
    );
}
