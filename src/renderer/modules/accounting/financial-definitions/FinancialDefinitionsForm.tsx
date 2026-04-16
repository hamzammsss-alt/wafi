import React from 'react';
import { tAccountingModule as t } from '../chart-of-accounts/accounting.i18n';
import { FinancialDefinitionAccountPicker } from './FinancialDefinitionAccountPicker';
import {
    AccountMappingKey,
    FinancialDefinitionErrors,
    FinancialDefinitionFormModel,
    FinancialScopeType,
    PostableAccountOption,
} from './financialDefinitions.types';

interface FinancialDefinitionsFormProps {
    form: FinancialDefinitionFormModel;
    errors: FinancialDefinitionErrors;
    accounts: PostableAccountOption[];
    onChange: (patch: Partial<FinancialDefinitionFormModel>) => void;
}

const SCOPE_TYPES: FinancialScopeType[] = ['COMPANY', 'BRANCH', 'ITEM', 'ITEM_GROUP', 'WAREHOUSE', 'PARTNER'];
const MAPPING_KEYS: AccountMappingKey[] = [
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

function moveFocusForward(event: React.KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    const target = event.target as HTMLElement;
    const form = target.closest('form');
    if (!form) return;
    event.preventDefault();
    const focusable = Array.from(
        form.querySelectorAll<HTMLElement>('input,select,textarea,button,[tabindex]:not([tabindex="-1"])'),
    ).filter((item) => !item.hasAttribute('disabled'));
    const index = focusable.indexOf(target);
    if (index >= 0 && index + 1 < focusable.length) {
        focusable[index + 1].focus();
    }
}

export function FinancialDefinitionsForm(props: FinancialDefinitionsFormProps) {
    const { form, errors, accounts, onChange } = props;
    const errorOf = (key: keyof FinancialDefinitionErrors) => errors[key] || '';

    return (
        <form className="border rounded p-3 grid grid-cols-2 gap-2 text-sm" onKeyDown={moveFocusForward}>
            <h2 className="col-span-2 text-base font-semibold">{t('fd.form.title')}</h2>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.scope_type')}</span>
                <select
                    className="border rounded px-2 py-1"
                    value={form.scopeType}
                    onChange={(event) => onChange({ scopeType: event.target.value as FinancialScopeType })}
                >
                    {SCOPE_TYPES.map((item) => (
                        <option key={item} value={item}>
                            {t(`accounting.foundation.enum.${item}`)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.scope_id')}</span>
                <input
                    className="border rounded px-2 py-1"
                    value={form.scopeId}
                    onChange={(event) => onChange({ scopeId: event.target.value })}
                />
                {errorOf('scopeId') ? <span className="text-xs text-red-600">{errorOf('scopeId')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.branch_id')}</span>
                <input
                    className="border rounded px-2 py-1"
                    value={form.branchId}
                    onChange={(event) => onChange({ branchId: event.target.value })}
                />
                {errorOf('branchId') ? <span className="text-xs text-red-600">{errorOf('branchId')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.mapping_key')}</span>
                <select
                    className="border rounded px-2 py-1"
                    value={form.mappingKey}
                    onChange={(event) => onChange({ mappingKey: event.target.value as AccountMappingKey })}
                >
                    {MAPPING_KEYS.map((item) => (
                        <option key={item} value={item}>
                            {t(`accounting.foundation.enum.${item}`)}
                        </option>
                    ))}
                </select>
                {errorOf('mappingKey') ? <span className="text-xs text-red-600">{errorOf('mappingKey')}</span> : null}
            </label>

            <label className="flex flex-col gap-1 col-span-2">
                <span>{t('fd.form.account')}</span>
                <FinancialDefinitionAccountPicker
                    accounts={accounts}
                    value={form.accountId}
                    onChange={(accountId) => onChange({ accountId })}
                />
                {errorOf('accountId') ? <span className="text-xs text-red-600">{errorOf('accountId')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.priority')}</span>
                <input
                    type="number"
                    className="border rounded px-2 py-1"
                    value={form.priority}
                    onChange={(event) => onChange({ priority: Number(event.target.value || 0) })}
                />
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.valid_from')}</span>
                <input
                    type="date"
                    className="border rounded px-2 py-1"
                    value={form.validFrom}
                    onChange={(event) => onChange({ validFrom: event.target.value })}
                />
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.valid_to')}</span>
                <input
                    type="date"
                    className="border rounded px-2 py-1"
                    value={form.validTo}
                    onChange={(event) => onChange({ validTo: event.target.value })}
                />
                {errorOf('validRange') ? <span className="text-xs text-red-600">{errorOf('validRange')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.document_type')}</span>
                <input
                    className="border rounded px-2 py-1"
                    value={form.documentType}
                    onChange={(event) => onChange({ documentType: event.target.value.toUpperCase() })}
                />
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.line_type')}</span>
                <input
                    className="border rounded px-2 py-1"
                    value={form.lineType}
                    onChange={(event) => onChange({ lineType: event.target.value.toUpperCase() })}
                />
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('fd.form.tax_profile_id')}</span>
                <input
                    className="border rounded px-2 py-1"
                    value={form.taxProfileId}
                    onChange={(event) => onChange({ taxProfileId: event.target.value.toUpperCase() })}
                />
            </label>

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => onChange({ isActive: event.target.checked })}
                />
                <span>{t('fd.form.is_active')}</span>
            </label>
        </form>
    );
}

