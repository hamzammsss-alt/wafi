import React, { useState, useEffect } from 'react';
import { Box, Plus, Settings, Calculator, Edit, Trash2, TrendingDown } from 'lucide-react';

interface FixedAsset {
    id: number;
    code: string;
    name: string;
    type: string;
    category_id?: string;
    purchase_date: string;
    purchase_cost: number;
    salvage_value: number;
    life_years: number;
    depreciation_rate: number;
    accumulated_depreciation: number;
    book_value: number;
    status: string;
    payment_method?: string;
    payment_account_id?: string;
}

export const AssetsRegister: React.FC = () => {
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState<FixedAsset>({
        id: 0,
        code: '',
        name: '',
        type: 'Equipment',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_cost: 0,
        salvage_value: 0,
        life_years: 0,
        depreciation_rate: 0,
        accumulated_depreciation: 0,
        book_value: 0,
        status: 'Active',
        payment_method: 'Bank',
        payment_account_id: ''
    });

    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        loadAssets();
        loadCategories();
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        if (window.electronAPI) {
            // @ts-ignore
            const accs = await window.electronAPI.getAccounts();
            setAccounts(accs);
        }
    };

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

    const loadAssets = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const data = await window.electronAPI.getAssets();
                if (data) {
                    setAssets(data);
                } else {
                    // Mock data if API returns nothing
                    setAssets([
                        {
                            id: 1,
                            code: 'AST001',
                            name: 'سيارة نقل',
                            type: 'Vehicle',
                            purchase_date: '2024-01-01',
                            purchase_cost: 50000,
                            salvage_value: 5000,
                            life_years: 5,
                            depreciation_rate: 20,
                            accumulated_depreciation: 10000,
                            book_value: 40000,
                            status: 'Active'
                        }
                    ]);
                }
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
    };

    const handleSave = async () => {
        try {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                await window.electronAPI.saveAsset(formData);
                alert("تم حفظ الأصل بنجاح");
                setIsEditing(false);
                loadAssets();
            } else {
                // Simulation
                const newAssets = [...assets];
                if (formData.id) {
                    const index = newAssets.findIndex(a => a.id === formData.id);
                    if (index !== -1) newAssets[index] = formData;
                } else {
                    newAssets.push({ ...formData, id: Date.now(), book_value: formData.purchase_cost });
                }
                setAssets(newAssets);
                setIsEditing(false);
            }
        } catch (err: any) { alert(err.message); }
    };

    const calculateDepr = async (asset: any) => {
        // @ts-ignore
        const res = await window.electronAPI.calcDepreciation(asset.id);
        alert(`الإهلاك السنوي: ${res.yearly}\nالإهلاك الشهري: ${res.monthly}`);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans" dir="rtl">
            <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Box className="text-purple-600" /> سجل الأصول الثابتة
                    </h1>
                    <p className="text-sm text-gray-500 mr-8">إدارة الأصول، الإضافات، والاستبعادات</p>
                </div>
                <button
                    onClick={async () => {
                        setIsEditing(true);
                        let nextCode = '';
                        // @ts-ignore
                        if (window.electronAPI && window.electronAPI.getNextAssetCode) {
                            // @ts-ignore
                            nextCode = await window.electronAPI.getNextAssetCode();
                        }

                        setFormData({
                            id: 0,
                            code: nextCode,
                            name: '',
                            type: '', // Reset to force selection
                            purchase_date: new Date().toISOString().split('T')[0],
                            purchase_cost: 0, salvage_value: 0, life_years: 0, depreciation_rate: 0,
                            accumulated_depreciation: 0, book_value: 0, status: 'Active',
                            payment_method: 'Bank', payment_account_id: ''
                        });
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 transition"
                >
                    <Plus size={18} /> أصل جديد
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6 flex gap-6">

                {/* Assets Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                    {assets.map(asset => (
                        <div key={asset.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                                    <Box size={24} />
                                </div>
                                <div className="text-left">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${asset.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {asset.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-1">{asset.name}</h3>
                                    <p className="text-xs text-gray-400 font-mono mb-2">{asset.code}</p>
                                </div>
                                <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">{asset.type}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 my-3 text-sm">
                                <div>
                                    <span className="text-gray-400 block text-xs">تاريخ الشراء</span>
                                    <span className="font-medium text-gray-700">{asset.purchase_date}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-xs">نسبة الإهلاك</span>
                                    <span className="font-medium text-gray-700">{asset.depreciation_rate}%</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg space-y-2 mb-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">تكلفة الشراء</span>
                                    <span className="font-bold">{Number(asset.purchase_cost).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">مجمع الإهلاك</span>
                                    <span className="font-bold text-orange-600">-{Number(asset.accumulated_depreciation).toLocaleString()}</span>
                                </div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                                    <span className="font-bold text-slate-700">صافي القيمة</span>
                                    <span className="font-bold text-green-600">{Number(asset.book_value).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="border-t pt-3 flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => calculateDepr(asset)} className="p-2 text-gray-500 hover:bg-gray-100 hover:text-purple-600 rounded-lg transition" title="احتساب الإهلاك">
                                    <Calculator size={16} />
                                </button>
                                <button onClick={() => { setIsEditing(true); setFormData(asset); }} className="p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition" title="تعديل">
                                    <Edit size={16} />
                                </button>
                                <button className="p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600 rounded-lg transition" title="حذف/استبعاد">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modal Form */}
                {isEditing && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsEditing(false)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    {formData.id ? <Edit size={20} className="text-indigo-600" /> : <Plus size={20} className="text-indigo-600" />}
                                    {formData.id ? 'تعديل بيانات الأصل' : 'إضافة أصل جديد'}
                                </h2>
                                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 hover:bg-red-50">
                                    <Settings className="rotate-45" size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[80vh]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Column 1: Basic Info */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">رمز الأصل</label>
                                            <input
                                                type="text"
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition"
                                                placeholder="مثال: AST-001"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">مجموعة الأصول</label>
                                            <select
                                                value={formData.type}
                                                onChange={e => {
                                                    const selectedCat = categories.find((c: any) => c.code === e.target.value || c.name_ar === e.target.value);
                                                    setFormData({
                                                        ...formData,
                                                        type: e.target.value,
                                                        category_id: selectedCat ? selectedCat.id : null,
                                                        depreciation_rate: selectedCat ? selectedCat.depreciation_rate : formData.depreciation_rate
                                                    });
                                                }}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition"
                                            >
                                                <option value="">اختر المجموعة...</option>
                                                {categories.map((cat: any) => (
                                                    <option key={cat.id} value={cat.name_ar}>{cat.name_ar}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">اسم الأصل</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition"
                                                placeholder="اسم الأصل كاملاً"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">تاريخ الشراء / الإضافة</label>
                                            <input
                                                type="date"
                                                value={formData.purchase_date}
                                                onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition"
                                            />
                                        </div>
                                    </div>

                                    {/* Column 2: Financials */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1.5">تكلفة الشراء</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={formData.purchase_cost}
                                                        onChange={e => setFormData({ ...formData, purchase_cost: Number(e.target.value) })}
                                                        className="w-full border border-gray-300 rounded-lg pl-3 pr-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none transition"
                                                    />
                                                    <span className="absolute left-3 top-2 text-gray-400 text-xs">ILS</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1.5">قيمة الخردة</label>
                                                <input
                                                    type="number"
                                                    value={formData.salvage_value}
                                                    onChange={e => setFormData({ ...formData, salvage_value: Number(e.target.value) })}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3">
                                            <h3 className="text-sm font-bold text-purple-900 border-b border-purple-200 pb-2 mb-2 flex items-center gap-2">
                                                <Calculator size={16} />
                                                إعدادات الإهلاك
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-purple-700 mb-1">العمر (سنوات)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.life_years}
                                                        onChange={e => {
                                                            const years = Number(e.target.value);
                                                            setFormData({ ...formData, life_years: years, depreciation_rate: years > 0 ? Number((100 / years).toFixed(2)) : 0 });
                                                        }}
                                                        className="w-full border border-purple-200 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-purple-700 mb-1">نسبة الإهلاك %</label>
                                                    <input
                                                        type="number"
                                                        value={formData.depreciation_rate}
                                                        onChange={e => setFormData({ ...formData, depreciation_rate: Number(e.target.value) })}
                                                        className="w-full border border-purple-200 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                                            <h3 className="text-sm font-bold text-blue-900 border-b border-blue-200 pb-2 mb-2 flex items-center gap-2">
                                                تفاصيل الدفع (GL Integration)
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-700 mb-1">طريقة الدفع</label>
                                                    <select
                                                        value={formData.payment_method}
                                                        onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                                                        className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="Cash">نقد (Cash)</option>
                                                        <option value="Bank">بنك (Bank)</option>
                                                        <option value="Credit">آجل (Credit)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-700 mb-1">حساب الدفع</label>
                                                    <select
                                                        value={formData.payment_account_id || ''}
                                                        onChange={e => setFormData({ ...formData, payment_account_id: e.target.value })}
                                                        className="w-full border border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="">اختر الحساب...</option>
                                                        {accounts.map((acc: any) => (
                                                            <option key={acc.id} value={acc.id}>
                                                                {acc.account_code || acc.code} - {acc.name_ar || acc.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">الحالة</label>
                                            <select
                                                value={formData.status}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition"
                                            >
                                                <option value="Active">نشط (Active)</option>
                                                <option value="Sold">مباع (Sold)</option>
                                                <option value="Disposed">مستبعد (Disposed)</option>
                                                <option value="Fully Depreciated">مهلك بالكامل</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 hover:text-gray-800 transition-all shadow-sm"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    <TrendingDown className="rotate-180" size={18} />
                                    حفظ الأصل
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
