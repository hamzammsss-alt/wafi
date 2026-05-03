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

function normalizeAccountCodeInput(value: string): string {
    return String(value || '')
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/\D+/g, '');
}

function shouldAllowAccountCodeKey(event: React.KeyboardEvent<HTMLInputElement>): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    const allowedKeys = new Set([
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
    ]);
    if (allowedKeys.has(event.key)) return true;
    return /[0-9٠-٩۰-۹]/.test(event.key);
}

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
        return `h-11 rounded-xl border bg-white px-3 text-sm outline-none transition focus:ring-2 ${hasError ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-sky-400 focus:ring-sky-100'} disabled:bg-slate-50 disabled:text-slate-400`;
    };
    const allowedSubtypes = SUBTYPES_BY_TYPE[form.accountType] || ACCOUNT_SUBTYPES;
    const isFixedCurrency = form.currencyBehavior === 'FIXED_CURRENCY';
    const referenceHint = REFERENCE_HINT_BY_SUBTYPE[form.accountSubtype] || 'المرجع: يعتمد على نوع الحساب وتعريفات المستندات';

    return (
        <form className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm md:grid-cols-2" onKeyDown={moveFocusForward}>
            <h2 className="text-base font-extrabold text-slate-900 md:col-span-2">{t('coa.form.title')}</h2>

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
                <span>{t('coa.form.account_code')}</span>
                <input
                    ref={firstFieldRef}
                    className={inputClass('accountCode')}
                    value={form.accountCode}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    dir="ltr"
                    onKeyDown={(event) => {
                        if (!shouldAllowAccountCodeKey(event)) {
                            event.preventDefault();
                        }
                    }}
                    onPaste={(event) => {
                        event.preventDefault();
                        const pasted = event.clipboardData.getData('text');
                        onChange({ accountCode: normalizeAccountCodeInput(pasted) });
                    }}
                    onChange={(event) => onChange({ accountCode: normalizeAccountCodeInput(event.target.value) })}
                />
                {showError('accountCode') ? <span className="text-xs text-red-600">{showError('accountCode')}</span> : null}
            </label>

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
                <span>{t('coa.form.name')}</span>
                <input
                    className={inputClass('name')}
                    value={form.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                />
                {showError('name') ? <span className="text-xs text-red-600">{showError('name')}</span> : null}
            </label>

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
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

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
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

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
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

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
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

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
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

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
                <span>{t('coa.form.currency_code')}</span>
                <input
                    className={inputClass('currencyCode')}
                    value={form.currencyCode}
                    disabled={!isFixedCurrency}
                    onChange={(event) => onChange({ currencyCode: event.target.value.toUpperCase() })}
                />
                {showError('currencyCode') ? <span className="text-xs text-red-600">{showError('currencyCode')}</span> : null}
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-6 text-slate-600 md:col-span-2">
                {referenceHint}
            </div>

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
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

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
                <span>{t('coa.form.branch_id')}</span>
                <input
                    className={inputClass('branchId')}
                    value={form.branchId}
                    onChange={(event) => onChange({ branchId: event.target.value })}
                />
                {showError('branchId') ? <span className="text-xs text-red-600">{showError('branchId')}</span> : null}
            </label>

            <label className="flex flex-col gap-1.5 font-bold text-slate-700">
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

            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-700">
                <input
                    type="checkbox"
                    checked={form.postingAllowed}
                    onChange={(event) => onChange({ postingAllowed: event.target.checked })}
                />
                <span>{t('coa.form.posting_allowed')}</span>
            </label>

            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-700">
                <input
                    type="checkbox"
                    checked={form.requiresCostCenter}
                    onChange={(event) => onChange({ requiresCostCenter: event.target.checked })}
                />
                <span>{t('coa.form.requires_cost_center')}</span>
            </label>

            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-700 md:col-span-2">
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
