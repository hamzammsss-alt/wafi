import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit, Coins, RefreshCw, X, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';

export const Currencies = () => {
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [scraping, setScraping] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Initial State for Form
    const initialCurrencyState = {
        code: '',
        name_ar: '',
        name_en: '',
        exchange_rate: 1,
        symbol: '',
        is_base: 0
    };

    const [currentCurrency, setCurrentCurrency] = useState<any>(initialCurrencyState);

    const api = (window as any).electronAPI?.currency;

    const fetchCurrencies = async () => {
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getCurrencies();
            setCurrencies(data);
        } catch (error) {
            console.error("Failed to fetch currencies", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrencies();
    }, []);

    const handleSave = async () => {
        if (!currentCurrency.code || !currentCurrency.name_ar) {
            alert("يرجى تعبئة الحقول الإجبارية (الرمز والاسم)");
            return;
        }

        try {
            await api.saveCurrency(currentCurrency);
            await fetchCurrencies();
            closeModal();
        } catch (err: any) {
            alert("فشل الحفظ: " + err.message);
        }
    };

    const handleEdit = (c: any) => {
        setCurrentCurrency(c);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذه العملة؟')) {
            try {
                await api.deleteCurrency(id);
                fetchCurrencies();
            } catch (err: any) {
                alert("فشل الحذف: " + err.message);
            }
        }
    };

    const handleScrape = async () => {
        setScraping(true);
        try {
            const success = await api.updateRates();
            if (success) {
                alert("تم تحديث الأسعار بنجاح من المصدر!");
                await fetchCurrencies();
            } else {
                alert("فشل تحديث الأسعار. تحقق من الاتصال بالإنترنت.");
            }
        } catch (err: any) {
            alert("خطأ في التحديث: " + err.message);
        } finally {
            setScraping(false);
        }
    };

    const openModal = () => {
        setIsEditing(false);
        setCurrentCurrency(initialCurrencyState);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCurrency(initialCurrencyState);
    };

    useCreateIntent(openModal);

    const baseCurrency = currencies.find(c => c.is_base);

    // Filter out base currency for "Other Currencies" list if needed, 
    // but in a grid it's nice to show all together with a badge.

    return (
        <div className="h-full bg-gray-50 p-4 md:p-6" dir="rtl">
            <WorkspaceHeader
                icon={<Coins size={24} />}
                title="إدارة العملات وأسعار الصرف"
                subtitle={`تحديث ومتابعة أسعار العملات مقابل العملة الأساسية${baseCurrency?.name_ar ? ` (${baseCurrency.name_ar})` : ''}`}
                badges={[
                    { label: `العملات ${currencies.length}`, tone: 'warning' },
                    ...(baseCurrency ? [{ label: `العملة الأساسية ${baseCurrency.code || baseCurrency.name_ar}`, tone: 'info' as const }] : []),
                ]}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleScrape}
                            disabled={scraping}
                            className="bg-white border text-gray-700 px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-gray-50 hover:text-blue-600 transition flex items-center gap-2"
                        >
                            <RefreshCw size={18} className={scraping ? 'animate-spin text-blue-600' : ''} />
                            {scraping ? 'جاري التحديث...' : 'تحديث الأسعار'}
                        </button>

                        <button
                            onClick={openModal}
                            className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold shadow-md hover:bg-emerald-700 hover:shadow-lg transition flex items-center gap-2"
                        >
                            <Plus size={20} />
                            إضافة عملة
                        </button>
                    </div>
                }
                className="mb-6"
            />

            {/* Grid Stats */}
            {/* You could add a stats bar here later */}

            {/* Content Grid */}
            {loading ? (
                <div className="flex justify-center items-center h-64 text-gray-400">
                    <RefreshCw className="animate-spin mr-2" /> جاري تحميل البيانات...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {currencies.map((currency) => (
                        <CurrencyCard
                            key={currency.id}
                            currency={currency}
                            onEdit={() => handleEdit(currency)}
                            onDelete={() => handleDelete(currency.id)}
                            isBase={currency.is_base === 1}
                        />
                    ))}

                    {/* Add New Card Button (Visual Shortcut) */}
                    <button
                        onClick={openModal}
                        className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col justify-center items-center text-gray-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition min-h-[180px]"
                    >
                        <Plus size={40} className="mb-2 opacity-50" />
                        <span className="font-medium">إضافة عملة جديدة</span>
                    </button>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start p-3 md:p-4 pt-6 md:pt-10 backdrop-blur-sm overflow-y-auto"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[calc(100vh-4rem)]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {isEditing ? 'تعديل بيانات العملة' : 'إضافة عملة جديدة'}
                                </h3>
                                <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">رمز العملة (Code)</label>
                                        <input
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase font-mono tracking-wider"
                                            placeholder="Ex: USD"
                                            value={currentCurrency.code}
                                            onChange={e => setCurrentCurrency({ ...currentCurrency, code: e.target.value.toUpperCase() })}
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الرمز الرمزي</label>
                                        <input
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center"
                                            placeholder="$"
                                            value={currentCurrency.symbol}
                                            onChange={e => setCurrentCurrency({ ...currentCurrency, symbol: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية</label>
                                    <input
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        placeholder="مثال: دولار أمريكي"
                                        value={currentCurrency.name_ar}
                                        onChange={e => setCurrentCurrency({ ...currentCurrency, name_ar: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية</label>
                                    <input
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        placeholder="Ex: US Dollar"
                                        value={currentCurrency.name_en}
                                        onChange={e => setCurrentCurrency({ ...currentCurrency, name_en: e.target.value })}
                                    />
                                </div>

                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                                    <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                                        <TrendingUp size={16} /> سعر الصرف
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.0001"
                                            className="w-full p-3 pl-12 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono text-lg font-bold text-right"
                                            value={currentCurrency.exchange_rate}
                                            onChange={e => {
                                                const parsed = Number(e.target.value);
                                                setCurrentCurrency({ ...currentCurrency, exchange_rate: Number.isFinite(parsed) ? parsed : 0 });
                                            }}
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                            مقابل الأساس
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-600 mt-2">
                                        * سعر البيع المعتمد في النظام للعملات الأجنبية.
                                    </p>
                                </div>

                                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={currentCurrency.is_base === 1}
                                            onChange={e => setCurrentCurrency({ ...currentCurrency, is_base: e.target.checked ? 1 : 0 })}
                                            className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <span className="block font-medium text-gray-900">عملة أساسية</span>
                                        <span className="block text-sm text-gray-500">استخدم هذه العملة كمرجع لجميع العملات الأخرى</span>
                                    </div>
                                </label>

                            </div>

                            <div className="p-6 bg-gray-50 border-t flex gap-3">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold shadow hover:bg-emerald-700 transition flex justify-center items-center gap-2"
                                >
                                    <Save size={18} /> حفظ التغييرات
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CurrencyCard = ({ currency, onEdit, onDelete, isBase }: any) => {
    return (
        <div className={`
            relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border
            ${isBase ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}
        `}>
            {/* Base Badge */}
            {isBase && (
                <span className="absolute top-4 left-4 bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold shadow-sm">
                    العملة الأساسية
                </span>
            )}

            {!isBase && (
                <span className="absolute top-4 left-4 text-xs text-gray-400 font-mono">
                    Last Update: {new Date(currency.last_update || Date.now()).toLocaleDateString('en-GB')}
                </span>
            )}

            <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600 shadow-inner">
                    {currency.symbol || '$'}
                </div>
                {!isBase && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* This group-hover needs 'group' class on parent, adding simpler logic for now */}
                    </div>
                )}
                {/* Actions always visible for now for better UX on touch/desktop mixed */}
                <div className="flex gap-1">
                    <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition" title="تعديل">
                        <Edit size={16} />
                    </button>
                    {!isBase && (
                        <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition" title="حذف">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {currency.name_ar}
                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">
                        {currency.code}
                    </span>
                </h3>
                <p className="text-sm text-gray-400 font-medium">{currency.name_en}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-end">
                <div>
                    <span className="block text-xs text-gray-400 mb-1">سعر الصرف</span>
                    <span className="text-2xl font-bold text-gray-900 font-mono tracking-tight">
                        {currency.exchange_rate?.toFixed(4)}
                    </span>
                </div>
                {/* <div className={`text-sm font-bold flex items-center ${isBase ? 'text-gray-300' : 'text-green-500'}`}>
                    <TrendingUp size={16} className="mr-1" />
                    {!isBase ? '+0.0%' : '-'}
                </div> */}
            </div>
        </div>
    );
}
