import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tAccountingModule as t } from '../chart-of-accounts/accounting.i18n';
import { FinancialDefinitionsForm } from './FinancialDefinitionsForm';
import {
    AccountMappingKey,
    FinancialDefinitionErrors,
    FinancialDefinitionFormModel,
    FinancialDefinitionQueryInput,
    FinancialDefinitionRowDto,
    FinancialScopeType,
    PostableAccountOption,
} from './financialDefinitions.types';

const EMPTY_FORM: FinancialDefinitionFormModel = {
    scopeType: 'COMPANY',
    scopeId: 'DEFAULT',
    mappingKey: 'REVENUE',
    accountId: '',
    priority: 100,
    isActive: true,
    validFrom: '',
    validTo: '',
    branchId: '',
    documentType: '',
    lineType: '',
    taxProfileId: '',
};

const EMPTY_QUERY: FinancialDefinitionQueryInput = {
    searchText: '',
    scopeType: 'ALL',
    mappingKey: 'ALL',
    includeInactive: true,
};

const SCOPE_TYPES: Array<FinancialScopeType | 'ALL'> = ['ALL', 'COMPANY', 'BRANCH', 'ITEM', 'ITEM_GROUP', 'WAREHOUSE', 'PARTNER'];
const MAPPING_KEYS: Array<AccountMappingKey | 'ALL'> = [
    'ALL',
    'RECEIVABLE',
    'PAYABLE',
    'REVENUE',
    'EXPENSE',
    'INVENTORY',
    'COGS',
    'TAX_PAYABLE',
    'TAX_RECEIVABLE',
    'DISCOUNT',
    'ROUNDING',
];

function toFormModel(row: FinancialDefinitionRowDto): FinancialDefinitionFormModel {
    return {
        id: row.id,
        scopeType: row.scopeType,
        scopeId: row.scopeId,
        mappingKey: row.mappingKey,
        accountId: row.accountId,
        priority: row.priority,
        isActive: row.isActive,
        validFrom: row.validFrom || '',
        validTo: row.validTo || '',
        branchId: row.branchId || '',
        documentType: row.documentType || '',
        lineType: row.lineType || '',
        taxProfileId: row.taxProfileId || '',
    };
}

export default function FinancialDefinitionsPage() {
    const api = window.electronAPI?.accountingFoundation;
    const [rows, setRows] = useState<FinancialDefinitionRowDto[]>([]);
    const [accounts, setAccounts] = useState<PostableAccountOption[]>([]);
    const [query, setQuery] = useState<FinancialDefinitionQueryInput>(EMPTY_QUERY);
    const [selectedId, setSelectedId] = useState<string>('');
    const [form, setForm] = useState<FinancialDefinitionFormModel>(EMPTY_FORM);
    const [errors, setErrors] = useState<FinancialDefinitionErrors>({});
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [busy, setBusy] = useState<boolean>(false);
    const searchRef = useRef<HTMLInputElement | null>(null);

    const loadData = useCallback(async (): Promise<void> => {
        if (!api?.listFinancialDefinitions || !api?.getPostableAccounts) return;
        setBusy(true);
        try {
            const [definitionRows, accountRows] = await Promise.all([
                api.listFinancialDefinitions(true),
                api.getPostableAccounts(),
            ]);
            setRows(Array.isArray(definitionRows) ? definitionRows : []);
            setAccounts(
                Array.isArray(accountRows)
                    ? accountRows.map((item) => ({
                        id: String(item.id),
                        accountCode: String(item.accountCode),
                        name: String(item.name),
                    }))
                    : [],
            );
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

    const accountLabelMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const account of accounts) {
            map.set(account.id, `${account.accountCode} - ${account.name}`);
        }
        return map;
    }, [accounts]);

    const filteredRows = useMemo(() => {
        const keyword = query.searchText.trim().toUpperCase();
        return rows.filter((item) => {
            if (!query.includeInactive && !item.isActive) return false;
            if (query.scopeType !== 'ALL' && item.scopeType !== query.scopeType) return false;
            if (query.mappingKey !== 'ALL' && item.mappingKey !== query.mappingKey) return false;
            if (keyword) {
                const accountText = accountLabelMap.get(item.accountId) || '';
                const target = `${item.scopeType} ${item.scopeId} ${item.mappingKey} ${accountText}`.toUpperCase();
                if (!target.includes(keyword)) return false;
            }
            return true;
        });
    }, [rows, query, accountLabelMap]);

    useEffect(() => {
        if (!filteredRows.length) {
            setSelectedId('');
            return;
        }
        if (!selectedId || !filteredRows.some((item) => item.id === selectedId)) {
            setSelectedId(filteredRows[0].id);
        }
    }, [filteredRows, selectedId]);

    useEffect(() => {
        if (!selectedId) return;
        const row = rows.find((item) => item.id === selectedId);
        if (!row) return;
        setForm(toFormModel(row));
        setErrors({});
    }, [selectedId, rows]);

    const validateForm = useCallback((): FinancialDefinitionErrors => {
        const nextErrors: FinancialDefinitionErrors = {};
        if (!form.scopeId.trim()) {
            nextErrors.scopeId = t('fd.form.error.scope_id.required');
        }
        if (!form.mappingKey) {
            nextErrors.mappingKey = t('fd.form.error.mapping.required');
        }
        if (!form.accountId.trim()) {
            nextErrors.accountId = t('fd.form.error.account.required');
        }
        if (form.scopeType === 'BRANCH' && !form.branchId.trim()) {
            nextErrors.branchId = t('fd.form.error.branch.required');
        }
        if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
            nextErrors.validRange = t('fd.form.error.valid_range');
        }
        return nextErrors;
    }, [form]);

    const updateForm = (patch: Partial<FinancialDefinitionFormModel>): void => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const createNew = (): void => {
        setSelectedId('');
        setForm(EMPTY_FORM);
        setErrors({});
        setStatusMessage('');
    };

    const saveForm = useCallback(async (): Promise<void> => {
        if (!api?.saveFinancialDefinition) return;
        const validation = validateForm();
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;

        try {
            const saved = await api.saveFinancialDefinition({
                id: form.id,
                scopeType: form.scopeType,
                scopeId: form.scopeId.trim(),
                mappingKey: form.mappingKey,
                accountId: form.accountId.trim(),
                priority: Number.isFinite(form.priority) ? form.priority : 100,
                isActive: form.isActive,
                validFrom: form.validFrom || null,
                validTo: form.validTo || null,
                branchId: form.branchId.trim() || null,
                documentType: form.documentType.trim() || null,
                lineType: form.lineType.trim() || null,
                taxProfileId: form.taxProfileId.trim() || null,
            });
            await loadData();
            if (saved?.id) {
                setSelectedId(String(saved.id));
            }
            setStatusMessage(t('fd.feedback.saved'));
        } catch (error: any) {
            setStatusMessage(String(error?.messageKey || error?.message || ''));
        }
    }, [api, form, loadData, validateForm]);

    const deleteSelected = useCallback(async (): Promise<void> => {
        if (!selectedId || !api?.deleteFinancialDefinition) return;
        const approved = window.confirm(t('fd.confirm.delete'));
        if (!approved) return;
        try {
            await api.deleteFinancialDefinition(selectedId);
            await loadData();
            setSelectedId('');
            setForm(EMPTY_FORM);
            setStatusMessage(t('fd.feedback.deleted'));
        } catch (error: any) {
            setStatusMessage(String(error?.messageKey || error?.message || ''));
        }
    }, [api, loadData, selectedId]);

    const moveSelection = useCallback((direction: 1 | -1): void => {
        if (!filteredRows.length) return;
        const currentIndex = filteredRows.findIndex((item) => item.id === selectedId);
        const nextIndex = currentIndex < 0 ? 0 : Math.max(0, Math.min(filteredRows.length - 1, currentIndex + direction));
        setSelectedId(filteredRows[nextIndex].id);
    }, [filteredRows, selectedId]);

    useEffect(() => {
        const handler = (event: KeyboardEvent): void => {
            const target = event.target as HTMLElement | null;
            const tag = String(target?.tagName || '').toUpperCase();
            const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            if (event.ctrlKey && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                searchRef.current?.focus();
                searchRef.current?.select();
                return;
            }
            if (event.ctrlKey && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                createNew();
                return;
            }
            if (event.ctrlKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                void saveForm();
                return;
            }
            if (isEditable) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                } else {
                    return;
                }
            }
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
            if (event.key === 'Escape') {
                event.preventDefault();
                if (selectedId) {
                    const selected = rows.find((item) => item.id === selectedId);
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
    }, [moveSelection, rows, saveForm, selectedId]);

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">{t('fd.toolbar.title')}</h1>
                    <p className="text-xs text-slate-500">{t('fd.toolbar.subtitle')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('fd.toolbar.shortcuts')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" className="px-3 py-2 border rounded" onClick={createNew}>
                        {t('fd.toolbar.new')}
                    </button>
                    <button type="button" className="px-3 py-2 border rounded bg-sky-600 text-white" onClick={() => void saveForm()}>
                        {t('fd.toolbar.save')}
                    </button>
                    <button type="button" className="px-3 py-2 border rounded" onClick={() => void deleteSelected()}>
                        {t('fd.toolbar.delete')}
                    </button>
                    <button type="button" className="px-3 py-2 border rounded" onClick={() => void loadData()}>
                        {t('fd.toolbar.refresh')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-7 space-y-2">
                    <div className="grid grid-cols-12 gap-2">
                        <input
                            ref={searchRef}
                            className="col-span-6 border rounded px-2 py-1"
                            placeholder={t('fd.search.placeholder')}
                            value={query.searchText}
                            onChange={(event) => setQuery((prev) => ({ ...prev, searchText: event.target.value }))}
                        />
                        <select
                            className="col-span-3 border rounded px-2 py-1"
                            value={query.scopeType}
                            onChange={(event) => setQuery((prev) => ({ ...prev, scopeType: event.target.value as FinancialDefinitionQueryInput['scopeType'] }))}
                        >
                            {SCOPE_TYPES.map((item) => (
                                <option key={item} value={item}>
                                    {item === 'ALL' ? t('fd.filter.all') : t(`accounting.foundation.enum.${item}`)}
                                </option>
                            ))}
                        </select>
                        <select
                            className="col-span-3 border rounded px-2 py-1"
                            value={query.mappingKey}
                            onChange={(event) => setQuery((prev) => ({ ...prev, mappingKey: event.target.value as FinancialDefinitionQueryInput['mappingKey'] }))}
                        >
                            {MAPPING_KEYS.map((item) => (
                                <option key={item} value={item}>
                                    {item === 'ALL' ? t('fd.filter.all') : t(`accounting.foundation.enum.${item}`)}
                                </option>
                            ))}
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

                    <div className="border rounded overflow-auto max-h-[620px]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100 z-10">
                                <tr>
                                    <th className="text-left p-2">{t('fd.grid.scope')}</th>
                                    <th className="text-left p-2">{t('fd.grid.mapping')}</th>
                                    <th className="text-left p-2">{t('fd.grid.account')}</th>
                                    <th className="text-left p-2">{t('fd.grid.priority')}</th>
                                    <th className="text-left p-2">{t('fd.grid.active')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setSelectedId(item.id)}
                                        className={[
                                            'cursor-pointer border-b',
                                            selectedId === item.id ? 'bg-sky-100' : '',
                                            !item.isActive ? 'opacity-60' : '',
                                        ].join(' ')}
                                    >
                                        <td className="p-2">{`${t(`accounting.foundation.enum.${item.scopeType}`)}:${item.scopeId}`}</td>
                                        <td className="p-2">{t(`accounting.foundation.enum.${item.mappingKey}`)}</td>
                                        <td className="p-2">{accountLabelMap.get(item.accountId) || item.accountId}</td>
                                        <td className="p-2">{item.priority}</td>
                                        <td className="p-2">{item.isActive ? t('coa.status.active') : t('coa.status.inactive')}</td>
                                    </tr>
                                ))}
                                {!filteredRows.length ? (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-slate-500">
                                            {t('fd.grid.empty')}
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-span-5">
                    <FinancialDefinitionsForm
                        form={form}
                        errors={errors}
                        accounts={accounts}
                        onChange={updateForm}
                    />
                </div>
            </div>

            {busy ? <div className="text-xs text-slate-500">{t('fd.toolbar.refresh')}</div> : null}
            {statusMessage ? <div className="text-xs text-slate-600">{statusMessage}</div> : null}
        </div>
    );
}
