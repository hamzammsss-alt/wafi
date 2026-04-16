import React from 'react';
import { tAccountingModule as t } from './accounting.i18n';
import { AccountFormErrors, AccountFormModel, AccountRowDto, AccountType, CurrencyBehavior, ScopeType, AccountReferenceType } from './accounting.types';

interface AccountFormProps {
    form: AccountFormModel;
    errors: AccountFormErrors;
    parentOptions: AccountRowDto[];
    firstFieldRef: React.RefObject<HTMLInputElement | null>;
    onChange: (patch: Partial<AccountFormModel>) => void;
}

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const ACCOUNT_SUBTYPES: string[] = [
    'GENERAL',
    'CASH',
    'BANK',
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

const SUBTYPES_BY_TYPE: Record<AccountType, string[]> = {
    ASSET: ['GENERAL', 'CASH', 'BANK', 'RECEIVABLE', 'INVENTORY', 'TAX_RECEIVABLE', 'DISCOUNT', 'ROUNDING'],
    LIABILITY: ['GENERAL', 'PAYABLE', 'TAX_PAYABLE', 'DISCOUNT', 'ROUNDING'],
    EQUITY: ['GENERAL', 'ROUNDING'],
    REVENUE: ['GENERAL', 'REVENUE', 'DISCOUNT', 'ROUNDING'],
    EXPENSE: ['GENERAL', 'EXPENSE', 'COGS', 'DISCOUNT', 'ROUNDING'],
};

const REFERENCE_HINT_BY_SUBTYPE: Record<string, string> = {
    BANK: 'المرجع: رقم مرجع الشيك/الحوالة البنكية',
    RECEIVABLE: 'المرجع: دليل العملاء/الزبائن',
    PAYABLE: 'المرجع: دليل الموردين/الشركاء',
    CASH: 'المرجع: سندات الصندوق أو رقم مستند داخلي',
};

const ACCOUNT_REFERENCE_TYPES: AccountReferenceType[] = ['NONE', 'USER', 'GUIDE', 'BANK_CHEQUE', 'FIXED_ASSET'];

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

export function AccountForm(props: AccountFormProps) {
    const { form, errors, parentOptions, firstFieldRef, onChange } = props;
    const showError = (key: keyof AccountFormErrors): string => errors[key] || '';
    const inputClass = (key?: keyof AccountFormErrors) => {
        const hasError = key ? Boolean(showError(key)) : false;
        return `border rounded px-2 py-1 ${hasError ? 'border-red-500 bg-red-50' : 'border-slate-300'}`;
    };
    const allowedSubtypes = SUBTYPES_BY_TYPE[form.accountType] || ACCOUNT_SUBTYPES;
    const isFixedCurrency = form.currencyBehavior === 'FIXED_CURRENCY';
    const referenceHint = REFERENCE_HINT_BY_SUBTYPE[form.accountSubtype] || 'المرجع: يعتمد على نوع الحساب وتعريفات المستندات';

    return (
        <form className="border rounded p-3 grid grid-cols-2 gap-2 text-sm" onKeyDown={moveFocusForward}>
            <h2 className="col-span-2 text-base font-semibold">{t('coa.form.title')}</h2>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.account_code')}</span>
                <input
                    ref={firstFieldRef}
                    className={inputClass('accountCode')}
                    value={form.accountCode}
                    onChange={(event) => onChange({ accountCode: event.target.value })}
                />
                {showError('accountCode') ? <span className="text-xs text-red-600">{showError('accountCode')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.name')}</span>
                <input
                    className={inputClass('name')}
                    value={form.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                />
                {showError('name') ? <span className="text-xs text-red-600">{showError('name')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.parent')}</span>
                <select
                    className={inputClass('parentId')}
                    value={form.parentId || ''}
                    onChange={(event) => onChange({ parentId: event.target.value || null })}
                >
                    <option value="">{t('coa.form.parent.none')}</option>
                    {parentOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.accountCode} - {item.name}
                        </option>
                    ))}
                </select>
                {showError('parentId') ? <span className="text-xs text-red-600">{showError('parentId')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.account_type')}</span>
                <select
                    className={inputClass('accountType')}
                    value={form.accountType}
                    onChange={(event) => onChange({ accountType: event.target.value as AccountType })}
                >
                    {ACCOUNT_TYPES.map((item) => (
                        <option key={item} value={item}>
                            {t(`accounting.foundation.enum.${item}`)}
                        </option>
                    ))}
                </select>
                {showError('accountType') ? <span className="text-xs text-red-600">{showError('accountType')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.account_subtype')}</span>
                <select
                    className={inputClass('accountSubtype')}
                    value={form.accountSubtype}
                    onChange={(event) => onChange({ accountSubtype: event.target.value })}
                >
                    {allowedSubtypes.map((item) => (
                        <option key={item} value={item}>
                            {t(`accounting.foundation.enum.${item}`)}
                        </option>
                    ))}
                </select>
                {showError('accountSubtype') ? <span className="text-xs text-red-600">{showError('accountSubtype')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.currency_behavior')}</span>
                <select
                    className={inputClass()}
                    value={form.currencyBehavior}
                    onChange={(event) => onChange({ currencyBehavior: event.target.value as CurrencyBehavior })}
                >
                    <option value="BASE_ONLY">{t('accounting.foundation.enum.BASE_ONLY')}</option>
                    <option value="FIXED_CURRENCY">{t('accounting.foundation.enum.FIXED_CURRENCY')}</option>
                    <option value="MULTI_CURRENCY">{t('accounting.foundation.enum.MULTI_CURRENCY')}</option>
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <span>نوع المرجع</span>
                <select
                    className={inputClass()}
                    value={form.referenceType}
                    onChange={(event) => onChange({ referenceType: event.target.value as AccountReferenceType })}
                >
                    {ACCOUNT_REFERENCE_TYPES.map((item) => (
                        <option key={item} value={item}>
                            {t(`accounting.foundation.enum.${item}`)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.currency_code')}</span>
                <input
                    className={inputClass('currencyCode')}
                    value={form.currencyCode}
                    disabled={!isFixedCurrency}
                    onChange={(event) => onChange({ currencyCode: event.target.value.toUpperCase() })}
                />
                {showError('currencyCode') ? <span className="text-xs text-red-600">{showError('currencyCode')}</span> : null}
            </label>

            <div className="col-span-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                {referenceHint}
            </div>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.scope_type')}</span>
                <select
                    className={inputClass()}
                    value={form.scopeType}
                    onChange={(event) => onChange({ scopeType: event.target.value as ScopeType })}
                >
                    <option value="COMPANY">{t('accounting.foundation.enum.COMPANY')}</option>
                    <option value="BRANCH">{t('accounting.foundation.enum.BRANCH')}</option>
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.branch_id')}</span>
                <input
                    className={inputClass('branchId')}
                    value={form.branchId}
                    onChange={(event) => onChange({ branchId: event.target.value })}
                />
                {showError('branchId') ? <span className="text-xs text-red-600">{showError('branchId')}</span> : null}
            </label>

            <label className="flex flex-col gap-1">
                <span>{t('coa.form.status')}</span>
                <select
                    className={inputClass()}
                    value={form.status}
                    onChange={(event) => onChange({ status: event.target.value as 'ACTIVE' | 'INACTIVE' })}
                >
                    <option value="ACTIVE">{t('coa.status.active')}</option>
                    <option value="INACTIVE">{t('coa.status.inactive')}</option>
                </select>
            </label>

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={form.postingAllowed}
                    onChange={(event) => onChange({ postingAllowed: event.target.checked })}
                />
                <span>{t('coa.form.posting_allowed')}</span>
            </label>

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={form.requiresCostCenter}
                    onChange={(event) => onChange({ requiresCostCenter: event.target.checked })}
                />
                <span>{t('coa.form.requires_cost_center')}</span>
            </label>

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={form.requiresAnalysisCode}
                    onChange={(event) => onChange({ requiresAnalysisCode: event.target.checked })}
                />
                <span>{t('coa.form.requires_analysis_code')}</span>
            </label>
        </form>
    );
}

