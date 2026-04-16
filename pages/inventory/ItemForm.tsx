import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Package, Printer, Store, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Item } from '../../types';
import { FloatingDropdown } from '../../src/components/ui/FloatingDropdown';
import ItemGeneralTab from './components/ItemGeneralTab';
import ItemUnitsTab from './components/ItemUnitsTab';
import ItemPricingTab from './components/ItemPricingTab';
import ItemSettingsTab from './components/ItemSettingsTab';
import ItemAttributesTab from './components/ItemAttributesTab';
import ItemBatchSerialTab from './components/ItemBatchSerialTab';
import ItemAlternativesTab from './components/ItemAlternativesTab';
import ItemKitTab from './components/ItemKitTab';

const normalizeText = (value: string | undefined | null): string => {
    if (!value) return '';
    return String(value)
        .toLowerCase()
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .trim();
};

const includesAny = (text: string, tokens: string[]): boolean => {
    return tokens.some((token) => text.includes(normalizeText(token)));
};

interface ItemFormProps {
    item?: Partial<Item>;
    onSave: (item: Partial<Item>) => Promise<void>;
    onCancel: () => void;
    onDelete?: (id: string) => Promise<void>;
}

const ItemForm: React.FC<ItemFormProps> = ({ item, onSave, onCancel, onDelete }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    const [openMenu, setOpenMenu] = useState<'item-tools' | null>(null);
    const [itemsTotalCount, setItemsTotalCount] = useState(0);
    const [formData, setFormData] = useState<Partial<Item>>(item || {
        is_active: 1,
        type: 'Goods',
        costing_method: 'STANDARD',
        cost_price: 0,
        sale_price: 0,
        tax_included: 0,
        has_expiry: 0,
        has_serial: 0,
        additional_units: [],
        prices: [],
        kit_items: [],
    });
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const defaultsResolvedRef = useRef(false);
    const currentItemId = String(formData.id || item?.id || '').trim();

    useEffect(() => {
        const ensureBaseUnit = async () => {
            if (formData.base_unit_id) return;
            try {
                let units = await window.electronAPI.inventory.getUnits();
                if (!units || units.length === 0) {
                    await window.electronAPI.inventory.seedDefaultUnits?.();
                    units = await window.electronAPI.inventory.getUnits();
                }
                if (units && units.length > 0) {
                    const preferredUnit = units.find((unit: any) => {
                        const bucket = normalizeText([unit?.name_ar, unit?.name_en, unit?.code, unit?.symbol].filter(Boolean).join(' '));
                        return includesAny(bucket, ['قطعة', 'قطعه', 'piece', 'pieces', 'pcs', 'pc']);
                    }) || units[0];

                    setFormData((prev) => ({ ...prev, base_unit_id: prev.base_unit_id || preferredUnit.id }));
                }
            } catch (error) {
                console.warn('Unable to auto resolve base unit', error);
            }
        };
        void ensureBaseUnit();
    }, [formData.base_unit_id]);

    useEffect(() => {
        const applyNewItemDefaults = async () => {
            if (item?.id || defaultsResolvedRef.current) return;
            defaultsResolvedRef.current = true;

            setFormData((prev) => ({
                ...prev,
                type: prev.type || 'Goods',
                costing_method: prev.costing_method || 'STANDARD',
            }));

            try {
                const accounts = await window.electronAPI.getAccounts?.();
                if (!Array.isArray(accounts) || accounts.length === 0) return;

                const findAccountId = (matcher: (text: string) => boolean): string | undefined => {
                    const match = accounts.find((acc: any) => {
                        const text = normalizeText([
                            acc?.name_ar,
                            acc?.name_en,
                            acc?.name,
                            acc?.account_code,
                            acc?.code,
                        ].filter(Boolean).join(' '));
                        return matcher(text);
                    });
                    return match?.id;
                };

                const inventoryAccountId = findAccountId((text) =>
                    includesAny(text, ['بضائع مستوردة', 'بضائع', 'مخزون', 'inventory', 'stock'])
                    && !includesAny(text, ['تكلفة', 'مصروف'])
                );

                const salesAccountId = findAccountId((text) =>
                    includesAny(text, ['مبيعات محلية', 'مبيعات', 'sales', 'revenue'])
                    && !includesAny(text, ['مرتجع', 'خصم'])
                );

                const cogsAccountId = findAccountId((text) =>
                    includesAny(text, ['تكلفة البضاعة المباعة', 'تكلفه البضاعه المباعه', 'cogs', 'cost of goods'])
                    || (includesAny(text, ['تكلفة', 'تكلفه']) && includesAny(text, ['بضاعه', 'بضاعة', 'goods']))
                );

                setFormData((prev) => ({
                    ...prev,
                    inventory_account_id: prev.inventory_account_id || inventoryAccountId,
                    sales_account_id: prev.sales_account_id || salesAccountId,
                    cogs_account_id: prev.cogs_account_id || cogsAccountId,
                }));
            } catch (error) {
                console.warn('Unable to auto resolve default GL accounts', error);
            }
        };

        void applyNewItemDefaults();
    }, [item?.id]);

    useEffect(() => {
        const fetchKits = async () => {
            if (!item?.id) return;
            const kits = await window.electronAPI.inventory.getKit(item.id);
            if (kits && kits.length > 0) {
                setFormData((prev) => ({ ...prev, kit_items: kits }));
            }
        };
        void fetchKits();
    }, [item]);

    useEffect(() => {
        const loadItemsTotal = async () => {
            try {
                const rows = await window.electronAPI.inventory.getItems();
                setItemsTotalCount(Array.isArray(rows) ? rows.length : 0);
            } catch (error) {
                console.error('Failed to load items total count', error);
                setItemsTotalCount(0);
            }
        };
        void loadItemsTotal();
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!currentItemId) return;
            if (event.altKey && event.key.toLowerCase() === 'w') {
                event.preventDefault();
                navigate(`/reports/inventory/quantity-by-warehouse?itemId=${encodeURIComponent(currentItemId)}`);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [currentItemId, navigate]);

    const openItemMovementCard = () => {
        if (!currentItemId) return;
        setOpenMenu(null);
        navigate(`/reports/inventory/movement?itemId=${encodeURIComponent(currentItemId)}`);
    };

    const openQuantityByWarehouse = () => {
        if (!currentItemId) return;
        setOpenMenu(null);
        navigate(`/reports/inventory/quantity-by-warehouse?itemId=${encodeURIComponent(currentItemId)}`);
    };

    const openBarcodePrint = () => {
        if (!currentItemId) return;
        setOpenMenu(null);
        navigate(`/items/labels?itemId=${encodeURIComponent(currentItemId)}`);
    };

    const tabs = useMemo(() => {
        const rows = [
            { id: 'general', label: 'البيانات العامة' },
            { id: 'units', label: 'الوحدات والباركود' },
            { id: 'pricing', label: 'الأسعار' },
            { id: 'settings', label: 'إعدادات المخزون' },
            { id: 'attributes', label: 'الخصائص' },
            { id: 'batch_serial', label: 'الصلاحية والتسلسل' },
            { id: 'alternatives', label: 'البدائل' },
        ];

        if (formData.type !== 'Service') {
            rows.push({ id: 'components', label: 'المكونات' });
        }

        return rows;
    }, [formData.type]);

    const checkRequiredFields = () => {
        if (!formData.code) return 'رمز الصنف مطلوب';
        if (!formData.name_ar) return 'اسم الصنف بالعربية مطلوب';
        if (!formData.base_unit_id) return 'الوحدة الأساسية مطلوبة';
        return null;
    };

    const handleDelete = async () => {
        if (!currentItemId) return;
        if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟ لا يمكن التراجع عن هذه العملية.')) return;
        setDeleteLoading(true);
        try {
            const result: any = await window.electronAPI.inventory.deleteItem(currentItemId);
            if (result && result.success === false) {
                alert(result.error || 'فشل الحذف');
                return;
            }
            if (onDelete) await onDelete(currentItemId);
        } catch (err) {
            alert('فشل الحذف: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSave = async () => {
        const error = checkRequiredFields();
        if (error) {
            alert(error);
            return;
        }

        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error(error);
            alert('فشل الحفظ: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return <ItemGeneralTab data={formData} onChange={setFormData} />;
            case 'units':
                return <ItemUnitsTab data={formData} onChange={setFormData} />;
            case 'pricing':
                return <ItemPricingTab data={formData} onChange={setFormData} />;
            case 'settings':
                return <ItemSettingsTab data={formData} onChange={setFormData} />;
            case 'attributes':
                return <ItemAttributesTab data={formData} onChange={setFormData} />;
            case 'batch_serial':
                return <ItemBatchSerialTab data={formData} onChange={setFormData} />;
            case 'alternatives':
                return <ItemAlternativesTab data={formData} onChange={setFormData} />;
            case 'components':
                return <ItemKitTab data={formData} onChange={setFormData} />;
            default:
                return null;
        }
    };

    return (
        <motion.div
            id="item-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            dir="rtl"
        >
            <div className="border-b border-slate-200 bg-white px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                            {item ? 'Edit Item' : 'New Item'}
                        </div>
                        <h2 className="mt-2 text-2xl font-black text-slate-800">
                            {item ? 'تعديل بطاقة الصنف' : 'إضافة بطاقة صنف'}
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                الرقم: {formData.code || 'جديد'}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
                                مجموع الأصناف: {itemsTotalCount}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                                النوع: {formData.type || 'Goods'}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${formData.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/10'}`}>
                                {formData.is_active ? 'فعال' : 'غير فعال'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <FloatingDropdown
                            isOpen={openMenu === 'item-tools'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={290}
                            title="الصنف"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'item-tools' ? null : 'item-tools'))}
                                    disabled={!currentItemId}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span>الصنف</span>
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onClick={openItemMovementCard}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
                            >
                                <span>كرت الصنف</span>
                                <Package size={14} className="text-slate-400" />
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={openQuantityByWarehouse}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
                            >
                                <span>تفاصيل صافي كمية الصنف (Alt+W)</span>
                                <Store size={14} className="text-slate-400" />
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={openBarcodePrint}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
                            >
                                <span>طباعة باركود الصنف</span>
                                <Printer size={14} className="text-slate-400" />
                            </button>
                        </FloatingDropdown>

                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    // Prefer Chromium print preview dialog in renderer.
                                    window.print();
                                } catch (_err) {
                                    window.electronAPI.print.preview().catch((error) => {
                                        console.error('Print failed:', error);
                                        alert('فشل الطباعة: ' + error.message);
                                    });
                                }
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-5 py-2 text-sm font-medium text-orange-700 shadow-sm transition hover:bg-orange-50"
                        >
                            <Printer size={16} />
                            طباعة
                        </button>
                        {currentItemId && onDelete && (
                            <button
                                type="button"
                                onClick={() => void handleDelete()}
                                disabled={deleteLoading}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-2 text-sm font-medium text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Trash2 size={15} />
                                {deleteLoading ? 'جاري الحذف...' : 'حذف الصنف'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'جاري الحفظ...' : 'حفظ الصنف'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3">
                <div className="flex gap-2 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                                activeTab === tab.id
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-0 flex-1 bg-slate-50/30 overflow-y-auto p-6">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        {renderTabContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default ItemForm;
