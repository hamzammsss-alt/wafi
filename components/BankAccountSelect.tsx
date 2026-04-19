import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';

interface BankAccount {
    id: string;
    bank_name: string;
    branch_name?: string;
    account_name?: string;
    account_number: string;
    currency_id: string;
    gl_account_id?: string;
    gl_account_name?: string;
    sub_account_id?: string;
    sub_account_code?: string;
    sub_account_name?: string;
    is_active: number;
}

interface BankAccountSelectProps {
    value?: string; // bank_account_id
    onChange: (account: BankAccount | null) => void;
    currencyId?: string; // Optional filter
    className?: string;
    placeholder?: string;
    error?: boolean;
}

export const BankAccountSelect: React.FC<BankAccountSelectProps> = ({
    value,
    onChange,
    currencyId,
    className = "",
    placeholder = "اختر الحساب البنكي...",
    error = false
}) => {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const list = await window.electronAPI.masterData.getBankAccounts();
                if (list) {
                    setAccounts(list.filter((a: any) => a.is_active));
                }
            }
        } catch (e) {
            console.error("Failed to load bank accounts", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = currencyId
        ? accounts.filter(a => a.currency_id === currencyId)
        : accounts;

    const selectedAccount = accounts.find(a => a.id === value);

    return (
        <div className={`relative ${className}`}>
            <div
                onClick={() => !loading && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-2.5 bg-white border rounded-lg cursor-pointer transition-all
                    ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200 hover:border-indigo-300'}
                    ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-500' : ''}
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`p-1.5 rounded-md ${selectedAccount ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Building2 size={18} />
                    </div>
                    {selectedAccount ? (
                        <div className="flex flex-col items-start truncate">
                            <span className="text-sm font-bold text-gray-900 truncate">{selectedAccount.bank_name} - {selectedAccount.account_number}</span>
                            <span className="text-xs text-gray-500 font-mono">{selectedAccount.currency_id}</span>
                        </div>
                    ) : (
                        <span className="text-sm text-gray-400">{loading ? 'جاري التحميل...' : placeholder}</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1">
                        {filteredAccounts.length > 0 ? filteredAccounts.map(acc => (
                            <div
                                key={acc.id}
                                onClick={() => {
                                    onChange(acc);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
                                    ${acc.id === value ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`text-xs font-bold px-1.5 py-0.5 rounded border ${acc.id === value ? 'bg-white border-indigo-200' : 'bg-gray-100 border-gray-200'}`}>
                                        {acc.currency_id}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{acc.bank_name}</span>
                                        <span className="text-xs opacity-70 font-mono">{acc.account_number}</span>
                                    </div>
                                </div>
                                {acc.id === value && <Check size={16} />}
                            </div>
                        )) : (
                            <div className="p-4 text-center text-gray-400 text-sm">
                                {currencyId ? `لا توجد حسابات بعملة ${currencyId}` : 'لا توجد حسابات'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Backdrop to close */}
            {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
        </div>
    );
};
