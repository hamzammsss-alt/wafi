import React, { useState } from 'react';
import { Layers, Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { Account } from '../../../types';

interface AssetCategory {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    depreciation_method: string;
    depreciation_rate: number;
    asset_account_id?: string;
    accumulated_depreciation_account_id?: string;
    depreciation_expense_account_id?: string;
}

export const AssetCategories = () => {
    const [categories, setCategories] = useState<AssetCategory[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<AssetCategory | null>(null);

    const [formData, setFormData] = useState<Partial<AssetCategory>>({
        code: '', name_ar: '', name_en: '', depreciation_method: 'Straight Line', depreciation_rate: 0
    });

    React.useEffect(() => {
        loadCategories();
        loadAccounts();
    }, []);

    const loadCategories = async () => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.getAssetCategories) {
            try {
                // @ts-ignore
                const data = await window.electronAPI.getAssetCategories();
                setCategories(data);
            } catch (error) {
                console.error("Failed to load categories", error);
            }
        }
    };

    const loadAccounts = async () => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.getAccounts) {
            try {
                // @ts-ignore
                const data = await window.electronAPI.getAccounts();
                setAccounts(data);
            } catch (error) {
                console.error("Failed to load accounts", error);
            }
        }
    };

    const handleSave = async () => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.saveAssetCategory) {
            try {
                let dataToSave = { ...formData };
                if (editingItem) {
                    dataToSave = { ...dataToSave, id: editingItem.id };
                }
                // @ts-ignore
                const result = await window.electronAPI.saveAssetCategory(dataToSave);
                if (result.success) {
                    await loadCategories();
                    setShowModal(false);
                    setEditingItem(null);
                    setFormData({ code: '', name_ar: '', name_en: '', depreciation_method: 'Straight Line', depreciation_rate: 0 });
                }
            } catch (error) {
                console.error("Failed to save category", error);
                alert("فشل حفظ المجموعة");
            }
        }
    };

    const handleEdit = (item: AssetCategory) => {
        setEditingItem(item);
        setFormData(item);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('هل أنت متأكد من الحذف؟')) {
            setCategories(prev => prev.filter(c => c.id !== id));
        }
    };

    const filtered = categories.filter(c => c.name_ar.includes(searchTerm) || c.code.includes(searchTerm));

    // Helper to filter accounts for dropdowns
    // Use lower case check for safety
    // Helper to filter accounts for dropdowns
    // Use lower case check for safety
    const assetAccounts = accounts.filter(a => ((a as any).account_type || (a as any).type || '').toLowerCase() === 'asset');
    const expenseAccounts = accounts.filter(a => ((a as any).account_type || (a as any).type || '').toLowerCase() === 'expense');
    const liabilityAccounts = accounts.filter(a => {
        const type = ((a as any).account_type || (a as any).type || '').toLowerCase();
        return type === 'liability' || type === 'asset'; // Acc Dep is usually Contra-Asset (so Asset) or Liability
    });

    const handleNewGroup = () => {
        setEditingItem(null);
        // Auto-generate code
        let nextCode = 'GRP-001';
        if (categories.length > 0) {
            const codes = categories.map(c => parseInt(c.code.replace(/\D/g, '')) || 0);
            const max = Math.max(...codes);
            nextCode = `GRP-${String(max + 1).padStart(3, '0')}`;
        }
        setFormData({
            code: nextCode,
            name_ar: '',
            name_en: '',
            depreciation_method: 'Straight Line',
            depreciation_rate: 0,
            asset_account_id: '',
            accumulated_depreciation_account_id: '',
            depreciation_expense_account_id: ''
        });
        setShowModal(true);
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Layers className="text-indigo-600" size={32} />
                            مجموعات الأصول الثابتة
                        </h1>
                        <p className="text-gray-500 mt-2">تعريف وتصنيف الأصول الثابتة ونسب الإهلاك</p>
                    </div>
                    <button
                        onClick={handleNewGroup}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold shadow-sm"
                    >
                        <Plus size={20} />
                        مجموعة جديدة
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="بحث عن مجموعة..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الرمز</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الاسم بالعربية</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الاسم بالإنجليزية</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">طريقة الإهلاك</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">نسبة الإهلاك %</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-gray-600 font-bold">{item.code}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.name_ar}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.name_en}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{item.depreciation_method === 'Straight Line' ? 'القسط الثابت' : item.depreciation_method}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-bold">{item.depreciation_rate}%</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEdit(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            لا توجد بيانات
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingItem ? 'تعديل المجموعة' : 'مجموعة جديدة'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الرمز</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الإهلاك %</label>
                                    <input
                                        type="number"
                                        value={formData.depreciation_rate}
                                        onChange={e => setFormData({ ...formData, depreciation_rate: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية</label>
                                <input
                                    type="text"
                                    value={formData.name_ar}
                                    onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية</label>
                                <input
                                    type="text"
                                    value={formData.name_en}
                                    onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الإهلاك</label>
                                <select
                                    value={formData.depreciation_method}
                                    onChange={e => setFormData({ ...formData, depreciation_method: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Straight Line">القسط الثابت</option>
                                    <option value="Declining Balance">القسط المتناقص</option>
                                </select>
                            </div>

                            {/* Account Mapping Section */}
                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Layers size={16} className="text-indigo-600" />
                                    ربط الحسابات (دليل الحسابات)
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">حساب الأصل (التكلفة)</label>
                                        <select
                                            value={formData.asset_account_id || ''}
                                            onChange={e => setFormData({ ...formData, asset_account_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        >
                                            <option value="">اختر الحساب...</option>
                                            {assetAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">حساب مجمع الإهلاك</label>
                                        <select
                                            value={formData.accumulated_depreciation_account_id || ''}
                                            onChange={e => setFormData({ ...formData, accumulated_depreciation_account_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        >
                                            <option value="">اختر الحساب...</option>
                                            {liabilityAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">حساب مصروف الإهلاك</label>
                                        <select
                                            value={formData.depreciation_expense_account_id || ''}
                                            onChange={e => setFormData({ ...formData, depreciation_expense_account_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        >
                                            <option value="">اختر الحساب...</option>
                                            {expenseAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                                حفظ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
