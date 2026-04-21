import React, { useState, useEffect } from 'react';
import { Settings, Save, Percent, Loader2, Landmark, Box } from 'lucide-react';

export const SystemSettings = () => {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const [settingsData, fetchedAccounts] = await Promise.all([
                window.electronAPI.settings.getSettings(),
                window.electronAPI.getAccounts()
            ]);
            
            const settingsMap: Record<string, string> = {};
            settingsData.forEach((item: any) => {
                settingsMap[item.key] = item.value;
            });
            setSettings(settingsMap);
            
            // جلب الحسابات الفرعية (التي تقبل حركات) فقط لاستخدامها في القوائم المنسدلة
            setAccounts(fetchedAccounts?.filter((a: any) => a.is_transactional === 1) || []);
        } catch (error) {
            console.error("Failed to load initial data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (key: string, value: string) => {
        setSaving(true);
        try {
            // @ts-ignore
            await window.electronAPI.settings.saveSetting(key, value);
            // إضافة إشعار نجاح هنا إذا أردت
        } catch (error) {
            console.error("Failed to save setting:", error);
            alert("حدث خطأ أثناء حفظ الإعدادات");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
    }

    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Settings className="text-gray-600" /> إعدادات النظام
            </h1>

            <div className="max-w-3xl space-y-6">
                {/* إعدادات الضرائب */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                        <Percent size={18} className="text-blue-600" /> الإعدادات الضريبية
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-end gap-4 max-w-md">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    نسبة ضريبة القيمة المضافة (VAT %)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings['VAT_RATE'] || ''}
                                    onChange={(e) => handleChange('VAT_RATE', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                                    dir="ltr"
                                />
                            </div>
                            <button
                                onClick={() => handleSave('VAT_RATE', settings['VAT_RATE'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">تُستخدم هذه النسبة كقيمة افتراضية عند إنشاء الفواتير الضريبية واستخراج التقارير.</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب ضريبة المبيعات الافتراضي (Sales Tax / Output VAT Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_SALES_TAX_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_SALES_TAX_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب ضريبة المبيعات --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_SALES_TAX_ACCOUNT_ID', settings['DEFAULT_SALES_TAX_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتوجيه قيمة ضريبة القيمة المضافة (المخرجات) تلقائياً عند حفظ فواتير المبيعات.</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب ضريبة المشتريات الافتراضي (Purchases Tax / Input VAT Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_PURCHASES_TAX_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_PURCHASES_TAX_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب ضريبة المشتريات --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_PURCHASES_TAX_ACCOUNT_ID', settings['DEFAULT_PURCHASES_TAX_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتوجيه قيمة ضريبة القيمة المضافة (المدخلات) تلقائياً عند حفظ فواتير المشتريات.</p>
                    </div>
                </div>

                {/* إعدادات المخزون */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                        <Box size={18} className="text-blue-600" /> إعدادات المخزون والتكلفة
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-end gap-4 max-w-xl">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    طريقة تقييم المخزون (Inventory Costing Method)
                                </label>
                                <select
                                    value={settings['INVENTORY_COSTING_METHOD'] || 'WAC'}
                                    onChange={(e) => handleChange('INVENTORY_COSTING_METHOD', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="WAC">المتوسط المرجح للتكلفة (Weighted Average Cost) - موصى به</option>
                                    <option value="LPP">آخر سعر شراء (Last Purchase Price)</option>
                                    <option value="FIFO">الوارد أولاً صادر أولاً (FIFO)</option>
                                    <option value="LIFO">الوارد أخيراً صادر أولاً (LIFO)</option>
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('INVENTORY_COSTING_METHOD', settings['INVENTORY_COSTING_METHOD'] || 'WAC')}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">تحدد هذه الطريقة كيف يقوم النظام باحتساب وتحديث تكلفة الصنف عند تسجيل فواتير المشتريات.</p>
                    </div>
                </div>

                {/* الحسابات المحاسبية الافتراضية */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                        <Landmark size={18} className="text-blue-600" /> الحسابات المحاسبية الافتراضية
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-end gap-4 max-w-xl">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب إيرادات المبيعات الافتراضي (Sales Revenue Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_SALES_REVENUE_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_SALES_REVENUE_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب إيرادات المبيعات --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_SALES_REVENUE_ACCOUNT_ID', settings['DEFAULT_SALES_REVENUE_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتوجيه قيمة الإيرادات الأساسية تلقائياً عند حفظ فواتير المبيعات.</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب مردودات المبيعات الافتراضي (Sales Return Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_SALES_RETURN_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_SALES_RETURN_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب مردودات المبيعات --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_SALES_RETURN_ACCOUNT_ID', settings['DEFAULT_SALES_RETURN_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتوجيه قيمة الإيرادات المرتجعة تلقائياً عند حفظ فواتير مردودات المبيعات بدلاً من تخفيض حساب المبيعات بشكل مباشر.</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب مردودات المشتريات الافتراضي (Purchase Return Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_PURCHASE_RETURN_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_PURCHASE_RETURN_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب مردودات المشتريات --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_PURCHASE_RETURN_ACCOUNT_ID', settings['DEFAULT_PURCHASE_RETURN_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتوجيه قيمة المشتريات المرتجعة تلقائياً عند حفظ فواتير مردودات المشتريات.</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب تكلفة البضاعة المباعة الافتراضي (COGS Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_COGS_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_COGS_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب تكلفة البضاعة المباعة --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_COGS_ACCOUNT_ID', settings['DEFAULT_COGS_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتسجيل تكلفة البضاعة المباعة تلقائياً عند إنشاء فواتير المبيعات (في حال تطبيق الجرد المستمر).</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب المخزون الافتراضي (Inventory Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_INVENTORY_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_INVENTORY_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب المخزون --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_INVENTORY_ACCOUNT_ID', settings['DEFAULT_INVENTORY_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتسجيل حركات المخزون (زيادة أو نقص) تلقائياً عند إنشاء فواتير المبيعات أو المشتريات.</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب خسائر إتلاف المخزون (Inventory Loss / Spoilage Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_INVENTORY_LOSS_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_INVENTORY_LOSS_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب خسائر الإتلاف --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_INVENTORY_LOSS_ACCOUNT_ID', settings['DEFAULT_INVENTORY_LOSS_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتسجيل قيمة الخسائر تلقائياً عند عمل "سند إتلاف" للأصناف المنتهية صلاحيتها.</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب مكاسب تسوية المخزون (Inventory Gain / Adjustment Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_INVENTORY_GAIN_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_INVENTORY_GAIN_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب مكاسب التسوية --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_INVENTORY_GAIN_ACCOUNT_ID', settings['DEFAULT_INVENTORY_GAIN_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتسجيل قيمة الأرباح/المكاسب تلقائياً عند عمل "تسوية جردية بالزيادة" (إدخال بضاعة غير مسجلة للنظام).</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب الخصم المسموح به (Discount Allowed Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_DISCOUNT_ALLOWED_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_DISCOUNT_ALLOWED_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب الخصم المسموح به --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_DISCOUNT_ALLOWED_ACCOUNT_ID', settings['DEFAULT_DISCOUNT_ALLOWED_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتوجيه قيمة الخصم التجاري الممنوح للعملاء عند حفظ فواتير المبيعات لضمان توازن القيد المحاسبي.</p>

                        <div className="flex items-end gap-4 max-w-xl pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حساب الخصم المكتسب (Discount Received Account)
                                </label>
                                <select
                                    value={settings['DEFAULT_DISCOUNT_RECEIVED_ACCOUNT_ID'] || ''}
                                    onChange={(e) => handleChange('DEFAULT_DISCOUNT_RECEIVED_ACCOUNT_ID', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- اختر حساب الخصم المكتسب --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => handleSave('DEFAULT_DISCOUNT_RECEIVED_ACCOUNT_ID', settings['DEFAULT_DISCOUNT_RECEIVED_ACCOUNT_ID'])}
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">يُستخدم هذا الحساب لتوجيه قيمة الخصم التجاري المكتسب من الموردين عند حفظ فواتير المشتريات لضمان توازن القيد المحاسبي.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};