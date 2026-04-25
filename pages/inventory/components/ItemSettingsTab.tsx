import React, { useState, useEffect } from 'react';
import { Item, Account } from '../../../types';
import { AccountPicker } from '../../../components/AccountPicker';

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

const ItemSettingsTab: React.FC<Props> = ({ data, onChange }) => {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeField, setActiveField] = useState<'sales' | 'cogs' | 'inventory' | null>(null);
    const [displayAccounts, setDisplayAccounts] = useState({
        sales: '',
        cogs: '',
        inventory: ''
    });

    useEffect(() => {
        window.electronAPI.inventory.getWarehouses?.().then(setWarehouses);
        window.electronAPI.getAccounts?.().then((rows: Account[]) => setAccounts(rows || []));
    }, []);

    const formatAccountDisplay = (accountId?: string | null) => {
        const account = accounts.find((item) => item.id === accountId);
        if (!account) return accountId || '';
        const code = String(account.account_code || account.code || '').trim();
        const name = String(account.name_ar || account.name || '').trim();
        return [code, name].filter(Boolean).join(' - ');
    };

    const openPicker = (field: 'sales' | 'cogs' | 'inventory') => {
        setActiveField(field);
        setPickerOpen(true);
    };

    const handleAccountSelect = (account: Account) => {
        if (!activeField) return;

        const fieldMap: Record<string, keyof Item> = {
            'sales': 'sales_account_id' as any, // Cast to any to avoid strict keyof check issues if types mismatch temporarily
            'cogs': 'cogs_account_id' as any,
            'inventory': 'inventory_account_id' as any
        };

        const targetField = fieldMap[activeField];
        if (targetField) {
            onChange({ ...data, [targetField]: account.id });
        }

        const code = String(account.account_code || account.code || '').trim();
        const name = String(account.name_ar || account.name || '').trim();
        setDisplayAccounts(prev => ({ ...prev, [activeField]: [code, name].filter(Boolean).join(' - ') }));
        setPickerOpen(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
            {/* Left Column: Stock Settings */}
            <div className="space-y-4">
                <div className="space-y-4 mb-6">
                    <h3 className="font-bold border-b pb-2">إعدادات التكلفة</h3>
                    <div>
                        <label className="block text-sm font-medium mb-1">طريقة التكلفة (Costing Method)</label>
                        <select
                            value={data.costing_method || 'WEIGHTED_AVG'}
                            onChange={e => onChange({ ...data, costing_method: e.target.value as any })}
                            className="w-full border rounded p-2 bg-white"
                        >
                            <option value="WEIGHTED_AVG">متوسط مرجح (Weighted Avg)</option>
                            <option value="FIFO">وارد أولاً صادر أولاً (FIFO)</option>
                            <option value="STANDARD">تكلفة معيارية (Standard)</option>
                        </select>
                    </div>
                    {data.costing_method === 'STANDARD' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">التكلفة المعيارية (Standard Cost)</label>
                            <input
                                type="number"
                                value={data.standard_cost || 0}
                                onChange={e => onChange({ ...data, standard_cost: parseFloat(e.target.value) })}
                                className="w-full border rounded p-2"
                            />
                        </div>
                    )}
                </div>

                <h3 className="font-bold border-b pb-2">حدود المخزون</h3>
                <div>
                    <label className="block text-sm font-medium mb-1">الحد الأدنى (Min Stock)</label>
                    <input
                        type="number"
                        value={data.min_stock || 0}
                        onChange={e => onChange({ ...data, min_stock: parseFloat(e.target.value) })}
                        className="w-full border rounded p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">حد إعادة الطلب (Reorder Point)</label>
                    <input
                        type="number"
                        value={data.reorder_point || 0}
                        onChange={e => onChange({ ...data, reorder_point: parseFloat(e.target.value) })}
                        className="w-full border rounded p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">الحد الأقصى (Max Stock)</label>
                    <input
                        type="number"
                        value={data.max_stock || 0}
                        onChange={e => onChange({ ...data, max_stock: parseFloat(e.target.value) })}
                        className="w-full border rounded p-2"
                    />
                </div>

                <div className="pt-4">
                    <label className="block text-sm font-medium mb-1">المستودع الافتراضي (Default Warehouse)</label>
                    <select
                        value={data.default_warehouse_id || ''}
                        onChange={e => onChange({ ...data, default_warehouse_id: e.target.value })}
                        className="w-full border rounded p-2 bg-white"
                    >
                        <option value="">-- اختر مستودع --</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Right Column: Financial Accounts */}
            <div className="space-y-4">
                <h3 className="font-bold border-b pb-2">الحسابات المالية (GL Accounts)</h3>

                <div>
                    <label className="block text-sm font-medium mb-1">حساب المخزون (Inventory Asset)</label>
                    <div className="flex space-x-2 space-x-reverse">
                        <input
                            type="text"
                            readOnly
                            value={displayAccounts.inventory || formatAccountDisplay((data as any).inventory_account_id) || ''}
                            className="flex-1 border rounded p-2 bg-gray-50"
                            placeholder="اضغط للاختيار..."
                            onClick={() => openPicker('inventory')}
                        />
                        <button onClick={() => openPicker('inventory')} className="text-gray-500 hover:text-blue-600">
                            🔍
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">حساب الإيرادات (Sales Revenue)</label>
                    <div className="flex space-x-2 space-x-reverse">
                        <input
                            type="text"
                            readOnly
                            value={displayAccounts.sales || formatAccountDisplay((data as any).sales_account_id) || ''}
                            className="flex-1 border rounded p-2 bg-gray-50"
                            placeholder="اضغط للاختيار..."
                            onClick={() => openPicker('sales')}
                        />
                        <button onClick={() => openPicker('sales')} className="text-gray-500 hover:text-blue-600">
                            🔍
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">حساب التكلفة (COGS)</label>
                    <div className="flex space-x-2 space-x-reverse">
                        <input
                            type="text"
                            readOnly
                            value={displayAccounts.cogs || formatAccountDisplay((data as any).cogs_account_id) || ''}
                            className="flex-1 border rounded p-2 bg-gray-50"
                            placeholder="اضغط للاختيار..."
                            onClick={() => openPicker('cogs')}
                        />
                        <button onClick={() => openPicker('cogs')} className="text-gray-500 hover:text-blue-600">
                            🔍
                        </button>
                    </div>
                </div>
            </div>

            {pickerOpen && (
                <AccountPicker
                    isOpen={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    onSelect={handleAccountSelect}
                    showTransactionalOnly={true}
                />
            )}
        </div>
    );
};

export default ItemSettingsTab;
