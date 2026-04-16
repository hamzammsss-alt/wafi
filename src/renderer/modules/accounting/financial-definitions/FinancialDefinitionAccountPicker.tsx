import React, { useMemo, useState } from 'react';
import { tAccountingModule as t } from '../chart-of-accounts/accounting.i18n';
import { PostableAccountOption } from './financialDefinitions.types';

interface FinancialDefinitionAccountPickerProps {
    accounts: PostableAccountOption[];
    value: string;
    onChange: (accountId: string) => void;
}

export function FinancialDefinitionAccountPicker(props: FinancialDefinitionAccountPickerProps) {
    const { accounts, value, onChange } = props;
    const [searchText, setSearchText] = useState<string>('');

    const filtered = useMemo(() => {
        const keyword = searchText.trim().toUpperCase();
        if (!keyword) return accounts;
        return accounts.filter((item) =>
            `${item.accountCode} ${item.name}`.toUpperCase().includes(keyword),
        );
    }, [accounts, searchText]);

    return (
        <div className="space-y-1">
            <input
                className="w-full border rounded px-2 py-1"
                placeholder={t('fd.form.account_search')}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
            />
            <select
                className="w-full border rounded px-2 py-1"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value="">{t('fd.form.account_none')}</option>
                {filtered.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.accountCode} - {item.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

